// ---------------------------------------------------------------------------
// Performance Consistency — "how predictable is my performance game to game?"
//
// This replaces BotDiff's old abstract 0-100 "consistency / stability" numbers.
// Everything shown is measurable from the player's own comparable games:
//   - recent average
//   - typical recent range
//   - a plain-language variability classification
//
// The classification is metric-aware because different metric families have
// different natural spread:
//   RATE metrics (CS/min, gold/min, damage/min, KDA, %) are compared using the
//   coefficient of variation (sd / mean) — scale free, so 6.0 ± 0.6 and
//   400 ± 40 classify the same.
//   COUNT metrics (deaths, objective takedowns, vision score) are compared to
//   the spread a Poisson-like count of that size would naturally have
//   (sd / sqrt(mean)); a dispersion near 1 is normal randomness, not a habit.
// No invented scores, no benchmarks, no rank comparisons.
// ---------------------------------------------------------------------------
import { findMetric, roundMetric } from "./metrics";
import { MIN_SCOPE_GAMES } from "./evaluation";
import type { MetricEvaluation } from "./types";

export type VariabilityClass =
  | "Very consistent"
  | "Consistent"
  | "Some variation"
  | "High variation";

/** Which statistical family a metric belongs to. */
export type MetricFamily = "rate" | "count";

const COUNT_METRICS = new Set(["deaths", "objective", "vision"]);

export function metricFamily(metric: string): MetricFamily {
  return COUNT_METRICS.has(metric) ? "count" : "rate";
}

/** Window used for "recent" — the player's most recent comparable games. */
export const CONSISTENCY_WINDOW = 10;

const RATE_THRESHOLDS: [number, number, number] = [0.12, 0.22, 0.35];
const COUNT_THRESHOLDS: [number, number, number] = [0.7, 1.1, 1.6];

export interface PerformanceConsistency {
  metric: string;
  name: string;
  unit: string;
  scopeId: string;
  scopeLabel: string;
  /** False when there is not enough history to say anything. */
  available: boolean;
  sampleSize: number;
  /** Average across the recent comparable games. */
  average: number;
  /** Typical recent range, clipped to values the player actually produced. */
  typicalRange: { low: number; high: number } | null;
  classification: VariabilityClass | null;
  /** The metric-aware statistic behind the classification. */
  statistic: { kind: "coefficient_of_variation" | "count_dispersion"; value: number };
  /** Player-facing one-liner, e.g. "Typically 28–55 · High variation". */
  summary: string;
  /** Honest note when data is missing. */
  note: string | null;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

export function classifyVariability(
  metric: string,
  values: number[],
): { classification: VariabilityClass; statistic: PerformanceConsistency["statistic"] } {
  const m = mean(values);
  const sd = stdDev(values);
  const family = metricFamily(metric);
  const [a, b, c] =
    family === "count" ? COUNT_THRESHOLDS : RATE_THRESHOLDS;
  const value =
    family === "count"
      ? m <= 0
        ? 0
        : sd / Math.sqrt(m)
      : m === 0
        ? 0
        : sd / Math.abs(m);
  const rounded = Math.round(value * 100) / 100;
  const classification: VariabilityClass =
    value <= a ? "Very consistent" : value <= b ? "Consistent" : value <= c ? "Some variation" : "High variation";
  return {
    classification,
    statistic: {
      kind: family === "count" ? "count_dispersion" : "coefficient_of_variation",
      value: rounded,
    },
  };
}

const INSUFFICIENT = (games: number) =>
  `Not enough games yet — BotDiff needs ${MIN_SCOPE_GAMES} comparable games to describe how predictable this is (currently ${games}).`;

/** Build the consistency picture for one evaluated metric. */
export function consistencyFor(evaluation: MetricEvaluation): PerformanceConsistency {
  const def = findMetric(evaluation.metric);
  const precision = def?.precision ?? 1;
  const values = evaluation.samples.slice(-CONSISTENCY_WINDOW).map((s) => s.value);
  const base: PerformanceConsistency = {
    metric: evaluation.metric,
    name: evaluation.name,
    unit: evaluation.unit,
    scopeId: evaluation.scope.id,
    scopeLabel: evaluation.scope.label,
    available: false,
    sampleSize: values.length,
    average: 0,
    typicalRange: null,
    classification: null,
    statistic: { kind: metricFamily(evaluation.metric) === "count" ? "count_dispersion" : "coefficient_of_variation", value: 0 },
    summary: "Not enough games yet",
    note: INSUFFICIENT(values.length),
  };
  if (values.length < MIN_SCOPE_GAMES) return base;

  const average = roundMetric(mean(values), precision);
  const sd = stdDev(values);
  const observedMin = Math.min(...values);
  const observedMax = Math.max(...values);
  // One standard deviation each way, never wider than what actually happened.
  const low = roundMetric(Math.max(observedMin, average - sd), precision);
  const high = roundMetric(Math.min(observedMax, average + sd), precision);
  const { classification, statistic } = classifyVariability(evaluation.metric, values);
  return {
    ...base,
    available: true,
    average,
    typicalRange: { low, high },
    classification,
    statistic,
    summary: `${average}${evaluation.unit} average · typically ${low}–${high}${evaluation.unit} · ${classification.toLowerCase()}`,
    note: null,
  };
}

/** Consistency for every player-scope metric BotDiff evaluated. */
export function buildConsistencyPanel(
  evaluations: MetricEvaluation[],
  scopeId = "player",
): PerformanceConsistency[] {
  return evaluations.filter((e) => e.scope.id === scopeId).map(consistencyFor);
}

/**
 * Consistency feeds goal completion: a very consistent player's rolling change
 * is trustworthy evidence, a highly variable player's is more likely noise.
 * Returns how much of the player's own spread a change must exceed before
 * BotDiff calls it sustained rather than an outlier.
 */
export function sustainedChangeThreshold(consistency: PerformanceConsistency): number {
  if (!consistency.available || !consistency.typicalRange) return Infinity;
  const spread = consistency.typicalRange.high - consistency.typicalRange.low;
  switch (consistency.classification) {
    case "Very consistent": return spread * 0.25;
    case "Consistent": return spread * 0.4;
    case "Some variation": return spread * 0.6;
    default: return spread * 0.8;
  }
}
