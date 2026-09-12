/**
 * Component test for the supplier-purchase form: empty-line validation, the
 * integer-only line payload (quantity in milli-units, cost in minor units) and
 * es/en i18n. Native modules are mocked so no native code runs.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { PurchaseForm } from '@/components/purchase-form';
import type { InventoryItem, Supplier } from '@/db';
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
    <PurchaseForm
      inventoryItems={inventoryItems}
      suppliers={suppliers}
      currency="MXN"
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

describe('PurchaseForm', () => {
  it('blocks save and asks for an ingredient when there are no lines', async () => {
    const onSave = jest.fn();
    const { getByText } = await renderForm(onSave);

    await fireEvent.press(getByText('Registrar compra'));

    expect(getByText('Elige un ingrediente.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves an integer-only item payload for a valid line', async () => {
    const onSave = jest.fn();
    const { getByText, getByTestId } = await renderForm(onSave);

    await fireEvent.press(getByText('Agregar ingrediente'));
    await fireEvent.press(getByTestId('purchase-item-0-trigger'));
    await fireEvent.press(getByText('Matcha'));
    await fireEvent.changeText(getByTestId('purchase-quantity-0'), '1.5');
    await fireEvent.changeText(getByTestId('purchase-cost-0'), '2.50');
    await fireEvent.press(getByText('Registrar compra'));

    expect(onSave).toHaveBeenCalledWith({
      supplierId: null,
      notes: '',
      items: [
        {
          inventoryItemId: 'inv-1',
          quantity: 1500,
          unitId: 'unit-1',
          unitCostMinor: 250,
        },
      ],
    });
  });

  it('renders English copy when the active language is en', async () => {
    await i18n.changeLanguage('en');
    const { getByText } = await renderForm();

    expect(getByText('Record purchase')).toBeTruthy();
    expect(getByText('Add ingredient')).toBeTruthy();
  });
});
