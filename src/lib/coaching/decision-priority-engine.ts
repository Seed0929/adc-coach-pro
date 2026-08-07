// ---------------------------------------------------------------------------
// BotDiff Decision Prioritization Engine (Sprint 3.3)
//
// Answers ONE question: "What is the single decision this player should
// improve first?" — not "what mistakes happened?".
//
// It sits directly on top of the permanent Coaching Pipeline:
//
//   League Intelligence → Curriculum → Role Intelligence → Coaching Pipeline
//                                                              ↓
//                                              Decision Prioritization Engine
//                                                              ↓
//        Match Reports · Replay Coach · Practice Planner · future AI Coach
//
// Every score is derived from data already stored in the knowledge layers
// (curriculum routing importance, decision-library severity, role decision
// priorities, curriculum recovery/practice depth) plus the evidence the
// caller measured from real games. No champion logic, no role branching,
// no random ordering — identical inputs always produce identical output.
//
// Champion Intelligence is OPTIONAL. Without it the engine prioritizes with
// Role Intelligence + League Intelligence + Curriculum only.
//
// PURE + client-safe. No AI, no network, no Riot calls.
// ---------------------------------------------------------------------------
import {
  buildCoachingContextFor,
  type CoachingContext,
  type CoachingIssue,
} from "./coaching-pipeline";
import { getDecisionPattern } from "./knowledge-base";
import {
  habitContextsFromPriority,
  type HabitContext,
  type HabitContextOptions,
} from "./habit-context";
import type { RoleId } from "./knowledge-base/templates/champion";

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/** Measured, game-grounded evidence for one issue. All fields optional. */
export interface PriorityEvidence {
  /** Games in the window where the issue appeared. */
  games?: number;
  /** Window size (games analyzed). */
  total?: number;
  /** Consecutive most-recent games containing the issue. */
  streak?: number;
  /** Games with the issue that were losses. */
  lossGames?: number;
  /** Games with the issue that were wins. */
  winGames?: number;
  /** Trend direction across the window. */
  trend?: "improving" | "flat" | "worsening";
  /** Ready-to-render evidence sentences (already grounded in real games). */
  sentences?: string[];
}

export interface PriorityIssueInput extends CoachingIssue {
  evidenceData?: PriorityEvidence;
}

