import { getDb } from '@/db';

import { nextPurchaseNumber } from '@/db/repositories/app-metadata';
import { getBusinessId } from '@/db/repositories/business-scope';
import { sumMinor, weightedAverageUnitCostMinor } from '@/db/repositories/calc';
import { nowIso } from '@/db/repositories/clock';
import type { DatabaseAdapter, SqlValue } from '@/db/repositories/database';
import { REPO_ERROR, mapSqliteError, repoError } from '@/db/repositories/errors';
import { newId } from '@/db/repositories/ids';
import { int, str, strOrNull } from '@/db/repositories/mappers';
import { recordMovementWithTxn } from '@/db/repositories/movement';
import { DEFAULT_PAGE_LIMIT, encodeCursor, keysetWhere } from '@/db/repositories/pagination';
import type { Page, PageQuery } from '@/db/repositories/pagination';
import { withTransaction } from '@/db/repositories/transaction';
import { PURCHASE_STATUSES } from '@/db/repositories/types';
import type {
  MoneyMinor,
  PurchaseStatus,
  QuantityMilli,
  TimestampIso,
} from '@/db/repositories/types';

/**
 * Purchase repository (migration 001, tables `purchase` + `purchase_item`).
 *
 * A purchase is "money out + stock in" (AGENTS §3.1): the owner buys ingredients
 * or products from a supplier, receives stock, and spends money. `createPurchase`
 * is therefore a single transaction that does BOTH halves:
 *
 *   1. Money out  — INSERT the `purchase` header (status `COMPLETED`) and its
 *      `purchase_item` lines, with integer-exact line subtotals.
 *   2. Stock in   — for every line, post a `PURCHASE` inventory movement (positive
 *      quantity) via `recordMovementWithTxn`, then recompute the item's
 *      weighted-average `unit_cost_minor`.
 *
 * `cancelPurchase` inverts the stock half: it posts `RETURN` movements with the
 * negated quantity and flips the header to `CANCELLED` — money totals stay as a
 * historical record (the ledger never hard-deletes — AGENTS §6).
 *
 * Conventions (see AGENTS §9.3 / database.ts): reads resolve `getDb()` directly,
 * writes go through `withTransaction`, every query is scoped `business_id = ?`,
 * and ids/timestamps come from `newId()`/`nowIso()`. Money is INTEGER minor
 * units and quantities are INTEGER milli-units (×1000) — never floats. Line
 * subtotal = `Math.round((quantity × unitCostMinor) / 1000)` because `quantity`
 * is in milli-units while `unitCostMinor` is per display unit.
 */

