import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { QuantityStepper } from './quantity-stepper';
import { ThemedText } from './themed-text';

import { Fonts, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/i18n/format';
import { cartLineSubtotalMinor, type CartLine } from '@/pos/cart-math';

export type CartLineRowProps = {
  line: CartLine;
  currency: string;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  disabled?: boolean;
};

/** One editable cart line: product, unit price, quantity stepper, subtotal, remove. */
export function CartLineRow({
  line,
  currency,
  onQuantityChange,
  onRemove,
  disabled = false,
}: CartLineRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      testID={`cart-line-${line.localId}`}
      style={[styles.row, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      <View style={styles.main}>
        <ThemedText type="body1" numberOfLines={2}>
          {line.productName}
        </ThemedText>
        <ThemedText type="code" themeColor="textSecondary">
          {formatMoney(line.unitPriceMinor, currency)}
        </ThemedText>

        <View style={styles.controls}>
          <QuantityStepper
            quantity={line.quantity}
            onChange={onQuantityChange}
            disabled={disabled}
            testIDPrefix={`cart-line-${line.localId}-qty`}
          />
          <ThemedText type="code" style={styles.subtotal}>
            {formatMoney(cartLineSubtotalMinor(line), currency)}
          </ThemedText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('pos.cart.removeLine', { name: line.productName })}
        disabled={disabled}
        onPress={onRemove}
        testID={`cart-line-${line.localId}-remove`}
        style={({ pressed }) => [
          styles.remove,
          pressed && !disabled && { backgroundColor: theme.background },
          disabled && styles.disabled,
        ]}>
        <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.two,
  },
  main: {
    flex: 1,
    gap: Spacing.one,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  subtotal: {
    fontFamily: Fonts.mono,
    fontWeight: '600',
  },
  remove: {
    width: TouchTarget.min,
    height: TouchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  disabled: {
    opacity: 0.5,
  },
});
