import { getDb } from '@/db/client';

import { REPO_ERROR, repoError } from '@/db/repositories/errors';

/**
 * Business scope resolution.
 *
 * Punto's database holds exactly ONE business row (AGENTS §3.3 / migration
 * 001); every entity repository needs that id to scope its queries. This module
 * memoizes the id after the first lookup so the single-row `SELECT` runs at
 * most once per process (the business row never changes id in v1).
 *
 * A missing business row means onboarding has not completed — the repository
 * surface therefore throws `REPO_NO_BUSINESS` instead of returning a nullable.
 */
let cachedBusinessId: string | null = null;
let businessIdPromise: Promise<string> | null = null;

/** Return the single business id, memoized. Throws `REPO_NO_BUSINESS` if none. */
export async function getBusinessId(): Promise<string> {
  if (cachedBusinessId !== null) return cachedBusinessId;

  // Cache the IN-FLIGHT lookup too, not just the resolved value: screens load
  // several repositories in parallel (Promise.all), and each would otherwise
  // race past the null check and issue its own `SELECT id FROM business`.
  if (businessIdPromise === null) {
    businessIdPromise = (async () => {
      const db = await getDb();
      const row = await db.getFirstAsync<{ id: string }>('SELECT id FROM business LIMIT 1');
      if (!row) {
        throw repoError(REPO_ERROR.NO_BUSINESS);
      }
      cachedBusinessId = row.id;
      return cachedBusinessId;
    })().catch((error) => {
      // Drop the failed promise so a later call retries instead of rejecting
      // forever.
      businessIdPromise = null;
      throw error;
    });
  }
  return businessIdPromise;
}

/**
 * Clear the memo so the next `getBusinessId()` re-queries.
 *
 * MUST be called after any bulk change that replaces or removes the single
 * business row (JSON import / clear-all): otherwise every repository keeps
 * scoping its queries to the stale id and the app appears empty.
 */
export function resetBusinessScope(): void {
  cachedBusinessId = null;
  businessIdPromise = null;
}

/** Test helper alias for {@link resetBusinessScope}. */
export function resetBusinessIdForTesting(): void {
  resetBusinessScope();
}
