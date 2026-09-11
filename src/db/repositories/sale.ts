import { getDb } from '@/db/client';

import { nextSaleNumber } from '@/db/repositories/app-metadata';
import { getBusinessId } from '@/db/repositories/business-scope';
import { computeChangeMinor, sumMinor } from '@/db/repositories/calc';
import { nowIso } from '@/db/repositories/clock';
import type { DatabaseAdapter, SqlValue } from '@/db/repositories/database';
import { REPO_ERROR, mapSqliteError, repoError } from '@/db/repositories/errors';
import { newId } from '@/db/repositories/ids';
import { int, intOrNull, str, strOrNull } from '@/db/repositories/mappers';
import { recordMovementWithTxn } from '@/db/repositories/movement';
import { DEFAULT_PAGE_LIMIT, encodeCursor, keysetWhere } from '@/db/repositories/pagination';
import type { Page, PageQuery } from '@/db/repositories/pagination';
import { withTransaction } from '@/db/repositories/transaction';
import { isSaleStatus } from '@/db/repositories/types';
import type {
  MoneyMinor,
  QuantityMilli,
  SaleStatus,
  TimestampIso,
} from '@/db/repositories/types';

/**
 * Sale repository — THE POS CORE (migration 001, tables `sale`, `sale_item`,
 * `payment`).
 *
 * A sale is the most complex composite transaction in Punto. Its lifecycle is:
 *
 *   HELD      — a persisted cart (stock is NOT consumed; items/totals editable)
 *   COMPLETED — paid; payments recorded; stock consumed via SALE movements
 *   CANCELLED — a held cart abandoned (never paid, so no stock was consumed)
 *   REFUNDED  — a completed sale refunded (stock returned via RETURN movements)
 *
 * Every write runs inside a single `withTransaction`; the `completeSale` path
 * is the flagship atomic unit — it validates payments, inserts them, consumes
 * stock (bridge OR recipe), flips the status, and returns the assembled
 * `SaleDetail`, all on the caller's transaction. Stock consumption and refunds
 * go through `recordMovementWithTxn` (the ONLY ledger writer — see movement.ts),
 * never `recordMovement` (which would open a nested transaction).
 *
 * Money/quantity math is integer-only (AGENTS §6): line subtotals are
 * `Math.round((quantity * unitPriceMinor) / 1000) - discountMinor`, sale
 * `subtotal_minor` is the exact `SUM(sale_item.subtotal_minor)`, `tax_minor`
 * is 0 in v1, and `total_minor = subtotal - discount`.
 */

// ---------------------------------------------------------------------------
// Row shapes (snake_case — the exact `sale`/`sale_item`/`payment` columns from
// migration 001). Money stays in integer minor units; quantities in integer
// milli-units; nullable timestamps/amounts map to `null` (never floats).
// ---------------------------------------------------------------------------
interface SaleRow {
  id: string;
  business_id: string;
  sale_number: string;
  status: SaleStatus;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
  employee_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
}

interface SaleItemRow {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price_minor: number;
  discount_minor: number;
  subtotal_minor: number;
  unit_cost_minor: number;
  created_at: string;
}

