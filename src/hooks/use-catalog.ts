import { useCallback, useState } from 'react';

import {
  getBusinessProfile,
  listCategories,
  listProducts,
  listRecipes,
  type Category,
  type Product,
} from '@/db';

export interface CatalogState {
  products: Product[];
  categories: Category[];
  recipeProductIds: Set<string>;
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
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const reload = useCallback(async () => {
    try {
      setLoadFailed(false);
      setLoading(true);
      const [productList, categoryList, recipes, profile] = await Promise.all([
        listProducts(),
        listCategories(),
        listRecipes(),
        getBusinessProfile(),
      ]);
      setProducts(productList);
      setCategories(categoryList);
      setRecipeProductIds(new Set(recipes.map((recipe) => recipe.productId)));
      setCurrency(profile?.currencyCode ?? 'USD');
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  return { products, categories, recipeProductIds, currency, loading, loadFailed, reload };
}
