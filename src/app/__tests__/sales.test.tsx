import { fireEvent, render, waitFor } from '@testing-library/react-native';

import SalesScreen from '@/app/(tabs)/sales';
import { listActiveEmployees } from '@/auth';
import type { PublicEmployee } from '@/auth';
import { getBusinessProfile, getSalesTotals, listPaymentMethods, listSales } from '@/db';
import type { PaymentMethod, Sale } from '@/db';
import { i18n } from '@/i18n';
import { formatMoney } from '@/i18n/format';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    navigate: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(callback, [callback]);
  },
}));

jest.mock('@/db', () => ({
  getBusinessProfile: jest.fn(),
  getSalesTotals: jest.fn(),
  listSales: jest.fn(),
  listPaymentMethods: jest.fn(),
}));

jest.mock('@/auth', () => ({
  listActiveEmployees: jest.fn(),
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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const sale = (overrides: Partial<Sale> = {}): Sale => ({
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
  ...overrides,
});

const paymentMethod = (overrides: Partial<PaymentMethod> = {}): PaymentMethod => ({
  id: 'pm-cash',
  businessId: 'biz-1',
  name: 'Efectivo',
  type: 'CASH',
  isDefault: true,
  isActive: true,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const employee = (overrides: Partial<PublicEmployee> = {}): PublicEmployee => ({
  id: 'emp-1',
  businessId: 'biz-1',
  firstName: 'Ana',
  lastName: 'López',
  username: 'ana',
  role: 'ADMIN',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const mockListSales = listSales as jest.MockedFunction<typeof listSales>;
const mockGetSalesTotals = getSalesTotals as jest.MockedFunction<typeof getSalesTotals>;
const mockGetProfile = getBusinessProfile as jest.MockedFunction<typeof getBusinessProfile>;
const mockListPaymentMethods = listPaymentMethods as jest.MockedFunction<typeof listPaymentMethods>;
const mockListEmployees = listActiveEmployees as jest.MockedFunction<typeof listActiveEmployees>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetProfile.mockResolvedValue({ currencyCode: 'MXN' } as Awaited<
    ReturnType<typeof getBusinessProfile>
  >);
  mockListSales.mockResolvedValue({
    items: [sale(), sale({ id: 'sale-2', saleNumber: 'S-000002', status: 'REFUNDED' })],
    nextCursor: null,
  });
  mockGetSalesTotals.mockResolvedValue({ count: 2, totalMinor: 2500 });
  mockListPaymentMethods.mockResolvedValue([paymentMethod()]);
  mockListEmployees.mockResolvedValue([employee()]);
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('SalesScreen', () => {
  it('lists sales with status labels and opens the receipt', async () => {
    const { getByTestId, getByText } = await render(<SalesScreen />);

    await waitFor(() => expect(getByText('S-000001')).toBeTruthy());
    expect(getByText('S-000002')).toBeTruthy();
    expect(getByText('Completada')).toBeTruthy();
    expect(getByText('Reembolsada')).toBeTruthy();

    await fireEvent.press(getByTestId('sale-row-sale-1'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/receipt/[id]',
      params: { id: 'sale-1' },
    });
  });

  it('refetches with a status filter when a chip is selected', async () => {
    const { getByTestId } = await render(<SalesScreen />);

    await waitFor(() => expect(mockListSales).toHaveBeenCalledWith({}));

    await fireEvent.press(getByTestId('sales-filter-REFUNDED'));

    await waitFor(() => expect(mockListSales).toHaveBeenCalledWith({ status: 'REFUNDED' }));
  });

  it('refetches with a local date range when a date chip is selected', async () => {
    const { getByTestId } = await render(<SalesScreen />);

    await waitFor(() => expect(mockListSales).toHaveBeenCalledWith({}));

    await fireEvent.press(getByTestId('sales-date-today'));

    await waitFor(() =>
      expect(mockListSales).toHaveBeenCalledWith(
        expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
      ),
    );
  });

  it('refetches with a payment method filter when one is selected', async () => {
    const { getByTestId, getByText } = await render(<SalesScreen />);

    await waitFor(() => expect(mockListSales).toHaveBeenCalledWith({}));

    await fireEvent.press(getByTestId('sales-method-trigger'));
    expect(getByText('Efectivo')).toBeTruthy();

    await fireEvent.press(getByTestId('sales-method-pm-cash'));

    await waitFor(() =>
      expect(mockListSales).toHaveBeenCalledWith(
        expect.objectContaining({ paymentMethodId: 'pm-cash' }),
      ),
    );
  });

  it('shows the filtered sales count and total summary', async () => {
    const { getByTestId, getByText } = await render(<SalesScreen />);

    await waitFor(() => expect(getByTestId('sales-summary-total')).toBeTruthy());
    expect(getByText('2 ventas')).toBeTruthy();
    expect(getByTestId('sales-summary-total').props.children).toBe(formatMoney(2500, 'MXN'));
  });

  it('filters both the list and the summary by employee', async () => {
    const { getByTestId, getByText } = await render(<SalesScreen />);

    await waitFor(() => expect(mockListSales).toHaveBeenCalledWith({}));

    await fireEvent.press(getByTestId('sales-employee-trigger'));
    expect(getByText('Ana López')).toBeTruthy();

    await fireEvent.press(getByTestId('sales-employee-emp-1'));

    await waitFor(() =>
      expect(mockListSales).toHaveBeenCalledWith(
        expect.objectContaining({ employeeId: 'emp-1' }),
      ),
    );
    expect(mockGetSalesTotals).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 'emp-1' }),
    );
  });
});
