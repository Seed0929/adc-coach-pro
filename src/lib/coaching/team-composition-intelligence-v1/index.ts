// ---------------------------------------------------------------------------
// Team Composition Intelligence V1 — public module (Sprint 4.9).
//
// A permanent relational knowledge layer describing how the champions on both
// teams interact as a composition. Entirely additive and OPTIONAL: with the
// registry empty every consumer receives the canonical placeholder profile and
// behaves exactly as before.
// ---------------------------------------------------------------------------
export * from "./types";
export * from "./registry";
export * from "./engine";
export {
  TeamCompositionIntelligenceV1,
  type TeamCompositionIntelligenceV1Facade,
} from "./facade";
