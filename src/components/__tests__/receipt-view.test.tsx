/**
 * Component test for the read-only sale receipt view. Purely presentational —
 * no data access — so only the standard native modules are mocked (i18n init,
 * zustand kv-store, icons, safe-area, expo-image).
 *
 * NOTE: @testing-library/react-native v14 ships an async `render` (React 19) —
 * every render must be awaited.
 */

import { render } from '@testing-library/react-native';

import { ReceiptView } from '@/components/receipt-view';
import type { PaymentMethod, SaleDetail } from '@/db';
import { i18n } from '@/i18n';
import { formatMoney, formatQuantity } from '@/i18n/format';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'es' }],
}));

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemAsync: jest.fn(async () => null),
    setItemAsync: jest.fn(async () => {}),
    removeItemAsync: jest.fn(async () => {}),
  },
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const mockMaterialCommunityIcons = () => null;
  return { __esModule: true, default: mockMaterialCommunityIcons };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-image', () => ({ Image: () => null }));

const CREATED_AT = '2026-09-08T14:05:00.000Z';

const paymentMethods: PaymentMethod[] = [
  {
    id: 'pm-cash',
    businessId: 'biz-1',
    name: 'Efectivo',
    type: 'CASH',
    isDefault: true,
    isActive: true,
    sortOrder: 0,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: 'pm-card',
    businessId: 'biz-1',
    name: 'Tarjeta',
    type: 'CARD',
    isDefault: false,
    isActive: true,
    sortOrder: 1,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
];

const baseSale: SaleDetail = {
  id: 'sale-1',
  businessId: 'biz-1',
  saleNumber: 'V-0001',
  status: 'COMPLETED',
  subtotalMinor: 500,
  discountMinor: 0,
  taxMinor: 0,
  totalMinor: 500,
  employeeId: 'emp-1',
  notes: null,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  completedAt: CREATED_AT,
  cancelledAt: null,
  refundedAt: null,
  inventoryRestored: null,
  items: [
    {
      id: 'item-1',
      saleId: 'sale-1',
      productId: 'p1',
      productName: 'Matcha Latte',
      quantity: 2000,
      unitPriceMinor: 125,
      discountMinor: 0,
      subtotalMinor: 250,
      unitCostMinor: 0,
      createdAt: CREATED_AT,
    },
    {
      id: 'item-2',
      saleId: 'sale-1',
      productId: 'p2',
      productName: 'Croissant',
      quantity: 1000,
      unitPriceMinor: 250,
      discountMinor: 0,
      subtotalMinor: 250,
      unitCostMinor: 0,
      createdAt: CREATED_AT,
    },
  ],
  payments: [
    {
      id: 'pay-1',
      businessId: 'biz-1',
      saleId: 'sale-1',
      paymentMethodId: 'pm-cash',
      amountMinor: 300,
      amountGivenMinor: 500,
      reference: null,
      notes: null,
      createdAt: CREATED_AT,
    },
    {
      id: 'pay-2',
      businessId: 'biz-1',
      saleId: 'sale-1',
      paymentMethodId: 'pm-card',
      amountMinor: 200,
      amountGivenMinor: null,
      reference: null,
      notes: null,
      createdAt: CREATED_AT,
    },
  ],
};

function renderReceipt(sale: SaleDetail = baseSale) {
  return render(
    <ReceiptView
      sale={sale}
      businessName="Café Punto"
      currency="MXN"
      paymentMethods={paymentMethods}
      employeeName="Ana"
      testID="receipt"
    />,
  );
}

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('ReceiptView', () => {
  it('renders business identity, transaction meta, items, totals and payments', async () => {
    const { getByText, getAllByText, getByTestId } = await renderReceipt();

    // 1. Header.
    expect(getByText('Café Punto')).toBeTruthy();
    expect(getByText('Recibo')).toBeTruthy();

    // 2. Transaction meta (sale number is the monospace transaction ID).
    expect(getByText('V-0001')).toBeTruthy();
    expect(getByText('Ana')).toBeTruthy();
    expect(getByText(/·/)).toBeTruthy();

    // 3. Status label.
    expect(getByText('Completada')).toBeTruthy();

    // 4. Items with quantities, unit prices and line totals.
    expect(getByText('Matcha Latte')).toBeTruthy();
    expect(getByText('Croissant')).toBeTruthy();
    expect(getByText(formatQuantity(2000, { maxDecimals: 0 }))).toBeTruthy();
    expect(getByText(formatQuantity(1000, { maxDecimals: 0 }))).toBeTruthy();

    // 5. Totals (subtotal + total share the same value here).
    expect(getAllByText(formatMoney(500, 'MXN')).length).toBeGreaterThanOrEqual(2);
    expect(getByText('Subtotal')).toBeTruthy();
    expect(getByText('Total')).toBeTruthy();

    // 6. Payments — method names, cash tendered and change.
    expect(getByText('Pagos')).toBeTruthy();
    expect(getByText('Efectivo')).toBeTruthy();
    expect(getByText('Tarjeta')).toBeTruthy();
    expect(getByText('Recibido')).toBeTruthy();
    expect(getByText('Cambio')).toBeTruthy();
    // Change = 500 - 300 = 200 minor.
    expect(getAllByText(formatMoney(200, 'MXN')).length).toBeGreaterThanOrEqual(1);

    // Section testIDs are derived from the root testID.
    expect(getByTestId('receipt-header')).toBeTruthy();
    expect(getByTestId('receipt-meta')).toBeTruthy();
    expect(getByTestId('receipt-status')).toBeTruthy();
    expect(getByTestId('receipt-items')).toBeTruthy();
    expect(getByTestId('receipt-totals')).toBeTruthy();
    expect(getByTestId('receipt-payments')).toBeTruthy();
  });

  it('shows the refunded banner and status label for a refunded sale', async () => {
    const { getByText, getByTestId } = await renderReceipt({
      ...baseSale,
      status: 'REFUNDED',
      refundedAt: CREATED_AT,
      inventoryRestored: null,
    });

    expect(getByText('Esta venta fue reembolsada')).toBeTruthy();
    expect(getByText('Reembolsada')).toBeTruthy();
    expect(getByTestId('receipt-status-banner')).toBeTruthy();
  });

  it('shows the no-restock banner for a refunded sale that skipped inventory', async () => {
    const { getByText } = await renderReceipt({
      ...baseSale,
      status: 'REFUNDED',
      refundedAt: CREATED_AT,
      inventoryRestored: false,
    });

    expect(getByText('Esta venta fue reembolsada sin devolver el inventario')).toBeTruthy();
  });

  it('does not show a banner for a completed sale', async () => {
    const { queryByText, queryByTestId } = await renderReceipt();

    expect(queryByText('Esta venta fue reembolsada')).toBeNull();
    expect(queryByTestId('receipt-status-banner')).toBeNull();
  });

  it('renders English copy when the active language is en', async () => {
    await i18n.changeLanguage('en');
    const { getByText } = await renderReceipt();

    expect(getByText('Receipt')).toBeTruthy();
    expect(getByText('Sale')).toBeTruthy();
    expect(getByText('Date')).toBeTruthy();
    expect(getByText('Served by')).toBeTruthy();
    expect(getByText('Items')).toBeTruthy();
    expect(getByText('Subtotal')).toBeTruthy();
    expect(getByText('Total')).toBeTruthy();
    expect(getByText('Payments')).toBeTruthy();
  });
});
