import type { AuthRole, SessionUser } from '@/auth/types';

/**
 * Role → capability authorization (RBAC) — the single vocabulary shared by the
 * router guards, the screens' `useCan()` visibility and the repositories'
 * `requireCapability()` asserts.
 *
 * Design (Oracle-reviewed):
 * - Permissions are FIXED per role, derived purely from `AuthRole`. Two roles,
 *   deliberately (AGENTS §3.1): ADMIN = owner, full access; EMPLOYEE = staff.
 * - Capabilities are named by PRODUCT SURFACE / ACTION (screen level), not by
 *   table or CRUD verb — a ~15-item set, not a per-entity matrix.
 * - `can()` is the ONE decision point; `null` user is always denied.
 * - This module is intentionally dependency-free (types only) so repositories
 *   can import it without pulling the auth store / repository into `@/db`
 *   (which would create an import cycle). The React hook lives in `use-can.ts`.
 */

export const CAPABILITIES = [
  /** POS: build a cart, charge, hold/resume the active cart. */
  'pos.sell',
  /** Sales history + receipt view (read-only). */
  'sales.view',
  /** See all-time sales history and older ranges (30 days, all). ADMIN-only. */
  'sales.viewAll',
  /** Refund a completed sale / cancel another user's held cart. */
  'sales.refund',
  /** Browse products / categories / ingredients (read-only). */
  'catalog.view',
  /** Create/edit/archive products, categories and ingredients. */
  'catalog.manage',
  /** View stock levels and movement history (read-only). */
  'inventory.view',
  /** Stock adjustments. */
  'inventory.manage',
  /** Browse suppliers / purchases / expenses (read-only). */
  'operations.view',
  /** Create/edit suppliers, purchases and expenses. */
  'operations.manage',
  /** Business-wide financial dashboard (cash flow, charts). */
  'dashboard.finance.view',
  /** The entire Settings screen (appearance, business profile, data). */
  'settings.manage',
  /** Add/edit/archive employees. */
  'team.manage',
  /** Export/copy/share a JSON backup. */
  'data.export',
  /** Import a JSON backup (replace-all). */
  'data.import',
  /** Erase all business data. */
  'data.erase',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/**
 * Capabilities an EMPLOYEE holds. Everything else in {@link CAPABILITIES} is
 * ADMIN-only. Kept as an explicit allow-list so a new capability defaults to
 * ADMIN-only (fail closed) until it is deliberately granted here.
 */
const EMPLOYEE_CAPABILITIES: readonly Capability[] = [
  'pos.sell',
  'sales.view',
  'catalog.view',
  'inventory.view',
  'operations.view',
];

export const ROLE_CAPABILITIES = {
  ADMIN: CAPABILITIES,
  EMPLOYEE: EMPLOYEE_CAPABILITIES,
} as const satisfies Record<AuthRole, readonly Capability[]>;

/** The minimal actor shape the pure authorization helpers need. */
export type AuthActor = Pick<SessionUser, 'role'> | null | undefined;

/** Pure capability check. A missing user (signed out / still hydrating) is denied. */
export function can(actor: AuthActor, capability: Capability): boolean {
  if (!actor) {
    return false;
  }
  return (ROLE_CAPABILITIES[actor.role] as readonly Capability[]).includes(capability);
}

/** Error code thrown by {@link requireCapability} (screens map it to i18n copy). */
export const AUTH_FORBIDDEN = 'AUTH_FORBIDDEN';

/** Typed forbidden error — never a generic `Error`, so callers can branch on `code`. */
export class ForbiddenError extends Error {
  readonly code = AUTH_FORBIDDEN;
  readonly capability: Capability;

  constructor(capability: Capability) {
    super(`${AUTH_FORBIDDEN}: missing capability "${capability}"`);
    this.name = 'ForbiddenError';
    this.capability = capability;
  }
}

/**
 * Data-layer assert: throw {@link ForbiddenError} unless `actor` holds
 * `capability`. Call as the first line of a sensitive repository operation so
 * authorization does not depend solely on UI visibility or route guards.
 */
export function requireCapability(actor: AuthActor, capability: Capability): void {
  if (!can(actor, capability)) {
    throw new ForbiddenError(capability);
  }
}

/** True when `error` is the typed forbidden error (or carries its code). */
export function isForbiddenError(error: unknown): error is ForbiddenError {
  return (
    error instanceof ForbiddenError ||
    (error instanceof Error && error.message.startsWith(AUTH_FORBIDDEN))
  );
}
