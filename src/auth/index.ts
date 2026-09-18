/**
 * Auth barrel — public surface for authentication/authorization.
 *
 * Screens consume session/phase state through `useAuthStore`; repository
 * functions are used for actions the store doesn't own (team management).
 */

export { useAuthStore, resolveAuthPhase, isAuthPhase, SESSION_STORAGE_KEY } from '@/auth/auth-store';
export type { SignInOutcome, OnboardingOutcome } from '@/auth/auth-store';
export type { AuthEmployee, AuthKind, AuthPhase, AuthRole, SessionUser } from '@/auth/types';
export { AUTH_ROLES, DEFAULT_EMPLOYEE_ROLE } from '@/auth/types';
export {
  archiveEmployee,
  businessExists,
  createEmployee,
  findActiveEmployeeById,
  getBusiness,
  listActiveEmployees,
  updateEmployee,
  onboardBusiness,
  resolveAuthKind,
  signIn,
  hasAuthorizationPin,
  setAuthorizationPin,
  verifyManagerAuthorizationPin,
} from '@/auth/auth-repository';
export type { ManagerPinResult, PublicEmployee, UpdateEmployeeInput } from '@/auth/auth-repository';
export { loginLimiter, managerPinLimiter, MANAGER_PIN_LIMITER_KEY } from '@/auth/lockout';
export {
  normalizeUsername,
  validatePassword,
  validatePin,
  validateUsername,
} from '@/auth/validation';


// Role → capability authorization (RBAC). Repositories import from
// '@/auth/permissions' directly to avoid pulling this barrel into '@/db'.
export {
  AUTH_FORBIDDEN,
  CAPABILITIES,
  ForbiddenError,
  ROLE_CAPABILITIES,
  can,
  isForbiddenError,
  requireCapability,
} from '@/auth/permissions';
export type { AuthActor, Capability } from '@/auth/permissions';
export { useCan } from '@/auth/use-can';