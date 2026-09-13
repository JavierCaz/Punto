import { fireEvent, render, waitFor } from '@testing-library/react-native';

import SalesScreen from '@/app/(tabs)/sales';
import { getBusinessProfile, listSales } from '@/db';
import type { Sale } from '@/db';
import { i18n } from '@/i18n';

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
  listSales: jest.fn(),
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

const mockListSales = listSales as jest.MockedFunction<typeof listSales>;
const mockGetProfile = getBusinessProfile as jest.MockedFunction<typeof getBusinessProfile>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetProfile.mockResolvedValue({ currencyCode: 'MXN' } as Awaited<
    ReturnType<typeof getBusinessProfile>
  >);
  mockListSales.mockResolvedValue({
    items: [sale(), sale({ id: 'sale-2', saleNumber: 'S-000002', status: 'REFUNDED' })],
    nextCursor: null,
  });
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
});
