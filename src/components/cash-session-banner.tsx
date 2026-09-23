import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import type { CashSession } from '@/cash-session';
import { isStale } from '@/cash-session/cash-session-format';
import { STALE_SESSION_HOURS } from '@/cash-session/cash-session-store';
import { useDurationLabel } from '@/cash-session/use-duration-label';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * POS top banner for cash sessions (§ Phase B/C/F). Purely presentational —
 * the POS screen owns `dismissed` state and the open/close navigation, so the
 * component is trivially testable by feeding it different `activeSession` /
 * `hasHistory` / `dismissed` combinations.
 *
 * States:
 * - active session → "Caja abierta · hace 2h 15m — Cerrar caja" (tap to close),
 *   plus a gentle stale nudge when it has been open unusually long.
 * - no session but the business uses sessions → dismissible "¿Abrir caja…?"
 * - no session and never used the feature → nothing (no nag).
 */
export interface CashSessionBannerProps {
  activeSession: CashSession | null;
  hasHistory: boolean;
  dismissed: boolean;
  onOpen: () => void;
  onClose: () => void;
  onDismiss: () => void;
}

export function CashSessionBanner({
  activeSession,
  hasHistory,
  dismissed,
  onOpen,
  onClose,
  onDismiss,
}: CashSessionBannerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const durationLabel = useDurationLabel();

  if (activeSession) {
    const duration = durationLabel(activeSession.openedAt);
    const stale = isStale(activeSession.openedAt, STALE_SESSION_HOURS);
    return (
      <Pressable
        accessibilityRole="button"
        testID="cash-session-active-banner"
        onPress={onClose}
        style={({ pressed }) => [
          styles.banner,
          { borderColor: theme.border, backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        <MaterialCommunityIcons name="cash-register" size={20} color={theme.primary} />
        <View style={styles.textCol}>
          <ThemedText type="body2">{t('cashSession.banner.active', { duration })}</ThemedText>
          {stale ? (
            <ThemedText type="micro" themeColor="warning">
              {t('cashSession.banner.stale')}
            </ThemedText>
          ) : null}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>
    );
  }

  if (hasHistory && !dismissed) {
    return (
      <View
        testID="cash-session-open-banner"
        style={[styles.banner, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        <MaterialCommunityIcons name="cash-register" size={20} color={theme.primary} />
        <View style={styles.textCol}>
          <ThemedText type="body2">{t('cashSession.banner.open')}</ThemedText>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              testID="cash-session-open-action"
              onPress={onOpen}
              style={({ pressed }) => [
                styles.primaryAction,
                { backgroundColor: theme.primary },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="body2" style={{ color: theme.onPrimary }}>
                {t('cashSession.banner.openAction')}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="cash-session-open-dismiss"
              onPress={onDismiss}
              hitSlop={Spacing.two}
              style={({ pressed }) => [pressed && styles.pressed]}>
              <ThemedText type="body2" themeColor="textSecondary">
                {t('cashSession.banner.later')}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    minHeight: TouchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  textCol: {
    flex: 1,
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  primaryAction: {
    minHeight: TouchTarget.min,
    justifyContent: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
