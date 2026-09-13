import type { JSX } from 'react';

import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import type { PaymentMethod, SaleDetail } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, formatMoney, formatQuantity } from '@/i18n/format';

export type ReceiptViewProps = {
  sale: SaleDetail;
  businessName: string;
  businessLogoUri?: string | null;
  /** Business currency code, e.g. 'MXN'. */
  currency: string;
  /** Resolves payment method names for the payments section. */
  paymentMethods: PaymentMethod[];
  /** Optional "who made this sale" name. */
  employeeName?: string | null;
  testID?: string;
};

/** Static i18n keys for the lifecycle status label (§7.1 status colors). */
type StatusLabelKey =
  | 'sales.status.HELD'
  | 'sales.status.COMPLETED'
  | 'sales.status.CANCELLED'
  | 'sales.status.REFUNDED';

const STATUS_LABEL_KEY: Record<SaleDetail['status'], StatusLabelKey> = {
  HELD: 'sales.status.HELD',
  COMPLETED: 'sales.status.COMPLETED',
  CANCELLED: 'sales.status.CANCELLED',
  REFUNDED: 'sales.status.REFUNDED',
};

/** Non-completed statuses surface a prominent banner; COMPLETED stays quiet. */
const STATUS_BANNER: Partial<
  Record<
    SaleDetail['status'],
    {
      key: 'pos.receipt.refundedBanner' | 'pos.receipt.cancelledBanner' | 'pos.receipt.heldBanner';
      tone: 'danger' | 'warning';
    }
>
> = {
  REFUNDED: { key: 'pos.receipt.refundedBanner', tone: 'danger' },
  CANCELLED: { key: 'pos.receipt.cancelledBanner', tone: 'danger' },
  HELD: { key: 'pos.receipt.heldBanner', tone: 'warning' },
};

/** Semantic tone for the lifecycle status label. */
const STATUS_TONE: Record<SaleDetail['status'], 'success' | 'warning' | 'danger'> = {
  COMPLETED: 'success',
  HELD: 'warning',
  REFUNDED: 'danger',
  CANCELLED: 'danger',
};

/**
 * Read-only sale receipt / transaction detail. Purely presentational: the
 * owning route (`/receipt/[id]`, sales-history detail) loads the `SaleDetail`
 * and passes the business identity, currency and payment-method names in.
 *
 * Money is always formatted through `formatMoney` and quantities through
 * `formatQuantity`; every label goes through `t()` (AGENTS §6). The card uses
 * hairline borders, `Radius.lg` and the 8pt `Spacing` grid with semantic
 * `useTheme()` colors only.
 */
