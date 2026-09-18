/**
 * @jest-environment node
 *
 * Composite catalog-write tests: each helper must run its whole group inside a
 * SINGLE transaction — the atomicity guarantee the setup wizard relies on so a
 * partial failure can never strand a half-created catalog row.
 */

import type { DatabaseAdapter } from '@/db/repositories/database';
import {
  createInventoryItemWithStock,
  createProductWithStock,
} from '@/db/repositories/catalog-setup';
import { createInventoryItemWithTxn } from '@/db/repositories/inventory-item';
import { recordMovementWithTxn } from '@/db/repositories/movement';
import { createProductWithTxn } from '@/db/repositories/product';
import { upsertRecipeWithTxn } from '@/db/repositories/recipe';
import { upsertSupplierItemWithTxn } from '@/db/repositories/supplier-item';
import { withTransaction } from '@/db/repositories/transaction';

jest.mock('@/db/repositories/business-scope', () => ({
  getBusinessId: jest.fn(async () => 'biz-1'),
}));
jest.mock('@/db/repositories/transaction', () => ({ withTransaction: jest.fn() }));
jest.mock('@/db/repositories/inventory-item', () => ({ createInventoryItemWithTxn: jest.fn() }));
jest.mock('@/db/repositories/movement', () => ({ recordMovementWithTxn: jest.fn() }));
jest.mock('@/db/repositories/product', () => ({ createProductWithTxn: jest.fn() }));
jest.mock('@/db/repositories/recipe', () => ({ upsertRecipeWithTxn: jest.fn() }));
jest.mock('@/db/repositories/supplier-item', () => ({ upsertSupplierItemWithTxn: jest.fn() }));

const FAKE_TXN = { id: 'txn' } as unknown as DatabaseAdapter;

const mockWithTransaction = jest.mocked(withTransaction);
const mockCreateItem = jest.mocked(createInventoryItemWithTxn);
const mockMovement = jest.mocked(recordMovementWithTxn);
const mockCreateProduct = jest.mocked(createProductWithTxn);
const mockUpsertRecipe = jest.mocked(upsertRecipeWithTxn);
const mockUpsertLink = jest.mocked(upsertSupplierItemWithTxn);

beforeEach(() => {
  jest.clearAllMocks();
  mockWithTransaction.mockImplementation(
    ((fn: (txn: DatabaseAdapter) => Promise<unknown>) => fn(FAKE_TXN)) as typeof withTransaction,
  );
  mockCreateItem.mockResolvedValue({ id: 'item-1' } as never);
  mockCreateProduct.mockResolvedValue({ id: 'prod-1', inventoryItemId: 'item-1' } as never);
});

describe('createInventoryItemWithStock', () => {
  it('creates the item, opening stock and supplier link in one transaction', async () => {
    await createInventoryItemWithStock(
      { name: 'Milk', unitId: 'unit-ml' },
      { initialQuantity: 500, supplierId: 'sup-1' },
    );

    expect(mockWithTransaction).toHaveBeenCalledTimes(1);
    expect(mockCreateItem).toHaveBeenCalledWith(FAKE_TXN, 'biz-1', {
      name: 'Milk',
      unitId: 'unit-ml',
    });
    expect(mockMovement).toHaveBeenCalledWith(FAKE_TXN, 'biz-1', {
      inventoryItemId: 'item-1',
      type: 'INITIAL_STOCK',
      quantity: 500,
    });
    expect(mockUpsertLink).toHaveBeenCalledWith(FAKE_TXN, {
      supplierId: 'sup-1',
      inventoryItemId: 'item-1',
    });
  });

  it('posts no movement or link when there is no opening stock or supplier', async () => {
    await createInventoryItemWithStock({ name: 'Salt', unitId: 'unit-g' });

    expect(mockMovement).not.toHaveBeenCalled();
    expect(mockUpsertLink).not.toHaveBeenCalled();
  });
});

describe('createProductWithStock', () => {
  it('attaches the recipe inside the same transaction', async () => {
    await createProductWithStock(
      { name: 'Latte', priceMinor: 2500 },
      { recipeItems: [{ inventoryItemId: 'item-1', quantity: 200 }] },
    );

    expect(mockWithTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpsertRecipe).toHaveBeenCalledWith(FAKE_TXN, 'biz-1', {
      productId: 'prod-1',
      items: [{ inventoryItemId: 'item-1', quantity: 200 }],
    });
    expect(mockUpsertLink).not.toHaveBeenCalled();
  });

  it('links the supplier for a direct-stock product', async () => {
    await createProductWithStock(
      { name: 'Water', priceMinor: 1000, inventoryItemId: 'item-1' },
      { supplierId: 'sup-1' },
    );

    expect(mockUpsertLink).toHaveBeenCalledWith(FAKE_TXN, {
      supplierId: 'sup-1',
      inventoryItemId: 'item-1',
    });
    expect(mockUpsertRecipe).not.toHaveBeenCalled();
  });
});
