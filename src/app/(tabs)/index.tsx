import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { listActiveEmployees, useAuthStore, type PublicEmployee } from '@/auth';
import { IncomeTrendChart } from '@/components/charts/income-trend-chart';
import { TopProductsChart } from '@/components/charts/top-products-chart';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { SectionHeader } from '@/components/section-header';
import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { HELD_SALE_TTL_HOURS } from '@/db';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useDashboard } from '@/hooks/use-dashboard';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatMoney } from '@/i18n/format';
import { DASHBOARD_PERIODS, type DashboardPeriod } from '@/lib/dashboard';

/**
 * Resumen (Dashboard) — the owner's at-a-glance answer to "how is my business
 * doing today and what should I do next?" (§5.2).
 *
 * Net is presented as NET CASH FLOW: completed sales + other income, minus
 * refunds, manual expenses and supplier purchases (stock bought today). The
 * line-item breakdown is always visible so a big purchase day is explainable
 * rather than looking like a loss.
 */

const PERIOD_LABEL_KEY = {
  day: 'dashboard.period.day',
  week: 'dashboard.period.week',
  month: 'dashboard.period.month',
  year: 'dashboard.period.year',
  all: 'dashboard.period.all',
} as const satisfies Record<DashboardPeriod, string>;

/** Period selector chip (Day / Week / Month / Year / All). */
function PeriodChip({
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
export default function DashboardScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const {
    model,
    loading,
    loadFailed,
    reload,
    period,
    setPeriod,
    employeeId,
    setEmployee,
  } = useDashboard();

  const isAdmin = user?.role === 'ADMIN';
  const [employees, setEmployees] = useState<PublicEmployee[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    void listActiveEmployees()
      .then(setEmployees)
      .catch(() => setEmployees([]));
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (loading && model === null) {
    return (
      <Screen underWebTabBar contentContainerStyle={styles.screen}>
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="body2" themeColor="textSecondary">
            {t('common.status.loading')}
          </ThemedText>
        </View>
      </Screen>
    );
  }

  if (loadFailed && model === null) {
    return (
      <Screen underWebTabBar contentContainerStyle={styles.screen}>
        <View style={styles.state}>
          <ThemedText type="body1">{t('dashboard.loadFailed')}</ThemedText>
          <SecondaryButton label={t('common.actions.retry')} icon="refresh" onPress={() => void reload()} />
        </View>
      </Screen>
    );
  }

  if (model === null) {
    return null;
  }

  const {
    totals,
    currency,
    report,
    trend,
    topProducts,
    lowStock,
    heldCount,
  } = model;


  const netColor = totals.netMinor < 0 ? theme.danger : theme.success;

  const breakdown: { label: string; amount: number; sign: number }[] = [
    { label: t('dashboard.salesLabel'), amount: model.salesMinor, sign: 1 },
    { label: t('dashboard.purchasesLabel'), amount: model.purchaseExpenseMinor, sign: -1 },
    { label: t('dashboard.manualExpensesLabel'), amount: model.manualExpenseMinor, sign: -1 },
    { label: t('dashboard.refundsLabel'), amount: model.refundsMinor, sign: -1 },
    { label: t('dashboard.otherIncomeLabel'), amount: model.otherIncomeMinor, sign: 1 },
  ].filter((entry) => entry.amount > 0);

  const hasProblems = lowStock.length > 0 || heldCount > 0;

  const attributedEmployee = employeeId
    ? employees.find((employee) => employee.id === employeeId)
    : undefined;
  const employeeName = attributedEmployee
    ? `${attributedEmployee.firstName}${attributedEmployee.lastName ? ` ${attributedEmployee.lastName}` : ''}`
    : null;
  const employeeItems = employees.map((employee) => ({
    value: employee.id,
    label: `${employee.firstName} ${employee.lastName ?? ''}`.trim(),
  }));

  return (
    <Screen scroll underWebTabBar contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <ThemedText type="heading1">{t('dashboard.title')}</ThemedText>
        <ThemedText type="body2" themeColor="textSecondary">
          {formatDate(new Date().toISOString())}
        </ThemedText>
      </View>

      {/* Needs your attention first: problems are actionable and point-in-time. */}
      <View style={styles.section}>
        <SectionHeader level="section" title={t('dashboard.problemsTitle')} />
        {hasProblems ? (
          <View style={styles.problems}>
            {lowStock.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                testID="dashboard-low-stock"
                onPress={() => router.navigate('/inventory')}
                style={({ pressed }) => [
                  styles.problemCard,
                  { borderColor: theme.warning, backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}>
                <MaterialCommunityIcons name="alert-outline" size={22} color={theme.warning} />
                <View style={styles.problemText}>
                  <ThemedText type="body1">{t('dashboard.lowStockTitle')}</ThemedText>
                  <ThemedText type="body2" themeColor="textSecondary">
                    {t('dashboard.lowStockCount', { count: lowStock.length })}
                  </ThemedText>
                </View>
                <ThemedText type="body2" style={{ color: theme.primary }}>
                  {t('dashboard.viewInventory')}
                </ThemedText>
              </Pressable>
            ) : null}

            {heldCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                testID="dashboard-held-sales"
                onPress={() => router.navigate('/pos')}
                style={({ pressed }) => [
                  styles.problemCard,
                  { borderColor: theme.warning, backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}>
                <MaterialCommunityIcons name="clock-outline" size={22} color={theme.warning} />
                <View style={styles.problemText}>
                  <ThemedText type="body1">{t('dashboard.heldTitle')}</ThemedText>
                  <ThemedText type="body2" themeColor="textSecondary">
                    {t('dashboard.heldCount', { count: heldCount })}
                  </ThemedText>
                  <ThemedText type="micro" themeColor="textSecondary">
                    {t('dashboard.heldHint', { hours: HELD_SALE_TTL_HOURS })}
                  </ThemedText>
                </View>
                <ThemedText type="body2" style={{ color: theme.primary }}>
                  {t('dashboard.viewHeld')}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <ThemedText type="body2" themeColor="textSecondary">
            {t('dashboard.noProblems')}
          </ThemedText>
        )}
      </View>

      {/* The period tabs scope the cash-flow figures, the trend and top products. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.periods}
        contentContainerStyle={styles.periodsContent}>
        {DASHBOARD_PERIODS.map((entry) => (
          <PeriodChip
            key={entry}
            label={t(PERIOD_LABEL_KEY[entry])}
            selected={entry === period}
            testID={`dashboard-period-${entry}`}
            onPress={() => setPeriod(entry)}
          />
        ))}
      </ScrollView>

      {isAdmin ? (
        <View style={styles.selectRow}>
          <SelectField
            items={employeeItems}
            value={employeeId}
            onChange={setEmployee}
            label={t('dashboard.employeeFilter')}
            noneLabel={t('dashboard.allEmployees')}
            testIDPrefix="dashboard-employee"
          />
        </View>
      ) : null}

      <ThemedView type="backgroundElement" style={[styles.netCard, { borderColor: theme.border }]}>
        <ThemedText type="body2" themeColor="textSecondary">
          {`${t('dashboard.netLabel')} · ${t(PERIOD_LABEL_KEY[period])}${
            employeeId ? ` · ${t('dashboard.businessWide')}` : ''
          }`}
        </ThemedText>
        <ThemedText type="display" testID="dashboard-net" style={{ color: netColor }}>
          {formatMoney(totals.netMinor, currency)}
        </ThemedText>

        {breakdown.length > 0 ? (
          <View style={[styles.breakdown, { borderTopColor: theme.border }]}>
            {breakdown.map((entry) => (
              <View key={entry.label} style={styles.breakdownRow}>
                <ThemedText type="body2" themeColor="textSecondary">
                  {entry.label}
                </ThemedText>
                <ThemedText
                  type="code"
                  style={{ color: entry.sign < 0 ? theme.danger : theme.success }}>
                  {entry.sign < 0 ? '−' : '+'}
                  {formatMoney(entry.amount, currency)}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}
      </ThemedView>

      <View style={styles.section}>
        <SectionHeader level="section" title={t('dashboard.salesSectionTitle')} />
        <ThemedView
          type="backgroundElement"
          style={[styles.reportCard, { borderColor: theme.border }]}>
          <ThemedText type="body2" themeColor="textSecondary" testID="dashboard-report-scope">
            {employeeName ?? t('dashboard.allEmployees')}
          </ThemedText>
          <View style={styles.reportMeta}>
            <ThemedText type="body2" themeColor="textSecondary">
              {t('dashboard.salesCount', { count: report.salesCount })}
            </ThemedText>
            <ThemedText type="body2" themeColor="textSecondary">
              {t('dashboard.averageTicket')}: {formatMoney(report.averageTicketMinor, currency)}
            </ThemedText>
          </View>
          <View style={styles.reportTotalRow}>
            <ThemedText type="body1">{t('dashboard.salesTotalLabel')}</ThemedText>
            <ThemedText type="code" testID="dashboard-report-total">
              {formatMoney(report.salesMinor, currency)}
            </ThemedText>
          </View>
        </ThemedView>
      </View>

      <View style={styles.section}>
        <SectionHeader level="section" title={t('dashboard.trendTitle')} />
        <ThemedView type="backgroundElement" style={[styles.chartCard, { borderColor: theme.border }]}>
          <IncomeTrendChart
            data={trend}
            period={period}
            currency={currency}
            testID="dashboard-trend-chart"
          />
        </ThemedView>
      </View>

      <View style={styles.section}>
        <SectionHeader level="section" title={t('dashboard.topProductsTitle')} />
        <ThemedView type="backgroundElement" style={[styles.chartCard, { borderColor: theme.border }]}>
          {topProducts.length > 0 ? (
            <TopProductsChart data={topProducts} testID="dashboard-top-products-chart" />
          ) : (
            <ThemedText type="body2" themeColor="textSecondary">
              {t('dashboard.topProductsEmpty')}
            </ThemedText>
          )}
        </ThemedView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: Spacing.three,
  },
  // Scrollable content container: no `flex: 1` (which would clamp the content
  // to the viewport height and defeat scrolling).
  content: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  header: {
    gap: Spacing.one,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  periods: {
    flexGrow: 0,
    flexShrink: 0,
  },
  periodsContent: {
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
  selectRow: {
    gap: Spacing.two,
  },
  reportCard: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  reportMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  reportTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  netCard: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  netMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  breakdown: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  problems: {
    gap: Spacing.two,
  },
  problemCard: {
    minHeight: TouchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  problemText: {
    flex: 1,
    gap: Spacing.half,
  },
  chartCard: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
