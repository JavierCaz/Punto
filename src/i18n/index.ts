/**
 * i18n bootstrap.
 *
 * - Spanish-first resource is canonical; English is key-parity-checked.
 * - Device language detection via expo-localization; any device outside
 *   es/en falls back to Spanish.
 * - Keep the configured language in sync with dayjs for date formatting.
 */

import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { setFormatLocale } from '@/i18n/format';
import en from '@/i18n/locales/en';
import es from '@/i18n/locales/es';
import { setDayjsLocale } from '@/lib/dayjs';

export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'es';

/** Map a device language tag to a supported language, Spanish as fallback. */
export function resolveLanguage(languageTag: string | undefined): SupportedLanguage {
  const code = languageTag?.toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(code as SupportedLanguage)
    ? (code as SupportedLanguage)
    : DEFAULT_LANGUAGE;
}

export function detectLanguage(): SupportedLanguage {
  return resolveLanguage(getLocales()[0]?.languageCode ?? undefined);
}

// The i18next default export IS the singleton instance; .use()/.init() are
// instance methods, not shadowed named exports (import/no-named-as-default-member
// is a false positive here).
// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: detectLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  interpolation: {
    // React already escapes rendered strings; disable HTML escaping for JSX.
    escapeValue: false,
  },
  returnNull: false,
});

// Keep dayjs and number/currency formatting in the active UI language.
setDayjsLocale(i18n.language as SupportedLanguage);
setFormatLocale(i18n.language as SupportedLanguage);
i18n.on('languageChanged', (lng) => {
  const language = lng as SupportedLanguage;
  setDayjsLocale(language);
  setFormatLocale(language);
});

export { i18n };
/** Programmatic language switch (persisted later by a settings store). */
export async function setLanguage(language: SupportedLanguage): Promise<void> {
  // eslint-disable-next-line import/no-named-as-default-member -- false positive: the default export is the singleton instance.
  await i18n.changeLanguage(language);
}
