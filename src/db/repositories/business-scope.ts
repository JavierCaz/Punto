import { getDb } from '@/db';

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

/** Return the single business id, memoized. Throws `REPO_NO_BUSINESS` if none. */
export async function getBusinessId(): Promise<string> {
  if (cachedBusinessId !== null) return cachedBusinessId;

  const db = await getDb();
  const row = await db.getFirstAsync<{ id: string }>('SELECT id FROM business LIMIT 1');
  if (!row) {
    throw repoError(REPO_ERROR.NO_BUSINESS);
  }

  cachedBusinessId = row.id;
  return cachedBusinessId;
}

/** Test helper: clear the memo so the next `getBusinessId()` re-queries. */
export function resetBusinessIdForTesting(): void {
  cachedBusinessId = null;
}
