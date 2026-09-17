/**
 * Dashboard component tests — the milestone acceptance path:
 * a day with MIXED sales / expenses / refunds renders the correct NET figure,
 * surfaces an actionable low-stock problem with a route to fix it, and formats
 * money through the locale-aware helpers in es + en.
 *
 * The database and the victory-native charts are mocked so the screen renders
 * offline without native modules.
 */

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import DashboardScreen from '@/app/(tabs)/index';
import { listActiveEmployees, type PublicEmployee } from '@/auth';
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
  type InventoryItem,
} from '@/db';
import { i18n } from '@/i18n';
import { formatMoney } from '@/i18n/format';
import { periodRange } from '@/lib/dashboard';

const mockNavigate = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    navigate: (...args: unknown[]) => mockNavigate(...args),
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
  getCompletedSalesTotals: jest.fn(),
  getRefundedSalesTotals: jest.fn(),
  getFinancialTotals: jest.fn(),
  getPurchaseExpenseTotal: jest.fn(),
  listCompletedSalesInRange: jest.fn(),
  listTopProducts: jest.fn(),
  listLowStockItems: jest.fn(),
  countHeldSales: jest.fn(),
  expireStaleHeldSales: jest.fn(),
  HELD_SALE_TTL_HOURS: 24,
}));

// The dashboard shows the employee filter only for an ADMIN; report scoping is
// driven by the selected employee id.
jest.mock('@/auth', () => ({
  listActiveEmployees: jest.fn(),
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: { id: 'emp-1', firstName: 'Ana', lastName: 'López', role: 'ADMIN' } }),
}));

// victory-native + Skia are native; the charts are not under test here.
jest.mock('@/components/charts/income-trend-chart', () => ({ IncomeTrendChart: () => null }));
jest.mock('@/components/charts/top-products-chart', () => ({ TopProductsChart: () => null }));

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

const inventoryItem = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
  id: 'inv-1',
  businessId: 'biz-1',
  name: 'Matcha en polvo',
  description: null,
  imageUri: null,
  unitId: 'unit-g',
  currentQuantity: 200,
  minimumQuantity: 1000,
  unitCostMinor: 500,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
  ...overrides,
});

const mockCompletedTotals = getCompletedSalesTotals as jest.MockedFunction<
  typeof getCompletedSalesTotals
>;
const mockRefundedTotals = getRefundedSalesTotals as jest.MockedFunction<
  typeof getRefundedSalesTotals
>;
const mockFinancialTotals = getFinancialTotals as jest.MockedFunction<typeof getFinancialTotals>;
const mockPurchaseExpense = getPurchaseExpenseTotal as jest.MockedFunction<
  typeof getPurchaseExpenseTotal
>;
const mockCompletedSales = listCompletedSalesInRange as jest.MockedFunction<
  typeof listCompletedSalesInRange
>;
const mockTopProducts = listTopProducts as jest.MockedFunction<typeof listTopProducts>;
const mockLowStock = listLowStockItems as jest.MockedFunction<typeof listLowStockItems>;
const mockHeld = countHeldSales as jest.MockedFunction<typeof countHeldSales>;
const mockExpireHeld = expireStaleHeldSales as jest.MockedFunction<typeof expireStaleHeldSales>;
const mockProfile = getBusinessProfile as jest.MockedFunction<typeof getBusinessProfile>;
const mockListEmployees = listActiveEmployees as jest.MockedFunction<typeof listActiveEmployees>;

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

/** Mixed day: 1000.00 sales, 200.00 refund, 150.00 manual expense, 300.00 purchase, 50.00 other income. */
const NET_MINOR = 100000 + 5000 - 20000 - 15000 - 30000; // 40000

