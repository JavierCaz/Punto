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
 * Idioma selector — Español / English rows.
 *
 * - Uncontrolled (default): bound to the live i18n language. Selecting switches
 *   every `t()` string and the dayjs/number locale immediately, and persists the
 *   preference. Used during onboarding.
 * - Controlled (`value` + `onChange`): renders the given value and delegates the
 *   selection without touching i18n. Used by the Settings business editor so the
 *   persisted business locale is the source of truth until the user saves.
 */
export function LanguageOptions({
  value,
  onChange,
  divided,
}: {
  value?: SupportedLanguage;
  onChange?: (language: SupportedLanguage) => void;
  divided?: boolean;
} = {}) {
  const { i18n: activeI18n, t } = useTranslation();

  const selected = value ?? (activeI18n.language as SupportedLanguage);

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
          selected={selected === option.value}
          onPress={() => {
            if (onChange) {
              onChange(option.value);
              return;
            }
            selectLanguage(option.value);
          }}
          divided={divided ?? index < options.length - 1}
          testID={`language-option-${option.value}`}
        />
      ))}
    </>
  );
}
