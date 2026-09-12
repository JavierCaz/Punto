import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { InventoryItemForm, type InventoryItemFormValues } from '@/components/inventory-item-form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

import { Spacing } from '@/constants/theme';
import {
  REPO_ERROR,
  adjustQuantity,
  archiveInventoryItem,
  createInventoryItem,
  deleteSupplierItem,
  getInventoryItemById,
  isRepoError,
  listSupplierItems,
  listSuppliers,
  listUnits,
  recordMovement,
  updateInventoryItem,
  upsertSupplierItem,
  type InventoryItem,
  type Supplier,
  type Unit,
} from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { parseQuantityMilli } from '@/lib/catalog-form';

/** Find which supplier (if any) is currently linked to an inventory item. */
async function resolveSupplierForItem(
  suppliers: Supplier[],
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
async function removeSupplierLink(
  supplierId: string,
  inventoryItemId: string,
): Promise<void> {
  const links = await listSupplierItems(supplierId);
  const link = links.find((entry) => entry.inventoryItemId === inventoryItemId);
  if (link) {
    await deleteSupplierItem(link.id);
  }
}

export default function InventoryItemEditScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const editing = typeof id === 'string' && id.length > 0;

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [initialSupplierId, setInitialSupplierId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const [unitList, supplierList] = await Promise.all([listUnits(), listSuppliers()]);

        let foundItem: InventoryItem | null = null;
        if (editing) {
          foundItem = await getInventoryItemById(id);
          if (!foundItem) {
            if (!cancelled) {
              setLoadFailed(true);
            }
            return;
          }
        }

        const supplierId = await resolveSupplierForItem(supplierList, foundItem?.id ?? null);

        if (cancelled) {
          return;
        }
        setUnits(unitList);
        setSuppliers(supplierList);
        setItem(foundItem);
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

  const handleSave = async (values: InventoryItemFormValues): Promise<void> => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const initialQuantity = parseQuantityMilli(values.initialQuantityInput) ?? 0;
      const adjustedQuantity = parseQuantityMilli(values.adjustQuantityInput) ?? 0;

      if (item) {
        await updateInventoryItem(item.id, {
          name: values.name,
          unitId: values.unitId,
          minimumQuantity: values.minimumQuantity,
          unitCostMinor: values.unitCostMinor,
        });

        // The stock cache is ledger-owned: a manual count posts an ADJUSTMENT.
        if (adjustedQuantity !== item.currentQuantity) {
          await adjustQuantity({
            inventoryItemId: item.id,
            newQuantity: adjustedQuantity,
            reason: 'manual',
          });
        }

        // Only touch the link when the supplier actually changed — re-upserting
        // an unchanged link would reset its SKU/last-price to null/0.
        if (values.supplierId && values.supplierId !== initialSupplierId) {
          await upsertSupplierItem({
            supplierId: values.supplierId,
            inventoryItemId: item.id,
          });
        }
        if (initialSupplierId && initialSupplierId !== values.supplierId) {
          await removeSupplierLink(initialSupplierId, item.id);
        }
      } else {
        const created = await createInventoryItem({
          name: values.name,
          unitId: values.unitId,
          minimumQuantity: values.minimumQuantity,
          unitCostMinor: values.unitCostMinor,
        });

        if (initialQuantity > 0) {
          await recordMovement({
            inventoryItemId: created.id,
            type: 'INITIAL_STOCK',
            quantity: initialQuantity,
          });
        }

        if (values.supplierId) {
          await upsertSupplierItem({
            supplierId: values.supplierId,
            inventoryItemId: created.id,
          });
        }
      }

      router.back();
    } catch (error) {
      setSubmitError(
        isRepoError(error, REPO_ERROR.DUPLICATE)
          ? t('inventory.form.duplicate')
          : t('inventory.form.saveFailed'),
      );
      setSubmitting(false);
    }
  };

  const handleDelete = (): void => {
    if (!item) {
      return;
    }
    const name = item.name;
    Alert.alert(
      t('inventory.form.deleteConfirmTitle', { name }),
      t('inventory.form.deleteConfirmMessage'),
      [
        { text: t('common.actions.cancel'), style: 'cancel' },
        {
          text: t('common.actions.delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await archiveInventoryItem(item.id);
                router.back();
              } catch {
                Alert.alert(t('common.status.error'), t('inventory.form.deleteFailed'));
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: editing ? t('inventory.form.editTitle') : t('inventory.form.newTitle'),
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
        <InventoryItemForm
          initialItem={item}
          initialSupplierId={initialSupplierId}
          units={units}
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
