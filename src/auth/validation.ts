import { AUTH_ROLES, type AuthRole } from '@/auth/types';

/**
 * Auth input validation — pure functions, unit-tested in the node jest env.
 *
 * Usernames are normalized to trimmed lowercase before storage/lookup so the
 * SQLite BINARY unique index on `employee.username` (migration 002) treats
 * "Ana" and "ana" as the same identity, and login is case-insensitive.
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;
export const USERNAME_PATTERN = /^[a-z0-9._-]+$/;

export const PASSWORD_MIN_LENGTH = 8;

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;
export const PIN_PATTERN = /^\d+$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export type ValidationIssue = 'empty' | 'too-short' | 'too-long' | 'invalid-chars';

export function validateUsername(raw: string): ValidationIssue | null {
  const value = normalizeUsername(raw);
  if (value.length === 0) return 'empty';
  if (value.length < USERNAME_MIN_LENGTH) return 'too-short';
  if (value.length > USERNAME_MAX_LENGTH) return 'too-long';
  if (!USERNAME_PATTERN.test(value)) return 'invalid-chars';
  return null;
}

export function validatePassword(raw: string): ValidationIssue | null {
  if (raw.length === 0) return 'empty';
  if (raw.length < PASSWORD_MIN_LENGTH) return 'too-short';
  return null;
}

export function validatePin(raw: string): ValidationIssue | null {
  if (raw.length === 0) return 'empty';
  if (!PIN_PATTERN.test(raw)) return 'invalid-chars';
  if (raw.length < PIN_MIN_LENGTH) return 'too-short';
  if (raw.length > PIN_MAX_LENGTH) return 'too-long';
  return null;
}

export function isAuthRole(value: unknown): value is AuthRole {
  return typeof value === 'string' && (AUTH_ROLES as readonly string[]).includes(value);
}