// ---------------------------------------------------------------------------
// Row shapes (snake_case — the exact `purchase` / `purchase_item` columns from
// migration 001). Money/quantity columns are integer minor / milli units.
// `purchase_item` has NO `business_id` of its own — it is scoped through its
// parent `purchase` (which is business-scoped), exactly like `sale_item`.
// ---------------------------------------------------------------------------
interface PurchaseRow {
  id: string;
  business_id: string;
  supplier_id: string | null;
  purchase_number: string;
  subtotal_minor: number;
  tax_minor: number;
  discount_minor: number;
  total_minor: number;
  status: PurchaseStatus;
  notes: string | null;
  employee_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PurchaseItemRow {
  id: string;
  purchase_id: string;
  inventory_item_id: string;
  quantity: number;
  unit_id: string;
  unit_cost_minor: number;
  subtotal_minor: number;
  created_at: string;
}

/** Column list shared by every `purchase` SELECT (matches PurchaseRow fields). */
const PURCHASE_COLUMNS = `
  id, business_id, supplier_id, purchase_number, subtotal_minor, tax_minor,
  discount_minor, total_minor, status, notes, employee_id, created_at,
  updated_at`;

/** Column list shared by every `purchase_item` SELECT (matches PurchaseItemRow). */
const PURCHASE_ITEM_COLUMNS = `
  id, purchase_id, inventory_item_id, quantity, unit_id, unit_cost_minor,
  subtotal_minor, created_at`;

/** Type guard for the `purchase.status` CHECK constraint (mirrors movement.ts). */
function isPurchaseStatus(value: unknown): value is PurchaseStatus {
  return typeof value === 'string' && (PURCHASE_STATUSES as readonly string[]).includes(value);
}

/** Coerce an untyped SQLite row into the typed snake_case `PurchaseRow`. */
function mapPurchaseRow(row: Record<string, unknown>): PurchaseRow {
  const status = row.status;
  if (!isPurchaseStatus(status)) {
    throw repoError(REPO_ERROR.INVALID_STATE, `unexpected purchase status in DB: ${String(status)}`);
  }
  return {
    id: str(row.id),
    business_id: str(row.business_id),
    supplier_id: strOrNull(row.supplier_id),
    purchase_number: str(row.purchase_number),
    subtotal_minor: int(row.subtotal_minor),
    tax_minor: int(row.tax_minor),
    discount_minor: int(row.discount_minor),
    total_minor: int(row.total_minor),
    status,
    notes: strOrNull(row.notes),
    employee_id: strOrNull(row.employee_id),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
  };
}

/** Coerce an untyped SQLite row into the typed snake_case `PurchaseItemRow`. */
function mapPurchaseItemRow(row: Record<string, unknown>): PurchaseItemRow {
  return {
    id: str(row.id),
    purchase_id: str(row.purchase_id),
    inventory_item_id: str(row.inventory_item_id),
    quantity: int(row.quantity),
    unit_id: str(row.unit_id),
    unit_cost_minor: int(row.unit_cost_minor),
    subtotal_minor: int(row.subtotal_minor),
    created_at: str(row.created_at),
  };
}

/** snake_case row → camelCase public object (the single mapping surface). */
const toPurchase = (row: PurchaseRow) => ({
  id: row.id,
  businessId: row.business_id,
  supplierId: row.supplier_id,
  purchaseNumber: row.purchase_number,
  subtotalMinor: row.subtotal_minor,
  taxMinor: row.tax_minor,
  discountMinor: row.discount_minor,
  totalMinor: row.total_minor,
  status: row.status,
  notes: row.notes,
  employeeId: row.employee_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** snake_case row → camelCase public object. */
const toPurchaseItem = (row: PurchaseItemRow) => ({
  id: row.id,
  purchaseId: row.purchase_id,
  inventoryItemId: row.inventory_item_id,
  quantity: row.quantity,
  unitId: row.unit_id,
  unitCostMinor: row.unit_cost_minor,
  subtotalMinor: row.subtotal_minor,
  createdAt: row.created_at,
});

/** Public purchase type — derived from the private mapper. */
export type Purchase = ReturnType<typeof toPurchase>;
/** Public purchase line-item type — derived from the private mapper. */
export type PurchaseItem = ReturnType<typeof toPurchaseItem>;
/** A purchase header plus its line items. */
export type PurchaseDetail = Purchase & { items: PurchaseItem[] };

/**
 * Read a purchase header plus its items through `adapter` (either `getDb()` or
 * an in-flight `txn` — both satisfy `DatabaseAdapter`). Returns `null` when the
 * header is absent; items are never business-scoped directly (the header is).
 */
async function readPurchaseDetail(
  adapter: DatabaseAdapter,
  businessId: string,
  id: string,
): Promise<PurchaseDetail | null> {
  const row = await adapter.getFirstAsync<Record<string, unknown>>(
    `SELECT ${PURCHASE_COLUMNS}
       FROM purchase
      WHERE id = ? AND business_id = ?
      LIMIT 1`,
    id,
    businessId,
  );
  if (!row) {
    return null;
  }

  const itemRows = await adapter.getAllAsync<Record<string, unknown>>(
    `SELECT ${PURCHASE_ITEM_COLUMNS}
       FROM purchase_item
      WHERE purchase_id = ?`,
    id,
  );

  return {
    ...toPurchase(mapPurchaseRow(row)),
    items: itemRows.map((itemRow) => toPurchaseItem(mapPurchaseItemRow(itemRow))),
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** A single received line on a purchase. */
export interface PurchaseItemInput {
  inventoryItemId: string;
  /** Quantity received, in milli-units of the item's unit. Must be > 0. */
  quantity: QuantityMilli;
  /** Unit of measure for this line (references `unit.id`). */
  unitId: string;
  /** Cost per display unit, minor currency. Must be >= 0. */
  unitCostMinor: MoneyMinor;
}

/** Fields accepted when creating a purchase (money out + stock in). */
export interface CreatePurchaseInput {
  supplierId?: string;
  employeeId?: string;
  notes?: string;
  items: PurchaseItemInput[];
}

/**
 * Record a purchase: INSERT header + lines, post `PURCHASE` stock-in movements,
 * and refresh each item's weighted-average unit cost — all in ONE transaction.
 */
export async function createPurchase(input: CreatePurchaseInput): Promise<PurchaseDetail> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => createPurchaseWithTxn(txn, businessId, input));
}

async function createPurchaseWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  input: CreatePurchaseInput,
): Promise<PurchaseDetail> {
  // 1. Validate BEFORE any write (a purchase with no lines, a non-positive
  //    quantity, or a negative cost is a caller bug, not a row to persist).
  if (input.items.length === 0) {
    throw repoError(REPO_ERROR.INVALID_STATE, 'purchase must contain at least one item');
  }
  for (const item of input.items) {
    if (item.quantity <= 0) {
      throw repoError(REPO_ERROR.INVALID_STATE, 'purchase item quantity must be > 0');
    }
    if (item.unitCostMinor < 0) {
      throw repoError(REPO_ERROR.INVALID_STATE, 'purchase item unitCostMinor must be >= 0');
    }
  }

  const id = newId();
  const purchaseNumber = await nextPurchaseNumber(txn);
  const timestamp = nowIso();

  // 2. Money math (integer, never floats — AGENTS §6). `quantity` is milli-units
  //    while `unitCostMinor` is per display unit, so scale by 1000 and round to
  //    the nearest minor unit for an integer-exact line subtotal.
  const lineSubtotals = input.items.map((item) =>
    Math.round((item.quantity * item.unitCostMinor) / 1000),
  );
  const subtotalMinor = sumMinor(lineSubtotals);
  // v1: no purchase-level tax or discount (the columns exist, pinned at 0).
  const taxMinor = 0;
  const discountMinor = 0;
  const totalMinor = subtotalMinor;

  // 3. Money out — INSERT the header (status COMPLETED).
  try {
    await txn.runAsync(
      `INSERT INTO purchase
         (id, business_id, supplier_id, purchase_number, subtotal_minor,
          tax_minor, discount_minor, total_minor, status, notes, employee_id,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      businessId,
      input.supplierId ?? null,
      purchaseNumber,
      subtotalMinor,
      taxMinor,
      discountMinor,
      totalMinor,
      'COMPLETED',
      input.notes ?? null,
      input.employeeId ?? null,
      timestamp,
      timestamp,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  // 4. Stock in — per line: INSERT the line, then post the movement and refresh
  //    the weighted-average cost. The item's CURRENT cost is read BEFORE the
  //    movement (which only touches `current_quantity`, but reading first keeps
  //    the pre-receipt cost unambiguous) and the average is written AFTER, so the
  //    cache reflects the freshly-received stock.
  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i];
    const lineSubtotal = lineSubtotals[i];
    const itemId = newId();

    try {
      await txn.runAsync(
        `INSERT INTO purchase_item
           (id, purchase_id, inventory_item_id, quantity, unit_id,
            unit_cost_minor, subtotal_minor, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        itemId,
        id,
        item.inventoryItemId,
        item.quantity,
        item.unitId,
        item.unitCostMinor,
        lineSubtotal,
        timestamp,
      );
    } catch (error) {
      throw mapSqliteError(error);
    }

    // Read the pre-receipt cost cache BEFORE the movement mutates the item row.
    const current = await txn.getFirstAsync<{
      current_quantity: number;
      unit_cost_minor: number;
    }>(
      `SELECT current_quantity, unit_cost_minor FROM inventory_item
        WHERE id = ? AND business_id = ?
        LIMIT 1`,
      item.inventoryItemId,
      businessId,
    );
    if (!current) {
      throw repoError(REPO_ERROR.NOT_FOUND, `inventory item not found: ${item.inventoryItemId}`);
    }

    // Post the stock-in movement (positive quantity) on the SAME transaction —
    // recordMovementWithTxn also updates `current_quantity` atomically.
    await recordMovementWithTxn(txn, businessId, {
      inventoryItemId: item.inventoryItemId,
      type: 'PURCHASE',
      quantity: item.quantity,
      unitCostMinor: item.unitCostMinor,
      referenceType: 'purchase',
      referenceId: id,
      employeeId: input.employeeId,
    });

    // Recompute the weighted-average unit cost from the pre-receipt cache + this
    // line, and write it back AFTER the movement (so the movement's own
    // `current_quantity` update has already landed).
    const newAverage = weightedAverageUnitCostMinor(
      current.current_quantity,
      current.unit_cost_minor,
      item.quantity,
      item.unitCostMinor,
    );
    try {
      await txn.runAsync(
        `UPDATE inventory_item
            SET unit_cost_minor = ?, updated_at = ?
          WHERE id = ? AND business_id = ?`,
        newAverage,
        timestamp,
        item.inventoryItemId,
        businessId,
      );
    } catch (error) {
      throw mapSqliteError(error);
    }
  }

  // 5. Select-back the freshly persisted header + lines so the caller receives
  //    the canonical mapped shape (any DB defaults are reflected).
  const detail = await readPurchaseDetail(txn, businessId, id);
  if (!detail) {
    throw repoError(REPO_ERROR.NOT_FOUND, `purchase not found after insert: ${id}`);
  }
  return detail;
}

/**
 * Cancel a purchase: invert its stock (post negated `RETURN` movements) and flip
 * the header to `CANCELLED`. Only a `COMPLETED` purchase may be cancelled.
 */
export async function cancelPurchase(id: string): Promise<void> {
  const businessId = await getBusinessId();
  await withTransaction((txn) => cancelPurchaseWithTxn(txn, businessId, id));
}

async function cancelPurchaseWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  id: string,
): Promise<void> {
  const detail = await readPurchaseDetail(txn, businessId, id);
  if (!detail) {
    throw repoError(REPO_ERROR.NOT_FOUND, `purchase not found: ${id}`);
  }
  if (detail.status !== 'COMPLETED') {
    throw repoError(REPO_ERROR.INVALID_STATE, `purchase is not cancellable: ${detail.status}`);
  }

  // Invert every line's stock: a RETURN with the negated quantity (money totals
  // remain untouched as the historical record).
  for (const item of detail.items) {
    await recordMovementWithTxn(txn, businessId, {
      inventoryItemId: item.inventoryItemId,
      type: 'RETURN',
      quantity: -item.quantity,
      unitCostMinor: item.unitCostMinor,
      referenceType: 'purchase',
      referenceId: id,
      employeeId: detail.employeeId ?? undefined,
    });
  }

  try {
    await txn.runAsync(
      `UPDATE purchase
          SET status = ?, updated_at = ?
        WHERE id = ? AND business_id = ?`,
      'CANCELLED',
      nowIso(),
      id,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  // The RETURN movements restored stock but did NOT touch `unit_cost_minor`,
  // which is a denormalized weighted-average cache (see createPurchase).
  // Recompute it from the purchases that REMAIN COMPLETED — this one is now
  // CANCELLED, so the recompute correctly excludes the stock it just returned.
  // Weighted average = SUM(quantity_milli × unit_cost_minor) / SUM(quantity_milli),
  // rounded; zero remaining quantity resets the cache to 0.
  const affectedItemIds = [...new Set(detail.items.map((item) => item.inventoryItemId))];
  for (const inventoryItemId of affectedItemIds) {
    const totals = await txn.getFirstAsync<{ total_cost: number; total_qty: number }>(
      `SELECT SUM(pi.quantity * pi.unit_cost_minor) AS total_cost, SUM(pi.quantity) AS total_qty
         FROM purchase_item pi
         JOIN purchase p ON p.id = pi.purchase_id
        WHERE pi.inventory_item_id = ? AND p.business_id = ? AND p.status = 'COMPLETED'`,
      inventoryItemId,
      businessId,
    );
    const totalCost = totals?.total_cost ?? 0;
    const totalQty = totals?.total_qty ?? 0;
    const newUnitCostMinor = totalQty > 0 ? Math.round(totalCost / totalQty) : 0;

    try {
      await txn.runAsync(
        `UPDATE inventory_item
            SET unit_cost_minor = ?, updated_at = ?
          WHERE id = ? AND business_id = ?`,
        newUnitCostMinor,
        nowIso(),
        inventoryItemId,
        businessId,
      );
    } catch (error) {
      throw mapSqliteError(error);
    }
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Fetch a single purchase (header + items) by id, or `null` when absent. */
export async function getPurchaseById(id: string): Promise<PurchaseDetail | null> {
  const db = await getDb();
  const businessId = await getBusinessId();
  return readPurchaseDetail(db, businessId, id);
}

/** Filters for listing purchases (keyset-paginated, newest-first). */
export interface PurchaseFilter extends PageQuery {
  status?: PurchaseStatus;
  supplierId?: string;
  from?: TimestampIso;
  to?: TimestampIso;
}

/**
 * List purchases for the business, newest-first (`created_at DESC, id DESC`),
 * keyset-paginated. Optional `status`/`supplierId`/`from`/`to` filters are each
 * bound as parameters; `from`/`to` map to `created_at >= ?` / `created_at <= ?`.
 */
export async function listPurchases(filter: PurchaseFilter = {}): Promise<Page<Purchase>> {
  const db = await getDb();
  const businessId = await getBusinessId();

  // Base scope + optional filters, each with a bound parameter (never inlined).
  const clauses: string[] = ['business_id = ?'];
  const params: SqlValue[] = [businessId];

  if (filter.status !== undefined) {
    clauses.push('status = ?');
    params.push(filter.status);
  }
  if (filter.supplierId !== undefined) {
    clauses.push('supplier_id = ?');
    params.push(filter.supplierId);
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
    `SELECT ${PURCHASE_COLUMNS}
       FROM purchase
      WHERE ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    ...params,
    ...keysetParams,
    limit,
  );

  const items = rows.map((row) => toPurchase(mapPurchaseRow(row)));

  // A full page implies more may follow; encode the last row's keyset position
  // as the next cursor. Otherwise there is no page 2.
  const last = items[items.length - 1];
  const nextCursor = rows.length === limit && last ? encodeCursor(last.createdAt, last.id) : null;

  return { items, nextCursor };
}
