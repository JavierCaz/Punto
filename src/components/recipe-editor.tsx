import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { FormField } from './form-field';
import { OptionSelector } from './option-selector';
import { SecondaryButton } from './secondary-button';
import { ThemedText } from './themed-text';

import { Radius, Spacing } from '@/constants/theme';
import type { InventoryItem } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import type { RecipeLineValue } from '@/lib/catalog-form';

export type RecipeEditorProps = {
  items: RecipeLineValue[];
  inventoryItems: InventoryItem[];
  onChange: (items: RecipeLineValue[]) => void;
  /** Resolved i18n error message, when the recipe is invalid. */
  error?: string | null;
};

const DEFAULT_QUANTITY = '1';

/**
 * Recipe ingredient lines: each line picks one inventory item and a quantity
 * (in the item's display unit). The product's stock is deducted from these
 * ingredients when sold (AGENTS §3.1). Ingredients are optional until the
 * owner turns inventory tracking on.
 */
export function RecipeEditor({ items, inventoryItems, onChange, error }: RecipeEditorProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (inventoryItems.length === 0) {
    return (
      <View style={styles.container}>
        <ThemedText type="body2" themeColor="textSecondary">
          {t('products.form.recipeLabel')}
        </ThemedText>
        <ThemedText type="body2" themeColor="textSecondary">
          {t('products.form.recipeNoItems')}
        </ThemedText>
      </View>
    );
  }

  const itemOptions = inventoryItems.map((item) => ({ value: item.id, label: item.name }));

  const updateLine = (index: number, patch: Partial<RecipeLineValue>): void => {
    onChange(items.map((line, position) => (position === index ? { ...line, ...patch } : line)));
  };

  const removeLine = (index: number): void => {
    onChange(items.filter((_, position) => position !== index));
  };

  const addLine = (): void => {
    onChange([...items, { inventoryItemId: null, quantityInput: DEFAULT_QUANTITY }]);
  };

  return (
    <View style={styles.container}>
      <ThemedText type="body2" themeColor="textSecondary">
        {t('products.form.recipeHint')}
      </ThemedText>

      {items.map((line, index) => (
        <View
          key={`recipe-line-${index}`}
          style={[styles.line, { borderColor: theme.border }]}>
          <OptionSelector
            items={itemOptions}
            value={line.inventoryItemId}
            onChange={(value) => updateLine(index, { inventoryItemId: value })}
            noneLabel={t('products.form.stockNone')}
            testIDPrefix={`recipe-item-${index}`}
          />
          <FormField
            label={t('products.form.recipeQuantityLabel')}
            accessibilityLabel={t('products.form.recipeQuantityLabel')}
            placeholder="0"
            value={line.quantityInput}
            onChangeText={(value) => updateLine(index, { quantityInput: value })}
            keyboardType="decimal-pad"
            testID={`recipe-quantity-${index}`}
          />
          <SecondaryButton
            label={t('products.form.recipeRemove')}
            icon="trash-can-outline"
            onPress={() => removeLine(index)}
          />
        </View>
      ))}

      {error ? (
        <ThemedText type="body2" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <SecondaryButton
        label={t('products.form.recipeAdd')}
        icon="plus"
        onPress={addLine}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  line: {
    gap: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
});
