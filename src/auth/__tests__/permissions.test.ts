/**
 * @jest-environment node
 *
 * Pure authorization invariants for the role → capability map. These pin the
 * security contract in ONE place: adding a capability defaults to ADMIN-only
 * (fail closed) unless it is deliberately granted to EMPLOYEE.
 */

import {
  AUTH_FORBIDDEN,
  CAPABILITIES,
  ForbiddenError,
  ROLE_CAPABILITIES,
  can,
  isForbiddenError,
  requireCapability,
} from '@/auth/permissions';
import type { Capability } from '@/auth/permissions';

const ADMIN = { role: 'ADMIN' } as const;
const EMPLOYEE = { role: 'EMPLOYEE' } as const;

/** The complete EMPLOYEE allow-list (kept explicit so a leak is a test failure). */
const EMPLOYEE_ALLOWED: readonly Capability[] = [
  'pos.sell',
  'sales.view',
  'catalog.view',
  'inventory.view',
  'operations.view',
];

/** Everything an EMPLOYEE must never hold. */
const ADMIN_ONLY: readonly Capability[] = [
  'sales.refund',
  'sales.viewAll',
  'catalog.manage',
  'inventory.manage',
  'operations.manage',
  'dashboard.finance.view',
  'settings.manage',
  'team.manage',
  'data.export',
  'data.import',
  'data.erase',
];

describe('permissions', () => {
  it('exposes ADMIN_ONLY ∪ EMPLOYEE_ALLOWED as exactly the capability set', () => {
    expect([...EMPLOYEE_ALLOWED, ...ADMIN_ONLY].sort()).toEqual([...CAPABILITIES].sort());
  });

  it('grants ADMIN every capability', () => {
    for (const capability of CAPABILITIES) {
      expect(can(ADMIN, capability)).toBe(true);
    }
  });

  it('grants EMPLOYEE exactly the operations allow-list', () => {
    for (const capability of EMPLOYEE_ALLOWED) {
      expect(can(EMPLOYEE, capability)).toBe(true);
    }
    for (const capability of ADMIN_ONLY) {
      expect(can(EMPLOYEE, capability)).toBe(false);
    }
  });

  it('denies a missing user (fail closed)', () => {
    for (const capability of CAPABILITIES) {
      expect(can(null, capability)).toBe(false);
      expect(can(undefined, capability)).toBe(false);
    }
  });

  it('ROLE_CAPABILITIES matches can()', () => {
    for (const capability of CAPABILITIES) {
      expect(ROLE_CAPABILITIES.ADMIN.includes(capability)).toBe(can(ADMIN, capability));
      expect(ROLE_CAPABILITIES.EMPLOYEE.includes(capability)).toBe(can(EMPLOYEE, capability));
    }
  });

  it('requireCapability throws a typed ForbiddenError for a denied capability', () => {
    expect(() => requireCapability(EMPLOYEE, 'data.erase')).toThrow(ForbiddenError);
    try {
      requireCapability(EMPLOYEE, 'data.erase');
    } catch (error) {
      expect(isForbiddenError(error)).toBe(true);
      expect((error as ForbiddenError).code).toBe(AUTH_FORBIDDEN);
      expect((error as ForbiddenError).capability).toBe('data.erase');
    }
  });

  it('requireCapability is a no-op for a granted capability', () => {
    expect(() => requireCapability(ADMIN, 'data.erase')).not.toThrow();
    expect(() => requireCapability(EMPLOYEE, 'pos.sell')).not.toThrow();
  });

  it('isForbiddenError is false for unrelated errors', () => {
    expect(isForbiddenError(new Error('boom'))).toBe(false);
    expect(isForbiddenError(null)).toBe(false);
  });
});
