import type { DatabaseAdapter, RunResult, SqlValue } from '@/db/repositories/database';

/**
 * Scripted `DatabaseAdapter` fake for unit-testing repositories without a
 * native SQLite engine (expo-sqlite is mocked in jest; see AGENTS §9.4).
 *
 * Usage:
 *   const adapter = new RecordingAdapter();
 *   adapter.queueFirst('SELECT id FROM business', { id: 'b1' });
 *   adapter.queueAll('SELECT id FROM product', [{ id: 'p1' }, { id: 'p2' }]);
 *   // …drive a repository, then assert on adapter.calls.
 *
 * Queue entries are matched by SQL fragment (substring, case-insensitive) and
 * consumed FIFO. A call with no matching queued expectation throws a
 * descriptive error so a missing mock fails the test loudly instead of
 * returning a silent empty result.
 */

interface RecordedCall {
  sql: string;
  params: SqlValue[];
}

interface QueuedFirst {
  fragment: string;
  result: unknown;
}

interface QueuedAll {
  fragment: string;
  rows: unknown[];
}

/** Case-insensitive substring match used to route a call to its expectation. */
function matchesFragment(sql: string, fragment: string): boolean {
  return sql.toLowerCase().includes(fragment.toLowerCase());
}

export class RecordingAdapter implements DatabaseAdapter {
  /** Every query/write issued against this adapter, in order. */
  calls: RecordedCall[] = [];

  private firstQueue: QueuedFirst[] = [];
  private allQueue: QueuedAll[] = [];

  /** Clear all recorded calls and queued expectations. */
  reset(): void {
    this.calls = [];
    this.firstQueue = [];
    this.allQueue = [];
  }

  /** Queue a single-row result for the next `getFirstAsync` matching `fragment`. */
  queueFirst(fragment: string, result: unknown): void {
    this.firstQueue.push({ fragment, result });
  }

  /** Queue a multi-row result for the next `getAllAsync` matching `fragment`. */
  queueAll(fragment: string, rows: unknown[]): void {
    this.allQueue.push({ fragment, rows });
  }

  async getFirstAsync<T>(source: string, ...params: SqlValue[]): Promise<T | null> {
    this.calls.push({ sql: source, params });

    const index = this.firstQueue.findIndex((entry) => matchesFragment(source, entry.fragment));
    if (index === -1) {
      throw new Error(`RecordingAdapter: no queued 'first' expectation for SQL: ${source}`);
    }
    const [entry] = this.firstQueue.splice(index, 1);
    return entry.result as T | null;
  }

  async getAllAsync<T>(source: string, ...params: SqlValue[]): Promise<T[]> {
    this.calls.push({ sql: source, params });

    const index = this.allQueue.findIndex((entry) => matchesFragment(source, entry.fragment));
    if (index === -1) {
      throw new Error(`RecordingAdapter: no queued 'all' expectation for SQL: ${source}`);
    }
    const [entry] = this.allQueue.splice(index, 1);
    return entry.rows as T[];
  }

  async runAsync(source: string, ...params: SqlValue[]): Promise<RunResult> {
    this.calls.push({ sql: source, params });
    return { changes: 1, lastInsertRowId: 1 };
  }
}
