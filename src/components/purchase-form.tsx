import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { FormField } from './form-field';
import { PrimaryButton } from './primary-button';
import { SecondaryButton } from './secondary-button';
import { SelectField } from './select-field';
import { ThemedText } from './themed-text';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import type { InventoryItem, PurchaseItemInput, Supplier } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/i18n/format';
import { parseMoneyInput, parseQuantityMilli } from '@/lib/catalog-form';

/** Payload emitted by the purchase form once it validates. */
export type PurchaseFormPayload = {
  supplierId: string | null;
  notes: string;
  items: PurchaseItemInput[];
};

/** One received line as edited in the form (parsed on save). */
type PurchaseLineValue = {
  inventoryItemId: string | null;
  quantityInput: string;
  costInput: string;
};

/** Per-line validation issue codes (mapped to i18n copy below). */
type PurchaseLineIssue =
  | 'itemRequired'
  | 'itemDuplicate'
  | 'quantityInvalid'
  | 'costInvalid'
  | null;

export type PurchaseFormProps = {
  inventoryItems: InventoryItem[];
  suppliers: Supplier[];
  /** ISO-4217 code from the business profile, for money formatting. */
  currency: string;
  submitting: boolean;
  submitError?: string | null;
  onSave: (payload: PurchaseFormPayload) => void;
};

const DEFAULT_QUANTITY = '1';

/**
 * Supplier-purchase entry form: pick a supplier, add ingredient lines with a
 * quantity and unit cost, and record the purchase. Recording is money out AND
 * stock in — the data layer posts both atomically (AGENTS §3.1), so this form
 * only collects and validates the lines and hands an integer-only payload to
 * the caller. Money is minor units, quantities are milli-units (AGENTS §6).
 */
