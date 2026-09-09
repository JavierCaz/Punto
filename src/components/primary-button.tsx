import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from './themed-text';
import type { MaterialIconName } from './empty-state';

import { Radius, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Text rendered on the primary color. The semantic palette has no
 * "text on primary" token (primary is user-selectable via §7.2 accents), so
 * fixed white is used per the §7.1 design (white label on primary buttons).
 */
const ON_PRIMARY = '#FFFFFF';

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  icon?: MaterialIconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** High-emphasis action button (theme.primary fill, radius-md, ≥ TouchTarget.min). */
export function PrimaryButton({ label, onPress, icon, disabled = false, style }: PrimaryButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: theme.primary },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <View style={styles.inner}>
        {icon ? <MaterialCommunityIcons name={icon} size={20} color={ON_PRIMARY} /> : null}
        <ThemedText style={styles.label}>{label}</ThemedText>
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
    fontWeight: '600',
    lineHeight: Typography.body1.lineHeight,
    color: ON_PRIMARY,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.5,
  },
});
