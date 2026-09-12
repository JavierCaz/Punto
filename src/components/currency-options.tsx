import { useTranslation } from 'react-i18next';

import { OptionRow } from './option-row';

import { CURRENCY_CODES, type CurrencyCode } from '@/constants/currencies';

/**
 * Moneda selector — controlled list of the supported currencies, bound to the
 * business profile value (not a store). Rendered as the whole option set inside
 * one card, mirroring LanguageOptions / ThemeModeOptions.
 */
export function CurrencyOptions({
  value,
  onChange,
  divided,
}: {
  /** Current code — a plain string so an unsupported stored value is preserved. */
  value: string;
  onChange: (currency: CurrencyCode) => void;
  divided?: boolean;
}) {
  const { t } = useTranslation();

  const labels: Record<CurrencyCode, string> = {
    MXN: t('currencies.MXN'),
    USD: t('currencies.USD'),
  };

  return (
    <>
      {CURRENCY_CODES.map((code, index) => (
        <OptionRow
          key={code}
          label={labels[code]}
          selected={value === code}
          onPress={() => onChange(code)}
          divided={divided ?? index < CURRENCY_CODES.length - 1}
          testID={`currency-option-${code}`}
        />
      ))}
    </>
  );
}
