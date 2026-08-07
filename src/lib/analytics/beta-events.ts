// ---------------------------------------------------------------------------
// Sprint 5.4 — Private-beta journey event contract.
//
// A typed, stable, deliberately SMALL vocabulary. We record only whether the
// beta journey worked — never who the player is, what they typed, or any Riot
// identifier. Event names are frozen: renaming one breaks historical reads.
//
// Analytics is observation only. Nothing in the coaching pipeline may import
// this module for behaviour, and nothing may branch on a recorded event.
// ---------------------------------------------------------------------------

/** Stable event names. Never rename — only add. */
export const BETA_EVENTS = {
  loginJourneyReached: "login_journey_reached",
  riotConnectionStarted: "riot_connection_started",
  riotConnectionCompleted: "riot_connection_completed",
  firstSyncStarted: "first_match_sync_started",
  firstSyncCompleted: "first_match_sync_completed",
  matchAnalysisOpened: "match_analysis_opened",
  matchReportViewed: "match_report_viewed",
  whyThisCoachingViewed: "why_this_coaching_viewed",
  practicePlanViewed: "practice_plan_viewed",
  coachingJourneyCompleted: "coaching_journey_completed",
  recoverableError: "recoverable_error",
  noMatchState: "no_match_state",
  degradedDataState: "degraded_data_state",
} as const;

export type BetaEventName = (typeof BETA_EVENTS)[keyof typeof BETA_EVENTS];

/** Coarse journey stage — used to read funnels without joining event names. */
export type BetaJourneyStage =
  | "account"
  | "connection"
  | "sync"
  | "analysis"
  | "coaching"
  | "health";

export const STAGE_BY_EVENT: Record<BetaEventName, BetaJourneyStage> = {
  login_journey_reached: "account",
  riot_connection_started: "connection",
  riot_connection_completed: "connection",
  first_match_sync_started: "sync",
  first_match_sync_completed: "sync",
  match_analysis_opened: "analysis",
  match_report_viewed: "analysis",
  why_this_coaching_viewed: "coaching",
  practice_plan_viewed: "coaching",
  coaching_journey_completed: "coaching",
  recoverable_error: "health",
  no_match_state: "health",
  degraded_data_state: "health",
};

/**
 * The ONLY detail keys we ever persist. Anything else is dropped by the
 * tracker, so a careless call site cannot leak user data.
 *
 * - `surface`  which screen/state the event came from (e.g. "match-report")
 * - `reason`   a short non-identifying enum-like code (e.g. "sync_failed")
 * - `count`    a bounded integer (e.g. matches imported)
 * - `demo`     whether the surface was showing demo data
 * - `degraded` whether optional enrichment was missing
 */
export interface BetaEventDetail {
  surface?: string;
  reason?: string;
  count?: number;
  demo?: boolean;
  degraded?: boolean;
}

export const ALLOWED_DETAIL_KEYS: readonly (keyof BetaEventDetail)[] = [
  "surface",
  "reason",
  "count",
  "demo",
  "degraded",
];

export interface BetaEventRecord {
  name: BetaEventName;
  stage: BetaJourneyStage;
  sessionId: string;
  detail: BetaEventDetail;
  at: string;
}

/** Where records go. Any transport may fail; the tracker swallows failures. */
export type BetaEventTransport = (record: BetaEventRecord) => void | Promise<void>;