import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ReceiptScreen from '@/app/receipt/[id]';
import { refundSale, getSaleById, listPaymentMethods } from '@/db';
import type { PaymentMethod, SaleDetail } from '@/db';
import { i18n } from '@/i18n';
import { useCartStore } from '@/pos/cart-store';
import { DialogHost, dismissDialog } from '@/dialog';

const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: (...args: unknown[]) => mockReplace(...args),
    navigate: jest.fn(),
    back: (...args: unknown[]) => mockBack(...args),
  },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 'sale-1' }),
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
  getBusinessProfile: jest.fn(),
  listPaymentMethods: jest.fn(),
  refundSale: jest.fn(),
}));

jest.mock('@/auth', () => ({
  listActiveEmployees: jest.fn(async () => [
    { id: 'emp-1', firstName: 'Ana', lastName: null },
  ]),
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: { id: 'emp-1', firstName: 'Ana', lastName: null, role: 'ADMIN' } }),
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
      amountGivenMinor: 2000,
      reference: null,
      notes: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

const mockGetSaleById = getSaleById as jest.MockedFunction<typeof getSaleById>;
const mockListPaymentMethods = listPaymentMethods as jest.MockedFunction<typeof listPaymentMethods>;
const mockRefundSale = refundSale as jest.MockedFunction<typeof refundSale>;

beforeEach(() => {
  jest.clearAllMocks();
  dismissDialog();
  useCartStore.getState().reset();
  mockListPaymentMethods.mockResolvedValue([cash]);
  mockGetSaleById.mockResolvedValue(completedSale);
  mockRefundSale.mockResolvedValue(undefined);
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('ReceiptScreen', () => {
  it('renders the receipt and refunds a completed sale after confirmation', async () => {
    const { getByText, getByTestId } = await render(
      <>
        <ReceiptScreen />
        <DialogHost />
      </>,
    );

    await waitFor(() => expect(getByText('Matcha Latte')).toBeTruthy());
    expect(getByText('S-000001')).toBeTruthy();

    await fireEvent.press(getByText('Reembolsar venta'));

    await waitFor(() => expect(getByText('¿Reembolsar esta venta?')).toBeTruthy());
    await fireEvent.press(getByTestId('app-dialog-confirm'));

    await waitFor(() =>
      expect(mockRefundSale).toHaveBeenCalledWith('sale-1', { employeeId: 'emp-1' }),
    );
  });

  it('resumes a held sale from the receipt', async () => {
    mockGetSaleById.mockResolvedValue({ ...completedSale, status: 'HELD' });

    const { getByText } = await render(<ReceiptScreen />);

    await waitFor(() => expect(getByText('Retomar')).toBeTruthy());
    await fireEvent.press(getByText('Retomar'));

    await waitFor(() => expect(useCartStore.getState().saleId).toBe('sale-1'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
