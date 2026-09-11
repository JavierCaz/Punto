import { getDb } from '@/db/client';
import { rollbackQuietly } from '@/db/rollback';

import type { DatabaseAdapter } from '@/db/repositories/database';

/**
 * The only transaction entry point. Runs `fn` on the main database connection
 * inside `BEGIN IMMEDIATE`, exposing the handle as a `DatabaseAdapter`.
 *
 * expo-sqlite's `withExclusiveTransactionAsync` is deliberately NOT used: it
 * opens a separate native connection that does not inherit the main
 * connection's `PRAGMA foreign_keys = ON`, so writes there skip FK enforcement
 * (and it is unsupported on web). The module-level queue serializes writes so
 * statements on the shared connection never interleave.
 */

let writeQueue: Promise<unknown> = Promise.resolve();

export function withTransaction<T>(fn: (txn: DatabaseAdapter) => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    const db = await getDb();
    await db.execAsync('BEGIN IMMEDIATE');
    try {
      const result = await fn(db as unknown as DatabaseAdapter);
      await db.execAsync('COMMIT');
      return result;
    } catch (error) {
      await rollbackQuietly(db);
      throw error;
    }
  };

  const next = writeQueue.then(run);
  writeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
