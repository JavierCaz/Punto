import { getDb } from '@/db/client';

import { getBusinessId } from '@/db/repositories/business-scope';
import type { SqlValue } from '@/db/repositories/database';
import { int, str } from '@/db/repositories/mappers';
import type { MoneyMinor, QuantityMilli, TimestampIso } from '@/db/repositories/types';

/**
 * Analytics repository — read-only aggregates that power the Dashboard.
 *
 * The Dashboard answers "how is my business doing today and what needs my
 * attention?" (AGENTS §5.2). This module owns the SQL that rolls the ledgers up
 * into period totals, a daily sales series, top products and outstanding
 * problems; the pure money math lives in `@/lib/dashboard`.
 *
 * Money accounting rules (small-business POS):
 * - Income is COMPLETED sales (`completed_at` in range) plus manual INCOME
 *   transactions.
 * - Refunds count on the day they happened (`refunded_at` in range), so a sale
 *   completed yesterday but refunded today shows income yesterday and a refund
 *   today — never a retroactive rewrite of yesterday.
 * - Supplier purchases are money out and are read straight from `purchase`
 *   (status COMPLETED). They are deliberately NOT mirrored as a
 *   `financial_transaction` — the finance ledger is for non-sale money only —
 *   so a purchase is never double-counted.
 * - CANCELLED sales never happened financially and are excluded everywhere.
 *
 * Every query is scoped `business_id = ?` and takes an inclusive ISO-8601 UTC
 * `[from, to]` range (built from the device-local day in `@/lib/dashboard`).
 * Sale-derived aggregates also accept an optional `employeeId` to scope the
 * Dashboard to one seller (see `SaleRange`).
 */

/** A period total plus its row count. */
export interface PeriodTotals {
  totalMinor: MoneyMinor;
  count: number;
}

/**
 * Inclusive ISO-8601 UTC range, optionally scoped to one seller. Used by the
 * Dashboard's employee filter; `employeeId` unset means the whole business.
 * Legacy/unassigned sales (`employee_id IS NULL`) are only counted when no
 * employee is selected.
 */
export interface SaleRange {
  from: TimestampIso;
  to: TimestampIso;
  employeeId?: string;
}

/** A COMPLETED sale reduced to what the income trend needs. */
/** A COMPLETED sale reduced to what the income trend needs. */
export interface CompletedSalePoint {
  completedAt: TimestampIso;
  totalMinor: MoneyMinor;
}

/** One product's aggregated sales within a period. */
export interface TopProduct {
  name: string;
  revenueMinor: MoneyMinor;
  quantityMilli: QuantityMilli;
}


/** Gross COMPLETED sales in the range (income basis). */
export async function getCompletedSalesTotals(range: SaleRange): Promise<PeriodTotals> {
  const db = await getDb();
  const businessId = await getBusinessId();
  const params: SqlValue[] = [businessId, range.from, range.to];
  if (range.employeeId !== undefined) {
    params.push(range.employeeId);
  }
  const employeeClause = range.employeeId !== undefined ? ' AND employee_id = ?' : '';
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT COALESCE(SUM(total_minor), 0) AS completed_total,
            COUNT(*) AS completed_count
       FROM sale
      WHERE business_id = ? AND status = 'COMPLETED'
        AND completed_at >= ? AND completed_at <= ?${employeeClause}`,
    ...params,
  );
  return { totalMinor: int(row?.completed_total), count: int(row?.completed_count) };
}

/**
 * Gross value of sales REFUNDED in the range. Keyed on `refunded_at` so the
 * refund lands on the day it was issued.
 */
export async function getRefundedSalesTotals(range: SaleRange): Promise<PeriodTotals> {
  const db = await getDb();
  const businessId = await getBusinessId();
  const params: SqlValue[] = [businessId, range.from, range.to];
  if (range.employeeId !== undefined) {
    params.push(range.employeeId);
  }
  const employeeClause = range.employeeId !== undefined ? ' AND employee_id = ?' : '';
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT COALESCE(SUM(total_minor), 0) AS refund_total,
            COUNT(*) AS refund_count
       FROM sale
      WHERE business_id = ? AND status = 'REFUNDED'
        AND refunded_at >= ? AND refunded_at <= ?${employeeClause}`,
    ...params,
  );
  return { totalMinor: int(row?.refund_total), count: int(row?.refund_count) };
}

