/**
 * Pure monthly cash-flow report model.
 *
 * Turns the raw ledger extract from `@/db/repositories/cashflow-report` into
 * the accountant-facing statement the PDF renders: an income statement for one
 * calendar month, income by payment method, and the itemized expenses,
 * purchases and other income behind it. Free of database access, React and
 * locale state so it can be unit-tested with plain objects.
 *
 * Money is INTEGER minor units and all arithmetic is integer (AGENTS §6). A
 * report month is the device-LOCAL calendar month, converted to an inclusive
 * UTC ISO range for SQL — the same convention as `@/lib/dashboard`.
 */

import type {
  BusinessProfile,
  CashflowReportData,
  PaymentMethodTotal,
  ReportFinancialEntry,
  ReportPurchase,
} from '@/db/repositories';
import { sumMinor } from '@/db/repositories/calc';
import { computeDashboardTotals, type DateLike, type DayRange } from '@/lib/dashboard';
import { dayjs } from '@/lib/dayjs';

/** A calendar month; `month` is 1-12. */
export interface ReportMonth {
  year: number;
  month: number;
}

/**
 * Days into a new month during which the report defaults to the PREVIOUS
 * month — owners typically close the books in the first days of the month.
 */
export const PREVIOUS_MONTH_DEFAULT_DAYS = 5;

/** The local calendar month containing `date`. */
export function monthOf(date: DateLike = new Date()): ReportMonth {
  const d = dayjs(date);
  return { year: d.year(), month: d.month() + 1 };
}

/** `ref` shifted by `delta` months (negative goes back). */
export function shiftMonth(ref: ReportMonth, delta: number): ReportMonth {
  return monthOf(monthStart(ref).add(delta, 'month'));
}

/** Ordering of two months: negative when `a` is before `b`. */
export function compareMonths(a: ReportMonth, b: ReportMonth): number {
  return a.year !== b.year ? a.year - b.year : a.month - b.month;
}

/** The month a new report starts on: the previous month early in a month, else the current one. */
export function defaultReportMonth(now: DateLike = new Date()): ReportMonth {
  const current = monthOf(now);
  return dayjs(now).date() <= PREVIOUS_MONTH_DEFAULT_DAYS ? shiftMonth(current, -1) : current;
}

function monthStart(ref: ReportMonth) {
  return dayjs(new Date(ref.year, ref.month - 1, 1));
}

/**
 * The FULL local calendar month as an inclusive UTC ISO range. Unlike
 * `periodRange('month')` it is not truncated at today, so a past month always
 * yields the same statement.
 */
export function monthRange(ref: ReportMonth): DayRange {
  const start = monthStart(ref);
  return {
    from: start.startOf('month').toISOString(),
    to: start.endOf('month').toISOString(),
  };
}

/** `YYYY-MM` key for a month (file names, test ids). */
export function monthKey(ref: ReportMonth): string {
  return monthStart(ref).format('YYYY-MM');
}

/** PDF file name for a month's report, e.g. `punto-flujo-2026-09.pdf`. */
export function reportFileName(ref: ReportMonth): string {
  return `punto-flujo-${monthKey(ref)}.pdf`;
}

/** One expense category's subtotal and its line items. */
export interface ExpenseCategoryGroup {
  categoryId: string;
  categoryName: string;
  totalMinor: number;
  entries: ReportFinancialEntry[];
}

/** Income statement for the month (all POSITIVE minor units except `netMinor`). */
export interface CashflowSummary {
  grossSalesMinor: number;
  salesCount: number;
  otherIncomeMinor: number;
  totalIncomeMinor: number;
  refundsMinor: number;
  refundCount: number;
  manualExpenseMinor: number;
  purchasesMinor: number;
  totalExpenseMinor: number;
  /** Total income − total expense. May be negative. */
  netMinor: number;
}

/** The ready-to-render monthly cash-flow statement. */
export interface CashflowReport {
  month: ReportMonth;
  range: DayRange;
  generatedAt: string;
  business: BusinessProfile | null;
  currency: string;
  summary: CashflowSummary;
  paymentMethods: PaymentMethodTotal[];
  paymentMethodsTotalMinor: number;
  /** Expenses grouped by category (largest first), each with its line items. */
  expenseCategories: ExpenseCategoryGroup[];
  /** Every manual expense, oldest first. */
  expenses: ReportFinancialEntry[];
  otherIncome: ReportFinancialEntry[];
  purchases: ReportPurchase[];
}

function byCreatedAt<T extends { createdAt: string; id: string }>(a: T, b: T): number {
  if (a.createdAt !== b.createdAt) {
    return a.createdAt < b.createdAt ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function groupExpenses(expenses: ReportFinancialEntry[]): ExpenseCategoryGroup[] {
  const groups = new Map<string, ExpenseCategoryGroup>();
  for (const entry of expenses) {
    const group = groups.get(entry.categoryId) ?? {
      categoryId: entry.categoryId,
      categoryName: entry.categoryName,
      totalMinor: 0,
      entries: [],
    };
    group.entries.push(entry);
    group.totalMinor = sumMinor([group.totalMinor, entry.amountMinor]);
    groups.set(entry.categoryId, group);
  }
  return [...groups.values()].sort(
    (a, b) => b.totalMinor - a.totalMinor || a.categoryName.localeCompare(b.categoryName),
  );
}

/** Compose the monthly statement from the raw ledger extract. */
export function buildCashflowReport(
  data: CashflowReportData,
  month: ReportMonth,
  generatedAt: DateLike = new Date(),
): CashflowReport {
  const expenses = data.financialEntries.filter((e) => e.type === 'EXPENSE').sort(byCreatedAt);
  const otherIncome = data.financialEntries.filter((e) => e.type === 'INCOME').sort(byCreatedAt);
  const purchases = [...data.purchases].sort(byCreatedAt);

  const otherIncomeMinor = sumMinor(otherIncome.map((e) => e.amountMinor));
  const manualExpenseMinor = sumMinor(expenses.map((e) => e.amountMinor));
  const purchasesMinor = sumMinor(purchases.map((p) => p.totalMinor));

  const totals = computeDashboardTotals({
    salesMinor: data.grossSales.totalMinor,
    refundsMinor: data.refunds.totalMinor,
    otherIncomeMinor,
    manualExpenseMinor,
    purchaseExpenseMinor: purchasesMinor,
  });

  return {
    month,
    range: data.range,
    generatedAt: dayjs(generatedAt).toISOString(),
    business: data.business,
    currency: data.business?.currencyCode ?? 'USD',
    summary: {
      grossSalesMinor: data.grossSales.totalMinor,
      salesCount: data.grossSales.count,
      otherIncomeMinor,
      totalIncomeMinor: totals.incomeMinor,
      refundsMinor: data.refunds.totalMinor,
      refundCount: data.refunds.count,
      manualExpenseMinor,
      purchasesMinor,
      totalExpenseMinor: totals.expenseMinor,
      netMinor: totals.netMinor,
    },
    paymentMethods: data.paymentMethods.filter((m) => m.totalMinor > 0),
    paymentMethodsTotalMinor: sumMinor(data.paymentMethods.map((m) => m.totalMinor)),
    expenseCategories: groupExpenses(expenses),
    expenses,
    otherIncome,
    purchases,
  };
}

/** True when the month has no money movement at all. */
export function isEmptyReport(report: CashflowReport): boolean {
  const s = report.summary;
  return s.totalIncomeMinor === 0 && s.totalExpenseMinor === 0;
}
