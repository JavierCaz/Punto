/**
 * @jest-environment node
 *
 * Unit tests for the write-transaction seam: BEGIN IMMEDIATE / COMMIT on the
 * main connection, rollback + rethrow on failure, and strict serialization of
 * concurrent transactions via the module-level queue.
 */

import { getDb } from '@/db/client';
import { withTransaction } from '@/db/repositories/transaction';

jest.mock('@/db/client', () => ({ getDb: jest.fn() }));

type FakeDb = {
  execAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
  runAsync: jest.Mock;
};

function makeDb(): FakeDb {
  return {
    execAsync: jest.fn(async () => undefined),
    getFirstAsync: jest.fn(async () => null),
    getAllAsync: jest.fn(async () => []),
    runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 1 })),
  };
}

function controlStatements(db: FakeDb): string[] {
  return db.execAsync.mock.calls.map((call) => call[0] as string);
}

describe('withTransaction', () => {
  it('runs the task between BEGIN IMMEDIATE and COMMIT, returning its result', async () => {
    const db = makeDb();
    (getDb as jest.Mock).mockResolvedValue(db);

    const result = await withTransaction(async (txn) => {
      await txn.runAsync('UPDATE business SET name = ?', 'x');
      return 42;
    });

    expect(result).toBe(42);
    expect(controlStatements(db)).toEqual(['BEGIN IMMEDIATE', 'COMMIT']);
    expect(db.runAsync).toHaveBeenCalledWith('UPDATE business SET name = ?', 'x');
  });

  it('rolls back and rethrows when the task throws', async () => {
    const db = makeDb();
    (getDb as jest.Mock).mockResolvedValue(db);

    await expect(
      withTransaction(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(controlStatements(db)).toEqual(['BEGIN IMMEDIATE', 'ROLLBACK']);
  });

  it('serializes concurrent transactions so statements never interleave', async () => {
    const db = makeDb();
    (getDb as jest.Mock).mockResolvedValue(db);

    const events: string[] = [];
    let active = 0;
    let maxActive = 0;

    const task = (id: number) =>
      withTransaction(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        events.push(`start-${id}`);
        await new Promise((resolve) => setTimeout(resolve, 5));
        events.push(`end-${id}`);
        active -= 1;
      });

    await Promise.all([task(1), task(2), task(3)]);

    expect(maxActive).toBe(1);
    expect(events).toEqual(['start-1', 'end-1', 'start-2', 'end-2', 'start-3', 'end-3']);
  });
});
