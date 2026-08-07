// ---------------------------------------------------------------------------
// Decision Chain V1 — public module (Sprint 5.1).
//
// The integration layer that connects the existing intelligence layers into
// one traceable chain: context → available decisions → prioritized decision →
// habit → fundamental → explanation → counterfactual → practice goal.
// Every source is OPTIONAL and the chain degrades gracefully.
// ---------------------------------------------------------------------------
export * from "./types";
export * from "./engine";
export { DecisionChainV1, type DecisionChainV1Facade } from "./facade";
