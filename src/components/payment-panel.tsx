import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormField } from './form-field';
import { ListRow } from './list-row';
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

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

/**
 * Payment selection. Methods are opt-in: the cashier adds the methods they need
 * ("Agregar método de pago"), each added method gets a money input and a remove
 * icon, and the charge is validated against the sale total.
 *
 * For CASH the input is the amount RECEIVED (tendered), not the amount applied:
 * the applied amount is capped at what the other methods leave, and the excess
 * is shown as change. So entering 500 for a 160 total applies 160 and shows 340
 * change instead of failing validation. Non-cash inputs are exact amounts.
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

  const [added, setAdded] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);

  const addedMethods = added
    .map((id) => methods.find((method) => method.id === id))
    .filter((method): method is PaymentMethod => method != null);
  const availableMethods = methods.filter((method) => !added.includes(method.id));

  const amountFor = (methodId: string): number => parseMoneyInput(amounts[methodId] ?? '') ?? 0;

  // Cash covers whatever the other methods leave; any excess becomes change.
  const nonCashSum = addedMethods
    .filter((method) => method.type !== 'CASH')
    .reduce((sum, method) => sum + amountFor(method.id), 0);
  const cashDue = Math.max(0, totalMinor - nonCashSum);

  const appliedCash: Record<string, number> = {};
  let cashPool = cashDue;
  for (const method of addedMethods) {
    if (method.type !== 'CASH') {
      continue;
    }
    const entered = amountFor(method.id);
    if (entered <= 0) {
      continue;
    }
    const applied = cashPool > 0 ? Math.min(entered, cashPool) : entered;
    appliedCash[method.id] = applied;
    cashPool -= applied;
  }

  const allocations: PaymentAllocation[] = [];
  for (const method of addedMethods) {
    const entered = amountFor(method.id);
    if (entered <= 0) {
      continue;
    }
    if (method.type === 'CASH') {
      const applied = appliedCash[method.id] ?? entered;
      const allocation: PaymentAllocation = { methodId: method.id, amountMinor: applied };
      // Only record the tender when it actually produces change.
      if (entered > applied) {
        allocation.amountGivenMinor = entered;
      }
      allocations.push(allocation);
    } else {
      allocations.push({ methodId: method.id, amountMinor: entered });
    }
  }

  const hasInvalidInput = addedMethods.some((method) => {
    const raw = (amounts[method.id] ?? '').trim();
    return raw !== '' && parseMoneyInput(raw) == null;
  });

  const remaining = remainingMinor(totalMinor, allocations);
  const issue = hasInvalidInput ? 'amount-invalid' : validatePayments(totalMinor, methods, allocations);
  const canSubmit = issue === null && !submitting && addedMethods.length > 0;

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


  const fillRemaining = (methodId: string): void => {
    setTouched(true);
    if (remaining > 0) {
      setAmounts((previous) => ({ ...previous, [methodId]: formatMoneyInput(remaining) }));
    }
  };

  const addMethod = (methodId: string): void => {
    setTouched(true);
    setAdded((previous) => (previous.includes(methodId) ? previous : [...previous, methodId]));
    setPickerOpen(false);
  };

  const removeMethod = (methodId: string): void => {
    setTouched(true);
    setAdded((previous) => previous.filter((id) => id !== methodId));
    setAmounts((previous) => withoutKey(previous, methodId));
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

      {addedMethods.map((method) => {
        const isCash = method.type === 'CASH';
        const entered = amountFor(method.id);
        const applied = isCash ? appliedCash[method.id] ?? entered : entered;
        const change = isCash && entered > applied ? entered - applied : 0;

        return (
          <View
            key={method.id}
            testID={`payment-method-${method.id}`}
            style={[styles.method, { borderColor: theme.border }]}>
            <View style={styles.methodHeader}>
              <ThemedText type="body1" style={styles.methodName}>
                {method.name}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('pos.payment.removeMethod', { name: method.name })}
                testID={`payment-remove-${method.id}`}
                onPress={() => removeMethod(method.id)}
                style={styles.removeButton}>
                <MaterialCommunityIcons
                  name="close-circle-outline"
                  size={22}
                  color={theme.danger}
                />
              </Pressable>
            </View>

            <FormField
              label={isCash ? t('pos.payment.amountGiven') : t('pos.payment.amountLabel')}
              accessibilityLabel={isCash ? t('pos.payment.amountGiven') : t('pos.payment.amountLabel')}
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

            {isCash && entered > 0 ? (
              <View style={styles.cash}>
                <View style={styles.quick}>
                  <SecondaryButton
                    label={t('pos.payment.exact')}
                    onPress={() => setAmount(method.id, formatMoneyInput(cashDue))}
                  />
                  {quickCashAmounts(cashDue)
                    .filter((suggestion) => suggestion !== cashDue)
                    .map((suggestion) => (
                      <SecondaryButton
                        key={suggestion}
                        label={formatMoney(suggestion, currency)}
                        onPress={() => setAmount(method.id, formatMoneyInput(suggestion))}
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

      {availableMethods.length > 0 ? (
        <View style={styles.addSection}>
          <SecondaryButton
            label={t('pos.payment.addMethod')}
            icon="plus"
            onPress={() => setPickerOpen((open) => !open)}
          />
          {pickerOpen ? (
            <View
              style={[
                styles.optionList,
                { borderColor: theme.border, backgroundColor: theme.backgroundElement },
              ]}>
              {availableMethods.map((method, index) => (
                <ListRow
                  key={method.id}
                  title={method.name}
                  icon="plus"
                  onPress={() => addMethod(method.id)}
                  divided={index < availableMethods.length - 1}
                  testID={`payment-option-${method.id}`}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <ThemedText type="body2" themeColor="textSecondary">
          {t('pos.payment.allMethodsAdded')}
        </ThemedText>
      )}

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
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  methodName: {
    flex: 1,
  },
  removeButton: {
    width: TouchTarget.min,
    height: TouchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
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
  addSection: {
    gap: Spacing.two,
  },
  optionList: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  confirm: {
    minHeight: TouchTarget.action,
  },
});
