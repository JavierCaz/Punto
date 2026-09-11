/**
 * Current wall-clock time as an ISO-8601 UTC string.
 *
 * This is the single source of "now" for all repository writes so timestamps
 * stay consistent (ISO-8601 UTC `TEXT`, sortable lexicographically — AGENTS §6)
 * and so tests can pin time by mocking this module if required.
 */
export const nowIso = (): string => new Date().toISOString();
