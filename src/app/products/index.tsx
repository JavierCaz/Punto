import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { CatalogFilterBar } from '@/components/catalog-filter-bar';
import { EmptyState } from '@/components/empty-state';
import { ProductCard } from '@/components/product-card';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';

import { Spacing, TouchTarget } from '@/constants/theme';
import { useCatalog } from '@/hooks/use-catalog';
import { useTheme } from '@/hooks/use-theme';
import { filterProducts } from '@/lib/catalog-form';

const TABLET_BREAKPOINT = 768;

export default function ProductsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  const { products, categories, recipeProductIds, currency, loading, loadFailed, reload } = useCatalog();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const visible = filterProducts(products, { search, categoryId: categoryFilter });
  const resolveCategoryName = (categoryId: string | null): string | null =>
    categories.find((category) => category.id === categoryId)?.name ?? null;

  const renderAdd = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('products.add')}
      hitSlop={Spacing.two}
      onPress={() => router.push('/products/edit')}
      style={({ pressed }) => [styles.headerAction, pressed && styles.headerActionPressed]}>
      <MaterialCommunityIcons name="plus" size={24} color={theme.text} />
    </Pressable>
  );

  return (
    <Screen header contentContainerStyle={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('products.title'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
          headerRight: renderAdd,
        }}
      />

      {products.length > 0 ? (
        <CatalogFilterBar
          search={search}
          onSearchChange={setSearch}
          categories={categories}
          selectedCategoryId={categoryFilter}
          onCategoryChange={setCategoryFilter}
          searchPlaceholder={t('products.searchPlaceholder')}
          searchTestID="product-search"
        />
      ) : null}

      {loading && products.length === 0 ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="body2" themeColor="textSecondary">
            {t('common.status.loading')}
          </ThemedText>
        </View>
      ) : loadFailed && products.length === 0 ? (
        <View style={styles.state}>
          <ThemedText type="body1">{t('common.status.error')}</ThemedText>
          <SecondaryButton label={t('common.actions.retry')} icon="refresh" onPress={() => void reload()} />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.state}>
          <EmptyState
            icon="silverware-fork-knife"
            title={t('products.emptyTitle')}
            message={t('products.emptyMessage')}
            actionLabel={t('products.emptyAction')}
            onActionPress={() => router.push('/products/edit')}
          />
        </View>
      ) : (
        <FlatList
          key={isTablet ? 'grid' : 'list'}
          data={visible}
          keyExtractor={(item) => item.id}
          numColumns={isTablet ? 2 : 1}
          {...(isTablet ? { columnWrapperStyle: styles.gridRow } : {})}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              categoryName={resolveCategoryName(item.categoryId)}
              currency={currency}
              hasRecipe={recipeProductIds.has(item.id)}
              variant={isTablet ? 'grid' : 'list'}
              onPress={() => router.push({ pathname: '/products/edit', params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.state}>
              <ThemedText type="body2" themeColor="textSecondary">
                {t('common.status.empty')}
              </ThemedText>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: Spacing.three,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  gridRow: {
    gap: Spacing.three,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
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
