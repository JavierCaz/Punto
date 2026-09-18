import * as Crypto from 'expo-crypto';

import { ForbiddenError, requireCapability } from '@/auth/permissions';
import { loginLimiter, MANAGER_PIN_LIMITER_KEY, managerPinLimiter } from '@/auth/lockout';
import { normalizeUsername, isAuthRole } from '@/auth/validation';
import type { AuthRole, SessionUser } from '@/auth/types';
import { buildUpdateAssignments, getDb, withTransaction } from '@/db';
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
  /** Durable logo URI (already copied into app storage), or null/absent. */
  logoUri?: string | null;
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
      `INSERT INTO business (id, name, logo_uri, currency_code, locale, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      businessId,
      input.businessName.trim(),
      input.logoUri?.trim() || null,
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
 * Update an employee's profile and (optionally) reset their PIN. Admin-only
 * action enforced at the screen; the repository owns the data invariants:
 * - the target must exist and not be archived;
 * - `username` stays unique among live rows (excluding the row itself);
 * - a PIN can only be set on an EMPLOYEE row — ADMIN signs in with a password.
 *
 * `username` is required: clearing it on a credentialed row would silently
 * disable that person's login, so a legacy attribution-only row must be given
 * one before it can be saved.
 *
 * Only the fields present in `input` change; `pinHash` omitted means the
 * credential is left untouched.
 */
export async function updateEmployee(
  targetEmployeeId: string,
  input: UpdateEmployeeInput,
): Promise<ReturnType<typeof toPublicEmployee>> {
  const username = normalizeUsername(input.username);
  const firstName = input.firstName.trim();
  if (firstName.length === 0) {
    throw new Error('AUTH_FIRST_NAME_REQUIRED');
  }

  return withTransaction(async (txn) => {
    const target = await txn.getFirstAsync<Record<string, unknown>>(
      `SELECT ${EMPLOYEE_COLUMNS} FROM employee
        WHERE id = ? AND archived_at IS NULL LIMIT 1`,
      targetEmployeeId,
    );
    if (!target) {
      throw new Error('AUTH_EMPLOYEE_NOT_FOUND');
    }
    const employee = mapEmployeeRow(target);

    if (input.pinHash !== undefined && employee.role !== 'EMPLOYEE') {
      throw new Error('AUTH_PIN_NOT_ALLOWED');
    }

    const clash = await txn.getFirstAsync<{ id: string }>(
      `SELECT id FROM employee
        WHERE username = ? AND archived_at IS NULL AND id != ? LIMIT 1`,
      username,
      targetEmployeeId,
    );
    if (clash) {
      throw new Error('AUTH_USERNAME_TAKEN');
    }

    const { assignments, params } = buildUpdateAssignments({
      first_name: firstName,
      last_name: input.lastName === undefined ? undefined : input.lastName?.trim() || null,
      username,
      pin_hash: input.pinHash,
    });
    // Always bump updated_at (a bare timestamp bump is a valid no-op update).
    assignments.push('updated_at = ?');
    params.push(nowIso());

    await txn.runAsync(
      `UPDATE employee SET ${assignments.join(', ')} WHERE id = ?`,
      ...params,
      targetEmployeeId,
    );

    const row = await txn.getFirstAsync<Record<string, unknown>>(
      `SELECT ${EMPLOYEE_COLUMNS} FROM employee WHERE id = ?`,
      targetEmployeeId,
    );
    if (!row) {
      throw new Error('AUTH_EMPLOYEE_NOT_FOUND');
    }
    return toPublicEmployee(mapEmployeeRow(row));
  });
}

/** Patch accepted by {@link updateEmployee}. */
export interface UpdateEmployeeInput {
  firstName: string;
  /** `undefined` leaves the stored last name unchanged; `null`/empty clears it. */
  lastName?: string | null;
  username: string;
  /** New PIN hash (EMPLOYEE only). Omit to keep the current credential. */
  pinHash?: string;
}

/**
 * Archive (soft-delete) an employee. Enforces the auth invariants inside the
 * same transaction as the write (Oracle-reviewed).
 */
export async function archiveEmployee(actorEmployeeId: string, targetEmployeeId: string): Promise<void> {
  await withTransaction(async (txn) => {
    // Authorization (defense in depth): only an active ADMIN may archive.
    const actor = await txn.getFirstAsync<{ role: string }>(
      'SELECT role FROM employee WHERE id = ? AND archived_at IS NULL AND is_active = 1 LIMIT 1',
      actorEmployeeId,
    );
    if (actor?.role !== 'ADMIN') {
      throw new ForbiddenError('team.manage');
    }

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

// ---------------------------------------------------------------------------
// Manager authorization PIN (employee-initiated refund overrides)
// ---------------------------------------------------------------------------

/** Result of verifying a manager's authorization PIN. */
export type ManagerPinResult =
  | { ok: true; adminId: string }
  | { ok: false; code: 'invalid' | 'no-pin-configured' | 'locked'; retryAfterSec?: number };

/** True when the given admin has configured an authorization PIN. */
export async function hasAuthorizationPin(adminId: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ authorization_pin_hash: string | null }>(
    `SELECT authorization_pin_hash FROM employee
      WHERE id = ? AND role = 'ADMIN' AND archived_at IS NULL LIMIT 1`,
    adminId,
  );
  return row?.authorization_pin_hash != null;
}

/** Set/replace the signed-in admin's authorization PIN. ADMIN-only. */
export async function setAuthorizationPin(
  actor: SessionUser | null,
  pinHash: string,
): Promise<void> {
  if (!actor) {
    throw new ForbiddenError('settings.manage');
  }
  requireCapability(actor, 'settings.manage');
  const db = await getDb();
  await db.runAsync(
    `UPDATE employee SET authorization_pin_hash = ?, updated_at = ?
      WHERE id = ? AND role = 'ADMIN' AND archived_at IS NULL`,
    pinHash,
    nowIso(),
    actor.id,
  );
}

/**
 * Verify an authorization PIN against every active ADMIN that has one.
 *
 * Security notes (Oracle-reviewed):
 * - Full scan with NO early exit, so the PBKDF2 work is the same regardless of
 *   which admin (if any) matched — a timing observer learns only how many
 *   admins have a PIN, which is not sensitive.
 * - Throttled globally by {@link managerPinLimiter} (in-memory, survives
 *   sign-out) to blunt on-screen guessing.
 * - `no-pin-configured` is distinct from `invalid` so the caller can tell an
 *   employee to ask an admin to set one, instead of showing "wrong PIN".
 */
export async function verifyManagerAuthorizationPin(pin: string): Promise<ManagerPinResult> {
  const retryAfterSec = managerPinLimiter.retryAfterSec(MANAGER_PIN_LIMITER_KEY);
  if (retryAfterSec > 0) {
    return { ok: false, code: 'locked', retryAfterSec };
  }

  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; authorization_pin_hash: string }>(
    `SELECT id, authorization_pin_hash FROM employee
      WHERE role = 'ADMIN' AND archived_at IS NULL AND is_active = 1
        AND authorization_pin_hash IS NOT NULL
      ORDER BY created_at ASC, id ASC`,
  );
  if (rows.length === 0) {
    return { ok: false, code: 'no-pin-configured' };
  }

  let matchedId: string | null = null;
  let matchedHash: string | null = null;
  for (const row of rows) {
    const valid = await verifySecret(pin, row.authorization_pin_hash);
    if (valid && matchedId === null) {
      matchedId = row.id;
      matchedHash = row.authorization_pin_hash;
    }
  }

  if (matchedId === null) {
    managerPinLimiter.recordFailure(MANAGER_PIN_LIMITER_KEY);
    const remaining = managerPinLimiter.retryAfterSec(MANAGER_PIN_LIMITER_KEY);
    return remaining > 0
      ? { ok: false, code: 'locked', retryAfterSec: remaining }
      : { ok: false, code: 'invalid' };
  }

  managerPinLimiter.recordSuccess(MANAGER_PIN_LIMITER_KEY);

  // Transparently upgrade a weak legacy hash on success (mirrors signIn).
  if (matchedHash != null && needsRehash(matchedHash)) {
    const upgraded = await hashSecret(pin);
    await db.runAsync(
      'UPDATE employee SET authorization_pin_hash = ?, updated_at = ? WHERE id = ?',
      upgraded,
      nowIso(),
      matchedId,
    );
  }

  return { ok: true, adminId: matchedId };
}
