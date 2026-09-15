/**
 * Stock overview screen (`(tabs)/inventory`) test: current quantities render with
 * the amber low-stock / red out-of-stock badges, and — Milestone 6 — the badge
 * appears automatically once simulated sales drain stock below its threshold.
 *
 * expo-router and the '@/db' barrel are mocked so the screen renders offline
 * without SQLite; `getStockStatus` is the real pure helper, so this exercises
 * the same threshold logic the app ships.
 */

import { render, waitFor } from '@testing-library/react-native';

import InventoryScreen from '@/app/(tabs)/inventory';
import { ensureDefaultUnits, listInventoryItems, listUnits, type InventoryItem, type Unit } from '@/db';
import { i18n } from '@/i18n';

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

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    router: { push: jest.fn() },
    // Run the focus callback after mount so the async load settles.
    useFocusEffect: (callback: () => void) => React.useEffect(callback, [callback]),
    Stack: { Screen: () => null },
  };
});

jest.mock('@/db', () => ({
  ensureDefaultUnits: jest.fn(),
  // Real threshold logic — the screen must badge from the shipped helper.
  getStockStatus: jest.requireActual('@/db/repositories/calc').getStockStatus,
  listInventoryItems: jest.fn(),
  listUnits: jest.fn(),
}));

const unit: Unit = {
  id: 'unit-g',
  businessId: 'biz-1',
  name: 'gramo',
  symbol: 'g',
  type: 'weight',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

function makeItem(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: 'inv-1',
    businessId: 'biz-1',
    name: 'Matcha',
    description: null,
    imageUri: null,
    unitId: 'unit-g',
    currentQuantity: 1000,
    minimumQuantity: 0,
    unitCostMinor: 0,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    archivedAt: null,
    ...overrides,
  };
}

/** Mutable "database" the mocked loader reads from, so a sale can drain it. */
let currentItems: InventoryItem[] = [];

beforeEach(() => {
  currentItems = [];
  jest.mocked(ensureDefaultUnits).mockResolvedValue([unit]);
  jest.mocked(listInventoryItems).mockImplementation(async () => currentItems);
  jest.mocked(listUnits).mockResolvedValue([unit]);
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('InventoryScreen', () => {
  it('renders current quantities with amber low-stock and red out-of-stock badges', async () => {
    currentItems = [
      makeItem({ id: 'inv-ok', name: 'Matcha', currentQuantity: 2000, minimumQuantity: 500 }),
      makeItem({ id: 'inv-low', name: 'Leche', currentQuantity: 400, minimumQuantity: 500 }),
      makeItem({ id: 'inv-out', name: 'Azúcar', currentQuantity: 0, minimumQuantity: 500 }),
    ];

    const { getByText } = await render(<InventoryScreen />);

    await waitFor(() => expect(getByText('Matcha')).toBeTruthy());
    expect(getByText('2 g')).toBeTruthy();
    expect(getByText('0.4 g')).toBeTruthy();
    expect(getByText('0 g')).toBeTruthy();
    // Exactly one item sits below its threshold and exactly one is empty.
    expect(getByText('Stock bajo')).toBeTruthy();
    expect(getByText('Sin stock')).toBeTruthy();
  });

  it('does not badge an item whose threshold is 0 (warnings disabled)', async () => {
    currentItems = [makeItem({ currentQuantity: 1, minimumQuantity: 0 })];

    const { getByText, queryByText } = await render(<InventoryScreen />);

    await waitFor(() => expect(getByText('Matcha')).toBeTruthy());
    expect(queryByText('Stock bajo')).toBeNull();
    expect(queryByText('Sin stock')).toBeNull();
  });

  it('shows the low-stock badge automatically after simulated sales drain stock', async () => {
    // Healthy: 1 unit in stock, threshold 0.5.
    currentItems = [makeItem({ currentQuantity: 1000, minimumQuantity: 500 })];
    const healthy = await render(<InventoryScreen />);
    await waitFor(() => expect(healthy.getByText('1 g')).toBeTruthy());
    expect(healthy.queryByText('Stock bajo')).toBeNull();
    expect(healthy.queryByText('Sin stock')).toBeNull();
    await healthy.unmount();

    // A sale consumes 0.6 → 0.4 left, at/below the 0.5 threshold → amber.
    currentItems = [makeItem({ currentQuantity: 400, minimumQuantity: 500 })];
    const low = await render(<InventoryScreen />);
    await waitFor(() => expect(low.getByText('Stock bajo')).toBeTruthy());
    await low.unmount();

    // The next sale empties it → red.
    currentItems = [makeItem({ currentQuantity: 0, minimumQuantity: 500 })];
    const out = await render(<InventoryScreen />);
    await waitFor(() => expect(out.getByText('Sin stock')).toBeTruthy());
  });
});
