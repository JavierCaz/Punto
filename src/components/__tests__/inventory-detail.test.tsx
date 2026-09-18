/**
 * Component test for the read-only ingredient detail screen: header title,
 * stock card + low/out badges, info rows, the recent movement ledger and the
 * manual stock adjustment. expo-router and the '@/db' barrel are mocked so the
 * screen renders offline without SQLite.
 */

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import InventoryDetailScreen from '@/app/inventory/detail';
import {
  adjustQuantity,
  getBusinessProfile,
  getInventoryItemById,
  listMovements,
  listSupplierItems,
  listSuppliers,
  listUnits,
} from '@/db';
import type { InventoryItem, InventoryMovement, Supplier, Unit } from '@/db';
import { i18n } from '@/i18n';

// Configurable capability stub: true by default (ADMIN), flipped off in the
// authorization test to prove the adjustment form is hidden for employees.
const mockUseCan = jest.fn(() => true);

jest.mock('@/auth', () => ({ useCan: () => mockUseCan() }));

const mockHeaderOptions = jest.fn();

jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ options }: { options?: unknown }) => {
      mockHeaderOptions(options);
      return null;
    },
  },
  useLocalSearchParams: () => ({ id: 'inv-1' }),
}));

jest.mock('@/db', () => ({
  adjustQuantity: jest.fn(async () => {}),
  getBusinessProfile: jest.fn(async () => ({ currencyCode: 'MXN' })),
  getInventoryItemById: jest.fn(async () => null),
  // Real threshold helper + the stable manual reason code the screen uses.
  getStockStatus: jest.requireActual('@/db/repositories/calc').getStockStatus,
  listMovements: jest.fn(async () => ({ items: [], nextCursor: null })),
  listSupplierItems: jest.fn(async () => []),
  listSuppliers: jest.fn(async () => []),
  listUnits: jest.fn(async () => []),
  MANUAL_ADJUSTMENT_REASON: 'manual',
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

const mockGetItem = getInventoryItemById as jest.MockedFunction<typeof getInventoryItemById>;
const mockListUnits = listUnits as jest.MockedFunction<typeof listUnits>;
const mockListSuppliers = listSuppliers as jest.MockedFunction<typeof listSuppliers>;
const mockListSupplierItems = listSupplierItems as jest.MockedFunction<typeof listSupplierItems>;
const mockListMovements = listMovements as jest.MockedFunction<typeof listMovements>;
const mockGetProfile = getBusinessProfile as jest.MockedFunction<typeof getBusinessProfile>;
const mockAdjust = adjustQuantity as jest.MockedFunction<typeof adjustQuantity>;

const item: InventoryItem = {
  id: 'inv-1',
  businessId: 'biz-1',
  name: 'Matcha en polvo',
  description: null,
  imageUri: null,
  unitId: 'unit-1',
  currentQuantity: 500,
  minimumQuantity: 1000,
  unitCostMinor: 1250,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  archivedAt: null,
};

const unit: Unit = {
  id: 'unit-1',
  businessId: 'biz-1',
  name: 'gramo',
  symbol: 'g',
  type: 'weight',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const supplier: Supplier = {
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
};

const movement: InventoryMovement = {
  id: 'mov-1',
  businessId: 'biz-1',
  inventoryItemId: 'inv-1',
  type: 'PURCHASE',
  quantity: 2500,
  unitId: 'unit-1',
  unitCostMinor: 0,
  reason: null,
  notes: null,
  referenceType: null,
  referenceId: null,
  employeeId: null,
  createdAt: '2024-01-02T00:00:00.000Z',
};

/** A SALE movement as checkout posts it (negative, no reason, sale reference). */
const saleMovement: InventoryMovement = {
  id: 'mov-sale',
  businessId: 'biz-1',
  inventoryItemId: 'inv-1',
  type: 'SALE',
  quantity: -200,
  unitId: 'unit-1',
  unitCostMinor: 0,
  reason: null,
  notes: null,
  referenceType: 'sale',
  referenceId: 'sale-1',
  employeeId: null,
  createdAt: '2024-01-03T00:00:00.000Z',
};

/** A manual count correction; 'manual' is the stable code the history localizes. */
const adjustmentMovement: InventoryMovement = {
  id: 'mov-adjust',
  businessId: 'biz-1',
  inventoryItemId: 'inv-1',
  type: 'ADJUSTMENT',
  quantity: 100,
  unitId: 'unit-1',
  unitCostMinor: 0,
  reason: 'manual',
  notes: null,
  referenceType: null,
  referenceId: null,
  employeeId: null,
  createdAt: '2024-01-04T00:00:00.000Z',
};

/** An adjustment carrying an owner-typed free-text reason (shown verbatim). */
const freeTextAdjustment: InventoryMovement = {
  id: 'mov-adjust-note',
  businessId: 'biz-1',
  inventoryItemId: 'inv-1',
  type: 'ADJUSTMENT',
  quantity: 200,
  unitId: 'unit-1',
  unitCostMinor: 0,
  reason: 'Conteo físico',
  notes: null,
  referenceType: null,
  referenceId: null,
  employeeId: null,
  createdAt: '2024-01-05T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
  mockGetItem.mockResolvedValue(item);
  mockListUnits.mockResolvedValue([unit]);
  mockListSuppliers.mockResolvedValue([supplier]);
  mockListSupplierItems.mockResolvedValue([
    {
      id: 'link-1',
      supplierId: 'sup-1',
      inventoryItemId: 'inv-1',
      supplierSku: null,
      purchasePriceMinor: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ]);
  mockListMovements.mockResolvedValue({ items: [movement], nextCursor: null });
  mockGetProfile.mockResolvedValue({ currencyCode: 'MXN' } as Awaited<
    ReturnType<typeof getBusinessProfile>
  >);
  mockAdjust.mockResolvedValue(undefined);
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('InventoryDetailScreen', () => {
  it('renders the header, stock card, info and recent movements', async () => {
    const { getByText } = await render(<InventoryDetailScreen />);

    await waitFor(() =>
      expect(mockHeaderOptions).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Matcha en polvo' }),
      ),
    );

    expect(getByText('0.5 g')).toBeTruthy();
    expect(getByText('Stock bajo')).toBeTruthy();
    expect(getByText('gramo (g)')).toBeTruthy();
    expect(getByText('Proveedor Uno')).toBeTruthy();
    expect(getByText('Movimientos recientes')).toBeTruthy();
    expect(getByText('Compra')).toBeTruthy();
    expect(getByText('+2.5 g')).toBeTruthy();
  });

  it('shows the out-of-stock badge when the count is zero', async () => {
    mockGetItem.mockResolvedValue({ ...item, currentQuantity: 0, minimumQuantity: 0 });
    const { getByText, getAllByText } = await render(<InventoryDetailScreen />);

    await waitFor(() => expect(getByText('Sin stock')).toBeTruthy());
    expect(getAllByText('0 g').length).toBeGreaterThan(0);
  });

  it('shows the empty movements message when there is no history', async () => {
    mockListMovements.mockResolvedValue({ items: [], nextCursor: null });
    const { getByText } = await render(<InventoryDetailScreen />);

    await waitFor(() => expect(getByText('Aún no hay movimientos.')).toBeTruthy());
  });

  it('rejects an invalid adjust quantity without writing stock', async () => {
    const { getByText, getByTestId } = await render(<InventoryDetailScreen />);

    await waitFor(() => expect(getByText('Ajustar existencia')).toBeTruthy());
    await fireEvent.changeText(getByTestId('inventory-adjust-input'), 'abc');
    await fireEvent.press(getByText('Guardar existencia'));

    expect(getByText('Usa una cantidad válida.')).toBeTruthy();
    expect(mockAdjust).not.toHaveBeenCalled();
  });

  it('adjusts the stock and reloads the item', async () => {
    const { getByText, getByTestId } = await render(<InventoryDetailScreen />);

    await waitFor(() => expect(getByText('Ajustar existencia')).toBeTruthy());
    await fireEvent.changeText(getByTestId('inventory-adjust-input'), '3');
    await fireEvent.press(getByText('Guardar existencia'));

    await waitFor(() =>
      expect(mockAdjust).toHaveBeenCalledWith({
        inventoryItemId: 'inv-1',
        newQuantity: 3000,
        reason: 'manual',
      }),
    );
    await waitFor(() => expect(getByText('Existencia actualizada')).toBeTruthy());
  });

  it('records the typed adjustment reason in the ledger', async () => {
    const { getByText, getByTestId } = await render(<InventoryDetailScreen />);

    await waitFor(() => expect(getByText('Ajustar existencia')).toBeTruthy());
    await fireEvent.changeText(getByTestId('inventory-adjust-input'), '3');
    await fireEvent.changeText(getByTestId('inventory-adjust-reason'), 'Conteo físico');
    await fireEvent.press(getByText('Guardar existencia'));

    await waitFor(() =>
      expect(mockAdjust).toHaveBeenCalledWith({
        inventoryItemId: 'inv-1',
        newQuantity: 3000,
        reason: 'Conteo físico',
      }),
    );
  });

  it('reflects sales, purchases and manual adjustments in the movement history', async () => {
    mockListMovements.mockResolvedValue({
      items: [adjustmentMovement, freeTextAdjustment, saleMovement, movement],
      nextCursor: null,
    });
    const { getAllByText, getByText } = await render(<InventoryDetailScreen />);

    await waitFor(() => expect(getByText('Venta')).toBeTruthy());
    expect(getByText('Compra')).toBeTruthy();
    // Two manual corrections: one with the stable 'manual' code, one with a note.
    expect(getAllByText('Ajuste')).toHaveLength(2);
    // Signed in/out quantities (milli-units rendered against the unit symbol).
    expect(getByText('−0.2 g')).toBeTruthy();
    expect(getByText('+2.5 g')).toBeTruthy();
    expect(getByText('+0.1 g')).toBeTruthy();
    expect(getByText('+0.2 g')).toBeTruthy();
    // The stable code is localized; an owner-typed reason renders verbatim.
    expect(getByText('Ajuste manual')).toBeTruthy();
    expect(getByText('Conteo físico')).toBeTruthy();
  });

  it('hides the stock adjustment form without inventory.manage', async () => {
    mockUseCan.mockReturnValue(false);

    const { queryByText, getByText } = await render(<InventoryDetailScreen />);

    await waitFor(() => expect(getByText('Movimientos recientes')).toBeTruthy());
    expect(queryByText('Ajustar existencia')).toBeNull();
    expect(queryByText('Guardar existencia')).toBeNull();
  });
});
