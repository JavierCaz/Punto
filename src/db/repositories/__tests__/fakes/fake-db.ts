import type { DatabaseAdapter, SqlValue } from '@/db/repositories/database';
import type { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

/**
 * Fake `getDb()` replacement for repository unit tests.
 *
 * Repository reads call `getDb()` directly, while writes go through
 * `withTransaction()`, which issues BEGIN IMMEDIATE / COMMIT / ROLLBACK via
 * `execAsync` and runs the task against this same handle. The fake exposes the
 * adapter's query methods plus a no-op `execAsync`, so the transaction control
 * statements are not recorded as domain queries.
 *
 * Rollback-on-throw is a native SQLite behavior and is intentionally NOT
 * modeled here (see AGENTS §9.4: real SQLite behavior is exercised in the
 * integration/test-build suite, not in jest unit tests).
 *
 * Typical test setup:
 *
 *   jest.mock('@/db/client', () => ({ getDb: jest.fn() }));
 *   import { getDb } from '@/db/client';
 *   const adapter = new RecordingAdapter();
 *   (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
 */
export function makeFakeDb(adapter: RecordingAdapter): {
  execAsync: (source: string) => Promise<void>;
  getFirstAsync: DatabaseAdapter['getFirstAsync'];
  getAllAsync: DatabaseAdapter['getAllAsync'];
  runAsync: DatabaseAdapter['runAsync'];
} {
  return {
    execAsync: async () => {},
    // Dispatch through the adapter at call time (not a bound reference) so a
    // test can stub an individual method after construction.
    getFirstAsync: <T>(source: string, ...params: SqlValue[]) =>
      adapter.getFirstAsync<T>(source, ...params),
    getAllAsync: <T>(source: string, ...params: SqlValue[]) =>
      adapter.getAllAsync<T>(source, ...params),
    runAsync: (source: string, ...params: SqlValue[]) => adapter.runAsync(source, ...params),
  };
}
