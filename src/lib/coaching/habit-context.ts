// ---------------------------------------------------------------------------
// BotDiff Habit Routing Preparation (Sprint 3.6)
//
// This layer does NOT detect habits, aggregate games, or persist anything.
// It standardizes the metadata every coaching surface already produces so a
// future Habit Intelligence Engine can aggregate across matches with zero
// changes to the permanent architecture:
//
//   League Intelligence → Curriculum → Role Intelligence →
//   League Decision Library → Coaching Pipeline →
//   Decision Prioritization Engine → [HabitContext] → future Habit Engine
//
// Champion Intelligence stays OPTIONAL. PURE + client-safe.
// ---------------------------------------------------------------------------
import {
  getDecisionPattern,
  getLeagueDecision,
  type CurriculumTopicId,
  type DecisionSeverity,
  type LeagueDecision,
  type LeagueFundamentalId,
} from "./knowledge-base";
import type { RoleId } from "./knowledge-base/templates/champion";
import type { CoachingContext, CoachingIssue } from "./coaching-pipeline";
import type {
  DecisionPriorityResult,
  DecisionScoreBreakdown,
  PrioritizedDecision,
} from "./decision-priority-engine";

// ---------------------------------------------------------------------------
// Placeholders — filled in later by the Habit Engine / Riot sync. Never
// invented here.
// ---------------------------------------------------------------------------

/** ISO timestamp of the decision. `null` until a real source provides it. */
export type HabitTimestamp = string | null;
/** Riot match id. `null` until a real source provides it. */
export type HabitMatchId = string | null;

/** How the decision resolved for the player in this single game. */
export type HabitOutcome = "positive" | "negative" | "neutral" | "unknown";

/** Where the behavior is heading. Single-game contexts default to "unknown". */
export type HabitImprovementDirection = "improving" | "stable" | "worsening" | "unknown";

/** Aggregation scope a future Habit Engine will bucket this record into. */
export type HabitScope = "universal" | "role" | "champion";

// ---------------------------------------------------------------------------
// The reusable, aggregation-ready record
// ---------------------------------------------------------------------------

export interface HabitContext {
  /** Stable decision / habit id — the aggregation key. */
  decisionId: string;
  /** Human label, kept for rendering without re-resolving the library. */
  label: string;
  kind: CoachingIssue["kind"];
  fundamental: LeagueFundamentalId;
  curriculumTopic: CurriculumTopicId;
  curriculumTopicLabel: string;
  role: RoleId;
  /** Optional by design — Champion Intelligence is never required. */
  champion?: string;
  severity: DecisionSeverity;
  /** 0-100 overall coaching priority from the Decision Prioritization Engine. */
  priorityScore: number;
  /** 0-100 confidence in this observation given the sample. */
  confidence: number;
  /** Full score breakdown when the priority engine produced this record. */
  scores?: DecisionScoreBreakdown;
  /** Placeholder — set by the future Habit Engine / match importer. */
  timestamp: HabitTimestamp;
  /** Placeholder — set by the future Habit Engine / match importer. */
  matchId: HabitMatchId;
  outcome: HabitOutcome;
  improvementDirection: HabitImprovementDirection;
  /** Reference into the curriculum / decision library, not free text. */
  practiceRecommendationRef: HabitPracticeRef;
  /** Buckets a future Habit Engine aggregates over. */
  scopes: HabitScope[];
  /** Evidence sentences already grounded in real games. */
  evidence: string[];
  /** Occurrence counters when the caller measured them. */
  occurrence?: HabitOccurrence;
  /** League Decision Library entry when the id maps to one. */
  leagueDecisionId?: string;
}

export interface HabitPracticeRef {
  /** Curriculum topic the drill belongs to. */
  topic: CurriculumTopicId;
  /** Decision-library pattern id, when routed. */
  decisionPatternId?: string;
  /** League Decision Library id, when routed. */
  leagueDecisionId?: string;
  /** The drill text the layers already produced. */
  drill: string;
  /** Measurable target when the role practice library supplies one. */
  measurable?: string;
}

export interface HabitOccurrence {
  games?: number;
  total?: number;
  streak?: number;
  winGames?: number;
  lossGames?: number;
}

/** Optional per-record hints a caller can supply (match import, replay, etc.). */
export interface HabitContextOptions {
  matchId?: HabitMatchId;
  timestamp?: HabitTimestamp;
  outcome?: HabitOutcome;
  improvementDirection?: HabitImprovementDirection;
  champion?: string;
}

// ---------------------------------------------------------------------------
// Resolution helpers — everything comes from the knowledge layers
// ---------------------------------------------------------------------------

const SEVERITY_FROM_IMPACT: Record<string, DecisionSeverity> = {
  high: "high",
  medium: "medium",
  low: "low",
};

