import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  hint?: string;
  /** Screen-reader label for the group; defaults to `label`. */
  accessibilityLabel?: string;
  testIDPrefix?: string;
};

/**
 * Mutually exclusive single-choice control (§5.1): a compact segmented row
 * for a small, fixed set of options (e.g. how a product's stock is tracked).
 * Unlike `SelectField` this keeps every option visible, so the choice is
 * explicit without opening a sheet. Each segment is a radio; the selected one
 * is filled with the primary accent.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  hint,
  accessibilityLabel,
  testIDPrefix,
}: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      {label != null || hint != null ? (
        <View style={styles.titles}>
          {label != null ? <ThemedText type="body1">{label}</ThemedText> : null}
          {hint != null ? (
            <ThemedText type="body2" themeColor="textSecondary">
              {hint}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel ?? label}
        style={[styles.container, { backgroundColor: theme.background, borderColor: theme.border }]}>
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              testID={testIDPrefix ? `${testIDPrefix}-${option.value}` : undefined}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.segment,
                index > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.border },
                selected ? { backgroundColor: theme.primary } : { backgroundColor: theme.background },
                pressed && !selected && styles.pressed,
              ]}>
              <ThemedText
                type="body2"
                themeColor={selected ? 'onPrimary' : 'text'}
                numberOfLines={1}
                style={styles.segmentLabel}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  titles: {
    gap: Spacing.half,
  },
  container: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    minHeight: TouchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  segmentLabel: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
