import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { listActiveEmployees, useAuthStore, type PublicEmployee } from '@/auth';
import { CashSessionOpenSheet } from '@/components/cash-session-open-sheet';
import { EmptyState } from '@/components/empty-state';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import {
  listSessions,
  type CashSession,
} from '@/cash-session';
import { useDurationLabel } from '@/cash-session/use-duration-label';
import { useCashSessionStore } from '@/cash-session/cash-session-store';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { getBusinessProfile } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatMoney } from '@/i18n/format';

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
 * Cash session history (Phase D) — the "Caja" entry under More. Shows the
 * current session (open → close CTA, or open CTA) plus the list of past
 * sessions, most recent first, with a colored difference.
 */
export default function CashSessionHistoryScreen() {
  const { t } = useTranslation();
  const durationLabel = useDurationLabel();
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);

  const activeSession = useCashSessionStore((state) => state.activeSession);
  const refreshStore = useCashSessionStore((state) => state.refresh);

  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [employees, setEmployees] = useState<PublicEmployee[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [openSheet, setOpenSheet] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadFailed(false);
      setLoading(true);
      const [sessionList, employeeList, profile] = await Promise.all([
        listSessions(),
        listActiveEmployees(),
        getBusinessProfile(),
      ]);
      setSessions(sessionList);
      setEmployees(employeeList);
      setCurrency(profile?.currencyCode ?? 'USD');
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      void refreshStore();
    }, [load, refreshStore]),
  );

  const differenceColor = (difference: number): string => {
    if (difference > 0) return theme.success;
    if (difference < 0) return theme.danger;
    return theme.textSecondary;
  };

  // History = past (CLOSED) shifts only; the OPEN session is shown in the
  // active card above, so it never appears twice.
  const closedSessions = sessions.filter((session) => session.status === 'CLOSED');

  const renderHeaderAction = () =>
    activeSession ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('cashSession.history.closeAction')}
        hitSlop={Spacing.two}
        onPress={() => router.push('/cash-session/close')}
        style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}>
        <MaterialCommunityIcons name="cash-register" size={24} color={theme.primary} />
      </Pressable>
    ) : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('cashSession.history.openAction')}
        hitSlop={Spacing.two}
        onPress={() => setOpenSheet(true)}
        style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}>
        <MaterialCommunityIcons name="cash-plus" size={24} color={theme.primary} />
      </Pressable>
    );

  return (
    <Screen header>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('cashSession.history.title'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
          headerRight: renderHeaderAction,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && sessions.length > 0}
            onRefresh={() => void load()}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressBackgroundColor={theme.backgroundElement}
          />
        }>
        <ThemedText type="body2" themeColor="textSecondary">
          {t('cashSession.history.subtitle')}
        </ThemedText>

        {activeSession ? (
          <ThemedView
            type="backgroundElement"
            style={[styles.activeCard, { borderColor: theme.border }]}>
            <View style={styles.activeRow}>
              <MaterialCommunityIcons name="cash-register" size={22} color={theme.primary} />
              <View style={styles.activeText}>
                <ThemedText type="body1">{t('cashSession.history.activeSession')}</ThemedText>
                <ThemedText type="body2" themeColor="textSecondary">
                  {formatDate(activeSession.openedAt)} ·{' '}
                  {durationLabel(activeSession.openedAt)}
                </ThemedText>
                <ThemedText type="code">
                  {formatMoney(activeSession.openingAmountMinor, currency)}
                </ThemedText>
              </View>
            </View>
            <PrimaryButton
              label={t('cashSession.history.closeAction')}
              onPress={() => router.push('/cash-session/close')}
              testID="cash-session-close-action"
            />
          </ThemedView>
        ) : (
          <SecondaryButton
            label={t('cashSession.history.openAction')}
            icon="cash-plus"
            onPress={() => setOpenSheet(true)}
            testID="cash-session-open-action"
          />
        )}

        <View style={styles.section}>
          <SectionHeader level="section" title={t('cashSession.history.title')} />
          {loading && sessions.length === 0 ? (
            <View style={styles.state}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText type="body2" themeColor="textSecondary">
                {t('common.status.loading')}
              </ThemedText>
            </View>
          ) : loadFailed && sessions.length === 0 ? (
            <View style={styles.state}>
              <ThemedText type="body1">{t('common.status.error')}</ThemedText>
              <SecondaryButton
                label={t('common.actions.retry')}
                icon="refresh"
                onPress={() => void load()}
              />
            </View>
          ) : closedSessions.length === 0 ? (
            <EmptyState
              icon="cash-register"
              title={t('cashSession.history.emptyTitle')}
              message={t('cashSession.history.emptyMessage')}
            />
          ) : (
            <ThemedView
              type="backgroundElement"
              style={[styles.card, { borderColor: theme.border }]}>
              {closedSessions.map((session, index) => {
                const openedBy = employeeName(session.openedByEmployeeId, employees);
                const closedBy = employeeName(session.closedByEmployeeId, employees);
                const duration = session.closedAt
                  ? durationLabel(session.openedAt, new Date(session.closedAt))
                  : durationLabel(session.openedAt);
                const difference = session.differenceMinor ?? 0;

                return (
                  <View key={session.id}>
                    {index > 0 ? (
                      <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      testID={`cash-session-${session.id}`}
                      onPress={() =>
                        router.push({ pathname: '/cash-session/[id]', params: { id: session.id } })
                      }
                      style={({ pressed }) => [
                        styles.row,
                        pressed && styles.pressed,
                      ]}>
                      <View style={styles.rowMain}>
                        <ThemedText type="body1">{formatDate(session.openedAt)}</ThemedText>
                        <ThemedText type="body2" themeColor="textSecondary">
                          {openedBy} → {closedBy}
                        </ThemedText>
                        <ThemedText type="body2" themeColor="textSecondary">
                          {duration}
                        </ThemedText>
                      </View>
                      <View style={styles.rowTrailing}>
                        <ThemedText type="code" style={{ color: differenceColor(difference) }}>
                          {session.status === 'CLOSED'
                            ? (difference > 0 ? '+' : '') + formatMoney(difference, currency)
                            : t('cashSession.detail.statusOpen')}
                        </ThemedText>
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={20}
                          color={theme.textSecondary}
                        />
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </ThemedView>
          )}
        </View>
      </ScrollView>

      <CashSessionOpenSheet
        visible={openSheet}
        onClose={() => setOpenSheet(false)}
        onOpened={() => {
          setOpenSheet(false);
          void load();
        }}
        employeeId={user?.id}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: Spacing.three,
    flexGrow: 1,
    paddingBottom: Spacing.five,
  },
  section: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  activeCard: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  activeText: {
    flex: 1,
    gap: Spacing.half,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three,
  },
  row: {
    minHeight: TouchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowMain: {
    flex: 1,
    gap: Spacing.half,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  headerAction: {
    minWidth: TouchTarget.min,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
