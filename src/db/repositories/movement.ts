import { getDb } from '@/db/client';

import { getBusinessId } from '@/db/repositories/business-scope';
import { assertSufficientStock } from '@/db/repositories/calc';
import { nowIso } from '@/db/repositories/clock';
import type { DatabaseAdapter, SqlValue } from '@/db/repositories/database';
import { REPO_ERROR, mapSqliteError, repoError } from '@/db/repositories/errors';
import { newId } from '@/db/repositories/ids';
import { int, str, strOrNull } from '@/db/repositories/mappers';
import { DEFAULT_PAGE_LIMIT, encodeCursor, keysetWhere } from '@/db/repositories/pagination';
import type { Page, PageQuery } from '@/db/repositories/pagination';
import { withTransaction } from '@/db/repositories/transaction';
import { isMovementType } from '@/db/repositories/types';
import type {
  MoneyMinor,
  MovementType,
  QuantityMilli,
  TimestampIso,
} from '@/db/repositories/types';

/**
 * Inventory movement repository — THE SINGLE STOCK LEDGER (migration 001,
 * table `inventory_movement`).
 *
 * ⚠️ THE CENTRAL INVARIANT OF THE WHOLE APP:
 *
 * `inventory_movement` is the historical source of truth for stock. Every unit
 * of stock a business has ever held is explained by a row here (signed
 * `quantity`: positive = stock in, negative = stock out).
 * `inventory_item.current_quantity` is only a CACHE — a denormalized snapshot
 * of `SUM(inventory_movement.quantity)` for that item.
 *
 * The cache may ONLY ever change in the SAME transaction as the movement
 * INSERT that explains the change. This module is the ONLY module allowed to
 * write `inventory_item.current_quantity`. Any other writer of that column
 * silently drifts the cache away from the ledger and corrupts stock counts.
 * (inventory-item.ts enforces the reverse half of the invariant: it inserts
 * `current_quantity = 0` and never writes the column again.)
 *
 * Concretely:
 *   - `recordMovementWithTxn` INSERTs a movement and UPDATEs the cache inside
 *     the caller's transaction — it NEVER opens its own transaction, so the
 *     two writes commit or roll back together.
 *   - `adjustQuantity` posts an ADJUSTMENT movement equal to the signed delta
 *     between the requested and the current quantity.
 *   - `reconcileItemFromLedger` is the repair hatch for cache drift: it
 *     recomputes the cache from `SUM(inventory_movement.quantity)`.
 *
 * History rows are NEVER archived and NEVER hard-deleted — the ledger is
 * append-only (AGENTS §6). `listMovements` therefore never filters on
 * `archived_at` (the table has none).
 */

// ---------------------------------------------------------------------------
// Row shape (snake_case — the exact `inventory_movement` columns from
// migration 001). There are no 0/1 flags and no `archived_at`/`updated_at`:
// ledger rows are immutable history. Quantities/costs are integer milli-units /
// minor-units (never floats — AGENTS §6).
// ---------------------------------------------------------------------------
interface InventoryMovementRow {
  id: string;
  business_id: string;
  inventory_item_id: string;
  type: MovementType;
  quantity: number;
  unit_id: string;
  unit_cost_minor: number;
  reason: string | null;
  notes: string | null;
  reference_type: string | null;
  reference_id: string | null;
  employee_id: string | null;
  created_at: string;
}

/** Column list shared by every `inventory_movement` SELECT (matches the row). */
const MOVEMENT_COLUMNS = `
  id, business_id, inventory_item_id, type, quantity, unit_id,
  unit_cost_minor, reason, notes, reference_type, reference_id,
  employee_id, created_at`;

/** Coerce an untyped SQLite row into the typed snake_case `InventoryMovementRow`. */
function mapInventoryMovementRow(row: Record<string, unknown>): InventoryMovementRow {
  // `type` must satisfy the CHECK constraint; guard at the boundary so a bad
  // value fails loudly rather than widening the public type.
  const type = row.type;
  if (!isMovementType(type)) {
    throw repoError(REPO_ERROR.INVALID_STATE, `unexpected inventory movement type in DB: ${String(type)}`);
  }
  return {
    id: str(row.id),
    business_id: str(row.business_id),
    inventory_item_id: str(row.inventory_item_id),
    type,
    quantity: int(row.quantity),
    unit_id: str(row.unit_id),
    unit_cost_minor: int(row.unit_cost_minor),
    reason: strOrNull(row.reason),
    notes: strOrNull(row.notes),
    reference_type: strOrNull(row.reference_type),
    reference_id: strOrNull(row.reference_id),
    employee_id: strOrNull(row.employee_id),
    created_at: str(row.created_at),
  };
}