export interface DecisionPriorityInput {
  issues: PriorityIssueInput[];
  role: RoleId;
  /** Optional — Champion Intelligence is never required. */
  champion?: string;
  /** Optional window size fallback when an issue carries no `total`. */
  gamesAnalyzed?: number;
  /** Optional match/timestamp placeholders forwarded into HabitContext. */
  habitOptions?: HabitContextOptions;
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

export interface DecisionScoreBreakdown {
  /** How much the decision swings a game when it happens. */
  impact: number;
  /** How often it actually shows up in this player's games. */
  frequency: number;
  /** How hard it is to fix (higher = easier — cheap wins rank up). */
  difficulty: number;
  /** How stable the behavior is across the window (habit vs. one-off). */
  consistency: number;
  /** How well the player can recover in-game after it happens. */
  recoverability: number;
  /** How much the decision compounds into later losses/leads. */
  snowballPotential: number;
  /** How much control the player personally has over the outcome. */
  playerAgency: number;
  /** How sure BotDiff is that this is real, given the sample. */
  confidence: number;
}

/** Weights are fixed and data-driven — never per-role, never per-champion. */
export const PRIORITY_WEIGHTS: Record<keyof DecisionScoreBreakdown, number> = {
  impact: 0.22,
  frequency: 0.18,
  snowballPotential: 0.14,
  playerAgency: 0.12,
  consistency: 0.11,
  difficulty: 0.09,
  confidence: 0.09,
  recoverability: 0.05,
};

export interface PrioritizedDecision {
  id: string;
  label: string;
  kind: "strength" | "weakness";
  focusTopic: string;
  fundamental: string;
  /** 0-100 overall coaching priority. */
  priority: number;
  scores: DecisionScoreBreakdown;
  /** Why this ranks where it does — assembled from the knowledge layers. */
  reason: string;
  /** Evidence sentences grounded in real games. */
  evidence: string[];
  /** One measurable thing to practice. */
  practice: string;
  /** How to recover in-game after it happens. */
  recovery: string;
  /** Full merged pipeline knowledge for this decision. */
  context: CoachingContext;
}

export interface DecisionPriorityResult {
  role: RoleId;
  roleLabel: string;
  /** Every issue scored + sorted, weaknesses and strengths together. */
  ranked: PrioritizedDecision[];
  /** The ONE decision to improve first. */
  currentHighestPriority: PrioritizedDecision | null;
  /** The next decision once the first is under control. */
  secondaryPriority: PrioritizedDecision | null;
  /** A strength that is worth deliberately leaning into harder. */
  strengthWorthReinforcing: PrioritizedDecision | null;
  /** A stable good habit that simply needs to be maintained. */
  goodHabitToContinue: PrioritizedDecision | null;
  /** The weakness with the cheapest in-game recovery — a fast win. */
  recoveryOpportunity: PrioritizedDecision | null;
  /** True when Champion Intelligence contributed to the ranking. */
  championIntelligenceUsed: boolean;
  /**
   * Standardized, aggregation-ready metadata for every ranked decision, in
   * ranked order. Prepared for a future Habit Intelligence Engine — no
   * persistence, no cross-game analysis.
   */
  habitContexts: HabitContext[];
}

// ---------------------------------------------------------------------------
// Scoring helpers — all derived from knowledge-layer data
// ---------------------------------------------------------------------------

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const IMPACT_HINT: Record<string, number> = { high: 100, medium: 60, low: 30 };
const SEVERITY_SCORE: Record<string, number> = { high: 100, medium: 62, low: 32 };
const TIER_SCORE: Record<string, number> = { high: 100, medium: 65, low: 35 };

function evidenceRate(e: PriorityEvidence | undefined, fallbackTotal: number): number {
  const total = e?.total ?? fallbackTotal;
  if (!e?.games || !total) return 0;
  return Math.min(1, e.games / total);
}

function scoreIssue(
  c: CoachingContext,
  ev: PriorityEvidence | undefined,
  fallbackTotal: number,
): DecisionScoreBreakdown {
  const routing = c.routing;
  const pattern = routing?.decisionChainRef ? getDecisionPattern(routing.decisionChainRef) : undefined;
  const rate = evidenceRate(ev, fallbackTotal);
  const games = ev?.games ?? 0;
  const total = ev?.total ?? fallbackTotal;

  // Impact — routing importance + decision severity + caller-declared impact.
  const importanceScore = routing ? (routing.importance / 5) * 100 : 55;
  const severityScore = pattern ? SEVERITY_SCORE[pattern.severity] ?? 60 : 60;
  const declared = IMPACT_HINT[c.issue.impact ?? "medium"] ?? 60;
  const impact = clamp(importanceScore * 0.45 + severityScore * 0.3 + declared * 0.25);

  // Frequency — measured occurrence rate, boosted by an active streak.
  const streakBoost = Math.min(20, (ev?.streak ?? 0) * 5);
  const frequency = clamp(rate * 85 + streakBoost);

  // Difficulty — higher = easier to fix. Curriculum depth is the proxy: the
  // more concrete practice concepts and recovery methods a topic carries, the
  // more actionable it is; a long skill ladder means a slower skill to build.
  const actionable =
    c.practiceDrills.length * 8 + c.recoveryAdvice.length * 6 + (routing?.practiceDrill ? 12 : 0);
  const abstract = c.supportingTopics.length * 7 + c.curriculumTopic.commonMisconceptions.length * 4;
  const difficulty = clamp(45 + actionable - abstract);

  // Consistency — is this a habit or noise? Rate plus streak plus sample size.
  const spread = total ? Math.min(1, games / Math.max(1, total * 0.5)) : 0;
  const consistency = clamp(rate * 60 + spread * 25 + Math.min(15, (ev?.streak ?? 0) * 4));

  // Recoverability — how much in-game recovery material the layers provide.
  const recoverability = clamp(
    30 +
      c.recoveryAdvice.length * 12 +
      (routing?.recoveryMethod ? 15 : 0) +
      (routing?.recoveryTopic ? 10 : 0),
  );

  // Snowball potential — compounding consequences documented in the layers.
  const chainDepth =
    (c.decisionChain.tempoImpact ? 1 : 0) +
    (c.decisionChain.objectiveImpact ? 1 : 0) +
    (c.decisionChain.longTermImpact ? 1 : 0);
  const lossBias = games ? (ev?.lossGames ?? 0) / games : 0;
  const snowballPotential = clamp(
    chainDepth * 18 +
      c.typicalConsequences.length * 7 +
      (pattern?.laterConsequence ? 14 : 0) +
      lossBias * 20,
  );

  // Player agency — how directly the role's own decision priorities cover it.
  const priorityTier = c.decisionPriority[0]?.tier;
  const agencyBase = priorityTier ? TIER_SCORE[priorityTier] ?? 60 : 55;
  const playerAgency = clamp(
    agencyBase * 0.6 +
      Math.min(100, c.roleExpectations.length * 12) * 0.2 +
      Math.min(100, c.habitLibrary.length * 25) * 0.2,
  );

  // Confidence — sample size + routing coverage. Never certainty theatre.
  const sample = total ? Math.min(1, total / 15) : 0;
  const confidence = clamp(
    sample * 45 + rate * 25 + (routing ? 20 : 0) + (c.issue.evidence ? 10 : 0),
  );

  return {
    impact,
    frequency,
    difficulty,
    consistency,
    recoverability,
    snowballPotential,
    playerAgency,
    confidence,
  };
}

function overallPriority(s: DecisionScoreBreakdown): number {
  let sum = 0;
  for (const key of Object.keys(PRIORITY_WEIGHTS) as (keyof DecisionScoreBreakdown)[]) {
    sum += s[key] * PRIORITY_WEIGHTS[key];
  }
  return Math.round(sum * 10) / 10;
}

function reasonFor(c: CoachingContext, s: DecisionScoreBreakdown, ev?: PriorityEvidence): string {
  const parts: string[] = [];
  // One game is not a pattern — never claim recurrence from a single match.
  if (ev?.games && ev.games >= 2 && (ev.total ?? 0) >= 2) {
    parts.push(`It shows up in ${ev.games} of your last ${ev.total} games.`);
  }
  parts.push(c.whyItMatters);
  if (s.snowballPotential >= 60 && c.typicalConsequences[0]) parts.push(c.typicalConsequences[0]);
  if (s.difficulty >= 60 && c.practiceDrills[0]) parts.push(`Fastest fix: ${c.practiceDrills[0]}`);
  const out: string[] = [];
  for (const p of parts) if (p && !out.includes(p)) out.push(p);
  // Coaching text is read by players — never emit run-on sentences when two
  // knowledge fragments are joined.
  return out.map((p) => (/[.!?]$/.test(p.trim()) ? p.trim() : `${p.trim()}.`)).join(" ");
}

function toPrioritized(
  issue: PriorityIssueInput,
  c: CoachingContext,
  fallbackTotal: number,
): PrioritizedDecision {
  const ev = issue.evidenceData;
  const scores = scoreIssue(c, ev, fallbackTotal);
  const evidence: string[] = [];
  for (const s of [issue.evidence, ...(ev?.sentences ?? [])]) {
    if (s && !evidence.includes(s)) evidence.push(s);
  }
  return {
    id: issue.id,
    label: issue.label,
    kind: issue.kind,
    focusTopic: c.curriculumTopic.label,
    fundamental: c.fundamental.label,
    priority: overallPriority(scores),
    scores,
    reason: reasonFor(c, scores, ev),
    evidence,
    practice: c.practiceDrills[0] ?? c.decisionChain.practiceRecommendation ?? "",
    recovery: c.recoveryAdvice[0] ?? "",
    context: c,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Rank every detected issue by coaching value and select the five coaching
 * slots every BotDiff surface renders. Deterministic: ties break on stable
 * secondary signals, then on id, so ordering is never random.
 */
export function prioritizeDecisions(input: DecisionPriorityInput): DecisionPriorityResult {
  const fallbackTotal = input.gamesAnalyzed ?? 0;
  const scored = input.issues.map((issue) => {
    const context = buildCoachingContextFor(issue, input.role, input.champion);
    return toPrioritized(issue, context, fallbackTotal);
  });

  const ranked = [...scored].sort(
    (a, b) =>
      b.priority - a.priority ||
      b.scores.impact - a.scores.impact ||
      b.scores.frequency - a.scores.frequency ||
      a.id.localeCompare(b.id),
  );

  const weaknesses = ranked.filter((d) => d.kind === "weakness");
  const strengths = ranked.filter((d) => d.kind === "strength");

  // Strength worth reinforcing = the strength with the highest leverage.
  const strengthWorthReinforcing = strengths[0] ?? null;
  // Good habit to continue = the most consistent strength that isn't the one
  // we're already asking the player to lean into harder.
  const goodHabitToContinue =
    [...strengths]
      .sort(
        (a, b) =>
          b.scores.consistency - a.scores.consistency ||
          b.scores.confidence - a.scores.confidence ||
          a.id.localeCompare(b.id),
      )
      .find((s) => s.id !== strengthWorthReinforcing?.id) ??
    strengthWorthReinforcing ??
    null;

  const currentHighestPriority = weaknesses[0] ?? ranked[0] ?? null;
  const secondaryPriority =
    weaknesses.find((w) => w.id !== currentHighestPriority?.id) ??
    ranked.find((r) => r.id !== currentHighestPriority?.id) ??
    null;

  // Recovery opportunity = the weakness that is easiest to recover from and
  // easiest to fix — a fast, morale-positive win.
  const recoveryOpportunity =
    [...weaknesses]
      .sort(
        (a, b) =>
          b.scores.recoverability + b.scores.difficulty -
            (a.scores.recoverability + a.scores.difficulty) ||
          a.id.localeCompare(b.id),
      )
      .find((w) => w.id !== currentHighestPriority?.id) ?? null;

  const roleLabel = ranked[0]?.context.roleLabel ?? input.role.toUpperCase();

  const result: DecisionPriorityResult = {
    role: input.role,
    roleLabel,
    ranked,
    currentHighestPriority,
    secondaryPriority,
    strengthWorthReinforcing,
    goodHabitToContinue,
    recoveryOpportunity,
    championIntelligenceUsed: ranked.some((d) => !!d.context.championIntelligence),
    habitContexts: [],
  };
  result.habitContexts = habitContextsFromPriority(result, {
    champion: input.champion,
    ...input.habitOptions,
  });
  return result;
}

/** Convenience: only the single decision to improve first. */
export function topDecisionToImprove(
  input: DecisionPriorityInput,
): PrioritizedDecision | null {
  return prioritizeDecisions(input).currentHighestPriority;
}

/**
 * Adapter for anything shaped like a DetectedHabit (habit engine output) so
 * Match Reports, Replay Coach and the Practice Planner all feed the engine
 * identical data and therefore receive identical priorities.
 */
export interface HabitLikeInput {
  id: string;
  label: string;
  kind: "strength" | "weakness";
  category?: string;
  pillar?: CoachingIssue["pillar"];
  impact?: number;
  summary?: string;
  evidence?: {
    games: number;
    total: number;
    streak?: number;
    winGames?: number;
    lossGames?: number;
    sentences?: string[];
  };
}

export function habitToPriorityIssue(h: HabitLikeInput): PriorityIssueInput {
  const impact: CoachingIssue["impact"] =
    (h.impact ?? 50) >= 70 ? "high" : (h.impact ?? 50) >= 40 ? "medium" : "low";
  return {
    id: h.id,
    label: h.label,
    kind: h.kind,
    evidence: h.summary ?? h.evidence?.sentences?.[0],
    category: h.category,
    pillar: h.pillar,
    impact,
    evidenceData: h.evidence
      ? {
          games: h.evidence.games,
          total: h.evidence.total,
          streak: h.evidence.streak,
          winGames: h.evidence.winGames,
          lossGames: h.evidence.lossGames,
          sentences: h.evidence.sentences,
        }
      : undefined,
  };
}

/** Prioritize straight from habit-engine output. */
export function prioritizeHabits(
  habits: HabitLikeInput[],
  role: RoleId,
  champion?: string,
  gamesAnalyzed?: number,
  habitOptions?: HabitContextOptions,
): DecisionPriorityResult {
  return prioritizeDecisions({
    issues: habits.map(habitToPriorityIssue),
    role,
    champion,
    gamesAnalyzed: gamesAnalyzed ?? habits[0]?.evidence?.total,
    habitOptions,
  });
}

/** Namespaced facade, mirroring the other permanent coaching layers. */
export const DecisionPriorityEngine = {
  prioritize: prioritizeDecisions,
  fromHabits: prioritizeHabits,
  topDecision: topDecisionToImprove,
  weights: PRIORITY_WEIGHTS,
} as const;

export type DecisionPriorityEngineFacade = typeof DecisionPriorityEngine;