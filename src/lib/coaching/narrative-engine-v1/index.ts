// ---------------------------------------------------------------------------
// Coaching Narrative Engine V1 — public facade (Sprint 4.1).
//
// The permanent explanation layer. Every future coaching surface — including
// the AI Coach — reads coaching explanations through `NarrativeEngine`, so the
// player always hears the same story from the same deterministic data.
// ---------------------------------------------------------------------------
export * from "./types";
export {
  NarrativeEngine,
  create,
  matchReport,
  practicePlan,
  replaySummary,
  decisionExplanation,
  strengthExplanation,
  weaknessExplanation,
  improvementSummary,
  safeFallback,
  type NarrativeEngineFacade,
} from "./engine";