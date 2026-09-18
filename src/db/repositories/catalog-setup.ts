import { getBusinessId } from '@/db/repositories/business-scope';
import {
  createInventoryItemWithTxn,
  type CreateInventoryItemInput,
  type InventoryItem,
} from '@/db/repositories/inventory-item';
import { recordMovementWithTxn } from '@/db/repositories/movement';
import { createProductWithTxn, type CreateProductInput, type Product } from '@/db/repositories/product';
import { upsertRecipeWithTxn, type RecipeItemInput } from '@/db/repositories/recipe';
import { upsertSupplierItemWithTxn } from '@/db/repositories/supplier-item';
import { withTransaction } from '@/db/repositories/transaction';
import type { QuantityMilli } from '@/db/repositories/types';

/**
 * Composite catalog writes that must land as ONE unit.
 *
 * A new ingredient and its opening stock (plus supplier link) and a new product
 * with its recipe (plus direct-stock supplier link) span several tables. Doing
 * each write in its own transaction means a transient failure leaves a partial
 * row that then blocks a retry as a duplicate; these helpers commit the whole
 * group atomically instead.
 */

export interface CreateInventoryItemWithStockOptions {
  /** Opening stock in milli-units; omitted/0 posts no movement. */
  initialQuantity?: QuantityMilli;
  /** Optional supplier to link to the new item. */
  supplierId?: string | null;
}

/** Create an ingredient and post its opening stock + supplier link atomically. */
export async function createInventoryItemWithStock(
  input: CreateInventoryItemInput,
  options: CreateInventoryItemWithStockOptions = {},
): Promise<InventoryItem> {
  const businessId = await getBusinessId();

  return withTransaction(async (txn) => {
    const item = await createInventoryItemWithTxn(txn, businessId, input);

    const initialQuantity = options.initialQuantity ?? 0;
    if (initialQuantity > 0) {
      await recordMovementWithTxn(txn, businessId, {
        inventoryItemId: item.id,
        type: 'INITIAL_STOCK',
        quantity: initialQuantity,
      });
    }

    if (options.supplierId) {
      await upsertSupplierItemWithTxn(txn, {
        supplierId: options.supplierId,
        inventoryItemId: item.id,
      });
    }

    return item;
  });
}

export interface CreateProductWithStockOptions {
  /** Recipe lines (milli-units). Mutually exclusive with a direct stock bridge. */
  recipeItems?: RecipeItemInput[];
  /** Supplier linked to the product's direct-stock item, when one is set. */
  supplierId?: string | null;
}

/** Create a product and attach its recipe or direct-stock supplier atomically. */
export async function createProductWithStock(
  input: CreateProductInput,
  options: CreateProductWithStockOptions = {},
): Promise<Product> {
  const businessId = await getBusinessId();

  return withTransaction(async (txn) => {
    const product = await createProductWithTxn(txn, businessId, input);

    const recipeItems = options.recipeItems ?? [];
    if (recipeItems.length > 0) {
      await upsertRecipeWithTxn(txn, businessId, { productId: product.id, items: recipeItems });
    } else if (options.supplierId && product.inventoryItemId) {
      await upsertSupplierItemWithTxn(txn, {
        supplierId: options.supplierId,
        inventoryItemId: product.inventoryItemId,
      });
    }

    return product;
  });
}
