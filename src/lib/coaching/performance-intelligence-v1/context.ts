// ---------------------------------------------------------------------------
// AI Coach grounding — structured coaching context.
//
// The AI Coach must never re-derive conclusions from raw stats. It reads this
// object, where every statement is tagged with its claim kind, sample size and
// data sufficiency, and where correlation is never phrased as causation.
// ---------------------------------------------------------------------------
import { MIN_TARGET_GAMES, ROLLING_WINDOW, sufficiencyFor } from "./evaluation";
import { activeTargets, completedTargets } from "./targets";
import type {
  CoachingHistoryEntry,
  CoachingIntelligenceContext,
  CoachingIntelligenceSnapshot,
  CoachingPriority,
  GroundedFinding,
  MetricEvaluation,
} from "./types";

export const LANGUAGE_GUARDS: string[] = [
  "Never state that a metric is why the player is losing unless the context marks the claim as a supported inference with high data sufficiency.",
  "Never describe a change in a contextual metric (vision, kill participation, damage, objective takedowns) as better or worse play.",
  "Never invent match events, causes, benchmarks or confidence values that are not present in this context.",
  "When sufficiency is 'none' or 'low', say what is still unknown instead of drawing a conclusion.",
];

function finding(e: MetricEvaluation, statement: string, claim: GroundedFinding["claim"]): GroundedFinding {
  return {
    metric: e.metric,
    name: e.name,
    scopeId: e.scope.id,
    scopeLabel: e.scope.label,
    statement,
    claim,
    sampleSize: e.sampleSize,
    sufficiency: e.sufficiency,
    value: e.recentBaseline,
    unit: e.unit,
    direction: e.direction,
  };
}

/** Build the player's target history chains, oldest step first. */
export function buildHistory(snapshot: CoachingIntelligenceSnapshot): CoachingHistoryEntry[] {
  const map = new Map<string, CoachingHistoryEntry>();
  const ordered = [...snapshot.targets].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const t of ordered) {
    const key = `${t.scope.id}::${t.metric}`;
    const entry =
      map.get(key) ??
      map.set(key, { metric: t.metric, name: t.name, unit: t.unit, scopeId: t.scope.id, steps: [] }).get(key)!;
    entry.steps.push({
      value: t.targetValue,
      status: t.status,
      at: t.achievedAt ?? t.supersededAt ?? t.createdAt,
      baseline: t.baselineAtCreation,
    });
  }
  return [...map.values()];
}

/** One-line readable development trail, e.g. "6.1 baseline -> 6.5 achieved -> 7.1 active". */
export function historyLine(entry: CoachingHistoryEntry): string {
  const head = entry.steps.length ? `${entry.steps[0].baseline}${entry.unit} baseline` : "no history";
  const rest = entry.steps.map((s) => `${s.value}${entry.unit} ${s.status}`);
  return [head, ...rest].join(" → ");
}

export function buildCoachingContext(
  evaluations: MetricEvaluation[],
  snapshot: CoachingIntelligenceSnapshot,
  options: { totalGames: number; now?: string; priorities?: CoachingPriority[] } = { totalGames: 0 },
): CoachingIntelligenceContext {
  const now = options.now ?? new Date().toISOString();
  const playerScope = evaluations.filter((e) => e.scope.kind === "player");
  const strengths: GroundedFinding[] = [];
  const growth: GroundedFinding[] = [];
  const monitored: GroundedFinding[] = [];
  const recentChanges: GroundedFinding[] = [];

  for (const e of playerScope) {
    if (!e.coachable) {
      monitored.push(
        finding(
          e,
          `${e.name} averages ${e.recentBaseline}${e.unit} recently (${e.longTermBaseline}${e.unit} long term). BotDiff tracks this without calling it good or bad — it depends on champion and role.`,
          "observed_fact",
        ),
      );
      continue;
    }
    if (e.sampleSize < MIN_TARGET_GAMES) {
      monitored.push(
        finding(
          e,
          `${e.name} is at ${e.recentBaseline}${e.unit} across ${e.sampleSize} game(s) — not enough history for a conclusion.`,
          "observed_fact",
        ),
      );
      continue;
    }
    const higher = e.direction === "higher";
    const atBest =
      e.bestSustained != null &&
      (higher ? e.recentBaseline >= e.bestSustained : e.recentBaseline <= e.bestSustained);
    if (atBest && e.consistency >= 50) {
      strengths.push(
        finding(
          e,
          `${e.name} is at your best sustained level (${e.recentBaseline}${e.unit}) and repeats reliably across ${e.sampleSize} games.`,
          "supported_inference",
        ),
      );
    } else {
      growth.push(
        finding(
          e,
          `${e.name} averages ${e.recentBaseline}${e.unit} recently versus your own best sustained ${e.bestSustained ?? "—"}${e.unit}, so there is room you have already proven you can reach.`,
          "supported_inference",
        ),
      );
    }
    if (e.trend === "improving" || e.trend === "declining") {
      recentChanges.push(
        finding(
          e,
          `${e.name} moved from ${e.previousBaseline}${e.unit} to ${e.recentBaseline}${e.unit} over your last ${ROLLING_WINDOW * 2} games (${e.trend}).`,
          "calculated_trend",
        ),
      );
    } else if (e.trend === "changed") {
      recentChanges.push(
        finding(
          e,
          `${e.name} changed from ${e.previousBaseline}${e.unit} to ${e.recentBaseline}${e.unit}; direction of good is context-dependent, so this is not graded.`,
          "calculated_trend",
        ),
      );
    }
  }

  const scopeFindings = (kinds: MetricEvaluation["scope"]["kind"][]) =>
    evaluations
      .filter((e) => kinds.includes(e.scope.kind) && e.sampleSize >= MIN_TARGET_GAMES && e.coachable)
      .map((e) =>
        finding(
          e,
          `${e.scope.label}: ${e.name} averages ${e.recentBaseline}${e.unit} across ${e.sampleSize} games (long term ${e.longTermBaseline}${e.unit}, consistency ${e.consistency}%).`,
          "observed_fact",
        ),
      );

  return {
    generatedAt: now,
    totalGames: options.totalGames,
    sufficiency: sufficiencyFor(options.totalGames),
    strengths,
    growthOpportunities: growth,
    monitoredOnly: monitored,
    activeTargets: activeTargets(snapshot),
    completedTargets: completedTargets(snapshot),
    priorities: options.priorities ?? [],
    recentChanges,
    championFindings: scopeFindings(["champion", "champion_role", "recent_comparable"]),
    roleFindings: scopeFindings(["role"]),
    history: buildHistory(snapshot),
    languageGuards: LANGUAGE_GUARDS,
  };
}
