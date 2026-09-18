import { getDb } from '@/db/client';

import { getBusinessId } from '@/db/repositories/business-scope';
import { nowIso } from '@/db/repositories/clock';
import type { DatabaseAdapter } from '@/db/repositories/database';
import { REPO_ERROR, mapSqliteError, repoError } from '@/db/repositories/errors';
import { newId } from '@/db/repositories/ids';
import { int, str, strOrNull } from '@/db/repositories/mappers';
import { withTransaction } from '@/db/repositories/transaction';
import type { MoneyMinor } from '@/db/repositories/types';

/**
 * Supplier ⇄ inventory item link repository (migration 001, table
 * `supplier_item`).
 *
 * `supplier_item` is a pure join/link table: it records which inventory items
 * a supplier can provide, plus that supplier's SKU and last-known purchase
 * price for the item. It carries no history and no `archived_at`, so deletion
 * here is a HARD delete (removing the link), unlike the catalog tables.
 *
 * ⚠️ IMPORTANT — this table has NO `business_id` column. It is a join between
 * `supplier` and `inventory_item`, both of which are business-scoped. Business
 * isolation is therefore achieved through the supplier: every scoped query
 * joins `supplier s ON s.id = si.supplier_id` and filters `s.business_id = ?`.
 * (The `inventory_item_id` FK is also business-scoped, but scoping through the
 * supplier keeps the join on the table that owns the row's lifecycle.)
 *
 * Rows are unique per `(supplier_id, inventory_item_id)` — the schema enforces
 * `UNIQUE (supplier_id, inventory_item_id)`, so `upsertSupplierItem` uses an
 * `INSERT ... ON CONFLICT ... DO UPDATE` to write-or-refresh the link idempotently.
 *
 * Writes run inside `withTransaction`; reads run against `getDb()`. A bad
 * `inventory_item_id` violates the `ON DELETE RESTRICT` FK and surfaces as a
 * SQLite constraint error (mapped uniformly via `mapSqliteError`).
 */

// ---------------------------------------------------------------------------
// Row shape (snake_case — the exact `supplier_item` columns from migration
// 001). `purchase_price_minor` is integer minor currency units (cents) —
// never a float (AGENTS §6).
// ---------------------------------------------------------------------------
interface SupplierItemRow {
  id: string;
  supplier_id: string;
  inventory_item_id: string;
  supplier_sku: string | null;
  purchase_price_minor: number;
  created_at: string;
  updated_at: string;
}

// Coerce a raw SQLite row into the typed snake_case row (total, type-safe).
// NULL → null; values → canonical string/number form.
function mapSupplierItemRow(row: Record<string, unknown>): SupplierItemRow {
  return {
    id: str(row.id),
    supplier_id: str(row.supplier_id),
    inventory_item_id: str(row.inventory_item_id),
    supplier_sku: strOrNull(row.supplier_sku),
    purchase_price_minor: int(row.purchase_price_minor),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
  };
}

