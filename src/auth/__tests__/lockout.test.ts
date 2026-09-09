/**
 * @jest-environment node
 */

import { LoginLimiter, DEFAULT_LOCKOUT } from '@/auth/lockout';

/** Deterministic clock starting at t=0. */
function makeClock() {
  let now = 0;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('LoginLimiter', () => {
  it('allows attempts up to maxAttempts then locks', () => {
    const clock = makeClock();
    const limiter = new LoginLimiter(DEFAULT_LOCKOUT, clock.now);

    for (let i = 0; i < DEFAULT_LOCKOUT.maxAttempts; i++) {
      expect(limiter.isLocked('ana')).toBe(false);
      limiter.recordFailure('ana');
    }
    expect(limiter.isLocked('ana')).toBe(true);
    expect(limiter.retryAfterSec('ana')).toBe(DEFAULT_LOCKOUT.lockoutSec);
  });

  it('locks for the configured duration', () => {
    const clock = makeClock();
    const limiter = new LoginLimiter({ maxAttempts: 3, lockoutSec: 10 }, clock.now);

    for (let i = 0; i < 3; i++) {
      limiter.recordFailure('luis');
    }
    expect(limiter.retryAfterSec('luis')).toBe(10);

    clock.advance(9_000);
    expect(limiter.retryAfterSec('luis')).toBe(1);

    clock.advance(1_000);
    expect(limiter.retryAfterSec('luis')).toBe(0);
    expect(limiter.isLocked('luis')).toBe(false);
  });

  it('recordSuccess clears the counter', () => {
    const limiter = new LoginLimiter(DEFAULT_LOCKOUT, () => 0);
    limiter.recordFailure('ana');
    limiter.recordFailure('ana');
    limiter.recordSuccess('ana');
    expect(limiter.retryAfterSec('ana')).toBe(0);
    expect(limiter.isLocked('ana')).toBe(false);
  });

  it('tracks usernames independently', () => {
    const clock = makeClock();
    const limiter = new LoginLimiter({ maxAttempts: 2, lockoutSec: 30 }, clock.now);
    limiter.recordFailure('ana');
    limiter.recordFailure('ana');
    expect(limiter.isLocked('ana')).toBe(true);
    expect(limiter.isLocked('luis')).toBe(false);
  });

  it('returns the accumulated failure count in state', () => {
    const limiter = new LoginLimiter(DEFAULT_LOCKOUT, () => 0);
    expect(limiter.recordFailure('ana').failures).toBe(1);
    expect(limiter.recordFailure('ana').failures).toBe(2);
  });
});
