import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { listCategories, updateCategory, type Category } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { canMoveCategory, reorderCategories, type ReorderDirection } from '@/lib/catalog-form';

export default function CategoriesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadFailed(false);
      setLoading(true);
      setCategories(await listCategories());
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

  const move = async (id: string, direction: ReorderDirection): Promise<void> => {
    const { ordered, changed } = reorderCategories(categories, id, direction);
    if (changed.length === 0) {
      return;
    }
    setCategories(ordered);
    setSavingOrder(true);
    try {
      await Promise.all(changed.map((patch) => updateCategory(patch.id, { sortOrder: patch.sortOrder })));
    } catch {
      await load();
    } finally {
      setSavingOrder(false);
    }
  };

  const renderAdd = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('categories.add')}
      hitSlop={Spacing.two}
      onPress={() => router.push('/categories/edit')}
      style={({ pressed }) => [styles.headerAction, pressed && styles.headerActionPressed]}>
      <MaterialCommunityIcons name="plus" size={24} color={theme.text} />
    </Pressable>
  );

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('categories.title'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
          headerRight: renderAdd,
        }}
      />

      <ThemedText type="body2" themeColor="textSecondary">
        {t('categories.subtitle')}
      </ThemedText>

      {loading && categories.length === 0 ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="body2" themeColor="textSecondary">
            {t('common.status.loading')}
          </ThemedText>
        </View>
      ) : loadFailed && categories.length === 0 ? (
        <View style={styles.state}>
          <ThemedText type="body1">{t('common.status.error')}</ThemedText>
          <SecondaryButton label={t('common.actions.retry')} icon="refresh" onPress={() => void load()} />
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.state}>
          <EmptyState
            icon="tag-outline"
            title={t('categories.emptyTitle')}
            message={t('categories.emptyMessage')}
            actionLabel={t('categories.add')}
            onActionPress={() => router.push('/categories/edit')}
          />
        </View>
      ) : (
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          {categories.map((category, index) => (
            <View key={category.id}>
              {index > 0 ? (
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              ) : null}
              <View style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  disabled={savingOrder}
                  onPress={() => router.push({ pathname: '/categories/edit', params: { id: category.id } })}
                  style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}>
                  <MaterialCommunityIcons name="tag-outline" size={22} color={theme.textSecondary} />
                  <ThemedText type="body1" numberOfLines={1} style={styles.rowTitle}>
                    {category.name}
                  </ThemedText>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('categories.moveUp')}
                  disabled={savingOrder || !canMoveCategory(categories, category.id, 'up')}
                  hitSlop={Spacing.one}
                  onPress={() => void move(category.id, 'up')}
                  style={styles.reorderButton}>
                  <MaterialCommunityIcons
                    name="chevron-up"
                    size={24}
                    color={
                      canMoveCategory(categories, category.id, 'up') && !savingOrder
                        ? theme.text
                        : theme.border
                    }
                  />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('categories.moveDown')}
                  disabled={savingOrder || !canMoveCategory(categories, category.id, 'down')}
                  hitSlop={Spacing.one}
                  onPress={() => void move(category.id, 'down')}
                  style={styles.reorderButton}>
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={24}
                    color={
                      canMoveCategory(categories, category.id, 'down') && !savingOrder
                        ? theme.text
                        : theme.border
                    }
                  />
                </Pressable>
              </View>
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
    paddingRight: Spacing.one,
  },
  rowMain: {
    flex: 1,
    minHeight: TouchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowTitle: {
    flex: 1,
  },
  reorderButton: {
    width: TouchTarget.min,
    height: TouchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
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
