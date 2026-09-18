import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { listActiveEmployees, useCan, type PublicEmployee } from '@/auth';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { SectionHeader } from '@/components/section-header';
import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';

import { Fonts, Radius, Spacing, TouchTarget } from '@/constants/theme';
import {
  getBusinessProfile,
  getSalesTotals,
  listPaymentMethods,
  listSales,
  type PaymentMethod,
  type Sale,
  type SaleFilter,
  type SaleStatus,
  type SalesTotals,
} from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, formatMoney } from '@/i18n/format';
import { dayRange, trailingDayRange } from '@/lib/dashboard';

const STATUS_LABEL_KEY = {
  HELD: 'sales.status.HELD',
  COMPLETED: 'sales.status.COMPLETED',
  CANCELLED: 'sales.status.CANCELLED',
  REFUNDED: 'sales.status.REFUNDED',
} as const satisfies Record<SaleStatus, string>;

/** Date-range chips; `all` intentionally sends no `from`/`to` to the query. */
type DateRangeFilter = 'all' | 'today' | 'last7' | 'last30';

const DATE_FILTERS = [
  { key: 'all', labelKey: 'sales.filters.dateAll', testID: 'sales-date-all' },
  { key: 'today', labelKey: 'sales.filters.today', testID: 'sales-date-today' },
  { key: 'last7', labelKey: 'sales.filters.last7', testID: 'sales-date-last7' },
  { key: 'last30', labelKey: 'sales.filters.last30', testID: 'sales-date-last30' },
] as const satisfies readonly { key: DateRangeFilter; labelKey: string; testID: string }[];

/** Shared chip used by both the status and date-range filter rows. */
function FilterChip({
  label,
  selected,
  testID,
  onPress,
}: {
  label: string;
  selected: boolean;
  testID: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected }
          : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <ThemedText type="body2" themeColor={selected ? 'primary' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Sales history: every charged sale, linking to its deep-linkable receipt. */
export default function SalesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  // Employees are limited to recent history (Today / 7 days); full range is admin-only.
  const canViewAllSales = useCan('sales.viewAll');

  const [sales, setSales] = useState<Sale[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SaleStatus | null>(null);
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>(canViewAllSales ? 'all' : 'today');
  const [methodId, setMethodId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [employees, setEmployees] = useState<PublicEmployee[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [summary, setSummary] = useState<SalesTotals | null>(null);

  useEffect(() => {
    void getBusinessProfile()
      .then((profile) => setCurrency(profile?.currencyCode ?? 'USD'))
      .catch(() => undefined);
    void listPaymentMethods()
      .then(setPaymentMethods)
      .catch(() => undefined);
    void listActiveEmployees()
      .then(setEmployees)
      .catch(() => undefined);
  }, []);

  /** Compose the active filter set; unset filters are omitted so the query stays `{}`. */
  const buildFilter = useCallback((): SaleFilter => {
    const query: SaleFilter = {};
    if (statusFilter !== null) {
      query.status = statusFilter;
    }
    if (methodId !== null) {
      query.paymentMethodId = methodId;
    }
    if (employeeId !== null) {
      query.employeeId = employeeId;
    }
    if (dateFilter === 'today') {
      const { from, to } = dayRange();
      query.from = from;
      query.to = to;
    } else if (dateFilter === 'last7') {
      const { from, to } = trailingDayRange(7);
      query.from = from;
      query.to = to;
    } else if (dateFilter === 'last30') {
      const { from, to } = trailingDayRange(30);
      query.from = from;
      query.to = to;
    }
    return query;
  }, [statusFilter, dateFilter, methodId, employeeId]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const filter = buildFilter();
      const [page, totals] = await Promise.all([listSales(filter), getSalesTotals(filter)]);
      setSales(page.items);
      setCursor(page.nextCursor);
      setSummary(totals);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [buildFilter]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const loadMore = async (): Promise<void> => {
    if (!cursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await listSales({ ...buildFilter(), cursor });
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

  const statusFilters: { key: SaleStatus | null; label: string }[] = [
    { key: null, label: t('sales.filters.all') },
    { key: 'COMPLETED', label: t('sales.filters.completed') },
    { key: 'REFUNDED', label: t('sales.filters.refunded') },
    { key: 'CANCELLED', label: t('sales.filters.cancelled') },
  ];

  const methodItems = paymentMethods.map((method) => ({ value: method.id, label: method.name }));
  const employeeItems = employees.map((employee) => ({
    value: employee.id,
    label: `${employee.firstName} ${employee.lastName ?? ''}`.trim(),
  }));

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
          <SecondaryButton label={t('common.actions.retry')} icon="refresh" onPress={() => void load()} />
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
            onActionPress={() => router.navigate('/pos')}
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
        {statusFilters.map((entry) => (
          <FilterChip
            key={entry.key ?? 'all'}
            label={entry.label}
            selected={entry.key === statusFilter}
            testID={`sales-filter-${entry.key ?? 'all'}`}
            onPress={() => setStatusFilter(entry.key)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
        contentContainerStyle={styles.filtersContent}>
        {(canViewAllSales ? DATE_FILTERS : DATE_FILTERS.filter((entry) => entry.key === 'today' || entry.key === 'last7')).map((entry) => (
          <FilterChip
            key={entry.key}
            label={t(entry.labelKey)}
            selected={entry.key === dateFilter}
            testID={entry.testID}
            onPress={() => setDateFilter(entry.key)}
          />
        ))}
      </ScrollView>

      <View style={styles.selectRow}>
        <View style={styles.selectColumn}>
          <SelectField
            items={methodItems}
            value={methodId}
            onChange={setMethodId}
            label={t('sales.filters.method')}
            noneLabel={t('sales.filters.allMethods')}
            testIDPrefix="sales-method"
          />
        </View>
        <View style={styles.selectColumn}>
          <SelectField
            items={employeeItems}
            value={employeeId}
            onChange={setEmployeeId}
            label={t('sales.filters.employee')}
            noneLabel={t('sales.filters.allEmployees')}
            testIDPrefix="sales-employee"
          />
        </View>
      </View>

      {summary && !loading ? (
        <View
          style={[
            styles.summary,
            { borderColor: theme.border, backgroundColor: theme.backgroundElement },
          ]}>
          <ThemedText type="body2" themeColor="textSecondary">
            {t('sales.summaryCount', { count: summary.count })}
          </ThemedText>
          <ThemedText type="code" testID="sales-summary-total">
            {formatMoney(summary.totalMinor, currency)}
          </ThemedText>
        </View>
      ) : null}

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
  summary: {
    minHeight: TouchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  selectColumn: {
    flex: 1,
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
