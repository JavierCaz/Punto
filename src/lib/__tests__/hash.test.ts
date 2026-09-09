/**
 * @jest-environment node
 *
 * Hash module tests: PBKDF2 round-trips, tamper detection, malformed stored
 * strings, and the needsRehash / constant-time paths. Runs with expo-crypto
 * mocked to a deterministic CSPRNG and low iteration counts for speed.
 */

import * as Crypto from 'expo-crypto';

import {
  PBKDF2_ITERATIONS,
  deriveKey,
  generateSalt,
  hashSecret,
  needsRehash,
  verifySecret,
} from '@/lib/hash';

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(async (byteCount: number) => {
    // Deterministic pseudo-random bytes: 0x01..byteCount.
    return Uint8Array.from({ length: byteCount }, (_, i) => i + 1);
  }),
}));

// Low iteration count keeps the suite fast; the format is what matters here.
const TEST_ITERATIONS = 1000;

describe('hashSecret / verifySecret', () => {
  it('verifies a correct secret', async () => {
    const stored = await hashSecret('s3cret-password', { iterations: TEST_ITERATIONS });
    await expect(verifySecret('s3cret-password', stored)).resolves.toBe(true);
  });

  it('rejects a wrong secret', async () => {
    const stored = await hashSecret('s3cret-password', { iterations: TEST_ITERATIONS });
    await expect(verifySecret('wrong-password', stored)).resolves.toBe(false);
  });

  it('rejects an empty secret against a non-empty hash', async () => {
    const stored = await hashSecret('s3cret-password', { iterations: TEST_ITERATIONS });
    await expect(verifySecret('', stored)).resolves.toBe(false);
  });

  it('produces a 4-part pbkdf2-sha256 encoded string', async () => {
    const stored = await hashSecret('s3cret-password', { iterations: TEST_ITERATIONS });
    const parts = stored.split('$');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('pbkdf2-sha256');
    expect(parts[1]).toBe(String(TEST_ITERATIONS));
    // 16-byte salt -> 32 hex chars; 32-byte dk -> 64 hex chars.
    expect(parts[2]).toHaveLength(32);
    expect(parts[3]).toHaveLength(64);
  });

  it('uses a fresh random salt on every hash (no fixed salt reuse)', async () => {
    const first = await hashSecret('pw', { iterations: TEST_ITERATIONS });
    (Crypto.getRandomBytesAsync as jest.Mock).mockResolvedValueOnce(
      Uint8Array.from({ length: 16 }, (_, i) => 200 + i),
    );
    const second = await hashSecret('pw', { iterations: TEST_ITERATIONS });
    expect(first).not.toBe(second);
  });
});

describe('verifySecret malformed input', () => {
  it('returns false (never throws) for garbage', async () => {
    for (const bad of ['', 'not-a-hash', 'pbkdf2-sha256$abc', 'a$b$c$d$e']) {
      await expect(verifySecret('pw', bad)).resolves.toBe(false);
    }
  });

  it('returns false for an unknown algorithm tag', async () => {
    const stored = await hashSecret('pw', { iterations: TEST_ITERATIONS });
    const tampered = stored.replace('pbkdf2-sha256', 'scrypt');
    await expect(verifySecret('pw', tampered)).resolves.toBe(false);
  });

  it('returns false when the salt or key is not valid hex', async () => {
    const stored = await hashSecret('pw', { iterations: TEST_ITERATIONS });
    const [, iters] = stored.split('$');
    await expect(verifySecret('pw', `pbkdf2-sha256$${iters}$zzz$dk`)).resolves.toBe(false);
    await expect(verifySecret('pw', `pbkdf2-sha256$${iters}$${'ab'.repeat(16)}$zzz`)).resolves.toBe(
      false,
    );
  });

  it('returns false for non-positive or non-integer iterations', async () => {
    await expect(verifySecret('pw', `pbkdf2-sha256$0$${'ab'.repeat(16)}$${'ab'.repeat(32)}`)).resolves.toBe(false);
    await expect(verifySecret('pw', `pbkdf2-sha256$abc$${'ab'.repeat(16)}$${'ab'.repeat(32)}`)).resolves.toBe(false);
  });
});

describe('deriveKey / generateSalt', () => {
  it('is deterministic for identical inputs', async () => {
    const salt = await generateSalt();
    const a = await deriveKey('secret', salt, TEST_ITERATIONS);
    const b = await deriveKey('secret', salt, TEST_ITERATIONS);
    expect(a).toBe(b);
  });

  it('differs across salts', async () => {
    const a = await deriveKey('secret', 'aa'.repeat(16), TEST_ITERATIONS);
    const b = await deriveKey('secret', 'bb'.repeat(16), TEST_ITERATIONS);
    expect(a).not.toBe(b);
  });
});

describe('needsRehash', () => {
  it('flags hashes below the current default iteration count', async () => {
    const old = await hashSecret('pw', { iterations: 100 });
    expect(needsRehash(old)).toBe(true);
  });

  it('accepts hashes at or above the default', async () => {
    const current = await hashSecret('pw', { iterations: PBKDF2_ITERATIONS });
    expect(needsRehash(current)).toBe(false);
  });

  it('flags anything it cannot parse', () => {
    expect(needsRehash('garbage')).toBe(true);
  });
});
