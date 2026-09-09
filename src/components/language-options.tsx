import { useTranslation } from 'react-i18next';

import { OptionRow } from './option-row';

import { i18n, setLanguage, type SupportedLanguage } from '@/i18n';
import { useLanguageStore } from '@/i18n/language-store';

type LanguageOption = {
  value: SupportedLanguage;
  label: string;
};

function selectLanguage(language: SupportedLanguage): void {
  if (i18n.language === language) {
    return;
  }
  // Keep the persisted preference store and the live i18n singleton in sync.
  useLanguageStore.getState().setLanguage(language);
  void setLanguage(language);
}

/**
 * Idioma section — Español / English rows bound to i18n. Selecting switches
 * every t() string and the dayjs/number locale immediately, and persists the
 * choice through the language preference store.
 */
export function LanguageOptions({ divided }: { divided?: boolean }) {
  const { i18n: activeI18n, t } = useTranslation();

  const options: LanguageOption[] = [
    { value: 'es', label: t('settings.languageOptions.es') },
    { value: 'en', label: t('settings.languageOptions.en') },
  ];

  return (
    <>
      {options.map((option, index) => (
        <OptionRow
          key={option.value}
          label={option.label}
          selected={activeI18n.language === option.value}
          onPress={() => selectLanguage(option.value)}
          divided={divided ?? index < options.length - 1}
          testID={`language-option-${option.value}`}
        />
      ))}
    </>
  );
}
