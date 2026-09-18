import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { SecondaryButton } from '@/components/secondary-button';
import { InventoryItemForm, type InventoryItemFormValues } from '@/components/inventory-item-form';
import { SectionHeader } from '@/components/section-header';
import { SetupEntryList } from '@/components/setup-entry-list';
import { ThemedText } from '@/components/themed-text';
import { WizardStep } from '@/components/wizard-step';

import { Spacing } from '@/constants/theme';
import {
  REPO_ERROR,
  archiveInventoryItem,
  ensureDefaultUnits,
  isRepoError,
  listInventoryItems,
  listSuppliers,
  type InventoryItem,
  type Supplier,
  type Unit,
} from '@/db';
import { showConfirm, showMessage } from '@/dialog';
import { useTheme } from '@/hooks/use-theme';
import { formatQuantity } from '@/i18n/format';
import { parseQuantityMilli } from '@/lib/catalog-form';
import { resolveSupplierForItem, saveIngredient } from '@/lib/catalog-save';

/** Setup step 5 — add ingredients (inventory items) with optional initial stock. */
export default function SetupIngredientsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [unitList, supplierList, itemList] = await Promise.all([
          ensureDefaultUnits(),
          listSuppliers(),
          listInventoryItems(),
        ]);
        if (!cancelled) {
          setUnits(unitList);
          setSuppliers(supplierList);
          setItems(itemList);
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
    router.push('/setup/products');
  };

  const unitSymbol = (unitId: string): string =>
    units.find((unit) => unit.id === unitId)?.symbol ?? '';

  const resetForm = (): void => {
    setEditingItem(null);
    setEditingSupplierId(null);
    setSubmitError(null);
    setFormKey((current) => current + 1);
  };

  const handleSave = async (values: InventoryItemFormValues): Promise<void> => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await saveIngredient(
        {
          name: values.name,
          unitId: values.unitId,
          minimumQuantity: values.minimumQuantity,
          unitCostMinor: values.unitCostMinor,
          initialQuantity: parseQuantityMilli(values.initialQuantityInput) ?? 0,
          adjustedQuantity: parseQuantityMilli(values.adjustQuantityInput) ?? 0,
          supplierId: values.supplierId,
        },
        editingItem ? { item: editingItem, initialSupplierId: editingSupplierId } : null,
      );
      setItems(await listInventoryItems());
      resetForm();
    } catch (error) {
      setSubmitError(
        isRepoError(error, REPO_ERROR.DUPLICATE)
          ? t('inventory.form.duplicate')
          : t('inventory.form.saveFailed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (id: string): void => {
    const found = items.find((item) => item.id === id);
    if (!found) {
      return;
    }
    setSubmitError(null);
    void (async () => {
      const supplierId = await resolveSupplierForItem(suppliers, found.id);
      setEditingItem(found);
      setEditingSupplierId(supplierId);
      setFormKey((current) => current + 1);
    })();
  };

  const handleDelete = (id: string): void => {
    const found = items.find((item) => item.id === id);
    if (!found) {
      return;
    }
    showConfirm({
      title: t('inventory.form.deleteConfirmTitle', { name: found.name }),
      message: t('inventory.form.deleteConfirmMessage'),
      tone: 'danger',
      confirmLabel: t('common.actions.delete'),
      confirmTone: 'danger',
      onConfirm: () => {
        void (async () => {
          try {
            await archiveInventoryItem(found.id);
            setItems(await listInventoryItems());
            if (editingItem?.id === found.id) {
              resetForm();
            }
          } catch {
            showMessage({
              title: t('common.status.error'),
              message: t('inventory.form.deleteFailed'),
              tone: 'danger',
            });
          }
        })();
      },
    });
  };

  return (
    <WizardStep
      stepId="ingredients"
      title={t('wizard.ingredientsTitle')}
      subtitle={t('wizard.ingredientsHint')}
      onBack={() => router.back()}
      onContinue={goNext}
      onSkip={goNext}
      busy={submitting}
      testID="setup-ingredients">
      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <>
          {items.length > 0 ? (
            <SetupEntryList
              title={t('wizard.added')}
              entries={items.map((item) => ({
                id: item.id,
                title: item.name,
                subtitle: `${formatQuantity(item.currentQuantity)} ${unitSymbol(item.unitId)}`.trim(),
              }))}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <ThemedText type="body2" themeColor="textSecondary">
              {t('wizard.ingredientsEmpty')}
            </ThemedText>
          )}

          <View style={styles.formSection}>
            <SectionHeader
              level="section"
              title={editingItem ? t('inventory.form.editTitle') : t('wizard.addIngredient')}
            />
            <InventoryItemForm
              key={formKey}
              initialItem={editingItem}
              initialSupplierId={editingSupplierId}
              units={units}
              suppliers={suppliers}
              submitting={submitting}
              submitError={submitError}
              onSave={(values) => void handleSave(values)}
            />
            {editingItem ? (
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
