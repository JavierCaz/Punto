import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

/**
 * PBKDF2-HMAC-SHA256 — web implementation.
 *
 * Uses the browser's native WebCrypto PBKDF2 (`crypto.subtle.deriveBits`), which
 * is fast and byte-identical to the other implementations. Falls back to the
 * pure-JS reference when `crypto.subtle` is unavailable (e.g. an insecure
 * context, where WebCrypto is disabled).
 */

/** Derived-key length in bytes (32 -> 256-bit). Must match every implementation. */
export const PBKDF2_DK_BYTES = 32;

async function noblePbkdf2Hex(
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

/** Derive a lowercase-hex PBKDF2-HMAC-SHA256 key using WebCrypto. */
export async function pbkdf2Hex(
  secret: string,
  saltHex: string,
  iterations: number,
): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return noblePbkdf2Hex(secret, saltHex, iterations);
  }

  try {
    const keyMaterial = await subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await subtle.deriveBits(
      { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations, hash: 'SHA-256' },
      keyMaterial,
      PBKDF2_DK_BYTES * 8,
    );
    return bytesToHex(new Uint8Array(bits));
  } catch {
    // WebCrypto needs a secure context; degrade to pure JS rather than fail auth.
    return noblePbkdf2Hex(secret, saltHex, iterations);
  }
}
