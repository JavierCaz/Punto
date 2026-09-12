import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { SwitchRow } from './switch-row';

import { isCurrencyCode, type CurrencyCode } from '@/constants/currencies';
import { Spacing } from '@/constants/theme';

/**
 * Moneda setting — a single switch toggling between the supported currencies
 * (off = MXN, on = USD); the hint shows the active currency. `value` is a plain
 * string so an unsupported stored code is preserved until the user picks one.
 */
export function CurrencySwitch({
  value,
  onChange,
}: {
  value: string;
  onChange: (currency: CurrencyCode) => void;
}) {
  const { t } = useTranslation();

  const labels: Record<CurrencyCode, string> = {
    MXN: t('currencies.MXN'),
    USD: t('currencies.USD'),
  };

  const isUsd = value === 'USD';
  const hint = isCurrencyCode(value) ? labels[value] : value;

  return (
    <View style={styles.container}>
      <SwitchRow
        label={t('business.currencyLabel')}
        hint={hint}
        value={isUsd}
        onValueChange={(next) => onChange(next ? 'USD' : 'MXN')}
        testID="currency-switch"
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
