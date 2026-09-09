import { useTranslation } from 'react-i18next';

import { OptionRow } from './option-row';
import type { MaterialIconName } from './empty-state';

import { useThemeStore, type ThemeMode } from '@/theme/theme-store';

type ThemeModeOption = {
  value: ThemeMode;
  icon: MaterialIconName;
  label: string;
};

/**
 * Apariencia section — Claro / Oscuro / Sistema rows bound to the persisted
 * theme-mode store. Rendered as the whole option set inside one card.
 */
export function ThemeModeOptions({ divided }: { divided?: boolean }) {
  const { t } = useTranslation();
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  const options: ThemeModeOption[] = [
    { value: 'light', icon: 'white-balance-sunny', label: t('settings.theme.light') },
    { value: 'dark', icon: 'moon-waning-crescent', label: t('settings.theme.dark') },
    { value: 'system', icon: 'theme-light-dark', label: t('settings.theme.system') },
  ];

  return (
    <>
      {options.map((option, index) => (
        <OptionRow
          key={option.value}
          icon={option.icon}
          label={option.label}
          selected={mode === option.value}
          onPress={() => setMode(option.value)}
          divided={divided ?? index < options.length - 1}
          testID={`theme-option-${option.value}`}
        />
      ))}
    </>
  );
}
