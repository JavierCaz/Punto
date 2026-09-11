import { getDb } from '@/db';

import { getBusinessId } from '@/db/repositories/business-scope';
import { nowIso } from '@/db/repositories/clock';
import type { DatabaseAdapter, SqlValue } from '@/db/repositories/database';
import { REPO_ERROR, mapSqliteError, repoError } from '@/db/repositories/errors';
import { newId } from '@/db/repositories/ids';
import {
  archiveSoftWhere,
  boolFromInt,
  int,
  intBool,
  str,
  strOrNull,
} from '@/db/repositories/mappers';
import { buildUpdateAssignments } from '@/db/repositories/sql';
import { withTransaction } from '@/db/repositories/transaction';
import type { ListOptions } from '@/db/repositories/types';

/**
 * Supplier entity repository (migration 001, table `supplier`).
 *
 * Suppliers are the businesses the owner buys ingredients/products from
 * (AGENTS §3.1). Every query is scoped to the single business row; reads run
 * against `getDb()`, writes run inside `withTransaction`, and all rows are
 * soft-deleted via `archived_at` (live rows satisfy `archived_at IS NULL`).
 *
 * Duplicate live names are rejected by the partial unique index
 * `uq_supplier_name (business_id, name) WHERE archived_at IS NULL`; a UNIQUE
 * violation maps to `REPO_DUPLICATE` via `mapSqliteError`.
 */

// ---------------------------------------------------------------------------
// Row shape (snake_case — the exact `supplier` columns from migration 001).
// INTEGER 0/1 flags are kept as `number` here and coerced to booleans in
// `toSupplier` so the mapper stays a pure, total transformation.
// ---------------------------------------------------------------------------
interface SupplierRow {
  id: string;
  business_id: string;
  name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

// Coerce a raw SQLite row (`Record<string, unknown>`) into the typed snake_case
// row. Total and type-safe: NULL → null, values → canonical string/number form.
function mapSupplierRow(row: Record<string, unknown>): SupplierRow {
  return {
    id: str(row.id),
    business_id: str(row.business_id),
    name: str(row.name),
    business_name: strOrNull(row.business_name),
    phone: strOrNull(row.phone),
    email: strOrNull(row.email),
    tax_id: strOrNull(row.tax_id),
    notes: strOrNull(row.notes),
    is_active: int(row.is_active),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
    archived_at: strOrNull(row.archived_at),
  };
}

// snake_case row → camelCase public object. The single mapping surface so every
// read (list, getById, create/update select-back) returns the identical shape.
const toSupplier = (row: SupplierRow) => ({
  id: row.id,
  businessId: row.business_id,
  name: row.name,
  businessName: row.business_name,
  phone: row.phone,
  email: row.email,
  taxId: row.tax_id,
  notes: row.notes,
  isActive: boolFromInt(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
});

export type Supplier = ReturnType<typeof toSupplier>;

const SUPPLIER_COLUMNS = `
  id, business_id, name, business_name, phone, email, tax_id, notes,
  is_active, created_at, updated_at, archived_at`;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * List suppliers for the business, newest-first by `name ASC`.
 * Soft-deleted (archived) rows are excluded unless `opts.includeArchived`.
 */
export async function listSuppliers(opts: ListOptions = {}): Promise<Supplier[]> {
  const businessId = await getBusinessId();
  const db = await getDb();

  // Dynamic archive/pagination clauses (see AGENTS §9.3 dynamic list pattern):
  // `where` begins with `AND` so it slots after `business_id = ?`; `pagination`
  // is built only from the fields the caller actually set.
  const where = opts.includeArchived ? '' : `AND ${archiveSoftWhere}`;
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
    `SELECT ${SUPPLIER_COLUMNS} FROM supplier
      WHERE business_id = ? ${where}
      ORDER BY name ASC${pagination}`,
    ...params,
  );
  return rows.map((row) => toSupplier(mapSupplierRow(row)));
}

/** Fetch a single live supplier by id (archived rows return `null`). */
export async function getSupplierById(id: string): Promise<Supplier | null> {
  const businessId = await getBusinessId();
  const db = await getDb();

  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${SUPPLIER_COLUMNS} FROM supplier
      WHERE id = ? AND business_id = ? AND ${archiveSoftWhere}
      LIMIT 1`,
    id,
    businessId,
  );
  return row ? toSupplier(mapSupplierRow(row)) : null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface CreateSupplierInput {
  /** Display name. Required; trimmed. */
  name: string;
  businessName?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  notes?: string;
  /** Availability toggle (hide from purchase forms without deleting). Defaults true. */
  isActive?: boolean;
}

export async function createSupplier(input: CreateSupplierInput): Promise<Supplier> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => createSupplierWithTxn(txn, businessId, input));
}

async function createSupplierWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  input: CreateSupplierInput,
): Promise<Supplier> {
  const id = newId();
  const timestamp = nowIso();

  try {
    await txn.runAsync(
      `INSERT INTO supplier
         (id, business_id, name, business_name, phone, email, tax_id, notes,
          is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      businessId,
      input.name.trim(),
      input.businessName?.trim() || null,
      input.phone?.trim() || null,
      input.email?.trim() || null,
      input.taxId?.trim() || null,
      input.notes ?? null,
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
    `SELECT ${SUPPLIER_COLUMNS} FROM supplier WHERE id = ? AND business_id = ? LIMIT 1`,
    id,
    businessId,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND);
  }
  return toSupplier(mapSupplierRow(row));
}

