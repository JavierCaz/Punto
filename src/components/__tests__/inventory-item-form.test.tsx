/**
 * Component test for the ingredient form: required-field validation, parsed
 * save payload and es/en i18n. Native modules are mocked so no native code
 * runs and no database is touched.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { InventoryItemForm } from '@/components/inventory-item-form';
import type { Supplier, Unit } from '@/db';
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

const units: Unit[] = [
  {
    id: 'unit-1',
    businessId: 'biz-1',
    name: 'Gramo',
    symbol: 'g',
    type: 'weight',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'unit-2',
    businessId: 'biz-1',
    name: 'Mililitro',
    symbol: 'ml',
    type: 'volume',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
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
    <InventoryItemForm
      initialItem={null}
      initialSupplierId={null}
      units={units}
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

describe('InventoryItemForm', () => {
  it('blocks save and shows the name and unit errors when both are missing', async () => {
    const onSave = jest.fn();
    const { getByText } = await renderForm(onSave);

    await fireEvent.press(getByText('Guardar'));

    expect(getByText('Escribe el nombre del ingrediente.')).toBeTruthy();
    expect(getByText('Elige una unidad de medida.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves parsed quantities and costs for a valid form', async () => {
    const onSave = jest.fn();
    const { getByText, getByTestId } = await renderForm(onSave);

    await fireEvent.changeText(getByTestId('inventory-name'), 'Matcha');
    await fireEvent.press(getByTestId('inventory-unit-trigger'));
    await fireEvent.press(getByText('Gramo (g)'));
    await fireEvent.changeText(getByTestId('inventory-min-stock'), '5');
    await fireEvent.changeText(getByTestId('inventory-cost'), '12.50');
    await fireEvent.press(getByText('Guardar'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Matcha',
        unitId: 'unit-1',
        minimumQuantity: 5000,
        unitCostMinor: 1250,
        supplierId: null,
      }),
    );
  });

  it('renders English copy when the active language is en', async () => {
    await i18n.changeLanguage('en');
    const { getByText } = await renderForm();

    expect(getByText('Save')).toBeTruthy();
    expect(getByText('Unit of measure')).toBeTruthy();
  });
});
