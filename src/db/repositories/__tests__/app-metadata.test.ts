/**
 * @jest-environment node
 *
 * `app_metadata` counter tests — the sequence read/upsert is driven directly
 * against the scripted `RecordingAdapter` (the functions take an explicit txn,
 * so no `getDb()` mock is needed).
 */

import {
  getMetadata,
  getSetupCompleted,
  nextPurchaseNumber,
  nextSaleNumber,
  setMetadata,
  setSetupCompleted,
} from '@/db/repositories/app-metadata';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

const mockDb = { getFirstAsync: jest.fn() };
jest.mock('@/db/client', () => ({ getDb: jest.fn(async () => mockDb) }));

const mockWithTransaction = jest.fn();
jest.mock('@/db/repositories/transaction', () => ({
  withTransaction: (...args: unknown[]) => mockWithTransaction(...args),
}));


describe('app-metadata', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
  });

  it('starts sale numbers at S-000001 when the key is absent', async () => {
    adapter.queueFirst('FROM app_metadata', null);

    const number = await nextSaleNumber(adapter);

    expect(number).toBe('S-000001');
    const upsert = adapter.calls.find((c) => c.sql.includes('INSERT INTO app_metadata'));
    expect(upsert).toBeDefined();
    expect(upsert!.params).toEqual(['sale_number_seq', '1']);
  });

  it('increments the existing sequence and zero-pads to six digits', async () => {
    adapter.queueFirst('FROM app_metadata', { value: '41' });

    const number = await nextSaleNumber(adapter);

    expect(number).toBe('S-000042');
  });

  it('uses the P prefix for purchases', async () => {
    adapter.queueFirst('FROM app_metadata', { value: '7' });

    const number = await nextPurchaseNumber(adapter);

    expect(number).toBe('P-000008');
  });

  it('reads and upserts raw metadata values', async () => {
    adapter.queueFirst('FROM app_metadata', { value: 'hello' });
    expect(await getMetadata(adapter, 'k')).toBe('hello');

    await setMetadata(adapter, 'k', 'world');
    const upsert = adapter.calls.find((c) => c.sql.includes('INSERT INTO app_metadata'));
    expect(upsert!.params).toEqual(['k', 'world']);
  });

  it('falls back to 1 when the stored value is not a number', async () => {
    adapter.queueFirst('FROM app_metadata', { value: 'not-a-number' });

    expect(await nextSaleNumber(adapter)).toBe('S-000001');
  });
});

describe('setup completion flag', () => {
  beforeEach(() => {
    mockDb.getFirstAsync.mockReset();
    mockWithTransaction.mockReset();
  });

  it('reports completed only for the stored "1" value', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ value: '1' });
    expect(await getSetupCompleted()).toBe(true);

    mockDb.getFirstAsync.mockResolvedValue(null);
    expect(await getSetupCompleted()).toBe(false);

    mockDb.getFirstAsync.mockResolvedValue({ value: '0' });
    expect(await getSetupCompleted()).toBe(false);
  });

  it('writes the flag through a transaction', async () => {
    const adapter = new RecordingAdapter();
    mockWithTransaction.mockImplementation(async (fn: (txn: RecordingAdapter) => Promise<void>) =>
      fn(adapter),
    );

    await setSetupCompleted(true);

    const upsert = adapter.calls.find((call) => call.sql.includes('INSERT INTO app_metadata'));
    expect(upsert!.params).toEqual(['setup_completed', '1']);
  });
});
