/**
 * Ingredients management list test: rows render name + formatted quantity +
 * unit symbol, search filters by name, and the empty state offers the create
 * action. expo-router is mocked so `useFocusEffect` runs the load callback on
 * mount (mirroring src/app/__tests__/pos.test.tsx), and `@/db` is mocked so no
 * native SQLite runs.
 */

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import IngredientsScreen from '@/app/ingredients/index';
import { ensureDefaultUnits, listInventoryItems, listUnits, type InventoryItem, type Unit } from '@/db';
import { i18n } from '@/i18n';

// Admin session: the create affordances are visible (employee gating is
// covered by the permissions unit tests and the inventory/receipt screens).
jest.mock('@/auth', () => ({ useCan: () => true }));

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
  listInventoryItems: jest.fn(),
  listUnits: jest.fn(),
}));

const mockUnits: Unit[] = [
  {
    id: 'unit-kg',
    businessId: 'biz-1',
    name: 'Kilogramo',
    symbol: 'kg',
    type: 'weight',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'unit-l',
    businessId: 'biz-1',
    name: 'Litro',
    symbol: 'l',
    type: 'volume',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const mockItems: InventoryItem[] = [
  {
    id: 'inv-1',
    businessId: 'biz-1',
    name: 'Matcha',
    description: null,
    imageUri: null,
    unitId: 'unit-kg',
    currentQuantity: 1500,
    minimumQuantity: 0,
    unitCostMinor: 0,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    archivedAt: null,
  },
  {
    id: 'inv-2',
    businessId: 'biz-1',
    name: 'Leche',
    description: null,
    imageUri: null,
    unitId: 'unit-l',
    currentQuantity: 2000,
    minimumQuantity: 0,
    unitCostMinor: 0,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    archivedAt: null,
  },
];

beforeEach(() => {
  jest.mocked(ensureDefaultUnits).mockResolvedValue(mockUnits);
  jest.mocked(listInventoryItems).mockResolvedValue(mockItems);
  jest.mocked(listUnits).mockResolvedValue(mockUnits);
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('IngredientsScreen', () => {
  it('renders each ingredient with its formatted quantity and unit symbol', async () => {
    const { getByText } = await render(<IngredientsScreen />);

    await waitFor(() => expect(getByText('Matcha')).toBeTruthy());
    expect(getByText('1.5 kg')).toBeTruthy();
    expect(getByText('Leche')).toBeTruthy();
    expect(getByText('2 l')).toBeTruthy();
  });

  it('filters ingredients by name as the user searches', async () => {
    const { getByTestId, getByText, queryByText } = await render(<IngredientsScreen />);

    await waitFor(() => expect(getByText('Matcha')).toBeTruthy());

    await fireEvent.changeText(getByTestId('ingredients-search'), 'match');

    expect(getByText('Matcha')).toBeTruthy();
    expect(queryByText('Leche')).toBeNull();
  });

  it('shows the empty state with the add action when there are no ingredients', async () => {
    jest.mocked(listInventoryItems).mockResolvedValue([]);

    const { getByText } = await render(<IngredientsScreen />);

    await waitFor(() => expect(getByText('Aún no hay ingredientes')).toBeTruthy());
    expect(getByText('Agregar ingrediente')).toBeTruthy();
  });
});
