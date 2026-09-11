import * as Crypto from 'expo-crypto';

import { loginLimiter } from '@/auth/lockout';
import { normalizeUsername, isAuthRole } from '@/auth/validation';
import type { AuthRole } from '@/auth/types';
import { getDb, withTransaction } from '@/db';
import { verifySecret, needsRehash, hashSecret } from '@/lib/hash';

/**
 * Auth data access + orchestration over the SQLite layer.
 *
 * The `employee` table IS the account table (migration 002): role/username/
 * password_hash/pin_hash live on the employee row, so sale attribution and
 * login identity share one record. All queries are business-scoped via the
 * single business row (the DB holds exactly one business — §3.3 / 001).
 *
 * Repository invariants enforced here (Oracle-reviewed):
 * - Only an active non-archived employee can sign in.
 * - The last active ADMIN cannot be archived (would strand the business).
 * - A user cannot archive their own account.
 * - Login attempts are throttled per normalized username (see lockout.ts).
 */

interface EmployeeRow {
  id: string;
  business_id: string;
  first_name: string;
  last_name: string | null;
  username: string | null;
  role: AuthRole;
  password_hash: string | null;
  pin_hash: string | null;
  is_active: number;
  archived_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BusinessRow {
  id: string;
  name: string;
  currency_code: string;
  locale: string;
}

const nowIso = (): string => new Date().toISOString();

const toPublicEmployee = (row: EmployeeRow) => ({
  id: row.id,
  businessId: row.business_id,
  firstName: row.first_name,
  lastName: row.last_name,
  username: row.username ?? '',
  role: row.role,
  isActive: row.is_active === 1,
  createdAt: row.created_at,
});

const EMPLOYEE_COLUMNS = `
  id, business_id, first_name, last_name, username, role,
  password_hash, pin_hash, is_active, archived_at, last_login_at,
  created_at, updated_at`;

function mapEmployeeRow(row: Record<string, unknown>): EmployeeRow {
  const role = row.role;
  if (!isAuthRole(role)) {
    throw new Error(`Unexpected employee role in DB: ${String(role)}`);
  }
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    first_name: String(row.first_name),
    last_name: row.last_name == null ? null : String(row.last_name),
    username: row.username == null ? null : String(row.username),
    role,
    password_hash: row.password_hash == null ? null : String(row.password_hash),
    pin_hash: row.pin_hash == null ? null : String(row.pin_hash),
    is_active: Number(row.is_active),
    archived_at: row.archived_at == null ? null : String(row.archived_at),
    last_login_at: row.last_login_at == null ? null : String(row.last_login_at),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function businessExists(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: string }>('SELECT id FROM business LIMIT 1');
  return row != null;
}

export async function getBusiness(): Promise<BusinessRow | null> {
  const db = await getDb();
  return db.getFirstAsync<BusinessRow>(
    'SELECT id, name, currency_code, locale FROM business LIMIT 1',
  );
}

/**
 * First-run onboarding: create the single business + its ADMIN owner in one
 * transaction. Idempotent guard: refuses to run when a business already exists.
 */
export async function onboardBusiness(input: {
  businessName: string;
  currencyCode: string;
  locale: string;
  adminFirstName: string;
  adminLastName?: string;
  username: string;
  passwordHash: string;
}): Promise<{ businessId: string; employeeId: string }> {
  const username = normalizeUsername(input.username);
  const timestamp = nowIso();
  const businessId = Crypto.randomUUID();
  const employeeId = Crypto.randomUUID();

  await withTransaction(async (txn) => {
    const existing = await txn.getFirstAsync<{ id: string }>(
      'SELECT id FROM business LIMIT 1',
    );
    if (existing) {
      throw new Error('AUTH_BUSINESS_EXISTS');
    }

    await txn.runAsync(
      `INSERT INTO business (id, name, currency_code, locale, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      businessId,
      input.businessName.trim(),
      input.currencyCode,
      input.locale,
      timestamp,
      timestamp,
    );

    await txn.runAsync(
      `INSERT INTO employee
         (id, business_id, first_name, last_name, username, role,
          password_hash, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'ADMIN', ?, 1, ?, ?)`,
      employeeId,
      businessId,
      input.adminFirstName.trim(),
      input.adminLastName?.trim() || null,
      username,
      input.passwordHash,
      timestamp,
      timestamp,
    );
  });

  return { businessId, employeeId };
}

/**
 * Resolve a username to its auth kind + id, or not-found. Active employees
 * only. Used by the login screen to choose password vs PIN entry.
 */
export async function resolveAuthKind(usernameRaw: string): Promise<
  | { kind: 'found'; authKind: 'password' | 'pin'; userId: string }
  | { kind: 'not-found' }
> {
  const username = normalizeUsername(usernameRaw);
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: string; role: string }>(
    `SELECT id, role FROM employee
      WHERE username = ? AND archived_at IS NULL AND is_active = 1
      LIMIT 1`,
    username,
  );
  if (!row || !isAuthRole(row.role)) {
    return { kind: 'not-found' };
  }
  return {
    kind: 'found',
    userId: row.id,
    authKind: row.role === 'ADMIN' ? 'password' : 'pin',
  };
}

/**
 * Attempt a sign-in. Throttled per normalized username at the auth boundary
 * (every caller — login screen, future re-auth — is covered).
 */
export async function signIn(
  usernameRaw: string,
  secret: string,
): Promise<
  | { ok: true; user: ReturnType<typeof toPublicEmployee> }
  | { ok: false; code: 'invalid' | 'locked'; retryAfterSec?: number }
> {
  const username = normalizeUsername(usernameRaw);

  const retryAfterSec = loginLimiter.retryAfterSec(username);
  if (retryAfterSec > 0) {
    return { ok: false, code: 'locked', retryAfterSec };
  }

  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${EMPLOYEE_COLUMNS} FROM employee
      WHERE username = ? AND archived_at IS NULL
      LIMIT 1`,
    username,
  );

  if (!row) {
    // Uniform failure signal: don't reveal whether the username exists.
    loginLimiter.recordFailure(username);
    return { ok: false, code: 'invalid' };
  }

  const employee = mapEmployeeRow(row);

  if (!employee.is_active) {
    loginLimiter.recordFailure(username);
    return { ok: false, code: 'invalid' };
  }
  const storedHash = employee.role === 'ADMIN' ? employee.password_hash : employee.pin_hash;
  if (!storedHash) {
    // No credential assigned — treat as failure, never a silent success.
    loginLimiter.recordFailure(username);
    return { ok: false, code: 'invalid' };
  }

  const valid = await verifySecret(secret, storedHash);
  if (!valid) {
    loginLimiter.recordFailure(username);
    const remaining = loginLimiter.retryAfterSec(username);
    return remaining > 0
      ? { ok: false, code: 'invalid', retryAfterSec: remaining }
      : { ok: false, code: 'invalid' };
  }

  loginLimiter.recordSuccess(username);

  // Transparently upgrade weak legacy hashes on successful login.
  const hashColumn = employee.role === 'ADMIN' ? 'password_hash' : 'pin_hash';
  const upgraded = needsRehash(storedHash) ? await hashSecret(secret) : null;
  await withTransaction(async (txn) => {
    if (upgraded) {
      await txn.runAsync(`UPDATE employee SET ${hashColumn} = ? WHERE id = ?`, upgraded, employee.id);
    }
    await txn.runAsync('UPDATE employee SET last_login_at = ? WHERE id = ?', nowIso(), employee.id);
  });

  return { ok: true, user: toPublicEmployee(employee) };
}

/** Load an employee by id for session restore (active rows only). */
export async function findActiveEmployeeById(employeeId: string): Promise<ReturnType<typeof toPublicEmployee> | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${EMPLOYEE_COLUMNS} FROM employee
      WHERE id = ? AND archived_at IS NULL AND is_active = 1
      LIMIT 1`,
    employeeId,
  );
  return row ? toPublicEmployee(mapEmployeeRow(row)) : null;
}

/** List active employees for the team screen (business has one row). */
export async function listActiveEmployees(): Promise<ReturnType<typeof toPublicEmployee>[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${EMPLOYEE_COLUMNS} FROM employee
      WHERE archived_at IS NULL
      ORDER BY role = 'ADMIN' DESC, created_at ASC`,
  );
  return rows.map((row) => toPublicEmployee(mapEmployeeRow(row)));
}

/** Create an EMPLOYEE account (PIN credential). Admin-only action. */
export async function createEmployee(input: {
  firstName: string;
  lastName?: string;
  username: string;
  pinHash: string;
}): Promise<ReturnType<typeof toPublicEmployee>> {
  const username = normalizeUsername(input.username);
  const timestamp = nowIso();
  const employeeId = Crypto.randomUUID();

  return withTransaction(async (txn) => {
    const business = await txn.getFirstAsync<{ id: string }>('SELECT id FROM business LIMIT 1');
    if (!business) {
      throw new Error('AUTH_NO_BUSINESS');
    }

    const existing = await txn.getFirstAsync<{ id: string }>("SELECT id FROM employee WHERE username = ? AND archived_at IS NULL", username);
    if (existing) {
      throw new Error('AUTH_USERNAME_TAKEN');
    }

    await txn.runAsync(
      `INSERT INTO employee
         (id, business_id, first_name, last_name, username, role,
          pin_hash, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'EMPLOYEE', ?, 1, ?, ?)`,
      employeeId,
      business.id,
      input.firstName.trim(),
      input.lastName?.trim() || null,
      username,
      input.pinHash,
      timestamp,
      timestamp,
    );

    const row = await txn.getFirstAsync<Record<string, unknown>>(
      `SELECT ${EMPLOYEE_COLUMNS} FROM employee WHERE id = ?`,
      employeeId,
    );
    return toPublicEmployee(mapEmployeeRow(row as Record<string, unknown>));
  });
}

/**
 * Archive (soft-delete) an employee. Enforces the auth invariants inside the
 * same transaction as the write (Oracle-reviewed).
 */
export async function archiveEmployee(actorEmployeeId: string, targetEmployeeId: string): Promise<void> {
  await withTransaction(async (txn) => {
    const target = await txn.getFirstAsync<Record<string, unknown>>(
      `SELECT ${EMPLOYEE_COLUMNS} FROM employee WHERE id = ?`,
      targetEmployeeId,
    );
    if (!target) {
      throw new Error('AUTH_EMPLOYEE_NOT_FOUND');
    }
    const employee = mapEmployeeRow(target);

    if (employee.id === actorEmployeeId) {
      throw new Error('AUTH_CANNOT_ARCHIVE_SELF');
    }
    if (employee.role === 'ADMIN') {
      const adminCount = await txn.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM employee
          WHERE role = 'ADMIN' AND archived_at IS NULL`,
      );
      if ((adminCount?.count ?? 0) <= 1) {
        throw new Error('AUTH_LAST_ADMIN');
      }
    }

    await txn.runAsync('UPDATE employee SET archived_at = ?, updated_at = ? WHERE id = ?', nowIso(), nowIso(), targetEmployeeId);
  });
}

export type PublicEmployee = ReturnType<typeof toPublicEmployee>;
export type { EmployeeRow };
