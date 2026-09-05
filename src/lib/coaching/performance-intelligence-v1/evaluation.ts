// ---------------------------------------------------------------------------
// Player Performance Model — scoped metric evaluation.
//
// Turns imported matches (Riot-derived evidence) into BotDiff's own scoped
// metric picture: long-term baseline, recent + previous rolling baselines,
// trend, variance, consistency, sample size, demonstrated range and best
// sustained stretch, plus an honest data-sufficiency level.
//
// Individual games are evidence ONLY. Nothing here creates or completes a
// coaching goal — that lives in `targets.ts`.
// ---------------------------------------------------------------------------
import { classifyTrend } from "@/lib/metrics/metric-reading";
import type { ProfileMatch } from "@/lib/profile-engine";
import {
  COACHABLE_METRICS,
  isCoachable,
  metricDirection,
  roundMetric,
  type CoachableMetricDef,
} from "./metrics";
import type {
  DataSufficiency,
  MetricEvaluation,
  MetricSample,
  MetricScope,
} from "./types";

/** Rolling window used for every "recent" statement in this layer. */
export const ROLLING_WINDOW = 5;
/** Below this, BotDiff refuses to reason about a scope at all. */
export const MIN_SCOPE_GAMES = 5;
/** Below this, no target may be generated for a scope. */
export const MIN_TARGET_GAMES = 10;

const mean = (n: number[]) => (n.length ? n.reduce((a, b) => a + b, 0) / n.length : 0);

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

export function sufficiencyFor(sampleSize: number): DataSufficiency {
  if (sampleSize < MIN_SCOPE_GAMES) return "none";
  if (sampleSize < MIN_TARGET_GAMES) return "low";
  if (sampleSize < 20) return "moderate";
  return "high";
}

/** Best rolling-window mean the player has actually sustained. */
export function bestSustained(
  values: number[],
  higherIsBetter: boolean,
  window = ROLLING_WINDOW,
): number | null {
  if (values.length < window) return null;
  let best: number | null = null;
  for (let i = 0; i + window <= values.length; i++) {
    const m = mean(values.slice(i, i + window));
    if (best == null || (higherIsBetter ? m > best : m < best)) best = m;
  }
  return best;
}

// --- scopes ----------------------------------------------------------------

const norm = (s: string) => (s || "UNKNOWN").toUpperCase();

/**
 * All scopes BotDiff can evaluate for a player, given the matches available.
 * `matches` is newest-first (as produced by the profile engine).
 */
export function buildScopes(matches: ProfileMatch[]): { scope: MetricScope; matches: ProfileMatch[] }[] {
  const out: { scope: MetricScope; matches: ProfileMatch[] }[] = [];
  if (matches.length === 0) return out;

  out.push({ scope: { kind: "player", id: "player", label: "Across all your games" }, matches });

  const byRole = new Map<string, ProfileMatch[]>();
  const byChampion = new Map<string, ProfileMatch[]>();
  const byChampionRole = new Map<string, ProfileMatch[]>();
  for (const m of matches) {
    const role = norm(m.role);
    const champ = m.champion || "Unknown";
    (byRole.get(role) ?? byRole.set(role, []).get(role)!).push(m);
    (byChampion.get(champ) ?? byChampion.set(champ, []).get(champ)!).push(m);
    const key = `${champ}|${role}`;
    (byChampionRole.get(key) ?? byChampionRole.set(key, []).get(key)!).push(m);
  }

  for (const [role, list] of byRole) {
    out.push({ scope: { kind: "role", id: `role:${role}`, label: `In ${roleLabel(role)}`, role }, matches: list });
  }
  for (const [champ, list] of byChampion) {
    out.push({ scope: { kind: "champion", id: `champion:${champ}`, label: `On ${champ}`, champion: champ }, matches: list });
  }
  for (const [key, list] of byChampionRole) {
    const [champ, role] = key.split("|");
    out.push({
      scope: {
        kind: "champion_role",
        id: `champion_role:${champ}:${role}`,
        label: `On ${champ} in ${roleLabel(role)}`,
        champion: champ,
        role,
      },
      matches: list,
    });
  }

  // Recent comparable games: the most recent games on the player's current
  // champion + role, which is the fairest short-term comparison set.
  const latest = matches[0];
  const comparable = matches.filter(
    (m) => m.champion === latest.champion && norm(m.role) === norm(latest.role),
  );
  if (comparable.length >= MIN_SCOPE_GAMES) {
    out.push({
      scope: {
        kind: "recent_comparable",
        id: "recent_comparable",
        label: `Your recent ${latest.champion} games`,
        champion: latest.champion,
        role: norm(latest.role),
      },
      matches: comparable.slice(0, 10),
    });
  }
  return out;
}

