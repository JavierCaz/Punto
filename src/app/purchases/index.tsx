import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useCan } from '@/auth';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Fonts, Radius, Spacing, TouchTarget } from '@/constants/theme';
import {
  getBusinessProfile,
  listPurchases,
  listSuppliers,
  type Purchase,
  type Supplier,
} from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatMoney } from '@/i18n/format';

/**
 * Purchase history: newest-first list of recorded purchases. Each row's total
 * IS the recorded expense (money out) and the purchase also posted the matching
 * stock-in movements (AGENTS §3.1).
 */
export default function PurchasesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const canManage = useCan('operations.manage');

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadFailed(false);
      setLoading(true);
      const [page, supplierList, profile] = await Promise.all([
        // Only COMPLETED purchases are money out; a cancelled purchase returned
        // its stock, so it must not appear as an expense.
        listPurchases({ status: 'COMPLETED' }),
        listSuppliers(),
        getBusinessProfile(),
      ]);
      setPurchases(page.items);
      setSuppliers(supplierList);
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

  const supplierNames = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));

  const renderAdd = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('purchases.add')}
      hitSlop={Spacing.two}
      onPress={() => router.push('/purchases/edit')}
      style={({ pressed }) => [styles.headerAction, pressed && styles.headerActionPressed]}>
      <MaterialCommunityIcons name="plus" size={24} color={theme.text} />
    </Pressable>
  );

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('purchases.title'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
          headerRight: canManage ? renderAdd : undefined,
        }}
      />

      <ThemedText type="body2" themeColor="textSecondary">
        {t('purchases.subtitle')}
      </ThemedText>

      {loading && purchases.length === 0 ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="body2" themeColor="textSecondary">
            {t('common.status.loading')}
          </ThemedText>
        </View>
      ) : loadFailed && purchases.length === 0 ? (
        <View style={styles.state}>
          <ThemedText type="body1">{t('common.status.error')}</ThemedText>
          <SecondaryButton label={t('common.actions.retry')} icon="refresh" onPress={() => void load()} />
        </View>
      ) : purchases.length === 0 ? (
        <View style={styles.state}>
          <EmptyState
            icon="cart-outline"
            title={t('purchases.emptyTitle')}
            message={t('purchases.emptyMessage')}
            {...(canManage
              ? {
                  actionLabel: t('purchases.emptyAction'),
                  onActionPress: () => router.push('/purchases/edit'),
                }
              : {})}
          />
        </View>
      ) : (
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          {purchases.map((purchase, index) => {
            const supplierName =
              purchase.supplierId != null ? supplierNames.get(purchase.supplierId) : undefined;
            return (
              <View key={purchase.id}>
                {index > 0 ? (
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                ) : null}
                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <ThemedText type="body1" numberOfLines={1}>
                      {purchase.purchaseNumber}
                    </ThemedText>
                    <ThemedText type="body2" themeColor="textSecondary" numberOfLines={1}>
                      {`${formatDate(purchase.createdAt)} · ${
                        supplierName ?? t('purchases.supplierFallback')
                      }`}
                    </ThemedText>
                  </View>
                  <View style={styles.amount}>
                    <ThemedText type="micro" themeColor="textSecondary">
                      {t('purchases.totalLabel')}
                    </ThemedText>
                    <ThemedText type="body1" style={styles.money}>
                      {formatMoney(purchase.totalMinor, currency)}
                    </ThemedText>
                    <ThemedText type="micro" themeColor="textSecondary">
                      {t('purchases.expenseLabel')}
                    </ThemedText>
                  </View>
                </View>
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
  amount: {
    alignItems: 'flex-end',
    gap: Spacing.half,
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