interface PaymentRow {
  id: string;
  business_id: string;
  sale_id: string;
  payment_method_id: string;
  amount_minor: number;
  amount_given_minor: number | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

/** Column lists shared by every SELECT (match the row shapes above). */
const SALE_COLUMNS = `
  id, business_id, sale_number, status, subtotal_minor, discount_minor,
  tax_minor, total_minor, employee_id, notes, created_at, updated_at,
  completed_at, cancelled_at, refunded_at`;

const SALE_ITEM_COLUMNS = `
  id, sale_id, product_id, product_name, quantity, unit_price_minor,
  discount_minor, subtotal_minor, unit_cost_minor, created_at`;

const PAYMENT_COLUMNS = `
  id, business_id, sale_id, payment_method_id, amount_minor,
  amount_given_minor, reference, notes, created_at`;

// ---------------------------------------------------------------------------
// Mappers (snake_case row → typed row → camelCase public object)
// ---------------------------------------------------------------------------

/** Coerce a raw SQLite row into the typed snake_case `SaleRow` (guards status). */
function mapSaleRow(row: Record<string, unknown>): SaleRow {
  // `status` must satisfy the CHECK constraint; guard at the boundary so a bad
  // value fails loudly rather than widening the public type.
  const status = row.status;
  if (!isSaleStatus(status)) {
    throw repoError(REPO_ERROR.INVALID_STATE, `unexpected sale status in DB: ${String(status)}`);
  }
  return {
    id: str(row.id),
    business_id: str(row.business_id),
    sale_number: str(row.sale_number),
    status,
    subtotal_minor: int(row.subtotal_minor),
    discount_minor: int(row.discount_minor),
    tax_minor: int(row.tax_minor),
    total_minor: int(row.total_minor),
    employee_id: strOrNull(row.employee_id),
    notes: strOrNull(row.notes),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
    completed_at: strOrNull(row.completed_at),
    cancelled_at: strOrNull(row.cancelled_at),
    refunded_at: strOrNull(row.refunded_at),
  };
}

/** Coerce a raw SQLite row into the typed snake_case `SaleItemRow`. */
function mapSaleItemRow(row: Record<string, unknown>): SaleItemRow {
  return {
    id: str(row.id),
    sale_id: str(row.sale_id),
    product_id: strOrNull(row.product_id),
    product_name: str(row.product_name),
    quantity: int(row.quantity),
    unit_price_minor: int(row.unit_price_minor),
    discount_minor: int(row.discount_minor),
    subtotal_minor: int(row.subtotal_minor),
    unit_cost_minor: int(row.unit_cost_minor),
    created_at: str(row.created_at),
  };
}

/** Coerce a raw SQLite row into the typed snake_case `PaymentRow`. */
function mapPaymentRow(row: Record<string, unknown>): PaymentRow {
  return {
    id: str(row.id),
    business_id: str(row.business_id),
    sale_id: str(row.sale_id),
    payment_method_id: str(row.payment_method_id),
    amount_minor: int(row.amount_minor),
    amount_given_minor: intOrNull(row.amount_given_minor),
    reference: strOrNull(row.reference),
    notes: strOrNull(row.notes),
    created_at: str(row.created_at),
  };
}

/** snake_case row → camelCase public object (the single mapping surface). */
const toSale = (row: SaleRow) => ({
  id: row.id,
  businessId: row.business_id,
  saleNumber: row.sale_number,
  status: row.status,
  subtotalMinor: row.subtotal_minor,
  discountMinor: row.discount_minor,
  taxMinor: row.tax_minor,
  totalMinor: row.total_minor,
  employeeId: row.employee_id,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
  cancelledAt: row.cancelled_at,
  refundedAt: row.refunded_at,
});

const toSaleItem = (row: SaleItemRow) => ({
  id: row.id,
  saleId: row.sale_id,
  productId: row.product_id,
  productName: row.product_name,
  quantity: row.quantity,
  unitPriceMinor: row.unit_price_minor,
  discountMinor: row.discount_minor,
  subtotalMinor: row.subtotal_minor,
  unitCostMinor: row.unit_cost_minor,
  createdAt: row.created_at,
});

const toPayment = (row: PaymentRow) => ({
  id: row.id,
  businessId: row.business_id,
  saleId: row.sale_id,
  paymentMethodId: row.payment_method_id,
  amountMinor: row.amount_minor,
  amountGivenMinor: row.amount_given_minor,
  reference: row.reference,
  notes: row.notes,
  createdAt: row.created_at,
});

/** Public sale type — derived from the private mapper. */
export type Sale = ReturnType<typeof toSale>;
/** Public sale-line type. */
export type SaleItem = ReturnType<typeof toSaleItem>;
/** Public payment type. */
export type Payment = ReturnType<typeof toPayment>;
/** A sale assembled with its lines and payments (the POS detail shape). */
export type SaleDetail = Sale & { items: SaleItem[]; payments: Payment[] };

// ---------------------------------------------------------------------------
// Input shapes
// ---------------------------------------------------------------------------

/** One line to add to a (held) sale. `productId` is nullable (untracked/adhoc). */
export interface SaleItemInput {
  productId: string | null;
  productName: string;
  quantity: QuantityMilli;
  unitPriceMinor: MoneyMinor;
  discountMinor?: MoneyMinor;
  unitCostMinor?: MoneyMinor;
}

/** One payment to apply when completing a sale (a sale may split methods). */
export interface PaymentInput {
  paymentMethodId: string;
  amountMinor: MoneyMinor;
  amountGivenMinor?: MoneyMinor;
  reference?: string;
  notes?: string;
}

/** List filters (keyset-paginated, newest-first). */
export interface SaleFilter extends PageQuery {
  status?: SaleStatus;
  employeeId?: string;
  from?: TimestampIso;
  to?: TimestampIso;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Line subtotal in integer minor units: the per-display-unit price scaled by
 * the milli-quantity, rounded, then reduced by any line discount. Integer-only
 * (AGENTS §6 — no float money math).
 */
function computeItemSubtotalMinor(
  quantity: QuantityMilli,
  unitPriceMinor: MoneyMinor,
  discountMinor: MoneyMinor,
): number {
  return Math.round((quantity * unitPriceMinor) / 1000) - discountMinor;
}

/** Guard a sale lifecycle transition: throw `REPO_INVALID_STATE` unless it matches. */
function assertStatus(actual: unknown, expected: SaleStatus): void {
  if (actual !== expected) {
    throw repoError(REPO_ERROR.INVALID_STATE, `sale must be ${expected}, was ${String(actual)}`);
  }
}

// ---------------------------------------------------------------------------
// Shared transactional primitives
// ---------------------------------------------------------------------------

/**
 * Insert one `sale_item` row (validating quantity, computing its subtotal) on
 * the caller's transaction. Shared by `createHeldSale` and `addSaleItem`.
 */
async function insertSaleItemWithTxn(
  txn: DatabaseAdapter,
  saleId: string,
  item: SaleItemInput,
): Promise<void> {
  // Mirror the schema CHECK (quantity > 0) so a bad line is a loud domain
  // error, not a raw SQLITE_CONSTRAINT (which `mapSqliteError` would mislabel
  // as REPRO_DUPLICATE).
  if (item.quantity <= 0) {
    throw repoError(REPO_ERROR.INVALID_STATE, 'sale item quantity must be > 0');
  }
  const discountMinor = item.discountMinor ?? 0;
  const subtotal = computeItemSubtotalMinor(item.quantity, item.unitPriceMinor, discountMinor);

  try {
    await txn.runAsync(
      `INSERT INTO sale_item
         (id, sale_id, product_id, product_name, quantity, unit_price_minor,
          discount_minor, subtotal_minor, unit_cost_minor, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newId(),
      saleId,
      item.productId ?? null,
      item.productName,
      item.quantity,
      item.unitPriceMinor,
      discountMinor,
      subtotal,
      item.unitCostMinor ?? 0,
      nowIso(),
    );
  } catch (error) {
    throw mapSqliteError(error);
  }
}

/**
 * Recompute the sale's derived totals from its lines: `subtotal_minor` is the
 * exact `SUM(sale_item.subtotal_minor)`, `tax_minor` is 0 (v1), and
 * `total_minor = subtotal - discount`. Runs on the caller's transaction so a
 * line edit and its total update commit atomically.
 */
async function recomputeSaleTotalsWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  saleId: string,
): Promise<void> {
  // COALESCE + an aggregate without GROUP BY always yields exactly one row, so
  // `total` is never NULL; the `?? 0` only satisfies the adapter's nullable
  // return type.
  const sumRow = await txn.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(subtotal_minor), 0) AS total FROM sale_item WHERE sale_id = ?`,
    saleId,
  );
  const subtotal = sumRow?.total ?? 0;

  // The sale-level discount (0 in v1 — no discount API yet) is read rather than
  // assumed so `total = subtotal - discount` stays correct if discounts arrive.
  const sale = await txn.getFirstAsync<{ discount_minor: number }>(
    `SELECT discount_minor FROM sale WHERE id = ? AND business_id = ? LIMIT 1`,
    saleId,
    businessId,
  );
  const discount = sale?.discount_minor ?? 0;
  const total = subtotal - discount;

  try {
    await txn.runAsync(
      `UPDATE sale
          SET subtotal_minor = ?, tax_minor = ?, total_minor = ?, updated_at = ?
        WHERE id = ? AND business_id = ?`,
      subtotal,
      0, // tax_minor is 0 in v1 (no tax engine yet)
      total,
      nowIso(),
      saleId,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }
}

/** Read a single sale row (already business-scoped) and map it; throw NOT_FOUND. */
async function readSaleRowWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  saleId: string,
): Promise<Sale> {
  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${SALE_COLUMNS} FROM sale WHERE id = ? AND business_id = ? LIMIT 1`,
    saleId,
    businessId,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND, `sale not found: ${saleId}`);
  }
  return toSale(mapSaleRow(row));
}

/** Read a full sale + its items + payments, or `null` when the sale is absent. */
async function readSaleDetailWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  saleId: string,
): Promise<SaleDetail | null> {
  const saleRow = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${SALE_COLUMNS} FROM sale WHERE id = ? AND business_id = ? LIMIT 1`,
    saleId,
    businessId,
  );
  if (!saleRow) {
    return null;
  }

  const itemRows = await txn.getAllAsync<Record<string, unknown>>(
    `SELECT ${SALE_ITEM_COLUMNS} FROM sale_item
      WHERE sale_id = ? ORDER BY created_at ASC, id ASC`,
    saleId,
  );
  const paymentRows = await txn.getAllAsync<Record<string, unknown>>(
    `SELECT ${PAYMENT_COLUMNS} FROM payment
      WHERE sale_id = ? AND business_id = ? ORDER BY created_at ASC, id ASC`,
    saleId,
    businessId,
  );

  return {
    ...toSale(mapSaleRow(saleRow)),
    items: itemRows.map((row) => toSaleItem(mapSaleItemRow(row))),
    payments: paymentRows.map((row) => toPayment(mapPaymentRow(row))),
  };
}

/**
 * Consume the stock a single sale line represents, on the caller's transaction.
 *
 * Resolution order (see migration 001 / AGENTS §3.1):
 *   1. product has an `inventory_item_id` bridge → decrement that item by the
 *      line's quantity (retail: sell = decrement the item).
 *   2. else the product has a `recipe` → decrement each ingredient by
 *      `round(recipe_item.quantity * line.quantity / 1000)` (restaurant).
 *   3. else (no bridge, no recipe, or no product) → untracked, no movement.
 *
 * All decrements post `SALE` movements (negative signed quantity). The
 * ingredient/line cost passed to each movement is the sale line's snapshot
 * `unit_cost_minor` (v1 does not carry per-ingredient costs on `recipe_item`).
 */
async function consumeSaleItemStockWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  saleId: string,
  item: SaleItemRow,
  employeeId: string | null,
): Promise<void> {
  // Untracked (adhoc line with no product) — nothing to consume.
  if (item.product_id == null) {
    return;
  }

  // Deliberately NO `archived_at` filter: the direct-stock bridge must still be
  // honored for a soft-deleted product so historical sales consume correctly.
  const product = await txn.getFirstAsync<{ inventory_item_id: string | null }>(
    `SELECT inventory_item_id FROM product WHERE id = ? AND business_id = ? LIMIT 1`,
    item.product_id,
    businessId,
  );

  // 1. Direct bridge (retail).
  if (product != null && product.inventory_item_id != null) {
    await recordMovementWithTxn(txn, businessId, {
      inventoryItemId: product.inventory_item_id,
      type: 'SALE',
      quantity: -item.quantity,
      unitCostMinor: item.unit_cost_minor,
      referenceType: 'sale',
      referenceId: saleId,
      employeeId: employeeId ?? undefined,
    });
    return;
  }

  // 2. Recipe (restaurant).
  const recipe = await txn.getFirstAsync<{ id: string }>(
    `SELECT id FROM recipe WHERE product_id = ? AND business_id = ? LIMIT 1`,
    item.product_id,
    businessId,
  );
  if (!recipe) {
    return; // untracked
  }

  const ingredients = await txn.getAllAsync<{ inventory_item_id: string; quantity: number }>(
    `SELECT inventory_item_id, quantity FROM recipe_item
      WHERE recipe_id = ? ORDER BY sort_order ASC, id ASC`,
    recipe.id,
  );
  for (const ingredient of ingredients) {
    const consumed = Math.round((ingredient.quantity * item.quantity) / 1000);
    // Guard: recordMovementWithTxn rejects a zero quantity. A recipe line can
    // legitimately round to zero at tiny quantities, which is a no-op.
    if (consumed === 0) {
      continue;
    }
    await recordMovementWithTxn(txn, businessId, {
      inventoryItemId: ingredient.inventory_item_id,
      type: 'SALE',
      quantity: -consumed,
      unitCostMinor: item.unit_cost_minor,
      referenceType: 'sale',
      referenceId: saleId,
      employeeId: employeeId ?? undefined,
    });
  }
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Create a held sale (persisted cart). Assigns the next sale number and, when
 * items are provided, computes their line subtotals and the sale totals. Stock
 * is NOT consumed while the sale is HELD.
 */
export async function createHeldSale(input: {
  employeeId?: string;
  notes?: string;
  items?: SaleItemInput[];
}): Promise<Sale> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => createHeldSaleWithTxn(txn, businessId, input));
}

