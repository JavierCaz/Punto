import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { listActiveEmployees, useAuthStore } from '@/auth';
import { PrimaryButton } from '@/components/primary-button';
import { ReceiptView } from '@/components/receipt-view';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';

import { Spacing } from '@/constants/theme';
import {
  cancelSale,
  getBusinessProfile,
  getSaleById,
  listPaymentMethods,
  refundSale,
  type PaymentMethod,
  type SaleDetail,
} from '@/db';
import { showConfirm, showMessage } from '@/dialog';
import { useTheme } from '@/hooks/use-theme';
import { useCartStore } from '@/pos/cart-store';

function fullName(firstName: string, lastName: string | null): string {
  return lastName ? `${firstName} ${lastName}` : firstName;
}

/** Deep-linkable receipt + refund/resume surface for one sale. */
export default function ReceiptScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);

  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [detail, profile, paymentMethods, employees] = await Promise.all([
        getSaleById(id),
        getBusinessProfile(),
        listPaymentMethods({ includeInactive: true }),
        listActiveEmployees(),
      ]);
      setSale(detail);
      setBusinessName(profile?.name ?? '');
      setLogoUri(profile?.logoUri ?? null);
      setCurrency(profile?.currencyCode ?? 'USD');
      setMethods(paymentMethods);
      const employee = detail?.employeeId
        ? employees.find((entry) => entry.id === detail.employeeId)
        : undefined;
      setEmployeeName(employee ? fullName(employee.firstName, employee.lastName) : null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleRefund = useCallback(async () => {
    if (!sale) {
      return;
    }
    setRefunding(true);
    try {
      await refundSale(sale.id, { employeeId: user?.id });
      await load();
    } catch {
      showMessage({
        title: t('common.status.error'),
        message: t('pos.receipt.refundFailed'),
        tone: 'danger',
      });
    } finally {
      setRefunding(false);
    }
  }, [sale, user, load, t]);

  const confirmRefund = (): void => {
    showConfirm({
      title: t('pos.receipt.refundConfirmTitle'),
      message: t('pos.receipt.refundConfirmMessage'),
      tone: 'danger',
      confirmLabel: t('pos.receipt.refund'),
      confirmTone: 'danger',
      onConfirm: () => void handleRefund(),
    });
  };

  const handleResume = async (): Promise<void> => {
    if (!sale) {
      return;
    }
    await useCartStore.getState().resume(sale.id);
    if (useCartStore.getState().saleId === sale.id) {
      router.replace('/');
    } else {
      showMessage({
        title: t('common.status.error'),
        message: t('pos.cart.resumeFailed'),
        tone: 'danger',
      });
    }
  };

  const handleCancelHeld = (): void => {
    if (!sale) {
      return;
    }
    showConfirm({
      title: t('pos.cart.discardConfirmTitle'),
      message: t('pos.cart.discardConfirmMessage'),
      tone: 'danger',
      confirmLabel: t('pos.cart.discard'),
      confirmTone: 'danger',
      onConfirm: () => {
        void (async () => {
          try {
            await cancelSale(sale.id);
            router.back();
          } catch {
            showMessage({
              title: t('common.status.error'),
              message: t('pos.cart.discardFailed'),
              tone: 'danger',
            });
          }
        })();
      },
    });
  };

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('pos.receipt.title'),
          headerBackTitle: t('common.actions.close'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
        }}
      />

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : !sale ? (
        <ThemedText type="body1" themeColor="textSecondary">
          {t('pos.receipt.notFound')}
        </ThemedText>
      ) : (
        <>
          <ReceiptView
            sale={sale}
            businessName={businessName}
            businessLogoUri={logoUri}
            currency={currency}
            paymentMethods={methods}
            employeeName={employeeName}
            testID="receipt-view"
          />

          {sale.status === 'COMPLETED' ? (
            <PrimaryButton
              label={t('pos.receipt.refund')}
              icon="undo-variant"
              disabled={refunding}
              onPress={confirmRefund}
            />
          ) : null}

          {sale.status === 'HELD' ? (
            <View style={styles.actions}>
              <SecondaryButton
                label={t('pos.cart.discard')}
                onPress={handleCancelHeld}
                style={styles.action}
              />
              <PrimaryButton
                label={t('pos.held.resume')}
                icon="cart-arrow-right"
                onPress={() => void handleResume()}
                style={styles.action}
              />
            </View>
          ) : null}
        </>
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
    paddingVertical: Spacing.five,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
});
