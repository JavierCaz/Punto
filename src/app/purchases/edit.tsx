import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PurchaseForm, type PurchaseFormPayload } from '@/components/purchase-form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

import { Spacing } from '@/constants/theme';
import {
  createPurchase,
  getBusinessProfile,
  listInventoryItems,
  listSuppliers,
  type InventoryItem,
  type Supplier,
} from '@/db';
import { useTheme } from '@/hooks/use-theme';

/**
 * Supplier-purchase entry screen. Recording a purchase is money out + stock in:
 * `createPurchase` inserts the purchase (the expense record) and posts the
 * PURCHASE inventory movements in one transaction, so this screen never calls a
 * finance API (AGENTS §3.1).
 */
export default function PurchaseEditScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        setLoadFailed(false);
        setLoading(true);
        const [items, supplierList, profile] = await Promise.all([
          listInventoryItems(),
          listSuppliers(),
          getBusinessProfile(),
        ]);
        if (cancelled) {
          return;
        }
        setInventoryItems(items);
        setSuppliers(supplierList);
        setCurrency(profile?.currencyCode ?? 'USD');
      } catch {
        if (!cancelled) {
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (payload: PurchaseFormPayload): Promise<void> => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createPurchase({
        supplierId: payload.supplierId ?? undefined,
        notes: payload.notes.trim() || undefined,
        items: payload.items,
      });
      router.back();
    } catch {
      setSubmitError(t('purchases.form.saveFailed'));
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('purchases.form.newTitle'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
        }}
      />

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="body2" themeColor="textSecondary">
            {t('common.status.loading')}
          </ThemedText>
        </View>
      ) : loadFailed ? (
        <View style={styles.state}>
          <ThemedText type="body1">{t('common.status.error')}</ThemedText>
        </View>
      ) : (
        <PurchaseForm
          inventoryItems={inventoryItems}
          suppliers={suppliers}
          currency={currency}
          submitting={submitting}
          submitError={submitError}
          onSave={(payload) => void handleSave(payload)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
});
