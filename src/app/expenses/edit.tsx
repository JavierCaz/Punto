import { Stack, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SelectField } from '@/components/select-field';
import { ThemedText } from '@/components/themed-text';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import {
  createFinancialTransaction,
  ensureDefaultFinancialCategories,
  getBusinessProfile,
  listFinancialCategories,
  listPaymentMethods,
  listSuppliers,
  type FinanceType,
  type FinancialCategory,
  type PaymentMethod,
  type Supplier,
} from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { i18n } from '@/i18n';
import { formatMoney } from '@/i18n/format';
import { parseMoneyInput } from '@/lib/catalog-form';

/**
 * Manual expense/income entry screen. Records an append-only
 * `financial_transaction` against a direction-scoped category: the category
 * type (INCOME | EXPENSE) is the only source of direction, and the amount is
 * always stored positive (AGENTS §6). There is no edit/delete — history is
 * immutable, so a mistake is corrected with a new, opposite entry.
 */
export default function ExpenseEditScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [type, setType] = useState<FinanceType>('EXPENSE');
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [currency, setCurrency] = useState('USD');

  const [amountInput, setAmountInput] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const savingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        setLoadFailed(false);
        setLoading(true);
        // Seed the localized default categories only when the business has
        // none, then read the active set for the default direction.
        await ensureDefaultFinancialCategories(i18n.language === 'en' ? 'en' : 'es');
        const [categoryList, methods, supplierList, profile] = await Promise.all([
          listFinancialCategories({ type: 'EXPENSE' }),
          listPaymentMethods(),
          listSuppliers(),
          getBusinessProfile(),
        ]);
        if (cancelled) {
          return;
        }
        setCategories(categoryList);
        setPaymentMethods(methods);
        setSuppliers(supplierList);
        setCurrency(profile?.currencyCode ?? 'USD');
      } catch {
        if (!cancelled) {
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTypeChange = (nextType: FinanceType): void => {
    if (nextType === type) {
      return;
    }
    setType(nextType);
    // Categories are direction-scoped, so the previous selection is invalid.
    setCategoryId(null);
    void (async () => {
      try {
        const categoryList = await listFinancialCategories({ type: nextType });
        setCategories(categoryList);
      } catch {
        setLoadFailed(true);
      }
    })();
  };

  const amountTrimmed = amountInput.trim();
  const parsedAmountMinor = parseMoneyInput(amountInput);
  const amountError: string | undefined =
    amountTrimmed.length === 0
      ? t('expenses.form.amountRequired')
      : parsedAmountMinor == null || parsedAmountMinor <= 0
        ? t('expenses.form.amountInvalid')
        : undefined;
  const categoryError: string | undefined =
    categoryId == null ? t('expenses.form.categoryRequired') : undefined;

  const handleSave = (): void => {
    if (savingRef.current || submitting) {
      return;
    }
    savingRef.current = true;
    setSubmitted(true);

    const amountMinor = parseMoneyInput(amountInput);
    if (amountError != null || categoryError != null || amountMinor == null || categoryId == null) {
      savingRef.current = false;
      return;
    }

    void (async () => {
      setSubmitting(true);
      setSubmitError(null);
      try {
        await createFinancialTransaction({
          categoryId,
          amountMinor,
          paymentMethodId: paymentMethodId ?? undefined,
          supplierId: supplierId ?? undefined,
          description: description.trim() || undefined,
        });
        router.back();
      } catch {
        setSubmitError(t('expenses.form.saveFailed'));
        setSubmitting(false);
        savingRef.current = false;
      }
    })();
  };

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));
  const paymentMethodOptions = paymentMethods.map((method) => ({ value: method.id, label: method.name }));
  const supplierOptions = suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }));

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('expenses.form.newTitle'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
        }}
      />

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="body2" themeColor="textSecondary">
            {t('common.status.loading')}
          </ThemedText>
        </View>
      ) : loadFailed ? (
        <View style={styles.state}>
          <ThemedText type="body1">{t('common.status.error')}</ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.group}>
            <ThemedText type="body2" themeColor="textSecondary">
              {t('expenses.form.typeLabel')}
            </ThemedText>
            <View style={styles.typeRow}>
              {(['EXPENSE', 'INCOME'] as const).map((option) => {
                const selected = type === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    testID={`expense-type-${option.toLowerCase()}`}
                    onPress={() => handleTypeChange(option)}
                    style={[
                      styles.typeOption,
                      {
                        backgroundColor: selected ? theme.primary : theme.background,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}>
                    <ThemedText type="body1" style={{ color: selected ? theme.onPrimary : theme.text }}>
                      {option === 'EXPENSE'
                        ? t('expenses.form.typeExpense')
                        : t('expenses.form.typeIncome')}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <FormField
            label={t('expenses.form.amountLabel')}
            accessibilityLabel={t('expenses.form.amountLabel')}
            placeholder={t('expenses.form.amountPlaceholder')}
            value={amountInput}
            onChangeText={setAmountInput}
            keyboardType="decimal-pad"
            hint={
              parsedAmountMinor != null && parsedAmountMinor > 0
                ? formatMoney(parsedAmountMinor, currency)
                : undefined
            }
            error={submitted ? amountError : undefined}
            testID="expense-amount"
          />

          <SelectField
            label={t('expenses.form.categoryLabel')}
            items={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
            noneLabel={t('expenses.form.categoryNone')}
            error={submitted ? categoryError : undefined}
            testIDPrefix="expense-category"
          />

          <SelectField
            label={t('expenses.form.methodLabel')}
            items={paymentMethodOptions}
            value={paymentMethodId}
            onChange={setPaymentMethodId}
            noneLabel={t('expenses.form.methodNone')}
            testIDPrefix="expense-method"
          />

          <SelectField
            label={t('expenses.form.supplierLabel')}
            items={supplierOptions}
            value={supplierId}
            onChange={setSupplierId}
            noneLabel={t('expenses.form.supplierNone')}
            testIDPrefix="expense-supplier"
          />

          <FormField
            label={t('expenses.form.descriptionLabel')}
            accessibilityLabel={t('expenses.form.descriptionLabel')}
            placeholder={t('expenses.form.descriptionPlaceholder')}
            value={description}
            onChangeText={setDescription}
            autoCapitalize="sentences"
            testID="expense-description"
          />

          {submitError ? (
            <ThemedText type="body2" themeColor="danger">
              {submitError}
            </ThemedText>
          ) : null}

          <PrimaryButton
            label={submitting ? t('expenses.form.savePending') : t('expenses.form.save')}
            icon="content-save-outline"
            disabled={submitting}
            onPress={handleSave}
            testID="expense-save"
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  group: {
    gap: Spacing.two,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  typeOption: {
    flex: 1,
    minHeight: TouchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
  },
});
