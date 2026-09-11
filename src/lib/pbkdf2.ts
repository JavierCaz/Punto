import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

/**
 * PBKDF2-HMAC-SHA256 — pure-JS reference implementation.
 *
 * This is the base implementation Metro falls back to on platforms without a
 * more specific `pbkdf2.<platform>.ts`, and the one Jest resolves in unit tests
 * (see the `moduleNameMapper` entry in jest.config.js). It is also the byte
 * oracle the native/web implementations must agree with: identical
 * `(secret, salt, iterations, dkLen=32)` must produce an identical hex key.
 *
 * On device this path is slow (Hermes has no JIT); `pbkdf2.native.ts` swaps in
 * the native OpenSSL KDF. Do not weaken the parameters to compensate.
 */

/** Derived-key length in bytes (32 -> 256-bit). Must match every implementation. */
export const PBKDF2_DK_BYTES = 32;

/** Derive a lowercase-hex PBKDF2-HMAC-SHA256 key. */
export async function pbkdf2Hex(
  secret: string,
  saltHex: string,
  iterations: number,
): Promise<string> {
  const derivedKey = await pbkdf2Async(sha256, secret, hexToBytes(saltHex), {
    c: iterations,
    dkLen: PBKDF2_DK_BYTES,
  });
  return bytesToHex(derivedKey);
}
