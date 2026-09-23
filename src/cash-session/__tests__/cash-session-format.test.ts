/// <reference types="jest" />
/** @jest-environment node */

import { elapsedSince, isStale } from '@/cash-session/cash-session-format';

describe('cash-session duration helpers', () => {
  const now = new Date('2026-09-22T14:30:00.000Z');

  it('computes whole hours + remaining minutes elapsed', () => {
    expect(elapsedSince('2026-09-22T12:15:00.000Z', now)).toEqual({ hours: 2, minutes: 15 });
    expect(elapsedSince('2026-09-22T14:30:00.000Z', now)).toEqual({ hours: 0, minutes: 0 });
    expect(elapsedSince('2026-09-22T14:00:00.000Z', now)).toEqual({ hours: 0, minutes: 30 });
  });

  it('clamps negative elapsed time to zero', () => {
    expect(elapsedSince('2026-09-22T15:00:00.000Z', now)).toEqual({ hours: 0, minutes: 0 });
  });

  it('flags a session as stale once it passes the threshold', () => {
    expect(isStale('2026-09-21T14:30:00.000Z', 18, now)).toBe(true); // 24h ago
    expect(isStale('2026-09-22T13:30:00.000Z', 18, now)).toBe(false); // 1h ago
  });
});
