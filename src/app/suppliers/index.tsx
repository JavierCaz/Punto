import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Radius, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { listSuppliers, type Supplier } from '@/db';
import { useTheme } from '@/hooks/use-theme';

export default function SuppliersScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoadFailed(false);
      setLoading(true);
      setSuppliers(await listSuppliers());
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

  const normalizedSearch = search.trim().toLowerCase();
  const visible =
    normalizedSearch.length === 0
      ? suppliers
      : suppliers.filter((supplier) => supplier.name.toLowerCase().includes(normalizedSearch));

  const renderAdd = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('suppliers.add')}
      hitSlop={Spacing.two}
      onPress={() => router.push('/suppliers/edit')}
      style={({ pressed }) => [styles.headerAction, pressed && styles.headerActionPressed]}>
      <MaterialCommunityIcons name="plus" size={24} color={theme.text} />
    </Pressable>
  );

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('suppliers.title'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
          headerRight: renderAdd,
        }}
      />

      <ThemedText type="body2" themeColor="textSecondary">
        {t('suppliers.subtitle')}
      </ThemedText>

      {suppliers.length > 0 ? (
        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('suppliers.searchPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text }]}
            accessibilityLabel={t('suppliers.searchPlaceholder')}
            testID="supplier-search"
          />
        </View>
      ) : null}

      {loading && suppliers.length === 0 ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="body2" themeColor="textSecondary">
            {t('common.status.loading')}
          </ThemedText>
        </View>
      ) : loadFailed && suppliers.length === 0 ? (
        <View style={styles.state}>
          <ThemedText type="body1">{t('common.status.error')}</ThemedText>
          <SecondaryButton label={t('common.actions.retry')} icon="refresh" onPress={() => void load()} />
        </View>
      ) : suppliers.length === 0 ? (
        <View style={styles.state}>
          <EmptyState
            icon="truck-outline"
            title={t('suppliers.emptyTitle')}
            message={t('suppliers.emptyMessage')}
            actionLabel={t('suppliers.emptyAction')}
            onActionPress={() => router.push('/suppliers/edit')}
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
          {visible.map((supplier, index) => {
            const contact = supplier.phone ?? supplier.email;
            return (
              <View key={supplier.id}>
                {index > 0 ? (
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/suppliers/edit', params: { id: supplier.id } })}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <MaterialCommunityIcons name="truck-outline" size={22} color={theme.textSecondary} />
                  <View style={styles.rowText}>
                    <ThemedText type="body1" numberOfLines={1}>
                      {supplier.name}
                    </ThemedText>
                    {contact ? (
                      <ThemedText type="body2" themeColor="textSecondary" numberOfLines={1}>
                        {contact}
                      </ThemedText>
                    ) : null}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </ThemedView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: TouchTarget.min,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.body1.fontSize,
    lineHeight: Typography.body1.lineHeight,
    paddingVertical: 0,
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
