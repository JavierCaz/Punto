/**
 * Shared fixtures for the cash-flow report model and HTML tests.
 * Not a suite (no `.test.` in the name).
 */

import type { BusinessProfile, CashflowReportData, ReportFinancialEntry } from '@/db/repositories';

export const BUSINESS: BusinessProfile = {
  id: 'biz-1',
  name: 'Café Punto',
  legalName: 'Café Punto S.A. de C.V.',
  description: null,
  logoUri: null,
  phone: '555-0100',
  email: 'hola@punto.app',
  addressLine1: 'Calle 1 #23',
  city: 'CDMX',
  state: 'CDMX',
  postalCode: '01000',
  countryCode: 'MX',
  currencyCode: 'MXN',
  locale: 'es',
  accentColor: 'emerald',
  taxEnabled: false,
  defaultTaxRateBp: 0,
  inventoryEnabled: true,
  allowNegativeInventory: false,
  lowStockAlertsEnabled: true,
  receiptEnabled: true,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export function entry(overrides: Partial<ReportFinancialEntry>): ReportFinancialEntry {
  return {
    id: 'ft-x',
    createdAt: '2026-09-15T15:00:00.000Z',
    type: 'EXPENSE',
    categoryId: 'cat-other',
    categoryName: 'Otros gastos',
    description: null,
    paymentMethodName: null,
    supplierName: null,
    amountMinor: 1000,
    ...overrides,
  };
}

/** A realistic September: split payments, a refund, rent, utilities, a purchase, a tip jar income. */
export function septemberData(): CashflowReportData {
  return {
    range: { from: '2026-09-01T06:00:00.000Z', to: '2026-10-01T05:59:59.999Z' },
    business: BUSINESS,
    grossSales: { totalMinor: 1500000, count: 120 },
    refunds: { totalMinor: 20000, count: 1 },
    paymentMethods: [
      { methodId: 'pm-cash', type: 'CASH', name: 'Efectivo', totalMinor: 900000, saleCount: 80 },
      { methodId: 'pm-card', type: 'CARD', name: 'Tarjeta', totalMinor: 500000, saleCount: 45 },
      { methodId: 'pm-tr', type: 'TRANSFER', name: 'Transferencia', totalMinor: 100000, saleCount: 5 },
    ],
    financialEntries: [
      entry({ id: 'ft-3', createdAt: '2026-09-20T15:00:00.000Z', categoryId: 'cat-util', categoryName: 'Servicios', description: 'Luz', amountMinor: 120000 }),
      entry({ id: 'ft-1', createdAt: '2026-09-01T15:00:00.000Z', categoryId: 'cat-rent', categoryName: 'Renta', description: 'Renta septiembre', paymentMethodName: 'Transferencia', amountMinor: 800000 }),
      entry({ id: 'ft-2', createdAt: '2026-09-05T15:00:00.000Z', categoryId: 'cat-util', categoryName: 'Servicios', description: 'Agua', amountMinor: 30000 }),
      entry({ id: 'ft-4', createdAt: '2026-09-12T15:00:00.000Z', type: 'INCOME', categoryId: 'cat-inc', categoryName: 'Otros ingresos', description: 'Evento privado', amountMinor: 250000 }),
    ],
    purchases: [
      { id: 'pu-2', createdAt: '2026-09-18T15:00:00.000Z', purchaseNumber: 'C-0002', supplierName: null, totalMinor: 50000 },
      { id: 'pu-1', createdAt: '2026-09-10T15:00:00.000Z', purchaseNumber: 'C-0001', supplierName: 'Lácteos del Valle', totalMinor: 200000 },
    ],
  };
}
