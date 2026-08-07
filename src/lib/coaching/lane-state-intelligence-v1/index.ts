// ---------------------------------------------------------------------------
// Lane State Intelligence V1 — public module (Sprint 5.0).
//
// A permanent, reusable CONTEXT layer answering "what is happening in this
// lane right now?". Entirely additive and OPTIONAL: with no state input every
// consumer receives the canonical UNKNOWN profile and behaves exactly as
// before. No registry: lane state is dynamic, not authored knowledge.
// ---------------------------------------------------------------------------
export * from "./types";
export * from "./engine";
export { LaneStateIntelligenceV1, type LaneStateIntelligenceV1Facade } from "./facade";