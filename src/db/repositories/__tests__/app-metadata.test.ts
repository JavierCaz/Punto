/**
 * @jest-environment node
 *
 * `app_metadata` counter tests — the sequence read/upsert is driven directly
 * against the scripted `RecordingAdapter` (the functions take an explicit txn,
 * so no `getDb()` mock is needed).
 */

import { getMetadata, nextPurchaseNumber, nextSaleNumber, setMetadata } from '@/db/repositories/app-metadata';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

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
