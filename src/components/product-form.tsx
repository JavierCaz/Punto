import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AdvancedSection } from './advanced-section';
import { FormField } from './form-field';
import { PrimaryButton } from './primary-button';
import { ProductImagePicker, type ProductImageError } from './product-image-picker';
import { RecipeEditor } from './recipe-editor';
import { SecondaryButton } from './secondary-button';
import { SegmentedControl } from './segmented-control';
import { SelectField } from './select-field';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import type { Category, InventoryItem, Product, Supplier } from '@/db';
import {
  formatMoneyInput,
  validateProductForm,
  type ProductFormIssue,
  type ProductFormValues,
  type ProductStockMode,
  type RecipeLineValue,
} from '@/lib/catalog-form';

export type ProductFormProps = {
  initialProduct: Product | null;
  initialRecipeItems?: RecipeLineValue[];
  initialSupplierId?: string | null;
  categories: Category[];
  inventoryItems: InventoryItem[];
  suppliers: Supplier[];
  submitting: boolean;
  submitError?: string | null;
  onSave: (values: ProductFormValues) => void;
  onDelete?: () => void;
};

/**
 * Product create/edit form implementing progressive disclosure (§5.3):
 * name, image, category, price and the explicit stock-mode segmented control
 * (none / direct / recipe) come first; the mode's own inputs (stock item +
 * supplier, or recipe editor) sit directly below it, and description + barcode
 * stay behind "Opciones avanzadas" at the end of the form.
 *
 * Validation and payload building are pure (`@/lib/catalog-form`); this
 * component owns only the controlled field state and error presentation.
 */
