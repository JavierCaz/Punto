/**
 * @jest-environment node
 */

import {
  buildCashflowReport,
  compareMonths,
  defaultReportMonth,
  isEmptyReport,
  monthKey,
  monthOf,
  monthRange,
  reportFileName,
  shiftMonth,
} from '@/lib/cashflow-report';
import { dayjs } from '@/lib/dayjs';

import { septemberData } from './fakes/cashflow-report-fixtures';

const SEPTEMBER = { year: 2026, month: 9 };

describe('report months', () => {
  it('monthRange covers the full local calendar month, not truncated at today', () => {
    const range = monthRange(SEPTEMBER);
    expect(dayjs(range.from).isSame(dayjs(new Date(2026, 8, 1)).startOf('day'))).toBe(true);
    expect(dayjs(range.to).isSame(dayjs(new Date(2026, 8, 30)).endOf('day'))).toBe(true);
  });

  it('monthRange handles February in leap and non-leap years', () => {
    expect(dayjs(monthRange({ year: 2028, month: 2 }).to).date()).toBe(29);
    expect(dayjs(monthRange({ year: 2026, month: 2 }).to).date()).toBe(28);
  });

  it('shiftMonth crosses year boundaries both ways', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(SEPTEMBER, 0)).toEqual(SEPTEMBER);
  });

  it('compareMonths orders by year then month', () => {
    expect(compareMonths({ year: 2026, month: 9 }, { year: 2026, month: 10 })).toBeLessThan(0);
    expect(compareMonths({ year: 2027, month: 1 }, { year: 2026, month: 12 })).toBeGreaterThan(0);
    expect(compareMonths(SEPTEMBER, { ...SEPTEMBER })).toBe(0);
  });

  it('defaults to the previous month during the first days of a month', () => {
    expect(defaultReportMonth(new Date(2026, 9, 2))).toEqual({ year: 2026, month: 9 });
    expect(defaultReportMonth(new Date(2026, 0, 3))).toEqual({ year: 2025, month: 12 });
    expect(defaultReportMonth(new Date(2026, 9, 6))).toEqual({ year: 2026, month: 10 });
  });

  it('monthOf / monthKey / reportFileName use the local month', () => {
    expect(monthOf(new Date(2026, 8, 30, 23, 59))).toEqual(SEPTEMBER);
    expect(monthKey({ year: 2026, month: 3 })).toBe('2026-03');
    expect(reportFileName(SEPTEMBER)).toBe('punto-flujo-2026-09.pdf');
  });
});

describe('buildCashflowReport', () => {
  const report = buildCashflowReport(septemberData(), SEPTEMBER, '2026-10-02T16:00:00.000Z');

  it('builds the income statement with refunds subtracted exactly once', () => {
    expect(report.summary).toEqual({
      grossSalesMinor: 1500000,
      salesCount: 120,
      otherIncomeMinor: 250000,
      totalIncomeMinor: 1750000,
      refundsMinor: 20000,
      refundCount: 1,
      manualExpenseMinor: 950000,
      purchasesMinor: 250000,
      totalExpenseMinor: 1220000,
      netMinor: 530000,
    });
  });

  it('payment-method totals add up to gross sales (split payments counted per method)', () => {
    expect(report.paymentMethodsTotalMinor).toBe(report.summary.grossSalesMinor);
    expect(report.paymentMethods.map((m) => m.name)).toEqual(['Efectivo', 'Tarjeta', 'Transferencia']);
  });

  it('groups expenses by category, largest first, with subtotals matching the summary', () => {
    expect(report.expenseCategories.map((g) => [g.categoryName, g.totalMinor])).toEqual([
      ['Renta', 800000],
      ['Servicios', 150000],
    ]);
    const groupsTotal = report.expenseCategories.reduce((sum, g) => sum + g.totalMinor, 0);
    expect(groupsTotal).toBe(report.summary.manualExpenseMinor);
    expect(report.expenseCategories[1]!.entries.map((e) => e.id)).toEqual(['ft-2', 'ft-3']);
  });

  it('splits income from expenses and sorts every detail list by date', () => {
    expect(report.expenses.map((e) => e.id)).toEqual(['ft-1', 'ft-2', 'ft-3']);
    expect(report.otherIncome.map((e) => e.id)).toEqual(['ft-4']);
    expect(report.purchases.map((p) => p.id)).toEqual(['pu-1', 'pu-2']);
    const purchasesTotal = report.purchases.reduce((sum, p) => sum + p.totalMinor, 0);
    expect(purchasesTotal).toBe(report.summary.purchasesMinor);
  });

  it('carries currency, month and generation stamp', () => {
    expect(report.currency).toBe('MXN');
    expect(report.month).toEqual(SEPTEMBER);
    expect(report.generatedAt).toBe('2026-10-02T16:00:00.000Z');
    expect(isEmptyReport(report)).toBe(false);
  });

  it('handles an empty month and a missing business profile', () => {
    const empty = buildCashflowReport(
      {
        ...septemberData(),
        business: null,
        grossSales: { totalMinor: 0, count: 0 },
        refunds: { totalMinor: 0, count: 0 },
        paymentMethods: [],
        financialEntries: [],
        purchases: [],
      },
      SEPTEMBER,
    );
    expect(empty.currency).toBe('USD');
    expect(empty.summary.netMinor).toBe(0);
    expect(empty.expenseCategories).toEqual([]);
    expect(isEmptyReport(empty)).toBe(true);
  });

  it('a refund-only month (sale last month) yields a negative net', () => {
    const refundOnly = buildCashflowReport(
      {
        ...septemberData(),
        grossSales: { totalMinor: 0, count: 0 },
        paymentMethods: [],
        financialEntries: [],
        purchases: [],
      },
      SEPTEMBER,
    );
    expect(refundOnly.summary.netMinor).toBe(-20000);
    expect(isEmptyReport(refundOnly)).toBe(false);
  });
});
