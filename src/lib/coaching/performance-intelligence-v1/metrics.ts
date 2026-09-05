// ---------------------------------------------------------------------------
// Coachable metric registry.
//
// Metric keys and semantic direction are shared with the graph metric model
// (`directionForMetric`) so BotDiff never runs two competing trend systems.
// A metric whose direction is "contextual" is MONITORED but never turned into
// a coaching target: BotDiff cannot claim more vision or more damage is better
// play without match-specific evidence.
// ---------------------------------------------------------------------------
import { directionForMetric, type DirectionOfGood } from "@/lib/metrics/metric-reading";
import type { ProfileMatch } from "@/lib/profile-engine";

export interface CoachableMetricDef {
  key: string;
  name: string;
  unit: string;
  higherIsBetter: boolean;
  get: (m: ProfileMatch) => number;
  /** Smallest change BotDiff will treat as real rather than noise. */
  noiseFloor: number;
  /** Decimal places used when rounding target/baseline values. */
  precision: 0 | 1;
}

export const COACHABLE_METRICS: CoachableMetricDef[] = [
  { key: "cs", name: "CS / min", unit: "/min", higherIsBetter: true, get: (m) => m.csPerMin, noiseFloor: 0.15, precision: 1 },
  { key: "deaths", name: "Deaths", unit: "/game", higherIsBetter: false, get: (m) => m.deaths, noiseFloor: 0.3, precision: 1 },
  { key: "gold", name: "Gold / min", unit: "/min", higherIsBetter: true, get: (m) => m.goldPerMin, noiseFloor: 15, precision: 0 },
  { key: "kda", name: "KDA", unit: ": 1", higherIsBetter: true, get: (m) => m.kda, noiseFloor: 0.2, precision: 1 },
  // Contextual metrics — monitored, never targeted.
  { key: "vision", name: "Vision Score", unit: "", higherIsBetter: true, get: (m) => m.visionScore, noiseFloor: 1, precision: 0 },
  { key: "kp", name: "Kill Participation", unit: "%", higherIsBetter: true, get: (m) => m.killParticipation * 100, noiseFloor: 2, precision: 0 },
  { key: "damage", name: "Damage / min", unit: "/min", higherIsBetter: true, get: (m) => m.damagePerMin, noiseFloor: 25, precision: 0 },
  { key: "objective", name: "Objective Takedowns", unit: "/game", higherIsBetter: true, get: (m) => m.objectiveTakedowns, noiseFloor: 0.3, precision: 1 },
];

export function metricDirection(def: CoachableMetricDef): DirectionOfGood {
  return directionForMetric(def.key, def.higherIsBetter);
}

/** Only metrics with a defensible direction of good can carry a target. */
export function isCoachable(def: CoachableMetricDef): boolean {
  return metricDirection(def) !== "contextual";
}

export function findMetric(key: string): CoachableMetricDef | undefined {
  return COACHABLE_METRICS.find((m) => m.key === key);
}

export function roundMetric(value: number, precision: 0 | 1): number {
  const f = precision === 0 ? 1 : 10;
  return Math.round(value * f) / f;
}
