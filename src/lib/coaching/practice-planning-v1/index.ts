// ---------------------------------------------------------------------------
// Practice Planning Engine V1 — public facade (Sprint 4.2).
//
// The permanent coaching ACTION layer. Every future surface that assigns
// practice reads it through `PracticePlanner`, so the player always gets one
// primary improvement, one supporting concept, one measurable challenge and
// one success condition — all traceable to deterministic coaching data.
// ---------------------------------------------------------------------------
export * from "./types";
export {
  PracticePlanner,
  createPracticePlanner,
  create,
  nextFocus,
  practiceChecklist,
  successCriteria,
  safeFallback,
  type PracticePlannerFacade,
  type PracticePlannerInstance,
} from "./engine";