export function PurchaseForm({
  inventoryItems,
  suppliers,
  currency,
  submitting,
  submitError,
  onSave,
}: PurchaseFormProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const savingRef = useRef(false);

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<PurchaseLineValue[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const parsedLines = lines.map((line) => ({
    quantity: parseQuantityMilli(line.quantityInput),
    cost: parseMoneyInput(line.costInput),
  }));

  // A repeated ingredient would post two stock-in movements for the same item
  // and double-count the weighted average; flag every occurrence.
  const duplicateIds = new Set<string>();
  const seenIds = new Set<string>();
  for (const line of lines) {
    if (line.inventoryItemId == null) {
      continue;
    }
    if (seenIds.has(line.inventoryItemId)) {
      duplicateIds.add(line.inventoryItemId);
    }
    seenIds.add(line.inventoryItemId);
  }

  const lineIssue = (index: number): PurchaseLineIssue => {
    const line = lines[index];
    if (line.inventoryItemId == null) {
      return 'itemRequired';
    }
    if (duplicateIds.has(line.inventoryItemId)) {
      return 'itemDuplicate';
    }
    const parsed = parsedLines[index];
    if (parsed.quantity == null || parsed.quantity <= 0) {
      return 'quantityInvalid';
    }
    if (parsed.cost == null || parsed.cost < 0) {
      return 'costInvalid';
    }
    return null;
  };

  const issueMessage = (issue: PurchaseLineIssue): string | null => {
    switch (issue) {
      case 'itemRequired':
        return t('purchases.form.itemRequired');
      case 'itemDuplicate':
        return t('purchases.form.itemDuplicate');
      case 'quantityInvalid':
        return t('purchases.form.quantityInvalid');
      case 'costInvalid':
        return t('purchases.form.costInvalid');
      default:
        return null;
    }
  };

  const lineSubtotalMinor = (index: number): number => {
    const parsed = parsedLines[index];
    if (parsed.quantity == null || parsed.cost == null) {
      return 0;
    }
    return Math.round((parsed.quantity * parsed.cost) / 1000);
  };

  const grandTotalMinor = lines.reduce((total, _line, index) => total + lineSubtotalMinor(index), 0);

  const valid = lines.length > 0 && lines.every((_line, index) => lineIssue(index) === null);

  const itemOptions = inventoryItems.map((item) => ({ value: item.id, label: item.name }));
  const supplierOptions = suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }));

  const updateLine = (index: number, patch: Partial<PurchaseLineValue>): void => {
    setLines((current) =>
      current.map((line, position) => (position === index ? { ...line, ...patch } : line)),
    );
  };

  const removeLine = (index: number): void => {
    setLines((current) => current.filter((_line, position) => position !== index));
  };

  const addLine = (): void => {
    setLines((current) => [
      ...current,
      { inventoryItemId: null, quantityInput: DEFAULT_QUANTITY, costInput: '' },
    ]);
  };

  const handleSave = (): void => {
    if (savingRef.current || submitting) {
      return;
    }
    savingRef.current = true;
    setSubmitted(true);
    if (!valid) {
      savingRef.current = false;
      return;
    }

    const items: PurchaseItemInput[] = lines.map((line, index) => {
      const item = inventoryItems.find((candidate) => candidate.id === line.inventoryItemId);
      return {
        inventoryItemId: line.inventoryItemId ?? '',
        quantity: parsedLines[index].quantity ?? 0,
        unitId: item?.unitId ?? '',
        unitCostMinor: parsedLines[index].cost ?? 0,
      };
    });

    onSave({ supplierId, notes, items });
  };

  return (
    <View style={styles.container}>
      <SelectField
        label={t('purchases.form.supplierLabel')}
        hint={t('purchases.form.supplierHint')}
        items={supplierOptions}
        value={supplierId}
        onChange={setSupplierId}
        noneLabel={t('purchases.form.supplierNone')}
        testIDPrefix="purchase-supplier"
      />

      <View style={styles.group}>
        <ThemedText type="body2" themeColor="textSecondary">
          {t('purchases.form.itemsLabel')}
        </ThemedText>
        <ThemedText type="body2" themeColor="textSecondary">
          {t('purchases.form.itemsHint')}
        </ThemedText>

        {inventoryItems.length === 0 ? (
          <ThemedText type="body2" themeColor="textSecondary">
            {t('purchases.form.noItems')}
          </ThemedText>
        ) : (
          <>
            {lines.map((line, index) => {
              const issue = lineIssue(index);
              const itemError =
                issue === 'itemRequired' || issue === 'itemDuplicate' ? issueMessage(issue) : null;
              return (
                <View
                  key={`purchase-line-${index}`}
                  style={[styles.line, { borderColor: theme.border }]}>
                  <SelectField
                    label={t('purchases.form.itemLabel')}
                    items={itemOptions}
                    value={line.inventoryItemId}
                    onChange={(value) => updateLine(index, { inventoryItemId: value })}
                    noneLabel={t('purchases.form.itemNone')}
                    testIDPrefix={`purchase-item-${index}`}
                  />
                  {submitted && itemError ? (
                    <ThemedText type="body2" themeColor="danger">
                      {itemError}
                    </ThemedText>
                  ) : null}

                  <FormField
                    label={t('purchases.form.quantityLabel')}
                    accessibilityLabel={t('purchases.form.quantityLabel')}
                    placeholder="0"
                    value={line.quantityInput}
                    onChangeText={(value) => updateLine(index, { quantityInput: value })}
                    keyboardType="decimal-pad"
                    error={submitted && issue === 'quantityInvalid' ? issueMessage(issue) ?? undefined : undefined}
                    testID={`purchase-quantity-${index}`}
                  />

                  <FormField
                    label={t('purchases.form.unitCostLabel')}
                    accessibilityLabel={t('purchases.form.unitCostLabel')}
                    placeholder="0"
                    value={line.costInput}
                    onChangeText={(value) => updateLine(index, { costInput: value })}
                    keyboardType="decimal-pad"
                    error={submitted && issue === 'costInvalid' ? issueMessage(issue) ?? undefined : undefined}
                    testID={`purchase-cost-${index}`}
                  />

                  <View style={styles.subtotalRow}>
                    <ThemedText type="body2" themeColor="textSecondary">
                      {t('purchases.totalLabel')}
                    </ThemedText>
                    <ThemedText type="body1" style={styles.money}>
                      {formatMoney(lineSubtotalMinor(index), currency)}
                    </ThemedText>
                  </View>

                  <SecondaryButton
                    label={t('purchases.form.removeItem')}
                    icon="trash-can-outline"
                    onPress={() => removeLine(index)}
                  />
                </View>
              );
            })}

            <SecondaryButton label={t('purchases.form.addItem')} icon="plus" onPress={addLine} />

            <View style={styles.totalRow}>
              <ThemedText type="heading2">{t('purchases.totalLabel')}</ThemedText>
              <ThemedText type="heading2" style={styles.money}>
                {formatMoney(grandTotalMinor, currency)}
              </ThemedText>
            </View>
          </>
        )}

        {submitted && lines.length === 0 ? (
          <ThemedText type="body2" themeColor="danger">
            {t('purchases.form.itemRequired')}
          </ThemedText>
        ) : null}
      </View>

      <FormField
        label={t('purchases.form.notesLabel')}
        accessibilityLabel={t('purchases.form.notesLabel')}
        placeholder={t('purchases.form.notesPlaceholder')}
        value={notes}
        onChangeText={setNotes}
        autoCapitalize="sentences"
        testID="purchase-notes"
      />

      {submitError ? (
        <ThemedText type="body2" themeColor="danger">
          {submitError}
        </ThemedText>
      ) : null}

      <PrimaryButton
        label={submitting ? t('purchases.form.savePending') : t('purchases.form.save')}
        icon="content-save-outline"
        disabled={submitting}
        onPress={handleSave}
      />
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
  line: {
    gap: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  subtotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  money: {
    fontFamily: Fonts.mono,
  },
});
