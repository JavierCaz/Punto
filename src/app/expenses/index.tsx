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

import { Fonts, Radius, Spacing, TouchTarget } from '@/constants/theme';
import {
  getBusinessProfile,
  listFinancialCategories,
  listFinancialTransactions,
  type FinancialCategory,
  type FinancialTransaction,
} from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatMoney } from '@/i18n/format';

/**
 * Manual expense/income history: newest-first list of `financial_transaction`
 * rows with a per-direction summary. Sales and supplier purchases have their
 * own ledgers and never appear here (AGENTS §3.1); this screen only shows the
 * money an owner records by hand.
 */
export default function ExpensesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadFailed(false);
      setLoading(true);
      const [page, categoryList, profile] = await Promise.all([
        listFinancialTransactions(),
        listFinancialCategories(),
        getBusinessProfile(),
      ]);
      setTransactions(page.items);
      setCategories(categoryList);
      setCurrency(profile?.currencyCode ?? 'USD');
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

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const categoryTypes = new Map(categories.map((category) => [category.id, category.type]));

  // Direction is implied by the category type; amounts are stored positive
  // (never signed), so the totals are plain integer sums (AGENTS §6).
  let incomeTotalMinor = 0;
  let expenseTotalMinor = 0;
  for (const transaction of transactions) {
    if (categoryTypes.get(transaction.categoryId) === 'INCOME') {
      incomeTotalMinor += transaction.amountMinor;
    } else {
      expenseTotalMinor += transaction.amountMinor;
    }
  }

  const renderAdd = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('expenses.add')}
      testID="expenses-add"
      hitSlop={Spacing.two}
      onPress={() => router.push('/expenses/edit')}
      style={({ pressed }) => [styles.headerAction, pressed && styles.headerActionPressed]}>
      <MaterialCommunityIcons name="plus" size={24} color={theme.text} />
    </Pressable>
  );

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('expenses.title'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
          headerRight: renderAdd,
        }}
      />

      <ThemedText type="body2" themeColor="textSecondary">
        {t('expenses.subtitle')}
      </ThemedText>

      {loading && transactions.length === 0 ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="body2" themeColor="textSecondary">
            {t('common.status.loading')}
          </ThemedText>
        </View>
      ) : loadFailed && transactions.length === 0 ? (
        <View style={styles.state}>
          <ThemedText type="body1">{t('common.status.error')}</ThemedText>
          <SecondaryButton label={t('common.actions.retry')} icon="refresh" onPress={() => void load()} />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.state}>
          <EmptyState
            icon="cash-minus"
            title={t('expenses.emptyTitle')}
            message={t('expenses.emptyMessage')}
            actionLabel={t('expenses.emptyAction')}
            onActionPress={() => router.push('/expenses/edit')}
          />
        </View>
      ) : (
        <>
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.summaryRow}>
              <ThemedText type="body2" themeColor="textSecondary">
                {t('expenses.incomeLabel')}
              </ThemedText>
              <ThemedText type="body1" style={[styles.money, { color: theme.success }]}>
                {`+${formatMoney(incomeTotalMinor, currency)}`}
              </ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryRow}>
              <ThemedText type="body2" themeColor="textSecondary">
                {t('expenses.expenseLabel')}
              </ThemedText>
              <ThemedText type="body1" style={[styles.money, { color: theme.danger }]}>
                {`−${formatMoney(expenseTotalMinor, currency)}`}
              </ThemedText>
            </View>
          </ThemedView>

          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            {transactions.map((transaction, index) => {
              const isIncome = categoryTypes.get(transaction.categoryId) === 'INCOME';
              const categoryName = categoryNames.get(transaction.categoryId) ?? '';
              return (
                <View key={transaction.id} testID={`expense-row-${transaction.id}`}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  ) : null}
                  <View style={styles.row}>
                    <View style={styles.rowText}>
                      <ThemedText type="body1" numberOfLines={1}>
                        {categoryName}
                      </ThemedText>
                      <ThemedText type="body2" themeColor="textSecondary" numberOfLines={1}>
                        {formatDate(transaction.createdAt)}
                      </ThemedText>
                    </View>
                    <ThemedText type="code" style={{ color: isIncome ? theme.success : theme.danger }}>
                      {`${isIncome ? '+' : '−'}${formatMoney(transaction.amountMinor, currency)}`}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </ThemedView>
        </>
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
  summaryRow: {
    minHeight: TouchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  money: {
    fontFamily: Fonts.mono,
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
