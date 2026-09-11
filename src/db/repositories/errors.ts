/**
 * Repository error vocabulary.
 *
 * Repositories signal domain failures with string-coded `Error`s (message ===
 * code, optional `.detail`), mirroring the string-coded convention already used
 * by `src/auth/auth-repository.ts` (`AUTH_...`). Callers switch on the code
 * without importing a class hierarchy, and tests assert codes directly.
 *
 * Codes are deliberately grouped under a `REPO_` prefix (plus the one existing
 * `INVENTORY_` code) so they are greppable and unambiguous at the UI boundary.
 */
export const REPO_ERROR = {
  NOT_FOUND: 'REPO_NOT_FOUND',
  DUPLICATE: 'REPO_DUPLICATE',
  INSUFFICIENT_STOCK: 'INVENTORY_INSUFFICIENT_STOCK',
  CONSTRAINT: 'REPO_CONSTRAINT',
  INVALID_STATE: 'REPO_INVALID_STATE',
  NO_BUSINESS: 'REPO_NO_BUSINESS',
} as const;

export type RepoErrorCode = (typeof REPO_ERROR)[keyof typeof REPO_ERROR];

/** A repository error: `message` is the code; `detail` carries optional context. */
export interface RepoError extends Error {
  readonly detail?: string;
}

/**
 * Build a repository error whose `message` is `code` (the stable, testable
 * identifier) and whose `detail` holds optional human/developer context.
 */
export function repoError(code: RepoErrorCode, detail?: string): RepoError {
  const error: RepoError = Object.assign(new Error(code), { detail });
  return error;
}

const REPO_ERROR_CODES: ReadonlySet<string> = new Set(Object.values(REPO_ERROR));

/**
 * Type guard: is `error` a repository error (optionally with a specific code)?
 * With no `code` argument it matches any repository error code.
 */
export function isRepoError(error: unknown, code?: RepoErrorCode): error is RepoError {
  if (!(error instanceof Error)) return false;
  if (code !== undefined) return error.message === code;
  return REPO_ERROR_CODES.has(error.message);
}

/**
 * Translate a raw SQLite failure into a repository error for the write path.
 *
 * Only GENUINE uniqueness failures become `REPO_DUPLICATE`: the extended
 * `SQLITE_CONSTRAINT_UNIQUE` / `SQLITE_CONSTRAINT_PRIMARYKEY` codes plus the
 * legacy `UNIQUE constraint failed` message. Every OTHER constraint violation
 * (CHECK / NOT NULL / FOREIGN KEY / generic `SQLITE_CONSTRAINT`) becomes
 * `REPO_CONSTRAINT` with the original message as `detail`, so repositories
 * never mislabel a CHECK failure as a duplicate. Anything else is rethrown
 * verbatim — non-constraint failures must not be masked.
 */
export function mapSqliteError(error: unknown): RepoError {
  const message = error instanceof Error ? error.message : String(error);
  const isUnique =
    message.includes('SQLITE_CONSTRAINT_UNIQUE') ||
    message.includes('SQLITE_CONSTRAINT_PRIMARYKEY') ||
    /UNIQUE constraint failed/i.test(message);

  if (isUnique) {
    return repoError(REPO_ERROR.DUPLICATE, message);
  }

  // expo-sqlite surfaces SQLite errors as `Error code <n>: <sqlite3_errmsg>`,
  // e.g. "Error code 19: FOREIGN KEY constraint failed". Match the canonical
  // message text as well as the extended-code strings so CHECK / NOT NULL /
  // FOREIGN KEY failures all normalize to REPO_CONSTRAINT.
  const isConstraint =
    /constraint failed/i.test(message) ||
    message.includes('SQLITE_CONSTRAINT') ||
    message.includes('constraint violation');

  if (isConstraint) {
    return repoError(REPO_ERROR.CONSTRAINT, message);
  }

  // Not a constraint violation — surface the original error unchanged.
  throw error instanceof Error ? error : new Error(message);
}
