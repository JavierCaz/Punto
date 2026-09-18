/**
 * Component test for the product form: validation, progressive disclosure,
 * category assignment and es/en i18n. Native modules and the image picker are
 * mocked so no native code runs.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { ProductForm } from '@/components/product-form';
import type { Category, InventoryItem, Supplier } from '@/db';
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

jest.mock('@/lib/product-image', () => ({
  pickProductImage: jest.fn(),
  deleteProductImage: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const categories: Category[] = [
  {
    id: 'cat-1',
    businessId: 'biz-1',
    name: 'Bebidas',
    description: null,
    imageUri: null,
    sortOrder: 0,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    archivedAt: null,
  },
];

const inventoryItems: InventoryItem[] = [
  {
    id: 'inv-1',
    businessId: 'biz-1',
    name: 'Matcha',
    description: null,
    imageUri: null,
    unitId: 'unit-1',
    currentQuantity: 0,
    minimumQuantity: 0,
    unitCostMinor: 0,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    archivedAt: null,
  },
];

const suppliers: Supplier[] = [
  {
    id: 'sup-1',
    businessId: 'biz-1',
    name: 'Proveedor Uno',
    businessName: null,
    phone: null,
    email: null,
    taxId: null,
    notes: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    archivedAt: null,
  },
];

function renderForm(onSave = jest.fn()) {
  return render(
    <ProductForm
      initialProduct={null}
      categories={categories}
      inventoryItems={inventoryItems}
      suppliers={suppliers}
      submitting={false}
      onSave={onSave}
    />,
  );
}

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('ProductForm', () => {
  it('blocks save and shows the name error when the name is empty', async () => {
    const onSave = jest.fn();
    const { getByText } = await renderForm(onSave);

    await fireEvent.press(getByText('Guardar'));

    expect(getByText('Escribe el nombre del producto.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the price error for invalid input', async () => {
    const onSave = jest.fn();
    const { getByText, getByTestId } = await renderForm(onSave);

    await fireEvent.changeText(getByTestId('product-name'), 'Matcha Latte');
    await fireEvent.changeText(getByTestId('product-price'), 'abc');
    await fireEvent.press(getByText('Guardar'));

    expect(getByText('Usa un precio válido (ej. 12.50).')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('assigns a category and saves the values', async () => {
    const onSave = jest.fn();
    const { getByText, getByTestId } = await renderForm(onSave);

    await fireEvent.changeText(getByTestId('product-name'), 'Matcha Latte');
    await fireEvent.changeText(getByTestId('product-price'), '12.50');
    await fireEvent.press(getByTestId('product-category-trigger'));
    await fireEvent.press(getByText('Bebidas'));
    await fireEvent.press(getByText('Guardar'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Matcha Latte',
        priceInput: '12.50',
        categoryId: 'cat-1',
      }),
    );
  });

  it('reveals advanced options only when expanded', async () => {
    const { queryByTestId, getByTestId, getByText } = await renderForm();

    expect(queryByTestId('product-barcode')).toBeNull();

    await fireEvent.press(getByText('Opciones avanzadas'));

    expect(getByTestId('product-barcode')).toBeTruthy();
  });

  it('requires a direct stock item when direct mode is selected', async () => {
    const onSave = jest.fn();
    const { getByText, getByTestId } = await renderForm(onSave);

    await fireEvent.changeText(getByTestId('product-name'), 'Matcha Latte');
    await fireEvent.changeText(getByTestId('product-price'), '12.50');
    await fireEvent.press(getByTestId('product-stock-mode-direct'));
    await fireEvent.press(getByText('Guardar'));

    expect(getByText('Elige el artículo que se descuenta.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('reveals the recipe editor in recipe mode and hides the direct inputs', async () => {
    const { getByText, getByTestId, queryByTestId } = await renderForm();

    await fireEvent.press(getByTestId('product-stock-mode-recipe'));
    await fireEvent.press(getByText('Opciones avanzadas'));

    expect(getByText('Agregar ingrediente')).toBeTruthy();
    expect(queryByTestId('product-stock-trigger')).toBeNull();
    expect(queryByTestId('product-supplier-trigger')).toBeNull();
  });

  it('shows neither stock input in none mode', async () => {
    const { getByText, getByTestId, queryByTestId, queryByText } = await renderForm();

    await fireEvent.press(getByTestId('product-stock-mode-none'));
    await fireEvent.press(getByText('Opciones avanzadas'));

    expect(queryByTestId('product-stock-trigger')).toBeNull();
    expect(queryByText('Agregar ingrediente')).toBeNull();
    expect(getByTestId('product-barcode')).toBeTruthy();
  });

  it('renders English copy when the active language is en', async () => {
    await i18n.changeLanguage('en');
    const { getByText } = await renderForm();

    expect(getByText('Save')).toBeTruthy();
    expect(getByText('Advanced options')).toBeTruthy();
  });
});
