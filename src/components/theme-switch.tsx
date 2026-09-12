import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { SwitchRow } from './switch-row';

import { Spacing } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/hooks/use-theme';
import { useThemeStore } from '@/theme/theme-store';

/**
 * Appearance setting — a single "dark mode" switch bound to the persisted
 * theme-mode store. When the stored mode is 'system' the switch reflects the
 * effective scheme; toggling writes an explicit light/dark override.
 */
export function ThemeSwitch() {
  const { t } = useTranslation();
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const scheme = useEffectiveColorScheme();

  const isDark = mode === 'dark' || (mode === 'system' && scheme === 'dark');

  return (
    <View style={styles.container}>
      <SwitchRow
        label={t('settings.theme.darkMode')}
        value={isDark}
        onValueChange={(value) => setMode(value ? 'dark' : 'light')}
        testID="theme-dark-switch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
