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

const AUTH_PHASES: readonly string[] = ['loading', 'onboarding', 'login', 'ready'];

export function isAuthPhase(value: unknown): value is AuthPhase {
  return typeof value === 'string' && AUTH_PHASES.includes(value);
}

/** Pure decision: which phase a business-exists + session-user pair yields. */
export function resolveAuthPhase(hasBusiness: boolean, user: SessionUser | null): AuthPhase {
  if (!hasBusiness) return 'onboarding';
  return user ? 'ready' : 'login';
}

export type SignInOutcome =
  | { ok: true; user: SessionUser }
  | { ok: false; code: 'invalid-credentials' | 'locked'; retryAfterSec?: number };

export type OnboardingOutcome =
  | { ok: true; user: SessionUser }
  | { ok: false; code: 'username-taken' | 'invalid-input' | 'failed' };

interface AuthStoreState {
  phase: AuthPhase;
  /** Current session identity; non-null exactly when phase === 'ready'. */
  user: SessionUser | null;
  hasHydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (username: string, secret: string) => Promise<SignInOutcome>;
  completeOnboarding: (input: {
    businessName: string;
    currencyCode: string;
    locale: string;
    adminFirstName: string;
    adminLastName?: string;
    username: string;
    password: string;
  }) => Promise<OnboardingOutcome>;
  signOut: () => void;
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

      set({ user, phase: resolveAuthPhase(hasBusiness, user) });
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
    await Storage.setItemAsync(SESSION_STORAGE_KEY, result.user.id);
    set({ user: result.user, phase: 'ready' });
    return { ok: true, user: result.user };
  },

  completeOnboarding: async (input) => {
    const passwordHash = await hashSecret(input.password);
    try {
      const { employeeId } = await onboardBusiness({
        businessName: input.businessName,
        currencyCode: input.currencyCode,
        locale: input.locale,
        adminFirstName: input.adminFirstName,
        adminLastName: input.adminLastName,
        username: input.username,
        passwordHash,
      });
      const user = await findActiveEmployeeById(employeeId);
      if (!user) {
        return { ok: false, code: 'failed' };
      }
      await Storage.setItemAsync(SESSION_STORAGE_KEY, user.id);
      set({ user, phase: 'ready' });
      return { ok: true, user };
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTH_USERNAME_TAKEN') {
        return { ok: false, code: 'username-taken' };
      }
      return { ok: false, code: 'failed' };
    }
  },

  signOut: () => {
    loginLimiter.clear();
    void Storage.removeItemAsync(SESSION_STORAGE_KEY).catch(() => {
      // Noop — the in-memory phase change already applies for this session.
    });
    set({ user: null, phase: 'login' });
  },
}));