export interface UpdateSupplierInput {
  name?: string;
  businessName?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  notes?: string;
  isActive?: boolean;
}

export async function updateSupplier(id: string, input: UpdateSupplierInput): Promise<Supplier> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => updateSupplierWithTxn(txn, businessId, id, input));
}

async function updateSupplierWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  id: string,
  input: UpdateSupplierInput,
): Promise<Supplier> {
  // Only present (non-undefined) fields become SET assignments; values are
  // always bound as parameters, never inlined into the SQL string.
  const { assignments, params } = buildUpdateAssignments({
    name: input.name?.trim(),
    business_name: input.businessName?.trim(),
    phone: input.phone?.trim(),
    email: input.email?.trim(),
    tax_id: input.taxId?.trim(),
    notes: input.notes,
    is_active: input.isActive === undefined ? undefined : intBool(input.isActive),
  });

  if (assignments.length > 0) {
    try {
      await txn.runAsync(
        `UPDATE supplier SET ${assignments.join(', ')}, updated_at = ?
          WHERE id = ? AND business_id = ?`,
        ...params,
        nowIso(),
        id,
        businessId,
      );
    } catch (error) {
      throw mapSqliteError(error);
    }
  }

  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${SUPPLIER_COLUMNS} FROM supplier WHERE id = ? AND business_id = ? LIMIT 1`,
    id,
    businessId,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND);
  }
  return toSupplier(mapSupplierRow(row));
}

/** Soft-delete a supplier. Throws `REPO_NOT_FOUND` when absent or already archived. */
export async function archiveSupplier(id: string): Promise<void> {
  const businessId = await getBusinessId();
  await withTransaction((txn) => archiveSupplierWithTxn(txn, businessId, id));
}

async function archiveSupplierWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  id: string,
): Promise<void> {
  // Existence guard (live rows only) so archiving a missing/archived supplier
  // is a loud NOT_FOUND rather than a silent 0-row update.
  const existing = await txn.getFirstAsync<{ id: string }>(
    `SELECT id FROM supplier WHERE id = ? AND business_id = ? AND ${archiveSoftWhere} LIMIT 1`,
    id,
    businessId,
  );
  if (!existing) {
    throw repoError(REPO_ERROR.NOT_FOUND);
  }

  const timestamp = nowIso();
  try {
    await txn.runAsync(
      `UPDATE supplier SET archived_at = ?, updated_at = ? WHERE id = ? AND business_id = ?`,
      timestamp,
      timestamp,
      id,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }
}