function resolveSeverity(c: CoachingContext): DecisionSeverity {
  const pattern = c.routing?.decisionChainRef
    ? getDecisionPattern(c.routing.decisionChainRef)
    : undefined;
  if (pattern) return pattern.severity;
  const league = resolveLeagueDecision(c);
  if (league) {
    return league.estimatedImpact >= 0.75
      ? "high"
      : league.estimatedImpact >= 0.45
        ? "medium"
        : "low";
  }
  return SEVERITY_FROM_IMPACT[c.issue.impact ?? "medium"] ?? "medium";
}

function resolveLeagueDecision(c: CoachingContext): LeagueDecision | undefined {
  return (
    getLeagueDecision(c.issue.id) ??
    (c.routing?.decisionChainRef ? getLeagueDecision(c.routing.decisionChainRef) : undefined)
  );
}

function resolvePracticeRef(c: CoachingContext): HabitPracticeRef {
  const league = resolveLeagueDecision(c);
  return {
    topic: c.curriculumTopic.id,
    decisionPatternId: c.routing?.decisionChainRef,
    leagueDecisionId: league?.id,
    drill:
      c.practiceDrills[0] ??
      league?.practiceRecommendation ??
      c.decisionChain.practiceRecommendation ??
      "",
    measurable: c.practiceLibrary[0]?.measurable,
  };
}

function resolveScopes(champion?: string): HabitScope[] {
  return champion ? ["universal", "role", "champion"] : ["universal", "role"];
}

function outcomeFromKind(kind: CoachingIssue["kind"]): HabitOutcome {
  return kind === "strength" ? "positive" : "negative";
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/** Standardized habit metadata for one merged CoachingContext. */
export function buildHabitContext(
  c: CoachingContext,
  options: HabitContextOptions = {},
): HabitContext {
  const champion = options.champion ?? c.championIntelligence?.name;
  const league = resolveLeagueDecision(c);
  return {
    decisionId: c.issue.id,
    label: c.issue.label,
    kind: c.issue.kind,
    fundamental: c.fundamental.id,
    curriculumTopic: c.curriculumTopic.id,
    curriculumTopicLabel: c.curriculumTopic.label,
    role: c.role,
    champion,
    severity: resolveSeverity(c),
    priorityScore: 0,
    confidence: 0,
    timestamp: options.timestamp ?? null,
    matchId: options.matchId ?? null,
    outcome: options.outcome ?? outcomeFromKind(c.issue.kind),
    improvementDirection: options.improvementDirection ?? "unknown",
    practiceRecommendationRef: resolvePracticeRef(c),
    scopes: resolveScopes(champion),
    evidence: c.issue.evidence ? [c.issue.evidence] : [],
    leagueDecisionId: league?.id,
  };
}

/** Standardized habit metadata for one prioritized decision (preferred path). */
export function habitContextFromDecision(
  d: PrioritizedDecision,
  options: HabitContextOptions = {},
): HabitContext {
  const base = buildHabitContext(d.context, options);
  const ev = (d.context.issue as { evidenceData?: HabitOccurrence & { trend?: string } })
    .evidenceData;
  const trend = ev?.trend;
  return {
    ...base,
    priorityScore: d.priority,
    confidence: d.scores.confidence,
    scores: d.scores,
    evidence: d.evidence.length ? d.evidence : base.evidence,
    improvementDirection:
      options.improvementDirection ??
      (trend === "improving" || trend === "worsening"
        ? trend
        : trend === "flat"
          ? "stable"
          : "unknown"),
    occurrence: ev
      ? {
          games: ev.games,
          total: ev.total,
          streak: ev.streak,
          winGames: ev.winGames,
          lossGames: ev.lossGames,
        }
      : undefined,
    practiceRecommendationRef: {
      ...base.practiceRecommendationRef,
      drill: d.practice || base.practiceRecommendationRef.drill,
    },
  };
}

/** Every prioritized decision as habit-ready records, ranked order preserved. */
export function habitContextsFromPriority(
  result: DecisionPriorityResult,
  options: HabitContextOptions = {},
): HabitContext[] {
  return result.ranked.map((d) => habitContextFromDecision(d, options));
}

/** Every pipeline context as habit-ready records (no priority scores). */
export function habitContextsFromContexts(
  contexts: CoachingContext[],
  options: HabitContextOptions = {},
): HabitContext[] {
  return contexts.map((c) => buildHabitContext(c, options));
}

/**
 * Grouping key a future Habit Engine can aggregate on without re-deriving
 * anything. Deterministic and stable across sessions.
 */
export function habitAggregationKey(h: HabitContext, scope: HabitScope = "universal"): string {
  if (scope === "champion") return `champion:${h.champion ?? "unknown"}:${h.decisionId}`;
  if (scope === "role") return `role:${h.role}:${h.decisionId}`;
  return `universal:${h.decisionId}`;
}

/** Namespaced facade, mirroring the other permanent coaching layers. */
export const HabitRouting = {
  fromContext: buildHabitContext,
  fromDecision: habitContextFromDecision,
  fromPriority: habitContextsFromPriority,
  fromContexts: habitContextsFromContexts,
  aggregationKey: habitAggregationKey,
} as const;

export type HabitRoutingFacade = typeof HabitRouting;
