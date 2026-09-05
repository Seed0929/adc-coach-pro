// ---------------------------------------------------------------------------
// Personalized Coaching Targets — generation, prioritization, completion.
//
// TARGET GENERATION METHODOLOGY (no benchmark tables anywhere):
//   1. The metric must have a defensible direction of good (contextual metrics
//      are monitored only).
//   2. The scope must hold at least MIN_TARGET_GAMES games.
//   3. The player must have a demonstrated best SUSTAINED stretch for the
//      metric (a rolling window they actually produced).
//   4. The next step is half of the player's own headroom from their recent
//      rolling baseline toward that demonstrated best. When they are already
//      at their best, the step is half of their own game-to-game spread
//      (standard deviation) instead — still their own evidence.
//   5. The step must exceed the metric's noise floor, otherwise there is
//      nothing meaningful to chase.
//   6. The target level must already have been reached in at least two
//      individual games, so BotDiff is only asking for repeatability.
//   Any failure returns an explicit insufficient-evidence state.
//
// GOAL COMPLETION METHODOLOGY:
//   A target is achieved only when, since its creation, the player has played
//   at least a full rolling window of games in that scope, the rolling
//   baseline meets the target, AND a majority of those games individually meet
//   it. One outlier game can never complete a target.
// ---------------------------------------------------------------------------
import { findMetric, roundMetric } from "./metrics";
import { MIN_TARGET_GAMES, ROLLING_WINDOW, sufficiencyFor } from "./evaluation";
import type {
  CoachingIntelligenceSnapshot,
  CoachingPriority,
  CoachingTarget,
  MetricEvaluation,
  TargetProposal,
  TargetTransition,
} from "./types";

/** BotDiff keeps coaching focused: never more simultaneous goals than this. */
export const MAX_ACTIVE_TARGETS = 5;
export const PREFERRED_ACTIVE_TARGETS = 3;
/** How many individual games must already have reached a proposed target. */
const MIN_GAMES_AT_TARGET = 2;
/** Share of post-creation games that must individually meet the target. */
const SUSTAIN_MAJORITY = 0.6;

const meetsLevel = (value: number, level: number, higher: boolean) =>
  higher ? value >= level : value <= level;

export function emptySnapshot(now = new Date().toISOString()): CoachingIntelligenceSnapshot {
  return { version: 1, updatedAt: now, targets: [] };
}

export function activeTargets(snapshot: CoachingIntelligenceSnapshot): CoachingTarget[] {
  return snapshot.targets.filter((t) => t.status === "active");
}

export function completedTargets(snapshot: CoachingIntelligenceSnapshot): CoachingTarget[] {
  return snapshot.targets.filter((t) => t.status === "achieved");
}

// --- generation ------------------------------------------------------------

function targetId(evaluation: MetricEvaluation, createdAt: string): string {
  return `${evaluation.scope.id}::${evaluation.metric}::${createdAt}`;
}