export function ReceiptView({
  sale,
  businessName,
  businessLogoUri,
  currency,
  paymentMethods,
  employeeName,
  testID,
}: ReceiptViewProps): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();

  const banner = STATUS_BANNER[sale.status];
  const sectionTestId = (name: string): string | undefined =>
    testID != null ? `${testID}-${name}` : undefined;

  return (
    <View
      testID={testID}
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {/* 1. Business identity + receipt label. */}
      <View testID={sectionTestId('header')} style={styles.header}>
        {businessLogoUri ? (
          <Image
            source={{ uri: businessLogoUri }}
            style={[styles.logo, { borderColor: theme.border }]}
            contentFit="contain"
            accessibilityLabel={businessName}
          />
        ) : null}
        <ThemedText type="heading2">{businessName}</ThemedText>
        <ThemedText type="body2" themeColor="textSecondary">
          {t('pos.receipt.title')}
        </ThemedText>
      </View>

      <Divider color={theme.border} />

      {/* 2. Transaction meta — sale number is the (monospace) transaction ID. */}
      <View testID={sectionTestId('meta')} style={styles.section}>
        <MetaRow label={t('pos.receipt.saleNumber')}>
          <ThemedText type="code">{sale.saleNumber}</ThemedText>
        </MetaRow>
        <MetaRow label={t('pos.receipt.date')}>
          <ThemedText type="body2">{formatDateTime(sale.createdAt)}</ThemedText>
        </MetaRow>
        {employeeName ? (
          <MetaRow label={t('pos.receipt.employee')}>
            <ThemedText type="body2">{employeeName}</ThemedText>
          </MetaRow>
        ) : null}
      </View>

      {/* 3. Status: always a small label, plus a banner unless COMPLETED. */}
      <View testID={sectionTestId('status')} style={styles.section}>
        <View style={[styles.statusBadge, { borderColor: theme.border }]}>
          <ThemedText type="micro" themeColor={STATUS_TONE[sale.status]}>
            {t(STATUS_LABEL_KEY[sale.status])}
          </ThemedText>
        </View>
        {banner ? (
          <View
            testID={sectionTestId('status-banner')}
            style={[styles.banner, { borderColor: theme[banner.tone] }]}>
            <ThemedText type="body2" themeColor={banner.tone}>
              {t(banner.key)}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <Divider color={theme.border} />

      {/* 4. Items. */}
      <View testID={sectionTestId('items')} style={styles.section}>
        <ThemedText type="heading2">{t('pos.receipt.items')}</ThemedText>
        {sale.items.length === 0 ? (
          <ThemedText type="body2" themeColor="textSecondary">
            {t('pos.receipt.emptyItems')}
          </ThemedText>
        ) : (
          sale.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <ThemedText type="body1">{item.productName}</ThemedText>
              <View style={styles.itemMeta}>
                <ThemedText type="code" themeColor="textSecondary">
                  {formatQuantity(item.quantity, { maxDecimals: 0 })}
                </ThemedText>
                <ThemedText type="code" themeColor="textSecondary">
                  {formatMoney(item.unitPriceMinor, currency)}
                </ThemedText>
                <ThemedText type="code">{formatMoney(item.subtotalMinor, currency)}</ThemedText>
              </View>
            </View>
          ))
        )}
      </View>

      <Divider color={theme.border} />

      {/* 5. Totals — the grand total is emphasized and monospace. */}
      <View testID={sectionTestId('totals')} style={styles.section}>
        <MetaRow label={t('pos.receipt.subtotal')}>
          <ThemedText type="code" themeColor="textSecondary">
            {formatMoney(sale.subtotalMinor, currency)}
          </ThemedText>
        </MetaRow>
        <View style={styles.totalRow}>
          <ThemedText type="heading2">{t('pos.receipt.total')}</ThemedText>
          <ThemedText type="heading2" style={styles.mono}>
            {formatMoney(sale.totalMinor, currency)}
          </ThemedText>
        </View>
      </View>

      {/* 6. Payments (omitted entirely when the sale has none). */}
      {sale.payments.length > 0 ? (
        <>
          <Divider color={theme.border} />
          <View testID={sectionTestId('payments')} style={styles.section}>
            <ThemedText type="heading2">{t('pos.receipt.payments')}</ThemedText>
            {sale.payments.map((payment) => {
              const method = paymentMethods.find((m) => m.id === payment.paymentMethodId);
              const changeMinor =
                payment.amountGivenMinor != null
                  ? payment.amountGivenMinor - payment.amountMinor
                  : null;
              return (
                <View key={payment.id} style={styles.paymentRow}>
                  <MetaRow label={method?.name ?? t('pos.payment.methodOther')}>
                    <ThemedText type="code">{formatMoney(payment.amountMinor, currency)}</ThemedText>
                  </MetaRow>
                  {payment.amountGivenMinor != null ? (
                    <>
                      <MetaRow label={t('pos.receipt.amountGiven')}>
                        <ThemedText type="code" themeColor="textSecondary">
                          {formatMoney(payment.amountGivenMinor, currency)}
                        </ThemedText>
                      </MetaRow>
                      <MetaRow label={t('pos.receipt.change')}>
                        <ThemedText type="code" themeColor="textSecondary">
                          {formatMoney(changeMinor ?? 0, currency)}
                        </ThemedText>
                      </MetaRow>
                    </>
                  ) : null}
                </View>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

/** Label/value row used across meta, totals and payments. */
function MetaRow({ label, children }: { label: string; children: JSX.Element }): JSX.Element {
  return (
    <View style={styles.row}>
      <ThemedText type="body2" themeColor="textSecondary" style={styles.rowLabel}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

/** Hairline section separator (borders over shadows, AGENTS §7.4). */
function Divider({ color }: { color: string }): JSX.Element {
  return <View style={[styles.divider, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  section: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  rowLabel: {
    flexShrink: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  banner: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  itemRow: {
    gap: Spacing.half,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  paymentRow: {
    gap: Spacing.half,
  },
  mono: {
    fontFamily: Fonts.mono,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
