// ---------------------------------------------------------------------------
// Rune Intelligence V1 — public module (Sprint 4.7).
//
// A permanent reusable knowledge layer between Data Dragon and coaching.
// Entirely additive and optional: with the registry empty, every consumer
// receives the canonical placeholder profile and behaves exactly as before.
// ---------------------------------------------------------------------------
export * from "./types";
export * from "./registry";
export * from "./engine";
export { RuneIntelligenceV1, type RuneIntelligenceV1Facade } from "./facade";
