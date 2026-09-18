import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import { type AuthPhase, type SessionUser } from '@/auth/types';
import {
  businessExists,
  findActiveEmployeeById,
  onboardBusiness,
  signIn as repoSignIn,
} from '@/auth/auth-repository';
import { loginLimiter } from '@/auth/lockout';
import { getSetupCompleted, setSetupCompleted } from '@/db';
import { hashSecret } from '@/lib/hash';

/**
 * Auth session store.
 *
 * - Owns the boot/gating phase (`loading → onboarding | login | ready`) that
 *   the root layout's three Stack.Protected guards derive from. Phase is
 *   resolved ONCE during hydrate() so the first rendered guard values are
 *   final (Oracle: no post-mount guard flip → no redirect-on-first-frame).
 * - Persists only the *current employee id* in kv-store (non-secret pointer,
 *   verified against SQLite on every boot). Secrets live as salted hashes in
 *   the employee table; the kv-store value is never treated as trusted alone.
 *
 * Mirrors theme-store's hydrate()/hasHydrated pattern (src/theme/theme-store.ts).
 */

export const SESSION_STORAGE_KEY = 'punto.session-employee-id';

const AUTH_PHASES: readonly string[] = ['loading', 'onboarding', 'login', 'setup', 'ready'];

export function isAuthPhase(value: unknown): value is AuthPhase {
  return typeof value === 'string' && AUTH_PHASES.includes(value);
}

/**
 * Pure decision: which surface a (business-exists, session-user,
 * setup-completed) triple yields. A missing setup flag means the guided wizard
 * is still pending for an authenticated owner.
 */
export function resolveAuthPhase(
  hasBusiness: boolean,
  user: SessionUser | null,
  setupCompleted: boolean,
): AuthPhase {
  if (!hasBusiness) return 'onboarding';
  if (!user) return 'login';
  return setupCompleted ? 'ready' : 'setup';
}

export type SignInOutcome =
  | { ok: true; user: SessionUser }
  | { ok: false; code: 'invalid-credentials' | 'locked'; retryAfterSec?: number };

export type OnboardingOutcome =
  | { ok: true; user: SessionUser }
  | { ok: false; code: 'username-taken' | 'invalid-input' | 'failed' };

interface AuthStoreState {
  phase: AuthPhase;
  /** Current session identity; non-null in the 'setup' and 'ready' phases. */
  user: SessionUser | null;
  hasHydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (username: string, secret: string) => Promise<SignInOutcome>;
  completeOnboarding: (input: {
    businessName: string;
    /** Durable logo URI from the onboarding picker, or null/absent. */
    logoUri?: string | null;
    currencyCode: string;
    locale: string;
    adminFirstName: string;
    adminLastName?: string;
    username: string;
    password: string;
  }) => Promise<OnboardingOutcome>;
  completeSetup: () => Promise<void>;
  signOut: () => void;
  /**
   * Reset the session after the business row is removed (clear-all data):
   * clears the persisted session pointer + login limiter and returns to the
   * first-run onboarding phase.
   */
  resetToOnboarding: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>()((set, get) => ({
  phase: 'loading',
  user: null,
  hasHydrated: false,

  hydrate: async () => {
    if (get().hasHydrated) {
      return;
    }
    try {
      const hasBusiness = await businessExists();

      let user: SessionUser | null = null;
      if (hasBusiness) {
        const storedId = await Storage.getItemAsync(SESSION_STORAGE_KEY);
        if (storedId) {
          user = await findActiveEmployeeById(storedId);
        }
      }
      const setupCompleted = hasBusiness ? await getSetupCompleted() : false;

      set({ user, phase: resolveAuthPhase(hasBusiness, user, setupCompleted) });
    } finally {
      set({ hasHydrated: true });
    }
  },

  signIn: async (username, secret) => {
    const result = await repoSignIn(username, secret);
    if (!result.ok) {
      return {
        ok: false,
        code: result.code === 'locked' ? 'locked' : 'invalid-credentials',
        retryAfterSec: result.retryAfterSec,
      };
    }
    const setupCompleted = await getSetupCompleted().catch(() => false);
    await Storage.setItemAsync(SESSION_STORAGE_KEY, result.user.id);
    // An authenticated owner whose setup is incomplete resumes the wizard
    // instead of landing in the tabs (e.g. sign-out mid-setup + re-login).
    set({ user: result.user, phase: setupCompleted ? 'ready' : 'setup' });
    return { ok: true, user: result.user };
  },

  completeOnboarding: async (input) => {
    const passwordHash = await hashSecret(input.password);
    try {
      const { employeeId } = await onboardBusiness({
        businessName: input.businessName,
        logoUri: input.logoUri,
        currencyCode: input.currencyCode,
        locale: input.locale,
        adminFirstName: input.adminFirstName,
        adminLastName: input.adminLastName,
        username: input.username,
        passwordHash,
      });
      // Persist the session pointer before the read so an app kill in this
      // window still resumes the wizard instead of dropping to login.
      await Storage.setItemAsync(SESSION_STORAGE_KEY, employeeId);
      const user = await findActiveEmployeeById(employeeId);
      if (!user) {
        return { ok: false, code: 'failed' };
      }
      set({ user, phase: 'setup' });
      return { ok: true, user };
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTH_USERNAME_TAKEN') {
        return { ok: false, code: 'username-taken' };
      }
      return { ok: false, code: 'failed' };
    }
  },

  completeSetup: async () => {
    await setSetupCompleted(true);
    set({ phase: 'ready' });
  },

  signOut: () => {
    loginLimiter.clear();
    void Storage.removeItemAsync(SESSION_STORAGE_KEY).catch(() => {
      // Noop — the in-memory phase change already applies for this session.
    });
    set({ user: null, phase: 'login' });
  },

  resetToOnboarding: async () => {
    loginLimiter.clear();
    try {
      await Storage.removeItemAsync(SESSION_STORAGE_KEY);
    } catch {
      // Noop — the in-memory phase change already applies for this session.
    }
    set({ user: null, phase: 'onboarding' });
  },
}));
