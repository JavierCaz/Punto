import { getDb } from '@/db';

import { getBusinessId } from '@/db/repositories/business-scope';
import { nowIso } from '@/db/repositories/clock';
import type { DatabaseAdapter, SqlValue } from '@/db/repositories/database';
import { REPO_ERROR, mapSqliteError, repoError } from '@/db/repositories/errors';
import { newId } from '@/db/repositories/ids';
import { boolFromInt, int, intBool, str } from '@/db/repositories/mappers';
import { buildUpdateAssignments } from '@/db/repositories/sql';
import { withTransaction } from '@/db/repositories/transaction';
import { PAYMENT_TYPES } from '@/db/repositories/types';
import type { ListOptions, PaymentType } from '@/db/repositories/types';

/**
 * Payment method data access (migration 001, `payment_method` table).
 *
 * Payment methods are the ways a sale can be paid (CASH, CARD, TRANSFER,
 * OTHER). Unlike catalog entities they have NO `archived_at` column — they are
 * hidden from the POS by flipping `is_active`, not soft-deleted, so there is no
 * archive function here.
 *
 * Invariants enforced in this repository:
 * - `type` must be one of `PAYMENT_TYPES` (checked at the boundary, throwing
 *   `REPO_INVALID_STATE`), mirroring the DB CHECK constraint.
 * - At most ONE method is the default (`is_default = 1`) per business. When a
 *   create/update promotes a method to default, every other method for the
 *   business is cleared first — all inside the same transaction, because no
 *   partial unique index enforces the invariant at the DB level.
 */

