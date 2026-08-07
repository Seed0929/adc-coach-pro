// ---------------------------------------------------------------------------
// Decision Chain V1 — namespaced facade (Sprint 5.1).
//
// The single entry point Match Reports, Replay Coach, the Practice Planner and
// the future AI Coach depend on.
// ---------------------------------------------------------------------------
import {
  assessConfidence,
  build,
  buildAvailableDecisions,
  buildCounterfactual,
  buildDecisionChain,
  buildPracticeReference,
  forMatchReport,
  habitContextFor,
  memoryContextFor,
  phaseFromSeconds,
  safeFallback,
  toAIPayload,
  toPracticePlanInput,
  toReplayInput,
} from "./engine";

export const DecisionChainV1 = {
  build,
  buildOne: buildDecisionChain,
  availableDecisions: buildAvailableDecisions,
  counterfactual: buildCounterfactual,
  practiceReference: buildPracticeReference,
  habitContext: habitContextFor,
  memoryContext: memoryContextFor,
  confidence: assessConfidence,
  phaseFromSeconds,
  forMatchReport,
  forReplayCoach: toReplayInput,
  forPracticePlanner: toPracticePlanInput,
  forAICoach: toAIPayload,
  safeFallback,
} as const;

export type DecisionChainV1Facade = typeof DecisionChainV1;
