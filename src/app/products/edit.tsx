import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ProductForm } from '@/components/product-form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

import { Spacing } from '@/constants/theme';
import {
  REPO_ERROR,
  archiveProduct,
  getProductById,
  getRecipeByProductId,
  isRepoError,
  listCategories,
  listInventoryItems,
  listSuppliers,
  type Category,
  type InventoryItem,
  type Product,
  type RecipeDetail,
  type Supplier,
} from '@/db';
import { showConfirm, showMessage } from '@/dialog';
import { useTheme } from '@/hooks/use-theme';
import {
  formatQuantityMilli,
  type ProductFormValues,
  type RecipeLineValue,
} from '@/lib/catalog-form';
import { resolveSupplierForItem, saveProduct } from '@/lib/catalog-save';
import { deleteProductImage } from '@/lib/product-image';


export default function ProductEditScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const editing = typeof id === 'string' && id.length > 0;

  const [product, setProduct] = useState<Product | null>(null);
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [initialSupplierId, setInitialSupplierId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const [categoryList, itemList, supplierList] = await Promise.all([
          listCategories(),
          listInventoryItems(),
          listSuppliers(),
        ]);

        let foundProduct: Product | null = null;
        let foundRecipe: RecipeDetail | null = null;
        if (editing) {
          foundProduct = await getProductById(id);
          if (!foundProduct) {
            if (!cancelled) {
              setLoadFailed(true);
            }
            return;
          }
          foundRecipe = await getRecipeByProductId(foundProduct.id);
        }

        const supplierId = await resolveSupplierForItem(
          supplierList,
          foundProduct?.inventoryItemId ?? null,
        );

        if (cancelled) {
          return;
        }
        setCategories(categoryList);
        setInventoryItems(itemList);
        setSuppliers(supplierList);
        setProduct(foundProduct);
        setRecipe(foundRecipe);
        setInitialSupplierId(supplierId);
      } catch {
        if (!cancelled) {
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [editing, id]);

  const initialRecipeItems: RecipeLineValue[] = recipe
    ? recipe.items.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        quantityInput: formatQuantityMilli(item.quantity),
      }))
    : [];

  const handleSave = async (values: ProductFormValues): Promise<void> => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await saveProduct(values, product ? { product, recipe, initialSupplierId } : null);
      router.back();
    } catch (error) {
      setSubmitError(
        isRepoError(error, REPO_ERROR.DUPLICATE)
          ? t('products.form.duplicate')
          : t('products.form.saveFailed'),
      );
      setSubmitting(false);
    }
  };

  const handleDelete = (): void => {
    if (!product) {
      return;
    }
    const name = product.name;
    showConfirm({
      title: t('products.form.deleteConfirmTitle', { name }),
      message: t('products.form.deleteConfirmMessage'),
      tone: 'danger',
      confirmLabel: t('common.actions.delete'),
      confirmTone: 'danger',
      onConfirm: () => {
        void (async () => {
          try {
            await archiveProduct(product.id);
            deleteProductImage(product.imageUri);
            router.back();
          } catch {
            showMessage({
              title: t('common.status.error'),
              message: t('products.form.deleteFailed'),
              tone: 'danger',
            });
          }
        })();
      },
    });
  };

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: editing ? t('products.form.editTitle') : t('products.form.newTitle'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
        }}
      />

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="body2" themeColor="textSecondary">
            {t('common.status.loading')}
          </ThemedText>
        </View>
      ) : loadFailed ? (
        <View style={styles.state}>
          <ThemedText type="body1">{t('common.status.error')}</ThemedText>
        </View>
      ) : (
        <ProductForm
          initialProduct={product}
          initialRecipeItems={initialRecipeItems}
          initialSupplierId={initialSupplierId}
          categories={categories}
          inventoryItems={inventoryItems}
          suppliers={suppliers}
          submitting={submitting}
          submitError={submitError}
          onSave={(values) => void handleSave(values)}
          onDelete={editing ? handleDelete : undefined}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
});
