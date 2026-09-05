// ---------------------------------------------------------------------------
// BotDiff — Personalized Coaching Intelligence Foundation (types)
//
// This module models BOTDIFF-DERIVED coaching intelligence. It is deliberately
// separate from Riot-derived match data: matches come in as evidence
// (`ProfileMatch`), and everything produced here — baselines, targets,
// priorities, coaching history, structured AI context — is BotDiff's own
// inference layer.
//
// Evidence-first rules encoded in these types:
//  - every claim carries a sample size and a data-sufficiency level
//  - "contextual" metrics (vision, kill participation, damage, objectives) can
//    never become coaching targets and are never called better or worse
//  - a target only exists when the player's own history justifies it; when it
//    cannot be justified the model returns an explicit insufficient-evidence
//    state instead of manufacturing one
//
// PURE + client-safe: no network, no database, no secrets.
// ---------------------------------------------------------------------------
import type { DirectionOfGood, MetricTrend } from "@/lib/metrics/metric-reading";

/** How much of the player's history a statement is based on. */
export type DataSufficiency = "none" | "low" | "moderate" | "high";

/** Evidence classes BotDiff must never blur together. */
export type ClaimKind =
  | "observed_fact"
  | "calculated_trend"
  | "supported_inference"
  | "coaching_recommendation";

export type ScopeKind =
  | "player"
  | "role"
  | "champion"
  | "champion_role"
  | "recent_comparable";

export interface MetricScope {
  kind: ScopeKind;
  /** Stable id, e.g. "player", "role:BOTTOM", "champion:Caitlyn". */
  id: string;
  /** Player-facing label, e.g. "On Caitlyn (bot lane)". */
  label: string;
  champion?: string;
  role?: string;
}

/** One value in the player's demonstrated history for a metric. */
export interface MetricSample {
  /** Chronological index inside the scope (0 = oldest). */
  sequence: number;
  matchId: string;
  value: number;
  champion: string;
  role: string;
  gameCreation: string | null;
}

/**
 * Everything BotDiff knows about one metric inside one scope. Observed facts
 * and calculated trends only — no recommendations live here.
 */
export interface MetricEvaluation {
  metric: string;
  name: string;
  unit: string;
  scope: MetricScope;
  direction: DirectionOfGood;
  /** True when a target may ever be generated for this metric. */
  coachable: boolean;
  sampleSize: number;
  /** Mean across the whole scope history. */
  longTermBaseline: number;
  /** Mean of the most recent rolling window. */
  recentBaseline: number;
  /** Mean of the window immediately before `recentBaseline`; null if absent. */
  previousBaseline: number | null;
  trend: MetricTrend;
  /** Standard deviation across the scope history. */
  variance: number;
  /** 0-100; higher means the player repeats this metric reliably. */
  consistency: number;
  /** Worst/best single games the player has actually produced. */
  demonstratedRange: { min: number; max: number };
  /** Best sustained (rolling window) value the player has actually produced. */
  bestSustained: number | null;
  sufficiency: DataSufficiency;
  samples: MetricSample[];
}

export type TargetStatus = "active" | "achieved" | "superseded" | "abandoned";

/** Why a target exists — always traceable to the player's own evidence. */
export interface TargetEvidence {
  reason: string;
  claim: ClaimKind;
  sampleSize: number;
  /** How many individual games already reached the target level. */
  gamesAtOrBeyondTarget: number;
  bestSustained: number | null;
  variance: number;
}

/** A BotDiff-derived personalized improvement step. */
export interface CoachingTarget {
  id: string;
  metric: string;
  name: string;
  unit: string;
  scope: MetricScope;
  champion?: string;
  role?: string;
  direction: Exclude<DirectionOfGood, "contextual">;
  baselineAtCreation: number;
  currentRollingValue: number;
  targetValue: number;
  status: TargetStatus;
  /** 0-100 progress from `baselineAtCreation` toward `targetValue`. */
  progress: number;
  sampleSize: number;
  sufficiency: DataSufficiency;
  evidence: TargetEvidence;
  createdAt: string;
  achievedAt: string | null;
  supersededAt: string | null;
  /** Target id this one replaced, so history reads as a chain. */
  previousTargetId?: string;
}

/** Explicit refusal state — preferred over a manufactured target. */
export interface InsufficientTargetEvidence {
  metric: string;
  scope: MetricScope;
  sufficiency: DataSufficiency;
  sampleSize: number;
  reason: string;
}

export type TargetProposal =
  | { ok: true; target: CoachingTarget }
  | { ok: false; insufficient: InsufficientTargetEvidence };

/** A metric worth coaching, ranked from the player's own evidence. */
export interface CoachingPriority {
  metric: string;
  name: string;
  scope: MetricScope;
  /** 0-100 opportunity score. */
  score: number;
  reason: string;
  claim: ClaimKind;
  sufficiency: DataSufficiency;
}

/** Serializable persistence unit — safe to store as JSON. */
export interface CoachingIntelligenceSnapshot {
  version: 1;
  updatedAt: string;
  /** Active + historical targets, oldest first. */
  targets: CoachingTarget[];
}

export interface TargetTransition {
  kind: "created" | "achieved" | "superseded" | "progress";
  targetId: string;
  metric: string;
  scopeId: string;
  detail: string;
}

/** One line of the player's development history for a metric. */
export interface CoachingHistoryEntry {
  metric: string;
  name: string;
  unit: string;
  scopeId: string;
  /** e.g. 6.1 baseline -> 6.5 achieved -> 6.8 achieved -> 7.1 active */
  steps: {
    value: number;
    status: TargetStatus;
    at: string;
    baseline: number;
  }[];
}

/** Structured, grounded context the AI Coach consumes instead of raw stats. */
export interface CoachingIntelligenceContext {
  generatedAt: string;
  totalGames: number;
  sufficiency: DataSufficiency;
  strengths: GroundedFinding[];
  growthOpportunities: GroundedFinding[];
  monitoredOnly: GroundedFinding[];
  activeTargets: CoachingTarget[];
  completedTargets: CoachingTarget[];
  priorities: CoachingPriority[];
  recentChanges: GroundedFinding[];
  championFindings: GroundedFinding[];
  roleFindings: GroundedFinding[];
  history: CoachingHistoryEntry[];
  /** Language rules the generator must respect. */
  languageGuards: string[];
}

export interface GroundedFinding {
  metric: string;
  name: string;
  scopeId: string;
  scopeLabel: string;
  statement: string;
  claim: ClaimKind;
  sampleSize: number;
  sufficiency: DataSufficiency;
  value: number | null;
  unit: string;
  direction: DirectionOfGood;
}
