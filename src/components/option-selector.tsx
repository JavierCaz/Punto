import { OptionRow } from './option-row';
import type { MaterialIconName } from './empty-state';

import { ThemedView } from './themed-view';

import { useTheme } from '@/hooks/use-theme';
import { StyleSheet } from 'react-native';
import { Radius } from '@/constants/theme';

export type OptionSelectorItem = {
  value: string;
  label: string;
  icon?: MaterialIconName;
};

export type OptionSelectorProps = {
  items: OptionSelectorItem[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** When provided, prepends a row that clears the selection. */
  noneLabel?: string;
  testIDPrefix?: string;
};

/**
 * Radio-style single-select rendered as a bordered card of `OptionRow`s.
 * Used for category, inventory-item and supplier pickers so the same
 * accessible row pattern is reused everywhere.
 */
export function OptionSelector({
  items,
  value,
  onChange,
  noneLabel,
  testIDPrefix,
}: OptionSelectorProps) {
  const theme = useTheme();
  const options: OptionSelectorItem[] = [
    ...(noneLabel != null ? [{ value: '', label: noneLabel }] : []),
    ...items,
  ];

  return (
    <ThemedView
      type="background"
      style={[styles.card, { borderColor: theme.border }]}>
      {options.map((option, index) => (
        <OptionRow
          key={option.value === '' ? '__none__' : option.value}
          icon={option.icon}
          label={option.label}
          selected={(option.value === '' ? null : option.value) === value}
          onPress={() => onChange(option.value === '' ? null : option.value)}
          divided={index < options.length - 1}
          testID={testIDPrefix ? `${testIDPrefix}-${option.value || 'none'}` : undefined}
        />
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
