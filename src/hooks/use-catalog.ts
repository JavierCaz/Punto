import { useCallback, useState } from 'react';

import {
  getBusinessProfile,
  computeRecipeCostMinor,
  listCategories,
  listProducts,
  listInventoryItems,
  listRecipes,
  type Category,
  type Product,
} from '@/db';

export interface CatalogState {
  products: Product[];
  categories: Category[];
  recipeProductIds: Set<string>;
  productCostMinor: Map<string, number>;
  currency: string;
  loading: boolean;
  loadFailed: boolean;
  reload: () => Promise<void>;
}

/**
 * Loads the catalog (products, categories, recipe flags, business currency)
 * for the POS and Products screens. Call `reload` from a focus effect so the
 * list reflects edits made on other screens.
 */
export function useCatalog(): CatalogState {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recipeProductIds, setRecipeProductIds] = useState<Set<string>>(new Set());
  const [productCostMinor, setProductCostMinor] = useState<Map<string, number>>(new Map());
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const reload = useCallback(async () => {
    try {
      setLoadFailed(false);
      setLoading(true);
      const [productList, categoryList, recipes, inventoryItems, profile] = await Promise.all([
        listProducts(),
        listCategories(),
        listRecipes(),
        listInventoryItems(),
        getBusinessProfile(),
      ]);

      const costByItem = new Map(inventoryItems.map((item) => [item.id, item.unitCostMinor]));
      const costByProduct = new Map<string, number>();
      for (const product of productList) {
        if (product.inventoryItemId != null) {
          costByProduct.set(product.id, costByItem.get(product.inventoryItemId) ?? 0);
        }
      }
      for (const recipe of recipes) {
        costByProduct.set(
          recipe.productId,
          computeRecipeCostMinor(
            recipe.items.map((item) => ({
              quantityMilli: item.quantity,
              unitCostMinor: costByItem.get(item.inventoryItemId) ?? 0,
            })),
          ),
        );
      }

      setProducts(productList);
      setCategories(categoryList);
      setRecipeProductIds(new Set(recipes.map((recipe) => recipe.productId)));
      setProductCostMinor(costByProduct);
      setCurrency(profile?.currencyCode ?? 'USD');
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  return { products, categories, recipeProductIds, productCostMinor, currency, loading, loadFailed, reload };
}
