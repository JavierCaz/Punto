import * as Crypto from 'expo-crypto';

/**
 * Generate a new random primary key (UUIDv4) for a domain row.
 *
 * Centralized so every repository creates ids the same way (cryptographically
 * random, RFC 4122) and so the source can be swapped for test determinism in
 * one place if ever needed.
 */
export const newId = (): string => Crypto.randomUUID();
