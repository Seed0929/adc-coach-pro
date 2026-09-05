// ---------------------------------------------------------------------------
// BotDiff — Personalized Coaching Intelligence Foundation (public module).
//
//   Riot-derived matches (evidence)
//        │
//        ▼
//   evaluateAll()          → scoped Player Performance Model
//        ▼
//   reconcileTargets()     → BotDiff-derived personalized CoachingTargets
//        ▼
//   buildCoachingContext() → grounded context for the AI Coach
//        ▼
//   withCoachTarget()      → optional target line for existing graphs
//
// Everything is pure and deterministic. Persistence is a plain JSON snapshot
// (`CoachingIntelligenceSnapshot`), so it can be stored later without changing
// this layer.
// ---------------------------------------------------------------------------
export * from "./types";
export * from "./metrics";
export * from "./evaluation";
export * from "./targets";
export * from "./context";
export * from "./graph";
export * from "./issues";
export * from "./consistency";
export * from "./evidence";
export * from "./item-policy";
export * from "./plan";
export * from "./from-analysis";

import type { ProfileMatch } from "@/lib/profile-engine";
import { evaluateAll } from "./evaluation";
import { rankPriorities, reconcileTargets, emptySnapshot } from "./targets";
import { buildCoachingContext } from "./context";
import { buildCoachingPlan, type CoachingPlan } from "./plan";
import { buildConsistencyPanel, type PerformanceConsistency } from "./consistency";
import { sufficiencyFor } from "./evaluation";
import type {
  CoachingIntelligenceContext,
  CoachingIntelligenceSnapshot,
  CoachingPriority,
  MetricEvaluation,
  TargetTransition,
} from "./types";

export interface CoachingIntelligence {
  evaluations: MetricEvaluation[];
  priorities: CoachingPriority[];
  snapshot: CoachingIntelligenceSnapshot;
  transitions: TargetTransition[];
  refusals: { metric: string; scopeId: string; reason: string }[];
  context: CoachingIntelligenceContext;
  /** The single authoritative coaching queue shown to the player. */
  plan: CoachingPlan;
  /** Performance Consistency for every player-scope metric. */
  consistency: PerformanceConsistency[];
}

/**
 * One call that turns imported matches (newest-first) plus the player's stored
 * coaching snapshot into the full intelligence picture. Pass `previous` to
 * preserve target history between runs.
 */
export function buildCoachingIntelligence(
  matches: ProfileMatch[],
  previous?: CoachingIntelligenceSnapshot,
  options: { now?: string; maxActive?: number } = {},
): CoachingIntelligence {
  const now = options.now ?? new Date().toISOString();
  const evaluations = evaluateAll(matches);
  const priorities = rankPriorities(evaluations);
  const { snapshot, transitions, refusals } = reconcileTargets(
    previous ?? emptySnapshot(now),
    evaluations,
    { now, maxActive: options.maxActive },
  );
  const sufficiency = sufficiencyFor(matches.length);
  return {
    evaluations,
    priorities,
    snapshot,
    transitions,
    refusals,
    context: buildCoachingContext(evaluations, snapshot, {
      totalGames: matches.length,
      now,
      priorities,
    }),
    plan: buildCoachingPlan(evaluations, snapshot, priorities, {
      now,
      totalGames: matches.length,
      sufficiency,
    }),
    consistency: buildConsistencyPanel(evaluations),
  };
}