/** Map a typed row to the public camelCase shape (the single mapping surface). */
const toInventoryMovement = (row: InventoryMovementRow) => ({
  id: row.id,
  businessId: row.business_id,
  inventoryItemId: row.inventory_item_id,
  type: row.type,
  quantity: row.quantity,
  unitId: row.unit_id,
  unitCostMinor: row.unit_cost_minor,
  reason: row.reason,
  notes: row.notes,
  referenceType: row.reference_type,
  referenceId: row.reference_id,
  employeeId: row.employee_id,
  createdAt: row.created_at,
});

/** Public movement type — derived from the private mapper. */
export type InventoryMovement = ReturnType<typeof toInventoryMovement>;

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Fields required to post one ledger movement. */
export interface RecordMovementInput {
  inventoryItemId: string;
  type: MovementType;
  /** SIGNED milli-units: positive = stock in, negative = stock out. Must be non-zero. */
  quantity: QuantityMilli;
  unitCostMinor?: MoneyMinor;
  reason?: string;
  notes?: string;
  referenceType?: string;
  referenceId?: string;
  employeeId?: string;
}

/**
 * Post a movement: open a transaction, then INSERT the movement and UPDATE the
 * `current_quantity` cache atomically. See `recordMovementWithTxn`.
 */
export async function recordMovement(input: RecordMovementInput): Promise<void> {
  const businessId = await getBusinessId();
  await withTransaction((txn) => recordMovementWithTxn(txn, businessId, input));
}

/**
 * Shared transactional primitive — the ONE place the ledger and its cache are
 * written together. Callers MUST already be inside `withTransaction`; this
 * function never opens (or nests) a transaction itself.
 *
 * Sequence (all on the caller's `txn`):
 *  1. Validate `quantity !== 0` and `type` (else `REPO_INVALID_STATE`).
 *  2. Read the item (`id, unit_id, current_quantity`) — missing → `REPO_NOT_FOUND`.
 *  3. Read the business `allow_negative_inventory` flag (0/1).
 *  4. `assertSufficientStock` — throws `INVENTORY_INSUFFICIENT_STOCK` when the
 *     signed delta would drive stock negative (unless the business opts in).
 *  5. INSERT the movement row using the ITEM's `unit_id` (never caller-supplied).
 *  6. UPDATE the cache: `current_quantity = current_quantity + ?`.
 */
