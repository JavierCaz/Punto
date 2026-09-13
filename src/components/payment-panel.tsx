import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { FormField } from './form-field';
import { PrimaryButton } from './primary-button';
import { SecondaryButton } from './secondary-button';
import { ThemedText } from './themed-text';

import { Fonts, Radius, Spacing, TouchTarget } from '@/constants/theme';
import type { PaymentInput, PaymentMethod } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/i18n/format';
import { formatMoneyInput, parseMoneyInput } from '@/lib/catalog-form';
import {
  buildPaymentInputs,
  quickCashAmounts,
  remainingMinor,
  validatePayments,
  type PaymentAllocation,
} from '@/pos/payment';

export type PaymentPanelProps = {
  totalMinor: number;
  currency: string;
  methods: PaymentMethod[];
  submitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (payments: PaymentInput[]) => void;
};

/**
 * Payment selection: one money input per method (single or split), plus cash
 * tender and change for CASH methods. Every amount is parsed to integer minor
 * units and validated against the sale total before the charge can be confirmed.
 */
export function PaymentPanel({
  totalMinor,
  currency,
  methods,
  submitting = false,
  errorMessage,
  onSubmit,
}: PaymentPanelProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [givens, setGivens] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);

  const allocations = useMemo<PaymentAllocation[]>(() => {
    const result: PaymentAllocation[] = [];
    for (const method of methods) {
      const amountMinor = parseMoneyInput(amounts[method.id] ?? '');
      if (amountMinor == null || amountMinor <= 0) {
        continue;
      }
      const allocation: PaymentAllocation = { methodId: method.id, amountMinor };
      if (method.type === 'CASH' && (givens[method.id] ?? '').trim() !== '') {
        const givenMinor = parseMoneyInput(givens[method.id] ?? '');
        if (givenMinor != null) {
          allocation.amountGivenMinor = givenMinor;
        }
      }
      result.push(allocation);
    }
    return result;
  }, [methods, amounts, givens]);

  const hasInvalidInput = methods.some((method) => {
    const raw = (amounts[method.id] ?? '').trim();
    if (raw !== '' && parseMoneyInput(raw) == null) {
      return true;
    }
    const givenRaw = (givens[method.id] ?? '').trim();
    return method.type === 'CASH' && givenRaw !== '' && parseMoneyInput(givenRaw) == null;
  });

  const remaining = remainingMinor(totalMinor, allocations);
  const issue = hasInvalidInput ? 'amount-invalid' : validatePayments(totalMinor, methods, allocations);
  const canSubmit = issue === null && !submitting && methods.length > 0;

  const issueText =
    issue === 'remaining'
      ? t('pos.payment.errorRemaining')
      : issue === 'cash-given'
        ? t('pos.payment.errorCashGiven')
        : issue === 'method-missing'
          ? t('pos.payment.errorMethod')
          : issue != null
            ? t('pos.payment.errorAmount')
            : null;

  const setAmount = (methodId: string, value: string): void => {
    setTouched(true);
    setAmounts((previous) => ({ ...previous, [methodId]: value }));
  };

  const setGiven = (methodId: string, value: string): void => {
    setTouched(true);
    setGivens((previous) => ({ ...previous, [methodId]: value }));
  };

  const fillRemaining = (methodId: string): void => {
    setTouched(true);
    if (remaining > 0) {
      setAmounts((previous) => ({ ...previous, [methodId]: formatMoneyInput(remaining) }));
    }
  };

  if (methods.length === 0) {
    return (
      <ThemedText type="body2" themeColor="textSecondary">
        {t('common.status.loading')}
      </ThemedText>
    );
  }

  return (
    <View style={styles.panel} testID="payment-panel">
      <View
        style={[styles.due, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText type="body2" themeColor="textSecondary">
          {t('pos.payment.amountDue')}
        </ThemedText>
        <ThemedText type="display" style={styles.dueValue}>
          {formatMoney(totalMinor, currency)}
        </ThemedText>
        {remaining !== 0 ? (
          <ThemedText type="body2" themeColor={remaining > 0 ? 'warning' : 'danger'}>
            {t('pos.payment.remaining')}: {formatMoney(remaining, currency)}
          </ThemedText>
        ) : null}
      </View>

      {methods.map((method) => {
        const amount = parseMoneyInput(amounts[method.id] ?? '') ?? 0;
        const given = method.type === 'CASH' ? parseMoneyInput(givens[method.id] ?? '') : null;
        const change = given != null && amount > 0 ? given - amount : 0;

        return (
          <View
            key={method.id}
            testID={`payment-method-${method.id}`}
            style={[styles.method, { borderColor: theme.border }]}>
            <FormField
              label={method.name}
              accessibilityLabel={method.name}
              placeholder="0.00"
              value={amounts[method.id] ?? ''}
              onChangeText={(value) => setAmount(method.id, value)}
              keyboardType="decimal-pad"
              testID={`payment-amount-${method.id}`}
            />

            <SecondaryButton
              label={remaining > 0 ? formatMoney(remaining, currency) : t('pos.payment.exact')}
              disabled={remaining <= 0}
              onPress={() => fillRemaining(method.id)}
            />

            {method.type === 'CASH' && amount > 0 ? (
              <View style={styles.cash}>
                <FormField
                  label={t('pos.payment.amountGiven')}
                  accessibilityLabel={t('pos.payment.amountGiven')}
                  placeholder={formatMoneyInput(amount)}
                  value={givens[method.id] ?? ''}
                  onChangeText={(value) => setGiven(method.id, value)}
                  keyboardType="decimal-pad"
                  testID={`payment-given-${method.id}`}
                />
                <View style={styles.quick}>
                  <SecondaryButton
                    label={t('pos.payment.exact')}
                    onPress={() => setGiven(method.id, formatMoneyInput(amount))}
                  />
                  {quickCashAmounts(amount).map((suggestion) => (
                    <SecondaryButton
                      key={suggestion}
                      label={formatMoney(suggestion, currency)}
                      onPress={() => setGiven(method.id, formatMoneyInput(suggestion))}
                    />
                  ))}
                </View>
                {change > 0 ? (
                  <View style={styles.changeRow} testID={`payment-change-${method.id}`}>
                    <ThemedText type="body2" themeColor="textSecondary">
                      {t('pos.payment.change')}
                    </ThemedText>
                    <ThemedText type="code" themeColor="success">
                      {formatMoney(change, currency)}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      {touched && issueText != null ? (
        <ThemedText type="body2" themeColor="danger" testID="payment-issue">
          {issueText}
        </ThemedText>
      ) : null}

      {errorMessage ? (
        <ThemedText type="body2" themeColor="danger" testID="payment-error">
          {errorMessage}
        </ThemedText>
      ) : null}

      <PrimaryButton
        label={submitting ? t('pos.payment.confirmPending') : t('pos.payment.confirm')}
        icon="check"
        disabled={!canSubmit}
        onPress={() => onSubmit(buildPaymentInputs(allocations))}
        style={styles.confirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.three,
  },
  due: {
    gap: Spacing.one,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  dueValue: {
    fontFamily: Fonts.mono,
  },
  method: {
    gap: Spacing.two,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  cash: {
    gap: Spacing.two,
  },
  quick: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  confirm: {
    minHeight: TouchTarget.action,
  },
});
