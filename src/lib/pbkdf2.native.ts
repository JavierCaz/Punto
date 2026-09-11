import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { pbkdf2 } from 'react-native-quick-crypto';

/**
 * PBKDF2-HMAC-SHA256 — native implementation (iOS/Android).
 *
 * Runs in native OpenSSL via `react-native-quick-crypto` (Nitro/JSI) instead of
 * the Hermes interpreter, turning the ~minutes-long pure-JS derivation into tens
 * of milliseconds. Byte-compatible with `pbkdf2.ts`: same inputs and
 * `dkLen = PBKDF2_DK_BYTES` yield the same hex key, so stored hashes keep
 * verifying and no re-hash is forced.
 */

/** Derived-key length in bytes (32 -> 256-bit). Must match every implementation. */
export const PBKDF2_DK_BYTES = 32;

/** Derive a lowercase-hex PBKDF2-HMAC-SHA256 key using native OpenSSL. */
export function pbkdf2Hex(
  secret: string,
  saltHex: string,
  iterations: number,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    pbkdf2(secret, hexToBytes(saltHex), iterations, PBKDF2_DK_BYTES, 'sha256', (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      if (!derivedKey) {
        reject(new Error('PBKDF2 produced an empty derived key'));
        return;
      }
      resolve(bytesToHex(new Uint8Array(derivedKey)));
    });
  });
}
