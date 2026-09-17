import { useCallback, useState } from 'react';

import {
  countHeldSales,
  expireStaleHeldSales,
  getBusinessProfile,
  getCompletedSalesTotals,
  getFinancialTotals,
  getPurchaseExpenseTotal,
  getRefundedSalesTotals,
  listCompletedSalesInRange,
  listLowStockItems,
  listTopProducts,
  type CompletedSalePoint,
  type InventoryItem,
  type TopProduct,
} from '@/db';
import {
  averageTicketMinor,
  bucketSalesByPeriod,
  computeDashboardTotals,
  periodGranularity,
  periodRange,
  type DashboardPeriod,
  type DashboardTotals,
  type TrendGranularity,
  type TrendPoint,
} from '@/lib/dashboard';

/** Number of best-selling products shown on the dashboard. */
export const DASHBOARD_TOP_PRODUCTS = 5;

/**
 * The composed, ready-to-render dashboard model. All arithmetic happens here
 * (via the pure helpers in `@/lib/dashboard`); the screen only formats.
 */
export interface DashboardModel {
  /** Business currency code (e.g. 'MXN'), for locale-aware money formatting. */
  currency: string;
  /** The period these figures cover. */
  period: DashboardPeriod;
  /** Income / expense / net cash-flow figures for the period. */
  totals: DashboardTotals;
  /** Raw income components (all POSITIVE minor units), for the breakdown. */
  salesMinor: number;
  otherIncomeMinor: number;
  /** Raw expense components (all POSITIVE minor units), for the breakdown. */
  refundsMinor: number;
  manualExpenseMinor: number;
  purchaseExpenseMinor: number;
  /** Number of COMPLETED sales in the period. */
  salesCount: number;
  /** Period average ticket, integer minor units (0 when no sales). */
  averageTicketMinor: number;
  /** Gross completed-sale income per bucket for the period. */
  trend: TrendPoint[];
  /** Bucket granularity of `trend` (drives the chart's labels). */
  granularity: TrendGranularity;
  /** Best sellers over the period. */
  topProducts: TopProduct[];
  /** Ingredients at or below their low-stock threshold (point-in-time). */
  lowStock: InventoryItem[];
  /** Carts parked in HELD state (point-in-time). */
  heldCount: number;
  /** Raw completed sales for the period (kept for detail views). */
  completedSales: CompletedSalePoint[];
}

export interface DashboardState {
  model: DashboardModel | null;
  loading: boolean;
  loadFailed: boolean;
  reload: () => Promise<void>;
  /** Active reporting window; changing it refetches and re-buckets the trend. */
  period: DashboardPeriod;
  setPeriod: (period: DashboardPeriod) => void;
}

/**
 * Loads and composes every number the Dashboard renders. Call `reload` from a
 * focus effect so the figures refresh after a sale, expense or stock change.
 *
 * The selected `period` scopes the cash-flow totals, the income trend and the
 * top products. Periods are LOCAL calendar windows converted to UTC ISO for
 * SQL (see `periodRange`); the trend is bucketed on-device in local time.
 */
export function useDashboard(initialPeriod: DashboardPeriod = 'day'): DashboardState {
  const [period, setPeriod] = useState<DashboardPeriod>(initialPeriod);
  const [model, setModel] = useState<DashboardModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const reload = useCallback(async () => {
    try {
      setLoadFailed(false);
      setLoading(true);

      const range = periodRange(period);

      // Abandon stale held carts first (best-effort) so the "held" count can
      // never nag forever. Lossless: a held cart holds no stock or payments.
      try {
        await expireStaleHeldSales();
      } catch {
        // Maintenance only — never block the dashboard on it.
      }

      const [
        sales,
        refunds,
        financial,
        purchaseExpenseMinor,
        completedSales,
        topProducts,
        lowStock,
        heldCount,
        profile,
      ] = await Promise.all([
        getCompletedSalesTotals(range),
        getRefundedSalesTotals(range),
        getFinancialTotals(range),
        getPurchaseExpenseTotal(range),
        listCompletedSalesInRange(range),
        listTopProducts(range, DASHBOARD_TOP_PRODUCTS),
        listLowStockItems(),
        countHeldSales(),
        getBusinessProfile(),
      ]);

      const totals = computeDashboardTotals({
        salesMinor: sales.totalMinor,
        refundsMinor: refunds.totalMinor,
        otherIncomeMinor: financial.incomeMinor,
        manualExpenseMinor: financial.expenseMinor,
        purchaseExpenseMinor,
      });

      setModel({
        currency: profile?.currencyCode ?? 'USD',
        period,
        totals,
        salesMinor: sales.totalMinor,
        otherIncomeMinor: financial.incomeMinor,
        refundsMinor: refunds.totalMinor,
        manualExpenseMinor: financial.expenseMinor,
        purchaseExpenseMinor,
        salesCount: sales.count,
        averageTicketMinor: averageTicketMinor(sales.totalMinor, sales.count),
        trend: bucketSalesByPeriod(completedSales, period),
        granularity: periodGranularity(period),
        topProducts,
        lowStock,
        heldCount,
        completedSales,
      });
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [period]);

  return { model, loading, loadFailed, reload, period, setPeriod };
}