/** Raw `payment_method` row — snake_case, exact columns, 0/1 flags as number. */
interface PaymentMethodRow {
  id: string;
  business_id: string;
  name: string;
  type: PaymentType;
  is_default: number;
  is_active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Column list shared by every payment_method SELECT (matches the row shape). */
const PAYMENT_METHOD_COLUMNS = `
  id, business_id, name, type, is_default, is_active, sort_order,
  created_at, updated_at`;

/** Runtime guard for the `payment_method.type` CHECK values. */
function isPaymentType(value: unknown): value is PaymentType {
  return typeof value === 'string' && (PAYMENT_TYPES as readonly string[]).includes(value);
}

/** Coerce an untyped SQLite row into the typed snake_case `PaymentMethodRow`. */
function mapPaymentMethodRow(row: Record<string, unknown>): PaymentMethodRow {
  const type = row.type;
  if (!isPaymentType(type)) {
    // Should be unreachable (DB CHECK constraint) — fail loudly, never widen.
    throw repoError(REPO_ERROR.INVALID_STATE, `unexpected payment method type in DB: ${String(type)}`);
  }
  return {
    id: str(row.id),
    business_id: str(row.business_id),
    name: str(row.name),
    type,
    is_default: int(row.is_default),
    is_active: int(row.is_active),
    sort_order: int(row.sort_order),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
  };
}

/** Map a typed row to the public camelCase shape (0/1 flags → booleans). */
const toPaymentMethod = (row: PaymentMethodRow) => ({
  id: row.id,
  businessId: row.business_id,
  name: row.name,
  type: row.type,
  isDefault: boolFromInt(row.is_default),
  isActive: boolFromInt(row.is_active),
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Public payment method type — derived from the private mapper. */
export type PaymentMethod = ReturnType<typeof toPaymentMethod>;

/** Fields accepted when creating a payment method. `name`/`type` are required. */
export interface CreatePaymentMethodInput {
  name: string;
  type: PaymentType;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

/** Patch fields for updating a payment method (only provided keys change). */
export interface UpdatePaymentMethodInput {
  name?: string;
  type?: PaymentType;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

/**
 * List payment methods for the business, active methods by default, ordered
 * `sort_order ASC, name ASC`. Pass `includeInactive: true` to also return
 * inactive methods (there is no archive concept here).
 */
export async function listPaymentMethods(
  opts: ListOptions & { includeInactive?: boolean } = {},
): Promise<PaymentMethod[]> {
  const db = await getDb();
  const businessId = await getBusinessId();

  // Active-only by default; includeInactive drops the filter.
  const where = opts.includeInactive ? '' : 'AND is_active = 1';
  let pagination = '';
  const params: SqlValue[] = [businessId];
  if (opts.limit != null) {
    pagination += ' LIMIT ?';
    params.push(opts.limit);
  }
  if (opts.offset != null) {
    pagination += opts.limit != null ? ' OFFSET ?' : ' LIMIT -1 OFFSET ?';
    params.push(opts.offset);
  }

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${PAYMENT_METHOD_COLUMNS}
       FROM payment_method
      WHERE business_id = ? ${where}
      ORDER BY sort_order ASC, name ASC${pagination}`,
    ...params,
  );
  return rows.map((row) => toPaymentMethod(mapPaymentMethodRow(row)));
}

/** Fetch a single payment method by id, or `null` when missing. */
export async function getPaymentMethodById(id: string): Promise<PaymentMethod | null> {
  const db = await getDb();
  const businessId = await getBusinessId();

  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${PAYMENT_METHOD_COLUMNS}
       FROM payment_method
      WHERE id = ? AND business_id = ?
      LIMIT 1`,
    id,
    businessId,
  );
  return row ? toPaymentMethod(mapPaymentMethodRow(row)) : null;
}

/** Create a payment method and return the freshly-read mapped row. */
export async function createPaymentMethod(
  input: CreatePaymentMethodInput,
): Promise<PaymentMethod> {
  // Fail fast on an invalid type before touching the DB.
  if (!isPaymentType(input.type)) {
    throw repoError(REPO_ERROR.INVALID_STATE, `invalid payment method type: ${String(input.type)}`);
  }
  const businessId = await getBusinessId();
  return withTransaction((txn) => createPaymentMethodWithTxn(txn, businessId, input));
}

/** Transactional create: clear any existing default, INSERT, select-back. */
async function createPaymentMethodWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  input: CreatePaymentMethodInput,
): Promise<PaymentMethod> {
  const id = newId();
  const timestamp = nowIso();

  // Single-default invariant: before promoting this method to default, clear
  // is_default on every other method for the business (same transaction). No
  // partial unique index enforces this — app code owns the invariant.
  if (input.isDefault === true) {
    await txn.runAsync(
      `UPDATE payment_method SET is_default = 0, updated_at = ?
        WHERE business_id = ? AND is_default = 1`,
      timestamp,
      businessId,
    );
  }

  try {
    await txn.runAsync(
      `INSERT INTO payment_method
         (id, business_id, name, type, is_default, is_active, sort_order,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      businessId,
      input.name.trim(),
      input.type,
      intBool(input.isDefault ?? false),
      intBool(input.isActive ?? true),
      input.sortOrder ?? 0,
      timestamp,
      timestamp,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${PAYMENT_METHOD_COLUMNS} FROM payment_method WHERE id = ? LIMIT 1`,
    id,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND, `payment method not found after insert: ${id}`);
  }
  return toPaymentMethod(mapPaymentMethodRow(row));
}

/** Update a payment method (only provided fields) and return the fresh row. */
export async function updatePaymentMethod(
  id: string,
  input: UpdatePaymentMethodInput,
): Promise<PaymentMethod> {
  if (input.type !== undefined && !isPaymentType(input.type)) {
    throw repoError(REPO_ERROR.INVALID_STATE, `invalid payment method type: ${String(input.type)}`);
  }
  const businessId = await getBusinessId();
  return withTransaction((txn) => updatePaymentMethodWithTxn(txn, businessId, id, input));
}

/** Transactional update: clear default if promoting, verify, patch, select-back. */
async function updatePaymentMethodWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  id: string,
  input: UpdatePaymentMethodInput,
): Promise<PaymentMethod> {
  const timestamp = nowIso();

  // Single-default invariant: promoting this method to default clears the
  // existing default first (same transaction, before the target UPDATE).
  if (input.isDefault === true) {
    await txn.runAsync(
      `UPDATE payment_method SET is_default = 0, updated_at = ?
        WHERE business_id = ? AND is_default = 1`,
      timestamp,
      businessId,
    );
  }

  // Existence check so a missing id throws NOT_FOUND (not a silent no-op).
  const existing = await txn.getFirstAsync<{ id: string }>(
    `SELECT id FROM payment_method WHERE id = ? AND business_id = ? LIMIT 1`,
    id,
    businessId,
  );
  if (!existing) {
    throw repoError(REPO_ERROR.NOT_FOUND, `payment method not found: ${id}`);
  }

  const { assignments, params } = buildUpdateAssignments({
    name: input.name?.trim(),
    type: input.type,
    is_default: input.isDefault === undefined ? undefined : intBool(input.isDefault),
    is_active: input.isActive === undefined ? undefined : intBool(input.isActive),
    sort_order: input.sortOrder,
  });

  // Always bump updated_at.
  assignments.push('updated_at = ?');
  params.push(nowIso());

  try {
    await txn.runAsync(
      `UPDATE payment_method SET ${assignments.join(', ')} WHERE id = ? AND business_id = ?`,
      ...params,
      id,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${PAYMENT_METHOD_COLUMNS} FROM payment_method WHERE id = ? LIMIT 1`,
    id,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND, `payment method not found after update: ${id}`);
  }
  return toPaymentMethod(mapPaymentMethodRow(row));
}
