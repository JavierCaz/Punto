import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { CatalogFilterBar } from '@/components/catalog-filter-bar';
import { EmptyState } from '@/components/empty-state';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import {
  ensureDefaultUnits,
  getStockStatus,
  listInventoryItems,
  listUnits,
  type InventoryItem,
  type Unit,
} from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { formatQuantityMilli } from '@/lib/catalog-form';

/**
 * Inventario — the ingredient list. Answers "what do I have and what is
 * running low?" (§5.2) with search, current stock per item and low/out-of-stock
 * badges. Tapping a row opens the create/edit screen.
 */
export default function InventoryScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadFailed(false);
      setLoading(true);
      // Guarantees the default g/ml/unit exist before any item references them.
      await ensureDefaultUnits();
      const [itemList, unitList] = await Promise.all([listInventoryItems(), listUnits()]);
      setItems(itemList);
      setUnits(unitList);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const term = search.trim().toLowerCase();
  const visible =
    term.length === 0 ? items : items.filter((item) => item.name.toLowerCase().includes(term));

  const unitSymbolFor = (unitId: string): string =>
    units.find((unit) => unit.id === unitId)?.symbol ?? '';

  return (
    <Screen underWebTabBar contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="heading1">{t('inventory.title')}</ThemedText>
          <ThemedText type="body2" themeColor="textSecondary">
            {t('inventory.subtitle')}
          </ThemedText>
        </View>
      </View>

      {items.length > 0 ? (
        <CatalogFilterBar
          search={search}
          onSearchChange={setSearch}
          categories={[]}
          selectedCategoryId={null}
          onCategoryChange={() => {}}
          searchPlaceholder={t('inventory.searchPlaceholder')}
          searchTestID="inventory-search"
        />
      ) : null}

      {loading && items.length === 0 ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="body2" themeColor="textSecondary">
            {t('common.status.loading')}
          </ThemedText>
        </View>
      ) : loadFailed && items.length === 0 ? (
        <View style={styles.state}>
          <ThemedText type="body1">{t('common.status.error')}</ThemedText>
          <SecondaryButton label={t('common.actions.retry')} icon="refresh" onPress={() => void load()} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.state}>
          <EmptyState
            icon="package-variant-closed"
            title={t('inventory.emptyTitle')}
            message={t('inventory.emptyMessage')}
            actionLabel={t('inventory.emptyAction')}
            onActionPress={() => router.push('/ingredients')}
          />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const unitSymbol = unitSymbolFor(item.unitId);
            const status = getStockStatus(item.currentQuantity, item.minimumQuantity);
            const badgeColor = status === 'out' ? theme.danger : theme.warning;

            return (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/inventory/detail', params: { id: item.id } })
                }
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={22}
                  color={theme.textSecondary}
                />
                <View style={styles.rowText}>
                  <ThemedText type="body1" numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                  <ThemedText type="code" themeColor="textSecondary">
                    {`${formatQuantityMilli(item.currentQuantity)} ${unitSymbol}`}
                  </ThemedText>
                </View>
                {status !== 'ok' ? (
                  <View style={[styles.badge, { borderColor: badgeColor }]}>
                    <ThemedText type="micro" style={{ color: badgeColor }}>
                      {status === 'out' ? t('inventory.outOfStock') : t('inventory.lowStock')}
                    </ThemedText>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.state}>
              <ThemedText type="body2" themeColor="textSecondary">
                {t('common.status.empty')}
              </ThemedText>
            </View>
          }
        />
      )}
      <PrimaryButton
        label={t('inventory.purchase')}
        icon="cart-plus"
        onPress={() => router.push('/purchases/edit')}
      />

    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
    gap: Spacing.one,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  row: {
    minHeight: TouchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  badge: {
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
});