beforeEach(() => {
  jest.clearAllMocks();
  mockExpireHeld.mockResolvedValue(0);

  mockCompletedTotals.mockResolvedValue({ totalMinor: 100000, count: 2 });
  mockRefundedTotals.mockResolvedValue({ totalMinor: 20000, count: 1 });
  mockFinancialTotals.mockResolvedValue({ incomeMinor: 5000, expenseMinor: 15000 });
  mockPurchaseExpense.mockResolvedValue(30000);
  mockCompletedSales.mockResolvedValue([
    { completedAt: '2026-09-08T15:00:00.000Z', totalMinor: 60000 },
    { completedAt: '2026-09-08T18:00:00.000Z', totalMinor: 40000 },
  ]);
  mockTopProducts.mockResolvedValue([
    { name: 'Matcha Latte', revenueMinor: 60000, quantityMilli: 3000 },
  ]);
  mockLowStock.mockResolvedValue([inventoryItem()]);
  mockHeld.mockResolvedValue(1);
  mockProfile.mockResolvedValue({ currencyCode: 'MXN' } as Awaited<
    ReturnType<typeof getBusinessProfile>
  >);
  mockListEmployees.mockResolvedValue([employee()]);
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('DashboardScreen', () => {
  it('shows the correct net cash flow for a day with mixed sales, expenses and refunds', async () => {
    const { getByTestId, getByText } = await render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('dashboard-net')).toBeTruthy());

    expect(getByTestId('dashboard-net').props.children).toBe(formatMoney(NET_MINOR, 'MXN'));
    expect(getByText('Flujo neto · Hoy')).toBeTruthy();
    // The breakdown keeps every component visible so a big purchase day is explainable.
    expect(getByText('Ventas')).toBeTruthy();
    expect(getByText('Compras')).toBeTruthy();
    expect(getByText('Reembolsos')).toBeTruthy();
    expect(getByText('Gastos manuales')).toBeTruthy();
  });

  it('surfaces low stock and routes to the inventory screen to fix it', async () => {
    const { getByTestId, getByText } = await render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('dashboard-low-stock')).toBeTruthy());
    expect(getByText('Stock bajo')).toBeTruthy();

    fireEvent.press(getByTestId('dashboard-low-stock'));
    expect(mockNavigate).toHaveBeenCalledWith('/inventory');
  });

  it('surfaces held carts and routes to the point of sale', async () => {
    const { getByTestId, getByText } = await render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('dashboard-held-sales')).toBeTruthy());
    expect(getByText('Ventas en espera')).toBeTruthy();
    // The bound is communicated so the owner knows stale carts won't linger.
    expect(getByText('Los carritos sin cobrar se cancelan después de 24 h.')).toBeTruthy();
    // Stale held carts are abandoned on every dashboard load.
    expect(mockExpireHeld).toHaveBeenCalled();

    fireEvent.press(getByTestId('dashboard-held-sales'));
    expect(mockNavigate).toHaveBeenCalledWith('/pos');
  });

  it('localizes labels and formats money in English', async () => {
    await i18n.changeLanguage('en');

    const { getByTestId, getByText } = await render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('dashboard-net')).toBeTruthy());

    expect(getByText('Net cash flow · Today')).toBeTruthy();
    expect(getByTestId('dashboard-net').props.children).toBe(formatMoney(NET_MINOR, 'MXN'));
    expect(getByTestId('dashboard-net').props.children).toContain('$');
  });

  it('rescopes the cash flow and trend to the selected period', async () => {
    const { getByTestId, getByText } = await render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('dashboard-net')).toBeTruthy());
    expect(getByText('Flujo neto · Hoy')).toBeTruthy();

    mockCompletedTotals.mockClear();
    mockCompletedSales.mockClear();

    await fireEvent.press(getByTestId('dashboard-period-month'));

    await waitFor(() => expect(mockCompletedTotals).toHaveBeenCalled());
    expect(mockCompletedTotals).toHaveBeenCalledWith(
      expect.objectContaining({ from: periodRange('month').from, to: periodRange('month').to }),
    );
    expect(mockCompletedSales).toHaveBeenCalledWith(
      expect.objectContaining({ from: periodRange('month').from }),
    );
    expect(getByText('Flujo neto · Mes')).toBeTruthy();
  });

  it('scopes the sales report to the selected employee while net stays business-wide', async () => {
    mockCompletedTotals.mockImplementation(async (range) =>
      range.employeeId
        ? { totalMinor: 30000, count: 1 }
        : { totalMinor: 100000, count: 2 },
    );

    const { getByTestId, getByText } = await render(<DashboardScreen />);

    await waitFor(() => expect(getByTestId('dashboard-net')).toBeTruthy());

    await fireEvent.press(getByTestId('dashboard-employee-trigger'));
    await fireEvent.press(getByTestId('dashboard-employee-emp-1'));

    await waitFor(() =>
      expect(mockCompletedTotals).toHaveBeenCalledWith(
        expect.objectContaining({ employeeId: 'emp-1' }),
      ),
    );

    // The sales report follows the employee…
    await waitFor(() =>
      expect(getByTestId('dashboard-report-total').props.children).toBe(
        formatMoney(30000, 'MXN'),
      ),
    );
    expect(getByTestId('dashboard-report-scope').props.children).toBe('Ana López');

    // …while net cash flow stays the business-wide figure and is labelled so.
    expect(getByTestId('dashboard-net').props.children).toBe(formatMoney(NET_MINOR, 'MXN'));
    expect(getByText('Flujo neto · Hoy · Negocio')).toBeTruthy();
  });
});
