import { useAuthStore } from '@/auth/auth-store';
import { can, type Capability } from '@/auth/permissions';

/**
 * React binding for {@link can}: subscribe a screen to one capability.
 *
 * Lives apart from `permissions.ts` so the pure authorization helpers stay
 * dependency-free (repositories import them without dragging the auth store —
 * and therefore `@/db` — into a cycle).
 *
 *   const canManageCatalog = useCan('catalog.manage');
 */
export function useCan(capability: Capability): boolean {
  return useAuthStore((state) => can(state.user, capability));
}