export async function recordMovementWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  input: RecordMovementInput,
): Promise<void> {
  // 1. Validate before touching the DB.
  if (input.quantity === 0) {
    throw repoError(REPO_ERROR.INVALID_STATE, 'movement quantity must be non-zero');
  }
  if (!isMovementType(input.type)) {
    throw repoError(REPO_ERROR.INVALID_STATE, `invalid movement type: ${String(input.type)}`);
  }

  // 2. The item owns its unit of measure; the movement records it for history.
  const item = await txn.getFirstAsync<{
    id: string;
    unit_id: string;
    current_quantity: number;
  }>(
    `SELECT id, unit_id, current_quantity FROM inventory_item
      WHERE id = ? AND business_id = ? LIMIT 1`,
    input.inventoryItemId,
    businessId,
  );
  if (!item) {
    throw repoError(REPO_ERROR.NOT_FOUND, `inventory item not found: ${input.inventoryItemId}`);
  }

  // 3. Negative-inventory opt-in lives on the business row (0/1 flag).
  const business = await txn.getFirstAsync<{ allow_negative_inventory: number }>(
    `SELECT allow_negative_inventory FROM business WHERE id = ? LIMIT 1`,
    businessId,
  );
  const allowNegative = business?.allow_negative_inventory === 1;

  // 4. Guard the stock level before any write.
  assertSufficientStock(item.current_quantity, input.quantity, allowNegative);

  const id = newId();
  const timestamp = nowIso();

  // 5. Append the movement (source of truth).
  try {
    await txn.runAsync(
      `INSERT INTO inventory_movement
         (id, business_id, inventory_item_id, type, quantity, unit_id,
          unit_cost_minor, reason, notes, reference_type, reference_id,
          employee_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      businessId,
      input.inventoryItemId,
      input.type,
      input.quantity,
      item.unit_id,
      input.unitCostMinor ?? 0,
      input.reason ?? null,
      input.notes ?? null,
      input.referenceType ?? null,
      input.referenceId ?? null,
      input.employeeId ?? null,
      timestamp,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  // 6. Update the cache IN THE SAME TRANSACTION (the invariant). Never write
  //    `current_quantity` from anywhere else.
  try {
    await txn.runAsync(
      `UPDATE inventory_item
          SET current_quantity = current_quantity + ?, updated_at = ?
        WHERE id = ? AND business_id = ?`,
      input.quantity,
      timestamp,
      input.inventoryItemId,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }
}

/** Request a manual stock-count correction. */
export async function adjustQuantity(input: {
  inventoryItemId: string;
  newQuantity: QuantityMilli;
  reason?: string;
  employeeId?: string;
}): Promise<void> {
  const businessId = await getBusinessId();
  await withTransaction((txn) => adjustQuantityWithTxn(txn, businessId, input));
}

/**
 * Compute the signed delta vs. the current cache and post it as an ADJUSTMENT
 * movement. A zero delta is a no-op (no movement, no cache write).
 */
async function adjustQuantityWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  input: { inventoryItemId: string; newQuantity: QuantityMilli; reason?: string; employeeId?: string },
): Promise<void> {
  const item = await txn.getFirstAsync<{ id: string; current_quantity: number }>(
    `SELECT id, current_quantity FROM inventory_item
      WHERE id = ? AND business_id = ? LIMIT 1`,
    input.inventoryItemId,
    businessId,
  );
  if (!item) {
    throw repoError(REPO_ERROR.NOT_FOUND, `inventory item not found: ${input.inventoryItemId}`);
  }

  const delta = input.newQuantity - item.current_quantity;
  if (delta === 0) {
    return;
  }

  await recordMovementWithTxn(txn, businessId, {
    inventoryItemId: input.inventoryItemId,
    type: 'ADJUSTMENT',
    quantity: delta,
    reason: input.reason,
    employeeId: input.employeeId,
  });
}

/**
 * Repair hatch for cache drift: recompute `current_quantity` from the ledger
 * (`SUM(quantity)`) and write it back. Does not create any movement.
 */
export async function reconcileItemFromLedger(inventoryItemId: string): Promise<void> {
  const businessId = await getBusinessId();
  await withTransaction((txn) => reconcileItemFromLedgerWithTxn(txn, businessId, inventoryItemId));
}

async function reconcileItemFromLedgerWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  inventoryItemId: string,
): Promise<void> {
  // COALESCE + an aggregate without GROUP BY always yields exactly one row, so
  // `total` is never NULL. The `?? 0` is purely to satisfy the adapter seam's
  // nullable return type.
  const row = await txn.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(quantity), 0) AS total FROM inventory_movement
      WHERE inventory_item_id = ? AND business_id = ?`,
    inventoryItemId,
    businessId,
  );
  const total = row?.total ?? 0;

  try {
    await txn.runAsync(
      `UPDATE inventory_item
          SET current_quantity = ?, updated_at = ?
        WHERE id = ? AND business_id = ?`,
      total,
      nowIso(),
      inventoryItemId,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Filters for listing ledger history (keyset-paginated, newest-first). */
export interface MovementFilter extends PageQuery {
  inventoryItemId?: string;
  type?: MovementType;
  referenceType?: string;
  referenceId?: string;
  from?: TimestampIso;
  to?: TimestampIso;
}

/**
 * List movements for the business, newest-first (`created_at DESC, id DESC`),
 * keyset-paginated. History rows are never archived, so there is deliberately
 * NO `archived_at` predicate here. Optional filters are each `column = ?` /
 * range predicates bound as parameters; `from`/`to` map to
 * `created_at >= ?` / `created_at <= ?`.
 */
export async function listMovements(filter: MovementFilter = {}): Promise<Page<InventoryMovement>> {
  const db = await getDb();
  const businessId = await getBusinessId();

  // Base scope + optional filters, each with a bound parameter (never inlined).
  const clauses: string[] = ['business_id = ?'];
  const params: SqlValue[] = [businessId];

  if (filter.inventoryItemId !== undefined) {
    clauses.push('inventory_item_id = ?');
    params.push(filter.inventoryItemId);
  }
  if (filter.type !== undefined) {
    clauses.push('type = ?');
    params.push(filter.type);
  }
  if (filter.referenceType !== undefined) {
    clauses.push('reference_type = ?');
    params.push(filter.referenceType);
  }
  if (filter.referenceId !== undefined) {
    clauses.push('reference_id = ?');
    params.push(filter.referenceId);
  }
  if (filter.from !== undefined) {
    clauses.push('created_at >= ?');
    params.push(filter.from);
  }
  if (filter.to !== undefined) {
    clauses.push('created_at <= ?');
    params.push(filter.to);
  }

  // Keyset page: a cursor becomes `AND (created_at, id) < (?, ?)` — with DESC
  // ordering, `<` selects strictly-older rows (the next page).
  const { clause: keysetClause, params: keysetParams } = keysetWhere(filter.cursor);
  const limit = filter.limit ?? DEFAULT_PAGE_LIMIT;

  const where = `${clauses.join(' AND ')}${keysetClause ? ` ${keysetClause}` : ''}`;

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${MOVEMENT_COLUMNS}
       FROM inventory_movement
      WHERE ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    ...params,
    ...keysetParams,
    limit,
  );

  const items = rows.map((row) => toInventoryMovement(mapInventoryMovementRow(row)));

  // A full page (rows.length === limit) implies more may follow; encode the
  // last row's keyset position as the next cursor. Otherwise there is no page 2.
  const last = items[items.length - 1];
  const nextCursor =
    rows.length === limit && last ? encodeCursor(last.createdAt, last.id) : null;

  return { items, nextCursor };
}
