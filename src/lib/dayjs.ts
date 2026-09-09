/**
 * dayjs setup — single import point so locale is configured once.
 * UI language drives dayjs locale (kept in sync in @/i18n).
 */

import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/en';

import type { SupportedLanguage } from '@/i18n';

export type { Dayjs } from 'dayjs';

/** dayjs ships 'en' by default; only 'es' needs an explicit switch. */
export function setDayjsLocale(language: SupportedLanguage): void {
  if (language !== 'en') {
    dayjs.locale(language);
  } else {
    dayjs.locale('en');
  }
}

export { dayjs };
