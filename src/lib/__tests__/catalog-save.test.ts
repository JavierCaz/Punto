/**
 * @jest-environment node
 *
 * Catalog save-orchestration tests: the shared helpers must route to the atomic
 * composite on create and to the field/stock/link updates on edit, keeping the
 * recipe XOR direct-stock invariant intact.
 */

import {
  adjustQuantity,
  createInventoryItemWithStock,
  createProductWithStock,
  deleteSupplierItem,
  listSupplierItems,
  setRecipeActive,
  updateInventoryItem,
  updateProduct,
  upsertRecipe,
  upsertSupplierItem,
  type InventoryItem,
  type Product,
  type RecipeDetail,
} from '@/db';
import { saveIngredient, saveProduct } from '@/lib/catalog-save';
import type { ProductFormValues } from '@/lib/catalog-form';
import { deleteProductImage } from '@/lib/product-image';

jest.mock('@/db', () => ({
  MANUAL_ADJUSTMENT_REASON: 'manual_adjustment',
  adjustQuantity: jest.fn(),
  createInventoryItemWithStock: jest.fn(),
  createProductWithStock: jest.fn(),
  deleteSupplierItem: jest.fn(),
  listSupplierItems: jest.fn(),
  setRecipeActive: jest.fn(),
  updateInventoryItem: jest.fn(),
  updateProduct: jest.fn(),
  upsertRecipe: jest.fn(),
  upsertSupplierItem: jest.fn(),
}));
jest.mock('@/lib/product-image', () => ({ deleteProductImage: jest.fn() }));

const mockCreateItemWithStock = jest.mocked(createInventoryItemWithStock);
const mockCreateProductWithStock = jest.mocked(createProductWithStock);
const mockUpdateItem = jest.mocked(updateInventoryItem);
const mockAdjust = jest.mocked(adjustQuantity);
const mockUpsertLink = jest.mocked(upsertSupplierItem);
const mockListLinks = jest.mocked(listSupplierItems);
const mockDeleteLink = jest.mocked(deleteSupplierItem);
const mockSetRecipeActive = jest.mocked(setRecipeActive);
const mockUpdateProduct = jest.mocked(updateProduct);
const mockUpsertRecipe = jest.mocked(upsertRecipe);
const mockDeleteImage = jest.mocked(deleteProductImage);

const item = {
  id: 'item-1',
  currentQuantity: 500,
} as unknown as InventoryItem;

const baseProductValues: ProductFormValues = {
  name: 'Café americano',
  description: '',
  categoryId: null,
  imageUri: null,
  priceInput: '25.00',
  barcode: '',
  trackInventory: false,
  inventoryItemId: null,
  recipeItems: [],
  supplierId: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockListLinks.mockResolvedValue([]);
});

describe('saveIngredient', () => {
  it('creates the item + opening stock through the atomic composite', async () => {
    await saveIngredient({
      name: 'Milk',
      unitId: 'unit-ml',
      minimumQuantity: 100,
      unitCostMinor: 250,
      initialQuantity: 500,
      adjustedQuantity: 0,
      supplierId: 'sup-1',
    });

    expect(mockCreateItemWithStock).toHaveBeenCalledWith(
      { name: 'Milk', unitId: 'unit-ml', minimumQuantity: 100, unitCostMinor: 250 },
      { initialQuantity: 500, supplierId: 'sup-1' },
    );
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });

  it('updates fields, posts a stock adjustment and moves the supplier link', async () => {
    mockListLinks.mockResolvedValue([{ id: 'link-1', inventoryItemId: 'item-1' }] as never);

    await saveIngredient(
      {
        name: 'Milk',
        unitId: 'unit-ml',
        minimumQuantity: 200,
        unitCostMinor: 300,
        initialQuantity: 0,
        adjustedQuantity: 800,
        supplierId: 'sup-2',
      },
      { item, initialSupplierId: 'sup-1' },
    );

    expect(mockUpdateItem).toHaveBeenCalledWith('item-1', {
      name: 'Milk',
      unitId: 'unit-ml',
      minimumQuantity: 200,
      unitCostMinor: 300,
    });
    expect(mockAdjust).toHaveBeenCalledWith({
      inventoryItemId: 'item-1',
      newQuantity: 800,
      reason: 'manual_adjustment',
    });
    expect(mockUpsertLink).toHaveBeenCalledWith({ supplierId: 'sup-2', inventoryItemId: 'item-1' });
    expect(mockDeleteLink).toHaveBeenCalledWith('link-1');
  });
});

describe('saveProduct', () => {
  it('creates through the atomic composite with the recipe when tracked by recipe', async () => {
    await saveProduct({
      ...baseProductValues,
      trackInventory: true,
      recipeItems: [{ inventoryItemId: 'item-1', quantityInput: '0.2' }],
    });

    expect(mockCreateProductWithStock).toHaveBeenCalledWith(expect.any(Object), {
      recipeItems: [{ inventoryItemId: 'item-1', quantity: 200, sortOrder: 0 }],
      supplierId: null,
    });
  });

  it('deactivates the old recipe and links the supplier on a recipe→direct switch', async () => {
    const existing = {
      product: { id: 'prod-1', imageUri: null } as unknown as Product,
      recipe: { id: 'rec-1', items: [] } as unknown as RecipeDetail,
      initialSupplierId: null,
    };

    await saveProduct(
      {
        ...baseProductValues,
        trackInventory: true,
        inventoryItemId: 'item-1',
        supplierId: 'sup-1',
      },
      existing,
    );

    expect(mockSetRecipeActive).toHaveBeenCalledWith('rec-1', false);
    expect(mockUpdateProduct).toHaveBeenCalledWith('prod-1', expect.any(Object));
    expect(mockUpsertLink).toHaveBeenCalledWith({ supplierId: 'sup-1', inventoryItemId: 'item-1' });
    expect(mockUpsertRecipe).not.toHaveBeenCalled();
  });

  it('replaces the recipe lines on an update', async () => {
    const existing = {
      product: { id: 'prod-1', imageUri: null } as unknown as Product,
      recipe: { id: 'rec-1', items: [] } as unknown as RecipeDetail,
      initialSupplierId: null,
    };

    await saveProduct(
      {
        ...baseProductValues,
        trackInventory: true,
        recipeItems: [{ inventoryItemId: 'item-1', quantityInput: '0.2' }],
      },
      existing,
    );

    expect(mockUpsertRecipe).toHaveBeenCalledWith({
      productId: 'prod-1',
      isActive: true,
      items: [{ inventoryItemId: 'item-1', quantity: 200, sortOrder: 0 }],
    });
  });

  it('removes the previous image when the product image changes', async () => {
    const existing = {
      product: { id: 'prod-1', imageUri: 'file:///old.png' } as unknown as Product,
      recipe: null,
      initialSupplierId: null,
    };

    await saveProduct(
      { ...baseProductValues, imageUri: 'file:///new.png' },
      existing,
    );

    expect(mockDeleteImage).toHaveBeenCalledWith('file:///old.png');
  });
});
