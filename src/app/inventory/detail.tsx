import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import {
  adjustQuantity,
  getBusinessProfile,
  getInventoryItemById,
  listMovements,
  listSupplierItems,
  listSuppliers,
  listUnits,
  type InventoryItem,
  type InventoryMovement,
  type Supplier,
  type Unit,
} from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatMoney } from '@/i18n/format';
import { formatQuantityMilli, parseQuantityMilli } from '@/lib/catalog-form';

/** How many recent ledger entries the detail screen shows. */
const MOVEMENT_LIMIT = 20;

/** Fallback currency until the business profile loads (never user-facing copy). */
const FALLBACK_CURRENCY = 'MXN';

/** Find which supplier (if any) is currently linked to an inventory item. */
async function resolveSupplierForItem(
  suppliers: Supplier[],
  inventoryItemId: string | null,
): Promise<Supplier | null> {
  if (!inventoryItemId) {
    return null;
  }
  for (const supplier of suppliers) {
    const links = await listSupplierItems(supplier.id);
    if (links.some((link) => link.inventoryItemId === inventoryItemId)) {
      return supplier;
    }
  }
  return null;
}

/**
 * Read-only ingredient detail. Answers "what is this ingredient and what
 * happened to it?" with current stock, unit/cost/supplier info, the recent
 * movement ledger and a stock-count correction. Editing the ingredient
 * definition itself lives under More → Ingredients.
 */