export function ProductForm({
  initialProduct,
  initialRecipeItems,
  initialSupplierId,
  categories,
  inventoryItems,
  suppliers,
  submitting,
  submitError,
  onSave,
  onDelete,
}: ProductFormProps) {
  const { t } = useTranslation();

  const savingRef = useRef(false);

  useEffect(() => {
    if (!submitting) {
      savingRef.current = false;
    }
  }, [submitting]);

  const [name, setName] = useState(initialProduct?.name ?? '');
  const [description, setDescription] = useState(initialProduct?.description ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(initialProduct?.categoryId ?? null);
  const [imageUri, setImageUri] = useState<string | null>(initialProduct?.imageUri ?? null);
  const [imageError, setImageError] = useState<ProductImageError | null>(null);
  const [priceInput, setPriceInput] = useState(
    initialProduct ? formatMoneyInput(initialProduct.priceMinor) : '',
  );
  const [barcode, setBarcode] = useState(initialProduct?.barcode ?? '');
  const [stockMode, setStockMode] = useState<ProductStockMode>(
    (initialRecipeItems?.length ?? 0) > 0
      ? 'recipe'
      : initialProduct?.inventoryItemId != null
        ? 'direct'
        : 'none',
  );
  const [inventoryItemId, setInventoryItemId] = useState<string | null>(
    initialProduct?.inventoryItemId ?? null,
  );
  const [recipeItems, setRecipeItems] = useState<RecipeLineValue[]>(initialRecipeItems ?? []);
  const [supplierId, setSupplierId] = useState<string | null>(initialSupplierId ?? null);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const values = useMemo<ProductFormValues>(
    () => ({
      name,
      description,
      categoryId,
      imageUri,
      priceInput,
      barcode,
      stockMode,
      inventoryItemId,
      recipeItems,
      supplierId,
    }),
    [
      name,
      description,
      categoryId,
      imageUri,
      priceInput,
      barcode,
      stockMode,
      inventoryItemId,
      recipeItems,
      supplierId,
    ],
  );

  const validation = useMemo(() => validateProductForm(values), [values]);

  const issueMessage = (issue: ProductFormIssue | null): string | undefined => {
    switch (issue) {
      case 'name-required':
        return t('products.form.nameRequired');
      case 'price-required':
        return t('products.form.priceRequired');
      case 'price-invalid':
        return t('products.form.priceInvalid');
      case 'stock-required':
        return stockMode === 'direct'
          ? t('products.form.stockItemRequired')
          : t('products.form.recipeRequired');
      case 'recipe-invalid':
        return t('products.form.recipeInvalid');
      case 'recipe-duplicate':
        return t('products.form.recipeDuplicate');
      default:
        return undefined;
    }
  };

  const handleSave = (): void => {
    if (savingRef.current || submitting) {
      return;
    }
    savingRef.current = true;
    setSubmitted(true);
    if (!validation.valid) {
      savingRef.current = false;
      return;
    }
    onSave(values);
  };

  const handleStockModeChange = (mode: ProductStockMode): void => {
    setStockMode(mode);
    if (mode === 'direct') {
      setRecipeItems([]);
    } else if (mode === 'recipe') {
      setInventoryItemId(null);
      setSupplierId(null);
    }
  };

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));
  const inventoryOptions = inventoryItems.map((item) => ({ value: item.id, label: item.name }));
  const supplierOptions = suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }));

  return (
    <View style={styles.container}>
      <FormField
        label={t('products.form.nameLabel')}
        accessibilityLabel={t('products.form.nameLabel')}
        placeholder={t('products.form.namePlaceholder')}
        value={name}
        onChangeText={setName}
        autoCapitalize="sentences"
        error={submitted ? issueMessage(validation.name) : undefined}
        testID="product-name"
      />

      <View style={styles.group}>
        <ProductImagePicker
          imageUri={imageUri}
          onChange={(uri) => {
            setImageUri(uri);
            setImageError(null);
          }}
          onError={setImageError}
        />
        {imageError ? (
          <ThemedText type="body2" themeColor="danger">
            {t(
              imageError === 'permission-denied'
                ? 'products.form.imagePermissionDenied'
                : 'products.form.imageFailed',
            )}
          </ThemedText>
        ) : null}
      </View>

      <SelectField
        label={t('products.form.categoryLabel')}
        items={categoryOptions}
        value={categoryId}
        onChange={setCategoryId}
        noneLabel={t('products.form.categoryNone')}
        testIDPrefix="product-category"
      />

      <FormField
        label={t('products.form.priceLabel')}
        accessibilityLabel={t('products.form.priceLabel')}
        placeholder={t('products.form.pricePlaceholder')}
        value={priceInput}
        onChangeText={setPriceInput}
        keyboardType="decimal-pad"
        error={submitted ? issueMessage(validation.price) : undefined}
        testID="product-price"
      />

      <SegmentedControl
        label={t('products.form.trackInventoryLabel')}
        hint={t('products.form.trackInventoryHint')}
        value={stockMode}
        onChange={handleStockModeChange}
        options={[
          { value: 'none', label: t('products.form.stockModeNone') },
          { value: 'direct', label: t('products.form.stockModeDirect') },
          { value: 'recipe', label: t('products.form.stockModeRecipe') },
        ]}
        testIDPrefix="product-stock-mode"
      />

      {stockMode === 'direct' ? (
        <>
          <SelectField
            label={t('products.form.stockLabel')}
            hint={t('products.form.stockHint')}
            items={inventoryOptions}
            value={inventoryItemId}
            onChange={setInventoryItemId}
            noneLabel={t('products.form.stockNone')}
            testIDPrefix="product-stock"
          />

          {inventoryItemId != null ? (
            <SelectField
              label={t('products.form.supplierLabel')}
              hint={t('products.form.supplierHint')}
              items={supplierOptions}
              value={supplierId}
              onChange={setSupplierId}
              noneLabel={t('products.form.supplierNone')}
              testIDPrefix="product-supplier"
            />
          ) : null}
        </>
      ) : null}

      {stockMode === 'recipe' ? (
        <RecipeEditor
          items={recipeItems}
          inventoryItems={inventoryItems}
          onChange={setRecipeItems}
          error={submitted ? issueMessage(validation.recipe) : undefined}
        />
      ) : null}

      <AdvancedSection
        title={t('products.form.advancedTitle')}
        expanded={advancedExpanded}
        onToggle={() => setAdvancedExpanded((current) => !current)}>
        <FormField
          label={t('products.form.barcodeLabel')}
          accessibilityLabel={t('products.form.barcodeLabel')}
          placeholder={t('products.form.barcodePlaceholder')}
          value={barcode}
          onChangeText={setBarcode}
          autoCorrect={false}
          testID="product-barcode"
        />

        <FormField
          label={t('products.form.descriptionLabel')}
          accessibilityLabel={t('products.form.descriptionLabel')}
          placeholder={t('products.form.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          autoCapitalize="sentences"
          testID="product-description"
        />
      </AdvancedSection>

      {submitted && validation.stock ? (
        <ThemedText type="body2" themeColor="danger">
          {issueMessage(validation.stock)}
        </ThemedText>
      ) : null}

      {submitError ? (
        <ThemedText type="body2" themeColor="danger">
          {submitError}
        </ThemedText>
      ) : null}

      <PrimaryButton
        label={submitting ? t('products.form.savePending') : t('products.form.save')}
        icon="content-save-outline"
        disabled={submitting}
        onPress={handleSave}
      />

      {onDelete ? (
        <SecondaryButton
          label={t('products.form.delete')}
          icon="trash-can-outline"
          disabled={submitting}
          onPress={onDelete}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  group: {
    gap: Spacing.two,
  },
});
