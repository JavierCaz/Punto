import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { ACCENTS, type Accent } from '@/constants/accents';
import { getAccentPalette, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useEffectiveColorScheme, useTheme } from '@/hooks/use-theme';
import { pickReadableForeground } from '@/lib/contrast';

const SWATCH_SIZE = 40;

export type AccentOptionsProps = {
  value: Accent;
  onChange: (accent: Accent) => void;
};

/**
 * Accent picker (§7.2): Royal / Emerald / Indigo / Amber / Slate / Rose.
 *
 * Swatches render the active scheme's shade; the selected one gets a check in
 * the accent's most readable foreground (derived via WCAG contrast) and each is
 * exposed as an accessibility radio.
 */
export function AccentOptions({ value, onChange }: AccentOptionsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const scheme = useEffectiveColorScheme();

  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {ACCENTS.map((accent) => {
        const selected = accent === value;
        const primary = getAccentPalette(accent, scheme).primary500;
        const label = t(`accents.${accent}`);
        return (
          <Pressable
            key={accent}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            testID={`accent-option-${accent}`}
            onPress={() => onChange(accent)}
            style={styles.item}>
            <View
              style={[
                styles.swatch,
                {
                  backgroundColor: primary,
                  borderColor: selected ? theme.text : theme.border,
                },
                selected && styles.swatchSelected,
              ]}>
              {selected ? (
                <MaterialCommunityIcons
                  name="check"
                  size={20}
                  color={pickReadableForeground(primary)}
                />
              ) : null}
            </View>
            <ThemedText
              type="micro"
              themeColor={selected ? 'text' : 'textSecondary'}
              style={styles.label}
              numberOfLines={1}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  item: {
    width: 64,
    minHeight: TouchTarget.min,
    alignItems: 'center',
    gap: Spacing.one,
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: Radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 3,
  },
  label: {
    textAlign: 'center',
  },
});