function roleLabel(role: string): string {
  switch (role) {
    case "TOP": return "top lane";
    case "JUNGLE": return "the jungle";
    case "MIDDLE": case "MID": return "mid lane";
    case "BOTTOM": case "BOT": return "bot lane";
    case "UTILITY": case "SUPPORT": return "support";
    default: return "your role";
  }
}

// --- evaluation ------------------------------------------------------------

/** Evaluate one metric inside one scope. `matches` is newest-first. */
export function evaluateMetric(
  def: CoachableMetricDef,
  scope: MetricScope,
  matches: ProfileMatch[],
): MetricEvaluation {
  const chron = [...matches].reverse();
  const samples: MetricSample[] = chron.map((m, i) => ({
    sequence: i,
    matchId: m.matchId,
    value: roundMetric(def.get(m), def.precision),
    champion: m.champion,
    role: norm(m.role),
    gameCreation: m.gameCreation,
  }));
  const values = samples.map((s) => s.value);
  const recentSlice = values.slice(-ROLLING_WINDOW);
  const prevSlice = values.slice(-ROLLING_WINDOW * 2, -ROLLING_WINDOW);
  const recentBaseline = roundMetric(mean(recentSlice), def.precision);
  const previousBaseline = prevSlice.length >= 3 ? roundMetric(mean(prevSlice), def.precision) : null;
  const direction = metricDirection(def);

  return {
    metric: def.key,
    name: def.name,
    unit: def.unit,
    scope,
    direction,
    coachable: isCoachable(def),
    sampleSize: values.length,
    longTermBaseline: roundMetric(mean(values), def.precision),
    recentBaseline,
    previousBaseline,
    trend:
      values.length < MIN_SCOPE_GAMES || previousBaseline == null
        ? "insufficient_data"
        : classifyTrend(recentBaseline, previousBaseline, direction, def.noiseFloor),
    variance: roundMetric(stdDev(values), def.precision),
    consistency: consistencyScore(values),
    demonstratedRange: {
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
    },
    bestSustained: (() => {
      const b = bestSustained(values, def.higherIsBetter);
      return b == null ? null : roundMetric(b, def.precision);
    })(),
    sufficiency: sufficiencyFor(values.length),
    samples,
  };
}

/** 0-100: how repeatable the metric is for this player (low spread = high). */
function consistencyScore(values: number[]): number {
  if (values.length < 3) return 0;
  const m = mean(values);
  if (m === 0) return 0;
  const cv = stdDev(values) / Math.abs(m);
  return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
}

/** Every metric in every scope BotDiff can currently evaluate. */
export function evaluateAll(matches: ProfileMatch[]): MetricEvaluation[] {
  const out: MetricEvaluation[] = [];
  for (const { scope, matches: list } of buildScopes(matches)) {
    if (list.length < MIN_SCOPE_GAMES) continue;
    for (const def of COACHABLE_METRICS) out.push(evaluateMetric(def, scope, list));
  }
  return out;
}

export function findEvaluation(
  evaluations: MetricEvaluation[],
  metric: string,
  scopeId = "player",
): MetricEvaluation | undefined {
  return evaluations.find((e) => e.metric === metric && e.scope.id === scopeId);
}
