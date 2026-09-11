import { getDb } from '@/db/client';

import type { DatabaseAdapter } from '@/db/repositories/database';

/**
 * Run `fn` inside a single exclusive SQLite transaction, exposing the active
 * transaction handle as a `DatabaseAdapter`.
 *
 * This is the ONLY place a transaction is opened: repositories never call
 * `withExclusiveTransactionAsync` themselves. Because `DatabaseAdapter` has no
 * transaction method, a repository cannot (accidentally) nest transactions —
 * the inner code only ever sees a plain query surface.
 *
 * Implementation note: expo-sqlite's `withExclusiveTransactionAsync` types the
 * task as `(txn) => Promise<void>` and resolves `Promise<void>`, so we capture
 * the task's result via a definite-assignment variable and return it after the
 * transaction commits (or let the rejection propagate on rollback). The single
 * `as unknown as DatabaseAdapter` cast bridges expo-sqlite's non-exported
 * `Transaction` type to our adapter seam; it is contained here by design.
 */
export async function withTransaction<T>(fn: (txn: DatabaseAdapter) => Promise<T>): Promise<T> {
  const db = await getDb();

  let result!: T;
  await db.withExclusiveTransactionAsync(async (txn) => {
    result = await fn(txn as unknown as DatabaseAdapter);
  });
  return result;
}
