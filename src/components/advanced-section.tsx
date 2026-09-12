import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AdvancedSectionProps = {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
};

/**
 * Progressive-disclosure section (§5.3): a tappable header that reveals
 * secondary fields ("Opciones avanzadas") only when the owner asks for them.
 */
export function AdvancedSection({ title, expanded, onToggle, children }: AdvancedSectionProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.header,
          { backgroundColor: theme.background, borderColor: theme.border },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="body1" style={styles.title}>
          {title}
        </ThemedText>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={theme.textSecondary}
        />
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  header: {
    minHeight: TouchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  title: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  body: {
    gap: Spacing.three,
  },
});
