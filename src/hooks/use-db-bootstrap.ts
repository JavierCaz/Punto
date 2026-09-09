import { useEffect, useState } from 'react';

import { getDb } from '@/db';

export type DbStatus = 'loading' | 'ready' | 'error';

/**
 * Bootstrap hook: opens the SQLite database (running pending migrations) once
 * at app startup. Screens render only after `ready` so they can rely on
 * `getDb()` resolving to a fully migrated schema.
 *
 * State updates happen inside promise callbacks (never synchronously in the
 * effect body) so the component is safe under React StrictMode / compiler.
 */
export function useDbBootstrap(): { status: DbStatus; error: unknown } {
  const [status, setStatus] = useState<DbStatus>('loading');
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    getDb()
      .then(() => {
        if (!cancelled) {
          setStatus('ready');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setStatus('error');
          setError(err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { status, error };
}
