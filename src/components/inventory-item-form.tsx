import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { FormField } from './form-field';
import { PrimaryButton } from './primary-button';
import { SecondaryButton } from './secondary-button';
import { SelectField } from './select-field';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import type { InventoryItem, Supplier, Unit } from '@/db';
import {
  formatMoneyInput,
  formatQuantityMilli,
  parseMoneyInput,
  parseQuantityMilli,
} from '@/lib/catalog-form';

/** Values emitted by the ingredient form; money/quantities are already parsed. */
export type InventoryItemFormValues = {
  name: string;
  /** Selected unit id (never null when the form is valid). */
  unitId: string;
  /** Low-stock threshold in milli-units (0 when unset). */
  minimumQuantity: number;
  /** Estimated cost per display unit, minor currency (0 when unset). */
  unitCostMinor: number;
  supplierId: string | null;
  /** Raw initial-stock input (create only; parsed by the screen). */
  initialQuantityInput: string;
  /** Raw stock-count input (edit only; parsed by the screen). */
  adjustQuantityInput: string;
};

export type InventoryItemFormProps = {
  initialItem: InventoryItem | null;
  initialSupplierId: string | null;
  units: Unit[];
  suppliers: Supplier[];
  submitting: boolean;
  submitError?: string | null;
  onSave: (values: InventoryItemFormValues) => void;
  onDelete?: () => void;
};

/**
 * Create/edit form for a single ingredient (`inventory_item`): name, unit of
 * measure, optional low-stock threshold, optional cost and an optional
 * supplier link. Stock is never written here — the screen posts ledger
 * movements (`recordMovement` / `adjustQuantity`) from the parsed inputs.
 */
