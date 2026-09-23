import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { listActiveEmployees, type PublicEmployee } from '@/auth';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import {
  getSessionById,
  getSessionSummary,
  type CashSession,
  type SessionSummary,
} from '@/cash-session';
import { useDurationLabel } from '@/cash-session/use-duration-label';
import { Radius, Spacing } from '@/constants/theme';
import { getBusinessProfile } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime, formatMoney } from '@/i18n/format';

function employeeName(id: string | null, employees: PublicEmployee[]): string {
  if (!id) {
    return '—';
  }
  const found = employees.find((employee) => employee.id === id);
  return found
    ? [found.firstName, found.lastName?.trim()].filter(Boolean).join(' ')
    : '—';
}

/**
 * Session detail (Phase D) — full breakdown of a past (or open) shift: opening,
 * sales by method, expected vs counted, difference, notes and both employees.
 */
export default function CashSessionDetailScreen() {
  const { t } = useTranslation();
  const durationLabel = useDurationLabel();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [session, setSession] = useState<CashSession | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [employees, setEmployees] = useState<PublicEmployee[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadFailed(false);
    try {
      const [found, sessionSummary, employeeList, profile] = await Promise.all([
        getSessionById(id),
        getSessionSummary(id),
        listActiveEmployees(),
        getBusinessProfile(),
      ]);
      setSession(found);
      setSummary(sessionSummary);
      setEmployees(employeeList);
      setCurrency(profile?.currencyCode ?? 'USD');
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const differenceColor = (difference: number): string => {
    if (difference > 0) return theme.success;
    if (difference < 0) return theme.danger;
    return theme.textSecondary;
  };

  const differenceLabel = (difference: number): string | null => {
    if (difference > 0) return t('cashSession.difference.over');
    if (difference < 0) return t('cashSession.difference.short');
    return null;
  };

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('cashSession.detail.title'),
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
        </View>
      ) : loadFailed || !session ? (
        <View style={styles.state}>
          <ThemedText type="body1" themeColor="textSecondary">
            {t('cashSession.detail.notFound')}
          </ThemedText>
        </View>
      ) : (
        <>
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.statusRow}>
              <ThemedText
                type="micro"
                style={{ color: session.status === 'OPEN' ? theme.warning : theme.success }}>
                {session.status === 'OPEN'
                  ? t('cashSession.detail.statusOpen')
                  : t('cashSession.detail.statusClosed')}
              </ThemedText>
            </View>
            <DetailRow
              label={t('cashSession.detail.openedAt')}
              value={formatDateTime(session.openedAt)}
            />
            {session.closedAt ? (
              <DetailRow
                label={t('cashSession.detail.closedAt')}
                value={formatDateTime(session.closedAt)}
              />
            ) : null}
            <DetailRow
              label={t('cashSession.detail.duration')}
              value={
                session.closedAt
                  ? durationLabel(session.openedAt, new Date(session.closedAt))
                  : durationLabel(session.openedAt)
              }
            />
            <DetailRow
              label={t('cashSession.detail.openedBy')}
              value={employeeName(session.openedByEmployeeId, employees)}
            />
            {session.closedByEmployeeId ? (
              <DetailRow
                label={t('cashSession.detail.closedBy')}
                value={employeeName(session.closedByEmployeeId, employees)}
              />
            ) : null}
          </ThemedView>

          <View style={styles.section}>
            <SectionHeader level="section" title={t('cashSession.detail.expected')} />
            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
              <DetailRow
                label={t('cashSession.detail.openingAmount')}
                value={formatMoney(session.openingAmountMinor, currency)}
              />
              <DetailRow
                label={t('cashSession.detail.cashSales')}
                value={formatMoney(summary?.cashSalesMinor ?? 0, currency)}
              />
              <DetailRow
                label={t('cashSession.detail.cardSales')}
                value={formatMoney(summary?.cardSalesMinor ?? 0, currency)}
              />
              <DetailRow
                label={t('cashSession.detail.transferSales')}
                value={formatMoney(summary?.transferSalesMinor ?? 0, currency)}
              />
              <DetailRow
                label={t('cashSession.detail.saleCount')}
                value={String(summary?.saleCount ?? 0)}
              />
            </ThemedView>
          </View>

          {session.status === 'CLOSED' ? (
            <View style={styles.section}>
              <SectionHeader level="section" title={t('cashSession.detail.difference')} />
              <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
                <DetailRow
                  label={t('cashSession.detail.expected')}
                  value={formatMoney(session.expectedAmountMinor ?? 0, currency)}
                />
                <DetailRow
                  label={t('cashSession.detail.counted')}
                  value={formatMoney(session.countedAmountMinor ?? 0, currency)}
                />
                <View style={styles.differenceRow}>
                  <ThemedText type="body2" themeColor="textSecondary">
                    {t('cashSession.detail.difference')}
                  </ThemedText>
                  <ThemedText
                    type="code"
                    style={{ color: differenceColor(session.differenceMinor ?? 0) }}>
                    {differenceLabel(session.differenceMinor ?? 0)
                      ? `${differenceLabel(session.differenceMinor ?? 0)} · `
                      : ''}
                    {(session.differenceMinor ?? 0) > 0 ? '+' : ''}
                    {formatMoney(session.differenceMinor ?? 0, currency)}
                  </ThemedText>
                </View>
              </ThemedView>
            </View>
          ) : null}

          {session.openingNotes || session.closingNotes ? (
            <View style={styles.section}>
              <SectionHeader level="section" title={t('cashSession.detail.openingNotes')} />
              <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
                {session.openingNotes ? (
                  <ThemedText type="body2">{session.openingNotes}</ThemedText>
                ) : null}
                {session.closingNotes ? (
                  <>
                    <SectionHeader level="section" title={t('cashSession.detail.closingNotes')} />
                    <ThemedText type="body2">{session.closingNotes}</ThemedText>
                  </>
                ) : null}
              </ThemedView>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText type="body2" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="body1">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
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
  section: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  statusRow: {
    alignItems: 'flex-start',
    marginBottom: Spacing.one,
  },
  detailRow: {
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
});
