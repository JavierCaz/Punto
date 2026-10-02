import { requireCapability, type AuthActor } from '@/auth/permissions';
import { getDb } from '@/db/client';

import { getRefundedSalesTotals, type PeriodTotals } from '@/db/repositories/analytics';
import { getBusinessProfile, type BusinessProfile } from '@/db/repositories/business';
import { getBusinessId } from '@/db/repositories/business-scope';
import { REPO_ERROR, repoError } from '@/db/repositories/errors';
import { int, str, strOrNull } from '@/db/repositories/mappers';
import {
  FINANCE_TYPES,
  PAYMENT_TYPES,
  type FinanceType,
  type MoneyMinor,
  type PaymentType,
  type TimestampIso,
} from '@/db/repositories/types';

/**
 * Cash-flow report repository — the read-only ledger extract behind the
 * monthly accountant PDF (More → Reportes).
 *
 * The report is an accounting document, so it follows the same money rules as
 * the Dashboard (see `@/db/repositories/analytics`):
 * - Gross sales are every PAID sale (COMPLETED or later REFUNDED) keyed on
 *   `completed_at`; refunds are subtracted once, keyed on `refunded_at`.
 * - Income by payment method sums `payment` rows of those same paid sales, so
 *   the method totals always add up to gross sales (refunds never reverse
 *   payments — they are their own expense line).
 * - Supplier purchases come straight from `purchase` (COMPLETED only); manual
 *   income/expenses come from `financial_transaction` via the category type.
 * - The cash-session float is never income and is not part of the report.
 *
 * Unlike the paged list endpoints, these queries return the whole range in one
 * go: a single month of a small business is small, and the PDF needs every
 * line. Every query is scoped `business_id = ?` over an inclusive UTC range.
 */

/** Inclusive ISO-8601 UTC range the report covers. */
export interface ReportRange {
  from: TimestampIso;
  to: TimestampIso;
}

/** Money collected through one payment method in the range. */
export interface PaymentMethodTotal {
  methodId: string;
  type: PaymentType;
  name: string;
  totalMinor: MoneyMinor;
  /** Number of distinct sales that used this method. */
  saleCount: number;
}

/** One manual income or expense line from the finance ledger. */
export interface ReportFinancialEntry {
  id: string;
  createdAt: TimestampIso;
  type: FinanceType;
  categoryId: string;
  categoryName: string;
  description: string | null;
  paymentMethodName: string | null;
  supplierName: string | null;
  amountMinor: MoneyMinor;
}

/** One COMPLETED supplier purchase. */
export interface ReportPurchase {
  id: string;
  createdAt: TimestampIso;
  purchaseNumber: string;
  supplierName: string | null;
  totalMinor: MoneyMinor;
}

/** Everything the monthly cash-flow report is built from. */
export interface CashflowReportData {
  range: ReportRange;
  business: BusinessProfile | null;
  grossSales: PeriodTotals;
  refunds: PeriodTotals;
  paymentMethods: PaymentMethodTotal[];
  financialEntries: ReportFinancialEntry[];
  purchases: ReportPurchase[];
}

function paymentType(value: unknown): PaymentType {
  if (typeof value === 'string' && (PAYMENT_TYPES as readonly string[]).includes(value)) {
    return value as PaymentType;
  }
  throw repoError(REPO_ERROR.INVALID_STATE, `unexpected payment method type: ${String(value)}`);
}

function financeType(value: unknown): FinanceType {
  if (typeof value === 'string' && (FINANCE_TYPES as readonly string[]).includes(value)) {
    return value as FinanceType;
  }
  throw repoError(REPO_ERROR.INVALID_STATE, `unexpected financial category type: ${String(value)}`);
}

