/**
 * @jest-environment node
 *
 * Cash-flow report repository tests against the scripted RecordingAdapter fake
 * (no native SQLite — AGENTS §9.4). Pins the accounting predicates the monthly
 * accountant PDF depends on: paid sales (COMPLETED + REFUNDED) by
 * completed_at, payments grouped per method on those same sales, the finance
 * category JOIN, COMPLETED-only purchases, and the finance capability gate.
 */

import { isForbiddenError } from '@/auth/permissions';
import { getDb } from '@/db/client';

import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';
import {
  getCashflowReportData,
  getGrossSalesTotals,
  listFinancialEntriesInRange,
  listPaymentTotalsByMethod,
  listPurchasesInRange,
} from '@/db/repositories/cashflow-report';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

jest.mock('@/db/client', () => ({ getDb: jest.fn() }));

const RANGE = { from: '2026-09-01T06:00:00.000Z', to: '2026-10-01T05:59:59.999Z' };
const ADMIN = { role: 'ADMIN' as const };
const EMPLOYEE = { role: 'EMPLOYEE' as const };

const businessRow = {
  id: 'biz-1',
  name: 'Café Punto',
  legal_name: 'Café Punto S.A. de C.V.',
  description: null,
  logo_uri: null,
  phone: '555-0100',
  email: 'hola@punto.app',
  address_line1: 'Calle 1',
  city: 'CDMX',
  state: 'CDMX',
  postal_code: '01000',
  country_code: 'MX',
  currency_code: 'MXN',
  locale: 'es',
  accent_color: 'emerald',
  tax_enabled: 0,
  default_tax_rate_bp: 0,
  inventory_enabled: 1,
  allow_negative_inventory: 0,
  low_stock_alerts_enabled: 1,
  receipt_enabled: 1,
  is_active: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('cashflow report repository', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  it('getGrossSalesTotals counts paid sales (COMPLETED + REFUNDED) by completed_at', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueFirst('AS gross_total', { gross_total: 150000, gross_count: 4 });

    await expect(getGrossSalesTotals(RANGE)).resolves.toEqual({ totalMinor: 150000, count: 4 });
    const call = adapter.calls.find((c) => c.sql.includes('AS gross_total'));
    expect(call!.sql).toContain("status IN ('COMPLETED', 'REFUNDED')");
    expect(call!.sql).toContain('completed_at >= ?');
    expect(call!.sql).toContain('completed_at <= ?');
    expect(call!.params).toEqual(['biz-1', RANGE.from, RANGE.to]);
  });

  it('listPaymentTotalsByMethod groups payments of paid sales per method', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueAll('AS method_total', [
      { method_id: 'pm-cash', method_type: 'CASH', method_name: 'Efectivo', method_total: 90000, method_sale_count: 3 },
      { method_id: 'pm-card', method_type: 'CARD', method_name: 'Tarjeta', method_total: 60000, method_sale_count: 2 },
    ]);

    const result = await listPaymentTotalsByMethod(RANGE);

    expect(result).toEqual([
      { methodId: 'pm-cash', type: 'CASH', name: 'Efectivo', totalMinor: 90000, saleCount: 3 },
      { methodId: 'pm-card', type: 'CARD', name: 'Tarjeta', totalMinor: 60000, saleCount: 2 },
    ]);
    const call = adapter.calls.find((c) => c.sql.includes('AS method_total'));
    expect(call!.sql).toContain('JOIN sale s ON s.id = p.sale_id');
    expect(call!.sql).toContain("s.status IN ('COMPLETED', 'REFUNDED')");
    expect(call!.sql).toContain('s.completed_at >= ?');
    expect(call!.sql).toContain('COUNT(DISTINCT s.id)');
    expect(call!.sql).toContain('GROUP BY pm.id');
    expect(call!.params).toEqual(['biz-1', RANGE.from, RANGE.to]);
  });

  it('listPaymentTotalsByMethod rejects an unknown method type', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueAll('AS method_total', [
      { method_id: 'x', method_type: 'BITCOIN', method_name: 'X', method_total: 1, method_sale_count: 1 },
    ]);

    const error = await listPaymentTotalsByMethod(RANGE).catch((e: unknown) => e);
    expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
  });

  it('listFinancialEntriesInRange joins category type, payment method and supplier', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueAll('AS entry_amount', [
      {
        entry_id: 'ft-1',
        entry_created_at: '2026-09-03T15:00:00.000Z',
        entry_amount: 800000,
        entry_description: 'Renta septiembre',
        category_id: 'cat-rent',
        category_name: 'Renta',
        category_type: 'EXPENSE',
        payment_method_name: 'Transferencia',
        supplier_name: null,
      },
    ]);

    const result = await listFinancialEntriesInRange(RANGE);

    expect(result).toEqual([
      {
        id: 'ft-1',
        createdAt: '2026-09-03T15:00:00.000Z',
        type: 'EXPENSE',
        categoryId: 'cat-rent',
        categoryName: 'Renta',
        description: 'Renta septiembre',
        paymentMethodName: 'Transferencia',
        supplierName: null,
        amountMinor: 800000,
      },
    ]);
    const call = adapter.calls.find((c) => c.sql.includes('AS entry_amount'));
    expect(call!.sql).toContain('JOIN financial_category c ON c.id = ft.category_id');
    expect(call!.sql).toContain('LEFT JOIN payment_method pm');
    expect(call!.sql).toContain('LEFT JOIN supplier sup');
    expect(call!.sql).toContain('ft.created_at >= ?');
    expect(call!.sql).toContain('ORDER BY ft.created_at ASC');
  });

  it('listPurchasesInRange only lists COMPLETED purchases with the supplier name', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueAll('AS purchase_total', [
      {
        purchase_id: 'pu-1',
        purchase_created_at: '2026-09-10T15:00:00.000Z',
        purchase_number: 'C-0001',
        purchase_total: 250000,
        supplier_name: 'Lácteos del Valle',
      },
    ]);

    await expect(listPurchasesInRange(RANGE)).resolves.toEqual([
      {
        id: 'pu-1',
        createdAt: '2026-09-10T15:00:00.000Z',
        purchaseNumber: 'C-0001',
        supplierName: 'Lácteos del Valle',
        totalMinor: 250000,
      },
    ]);
    const call = adapter.calls.find((c) => c.sql.includes('AS purchase_total'));
    expect(call!.sql).toContain("pu.status = 'COMPLETED'");
    expect(call!.sql).toContain('pu.created_at >= ?');
  });

  it('getCashflowReportData composes every extract for an admin', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueFirst('legal_name', businessRow);
    adapter.queueFirst('AS gross_total', { gross_total: 150000, gross_count: 4 });
    adapter.queueFirst('AS refund_total', { refund_total: 20000, refund_count: 1 });
    adapter.queueAll('AS method_total', []);
    adapter.queueAll('AS entry_amount', []);
    adapter.queueAll('AS purchase_total', []);

    const data = await getCashflowReportData(ADMIN, RANGE);

    expect(data.range).toEqual(RANGE);
    expect(data.business?.name).toBe('Café Punto');
    expect(data.business?.legalName).toBe('Café Punto S.A. de C.V.');
    expect(data.grossSales).toEqual({ totalMinor: 150000, count: 4 });
    expect(data.refunds).toEqual({ totalMinor: 20000, count: 1 });
    expect(data.paymentMethods).toEqual([]);
    expect(data.financialEntries).toEqual([]);
    expect(data.purchases).toEqual([]);
  });

  it('getCashflowReportData is forbidden without dashboard.finance.view', async () => {
    let caught: unknown;
    try {
      await getCashflowReportData(EMPLOYEE, RANGE);
    } catch (error) {
      caught = error;
    }
    expect(isForbiddenError(caught)).toBe(true);
    expect(adapter.calls).toHaveLength(0);
  });
});
