import { render, waitFor } from '@testing-library/react-native';

import PosScreen from '@/app/(tabs)/pos';
import { ensureDefaultPaymentMethods, listSales } from '@/db';
import { i18n } from '@/i18n';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 1024, height: 768, scale: 2, fontScale: 2 }),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
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
  useCan: () => true,
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
  productCostMinor: new Map<string, number>(),
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

const mockEnsureMethods = ensureDefaultPaymentMethods as jest.MockedFunction<
  typeof ensureDefaultPaymentMethods
>;
const mockListSales = listSales as jest.MockedFunction<typeof listSales>;

beforeEach(() => {
  jest.clearAllMocks();
  mockEnsureMethods.mockResolvedValue([]);
  mockListSales.mockResolvedValue({ items: [], nextCursor: null });
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('POS tablet split view', () => {
  it('renders the catalog and the pinned cart pane without the mobile cart bar', async () => {
    const { getByTestId, getByText, queryByTestId } = await render(<PosScreen />);

    await waitFor(() => expect(getByText('Matcha Latte')).toBeTruthy());

    // The cart pane is always present on tablet; the mobile cart bar/sheet are not.
    expect(getByTestId('cart-panel')).toBeTruthy();
    expect(queryByTestId('pos-cart-bar')).toBeNull();
    expect(queryByTestId('cart-sheet')).toBeNull();
  });
});
