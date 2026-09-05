// ---------------------------------------------------------------------------
// Graph integration contract (additive — no graph redesign here).
//
// A `MetricGraphCard` keeps working exactly as today. When an evidence-backed
// coaching target exists for the metric it is drawing, callers may enrich the
// existing `MetricReading` with `withCoachTarget()`, which swaps in a labelled
// target reference line. Without a target, the reading is returned untouched.
// ---------------------------------------------------------------------------
import type { MetricReading, MetricReferenceLine } from "@/lib/metrics/metric-reading";
import type { CoachingIntelligenceSnapshot, CoachingTarget, DataSufficiency } from "./types";
import { activeTargets } from "./targets";

export interface GraphCoachTarget {
  value: number;
  label: string;
  direction: "higher" | "lower";
  progress: number;
  sufficiency: DataSufficiency;
  reason: string;
}

/** The active target for a metric in a scope, if BotDiff has one. */
export function targetForMetric(
  snapshot: CoachingIntelligenceSnapshot,
  metric: string,
  scopeId = "player",
): CoachingTarget | null {
  return (
    activeTargets(snapshot).find((t) => t.metric === metric && t.scope.id === scopeId) ?? null
  );
}

export function toGraphTarget(target: CoachingTarget | null): GraphCoachTarget | null {
  if (!target) return null;
  return {
    value: target.targetValue,
    label: `Coach target ${target.targetValue}${target.unit}`,
    direction: target.direction,
    progress: target.progress,
    sufficiency: target.sufficiency,
    reason: target.evidence.reason,
  };
}

/**
 * Enrich an existing reading with a coach target line. Returns the SAME
 * reading when there is no evidence-supported target, so every graph keeps
 * functioning unchanged.
 */
export function withCoachTarget(
  reading: MetricReading,
  target: CoachingTarget | null,
): MetricReading {
  const graphTarget = toGraphTarget(target);
  if (!graphTarget) return reading;
  const line: MetricReferenceLine = {
    value: graphTarget.value,
    label: graphTarget.label,
    kind: "target",
  };
  return {
    ...reading,
    target: line,
    targetNote: `${graphTarget.progress}% of the way there — ${graphTarget.reason}`,
  };
}
