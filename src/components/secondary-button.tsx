import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from './themed-text';
import type { MaterialIconName } from './empty-state';

import { Radius, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  icon?: MaterialIconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Medium-emphasis action button (backgroundElement fill + hairline border). */
export function SecondaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  style,
}: SecondaryButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <View style={styles.inner}>
        {icon ? (
          <MaterialCommunityIcons name={icon} size={20} color={theme.textSecondary} />
        ) : null}
        <ThemedText style={styles.label}>{label}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TouchTarget.min,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
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
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
