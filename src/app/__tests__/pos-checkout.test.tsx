import { fireEvent, render, waitFor } from '@testing-library/react-native';

import PosScreen from '@/app/(tabs)/pos';
import { checkoutSale, createHeldSale, ensureDefaultPaymentMethods, getSaleById, listSales } from '@/db';
import type { PaymentMethod, Sale, SaleDetail } from '@/db';
import { i18n } from '@/i18n';
import { useCartStore } from '@/pos/cart-store';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: jest.fn(),
    navigate: jest.fn(),
    back: jest.fn(),
  },
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(callback, [callback]);
  },
}));

jest.mock('@/db', () => ({
  addSaleItem: jest.fn(),
  cancelSale: jest.fn(async () => {}),
  checkoutSale: jest.fn(),
  completeSale: jest.fn(),
  createHeldSale: jest.fn(),
  getSaleById: jest.fn(),
  removeSaleItem: jest.fn(),
  updateSaleItemQuantity: jest.fn(),
  ensureDefaultPaymentMethods: jest.fn(),
  expireStaleHeldSales: jest.fn(async () => 0),
  listSales: jest.fn(),
}));

jest.mock('@/auth', () => ({
  listActiveEmployees: jest.fn(async () => []),
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: { id: 'emp-1', firstName: 'Ana', lastName: null, role: 'ADMIN' } }),
}));

const mockCatalog = {
  products: [
    {
      id: 'p1',
      businessId: 'biz-1',
      categoryId: null,
      name: 'Matcha Latte',
      description: null,
      imageUri: null,
      sku: null,
      barcode: null,
      priceMinor: 1250,
      inventoryItemId: null,
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      archivedAt: null,
    },
  ],
  categories: [],
  recipeProductIds: new Set<string>(),
  productCostMinor: new Map<string, number>([['p1', 400]]),
  currency: 'MXN',
  loading: false,
  loadFailed: false,
  reload: jest.fn(async () => {}),
};

jest.mock('@/hooks/use-catalog', () => ({
  useCatalog: () => mockCatalog,
}));

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

