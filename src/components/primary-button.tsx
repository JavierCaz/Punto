import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from './themed-text';
import type { MaterialIconName } from './empty-state';

import { Radius, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickReadableForeground } from '@/lib/contrast';


/** Emphasis of the button fill. */
export type PrimaryButtonTone = 'primary' | 'danger';

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  icon?: MaterialIconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Test id forwarded to the pressable (for component tests). */
  testID?: string;
  /** Button fill emphasis. Defaults to 'primary'. */
  tone?: PrimaryButtonTone;
};

/** High-emphasis action button (theme.primary fill, radius-md, ≥ TouchTarget.min). */
export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  style,
  testID,
  tone = 'primary',
}: PrimaryButtonProps) {
  const theme = useTheme();
  const background = tone === 'danger' ? theme.danger : theme.primary;
  const foreground = tone === 'danger' ? pickReadableForeground(theme.danger) : theme.onPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <View style={styles.inner}>
        {icon ? <MaterialCommunityIcons name={icon} size={20} color={foreground} /> : null}
        <ThemedText style={[styles.label, { color: foreground }]}>{label}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TouchTarget.min,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  label: {
    fontSize: Typography.body1.fontSize,
    // Bold keeps the label in WCAG's "large text" class so the 4.5:1 AAA
    // threshold applies for every accent (see theme.test.ts).
    fontWeight: '700',
    lineHeight: Typography.body1.lineHeight,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.5,
  },
});
