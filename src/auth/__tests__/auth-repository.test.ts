/**
 * @jest-environment node
 *
 * Auth repository tests for `updateEmployee` against the scripted
 * RecordingAdapter fake (no native SQLite — see AGENTS §9.4). The hash and
 * crypto native modules are mocked because the update path only persists a
 * pre-computed hash.
 */

import { getDb } from '@/db/client';

import {
  hasAuthorizationPin,
  setAuthorizationPin,
  updateEmployee,
  verifyManagerAuthorizationPin,
} from '@/auth/auth-repository';
import { DEFAULT_LOCKOUT, MANAGER_PIN_LIMITER_KEY, managerPinLimiter } from '@/auth/lockout';
import { verifySecret } from '@/lib/hash';
import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

jest.mock('@/db/client', () => ({ getDb: jest.fn() }));
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'uuid-test'),
  getRandomBytesAsync: jest.fn(async () => new Uint8Array(16)),
}));
jest.mock('@/lib/hash', () => ({
  verifySecret: jest.fn(async () => true),
  needsRehash: jest.fn(() => false),
  hashSecret: jest.fn(async () => 'hashed'),
}));

const EMPLOYEE_ROW = {
  id: 'emp-2',
  business_id: 'biz-1',
  first_name: 'Luis',
  last_name: 'García',
  username: 'luis',
  role: 'EMPLOYEE',
  password_hash: null,
  pin_hash: 'pbkdf2-sha256$old',
  is_active: 1,
  archived_at: null,
  last_login_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const ADMIN_ROW = {
  ...EMPLOYEE_ROW,
  id: 'emp-1',
  first_name: 'Ana',
  last_name: null,
  username: 'ana',
  role: 'ADMIN',
  password_hash: 'pbkdf2-sha256$admin',
  pin_hash: null,
};

describe('updateEmployee', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  it('updates name/username (normalized) and resets the PIN for an EMPLOYEE', async () => {
    adapter.queueFirst('archived_at IS NULL LIMIT 1', EMPLOYEE_ROW);
    adapter.queueFirst('id != ?', null);
    adapter.queueFirst('FROM employee WHERE id = ?', {
      ...EMPLOYEE_ROW,
      first_name: 'Luis',
      last_name: 'García',
      username: 'luis.garcia',
      pin_hash: 'pbkdf2-sha256$new',
    });

    const result = await updateEmployee('emp-2', {
      firstName: '  Luis ',
      lastName: 'García',
      username: 'Luis.Garcia',
      pinHash: 'pbkdf2-sha256$new',
    });

    expect(result).toEqual({
      id: 'emp-2',
      businessId: 'biz-1',
      firstName: 'Luis',
      lastName: 'García',
      username: 'luis.garcia',
      role: 'EMPLOYEE',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const clash = adapter.calls.find((call) => call.sql.includes('id != ?'));
    expect(clash?.params).toEqual(['luis.garcia', 'emp-2']);

    const update = adapter.calls.find((call) => call.sql.includes('UPDATE employee SET'));
    expect(update?.sql).toContain('pin_hash = ?');
    expect(update?.params).toContain('luis.garcia');
    expect(update?.params).toContain('pbkdf2-sha256$new');
  });

  it('rejects a username already used by another live employee', async () => {
    adapter.queueFirst('archived_at IS NULL LIMIT 1', EMPLOYEE_ROW);
    adapter.queueFirst('id != ?', { id: 'emp-9' });

    await expect(
      updateEmployee('emp-2', { firstName: 'Luis', username: 'ana' }),
    ).rejects.toThrow('AUTH_USERNAME_TAKEN');
  });

  it('allows keeping the same username (no self-clash)', async () => {
    adapter.queueFirst('archived_at IS NULL LIMIT 1', EMPLOYEE_ROW);
    adapter.queueFirst('id != ?', null);
    adapter.queueFirst('FROM employee WHERE id = ?', EMPLOYEE_ROW);

    await expect(
      updateEmployee('emp-2', { firstName: 'Luis', username: 'luis' }),
    ).resolves.toMatchObject({ username: 'luis' });
  });

  it('rejects a PIN reset on an ADMIN account', async () => {
    adapter.queueFirst('archived_at IS NULL LIMIT 1', ADMIN_ROW);

    await expect(
      updateEmployee('emp-1', { firstName: 'Ana', username: 'ana', pinHash: 'nope' }),
    ).rejects.toThrow('AUTH_PIN_NOT_ALLOWED');

    // The guard runs before any username lookup or write.
    expect(adapter.calls.some((call) => call.sql.includes('UPDATE employee SET'))).toBe(false);
  });

  it('rejects a missing or archived target', async () => {
    adapter.queueFirst('archived_at IS NULL LIMIT 1', null);

    await expect(
      updateEmployee('emp-404', { firstName: 'Ghost', username: 'ghost' }),
    ).rejects.toThrow('AUTH_EMPLOYEE_NOT_FOUND');
  });

  it('rejects an empty first name without touching the database', async () => {
    await expect(
      updateEmployee('emp-2', { firstName: '   ', username: 'luis' }),
    ).rejects.toThrow('AUTH_FIRST_NAME_REQUIRED');
    expect(adapter.calls).toHaveLength(0);
  });

  it('clears the last name when it is emptied', async () => {
    adapter.queueFirst('archived_at IS NULL LIMIT 1', EMPLOYEE_ROW);
    adapter.queueFirst('id != ?', null);
    adapter.queueFirst('FROM employee WHERE id = ?', { ...EMPLOYEE_ROW, last_name: null });

    const result = await updateEmployee('emp-2', {
      firstName: 'Luis',
      lastName: '',
      username: 'luis',
    });

    expect(result.lastName).toBeNull();
    const update = adapter.calls.find((call) => call.sql.includes('UPDATE employee SET'));
    expect(update?.params).toContain(null);
  });
});

/** A complete SessionUser for the authorization-PIN tests. */
const ADMIN_SESSION = {
  id: 'emp-1',
  businessId: 'biz-1',
  firstName: 'Ana',
  lastName: null,
  username: 'ana',
  role: 'ADMIN',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
} as const;

describe('manager authorization PIN', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
    managerPinLimiter.clear();
    jest.mocked(verifySecret).mockResolvedValue(true);
  });

  it('reports no-pin-configured when no admin has an authorization PIN', async () => {
    adapter.queueAll('FROM employee', []);

    await expect(verifyManagerAuthorizationPin('1234')).resolves.toEqual({
      ok: false,
      code: 'no-pin-configured',
    });
  });

  it('returns the matching admin id', async () => {
    adapter.queueAll('FROM employee', [{ id: 'emp-1', authorization_pin_hash: 'hash' }]);

    await expect(verifyManagerAuthorizationPin('1234')).resolves.toEqual({
      ok: true,
      adminId: 'emp-1',
    });
  });

  it('scans every admin even after a match (no timing oracle)', async () => {
    adapter.queueAll('FROM employee', [
      { id: 'emp-1', authorization_pin_hash: 'hash-1' },
      { id: 'emp-2', authorization_pin_hash: 'hash-2' },
    ]);

    await expect(verifyManagerAuthorizationPin('1234')).resolves.toEqual({
      ok: true,
      adminId: 'emp-1',
    });
    expect(verifySecret).toHaveBeenCalledTimes(2);
  });

  it('reports invalid and records a failure when no admin matches', async () => {
    adapter.queueAll('FROM employee', [{ id: 'emp-1', authorization_pin_hash: 'hash' }]);
    jest.mocked(verifySecret).mockResolvedValue(false);

    await expect(verifyManagerAuthorizationPin('0000')).resolves.toEqual({
      ok: false,
      code: 'invalid',
    });
    expect(managerPinLimiter.isLocked(MANAGER_PIN_LIMITER_KEY)).toBe(false);
  });

  it('locks after repeated failures', async () => {
    for (let i = 0; i < DEFAULT_LOCKOUT.maxAttempts; i++) {
      adapter.queueAll('FROM employee', [{ id: 'emp-1', authorization_pin_hash: 'hash' }]);
    }
    jest.mocked(verifySecret).mockResolvedValue(false);

    for (let i = 0; i < DEFAULT_LOCKOUT.maxAttempts; i++) {
      await verifyManagerAuthorizationPin('0000');
    }
    const result = await verifyManagerAuthorizationPin('0000');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('locked');
    }
  });

  it('setAuthorizationPin rejects a non-admin actor without writing', async () => {
    await expect(
      setAuthorizationPin({ ...ADMIN_SESSION, role: 'EMPLOYEE' }, 'hash'),
    ).rejects.toMatchObject({ code: 'AUTH_FORBIDDEN' });
    expect(
      adapter.calls.some((call) => call.sql.includes('UPDATE employee SET authorization_pin_hash')),
    ).toBe(false);
  });

  it('setAuthorizationPin updates the admin row', async () => {
    await setAuthorizationPin(ADMIN_SESSION, 'hash');

    const update = adapter.calls.find((call) =>
      call.sql.includes('UPDATE employee SET authorization_pin_hash'),
    );
    expect(update?.params).toContain('hash');
    expect(update?.params).toContain('emp-1');
  });

  it('hasAuthorizationPin reflects the stored column', async () => {
    adapter.queueFirst('FROM employee', { authorization_pin_hash: 'hash' });
    await expect(hasAuthorizationPin('emp-1')).resolves.toBe(true);

    adapter.queueFirst('FROM employee', { authorization_pin_hash: null });
    await expect(hasAuthorizationPin('emp-1')).resolves.toBe(false);
  });
});
