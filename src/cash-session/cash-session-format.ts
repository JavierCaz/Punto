import { dayjs } from '@/lib/dayjs';

/**
 * Pure duration helpers for cash-session presentation ("abierta hace 2h 15m").
 * Kept free of React/I/O so the close screen, POS banner and dashboard share one
 * source of truth for "how long has this session been open".
 */

export interface ElapsedParts {
  hours: number;
  minutes: number;
}

/** Whole hours + remaining minutes elapsed since `iso` (clamped at 0). */
export function elapsedSince(iso: string, now: Date = new Date()): ElapsedParts {
  const totalMinutes = Math.max(0, dayjs(now).diff(dayjs(iso), 'minute'));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

/** True when the session has been open at least `thresholdHours` hours. */
export function isStale(iso: string, thresholdHours: number, now: Date = new Date()): boolean {
  return dayjs(now).diff(dayjs(iso), 'hour') >= thresholdHours;
}
