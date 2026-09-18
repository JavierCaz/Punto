/**
 * In-memory login attempt limiter (PIN brute-force mitigation).
 *
 * Security rationale (Oracle-reviewed): for a 4–6 digit PIN on a shared
 * offline POS, throttling while the app runs is the effective control; a
 * persisted counter would only defend against offline hash brute-force, where
 * it provides zero protection while adding self-DoS risk. v1 is therefore
 * purely in-memory and per-username. Revisit only if idle re-auth or remote
 * login is ever added.
 */

export interface LockoutConfig {
  maxAttempts: number;
  lockoutSec: number;
}

export const DEFAULT_LOCKOUT: LockoutConfig = { maxAttempts: 5, lockoutSec: 30 };

export interface LockoutState {
  failures: number;
  lockedUntilMs: number;
}

export type NowFn = () => number;

export class LoginLimiter {
  private readonly states = new Map<string, LockoutState>();

  constructor(
    private readonly config: LockoutConfig = DEFAULT_LOCKOUT,
    private readonly now: NowFn = Date.now,
  ) {}

  /** Seconds until `username` may retry; 0 when allowed. Expired locks reset. */
  retryAfterSec(username: string): number {
    const state = this.states.get(username);
    if (!state || state.lockedUntilMs === 0) return 0;
    const remaining = Math.ceil((state.lockedUntilMs - this.now()) / 1000);
    if (remaining <= 0) {
      this.states.delete(username);
      return 0;
    }
    return remaining;
  }

  isLocked(username: string): boolean {
    return this.retryAfterSec(username) > 0;
  }

  /** Count a failed attempt; crosses the threshold into a lock at maxAttempts. */
  recordFailure(username: string): LockoutState {
    const current = this.states.get(username) ?? { failures: 0, lockedUntilMs: 0 };
    const failures = current.failures + 1;
    const state: LockoutState =
      failures >= this.config.maxAttempts
        ? { failures, lockedUntilMs: this.now() + this.config.lockoutSec * 1000 }
        : { failures, lockedUntilMs: 0 };
    this.states.set(username, state);
    return state;
  }

  recordSuccess(username: string): void {
    this.states.delete(username);
  }

  clear(): void {
    this.states.clear();
  }
}

export const loginLimiter = new LoginLimiter();

/**
 * Manager-authorization PIN limiter (employee-initiated refund overrides).
 *
 * Same in-memory rationale as {@link loginLimiter}, but keyed globally because
 * the authorization prompt has no username. Deliberately NOT cleared on
 * sign-out: otherwise an employee could reset the lockout by signing out and
 * back in.
 */
export const MANAGER_PIN_LIMITER_KEY = 'manager-pin';
export const managerPinLimiter = new LoginLimiter();