export function proposeTarget(
  evaluation: MetricEvaluation,
  options: { now?: string; previousTargetId?: string; priorAchievedValue?: number } = {},
): TargetProposal {
  const now = options.now ?? new Date().toISOString();
  const def = findMetric(evaluation.metric);
  const base = {
    metric: evaluation.metric,
    scope: evaluation.scope,
    sufficiency: evaluation.sufficiency,
    sampleSize: evaluation.sampleSize,
  };

  if (!def || !evaluation.coachable || evaluation.direction === "contextual") {
    return {
      ok: false,
      insufficient: {
        ...base,
        reason:
          "This metric depends on champion and role context, so BotDiff will monitor it instead of setting a goal.",
      },
    };
  }
  if (evaluation.sampleSize < MIN_TARGET_GAMES) {
    return {
      ok: false,
      insufficient: {
        ...base,
        reason: `Needs ${MIN_TARGET_GAMES} games in this scope before a personal goal can be justified (currently ${evaluation.sampleSize}).`,
      },
    };
  }
  if (evaluation.bestSustained == null) {
    return {
      ok: false,
      insufficient: {
        ...base,
        reason: "No sustained stretch to learn from yet, so BotDiff has nothing to base a goal on.",
      },
    };
  }

  const higher = evaluation.direction === "higher";
  const recent = evaluation.recentBaseline;
  const headroom = higher
    ? evaluation.bestSustained - recent
    : recent - evaluation.bestSustained;
  // Step comes from the player's own evidence: half their remaining headroom
  // toward their own best sustained form, or half their own spread when they
  // are already performing at that level.
  const rawStep = headroom > 0 ? headroom / 2 : evaluation.variance / 2;
  if (!(rawStep > 0) || rawStep < def.noiseFloor) {
    return {
      ok: false,
      insufficient: {
        ...base,
        reason:
          "Your recent form already sits at your demonstrated level here — BotDiff won't invent a bigger number without evidence.",
      },
    };
  }
  let targetValue = roundMetric(higher ? recent + rawStep : recent - rawStep, def.precision);
  if (options.priorAchievedValue != null) {
    // Never regress a completed target into an easier one.
    const prior = options.priorAchievedValue;
    if (higher ? targetValue <= prior : targetValue >= prior) {
      return {
        ok: false,
        insufficient: {
          ...base,
          reason:
            "The next step would not be harder than the goal you already completed, so coaching moves to another metric.",
        },
      };
    }
  }
  if (!higher && targetValue < 0) targetValue = 0;

  const values = evaluation.samples.map((s) => s.value);
  const gamesAtOrBeyondTarget = values.filter((v) => meetsLevel(v, targetValue, higher)).length;
  if (gamesAtOrBeyondTarget < MIN_GAMES_AT_TARGET) {
    return {
      ok: false,
      insufficient: {
        ...base,
        reason: `You have only reached ${roundMetric(targetValue, def.precision)}${def.unit} in ${gamesAtOrBeyondTarget} game(s) — not enough proof that it is repeatable.`,
      },
    };
  }

  const createdAt = now;
  const target: CoachingTarget = {
    id: targetId(evaluation, createdAt),
    metric: evaluation.metric,
    name: evaluation.name,
    unit: evaluation.unit,
    scope: evaluation.scope,
    champion: evaluation.scope.champion,
    role: evaluation.scope.role,
    direction: higher ? "higher" : "lower",
    baselineAtCreation: recent,
    currentRollingValue: recent,
    targetValue,
    status: "active",
    progress: 0,
    sampleSize: evaluation.sampleSize,
    sufficiency: evaluation.sufficiency,
    evidence: {
      reason: `Your recent ${evaluation.name.toLowerCase()} is ${recent}${evaluation.unit} and your best sustained stretch is ${evaluation.bestSustained}${evaluation.unit}, reached in ${gamesAtOrBeyondTarget} game(s) at or beyond ${targetValue}${evaluation.unit}.`,
      claim: "coaching_recommendation",
      sampleSize: evaluation.sampleSize,
      gamesAtOrBeyondTarget,
      bestSustained: evaluation.bestSustained,
      variance: evaluation.variance,
    },
    createdAt,
    achievedAt: null,
    supersededAt: null,
    previousTargetId: options.previousTargetId,
  };
  return { ok: true, target };
}

export function targetProgress(target: CoachingTarget, currentRolling: number): number {
  const span = target.targetValue - target.baselineAtCreation;
  if (span === 0) return 100;
  const moved = currentRolling - target.baselineAtCreation;
  return Math.max(0, Math.min(100, Math.round((moved / span) * 100)));
}

// --- prioritization --------------------------------------------------------

/**
 * Rank coachable metrics by the player's own opportunity: how far recent form
 * sits from their demonstrated best sustained level, weighted by sample size
 * and worsened by a declining trend. Contextual metrics never rank.
 */
