// ---------------------------------------------------------------------------
// Replay Intelligence Engine V1 — public facade (Sprint 4.3).
//
// The permanent timeline explanation layer. Every future coaching surface —
// Replay Coach, Decision Timeline, and the AI Coach — reads the story of a
// game through `ReplayEngine`, so the player always hears the same timeline
// from the same deterministic data.
// ---------------------------------------------------------------------------
export * from "./types";
export {
  ReplayEngine,
  buildTimeline,
  getCriticalMoments,
  getTurningPoints,
  getPositiveMoments,
  getRecoveryMoments,
  getPracticeMoments,
  getDecisionTimeline,
  getMoment,
  safeFallback,
  type ReplayEngineFacade,
} from "./engine";