export function InventoryItemForm({
  initialItem,
  initialSupplierId,
  units,
  suppliers,
  submitting,
  submitError,
  onSave,
  onDelete,
}: InventoryItemFormProps) {
  const { t } = useTranslation();

  const savingRef = useRef(false);

  useEffect(() => {
    if (!submitting) {
      savingRef.current = false;
    }
  }, [submitting]);

  const [name, setName] = useState(initialItem?.name ?? '');
  const [unitId, setUnitId] = useState<string | null>(initialItem?.unitId ?? null);
  const [minStockInput, setMinStockInput] = useState(
    initialItem && initialItem.minimumQuantity > 0
      ? formatQuantityMilli(initialItem.minimumQuantity)
      : '',
  );
  const [costInput, setCostInput] = useState(
    initialItem && initialItem.unitCostMinor > 0 ? formatMoneyInput(initialItem.unitCostMinor) : '',
  );
  const [supplierId, setSupplierId] = useState<string | null>(initialSupplierId);
  const [initialQuantityInput, setInitialQuantityInput] = useState('');
  const [adjustQuantityInput, setAdjustQuantityInput] = useState(
    initialItem ? formatQuantityMilli(initialItem.currentQuantity) : '',
  );
  const [submitted, setSubmitted] = useState(false);

  // Empty optional fields parse to 0; invalid text parses to null and blocks save.
  const minStockValue =
    minStockInput.trim().length === 0 ? 0 : parseQuantityMilli(minStockInput);
  const costValue = costInput.trim().length === 0 ? 0 : parseMoneyInput(costInput);
  const initialQuantityValue =
    initialQuantityInput.trim().length === 0 ? 0 : parseQuantityMilli(initialQuantityInput);
  const adjustQuantityValue =
    adjustQuantityInput.trim().length === 0 ? 0 : parseQuantityMilli(adjustQuantityInput);

  const nameInvalid = name.trim().length === 0;
  const unitInvalid = unitId == null;
  const minStockInvalid = minStockValue == null || minStockValue < 0;
  const costInvalid = costValue == null || costValue < 0;
  const initialQuantityInvalid = initialQuantityValue == null || initialQuantityValue < 0;
  const adjustQuantityInvalid = adjustQuantityValue == null || adjustQuantityValue < 0;

  const handleSave = (): void => {
    if (savingRef.current || submitting) {
      return;
    }
    savingRef.current = true;
    setSubmitted(true);
    if (
      nameInvalid ||
      unitId == null ||
      minStockValue == null ||
      costValue == null ||
      initialQuantityValue == null ||
      adjustQuantityValue == null ||
      minStockInvalid ||
      costInvalid ||
      initialQuantityInvalid ||
      adjustQuantityInvalid
    ) {
      savingRef.current = false;
      return;
    }
    onSave({
      name: name.trim(),
      unitId,
      minimumQuantity: minStockValue,
      unitCostMinor: costValue,
      supplierId,
      initialQuantityInput,
      adjustQuantityInput,
    });
  };

  const unitOptions = units.map((unit) => ({
    value: unit.id,
    label: `${unit.name} (${unit.symbol})`,
  }));
  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier.id,
    label: supplier.name,
  }));

  const currentUnitSymbol = units.find((unit) => unit.id === initialItem?.unitId)?.symbol ?? '';

  return (
    <View style={styles.container}>
      <FormField
        label={t('inventory.form.nameLabel')}
        accessibilityLabel={t('inventory.form.nameLabel')}
        placeholder={t('inventory.form.namePlaceholder')}
        value={name}
        onChangeText={setName}
        autoCapitalize="sentences"
        error={submitted && nameInvalid ? t('inventory.form.nameRequired') : undefined}
        testID="inventory-name"
      />

      <SelectField
        label={t('inventory.form.unitLabel')}
        hint={t('inventory.form.unitHint')}
        placeholder={t('common.actions.select')}
        error={submitted && unitInvalid ? t('inventory.form.unitRequired') : undefined}
        items={unitOptions}
        value={unitId}
        onChange={setUnitId}
        testIDPrefix="inventory-unit"
      />

      <FormField
        label={t('inventory.form.minStockLabel')}
        accessibilityLabel={t('inventory.form.minStockLabel')}
        placeholder="0"
        hint={t('inventory.form.minStockHint')}
        value={minStockInput}
        onChangeText={setMinStockInput}
        keyboardType="decimal-pad"
        error={submitted && minStockInvalid ? t('inventory.form.minStockInvalid') : undefined}
        testID="inventory-min-stock"
      />

      <FormField
        label={t('inventory.form.costLabel')}
        accessibilityLabel={t('inventory.form.costLabel')}
        placeholder="0"
        hint={t('inventory.form.costHint')}
        value={costInput}
        onChangeText={setCostInput}
        keyboardType="decimal-pad"
        error={submitted && costInvalid ? t('inventory.form.costInvalid') : undefined}
        testID="inventory-cost"
      />

      {initialItem ? (
        <View style={styles.group}>
          <ThemedText type="body2" themeColor="textSecondary">
            {t('inventory.currentStock')}
          </ThemedText>
          <ThemedText type="code">
            {`${formatQuantityMilli(initialItem.currentQuantity)} ${currentUnitSymbol}`}
          </ThemedText>
          <FormField
            label={t('inventory.currentStock')}
            accessibilityLabel={t('inventory.currentStock')}
            placeholder="0"
            value={adjustQuantityInput}
            onChangeText={setAdjustQuantityInput}
            keyboardType="decimal-pad"
            error={
              submitted && adjustQuantityInvalid ? t('inventory.form.minStockInvalid') : undefined
            }
            testID="inventory-adjust-stock"
          />
        </View>
      ) : (
        <FormField
          label={t('inventory.currentStock')}
          accessibilityLabel={t('inventory.currentStock')}
          placeholder="0"
          value={initialQuantityInput}
          onChangeText={setInitialQuantityInput}
          keyboardType="decimal-pad"
          error={
            submitted && initialQuantityInvalid ? t('inventory.form.minStockInvalid') : undefined
          }
          testID="inventory-initial-stock"
        />
      )}

      <SelectField
        label={t('inventory.form.supplierLabel')}
        hint={t('inventory.form.supplierHint')}
        items={supplierOptions}
        value={supplierId}
        onChange={setSupplierId}
        noneLabel={t('inventory.form.supplierNone')}
        testIDPrefix="inventory-supplier"
      />

      {submitError ? (
        <ThemedText type="body2" themeColor="danger">
          {submitError}
        </ThemedText>
      ) : null}

      <PrimaryButton
        label={submitting ? t('inventory.form.savePending') : t('inventory.form.save')}
        icon="content-save-outline"
        disabled={submitting}
        onPress={handleSave}
      />

      {onDelete ? (
        <SecondaryButton
          label={t('inventory.form.delete')}
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
