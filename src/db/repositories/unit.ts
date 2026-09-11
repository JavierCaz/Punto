import { getDb } from '@/db/client';

import { getBusinessId } from '@/db/repositories/business-scope';
import { nowIso } from '@/db/repositories/clock';
import type { DatabaseAdapter, SqlValue } from '@/db/repositories/database';
import { REPO_ERROR, mapSqliteError, repoError } from '@/db/repositories/errors';
import { newId } from '@/db/repositories/ids';
import { boolFromInt, int, intBool, str } from '@/db/repositories/mappers';
import { buildUpdateAssignments } from '@/db/repositories/sql';
import { withTransaction } from '@/db/repositories/transaction';
import { UNIT_TYPES } from '@/db/repositories/types';
import type { ListOptions, UnitType } from '@/db/repositories/types';

/**
 * Unit-of-measure entity repository (migration 001, table `unit`).
 *
 * Units (g, ml, pza …) measure inventory items and recipes. Every query is
 * scoped to the single business row; reads run against `getDb()`, writes run
 * inside `withTransaction`.
 *
 * Reference-data semantics: unlike `category`/`supplier`/`inventory_item`, the
 * `unit` table has NO `archived_at` column. Units are referenced by
 * `inventory_item.unit_id` (ON DELETE RESTRICT) and by ledger/recipe rows, so
 * they are never deleted — they are hidden from pickers by flipping
 * `is_active` (see `updateUnit({ isActive: false })`). This mirrors
 * `payment-method.ts`; there is deliberately no `archiveUnit`.
 *
 * The `type` column is CHECK-constrained to the `UNIT_TYPES` vocabulary and is
 * validated at the DB boundary — an unexpected value throws `REPO_INVALID_STATE`
 * rather than flowing into recipe/stock math. Duplicate symbols are rejected by
 * the `UNIQUE (business_id, symbol)` constraint; a UNIQUE violation maps to
 * `REPO_DUPLICATE` via `mapSqliteError`.
 */