export function rankPriorities(evaluations: MetricEvaluation[]): CoachingPriority[] {
  return evaluations
    .filter((e) => e.coachable && e.sampleSize >= MIN_TARGET_GAMES && e.bestSustained != null)
    .map((e) => {
      const higher = e.direction === "higher";
      const headroom = higher ? e.bestSustained! - e.recentBaseline : e.recentBaseline - e.bestSustained!;
      const scale = Math.max(Math.abs(e.bestSustained!), 0.1);
      const gap = Math.max(0, headroom) / scale; // 0..1-ish
      const trendPenalty = e.trend === "declining" ? 0.25 : e.trend === "improving" ? -0.1 : 0;
      const confidence = e.sufficiency === "high" ? 1 : e.sufficiency === "moderate" ? 0.8 : 0.5;
      const score = Math.max(0, Math.min(100, Math.round((gap + trendPenalty) * 100 * confidence)));
      return {
        metric: e.metric,
        name: e.name,
        scope: e.scope,
        score,
        reason:
          headroom > 0
            ? `Recent ${e.name.toLowerCase()} (${e.recentBaseline}${e.unit}) sits below your own best sustained ${e.bestSustained}${e.unit}.`
            : `You are holding your best demonstrated ${e.name.toLowerCase()} — monitored rather than urgent.`,
        claim: "supported_inference" as const,
        sufficiency: e.sufficiency,
      };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);
}

// --- reconciliation (the only mutation entry point) ------------------------

export interface ReconcileResult {
  snapshot: CoachingIntelligenceSnapshot;
  transitions: TargetTransition[];
  /** Metrics BotDiff explicitly refused to target, with reasons. */
  refusals: { metric: string; scopeId: string; reason: string }[];
}

/**
 * Fold the current evaluations into the stored snapshot: update progress,
 * complete sustained targets, retire stale ones and open new targets for the
 * highest-value priorities — never more than MAX_ACTIVE_TARGETS.
 */
export function reconcileTargets(
  snapshot: CoachingIntelligenceSnapshot,
  evaluations: MetricEvaluation[],
  options: { now?: string; maxActive?: number } = {},
): ReconcileResult {
  const now = options.now ?? new Date().toISOString();
  const maxActive = options.maxActive ?? MAX_ACTIVE_TARGETS;
  const transitions: TargetTransition[] = [];
  const refusals: { metric: string; scopeId: string; reason: string }[] = [];
  const targets = snapshot.targets.map((t) => ({ ...t }));
  const evalFor = (metric: string, scopeId: string) =>
    evaluations.find((e) => e.metric === metric && e.scope.id === scopeId);

  // 1. Review active targets.
  for (const target of targets) {
    if (target.status !== "active") continue;
    const evaluation = evalFor(target.metric, target.scope.id);
    if (!evaluation) continue;
    const higher = target.direction === "higher";
    target.currentRollingValue = evaluation.recentBaseline;
    target.sampleSize = evaluation.sampleSize;
    target.sufficiency = evaluation.sufficiency;
    target.progress = targetProgress(target, evaluation.recentBaseline);

    const gamesSinceCreation = Math.max(
      0,
      evaluation.sampleSize - target.evidence.sampleSize,
    );
    const window = evaluation.samples.slice(-ROLLING_WINDOW).map((s) => s.value);
    const individualHits = window.filter((v) => meetsLevel(v, target.targetValue, higher)).length;
    const sustained =
      gamesSinceCreation >= ROLLING_WINDOW &&
      meetsLevel(evaluation.recentBaseline, target.targetValue, higher) &&
      individualHits >= Math.ceil(ROLLING_WINDOW * SUSTAIN_MAJORITY);

    if (sustained) {
      target.status = "achieved";
      target.achievedAt = now;
      target.progress = 100;
      transitions.push({
        kind: "achieved",
        targetId: target.id,
        metric: target.metric,
        scopeId: target.scope.id,
        detail: `Sustained ${target.targetValue}${target.unit} across ${ROLLING_WINDOW} games (${individualHits} of ${window.length} individually).`,
      });
    } else {
      transitions.push({
        kind: "progress",
        targetId: target.id,
        metric: target.metric,
        scopeId: target.scope.id,
        detail: `${target.progress}% toward ${target.targetValue}${target.unit}; ${gamesSinceCreation} game(s) since it was set.`,
      });
    }
  }

  // 2. Re-evaluate after completions and open new targets by priority.
  const priorities = rankPriorities(evaluations);
  const isActive = (metric: string, scopeId: string) =>
    targets.some((t) => t.status === "active" && t.metric === metric && t.scope.id === scopeId);

  for (const priority of priorities) {
    if (targets.filter((t) => t.status === "active").length >= maxActive) break;
    if (isActive(priority.metric, priority.scope.id)) continue;
    const evaluation = evalFor(priority.metric, priority.scope.id);
    if (!evaluation) continue;
    const priorAchieved = targets
      .filter(
        (t) =>
          t.status === "achieved" && t.metric === priority.metric && t.scope.id === priority.scope.id,
      )
      .sort((a, b) => (a.achievedAt ?? "").localeCompare(b.achievedAt ?? ""))
      .at(-1);
    const proposal = proposeTarget(evaluation, {
      now,
      previousTargetId: priorAchieved?.id,
      priorAchievedValue: priorAchieved?.targetValue,
    });
    if (proposal.ok) {
      targets.push(proposal.target);
      transitions.push({
        kind: "created",
        targetId: proposal.target.id,
        metric: proposal.target.metric,
        scopeId: proposal.target.scope.id,
        detail: proposal.target.evidence.reason,
      });
    } else {
      refusals.push({
        metric: proposal.insufficient.metric,
        scopeId: proposal.insufficient.scope.id,
        reason: proposal.insufficient.reason,
      });
    }
  }

  return { snapshot: { version: 1, updatedAt: now, targets }, transitions, refusals };
}

/** Retire an active target whose scope no longer has enough evidence. */
export function supersedeTarget(
  snapshot: CoachingIntelligenceSnapshot,
  targetId: string,
  now = new Date().toISOString(),
): CoachingIntelligenceSnapshot {
  return {
    version: 1,
    updatedAt: now,
    targets: snapshot.targets.map((t) =>
      t.id === targetId && t.status === "active"
        ? { ...t, status: "superseded", supersededAt: now }
        : t,
    ),
  };
}

export { sufficiencyFor };
