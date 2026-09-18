/**
 * Auth domain vocabulary shared across the auth modules.
 *
 * The `employee` table (migration 001, extended by 002) is the single people +
 * credentials table. Roles are scoped to what exists today:
 * - ADMIN — business owner, created during first-run onboarding, signs in with
 *   username + password, manages the team.
 * - EMPLOYEE — staff added by the admin, signs in with username + PIN.
 *
 * Query/operation result shapes live on the auth repository (the caller-facing
 * API); this file only holds the cross-cutting domain vocabulary.
 */

export const AUTH_ROLES = ['ADMIN', 'EMPLOYEE'] as const;
export type AuthRole = (typeof AUTH_ROLES)[number];

export const DEFAULT_EMPLOYEE_ROLE: AuthRole = 'EMPLOYEE';

/** Which secret a user supplies at login: password (admin) or PIN (staff). */
export type AuthKind = 'password' | 'pin';

/** Public (hash-free) representation of an employee/account row. */
export interface AuthEmployee {
  id: string;
  businessId: string;
  firstName: string;
  lastName: string | null;
  username: string;
  role: AuthRole;
  isActive: boolean;
  createdAt: string;
}

/** Authenticated session identity cached by the auth store. */
export type SessionUser = AuthEmployee;

/** Boot/gating state: which surface the router should show. */
export type AuthPhase = 'loading' | 'onboarding' | 'login' | 'setup' | 'ready';