jest.mock('expo-image', () => ({ Image: () => null }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const cash: PaymentMethod = {
  id: 'pm-cash',
  businessId: 'biz-1',
  name: 'Efectivo',
  type: 'CASH',
  isDefault: true,
  isActive: true,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const completedSale: SaleDetail = {
  id: 'sale-1',
  businessId: 'biz-1',
  saleNumber: 'S-000001',
  status: 'COMPLETED',
  subtotalMinor: 1250,
  discountMinor: 0,
  taxMinor: 0,
  totalMinor: 1250,
  employeeId: 'emp-1',
  notes: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T00:00:00.000Z',
  cancelledAt: null,
  refundedAt: null,
  items: [
    {
      id: 'si-1',
      saleId: 'sale-1',
      productId: 'p1',
      productName: 'Matcha Latte',
      quantity: 1000,
      unitPriceMinor: 1250,
      discountMinor: 0,
      subtotalMinor: 1250,
      unitCostMinor: 400,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  payments: [
    {
      id: 'pay-1',
      businessId: 'biz-1',
      saleId: 'sale-1',
      paymentMethodId: 'pm-cash',
      amountMinor: 1250,
      amountGivenMinor: null,
      reference: null,
      notes: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

const heldSale: Sale = {
  id: 'sale-1',
  businessId: 'biz-1',
  saleNumber: 'S-000001',
  status: 'HELD',
  subtotalMinor: 1250,
  discountMinor: 0,
  taxMinor: 0,
  totalMinor: 1250,
  employeeId: 'emp-1',
  notes: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  completedAt: null,
  cancelledAt: null,
  refundedAt: null,
};

const heldDetail: SaleDetail = { ...heldSale, items: completedSale.items, payments: [] };

const mockCheckoutSale = checkoutSale as jest.MockedFunction<typeof checkoutSale>;
const mockEnsureMethods = ensureDefaultPaymentMethods as jest.MockedFunction<
  typeof ensureDefaultPaymentMethods
>;
const mockListSales = listSales as jest.MockedFunction<typeof listSales>;
const mockCreateHeldSale = createHeldSale as jest.MockedFunction<typeof createHeldSale>;
const mockGetSaleById = getSaleById as jest.MockedFunction<typeof getSaleById>;

beforeEach(() => {
  jest.clearAllMocks();
  useCartStore.getState().reset();
  mockEnsureMethods.mockResolvedValue([cash]);
  mockListSales.mockResolvedValue({ items: [], nextCursor: null });
  mockCheckoutSale.mockResolvedValue(completedSale);
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('POS checkout flow', () => {
  it('adds a product, opens the cart and payment sheets, and charges a sale', async () => {
    const { getByTestId, getByText } = await render(<PosScreen />);

    await waitFor(() => expect(getByText('Matcha Latte')).toBeTruthy());

    await fireEvent.press(getByTestId('product-card-p1'));

    await waitFor(() => expect(getByTestId('pos-cart-bar')).toBeTruthy());
    await fireEvent.press(getByTestId('pos-cart-bar'));

    await waitFor(() => expect(getByTestId('cart-sheet')).toBeTruthy());
    await fireEvent.press(getByText('Cobrar'));

    await waitFor(() => expect(getByText('Agregar método de pago')).toBeTruthy());
    await fireEvent.press(getByText('Agregar método de pago'));
    await fireEvent.press(getByText('Efectivo'));
    await waitFor(() => expect(getByTestId('payment-amount-pm-cash')).toBeTruthy());
    await fireEvent.changeText(getByTestId('payment-amount-pm-cash'), '12.50');
    await fireEvent.press(getByText('Confirmar cobro'));

    await waitFor(() =>
      expect(mockCheckoutSale).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp-1',
          payments: [{ paymentMethodId: 'pm-cash', amountMinor: 1250 }],
          items: [
            expect.objectContaining({
              productId: 'p1',
              productName: 'Matcha Latte',
              quantity: 1000,
              unitPriceMinor: 1250,
              unitCostMinor: 400,
            }),
          ],
        }),
      ),
    );

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/receipt/[id]',
        params: { id: 'sale-1' },
      }),
    );
  });
});

describe('POS held-cart flow', () => {
  it('holds the active cart and resumes it from the held list', async () => {
    mockCreateHeldSale.mockResolvedValue(heldSale);
    mockListSales
      .mockResolvedValueOnce({ items: [], nextCursor: null })
      .mockResolvedValue({ items: [heldSale], nextCursor: null });
    mockGetSaleById.mockResolvedValue(heldDetail);

    const { getByTestId, getByText, queryByTestId } = await render(<PosScreen />);

    await waitFor(() => expect(getByText('Matcha Latte')).toBeTruthy());
    await fireEvent.press(getByTestId('product-card-p1'));
    await waitFor(() => expect(getByTestId('pos-cart-bar')).toBeTruthy());
    await fireEvent.press(getByTestId('pos-cart-bar'));
    await waitFor(() => expect(getByTestId('cart-sheet')).toBeTruthy());

    await fireEvent.press(getByText('Poner en espera'));
    await waitFor(() => expect(mockCreateHeldSale).toHaveBeenCalled());

    // The cart closes and the held counter appears with a change pulse.
    await waitFor(() => expect(queryByTestId('cart-sheet')).toBeNull());
    await waitFor(() => expect(getByTestId('pos-held-button')).toBeTruthy());
    expect(getByTestId('pos-held-pulse')).toBeTruthy();

    await fireEvent.press(getByTestId('pos-held-button'));
    await waitFor(() => expect(getByTestId('held-sale-sale-1')).toBeTruthy());
    await fireEvent.press(getByTestId('held-sale-sale-1'));

    await waitFor(() => expect(useCartStore.getState().saleId).toBe('sale-1'));
    expect(useCartStore.getState().lines).toHaveLength(1);
  });
});
