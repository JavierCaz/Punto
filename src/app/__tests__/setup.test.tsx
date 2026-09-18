/**
 * Component tests for the guided setup route group: each data step persists
 * entries, supports editing/removing them, advances/skips, and the finish step
 * closes the wizard.
 *
 * `@/db`, `@/lib/catalog-save`, `@/dialog` and all native modules are mocked so
 * the screens render without SQLite, a router or a photo picker.
 */

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import SetupFinishScreen from '@/app/setup/finish';
import SetupProductsScreen from '@/app/setup/products';
import SetupSuppliersScreen from '@/app/setup/suppliers';
import { i18n } from '@/i18n';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockShowConfirm = jest.fn();
const mockShowMessage = jest.fn();
const mockCompleteSetup = jest.fn();
const mockListSuppliers = jest.fn();
const mockListCategories = jest.fn();
const mockListInventoryItems = jest.fn();
const mockListProducts = jest.fn();
const mockGetBusinessProfile = jest.fn();
const mockGetRecipeByProductId = jest.fn();
const mockCreateSupplier = jest.fn();
const mockUpdateSupplier = jest.fn();
const mockArchiveSupplier = jest.fn();
const mockSaveProduct = jest.fn();
const mockResolveSupplierForItem = jest.fn();

jest.mock('@/db', () => ({
  REPO_ERROR: { DUPLICATE: 'REPO_DUPLICATE' },
  isRepoError: (error: unknown, code: string) => (error as { code?: string } | null)?.code === code,
  listSuppliers: (...args: unknown[]) => mockListSuppliers(...args),
  listCategories: (...args: unknown[]) => mockListCategories(...args),
  listInventoryItems: (...args: unknown[]) => mockListInventoryItems(...args),
  listProducts: (...args: unknown[]) => mockListProducts(...args),
  getBusinessProfile: (...args: unknown[]) => mockGetBusinessProfile(...args),
  getRecipeByProductId: (...args: unknown[]) => mockGetRecipeByProductId(...args),
  createSupplier: (...args: unknown[]) => mockCreateSupplier(...args),
  updateSupplier: (...args: unknown[]) => mockUpdateSupplier(...args),
  archiveSupplier: (...args: unknown[]) => mockArchiveSupplier(...args),
}));

jest.mock('@/lib/catalog-save', () => ({
  saveProduct: (...args: unknown[]) => mockSaveProduct(...args),
  resolveSupplierForItem: (...args: unknown[]) => mockResolveSupplierForItem(...args),
}));

jest.mock('@/auth', () => ({
  useAuthStore: (selector: (state: { completeSetup: () => Promise<void> }) => unknown) =>
    selector({ completeSetup: () => mockCompleteSetup() }),
}));

jest.mock('@/dialog', () => ({
  showConfirm: (...args: unknown[]) => mockShowConfirm(...args),
  showMessage: (...args: unknown[]) => mockShowMessage(...args),
}));

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    back: (...args: unknown[]) => mockBack(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'es', currencyCode: 'USD' }],
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

