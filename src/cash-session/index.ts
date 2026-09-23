/**
 * Cash session barrel — public surface for apertura/cierre de caja.
 *
 * Screens consume active-session state through `useCashSessionStore` (a UI
 * cache of `getActiveSession()`, not persisted — SQLite `cash_session.status` is
 * the source of truth). Repository functions drive the open/close/history flow.
 */

export {
  closeSession,
  getActiveSession,
  getSessionById,
  getSessionSummary,
  hasAnySession,
  listSessions,
  openSession,
} from '@/cash-session/cash-session-repository';
export {
  CASH_SESSION_ERROR,
  CASH_SESSION_STATUSES,
  isCashSessionStatus,
} from '@/cash-session/cash-session-types';
export type {
  CashSession,
  CashSessionStatus,
  CloseSessionInput,
  OpenSessionInput,
  SessionSummary,
} from '@/cash-session/cash-session-types';
