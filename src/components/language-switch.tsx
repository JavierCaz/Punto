import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { SwitchRow } from './switch-row';

import { Spacing } from '@/constants/theme';
import { i18n, resolveLanguage, setLanguage, type SupportedLanguage } from '@/i18n';
import { useLanguageStore } from '@/i18n/language-store';

function selectLanguage(language: SupportedLanguage): void {
  if (i18n.language === language) {
    return;
  }
  // Keep the persisted preference store and the live i18n singleton in sync.
  useLanguageStore.getState().setLanguage(language);
  void setLanguage(language);
}

/**
 * Idioma setting — a single switch toggling between Español (off) and
 * English (on); the hint shows the active language.
 *
 * - Uncontrolled (default): bound to the live i18n language. Toggling switches
 *   every `t()` string and the dayjs/number locale immediately, and persists
 *   the preference. Used during onboarding.
 * - Controlled (`value` + `onChange`): renders the given value and delegates the
 *   selection without touching i18n. Used by the Settings business editor so the
 *   persisted business locale is the source of truth until the user saves.
 */
export function LanguageSwitch({
  value,
  onChange,
}: {
  value?: SupportedLanguage;
  onChange?: (language: SupportedLanguage) => void;
} = {}) {
  const { i18n: activeI18n, t } = useTranslation();

  const selected = value ?? resolveLanguage(activeI18n.language);
  const labels: Record<SupportedLanguage, string> = {
    es: t('settings.languageOptions.es'),
    en: t('settings.languageOptions.en'),
  };

  const handleChange = (next: boolean): void => {
    const language: SupportedLanguage = next ? 'en' : 'es';
    if (onChange) {
      onChange(language);
      return;
    }
    selectLanguage(language);
  };

  return (
    <View style={styles.container}>
      <SwitchRow
        label={t('business.localeLabel')}
        hint={labels[selected]}
        value={selected === 'en'}
        onValueChange={handleChange}
        testID="language-switch"
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