jest.mock('@/lib/product-image', () => ({
  pickProductImage: jest.fn(),
  deleteProductImage: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const supplier = {
  id: 'sup-1',
  businessId: 'biz-1',
  name: 'Distribuidora Sur',
  businessName: null,
  phone: null,
  email: null,
  taxId: null,
  notes: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
};

const product = {
  id: 'prod-1',
  businessId: 'biz-1',
  categoryId: null,
  name: 'Café americano',
  description: null,
  imageUri: null,
  sku: null,
  barcode: null,
  priceMinor: 2500,
  inventoryItemId: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockListSuppliers.mockResolvedValue([]);
  mockListCategories.mockResolvedValue([]);
  mockListInventoryItems.mockResolvedValue([]);
  mockListProducts.mockResolvedValue([]);
  mockGetBusinessProfile.mockResolvedValue({ currencyCode: 'MXN' });
  mockGetRecipeByProductId.mockResolvedValue(null);
  mockResolveSupplierForItem.mockResolvedValue(null);
  mockCreateSupplier.mockResolvedValue({ id: 'sup-1' });
  mockUpdateSupplier.mockResolvedValue(supplier);
  mockArchiveSupplier.mockResolvedValue(undefined);
  mockSaveProduct.mockResolvedValue(product);
  mockCompleteSetup.mockResolvedValue(undefined);
  mockShowConfirm.mockImplementation((options: { onConfirm?: () => void }) => options.onConfirm?.());
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('SetupSuppliersScreen', () => {
  it('persists a supplier and continues to the next step', async () => {
    const queries = await render(<SetupSuppliersScreen />);
    await waitFor(() => expect(mockListSuppliers).toHaveBeenCalled());

    await fireEvent.changeText(queries.getByTestId('supplier-name') as never, 'Distribuidora Sur');
    await fireEvent.press(queries.getByText('Guardar') as never);

    await waitFor(() =>
      expect(mockCreateSupplier).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Distribuidora Sur' }),
      ),
    );

    await fireEvent.press(queries.getByText('Continuar') as never);
    expect(mockPush).toHaveBeenCalledWith('/setup/categories');
  });

  it('skips to the next step without saving', async () => {
    const queries = await render(<SetupSuppliersScreen />);
    await waitFor(() => expect(mockListSuppliers).toHaveBeenCalled());

    await fireEvent.press(queries.getByText('Omitir') as never);

    expect(mockCreateSupplier).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/setup/categories');
  });

  it('loads an existing supplier into the form and updates it', async () => {
    mockListSuppliers.mockResolvedValue([supplier]);
    const queries = await render(<SetupSuppliersScreen />);
    await waitFor(() => expect(queries.getByTestId('setup-edit-sup-1')).toBeTruthy());

    await fireEvent.press(queries.getByTestId('setup-edit-sup-1') as never);
    await fireEvent.changeText(queries.getByTestId('supplier-name') as never, 'Distribuidora Norte');
    await fireEvent.press(queries.getByText('Guardar') as never);

    await waitFor(() =>
      expect(mockUpdateSupplier).toHaveBeenCalledWith(
        'sup-1',
        expect.objectContaining({ name: 'Distribuidora Norte' }),
      ),
    );
    expect(mockCreateSupplier).not.toHaveBeenCalled();
  });

  it('removes a supplier after confirmation', async () => {
    mockListSuppliers.mockResolvedValue([supplier]);
    const queries = await render(<SetupSuppliersScreen />);
    await waitFor(() => expect(queries.getByTestId('setup-delete-sup-1')).toBeTruthy());

    await fireEvent.press(queries.getByTestId('setup-delete-sup-1') as never);

    await waitFor(() => expect(mockArchiveSupplier).toHaveBeenCalledWith('sup-1'));
    expect(mockShowConfirm).toHaveBeenCalled();
  });
});

describe('SetupProductsScreen', () => {
  it('creates a product with its price', async () => {
    const queries = await render(<SetupProductsScreen />);
    await waitFor(() => expect(mockListProducts).toHaveBeenCalled());

    await fireEvent.changeText(queries.getByTestId('product-name') as never, 'Café americano');
    await fireEvent.changeText(queries.getByTestId('product-price') as never, '25.00');
    await fireEvent.press(queries.getByText('Guardar') as never);

    await waitFor(() =>
      expect(mockSaveProduct).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Café americano', priceInput: '25.00' }),
        null,
      ),
    );
  });

  it('loads an existing product and updates it', async () => {
    mockListProducts.mockResolvedValue([product]);
    const queries = await render(<SetupProductsScreen />);
    await waitFor(() => expect(queries.getByTestId('setup-edit-prod-1')).toBeTruthy());

    await fireEvent.press(queries.getByTestId('setup-edit-prod-1') as never);
    await fireEvent.changeText(queries.getByTestId('product-name') as never, 'Café de olla');
    await fireEvent.press(queries.getByText('Guardar') as never);

    await waitFor(() =>
      expect(mockSaveProduct).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Café de olla' }),
        expect.objectContaining({ product: expect.objectContaining({ id: 'prod-1' }) }),
      ),
    );
  });
});

describe('SetupFinishScreen', () => {
  it('marks setup complete and enters the app', async () => {
    const queries = await render(<SetupFinishScreen />);
    await waitFor(() => expect(mockListProducts).toHaveBeenCalled());

    await fireEvent.press(queries.getByText('Empezar a vender') as never);

    await waitFor(() => expect(mockCompleteSetup).toHaveBeenCalled());
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
