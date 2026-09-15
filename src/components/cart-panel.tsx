import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CartLineRow } from './cart-line-row';
import { PrimaryButton } from './primary-button';
import { SecondaryButton } from './secondary-button';
import { ThemedText } from './themed-text';

import { Fonts, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/i18n/format';
import { cartItemCount, cartSubtotalMinor } from '@/pos/cart-math';
import { useCartStore } from '@/pos/cart-store';

export type CartPanelProps = {
  currency: string;
  /** Open the payment sheet (mobile) / charge (tablet). */
  onCharge: () => void;
  /** Hold the cart. When omitted, the store's hold action is used directly. */
  onHold?: () => void;
  /** Name of the employee attributed to the sale. */
  employeeName?: string | null;
  /** When provided, the attribution row becomes a picker trigger. */
  onChangeEmployee?: () => void;
  testIDPrefix?: string;
};

/** Resolve a cart error to localized copy (repository codes included). */
function useCartErrorMessage(): string | null {
  const { t } = useTranslation();
  const error = useCartStore((state) => state.error);
  if (!error) {
    return null;
  }
  if (error.operation === 'charge') {
    if (error.code === 'INVENTORY_INSUFFICIENT_STOCK') {
      return t('pos.payment.insufficientStock');
    }
    if (error.code === 'empty-cart') {
      return t('pos.payment.emptyCart');
    }
    return t('pos.payment.failed');
  }
  switch (error.operation) {
    case 'add':
      return t('pos.cart.addFailed');
    case 'update':
      return t('pos.cart.updateFailed');
    case 'remove':
      return t('pos.cart.removeFailed');
    case 'hold':
      return t('pos.cart.holdFailed');
    case 'resume':
      return t('pos.cart.resumeFailed');
    case 'discard':
      return t('pos.cart.discardFailed');
    default:
      return t('common.status.error');
  }
}

/**
 * The active cart: editable lines, totals, employee attribution and the
 * Hold/Charge actions. Used both inside the mobile bottom sheet and as the
 * persistent right pane on tablet split view (§8.2).
 */
export function CartPanel({
  currency,
  onCharge,
  onHold,
  employeeName,
  onChangeEmployee,
  testIDPrefix = 'cart-panel',
}: CartPanelProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const lines = useCartStore((state) => state.lines);
  const saleNumber = useCartStore((state) => state.saleNumber);
  const busy = useCartStore((state) => state.busy);
  const hold = useCartStore((state) => state.hold);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeLine = useCartStore((state) => state.removeLine);
  const errorMessage = useCartErrorMessage();

  const empty = lines.length === 0;
  const subtotal = cartSubtotalMinor(lines);
  const count = cartItemCount(lines);

  return (
    <View style={styles.panel} testID={testIDPrefix}>
      {saleNumber != null ? (
        <View style={styles.saleRow}>
          <ThemedText type="body2" themeColor="textSecondary">
            {t('pos.cart.title')}
          </ThemedText>
          <ThemedText type="code">{saleNumber}</ThemedText>
        </View>
      ) : null}

      {empty ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="cart-outline" size={32} color={theme.textSecondary} />
          <ThemedText type="body1" style={styles.emptyTitle}>
            {t('pos.cart.emptyTitle')}
          </ThemedText>
          <ThemedText type="body2" themeColor="textSecondary" style={styles.emptyTitle}>
            {t('pos.cart.emptyMessage')}
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.lines}
          contentContainerStyle={styles.linesContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {lines.map((line) => (
            <CartLineRow
              key={line.localId}
              line={line}
              currency={currency}
              disabled={busy}
              onQuantityChange={(quantity) => void setQuantity(line.localId, quantity)}
              onRemove={() => void removeLine(line.localId)}
            />
          ))}

          <View style={[styles.totals, { borderTopColor: theme.border }]}>
            <View style={styles.totalRow}>
              <ThemedText type="body2" themeColor="textSecondary">
                {t('pos.cart.subtotal')}
              </ThemedText>
              <ThemedText type="code">{formatMoney(subtotal, currency)}</ThemedText>
            </View>
            <View style={styles.totalRow}>
              <ThemedText type="heading2">{t('pos.cart.total')}</ThemedText>
              <ThemedText type="heading2" style={styles.totalValue}>
                {formatMoney(subtotal, currency)}
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      )}

      {employeeName ? (
        <Pressable
          accessibilityRole={onChangeEmployee ? 'button' : undefined}
          disabled={!onChangeEmployee}
          onPress={onChangeEmployee}
          testID={`${testIDPrefix}-employee`}
          style={[styles.attribution, { borderColor: theme.border }]}>
          <MaterialCommunityIcons name="account-outline" size={18} color={theme.textSecondary} />
          <ThemedText type="body2" themeColor="textSecondary" style={styles.attributionText}>
            {t('pos.cart.attributedTo')} {employeeName}
          </ThemedText>
          {onChangeEmployee ? (
            <ThemedText type="body2" themeColor="primary">
              {t('pos.cart.changeEmployee')}
            </ThemedText>
          ) : null}
        </Pressable>
      ) : null}


      {errorMessage ? (
        <ThemedText type="body2" themeColor="danger" testID={`${testIDPrefix}-error`}>
          {errorMessage}
        </ThemedText>
      ) : null}

      <View style={styles.actions}>
        <SecondaryButton
          label={t('pos.cart.hold')}
          icon="clock-outline"
          disabled={empty || busy}
          onPress={onHold ?? (() => void hold())}
          style={styles.action}
        />
        <PrimaryButton
          label={t('pos.cart.charge')}
          icon="cash-register"
          disabled={empty || busy}
          onPress={onCharge}
          style={styles.action}
        />
      </View>

      {!empty ? (
        <ThemedText type="body2" themeColor="textSecondary" style={styles.count}>
          {t('pos.cart.itemCount', { count })}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    gap: Spacing.two,
  },
  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  lines: {
    flexShrink: 1,
  },
  linesContent: {
    gap: Spacing.two,
  },
  totals: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  totalValue: {
    fontFamily: Fonts.mono,
  },
  attribution: {
    minHeight: TouchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
  },
  attributionText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
    minHeight: TouchTarget.action,
  },
  count: {
    textAlign: 'center',
  },
});
