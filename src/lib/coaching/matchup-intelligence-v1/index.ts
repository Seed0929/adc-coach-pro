// ---------------------------------------------------------------------------
// Matchup Intelligence V1 — public module (Sprint 4.8).
//
// A permanent relational knowledge layer describing how two champions interact.
// Entirely additive and OPTIONAL: with the registry empty every consumer
// receives the canonical placeholder profile and behaves exactly as before.
// ---------------------------------------------------------------------------
export * from "./types";
export * from "./registry";
export * from "./engine";
export { MatchupIntelligenceV1, type MatchupIntelligenceV1Facade } from "./facade";