import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { SecondaryButton } from '@/components/secondary-button';
import { ProductForm } from '@/components/product-form';
import { SectionHeader } from '@/components/section-header';
import { SetupEntryList } from '@/components/setup-entry-list';
import { ThemedText } from '@/components/themed-text';
import { WizardStep } from '@/components/wizard-step';

import { Spacing } from '@/constants/theme';
import {
  REPO_ERROR,
  archiveProduct,
  getBusinessProfile,
  getRecipeByProductId,
  isRepoError,
  listCategories,
  listInventoryItems,
  listProducts,
  listSuppliers,
  type Category,
  type InventoryItem,
  type Product,
  type RecipeDetail,
  type Supplier,
} from '@/db';
import { showConfirm, showMessage } from '@/dialog';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/i18n/format';
import {
  formatQuantityMilli,
  type ProductFormValues,
  type RecipeLineValue,
  } from '@/lib/catalog-form';
import { resolveSupplierForItem, saveProduct } from '@/lib/catalog-save';
import { deleteProductImage } from '@/lib/product-image';

/** Setup step 6 — add products (with optional direct stock or recipe). */
export default function SetupProductsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<RecipeDetail | null>(null);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [categoryList, itemList, supplierList, productList, profile] = await Promise.all([
          listCategories(),
          listInventoryItems(),
          listSuppliers(),
          listProducts(),
          getBusinessProfile(),
        ]);
        if (!cancelled) {
          setCategories(categoryList);
          setInventoryItems(itemList);
          setSuppliers(supplierList);
          setProducts(productList);
          setCurrencyCode(profile?.currencyCode ?? 'USD');
        }
      } catch {
        // A failed read leaves the step empty; the user can still add or skip.
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const goNext = (): void => {
    router.push('/setup/finish');
  };

  const resetForm = (): void => {
    setEditingProduct(null);
    setEditingRecipe(null);
    setEditingSupplierId(null);
    setSubmitError(null);
    setFormKey((current) => current + 1);
  };

  const handleSave = async (values: ProductFormValues): Promise<void> => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await saveProduct(
        values,
        editingProduct
          ? { product: editingProduct, recipe: editingRecipe, initialSupplierId: editingSupplierId }
          : null,
      );
      setProducts(await listProducts());
      resetForm();
    } catch (error) {
      setSubmitError(
        isRepoError(error, REPO_ERROR.DUPLICATE)
          ? t('products.form.duplicate')
          : t('products.form.saveFailed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (id: string): void => {
    const found = products.find((product) => product.id === id);
    if (!found) {
      return;
    }
    setSubmitError(null);
    void (async () => {
      const [recipe, supplierId] = await Promise.all([
        getRecipeByProductId(found.id),
        resolveSupplierForItem(suppliers, found.inventoryItemId),
      ]);
      setEditingProduct(found);
      setEditingRecipe(recipe);
      setEditingSupplierId(supplierId);
      setFormKey((current) => current + 1);
    })();
  };

  const handleDelete = (id: string): void => {
    const found = products.find((product) => product.id === id);
    if (!found) {
      return;
    }
    showConfirm({
      title: t('products.form.deleteConfirmTitle', { name: found.name }),
      message: t('products.form.deleteConfirmMessage'),
      tone: 'danger',
      confirmLabel: t('common.actions.delete'),
      confirmTone: 'danger',
      onConfirm: () => {
        void (async () => {
          try {
            await archiveProduct(found.id);
            deleteProductImage(found.imageUri);
            setProducts(await listProducts());
            if (editingProduct?.id === found.id) {
              resetForm();
            }
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

  const initialRecipeItems: RecipeLineValue[] = editingRecipe
    ? editingRecipe.items.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        quantityInput: formatQuantityMilli(item.quantity),
      }))
    : [];

  return (
    <WizardStep
      stepId="products"
      title={t('wizard.productsTitle')}
      subtitle={t('wizard.productsHint')}
      onBack={() => router.back()}
      onContinue={goNext}
      onSkip={goNext}
      busy={submitting}
      testID="setup-products">
      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <>
          {products.length > 0 ? (
            <SetupEntryList
              title={t('wizard.added')}
              entries={products.map((product) => ({
                id: product.id,
                title: product.name,
                subtitle: formatMoney(product.priceMinor, currencyCode),
              }))}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <ThemedText type="body2" themeColor="textSecondary">
              {t('wizard.productsEmpty')}
            </ThemedText>
          )}

          <View style={styles.formSection}>
            <SectionHeader
              level="section"
              title={editingProduct ? t('products.form.editTitle') : t('wizard.addProduct')}
            />
            <ProductForm
              key={formKey}
              initialProduct={editingProduct}
              initialRecipeItems={initialRecipeItems}
              initialSupplierId={editingSupplierId}
              categories={categories}
              inventoryItems={inventoryItems}
              suppliers={suppliers}
              submitting={submitting}
              submitError={submitError}
              onSave={(values) => void handleSave(values)}
            />
            {editingProduct ? (
              <SecondaryButton
                label={t('common.actions.cancel')}
                icon="close"
                onPress={resetForm}
                disabled={submitting}
              />
            ) : null}
          </View>
        </>
      )}
    </WizardStep>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
  },
  formSection: {
    gap: Spacing.three,
  },
});
