/** Minimal surface needed to issue a rollback — satisfied by the real database. */
type Executor = {
  execAsync(source: string): Promise<void>;
};

/** Roll back, ignoring failures (e.g. SQLite already auto-rolled back). */
export async function rollbackQuietly(db: Executor): Promise<void> {
  try {
    await db.execAsync('ROLLBACK');
  } catch {
    // No active transaction to roll back — the original error is what matters.
  }
}