// ---------------------------------------------------------------------------
// Row shape (snake_case — the exact `unit` columns from migration 001).
// ---------------------------------------------------------------------------
interface UnitRow {
  id: string;
  business_id: string;
  name: string;
  symbol: string;
  type: UnitType;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// Validate the CHECK-constrained `type` column, narrowing `unknown` → `UnitType`.
function isUnitType(value: unknown): value is UnitType {
  return typeof value === 'string' && (UNIT_TYPES as readonly string[]).includes(value);
}

// Coerce a raw SQLite row into the typed snake_case row, validating `type`.
function mapUnitRow(row: Record<string, unknown>): UnitRow {
  const type = row.type;
  if (!isUnitType(type)) {
    throw repoError(REPO_ERROR.INVALID_STATE, `unexpected unit type in DB: ${String(type)}`);
  }

  return {
    id: str(row.id),
    business_id: str(row.business_id),
    name: str(row.name),
    symbol: str(row.symbol),
    type,
    is_active: int(row.is_active),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
  };
}

// snake_case row → camelCase public object. The single mapping surface so every
// read (list, getById, create/update select-back) returns the identical shape.
const toUnit = (row: UnitRow) => ({
  id: row.id,
  businessId: row.business_id,
  name: row.name,
  symbol: row.symbol,
  type: row.type,
  isActive: boolFromInt(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export type Unit = ReturnType<typeof toUnit>;

const UNIT_COLUMNS = `
  id, business_id, name, symbol, type,
  is_active, created_at, updated_at`;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * List units for the business, ordered by `name ASC`.
 *
 * Inactive units are hidden by default (they should not be offered for new
 * items); pass `includeInactive: true` to also return them. There is no archive
 * concept here — see the module note on reference-data semantics.
 */
export async function listUnits(
  opts: ListOptions & { includeInactive?: boolean } = {},
): Promise<Unit[]> {
  const businessId = await getBusinessId();
  const db = await getDb();

  // Dynamic active/pagination clauses (see AGENTS §9.3 dynamic list pattern).
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
    `SELECT ${UNIT_COLUMNS} FROM unit
      WHERE business_id = ? ${where}
      ORDER BY name ASC${pagination}`,
    ...params,
  );
  return rows.map((row) => toUnit(mapUnitRow(row)));
}

/** Fetch a single unit by id (active or inactive), or `null` when missing. */
export async function getUnitById(id: string): Promise<Unit | null> {
  const businessId = await getBusinessId();
  const db = await getDb();

  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${UNIT_COLUMNS} FROM unit
      WHERE id = ? AND business_id = ?
      LIMIT 1`,
    id,
    businessId,
  );
  return row ? toUnit(mapUnitRow(row)) : null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface CreateUnitInput {
  /** Display name, e.g. "gramo". Required; trimmed. */
  name: string;
  /** Short symbol, e.g. "g". Required; trimmed. Unique per business. */
  symbol: string;
  /** Measurement kind from the `UNIT_TYPES` vocabulary. Required. */
  type: UnitType;
  /** Availability toggle (hide from new items without deleting). Defaults true. */
  isActive?: boolean;
}

export async function createUnit(input: CreateUnitInput): Promise<Unit> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => createUnitWithTxn(txn, businessId, input));
}

async function createUnitWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  input: CreateUnitInput,
): Promise<Unit> {
  // Runtime guard (e.g. JSON import) even though `type` is typed at compile time.
  if (!isUnitType(input.type)) {
    throw repoError(REPO_ERROR.INVALID_STATE, `invalid unit type: ${String(input.type)}`);
  }

  const id = newId();
  const timestamp = nowIso();

  try {
    await txn.runAsync(
      `INSERT INTO unit
         (id, business_id, name, symbol, type, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      businessId,
      input.name.trim(),
      input.symbol.trim(),
      input.type,
      intBool(input.isActive ?? true),
      timestamp,
      timestamp,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  // Select-back inside the transaction so the caller receives the canonical
  // freshly-mapped row (any DB-applied defaults are reflected).
  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${UNIT_COLUMNS} FROM unit WHERE id = ? AND business_id = ? LIMIT 1`,
    id,
    businessId,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND);
  }
  return toUnit(mapUnitRow(row));
}

export interface UpdateUnitInput {
  name?: string;
  symbol?: string;
  type?: UnitType;
  /** Flip to `false` to hide the unit (the supported "remove" operation). */
  isActive?: boolean;
}

export async function updateUnit(id: string, input: UpdateUnitInput): Promise<Unit> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => updateUnitWithTxn(txn, businessId, id, input));
}

async function updateUnitWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  id: string,
  input: UpdateUnitInput,
): Promise<Unit> {
  // Runtime guard (e.g. JSON import) for a caller-supplied type.
  if (input.type !== undefined && !isUnitType(input.type)) {
    throw repoError(REPO_ERROR.INVALID_STATE, `invalid unit type: ${String(input.type)}`);
  }

  // Existence check so a missing id throws NOT_FOUND (not a silent 0-row update).
  const existing = await txn.getFirstAsync<{ id: string }>(
    `SELECT id FROM unit WHERE id = ? AND business_id = ? LIMIT 1`,
    id,
    businessId,
  );
  if (!existing) {
    throw repoError(REPO_ERROR.NOT_FOUND);
  }

  // Only present (non-undefined) fields become SET assignments; values are
  // always bound as parameters, never inlined into the SQL string.
  const { assignments, params } = buildUpdateAssignments({
    name: input.name?.trim(),
    symbol: input.symbol?.trim(),
    type: input.type,
    is_active: input.isActive === undefined ? undefined : intBool(input.isActive),
  });

  // Always bump updated_at (a bare timestamp bump is a valid no-op update).
  assignments.push('updated_at = ?');
  params.push(nowIso());

  try {
    await txn.runAsync(
      `UPDATE unit SET ${assignments.join(', ')} WHERE id = ? AND business_id = ?`,
      ...params,
      id,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${UNIT_COLUMNS} FROM unit WHERE id = ? AND business_id = ? LIMIT 1`,
    id,
    businessId,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND);
  }
  return toUnit(mapUnitRow(row));
}
