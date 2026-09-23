import { create } from 'zustand';

import {
  getActiveSession,
  hasAnySession,
  } from '@/cash-session/cash-session-repository';
import type { CashSession } from '@/cash-session/cash-session-types';

/**
 * Cash-session UI cache.
 *
 * A lightweight read-through cache of `getActiveSession()` (the single OPEN
 * session) plus a "has this business ever used sessions" flag. It is refreshed
 * on POS focus and after open/close so the POS banner stays correct without
 * being the source of truth.
 *
 * Deliberately NOT persisted to kv-store: the source of truth is SQLite
 * (`cash_session.status`). Unlike theme/language, a cash session must survive a
 * restart by re-reading the DB, never by trusting a cached id (an app kill must
 * resume the open session — feature plan Phase F).
 */

/** Hours after which an open session is considered "forgotten" (gentle nudge). */
export const STALE_SESSION_HOURS = 18;

interface CashSessionStoreState {
  /** The OPEN session, or null when none is open. */
  activeSession: CashSession | null;
  /** True once the business has ever opened a session (drives the POS banner). */
  hasHistory: boolean;
  /** True once the first refresh has completed. */
  hydrated: boolean;
  /** Re-read the active session + history flag from SQLite. */
  refresh: () => Promise<void>;
  /** Reset to the empty state (tests). */
  clear: () => void;
}

export const useCashSessionStore = create<CashSessionStoreState>()((set) => ({
  activeSession: null,
  hasHistory: false,
  hydrated: false,

  refresh: async () => {
    try {
      const [activeSession, hasHistory] = await Promise.all([
        getActiveSession(),
        hasAnySession(),
      ]);
      set({ activeSession, hasHistory, hydrated: true });
    } catch {
      // Best-effort UI cache: a failed refresh keeps the previous state.
      // SQLite is the source of truth; the banner simply won't update this pass.
    }
  },

  clear: () => {
    set({ activeSession: null, hasHistory: false, hydrated: false });
  },
}));
