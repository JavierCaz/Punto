import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { elapsedSince } from '@/cash-session/cash-session-format';

/**
 * Localized duration label ("2h 15m", "3h", "45m", "ahora") for a session
 * opened at `iso`. Wraps `elapsedSince` with `t` (literal keys, so the strict
 * i18next key types typecheck) and is shared by the POS banner, history,
 * detail and dashboard.
 */
export function useDurationLabel(): (iso: string, now?: Date) => string {
  const { t } = useTranslation();
  return useCallback(
    (iso: string, now?: Date) => {
      const { hours, minutes } = elapsedSince(iso, now);
      if (hours === 0 && minutes === 0) {
        return t('cashSession.duration.justNow');
      }
      if (hours === 0) {
        return t('cashSession.duration.minutes', { minutes });
      }
      if (minutes === 0) {
        return t('cashSession.duration.hours', { hours });
      }
      return t('cashSession.duration.hoursMinutes', { hours, minutes });
    },
    [t],
  );
}
