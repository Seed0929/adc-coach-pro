// ---------------------------------------------------------------------------
// BotDiff — Shared Metric Model
//
// One canonical reading shape for EVERY graph, sparkline and metric tile in
// BotDiff. Pages never interpret metrics themselves: they build a
// `MetricReading` here and hand it to the shared chart components.
//
// Rules baked in (never bypass them in a page):
//  - direction of good decides the visual state, never the sign of a delta
//  - contextual metrics (vision, kill participation, damage share, objectives)
//    stay neutral because BotDiff cannot claim "more is better" for them
//  - targets/baselines only exist when derived from the player's own history
//  - missing history yields `insufficient_data`, never a fabricated 0 / +0
//
// PURE + client-safe.
// ---------------------------------------------------------------------------

import type { BotDiffScore, TrendMetric } from "@/lib/profile-engine";

export type DirectionOfGood = "higher" | "lower" | "contextual";

export type MetricTrend =
  | "improving"
  | "declining"
  | "stable"
  | "changed"
  | "insufficient_data";

export type MetricTone = "positive" | "caution" | "neutral" | "muted";

export interface MetricPoint {
  /** Chronological index (oldest first). */
  index: number;
  value: number;
  /** Player-facing point label, e.g. "Game 12". */
  label?: string;
  /** Optional short date, e.g. "Aug 25". */
  date?: string;
}

export interface MetricReferenceLine {
  value: number;
  /** Shown directly on the graph — never an unlabelled dotted line. */
  label: string;
  kind: "baseline" | "target";
}

export interface MetricReading {
  key: string;
  name: string;
  /** Null when BotDiff has no value to show yet. */
  value: number | null;
  unit: string;
  direction: DirectionOfGood;
  trend: MetricTrend;
  /** Plain-language trend word: Improving / Declining / Stable / Changed / Not enough history. */
  trendLabel: string;
  previous: number | null;
  /** What `previous` represents, e.g. "vs your previous 5 games". */
  comparison: string;
  baseline: MetricReferenceLine | null;
  target: MetricReferenceLine | null;
  /** Compact honest note when no target can be defended. */
  targetNote: string | null;
  /** One short human sentence explaining the graph. */
  interpretation: string;
  points: MetricPoint[];
  /** e.g. "Your imported ranked games" or "Sample data". */
  sourceLabel?: string;
}

// --- formatting ------------------------------------------------------------

export function formatMetricValue(value: number | null, unit: string): string {
  if (value == null) return "—";
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  const n = rounded.toLocaleString();
  if (!unit) return n;
  return unit.startsWith("/") || unit.startsWith(":") ? `${n} ${unit}` : `${n}${unit}`;
}

export const TREND_LABELS: Record<MetricTrend, string> = {
  improving: "Improving",
  declining: "Declining",
  stable: "Stable",
  changed: "Changed",
  insufficient_data: "Not enough history",
};

export function trendTone(trend: MetricTrend): MetricTone {
  switch (trend) {
    case "improving":
      return "positive";
    case "declining":
      return "caution";
    case "stable":
    case "changed":
      return "neutral";
    default:
      return "muted";
  }
}

/** Arrow semantics: only when the metric has a defensible direction. */
export function trendArrow(reading: MetricReading): "up" | "down" | "flat" | null {
  if (reading.value == null || reading.previous == null) return null;
  if (reading.value === reading.previous) return "flat";
  return reading.value > reading.previous ? "up" : "down";
}

// --- classification --------------------------------------------------------

/**
 * Metrics BotDiff refuses to grade as simply higher/lower is better. A support
 * with high vision and an ADC with high vision mean different things, and more
 * damage is not automatically better play.
 */
const CONTEXTUAL_KEYS = new Set(["vision", "kp", "damage", "objective"]);

export function directionForMetric(key: string, higherIsBetter: boolean): DirectionOfGood {
  if (CONTEXTUAL_KEYS.has(key)) return "contextual";
  return higherIsBetter ? "higher" : "lower";
}

/**
 * Decide the semantic trend from two windows and the direction of good.
 * `minDelta` guards against calling noise a trend.
 */
export function classifyTrend(
  current: number | null,
  previous: number | null,
  direction: DirectionOfGood,
  minDelta: number,
): MetricTrend {
  if (current == null || previous == null) return "insufficient_data";
  const delta = current - previous;
  if (Math.abs(delta) < minDelta) return "stable";
  if (direction === "contextual") return "changed";
  const better = direction === "higher" ? delta > 0 : delta < 0;
  return better ? "improving" : "declining";
}

/** A sensible "this is just noise" threshold scaled to the metric's size. */
function noiseFloor(value: number): number {
  const size = Math.abs(value);
  if (size >= 500) return size * 0.03;
  if (size >= 50) return 1;
  if (size >= 5) return 0.3;
  return 0.15;
}

// --- adapters --------------------------------------------------------------

