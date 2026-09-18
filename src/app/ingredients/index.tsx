import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useCan } from '@/auth';

import { CatalogFilterBar } from '@/components/catalog-filter-bar';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { ensureDefaultUnits, listInventoryItems, listUnits, type InventoryItem, type Unit } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { formatQuantityMilli } from '@/lib/catalog-form';

/**
 * Ingredientes — management list under More → Catálogo. Answers "which
 * ingredients exist and how much do I have?" with search and a `+` action that
 * opens the create/edit screen. Operational stock actions live in the
 * Inventario tab; this screen owns ingredient records.
 */
export default function IngredientsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const canManage = useCan('catalog.manage');

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

  const renderAdd = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('ingredients.add')}
      hitSlop={Spacing.two}
      onPress={() => router.push('/ingredients/edit')}
      style={({ pressed }) => [styles.headerAction, pressed && styles.headerActionPressed]}>
      <MaterialCommunityIcons name="plus" size={24} color={theme.text} />
    </Pressable>
  );

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('ingredients.title'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
          headerRight: canManage ? renderAdd : undefined,
        }}
      />

      <ThemedText type="body2" themeColor="textSecondary">
        {t('ingredients.subtitle')}
      </ThemedText>

      {items.length > 0 ? (
        <CatalogFilterBar
          search={search}
          onSearchChange={setSearch}
          categories={[]}
          selectedCategoryId={null}
          onCategoryChange={() => {}}
          searchPlaceholder={t('ingredients.searchPlaceholder')}
          searchTestID="ingredients-search"
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
            title={t('ingredients.emptyTitle')}
            message={t('ingredients.emptyMessage')}
            {...(canManage
              ? {
                  actionLabel: t('ingredients.emptyAction'),
                  onActionPress: () => router.push('/ingredients/edit'),
                }
              : {})}
          />
        </View>
      ) : visible.length === 0 ? (
        <View style={styles.state}>
          <ThemedText type="body2" themeColor="textSecondary">
            {t('common.status.empty')}
          </ThemedText>
        </View>
      ) : (
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          {visible.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? (
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={!canManage}
                onPress={() => router.push({ pathname: '/ingredients/edit', params: { id: item.id } })}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
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
                    {`${formatQuantityMilli(item.currentQuantity)} ${unitSymbolFor(item.unitId)}`}
                  </ThemedText>
                </View>
              </Pressable>
            </View>
          ))}
        </ThemedView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
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
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three,
  },
  row: {
    minHeight: TouchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
  headerAction: {
    minWidth: TouchTarget.min,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionPressed: {
    opacity: 0.6,
  },
});
