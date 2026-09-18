import {
  MANUAL_ADJUSTMENT_REASON,
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
  type Supplier,
} from '@/db';
import {
  buildProductCreateInput,
  buildProductUpdateInput,
  buildRecipeItems,
  resolveStockMode,
  type ProductFormValues,
} from '@/lib/catalog-form';
import { deleteProductImage } from '@/lib/product-image';

/**
 * Shared create/update orchestration for catalog entries, used by both the
 * guided setup wizard and the edit screens. Keeping the multi-table writes in
 * one place means the recipe/stock/supplier-link rules cannot drift between the
 * two entry points.
 */

/** Find which supplier (if any) is currently linked to an inventory item. */
export async function resolveSupplierForItem(
  suppliers: readonly Supplier[],
  inventoryItemId: string | null,
): Promise<string | null> {
  if (!inventoryItemId) {
    return null;
  }
  for (const supplier of suppliers) {
    const links = await listSupplierItems(supplier.id);
    if (links.some((link) => link.inventoryItemId === inventoryItemId)) {
      return supplier.id;
    }
  }
  return null;
}

/** Remove the link between a supplier and an inventory item, when present. */
export async function removeSupplierLink(
  supplierId: string,
  inventoryItemId: string,
): Promise<void> {
  const links = await listSupplierItems(supplierId);
  const link = links.find((entry) => entry.inventoryItemId === inventoryItemId);
  if (link) {
    await deleteSupplierItem(link.id);
  }
}

/** Parsed, presentation-agnostic ingredient draft handed to {@link saveIngredient}. */
export interface IngredientDraft {
  name: string;
  unitId: string;
  /** Low-stock threshold in milli-units. */
  minimumQuantity: number;
  /** Estimated cost per display unit, minor currency. */
  unitCostMinor: number;
  /** Opening stock in milli-units (create only). */
  initialQuantity: number;
  /** Stock count in milli-units (update only). */
  adjustedQuantity: number;
  supplierId: string | null;
}

export interface ExistingIngredient {
  item: InventoryItem;
  initialSupplierId: string | null;
}

/**
 * Create an ingredient (with opening stock + supplier link) or update an
 * existing one (fields, stock count and supplier link) atomically.
 */
export async function saveIngredient(
  draft: IngredientDraft,
  existing?: ExistingIngredient | null,
): Promise<void> {
  if (!existing) {
    await createInventoryItemWithStock(
      {
        name: draft.name,
        unitId: draft.unitId,
        minimumQuantity: draft.minimumQuantity,
        unitCostMinor: draft.unitCostMinor,
      },
      { initialQuantity: draft.initialQuantity, supplierId: draft.supplierId },
    );
    return;
  }

  const { item, initialSupplierId } = existing;

  await updateInventoryItem(item.id, {
    name: draft.name,
    unitId: draft.unitId,
    minimumQuantity: draft.minimumQuantity,
    unitCostMinor: draft.unitCostMinor,
  });

  // The stock cache is ledger-owned: a manual count posts an ADJUSTMENT.
  if (draft.adjustedQuantity !== item.currentQuantity) {
    await adjustQuantity({
      inventoryItemId: item.id,
      newQuantity: draft.adjustedQuantity,
      reason: MANUAL_ADJUSTMENT_REASON,
    });
  }

  // Only touch the link when the supplier actually changed — re-upserting an
  // unchanged link would reset its SKU/last-price to null/0.
  if (draft.supplierId && draft.supplierId !== initialSupplierId) {
    await upsertSupplierItem({ supplierId: draft.supplierId, inventoryItemId: item.id });
  }
  if (initialSupplierId && initialSupplierId !== draft.supplierId) {
    await removeSupplierLink(initialSupplierId, item.id);
  }
}

export interface ExistingProduct {
  product: Product;
  recipe: RecipeDetail | null;
  initialSupplierId: string | null;
}

/**
 * Create a product (with recipe or direct-stock supplier link) or update an
 * existing one, keeping the recipe XOR direct-stock invariant intact.
 */
export async function saveProduct(
  values: ProductFormValues,
  existing?: ExistingProduct | null,
): Promise<Product> {
  const mode = resolveStockMode(values);

  if (!existing) {
    return createProductWithStock(buildProductCreateInput(values), {
      recipeItems: mode === 'recipe' ? buildRecipeItems(values.recipeItems) : undefined,
      supplierId: mode === 'direct' ? values.supplierId : null,
    });
  }

  const { product, recipe } = existing;

  // Deactivate any existing recipe BEFORE clearing the bridge, so a
  // recipe→direct switch satisfies the XOR invariant in updateProduct.
  if (recipe && mode !== 'recipe') {
    await setRecipeActive(recipe.id, false);
  }

  const updated = await updateProduct(product.id, buildProductUpdateInput(values));

  if (mode === 'recipe') {
    await upsertRecipe({
      productId: product.id,
      isActive: true,
      items: buildRecipeItems(values.recipeItems),
    });
  }

  if (mode === 'direct' && values.inventoryItemId && values.supplierId) {
    await upsertSupplierItem({
      supplierId: values.supplierId,
      inventoryItemId: values.inventoryItemId,
    });
  }

  if (product.imageUri && product.imageUri !== values.imageUri) {
    deleteProductImage(product.imageUri);
  }

  return updated;
}
