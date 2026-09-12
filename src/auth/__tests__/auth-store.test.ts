/**
 * @jest-environment node
 *
 * Auth-store tests: phase resolution, hydration (boot gating), sign-in and
 * sign-out persistence, and onboarding. kv-store, the auth repository and the
 * hash module are mocked so no SQLite/native code runs in the node env.
 */

import { resolveAuthPhase, SESSION_STORAGE_KEY, useAuthStore } from '@/auth/auth-store';
import type { SessionUser } from '@/auth/types';

const mockMemory = new Map<string, string>();

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemAsync: jest.fn(async (key: string) => mockMemory.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      mockMemory.set(key, value);
    }),
    removeItemAsync: jest.fn(async (key: string) => {
      mockMemory.delete(key);
    }),
  },
}));

const mockRepo = {
  businessExists: jest.fn(),
  findActiveEmployeeById: jest.fn(),
  onboardBusiness: jest.fn(),
  signIn: jest.fn(),
};
jest.mock('@/auth/auth-repository', () => ({
  businessExists: (...args: unknown[]) => mockRepo.businessExists(...args),
  findActiveEmployeeById: (...args: unknown[]) => mockRepo.findActiveEmployeeById(...args),
  onboardBusiness: (...args: unknown[]) => mockRepo.onboardBusiness(...args),
  signIn: (...args: unknown[]) => mockRepo.signIn(...args),
}));

const mockHash = { hashSecret: jest.fn() };
jest.mock('@/lib/hash', () => ({
  hashSecret: (...args: unknown[]) => mockHash.hashSecret(...args),
}));

const admin: SessionUser = {
  id: 'emp-1',
  businessId: 'biz-1',
  firstName: 'Ana',
  lastName: null,
  username: 'ana.duena',
  role: 'ADMIN',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const employee: SessionUser = {
  id: 'emp-2',
  businessId: 'biz-1',
  firstName: 'Luis',
  lastName: 'García',
  username: 'luis.garcia',
  role: 'EMPLOYEE',
  isActive: true,
  createdAt: '2026-01-02T00:00:00.000Z',
};

beforeEach(() => {
  mockMemory.clear();
  jest.clearAllMocks();
  useAuthStore.setState({ phase: 'loading', user: null, hasHydrated: false });
});

describe('resolveAuthPhase', () => {
  it('no business -> onboarding regardless of a stale user', () => {
    expect(resolveAuthPhase(false, admin)).toBe('onboarding');
  });

  it('business without a user -> login', () => {
    expect(resolveAuthPhase(true, null)).toBe('login');
  });

  it('business with a user -> ready', () => {
    expect(resolveAuthPhase(true, admin)).toBe('ready');
  });
});

describe('auth store hydrate', () => {
  it('routes to onboarding when no business exists', async () => {
    mockRepo.businessExists.mockResolvedValue(false);

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().phase).toBe('onboarding');
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().hasHydrated).toBe(true);
  });

  it('routes to login when a business exists but no persisted session', async () => {
    mockRepo.businessExists.mockResolvedValue(true);

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().phase).toBe('login');
  });

  it('restores a valid persisted session to ready', async () => {
    mockRepo.businessExists.mockResolvedValue(true);
    mockMemory.set(SESSION_STORAGE_KEY, admin.id);
    mockRepo.findActiveEmployeeById.mockResolvedValue(admin);

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().phase).toBe('ready');
    expect(useAuthStore.getState().user?.id).toBe(admin.id);
  });

  it('ignores a stale session id (archived/inactive user)', async () => {
    mockRepo.businessExists.mockResolvedValue(true);
    mockMemory.set(SESSION_STORAGE_KEY, 'emp-gone');
    mockRepo.findActiveEmployeeById.mockResolvedValue(null);

    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().phase).toBe('login');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('hydrate is idempotent', async () => {
    mockRepo.businessExists.mockResolvedValue(false);

    await useAuthStore.getState().hydrate();
    await useAuthStore.getState().hydrate();

    expect(mockRepo.businessExists).toHaveBeenCalledTimes(1);
  });
});

describe('auth store sign-in', () => {
  it('signs in and persists the session pointer', async () => {
    mockRepo.signIn.mockResolvedValue({ ok: true, user: employee });

    const result = await useAuthStore.getState().signIn('luis.garcia', '1234');

    expect(result).toEqual({ ok: true, user: employee });
    expect(useAuthStore.getState().phase).toBe('ready');
    expect(useAuthStore.getState().user?.id).toBe(employee.id);
    expect(mockMemory.get(SESSION_STORAGE_KEY)).toBe(employee.id);
  });

  it('surfaces invalid credentials without changing the phase', async () => {
    mockRepo.signIn.mockResolvedValue({ ok: false, code: 'invalid' });

    const result = await useAuthStore.getState().signIn('luis.garcia', '9999');

    expect(result).toEqual({ ok: false, code: 'invalid-credentials', retryAfterSec: undefined });
    expect(useAuthStore.getState().phase).toBe('loading');
    expect(mockMemory.has(SESSION_STORAGE_KEY)).toBe(false);
  });

  it('surfaces the lockout code and retry window', async () => {
    mockRepo.signIn.mockResolvedValue({ ok: false, code: 'locked', retryAfterSec: 30 });

    const result = await useAuthStore.getState().signIn('luis.garcia', '0000');

    expect(result).toEqual({ ok: false, code: 'locked', retryAfterSec: 30 });
  });
});

describe('auth store sign-out', () => {
  it('clears the session and returns to login', async () => {
    useAuthStore.setState({ phase: 'ready', user: admin });
    mockMemory.set(SESSION_STORAGE_KEY, admin.id);

    useAuthStore.getState().signOut();

    expect(useAuthStore.getState().phase).toBe('login');
    expect(useAuthStore.getState().user).toBeNull();
    // removeItemAsync is fire-and-forget; flush microtasks then assert.
    await Promise.resolve();
    expect(mockMemory.has(SESSION_STORAGE_KEY)).toBe(false);
  });
});

describe('auth store onboarding', () => {
  it('creates the business + admin and auto-signs in', async () => {
    mockRepo.businessExists.mockResolvedValue(false);
    mockHash.hashSecret.mockResolvedValue('pbkdf2-sha256$150000$salt$dk');
    mockRepo.onboardBusiness.mockResolvedValue({ businessId: 'biz-1', employeeId: admin.id });
    mockRepo.findActiveEmployeeById.mockResolvedValue(admin);

    const result = await useAuthStore.getState().completeOnboarding({
      businessName: 'Café La Esquina',
      logoUri: 'file:///doc/logos/logo-1.png',
      currencyCode: 'USD',
      locale: 'es',
      adminFirstName: 'Ana',
      username: 'ana.duena',
      password: 'sup3r-secret',
    });

    expect(result).toEqual({ ok: true, user: admin });
    expect(mockRepo.onboardBusiness).toHaveBeenCalledWith({
      businessName: 'Café La Esquina',
      logoUri: 'file:///doc/logos/logo-1.png',
      currencyCode: 'USD',
      locale: 'es',
      adminFirstName: 'Ana',
      adminLastName: undefined,
      username: 'ana.duena',
      passwordHash: 'pbkdf2-sha256$150000$salt$dk',
    });
    expect(useAuthStore.getState().phase).toBe('ready');
    expect(mockMemory.get(SESSION_STORAGE_KEY)).toBe(admin.id);
  });
});