export default function InventoryDetailScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [currency, setCurrency] = useState(FALLBACK_CURRENCY);
  // A missing id is a load failure from the first render — avoids a
  // synchronous setState in the effect (react-hooks/set-state-in-effect).
  const [loading, setLoading] = useState(id != null);
  const [loadFailed, setLoadFailed] = useState(id == null);
  const [adjustInput, setAdjustInput] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSaved, setAdjustSaved] = useState(false);

  const mountedRef = useRef(true);
  // The loader is (re)defined inside the effect so React treats it as an
  // effect concern (react-hooks/set-state-in-effect); `loadRef` lets the
  // adjust handler trigger the same reload after posting a movement.
  const loadRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let cancelled = false;
    mountedRef.current = true;

    async function load(): Promise<void> {
      if (!id) {
        return;
      }

      try {
        const [found, unitList, supplierList, profile, page] = await Promise.all([
          getInventoryItemById(id),
          listUnits(),
          listSuppliers(),
          getBusinessProfile(),
          listMovements({ inventoryItemId: id, limit: MOVEMENT_LIMIT }),
        ]);

        if (cancelled) {
          return;
        }
        if (!found) {
          setLoadFailed(true);
          return;
        }

        const linkedSupplier = await resolveSupplierForItem(supplierList, found.id);
        if (cancelled) {
          return;
        }

        setItem(found);
        setUnit(unitList.find((entry) => entry.id === found.unitId) ?? null);
        setSupplier(linkedSupplier);
        setCurrency(profile?.currencyCode ?? FALLBACK_CURRENCY);
        setMovements(page.items);
        setAdjustInput(formatQuantityMilli(found.currentQuantity));
        setLoadFailed(false);
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

    loadRef.current = load;
    if (id) {
      void load();
    }
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [id]);

  const handleAdjust = async (): Promise<void> => {
    if (!item) {
      return;
    }

    const parsed = parseQuantityMilli(adjustInput);
    if (parsed == null || parsed < 0) {
      setAdjustSaved(false);
      setAdjustError(t('inventory.detail.adjustInvalid'));
      return;
    }

    setAdjusting(true);
    setAdjustError(null);
    setAdjustSaved(false);
    try {
      await adjustQuantity({ inventoryItemId: item.id, newQuantity: parsed, reason: 'manual' });
      await loadRef.current();
      if (mountedRef.current) {
        setAdjustSaved(true);
      }
    } catch {
      if (mountedRef.current) {
        setAdjustError(t('inventory.detail.adjustFailed'));
      }
    } finally {
      if (mountedRef.current) {
        setAdjusting(false);
      }
    }
  };

  const unitSymbol = unit?.symbol ?? '';
  const outOfStock = item != null && item.currentQuantity <= 0;
  const lowStock =
    item != null &&
    !outOfStock &&
    item.minimumQuantity > 0 &&
    item.currentQuantity <= item.minimumQuantity;
  const badgeColor = outOfStock ? theme.danger : theme.warning;
  const badgeLabel = outOfStock ? t('inventory.outOfStock') : t('inventory.lowStock');

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: item ? item.name : t('inventory.title'),
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
      ) : loadFailed || !item ? (
        <View style={styles.state}>
          <ThemedText type="body1">{t('common.status.error')}</ThemedText>
        </View>
      ) : (
        <>
          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.stockHeader}>
              <ThemedText type="body2" themeColor="textSecondary">
                {t('inventory.currentStock')}
              </ThemedText>
              {outOfStock || lowStock ? (
                <View style={[styles.badge, { borderColor: badgeColor }]}>
                  <ThemedText type="micro" style={{ color: badgeColor }}>
                    {badgeLabel}
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <ThemedText type="display">
              {`${formatQuantityMilli(item.currentQuantity)} ${unitSymbol}`}
            </ThemedText>
          </ThemedView>

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <InfoRow
              label={t('inventory.detail.unit')}
              value={unit ? `${unit.name} (${unit.symbol})` : '—'}
            />
            <InfoRow
              label={t('inventory.detail.minStock')}
              value={`${formatQuantityMilli(item.minimumQuantity)} ${unitSymbol}`}
            />
            <InfoRow
              label={t('inventory.detail.cost')}
              value={formatMoney(item.unitCostMinor, currency)}
            />
            <InfoRow
              label={t('inventory.detail.supplier')}
              value={supplier ? supplier.name : t('inventory.detail.supplierNone')}
            />
          </ThemedView>

          <View style={styles.section}>
            <ThemedText type="heading2">{t('inventory.detail.movementsTitle')}</ThemedText>
            {movements.length === 0 ? (
              <ThemedText type="body2" themeColor="textSecondary">
                {t('inventory.detail.movementsEmpty')}
              </ThemedText>
            ) : (
              <View style={styles.movementList}>
                {movements.map((movement) => (
                  <View
                    key={movement.id}
                    style={[styles.movementRow, { borderColor: theme.border }]}>
                    <View style={styles.movementMain}>
                      <ThemedText type="body1">
                        {t(`inventory.movement.${movement.type}`)}
                      </ThemedText>
                      <ThemedText type="code" themeColor="textSecondary">
                        {formatSignedQuantity(movement.quantity, unitSymbol)}
                      </ThemedText>
                      {movement.reason ? (
                        <ThemedText type="body2" themeColor="textSecondary">
                          {movement.reason}
                        </ThemedText>
                      ) : null}
                    </View>
                    <ThemedText type="body2" themeColor="textSecondary">
                      {formatDate(movement.createdAt)}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="heading2">{t('inventory.detail.adjustTitle')}</ThemedText>
            <FormField
              label={t('inventory.detail.adjustLabel')}
              accessibilityLabel={t('inventory.detail.adjustLabel')}
              placeholder={formatQuantityMilli(item.currentQuantity)}
              value={adjustInput}
              onChangeText={(value) => {
                setAdjustInput(value);
                setAdjustError(null);
                setAdjustSaved(false);
              }}
              hint={t('inventory.detail.adjustHint')}
              error={adjustError ?? undefined}
              keyboardType="decimal-pad"
              testID="inventory-adjust-input"
            />
            {adjustSaved ? (
              <ThemedText type="body2" themeColor="success">
                {t('inventory.detail.adjustSaved')}
              </ThemedText>
            ) : null}
            <PrimaryButton
              label={t('inventory.detail.adjustSave')}
              onPress={() => void handleAdjust()}
              disabled={adjusting}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

/** Signed ledger quantity with an explicit `+` / `−` and the item's unit. */
function formatSignedQuantity(quantity: number, unitSymbol: string): string {
  if (quantity < 0) {
    return `−${formatQuantityMilli(Math.abs(quantity))} ${unitSymbol}`;
  }
  return `+${formatQuantityMilli(quantity)} ${unitSymbol}`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <ThemedText type="body2" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="body1" style={styles.infoValue}>
        {value}
      </ThemedText>
    </View>
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
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  stockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  badge: {
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  infoRow: {
    minHeight: TouchTarget.min,
    justifyContent: 'center',
    gap: Spacing.half,
  },
  infoValue: {
    flexShrink: 1,
  },
  section: {
    gap: Spacing.three,
  },
  movementList: {
    gap: Spacing.two,
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  movementMain: {
    flex: 1,
    gap: Spacing.half,
  },
});
