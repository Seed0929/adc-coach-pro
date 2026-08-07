// ---------------------------------------------------------------------------
// Coaching Validation V1 — namespaced facade (Sprint 5.2).
// ---------------------------------------------------------------------------
import { auditSet, validateChain, validateCounterfactual, validateSet } from "./engine";

export const CoachingValidationV1 = {
  chain: validateChain,
  set: validateSet,
  counterfactual: validateCounterfactual,
  audit: auditSet,
} as const;

export type CoachingValidationV1Facade = typeof CoachingValidationV1;