// snake_case row → camelCase public object (the single mapping surface so every
// read returns the identical shape).
const toSupplierItem = (row: SupplierItemRow) => ({
  id: row.id,
  supplierId: row.supplier_id,
  inventoryItemId: row.inventory_item_id,
  supplierSku: row.supplier_sku,
  purchasePriceMinor: row.purchase_price_minor,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export type SupplierItem = ReturnType<typeof toSupplierItem>;

// Columns are alias-prefixed (`si.`) because every scoped read joins `supplier`
// (aliased `s`) for business isolation; the select-back reuses the same alias.
const SUPPLIER_ITEM_COLUMNS = `
  si.id, si.supplier_id, si.inventory_item_id, si.supplier_sku,
  si.purchase_price_minor, si.created_at, si.updated_at`;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * List a supplier's linked items, oldest-first by `created_at ASC`.
 *
 * Scoped through the `supplier` join: only links whose supplier belongs to the
 * current business are returned (the table itself has no `business_id`).
 */
export async function listSupplierItems(supplierId: string): Promise<SupplierItem[]> {
  const businessId = await getBusinessId();
  const db = await getDb();

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${SUPPLIER_ITEM_COLUMNS}
      FROM supplier_item si
      JOIN supplier s ON s.id = si.supplier_id
      WHERE si.supplier_id = ? AND s.business_id = ?
      ORDER BY si.created_at ASC`,
    supplierId,
    businessId,
  );
  return rows.map((row) => toSupplierItem(mapSupplierItemRow(row)));
}

/**
 * Fetch a single link by id (returns `null` when absent or out of business
 * scope — scoped through the `supplier` join).
 */
export async function getSupplierItemById(id: string): Promise<SupplierItem | null> {
  const businessId = await getBusinessId();
  const db = await getDb();

  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${SUPPLIER_ITEM_COLUMNS}
      FROM supplier_item si
      JOIN supplier s ON s.id = si.supplier_id
      WHERE si.id = ? AND s.business_id = ?
      LIMIT 1`,
    id,
    businessId,
  );
  return row ? toSupplierItem(mapSupplierItemRow(row)) : null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface UpsertSupplierItemInput {
  supplierId: string;
  inventoryItemId: string;
  /** The supplier's own SKU for this item. Optional; null clears it. */
  supplierSku?: string | null;
  /**
   * Last known purchase price per display unit, minor currency. Optional;
   * defaults to 0. Must be >= 0 when provided.
   */
  purchasePriceMinor?: MoneyMinor;
}

/**
 * Create-or-refresh a supplier ⇄ item link. The table is unique on
 * `(supplier_id, inventory_item_id)`, so a conflict updates the mutable fields
 * in place instead of failing with a duplicate.
 *
 * The link table has no `business_id`; the write resolves its own scope
 * implicitly through the supplier's FK (and the caller supplies ids already
 * drawn from business-scoped lists). A bad `inventory_item_id` surfaces as an
 * FK constraint error via `mapSqliteError`.
 */
export async function upsertSupplierItem(
  input: UpsertSupplierItemInput,
): Promise<SupplierItem> {
  return withTransaction((txn) => upsertSupplierItemWithTxn(txn, input));
}

export async function upsertSupplierItemWithTxn(
  txn: DatabaseAdapter,
  input: UpsertSupplierItemInput,
): Promise<SupplierItem> {
  // Validate BEFORE any write: a negative price is a caller error, not a row
  // to persist (and the schema would not reject it — it has no price CHECK).
  if (input.purchasePriceMinor !== undefined && input.purchasePriceMinor < 0) {
    throw repoError(REPO_ERROR.INVALID_STATE, 'purchasePriceMinor must be >= 0');
  }

  const id = newId();
  const timestamp = nowIso();

  try {
    await txn.runAsync(
      `INSERT INTO supplier_item
         (id, supplier_id, inventory_item_id, supplier_sku,
          purchase_price_minor, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (supplier_id, inventory_item_id) DO UPDATE SET
         supplier_sku = excluded.supplier_sku,
         purchase_price_minor = excluded.purchase_price_minor,
         updated_at = excluded.updated_at`,
      id,
      input.supplierId,
      input.inventoryItemId,
      input.supplierSku?.trim() || null,
      input.purchasePriceMinor ?? 0,
      timestamp,
      timestamp,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  // Select-back by the unique pair (no business join needed — the write path
  // is already scoped by the caller's business-scoped ids) so the caller
  // receives the canonical freshly-mapped row.
  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${SUPPLIER_ITEM_COLUMNS}
      FROM supplier_item si
      WHERE si.supplier_id = ? AND si.inventory_item_id = ?
      LIMIT 1`,
    input.supplierId,
    input.inventoryItemId,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND);
  }
  return toSupplierItem(mapSupplierItemRow(row));
}

/**
 * Hard-delete a supplier ⇄ item link. The table carries no history and has no
 * `archived_at`, so a physical delete is correct here (removing the link).
 * Scoped through the `supplier` join; throws `REPO_NOT_FOUND` when absent.
 */
export async function deleteSupplierItem(id: string): Promise<void> {
  const businessId = await getBusinessId();
  await withTransaction((txn) => deleteSupplierItemWithTxn(txn, businessId, id));
}

async function deleteSupplierItemWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  id: string,
): Promise<void> {
  // Existence guard scoped through the supplier join so deleting a link from
  // another business (or a missing id) is a loud NOT_FOUND, not a silent
  // 0-row delete.
  const existing = await txn.getFirstAsync<{ id: string }>(
    `SELECT si.id FROM supplier_item si
      JOIN supplier s ON s.id = si.supplier_id
      WHERE si.id = ? AND s.business_id = ?
      LIMIT 1`,
    id,
    businessId,
  );
  if (!existing) {
    throw repoError(REPO_ERROR.NOT_FOUND);
  }

  try {
    await txn.runAsync(`DELETE FROM supplier_item WHERE id = ?`, id);
  } catch (error) {
    throw mapSqliteError(error);
  }
}
