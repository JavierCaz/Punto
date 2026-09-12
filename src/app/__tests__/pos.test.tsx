/**
 * POS screen test: the tab must render the live catalog (regression — products
 * added from the catalog screens were previously invisible in the POS view).
 */

import { render, waitFor } from '@testing-library/react-native';

import PosScreen from '@/app/(tabs)/index';
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

jest.mock('expo-image', () => ({ Image: () => null }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: jest.fn(),
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
  currency: 'MXN',
  loading: false,
  loadFailed: false,
  reload: jest.fn(async () => {}),
};

const defaultProducts = mockCatalog.products;

jest.mock('@/hooks/use-catalog', () => ({
  useCatalog: () => mockCatalog,
}));

beforeEach(() => {
  mockCatalog.products = defaultProducts;
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('PosScreen', () => {
  it('renders catalog products', async () => {
    const { getByText } = await render(<PosScreen />);

    await waitFor(() => expect(getByText('Matcha Latte')).toBeTruthy());
    expect(getByText('Sin categoría')).toBeTruthy();
  });

  it('shows the empty state without an add-product action', async () => {
    mockCatalog.products = [];
    const { getByText, queryByText } = await render(<PosScreen />);

    expect(getByText('Tu catálogo aún está vacío')).toBeTruthy();
    expect(queryByText('Agregar producto')).toBeNull();
  });
});