/** Gross paid sales (COMPLETED + REFUNDED) keyed on `completed_at`. */
export async function getGrossSalesTotals(range: ReportRange): Promise<PeriodTotals> {
  const db = await getDb();
  const businessId = await getBusinessId();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT COALESCE(SUM(total_minor), 0) AS gross_total,
            COUNT(*) AS gross_count
       FROM sale
      WHERE business_id = ? AND status IN ('COMPLETED', 'REFUNDED')
        AND completed_at >= ? AND completed_at <= ?`,
    businessId,
    range.from,
    range.to,
  );
  return { totalMinor: int(row?.gross_total), count: int(row?.gross_count) };
}

/**
 * Money collected per payment method on paid sales in the range. A split
 * payment contributes to each method it used.
 */
export async function listPaymentTotalsByMethod(range: ReportRange): Promise<PaymentMethodTotal[]> {
  const db = await getDb();
  const businessId = await getBusinessId();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT pm.id AS method_id, pm.type AS method_type, pm.name AS method_name,
            SUM(p.amount_minor) AS method_total,
            COUNT(DISTINCT s.id) AS method_sale_count
       FROM payment p
       JOIN sale s ON s.id = p.sale_id
       JOIN payment_method pm ON pm.id = p.payment_method_id
      WHERE s.business_id = ? AND s.status IN ('COMPLETED', 'REFUNDED')
        AND s.completed_at >= ? AND s.completed_at <= ?
      GROUP BY pm.id, pm.type, pm.name
      ORDER BY pm.sort_order ASC, pm.name ASC`,
    businessId,
    range.from,
    range.to,
  );
  return rows.map((row) => ({
    methodId: str(row.method_id),
    type: paymentType(row.method_type),
    name: str(row.method_name),
    totalMinor: int(row.method_total),
    saleCount: int(row.method_sale_count),
  }));
}

/** Every manual INCOME / EXPENSE transaction in the range, oldest first. */
export async function listFinancialEntriesInRange(
  range: ReportRange,
): Promise<ReportFinancialEntry[]> {
  const db = await getDb();
  const businessId = await getBusinessId();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ft.id AS entry_id, ft.created_at AS entry_created_at, ft.amount_minor AS entry_amount,
            ft.description AS entry_description,
            c.id AS category_id, c.name AS category_name, c.type AS category_type,
            pm.name AS payment_method_name, sup.name AS supplier_name
       FROM financial_transaction ft
       JOIN financial_category c ON c.id = ft.category_id
       LEFT JOIN payment_method pm ON pm.id = ft.payment_method_id
       LEFT JOIN supplier sup ON sup.id = ft.supplier_id
      WHERE ft.business_id = ? AND ft.created_at >= ? AND ft.created_at <= ?
      ORDER BY ft.created_at ASC, ft.id ASC`,
    businessId,
    range.from,
    range.to,
  );
  return rows.map((row) => ({
    id: str(row.entry_id),
    createdAt: str(row.entry_created_at),
    type: financeType(row.category_type),
    categoryId: str(row.category_id),
    categoryName: str(row.category_name),
    description: strOrNull(row.entry_description),
    paymentMethodName: strOrNull(row.payment_method_name),
    supplierName: strOrNull(row.supplier_name),
    amountMinor: int(row.entry_amount),
  }));
}

/** COMPLETED supplier purchases in the range, oldest first. */
export async function listPurchasesInRange(range: ReportRange): Promise<ReportPurchase[]> {
  const db = await getDb();
  const businessId = await getBusinessId();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT pu.id AS purchase_id, pu.created_at AS purchase_created_at,
            pu.purchase_number AS purchase_number, pu.total_minor AS purchase_total,
            sup.name AS supplier_name
       FROM purchase pu
       LEFT JOIN supplier sup ON sup.id = pu.supplier_id
      WHERE pu.business_id = ? AND pu.status = 'COMPLETED'
        AND pu.created_at >= ? AND pu.created_at <= ?
      ORDER BY pu.created_at ASC, pu.id ASC`,
    businessId,
    range.from,
    range.to,
  );
  return rows.map((row) => ({
    id: str(row.purchase_id),
    createdAt: str(row.purchase_created_at),
    purchaseNumber: str(row.purchase_number),
    supplierName: strOrNull(row.supplier_name),
    totalMinor: int(row.purchase_total),
  }));
}

/**
 * Load every ledger extract the cash-flow report needs for `range`. Financial
 * reporting is restricted to `dashboard.finance.view` (owners / admins).
 */
export async function getCashflowReportData(
  actor: AuthActor,
  range: ReportRange,
): Promise<CashflowReportData> {
  requireCapability(actor, 'dashboard.finance.view');

  // Resolve the business scope once up front so the parallel queries below
  // share the memoized id instead of racing the first lookup.
  await getBusinessId();

  const [business, grossSales, refunds, paymentMethods, financialEntries, purchases] =
    await Promise.all([
      getBusinessProfile(),
      getGrossSalesTotals(range),
      getRefundedSalesTotals(range),
      listPaymentTotalsByMethod(range),
      listFinancialEntriesInRange(range),
      listPurchasesInRange(range),
    ]);

  return { range, business, grossSales, refunds, paymentMethods, financialEntries, purchases };
}
