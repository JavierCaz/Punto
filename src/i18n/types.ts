/**
 * Augment i18next typings so `t()` calls are key-checked against the actual
 * resource files at compile time. `keyof typeof es` gives the canonical key
 * shape; en is structurally constrained to match it (see locales/en.ts).
 */

import 'i18next';

import type es from '@/i18n/locales/es';

/** Deep type: union of all dotted key paths into the es resource. */
export type TranslationKey = {
  [K in keyof typeof es]: typeof es[K] extends string
    ? K
    : `${K & string}.${NestedKeys<typeof es[K]>}`;
}[keyof typeof es];

type NestedKeys<T> = {
  [K in keyof T]: T[K] extends string
    ? K & string
    : `${K & string}.${NestedKeys<T[K]>}`;
}[keyof T];

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof es;
    };
  }
}
