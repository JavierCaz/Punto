import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuthStore } from '@/auth';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import {
  closeSession,
  getActiveSession,
  getSessionSummary,
  type CashSession,
  type SessionSummary,
} from '@/cash-session';
import { useCashSessionStore } from '@/cash-session/cash-session-store';
import { Radius, Spacing } from '@/constants/theme';
import { getBusinessProfile } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/i18n/format';
import { parseMoneyInput } from '@/lib/catalog-form';

function row(label: string, value: string, isCode = true): { label: string; value: string; isCode: boolean } {
  return { label, value, isCode };
}

/**
 * "Cerrar caja" (Phase C) — reconcile the drawer. Shows the computed summary
 * (opening + cash sales = expected), takes the counted amount, and previews the
 * over/short difference live with §7.1 semantic colors.
 */
export default function CloseCashSessionScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);

  const refreshStore = useCashSessionStore((state) => state.refresh);

  const [session, setSession] = useState<CashSession | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [countedInput, setCountedInput] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadFailed(false);
      setLoading(true);
      const active = await getActiveSession();
      setSession(active);
      if (active) {
        const [sessionSummary, profile] = await Promise.all([
          getSessionSummary(active.id),
          getBusinessProfile(),
        ]);
        setSummary(sessionSummary);
        setCurrency(profile?.currencyCode ?? 'USD');
      }
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const countedParsed = parseMoneyInput(countedInput);
  const expected = session ? session.openingAmountMinor + (summary?.cashSalesMinor ?? 0) : 0;
  const difference = countedParsed == null ? null : countedParsed - expected;

  const countedTrimmed = countedInput.trim();
  const countedError =
    countedTrimmed.length === 0
      ? t('cashSession.close.countedRequired')
      : countedParsed == null
        ? t('cashSession.close.countedInvalid')
        : undefined;

  const differenceColor =
    difference == null
      ? theme.textSecondary
      : difference > 0
        ? theme.success
        : difference < 0
          ? theme.danger
          : theme.textSecondary;
  const differenceLabel =
    difference == null || difference === 0
      ? null
      : difference > 0
        ? t('cashSession.difference.over')
        : t('cashSession.difference.short');

  const handleConfirm = async (): Promise<void> => {
    if (submitting || !session) {
      return;
    }
    setSubmitted(true);
    if (countedError != null || countedParsed == null) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await closeSession({
        sessionId: session.id,
        countedAmountMinor: countedParsed,
        employeeId: user?.id ?? null,
        notes: notes.trim() || undefined,
      });
      await refreshStore();
      router.back();
    } catch {
      setSubmitError(t('cashSession.close.error'));
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen header>
        <Stack.Screen
          options={{
            headerShown: true,
            title: t('cashSession.close.title'),
            headerBackTitle: t('common.actions.back'),
            headerStyle: { backgroundColor: theme.backgroundElement },
            headerTintColor: theme.text,
            headerTitleStyle: { color: theme.text },
            headerShadowVisible: false,
          }}
        />
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </Screen>
    );
  }

  if (loadFailed || !session) {
    return (
      <Screen header>
        <Stack.Screen
          options={{
            headerShown: true,
            title: t('cashSession.close.title'),
            headerBackTitle: t('common.actions.back'),
            headerStyle: { backgroundColor: theme.backgroundElement },
            headerTintColor: theme.text,
            headerTitleStyle: { color: theme.text },
            headerShadowVisible: false,
          }}
        />
        <View style={styles.state}>
          <ThemedText type="body1">{t('cashSession.close.noActive')}</ThemedText>
          <SecondaryButton label={t('common.actions.back')} onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const summaryRows = [
    row(t('cashSession.close.openingLabel'), formatMoney(session.openingAmountMinor, currency)),
    row(t('cashSession.close.cashSalesLabel'), formatMoney(summary?.cashSalesMinor ?? 0, currency)),
    row(t('cashSession.close.expectedLabel'), formatMoney(expected, currency)),
  ];

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('cashSession.close.title'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
        }}
      />

      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        {summaryRows.map((entry) => (
          <View key={entry.label} style={styles.summaryRow}>
            <ThemedText type="body2" themeColor="textSecondary">
              {entry.label}
            </ThemedText>
            <ThemedText type={entry.isCode ? 'code' : 'body1'}>{entry.value}</ThemedText>
          </View>
        ))}
      </ThemedView>

      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        <View style={styles.cardBody}>
          <FormField
            label={t('cashSession.close.countedLabel')}
            accessibilityLabel={t('cashSession.close.countedLabel')}
            placeholder={t('cashSession.close.countedPlaceholder')}
            value={countedInput}
            onChangeText={setCountedInput}
            keyboardType="decimal-pad"
            autoCapitalize="none"
            error={submitted ? countedError : undefined}
            testID="cash-session-counted"
          />

          {difference != null ? (
            <View style={[styles.differenceRow, { borderColor: theme.border }]}>
              <ThemedText type="body2" themeColor="textSecondary">
                {t('cashSession.close.differenceLabel')}
              </ThemedText>
              <View style={styles.differenceValue}>
                {differenceLabel ? (
                  <ThemedText type="micro" style={{ color: differenceColor }}>
                    {differenceLabel}
                  </ThemedText>
                ) : null}
                <ThemedText type="code" style={{ color: differenceColor }} testID="cash-session-difference">
                  {(difference > 0 ? '+' : '') + formatMoney(difference, currency)}
                </ThemedText>
              </View>
            </View>
          ) : null}

          <FormField
            label={t('cashSession.close.noteLabel')}
            accessibilityLabel={t('cashSession.close.noteLabel')}
            placeholder={t('cashSession.close.notePlaceholder')}
            value={notes}
            onChangeText={setNotes}
            testID="cash-session-close-notes"
          />

          {submitError ? (
            <ThemedText type="body2" themeColor="danger">
              {submitError}
            </ThemedText>
          ) : null}

          <PrimaryButton
            label={t('cashSession.close.confirm')}
            onPress={() => {
              void handleConfirm();
            }}
            disabled={submitting}
            testID="cash-session-close-confirm"
          />
        </View>
      </ThemedView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardBody: {
    gap: Spacing.three,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  differenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  differenceValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
