import * as Crypto from 'expo-crypto';
import { bytesToHex } from '@noble/hashes/utils.js';

import { pbkdf2Hex } from '@/lib/pbkdf2';

/**
 * Password/PIN hashing — salted PBKDF2-HMAC-SHA256.
 *
 * Choice rationale (see AGENTS.md §9.1 and the auth research notes):
 * - `expo-crypto` provides the CSPRNG salt but NO key-derivation function, so
 *   the KDF is delegated to `@/lib/pbkdf2`: native OpenSSL on device
 *   (react-native-quick-crypto), WebCrypto on web, and `@noble/hashes` as the
 *   pure-JS fallback + Jest reference.
 * - One scheme for both admin passwords and employee PINs. The PIN's real
 *   protection on a shared offline POS is app-level attempt lockout + OS disk
 *   encryption; hashing keeps the DB/JSON export free of recoverable
 *   plaintext and defends against casual DB reads.
 *
 * Persisted format (single TEXT column):
 *   `pbkdf2-sha256$<iterations>$<saltHex>$<dkHex>`
 *
 * The iteration count is stored in-band so it can be raised later without
 * breaking existing rows (verify then rehash). Iterations are intentionally
 * configurable for tests — 150k is the production default. With the native KDF
 * this stays well under a second on device.
 */

export const PBKDF2_ITERATIONS = 150_000;

const ALGORITHM = 'pbkdf2-sha256';
const SALT_BYTES = 16;

export type HashOptions = {
  iterations?: number;
};

/** Generate a cryptographically random 128-bit salt (hex-encoded). */
export async function generateSalt(): Promise<string> {
  const salt = await Crypto.getRandomBytesAsync(SALT_BYTES);
  return bytesToHex(salt);
}

/** Derive a hex key for the given secret + hex salt. */
export async function deriveKey(
  secret: string,
  saltHex: string,
  iterations: number,
): Promise<string> {
  return pbkdf2Hex(secret, saltHex, iterations);
}

/**
 * Hash a secret into the canonical persistable string. Salt is generated fresh
 * per call unless `options.saltHex` is provided (tests / explicit reuse).
 */
export async function hashSecret(
  secret: string,
  options: HashOptions & { saltHex?: string } = {},
): Promise<string> {
  const iterations = options.iterations ?? PBKDF2_ITERATIONS;
  const saltHex = options.saltHex ?? (await generateSalt());
  const dkHex = await deriveKey(secret, saltHex, iterations);
  return [ALGORITHM, String(iterations), saltHex, dkHex].join('$');
}

/**
 * Verify a secret against a stored hash string. Returns false for any
 * malformed/unknown stored format (never throws on bad input).
 */
export async function verifySecret(secret: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== ALGORITHM) {
    return false;
  }
  const iterations = Number(parts[1]);
  const saltHex = parts[2];
  const expectedHex = parts[3];
  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }
  if (!isHex(saltHex) || !isHex(expectedHex)) {
    return false;
  }

  const actualHex = await deriveKey(secret, saltHex, iterations);
  return constantTimeEqualHex(actualHex, expectedHex);
}

function isHex(value: string): boolean {
  return value.length > 0 && value.length % 2 === 0 && /^[0-9a-f]+$/i.test(value);
}

/** Compare two equal-length hex strings without early exit on mismatch. */
function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** True when a stored hash uses fewer iterations than the current default. */
export function needsRehash(stored: string, iterations = PBKDF2_ITERATIONS): boolean {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== ALGORITHM) {
    return true;
  }
  return Number(parts[1]) < iterations;
}
