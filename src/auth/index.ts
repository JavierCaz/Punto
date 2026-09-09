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
  onboardBusiness,
  resolveAuthKind,
  signIn,
} from '@/auth/auth-repository';
export type { PublicEmployee } from '@/auth/auth-repository';
export { loginLimiter } from '@/auth/lockout';
export {
  normalizeUsername,
  validatePassword,
  validatePin,
  validateUsername,
} from '@/auth/validation';
