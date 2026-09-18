import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ReceiptScreen from '@/app/receipt/[id]';
import { refundSale, refundSaleAuthorized, getSaleById, listPaymentMethods } from '@/db';
import type { PaymentMethod, SaleDetail } from '@/db';
import { verifyManagerAuthorizationPin } from '@/auth';
import { i18n } from '@/i18n';
import { useCartStore } from '@/pos/cart-store';
import { DialogHost, dismissDialog } from '@/dialog';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockUseCan = jest.fn(() => true);

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
  refundSaleAuthorized: jest.fn(),
}));

jest.mock('@/auth', () => ({
  listActiveEmployees: jest.fn(async () => [
    { id: 'emp-1', firstName: 'Ana', lastName: null },
  ]),
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: { id: 'emp-1', firstName: 'Ana', lastName: null, role: 'ADMIN' } }),
  useCan: () => mockUseCan(),
  validatePin: jest.fn(() => null),
  verifyManagerAuthorizationPin: jest.fn(async () => ({ ok: true, adminId: 'admin-1' })),
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
  inventoryRestored: null,
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
const mockRefundSaleAuthorized = refundSaleAuthorized as jest.MockedFunction<
  typeof refundSaleAuthorized
>;
const mockVerifyManagerPin = verifyManagerAuthorizationPin as jest.MockedFunction<
  typeof verifyManagerAuthorizationPin
>;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
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
      expect(mockRefundSale).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'emp-1' }),
        'sale-1',
        expect.objectContaining({ employeeId: 'emp-1', restoreInventory: false }),
      ),
    );
  });

  it('passes restoreInventory: true when the user enables the inventory toggle', async () => {
    const { getByText, getByTestId } = await render(
      <>
        <ReceiptScreen />
        <DialogHost />
      </>,
    );

    await waitFor(() => expect(getByText('Matcha Latte')).toBeTruthy());
    await fireEvent.press(getByText('Reembolsar venta'));
    await waitFor(() => expect(getByText('¿Reembolsar esta venta?')).toBeTruthy());

    await fireEvent(getByTestId('refund-restore-inventory'), 'valueChange', true);
    await fireEvent.press(getByTestId('app-dialog-confirm'));

    await waitFor(() =>
      expect(mockRefundSale).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'emp-1' }),
        'sale-1',
        expect.objectContaining({ employeeId: 'emp-1', restoreInventory: true }),
      ),
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

  it('lets an employee initiate a refund and requires a manager PIN', async () => {
    mockUseCan.mockReturnValue(false);

    const { getByText, getByTestId } = await render(
      <>
        <ReceiptScreen />
        <DialogHost />
      </>,
    );

    await waitFor(() => expect(getByText('Matcha Latte')).toBeTruthy());

    // The refund button is available to employees...
    await fireEvent.press(getByText('Reembolsar venta'));
    await waitFor(() => expect(getByText('¿Reembolsar esta venta?')).toBeTruthy());
    await fireEvent.press(getByTestId('app-dialog-confirm'));

    // ...but the refund only proceeds through the manager PIN sheet.
    await waitFor(() => expect(getByTestId('manager-pin-sheet')).toBeTruthy());
    expect(mockRefundSale).not.toHaveBeenCalled();
    expect(mockRefundSaleAuthorized).not.toHaveBeenCalled();
  });

  it('performs an authorized refund after a valid manager PIN', async () => {
    mockUseCan.mockReturnValue(false);
    mockVerifyManagerPin.mockResolvedValue({ ok: true, adminId: 'admin-1' });

    const { getByText, getByTestId } = await render(
      <>
        <ReceiptScreen />
        <DialogHost />
      </>,
    );

    await waitFor(() => expect(getByText('Matcha Latte')).toBeTruthy());
    await fireEvent.press(getByText('Reembolsar venta'));
    await waitFor(() => expect(getByText('¿Reembolsar esta venta?')).toBeTruthy());
    await fireEvent.press(getByTestId('app-dialog-confirm'));

    await waitFor(() => expect(getByTestId('manager-pin-input')).toBeTruthy());
    await fireEvent.changeText(getByTestId('manager-pin-input'), '1234');
    await fireEvent.press(getByTestId('manager-pin-submit'));

    await waitFor(() =>
      expect(mockRefundSaleAuthorized).toHaveBeenCalledWith('admin-1', 'sale-1', {
        employeeId: 'emp-1',
        restoreInventory: false,
      }),
    );
  });
});