/** Manual INCOME and EXPENSE totals from the finance ledger. */
export async function getFinancialTotals(range: {
  from: TimestampIso;
  to: TimestampIso;
}): Promise<{ incomeMinor: MoneyMinor; expenseMinor: MoneyMinor }> {
  const db = await getDb();
  const businessId = await getBusinessId();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT COALESCE(SUM(CASE WHEN c.type = 'INCOME' THEN ft.amount_minor ELSE 0 END), 0) AS income_total,
            COALESCE(SUM(CASE WHEN c.type = 'EXPENSE' THEN ft.amount_minor ELSE 0 END), 0) AS expense_total
       FROM financial_transaction ft
       JOIN financial_category c ON c.id = ft.category_id
      WHERE ft.business_id = ? AND ft.created_at >= ? AND ft.created_at <= ?`,
    businessId,
    range.from,
    range.to,
  );
  return { incomeMinor: int(row?.income_total), expenseMinor: int(row?.expense_total) };
}

/** COMPLETED supplier purchases in the range (money out). */
export async function getPurchaseExpenseTotal(range: {
  from: TimestampIso;
  to: TimestampIso;
}): Promise<MoneyMinor> {
  const db = await getDb();
  const businessId = await getBusinessId();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT COALESCE(SUM(total_minor), 0) AS purchase_total
       FROM purchase
      WHERE business_id = ? AND status = 'COMPLETED'
        AND created_at >= ? AND created_at <= ?`,
    businessId,
    range.from,
    range.to,
  );
  return int(row?.purchase_total);
}

/** COMPLETED sales in the range, for local-day bucketing on the client. */
export async function listCompletedSalesInRange(range: SaleRange): Promise<CompletedSalePoint[]> {
  const db = await getDb();
  const businessId = await getBusinessId();
  const params: SqlValue[] = [businessId, range.from, range.to];
  if (range.employeeId !== undefined) {
    params.push(range.employeeId);
  }
  const employeeClause = range.employeeId !== undefined ? ' AND employee_id = ?' : '';
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT completed_at, total_minor
       FROM sale
      WHERE business_id = ? AND status = 'COMPLETED'
        AND completed_at >= ? AND completed_at <= ?${employeeClause}
      ORDER BY completed_at ASC`,
    ...params,
  );
  return rows.map((row) => ({
    completedAt: str(row.completed_at),
    totalMinor: int(row.total_minor),
  }));
}

/** Best-selling products by revenue within the range (COMPLETED sales only). */
export async function listTopProducts(
  range: SaleRange,
  limit = 5,
): Promise<TopProduct[]> {
  const db = await getDb();
  const businessId = await getBusinessId();
  const params: SqlValue[] = [businessId, range.from, range.to];
  if (range.employeeId !== undefined) {
    params.push(range.employeeId);
  }
  const employeeClause = range.employeeId !== undefined ? ' AND s.employee_id = ?' : '';
  params.push(limit);
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT si.product_name AS product_name,
            SUM(si.subtotal_minor) AS revenue_minor,
            SUM(si.quantity) AS quantity_milli
       FROM sale_item si
       JOIN sale s ON s.id = si.sale_id
      WHERE s.business_id = ? AND s.status = 'COMPLETED'
        AND s.completed_at >= ? AND s.completed_at <= ?${employeeClause}
      GROUP BY si.product_name
      ORDER BY revenue_minor DESC, si.product_name ASC
      LIMIT ?`,
    ...params,
  );
  return rows.map((row) => ({
    name: str(row.product_name),
    revenueMinor: int(row.revenue_minor),
    quantityMilli: int(row.quantity_milli),
  }));
}

/** How many carts are currently parked in HELD state. */
export async function countHeldSales(): Promise<number> {
  const db = await getDb();
  const businessId = await getBusinessId();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT COUNT(*) AS held_count FROM sale
      WHERE business_id = ? AND status = 'HELD'`,
    businessId,
  );
  return int(row?.held_count);
}
