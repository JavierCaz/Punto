import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SwitchRowProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  hint?: string;
  testID?: string;
};

/** Labeled toggle row (e.g. "Controlar inventario") with an optional hint. */
export function SwitchRow({ label, value, onValueChange, hint, testID }: SwitchRowProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.titles}>
        <ThemedText type="body1">{label}</ThemedText>
        {hint ? (
          <ThemedText type="body2" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor={theme.onPrimary}
        ios_backgroundColor={theme.border}
        accessibilityLabel={label}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: TouchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  titles: {
    flex: 1,
    gap: Spacing.half,
  },
});
