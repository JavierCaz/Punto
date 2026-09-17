/**
 * @jest-environment node
 *
 * Analytics repository tests against the scripted RecordingAdapter fake
 * (no native SQLite — see AGENTS §9.4). Verifies the SQL predicates that the
 * Dashboard's correctness depends on: completed_at for income, refunded_at for
 * refunds, the finance category JOIN, and COMPLETED-only purchases.
 */

import { getDb } from '@/db/client';

import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import {
  countHeldSales,
  getCompletedSalesTotals,
  getFinancialTotals,
  getPurchaseExpenseTotal,
  getRefundedSalesTotals,
  listCompletedSalesInRange,
  listTopProducts,
} from '@/db/repositories/analytics';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

jest.mock('@/db/client', () => ({ getDb: jest.fn() }));

const RANGE = { from: '2026-09-08T00:00:00.000Z', to: '2026-09-08T23:59:59.999Z' };

describe('analytics repository', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  it('getCompletedSalesTotals keys income on completed_at and COMPLETED status', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueFirst('AS completed_total', { completed_total: 100000, completed_count: 3 });

    const result = await getCompletedSalesTotals(RANGE);

    expect(result).toEqual({ totalMinor: 100000, count: 3 });
    const call = adapter.calls.find((c) => c.sql.includes('AS completed_total'));
    expect(call).toBeDefined();
    expect(call!.sql).toContain("status = 'COMPLETED'");
    expect(call!.sql).toContain('completed_at >= ?');
    expect(call!.sql).toContain('completed_at <= ?');
    expect(call!.params).toEqual(['biz-1', RANGE.from, RANGE.to]);
  });

  it('getCompletedSalesTotals coerces a null aggregate to 0', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueFirst('AS completed_total', { completed_total: null, completed_count: null });

    await expect(getCompletedSalesTotals(RANGE)).resolves.toEqual({ totalMinor: 0, count: 0 });
  });

  it('getRefundedSalesTotals keys refunds on refunded_at', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueFirst('AS refund_total', { refund_total: 20000, refund_count: 1 });

    const result = await getRefundedSalesTotals(RANGE);

    expect(result).toEqual({ totalMinor: 20000, count: 1 });
    const call = adapter.calls.find((c) => c.sql.includes('AS refund_total'));
    expect(call!.sql).toContain("status = 'REFUNDED'");
    expect(call!.sql).toContain('refunded_at >= ?');
    expect(call!.params).toEqual(['biz-1', RANGE.from, RANGE.to]);
  });

  it('getFinancialTotals splits income/expense via the category JOIN', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueFirst('AS income_total', { income_total: 5000, expense_total: 15000 });

    const result = await getFinancialTotals(RANGE);

    expect(result).toEqual({ incomeMinor: 5000, expenseMinor: 15000 });
    const call = adapter.calls.find((c) => c.sql.includes('AS income_total'));
    expect(call!.sql).toContain('JOIN financial_category c ON c.id = ft.category_id');
    expect(call!.sql).toContain("c.type = 'INCOME'");
    expect(call!.sql).toContain("c.type = 'EXPENSE'");
    expect(call!.sql).toContain('ft.created_at >= ?');
  });

  it('getPurchaseExpenseTotal only counts COMPLETED purchases', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueFirst('AS purchase_total', { purchase_total: 30000 });

    await expect(getPurchaseExpenseTotal(RANGE)).resolves.toBe(30000);
    const call = adapter.calls.find((c) => c.sql.includes('AS purchase_total'));
    expect(call!.sql).toContain("status = 'COMPLETED'");
    expect(call!.sql).toContain('created_at >= ?');
  });

  it('listCompletedSalesInRange maps completed_at/total_minor rows', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueAll('SELECT completed_at, total_minor', [
      { completed_at: '2026-09-08T15:00:00.000Z', total_minor: 60000 },
      { completed_at: '2026-09-08T18:00:00.000Z', total_minor: 40000 },
    ]);

    const result = await listCompletedSalesInRange(RANGE);

    expect(result).toEqual([
      { completedAt: '2026-09-08T15:00:00.000Z', totalMinor: 60000 },
      { completedAt: '2026-09-08T18:00:00.000Z', totalMinor: 40000 },
    ]);
  });

  it('listTopProducts groups by product and applies the limit', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueAll('AS revenue_minor', [
      { product_name: 'Matcha Latte', revenue_minor: 60000, quantity_milli: 3000 },
    ]);

    const result = await listTopProducts(RANGE, 5);

    expect(result).toEqual([
      { name: 'Matcha Latte', revenueMinor: 60000, quantityMilli: 3000 },
    ]);
    const call = adapter.calls.find((c) => c.sql.includes('AS revenue_minor'));
    expect(call!.sql).toContain('JOIN sale s ON s.id = si.sale_id');
    expect(call!.sql).toContain("s.status = 'COMPLETED'");
    expect(call!.sql).toContain('GROUP BY si.product_name');
    expect(call!.params).toEqual(['biz-1', RANGE.from, RANGE.to, 5]);
  });

  it('countHeldSales counts HELD carts', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueFirst('AS held_count', { held_count: 2 });

    await expect(countHeldSales()).resolves.toBe(2);
    const call = adapter.calls.find((c) => c.sql.includes('AS held_count'));
    expect(call!.sql).toContain("status = 'HELD'");
  });

  it('getCompletedSalesTotals scopes to a seller when employeeId is set', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueFirst('AS completed_total', { completed_total: 5000, completed_count: 1 });

    await getCompletedSalesTotals({ ...RANGE, employeeId: 'emp-2' });

    const call = adapter.calls.find((c) => c.sql.includes('AS completed_total'));
    expect(call!.sql).toContain('AND employee_id = ?');
    expect(call!.params).toEqual(['biz-1', RANGE.from, RANGE.to, 'emp-2']);
  });

  it('getRefundedSalesTotals scopes refunds to the original seller', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueFirst('AS refund_total', { refund_total: 2000, refund_count: 1 });

    await getRefundedSalesTotals({ ...RANGE, employeeId: 'emp-2' });

    const call = adapter.calls.find((c) => c.sql.includes('AS refund_total'));
    expect(call!.sql).toContain('AND employee_id = ?');
    expect(call!.params).toEqual(['biz-1', RANGE.from, RANGE.to, 'emp-2']);
  });

  it('listCompletedSalesInRange scopes the trend to a seller', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueAll('SELECT completed_at, total_minor', []);

    await listCompletedSalesInRange({ ...RANGE, employeeId: 'emp-2' });

    const call = adapter.calls.find((c) => c.sql.includes('SELECT completed_at, total_minor'));
    expect(call!.sql).toContain('AND employee_id = ?');
    expect(call!.params).toEqual(['biz-1', RANGE.from, RANGE.to, 'emp-2']);
  });

  it('listTopProducts scopes to a seller and keeps the limit bound last', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueAll('AS revenue_minor', []);

    await listTopProducts({ ...RANGE, employeeId: 'emp-2' }, 5);

    const call = adapter.calls.find((c) => c.sql.includes('AS revenue_minor'));
    expect(call!.sql).toContain('AND s.employee_id = ?');
    expect(call!.params).toEqual(['biz-1', RANGE.from, RANGE.to, 'emp-2', 5]);
  });
});
