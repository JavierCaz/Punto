import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type AccessibilityRole, type AccessibilityState } from 'react-native';

import { ThemedText } from './themed-text';
import type { MaterialIconName } from './empty-state';

import { Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: MaterialIconName;
  /** Element rendered at the row end (chevron, check, value, …). */
  trailing?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Render a hairline separator below this row. */
  divided?: boolean;
  testID?: string;
  /** Accessibility overrides for the pressable row (defaults to a button). */
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
};

/**
 * Flat list row used inside bordered cards (More menu, Settings options).
 * When `onPress` is omitted the row renders as plain content.
 */
export function ListRow({
  title,
  subtitle,
  icon,
  trailing,
  onPress,
  disabled = false,
  divided = false,
  testID,
  accessibilityRole = 'button',
  accessibilityState,
}: ListRowProps) {
  const theme = useTheme();

  const content = (
    <View style={styles.row}>
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={theme.textSecondary}
          style={styles.icon}
        />
      ) : null}

      <View style={styles.titles}>
        <ThemedText type="body1" themeColor={disabled ? 'textSecondary' : 'text'}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="body2" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      {trailing}
    </View>
  );

  return (
    <View testID={testID}>
      {onPress ? (
        <Pressable
          accessibilityRole={accessibilityRole}
          accessibilityState={accessibilityState}
          disabled={disabled}
          onPress={onPress}
          style={({ pressed }) => [styles.pressable, pressed && !disabled && { backgroundColor: theme.background }]}>
          {content}
        </Pressable>
      ) : (
        content
      )}
      {divided ? (
        <View
          style={[
            styles.divider,
            { backgroundColor: theme.border },
            icon ? styles.dividerInset : null,
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: TouchTarget.min,
    justifyContent: 'center',
  },
  row: {
    minHeight: TouchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  icon: {
    width: 24,
    textAlign: 'center',
  },
  titles: {
    flex: 1,
    gap: Spacing.half,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three,
  },
  dividerInset: {
    marginLeft: Spacing.three + 24 + Spacing.three,
  },
});
