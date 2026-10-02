import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type MonthStepperProps = {
  /** Already-localized month label, e.g. "Septiembre 2026". */
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  previousLabel: string;
  nextLabel: string;
  testID?: string;
};

/**
 * Compact `‹ Month YYYY ›` picker for monthly reports. Stepping one month at a
 * time keeps the common case (this month / last month) one tap away without a
 * calendar sheet. Arrow buttons are ≥ 48dp touch targets (§7.4).
 */
export function MonthStepper({
  label,
  onPrevious,
  onNext,
  previousDisabled = false,
  nextDisabled = false,
  previousLabel,
  nextLabel,
  testID,
}: MonthStepperProps) {
  const theme = useTheme();

  const arrow = (
    icon: 'chevron-left' | 'chevron-right',
    onPress: () => void,
    disabled: boolean,
    accessibilityLabel: string,
    suffix: string,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID ? `${testID}-${suffix}` : undefined}
      style={({ pressed }) => [styles.arrow, pressed && !disabled && styles.pressed]}>
      <MaterialCommunityIcons
        name={icon}
        size={28}
        color={disabled ? theme.border : theme.text}
      />
    </Pressable>
  );

  return (
    <View
      style={[styles.container, { borderColor: theme.border, backgroundColor: theme.background }]}
      testID={testID}>
      {arrow('chevron-left', onPrevious, previousDisabled, previousLabel, 'previous')}
      <ThemedText
        type="heading2"
        style={styles.label}
        accessibilityRole="header"
        testID={testID ? `${testID}-label` : undefined}>
        {label}
      </ThemedText>
      {arrow('chevron-right', onNext, nextDisabled, nextLabel, 'next')}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.one,
  },
  arrow: {
    minWidth: TouchTarget.min,
    minHeight: TouchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    flex: 1,
    textAlign: 'center',
  },
});