/** Convert an engine `TrendMetric` into the shared reading model. */
export function readingFromTrend(metric: TrendMetric, sourceLabel?: string): MetricReading {
  const direction = directionForMetric(metric.key, metric.higherIsBetter);
  const trend = classifyTrend(
    metric.current,
    metric.previous,
    direction,
    noiseFloor(metric.current),
  );
  const target: MetricReferenceLine | null =
    metric.target == null
      ? null
      : { value: metric.target, label: "Your best 5-game stretch", kind: "target" };
  const atBest =
    target != null &&
    (direction === "lower" ? metric.current <= target.value : metric.current >= target.value);

  return {
    key: metric.key,
    name: metric.label,
    value: metric.current,
    unit: metric.unit,
    direction,
    trend,
    trendLabel: TREND_LABELS[trend],
    previous: metric.previous,
    comparison:
      metric.previous == null
        ? "Not enough history for a comparison yet"
        : "vs your previous 5 games",
    baseline:
      metric.average === metric.current
        ? null
        : { value: metric.average, label: "Your recent average", kind: "baseline" },
    target: atBest ? null : target,
    targetNote:
      metric.target == null
        ? "Personal target unavailable — build 10+ imported games."
        : atBest
          ? "Currently at your best stretch."
          : null,
    interpretation: interpretTrend(metric.label, trend, direction, metric.previous, metric.unit),
    points: metric.points.map((p) => ({ index: p.i, value: p.value, label: `Game ${p.i + 1}` })),
    sourceLabel,
  };
}

function interpretTrend(
  name: string,
  trend: MetricTrend,
  direction: DirectionOfGood,
  previous: number | null,
  unit: string,
): string {
  const lower = name.toLowerCase();
  switch (trend) {
    case "improving":
      return `Your ${lower} is moving the right way across your recent games.`;
    case "declining":
      return `Your ${lower} has slipped compared with your previous 5 games${
        previous != null ? ` (${formatMetricValue(previous, unit)})` : ""
      }.`;
    case "stable":
      return `Your ${lower} has stayed close to your recent average.`;
    case "changed":
      return `Your ${lower} changed, but BotDiff won't call it better or worse without more evidence.`;
    default:
      return `Import more games to see how your ${lower} is trending.`;
  }
}

// --- BotDiff Behaviour Score ----------------------------------------------

export const BOTDIFF_SCORE_NAME = "BotDiff Behaviour Score";

/**
 * The main score reading. Current form = 5-game average, previous form = the
 * 5-game average before it. The target is the player's own best form; when the
 * current stretch IS their best, no target is shown.
 */
export function readingFromScore(score: BotDiffScore, sourceLabel?: string): MetricReading {
  const hasHistory = score.series.length > 0;
  const previous = score.series.length > 1 ? score.previous : null;
  const trend = hasHistory
    ? classifyTrend(score.current, previous, "higher", 1)
    : "insufficient_data";
  const atBest = score.current >= score.best;
  return {
    key: "botdiff-score",
    name: BOTDIFF_SCORE_NAME,
    value: hasHistory ? score.current : null,
    unit: "",
    direction: "higher",
    trend,
    trendLabel: TREND_LABELS[trend],
    previous,
    comparison: previous == null ? "Not enough history for a comparison yet" : "vs your previous 5 games",
    baseline: null,
    target: atBest ? null : { value: score.best, label: "Your best form", kind: "target" },
    targetNote: atBest ? "Current best stretch." : null,
    interpretation: atBest
      ? "You're currently performing at your best recent BotDiff Score level."
      : interpretTrend(BOTDIFF_SCORE_NAME, trend, "higher", previous, ""),
    points: score.series.map((s, i) => ({ index: i, value: s.score, label: `Game ${i + 1}` })),
    sourceLabel,
  };
}

/** Weekly / monthly change presented honestly — never a fake 0. */
export interface ScoreChangeReading {
  label: string;
  available: boolean;
  change: number;
  trend: MetricTrend;
  trendLabel: string;
  detail: string;
}

export function weeklyChangeReading(score: BotDiffScore): ScoreChangeReading {
  return changeReading("Weekly change", score.weeklyChangeAvailable, score.weeklyChange, 7);
}

export function monthlyChangeReading(score: BotDiffScore): ScoreChangeReading {
  return changeReading("Monthly change", score.monthlyChangeAvailable, score.monthlyChange, 30);
}

function changeReading(
  label: string,
  available: boolean,
  change: number,
  days: number,
): ScoreChangeReading {
  if (!available) {
    return {
      label,
      available: false,
      change: 0,
      trend: "insufficient_data",
      trendLabel: TREND_LABELS.insufficient_data,
      detail: `Needs games older than ${days} days.`,
    };
  }
  const trend = classifyTrend(change, 0, "higher", 1);
  return {
    label,
    available: true,
    change,
    trend,
    trendLabel: TREND_LABELS[trend],
    detail: `vs your form ${days} days ago`,
  };
}
