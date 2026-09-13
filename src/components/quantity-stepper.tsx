import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Fonts, Radius, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatQuantity } from '@/i18n/format';

export type QuantityStepperProps = {
  /** Current quantity in milli-units (1000 = 1 unit). */
  quantity: number;
  onChange: (quantity: number) => void;
  /** Minimum quantity, default 1000. */
  min?: number;
  /** Step size in milli-units, default 1000. */
  step?: number;
  disabled?: boolean;
  testIDPrefix?: string;
};

/**
 * Compact +/- stepper for integer milli-quantities (AGENTS.md §6). The value is
 * read-only and rendered in the monospace face used for money/quantities; both
 * controls are square 48dp touch targets. Used for POS cart line quantities.
 */
export function QuantityStepper({
  quantity,
  onChange,
  min = 1000,
  step = 1000,
  disabled = false,
  testIDPrefix,
}: QuantityStepperProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const decrementDisabled = disabled || quantity <= min;

  const handleDecrement = (): void => {
    onChange(Math.max(min, quantity - step));
  };

  const handleIncrement = (): void => {
    onChange(quantity + step);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <Pressable
        testID={testIDPrefix ? `${testIDPrefix}-decrement` : undefined}
        accessibilityRole="button"
        accessibilityLabel={t('pos.cart.decrease')}
        disabled={decrementDisabled}
        onPress={handleDecrement}
        style={({ pressed }) => [
          styles.button,
          pressed && !decrementDisabled && { backgroundColor: theme.backgroundElement },
          decrementDisabled && styles.disabled,
        ]}>
        <MaterialCommunityIcons
          name="minus"
          size={20}
          color={decrementDisabled ? theme.textSecondary : theme.text}
        />
      </Pressable>

      <ThemedText
        testID={testIDPrefix ? `${testIDPrefix}-value` : undefined}
        type="body1"
        style={[styles.value, { borderColor: theme.border }]}>
        {formatQuantity(quantity, { maxDecimals: 0 })}
      </ThemedText>

      <Pressable
        testID={testIDPrefix ? `${testIDPrefix}-increment` : undefined}
        accessibilityRole="button"
        accessibilityLabel={t('pos.cart.increase')}
        disabled={disabled}
        onPress={handleIncrement}
        style={({ pressed }) => [
          styles.button,
          pressed && !disabled && { backgroundColor: theme.backgroundElement },
          disabled && styles.disabled,
        ]}>
        <MaterialCommunityIcons name="plus" size={20} color={disabled ? theme.textSecondary : theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  button: {
    width: TouchTarget.min,
    height: TouchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    minWidth: TouchTarget.min,
    textAlign: 'center',
    fontFamily: Fonts.mono,
    fontSize: Typography.body1.fontSize,
    lineHeight: Typography.body1.lineHeight,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
  },
  disabled: {
    opacity: 0.5,
  },
});