async function createHeldSaleWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  input: { employeeId?: string; notes?: string; items?: SaleItemInput[] },
): Promise<Sale> {
  const id = newId();
  const timestamp = nowIso();
  // Reserve the human-readable number INSIDE the transaction (see app-metadata.ts)
  // so the counter bump commits atomically with the sale INSERT.
  const saleNumber = await nextSaleNumber(txn);

  try {
    await txn.runAsync(
      `INSERT INTO sale
         (id, business_id, sale_number, status, subtotal_minor, discount_minor,
          tax_minor, total_minor, employee_id, notes, created_at, updated_at,
          completed_at, cancelled_at, refunded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      businessId,
      saleNumber,
      'HELD',
      0, // totals computed below from the lines (if any)
      0,
      0,
      0,
      input.employeeId ?? null,
      input.notes ?? null,
      timestamp,
      timestamp,
      null,
      null,
      null,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  for (const item of input.items ?? []) {
    await insertSaleItemWithTxn(txn, id, item);
  }

  await recomputeSaleTotalsWithTxn(txn, businessId, id);
  return readSaleRowWithTxn(txn, businessId, id);
}

/**
 * Add a line to a HELD sale and recompute totals atomically. Rejects non-HELD
 * sales (`REPO_INVALID_STATE`) and missing sales (`REPO_NOT_FOUND`).
 */
export async function addSaleItem(saleId: string, item: SaleItemInput): Promise<Sale> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => addSaleItemWithTxn(txn, businessId, saleId, item));
}

async function addSaleItemWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  saleId: string,
  item: SaleItemInput,
): Promise<Sale> {
  const sale = await txn.getFirstAsync<{ status: string }>(
    `SELECT status FROM sale WHERE id = ? AND business_id = ? LIMIT 1`,
    saleId,
    businessId,
  );
  if (!sale) {
    throw repoError(REPO_ERROR.NOT_FOUND, `sale not found: ${saleId}`);
  }
  assertStatus(sale.status, 'HELD');

  await insertSaleItemWithTxn(txn, saleId, item);
  await recomputeSaleTotalsWithTxn(txn, businessId, saleId);
  return readSaleRowWithTxn(txn, businessId, saleId);
}

/**
 * Change a line's quantity (HELD sales only) and recompute totals. Recomputes
 * the line's own subtotal from its persisted unit price / discount.
 */
export async function updateSaleItemQuantity(
  saleItemId: string,
  quantity: QuantityMilli,
): Promise<void> {
  const businessId = await getBusinessId();
  await withTransaction((txn) =>
    updateSaleItemQuantityWithTxn(txn, businessId, saleItemId, quantity),
  );
}

async function updateSaleItemQuantityWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  saleItemId: string,
  quantity: QuantityMilli,
): Promise<void> {
  // Mirror the schema CHECK (quantity > 0) before any write.
  if (quantity <= 0) {
    throw repoError(REPO_ERROR.INVALID_STATE, 'sale item quantity must be > 0');
  }

  const item = await txn.getFirstAsync<{
    sale_id: string;
    unit_price_minor: number;
    discount_minor: number;
  }>(
    `SELECT sale_id, unit_price_minor, discount_minor FROM sale_item WHERE id = ? LIMIT 1`,
    saleItemId,
  );
  if (!item) {
    throw repoError(REPO_ERROR.NOT_FOUND, `sale item not found: ${saleItemId}`);
  }

  const sale = await txn.getFirstAsync<{ status: string }>(
    `SELECT status FROM sale WHERE id = ? AND business_id = ? LIMIT 1`,
    item.sale_id,
    businessId,
  );
  if (!sale) {
    throw repoError(REPO_ERROR.NOT_FOUND, `sale not found: ${item.sale_id}`);
  }
  assertStatus(sale.status, 'HELD');

  const subtotal = computeItemSubtotalMinor(quantity, item.unit_price_minor, item.discount_minor);
  try {
    await txn.runAsync(
      `UPDATE sale_item SET quantity = ?, subtotal_minor = ? WHERE id = ?`,
      quantity,
      subtotal,
      saleItemId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  await recomputeSaleTotalsWithTxn(txn, businessId, item.sale_id);
}

/** Remove a line from a HELD sale and recompute totals. */
export async function removeSaleItem(saleItemId: string): Promise<void> {
  const businessId = await getBusinessId();
  await withTransaction((txn) => removeSaleItemWithTxn(txn, businessId, saleItemId));
}

async function removeSaleItemWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  saleItemId: string,
): Promise<void> {
  const item = await txn.getFirstAsync<{ sale_id: string }>(
    `SELECT sale_id FROM sale_item WHERE id = ? LIMIT 1`,
    saleItemId,
  );
  if (!item) {
    throw repoError(REPO_ERROR.NOT_FOUND, `sale item not found: ${saleItemId}`);
  }

  const sale = await txn.getFirstAsync<{ status: string }>(
    `SELECT status FROM sale WHERE id = ? AND business_id = ? LIMIT 1`,
    item.sale_id,
    businessId,
  );
  if (!sale) {
    throw repoError(REPO_ERROR.NOT_FOUND, `sale not found: ${item.sale_id}`);
  }
  assertStatus(sale.status, 'HELD');

  try {
    await txn.runAsync(`DELETE FROM sale_item WHERE id = ?`, saleItemId);
  } catch (error) {
    throw mapSqliteError(error);
  }

  await recomputeSaleTotalsWithTxn(txn, businessId, item.sale_id);
}

/**
 * Complete a HELD sale — the flagship atomic transaction. Validates payments
 * against the sale total, inserts them, consumes stock (bridge or recipe), and
 * flips the status to COMPLETED. All on the caller's transaction; any failure
 * (e.g. insufficient stock) rolls the whole thing back.
 */
export async function completeSale(input: {
  saleId: string;
  employeeId?: string;
  payments: PaymentInput[];
}): Promise<SaleDetail> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => completeSaleWithTxn(txn, businessId, input));
}

async function completeSaleWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  input: { saleId: string; employeeId?: string; payments: PaymentInput[] },
): Promise<SaleDetail> {
  // 1. Load the sale; must exist and still be HELD.
  const saleRow = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${SALE_COLUMNS} FROM sale WHERE id = ? AND business_id = ? LIMIT 1`,
    input.saleId,
    businessId,
  );
  if (!saleRow) {
    throw repoError(REPO_ERROR.NOT_FOUND, `sale not found: ${input.saleId}`);
  }
  const sale = mapSaleRow(saleRow);
  assertStatus(sale.status, 'HELD');

  // 2. Load lines; an empty cart cannot be completed.
  const itemRows = await txn.getAllAsync<Record<string, unknown>>(
    `SELECT ${SALE_ITEM_COLUMNS} FROM sale_item WHERE sale_id = ? ORDER BY created_at ASC, id ASC`,
    input.saleId,
  );
  if (itemRows.length === 0) {
    throw repoError(REPO_ERROR.INVALID_STATE, 'sale has no items');
  }
  const items = itemRows.map(mapSaleItemRow);

  // 3. Validate payments BEFORE any write: non-empty, positive amounts, and an
  //    exact match against the sale total. Cash tendered must cover its amount.
  if (input.payments.length === 0) {
    throw repoError(REPO_ERROR.INVALID_STATE, 'sale requires at least one payment');
  }
  for (const payment of input.payments) {
    if (payment.amountMinor <= 0) {
      throw repoError(REPO_ERROR.INVALID_STATE, 'payment amount must be > 0');
    }
  }
  const paidMinor = sumMinor(input.payments.map((payment) => payment.amountMinor));
  if (paidMinor !== sale.total_minor) {
    throw repoError(REPO_ERROR.INVALID_STATE, 'payments do not cover the sale total');
  }

  // Each payment must reference a real payment method belonging to this
  // business, and only CASH methods may carry `amountGivenMinor` (cash tendered)
  // — validated BEFORE any write so a bad method never reaches the FK.
  for (const payment of input.payments) {
    const method = await txn.getFirstAsync<{ type: string }>(
      `SELECT type FROM payment_method WHERE id = ? AND business_id = ? LIMIT 1`,
      payment.paymentMethodId,
      businessId,
    );
    if (!method) {
      throw repoError(REPO_ERROR.NOT_FOUND, `payment method not found: ${payment.paymentMethodId}`);
    }
    if (payment.amountGivenMinor != null && method.type !== 'CASH') {
      throw repoError(
        REPO_ERROR.INVALID_STATE,
        `amountGivenMinor requires a CASH payment method, got ${method.type}`,
      );
    }
  }
  for (const payment of input.payments) {
    // `amountGivenMinor` is only meaningful for cash; computeChangeMinor throws
    // REPO_INVALID_STATE when the amount tendered is less than the amount due.
    if (payment.amountGivenMinor != null) {
      computeChangeMinor(payment.amountGivenMinor, payment.amountMinor);
    }
  }

  // The employee attributed to stock movements (complete-time override wins).
  const employeeId = input.employeeId ?? sale.employee_id;
  const timestamp = nowIso();

  // 4. Insert each payment (store `amount_given_minor` only when provided).
  for (const payment of input.payments) {
    try {
      await txn.runAsync(
        `INSERT INTO payment
           (id, business_id, sale_id, payment_method_id, amount_minor,
            amount_given_minor, reference, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId(),
        businessId,
        input.saleId,
        payment.paymentMethodId,
        payment.amountMinor,
        payment.amountGivenMinor ?? null,
        payment.reference ?? null,
        payment.notes ?? null,
        timestamp,
      );
    } catch (error) {
      throw mapSqliteError(error);
    }
  }

  // 5. Consume stock per line (bridge OR recipe; untracked lines skip).
  for (const item of items) {
    await consumeSaleItemStockWithTxn(txn, businessId, input.saleId, item, employeeId);
  }

  // 6. Flip status (and stamp completion).
  try {
    await txn.runAsync(
      `UPDATE sale SET status = 'COMPLETED', completed_at = ?, updated_at = ?
        WHERE id = ? AND business_id = ?`,
      timestamp,
      timestamp,
      input.saleId,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  // 7. Select-back the assembled detail.
  const detail = await readSaleDetailWithTxn(txn, businessId, input.saleId);
  if (!detail) {
    throw repoError(REPO_ERROR.NOT_FOUND, `sale not found after complete: ${input.saleId}`);
  }
  return detail;
}

/**
 * Cancel a HELD sale (abandon the cart). No stock was consumed while held, so
 * cancellation posts nothing to the ledger — it only flips the status.
 */
export async function cancelSale(saleId: string): Promise<void> {
  const businessId = await getBusinessId();
  await withTransaction((txn) => cancelSaleWithTxn(txn, businessId, saleId));
}

async function cancelSaleWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  saleId: string,
): Promise<void> {
  const sale = await txn.getFirstAsync<{ status: string }>(
    `SELECT status FROM sale WHERE id = ? AND business_id = ? LIMIT 1`,
    saleId,
    businessId,
  );
  if (!sale) {
    throw repoError(REPO_ERROR.NOT_FOUND, `sale not found: ${saleId}`);
  }
  assertStatus(sale.status, 'HELD');

  const timestamp = nowIso();
  try {
    await txn.runAsync(
      `UPDATE sale SET status = 'CANCELLED', cancelled_at = ?, updated_at = ?
        WHERE id = ? AND business_id = ?`,
      timestamp,
      timestamp,
      saleId,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }
}

/**
 * Refund a COMPLETED sale. Reads the original `SALE` movements for this sale
 * and posts inverting `RETURN` movements (positive signed quantity → stock
 * comes back), then flips the status to REFUNDED.
 *
 * NOTE (v1): refunds invert via the inventory ledger only — there is NO
 * payment reversal here; money reconciliation is out of scope until a later
 * phase.
 */
export async function refundSale(
  saleId: string,
  input?: { reason?: string; employeeId?: string },
): Promise<void> {
  const businessId = await getBusinessId();
  await withTransaction((txn) => refundSaleWithTxn(txn, businessId, saleId, input ?? {}));
}

async function refundSaleWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  saleId: string,
  input: { reason?: string; employeeId?: string },
): Promise<void> {
  const saleRow = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${SALE_COLUMNS} FROM sale WHERE id = ? AND business_id = ? LIMIT 1`,
    saleId,
    businessId,
  );
  if (!saleRow) {
    throw repoError(REPO_ERROR.NOT_FOUND, `sale not found: ${saleId}`);
  }
  const sale = mapSaleRow(saleRow);
  assertStatus(sale.status, 'COMPLETED');

  // The original stock-out movements for this sale, to invert. SALE movements
  // are negative; RETURN movements are their exact positive negation.
  const movements = await txn.getAllAsync<{
    inventory_item_id: string;
    quantity: number;
    unit_cost_minor: number;
  }>(
    `SELECT inventory_item_id, quantity, unit_cost_minor FROM inventory_movement
      WHERE reference_type = 'sale' AND reference_id = ? AND type = 'SALE'
        AND business_id = ?`,
    saleId,
    businessId,
  );

  const employeeId = input.employeeId ?? sale.employee_id;
  for (const movement of movements) {
    await recordMovementWithTxn(txn, businessId, {
      inventoryItemId: movement.inventory_item_id,
      type: 'RETURN',
      quantity: -movement.quantity, // invert the (negative) SALE → positive RETURN
      unitCostMinor: movement.unit_cost_minor,
      referenceType: 'sale',
      referenceId: saleId,
      employeeId: employeeId ?? undefined,
    });
  }

  const timestamp = nowIso();
  try {
    await txn.runAsync(
      `UPDATE sale SET status = 'REFUNDED', refunded_at = ?, updated_at = ?
        WHERE id = ? AND business_id = ?`,
      timestamp,
      timestamp,
      saleId,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Fetch a single sale with its items and payments, or `null` when missing. */
export async function getSaleById(id: string): Promise<SaleDetail | null> {
  const db = await getDb();
  const businessId = await getBusinessId();
  return readSaleDetailWithTxn(db, businessId, id);
}

/**
 * List sales for the business, newest-first (`created_at DESC, id DESC`),
 * keyset-paginated. Optional `status`/`employeeId`/`from`/`to` filters are each
 * bound as parameters; `nextCursor` is encoded from a full page's last row.
 */
export async function listSales(filter: SaleFilter = {}): Promise<Page<Sale>> {
  const db = await getDb();
  const businessId = await getBusinessId();

  const clauses: string[] = ['business_id = ?'];
  const params: SqlValue[] = [businessId];

  if (filter.status !== undefined) {
    clauses.push('status = ?');
    params.push(filter.status);
  }
  if (filter.employeeId !== undefined) {
    clauses.push('employee_id = ?');
    params.push(filter.employeeId);
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
    `SELECT ${SALE_COLUMNS}
       FROM sale
      WHERE ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    ...params,
    ...keysetParams,
    limit,
  );

  const items = rows.map((row) => toSale(mapSaleRow(row)));

  // A full page implies more may follow; encode the last row's keyset position.
  const last = items[items.length - 1];
  const nextCursor =
    rows.length === limit && last ? encodeCursor(last.createdAt, last.id) : null;

  return { items, nextCursor };
}
