import type { DatabaseAdapter } from '@/db/repositories/database';
import type { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

/**
 * Fake `getDb()` replacement for repository unit tests.
 *
 * Repository reads call `getDb()` directly, while writes go through
 * `withTransaction()` which calls `db.withExclusiveTransactionAsync(task)`.
 * This helper exposes both: reads delegate straight to the shared
 * `RecordingAdapter`, and the transaction method invokes the task with that same
 * adapter — mirroring how expo-sqlite hands the task an in-scope transaction
 * handle.
 *
 * Rollback-on-throw is a native SQLite behavior and is intentionally NOT
 * modeled here (see AGENTS §9.4: real SQLite behavior is exercised in the
 * integration/test-build suite, not in jest unit tests).
 *
 * Typical test setup:
 *
 *   jest.mock('@/db', () => ({ getDb: jest.fn() }));
 *   import { getDb } from '@/db';
 *   const adapter = new RecordingAdapter();
 *   (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
 */
export function makeFakeDb(adapter: RecordingAdapter): {
  getFirstAsync: DatabaseAdapter['getFirstAsync'];
  getAllAsync: DatabaseAdapter['getAllAsync'];
  runAsync: DatabaseAdapter['runAsync'];
  withExclusiveTransactionAsync: (task: (txn: DatabaseAdapter) => Promise<void>) => Promise<void>;
} {
  return {
    getFirstAsync: adapter.getFirstAsync.bind(adapter),
    getAllAsync: adapter.getAllAsync.bind(adapter),
    runAsync: adapter.runAsync.bind(adapter),
    withExclusiveTransactionAsync: async (task) => {
      await task(adapter);
    },
  };
}
