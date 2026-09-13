import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';

import { Fonts, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { getBusinessProfile, listSales, type Sale, type SaleStatus } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, formatMoney } from '@/i18n/format';

const STATUS_LABEL_KEY = {
  HELD: 'sales.status.HELD',
  COMPLETED: 'sales.status.COMPLETED',
  CANCELLED: 'sales.status.CANCELLED',
  REFUNDED: 'sales.status.REFUNDED',
} as const satisfies Record<SaleStatus, string>;

/** Sales history: every charged sale, linking to its deep-linkable receipt. */
export default function SalesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [sales, setSales] = useState<Sale[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<SaleStatus | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    void getBusinessProfile()
      .then((profile) => setCurrency(profile?.currencyCode ?? 'USD'))
      .catch(() => undefined);
  }, []);

  const load = useCallback(async (status: SaleStatus | null) => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const page = await listSales(status ? { status } : {});
      setSales(page.items);
      setCursor(page.nextCursor);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(filter);
    }, [load, filter]),
  );

  const loadMore = async (): Promise<void> => {
    if (!cursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await listSales({ ...(filter ? { status: filter } : {}), cursor });
      setSales((previous) => [...previous, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      // Keep the rows already loaded; a retry happens on the next scroll.
    } finally {
      setLoadingMore(false);
    }
  };

  const statusColor = (status: SaleStatus): string => {
    switch (status) {
      case 'COMPLETED':
        return theme.success;
      case 'REFUNDED':
        return theme.danger;
      case 'HELD':
        return theme.warning;
      default:
        return theme.textSecondary;
    }
  };

  const filters: { key: SaleStatus | null; label: string }[] = [
    { key: null, label: t('sales.filters.all') },
    { key: 'COMPLETED', label: t('sales.filters.completed') },
    { key: 'REFUNDED', label: t('sales.filters.refunded') },
    { key: 'CANCELLED', label: t('sales.filters.cancelled') },
  ];

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="body2" themeColor="textSecondary">
            {t('common.status.loading')}
          </ThemedText>
        </View>
      );
    }
    if (loadFailed) {
      return (
        <View style={styles.state}>
          <ThemedText type="body1">{t('sales.loadFailed')}</ThemedText>
          <SecondaryButton label={t('common.actions.retry')} icon="refresh" onPress={() => void load(filter)} />
        </View>
      );
    }
    if (sales.length === 0) {
      return (
        <View style={styles.state}>
          <EmptyState
            icon="receipt-text-outline"
            title={t('sales.empty.title')}
            message={t('sales.empty.message')}
            actionLabel={t('sales.emptyAction')}
            onActionPress={() => router.navigate('/')}
          />
        </View>
      );
    }
    return (
      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={theme.primary} style={styles.footer} />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            testID={`sale-row-${item.id}`}
            onPress={() => router.push({ pathname: '/receipt/[id]', params: { id: item.id } })}
            style={({ pressed }) => [
              styles.row,
              { borderColor: theme.border, backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <View style={styles.rowMain}>
              <ThemedText type="code">{item.saleNumber}</ThemedText>
              <ThemedText type="body2" themeColor="textSecondary">
                {formatDateTime(item.createdAt)}
              </ThemedText>
            </View>
            <View style={styles.rowEnd}>
              <ThemedText type="code" style={styles.total}>
                {formatMoney(item.totalMinor, currency)}
              </ThemedText>
              <ThemedText type="micro" style={{ color: statusColor(item.status) }}>
                {t(STATUS_LABEL_KEY[item.status])}
              </ThemedText>
            </View>
          </Pressable>
        )}
      />
    );
  };

  return (
    <Screen underWebTabBar contentContainerStyle={styles.screen}>
      <SectionHeader title={t('sales.title')} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
        contentContainerStyle={styles.filtersContent}>
        {filters.map((entry) => {
          const selected = entry.key === filter;
          return (
            <Pressable
              key={entry.key ?? 'all'}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              testID={`sales-filter-${entry.key ?? 'all'}`}
              onPress={() => setFilter(entry.key)}
              style={[
                styles.chip,
                selected
                  ? { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected }
                  : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <ThemedText type="body2" themeColor={selected ? 'primary' : 'textSecondary'}>
                {entry.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {renderBody()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: Spacing.three,
  },
  filters: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filtersContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  row: {
    minHeight: TouchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  rowMain: {
    flex: 1,
    gap: Spacing.half,
  },
  rowEnd: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  total: {
    fontFamily: Fonts.mono,
    fontWeight: '600',
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  footer: {
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
