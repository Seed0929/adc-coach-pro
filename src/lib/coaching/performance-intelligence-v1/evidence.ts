// ---------------------------------------------------------------------------
// Evidence labeling + timestamp integrity.
//
// Four labels, never blurred:
//   OBSERVED  — directly present in reliable underlying data (Riot payloads).
//   DERIVED   — mathematically calculated from observed data.
//   INFERRED  — a reasonable interpretation that was not directly observed.
//   COACHING  — an actionable recommendation supported by available evidence.
//
// Timestamp rule: a time is shown ONLY when BotDiff holds event-level timing
// from Riot's match timeline for that exact observation. Estimated, defaulted
// or phase-anchored times are dropped — a truthful untimed observation beats
// false precision.
// ---------------------------------------------------------------------------
import type { ClaimKind } from "./types";

export type EvidenceLabel = "OBSERVED" | "DERIVED" | "INFERRED" | "COACHING";

export const EVIDENCE_LABEL_COPY: Record<EvidenceLabel, string> = {
  OBSERVED: "From your match data",
  DERIVED: "Calculated from your games",
  INFERRED: "BotDiff's read",
  COACHING: "Coaching recommendation",
};

export function labelForClaim(claim: ClaimKind): EvidenceLabel {
  switch (claim) {
    case "observed_fact": return "OBSERVED";
    case "calculated_trend": return "DERIVED";
    case "supported_inference": return "INFERRED";
    case "coaching_recommendation": return "COACHING";
  }
}

/** Where a timing value came from. Only `riot_timeline` may be displayed. */
export type TimingSource = "riot_timeline" | "estimated" | "none";

export interface TimedObservation {
  statement: string;
  timestampSeconds: number | null;
  timingSource: TimingSource;
}

export function isDisplayableTiming(
  timingSource: TimingSource,
  timestampSeconds: number | null | undefined,
): boolean {
  return (
    timingSource === "riot_timeline" &&
    typeof timestampSeconds === "number" &&
    Number.isFinite(timestampSeconds) &&
    timestampSeconds > 0
  );
}

export function formatGameClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** The clock string to render, or null when timing is not reliably known. */
export function displayTimestamp(o: {
  timingSource: TimingSource;
  timestampSeconds: number | null | undefined;
}): string | null {
  return isDisplayableTiming(o.timingSource, o.timestampSeconds)
    ? formatGameClock(o.timestampSeconds as number)
    : null;
}

// Approximate / placeholder time phrasings that must never reach the player.
const APPROX_TIME_PATTERNS: RegExp[] = [
  /\s*\(?~\s*\d{1,2}:\d{2}\)?/g,
  /\s*\baround\s+\d{1,2}:\d{2}\b/gi,
  /\s*\bapprox(?:\.|imately)?\s+\d{1,2}:\d{2}\b/gi,
  /\s*\bat about\s+\d{1,2}:\d{2}\b/gi,
];

/**
 * Strip unsupported time references from a statement. Used when the underlying
 * timing is estimated rather than timeline-sourced.
 */
export function stripUnsupportedTime(statement: string): string {
  let out = statement;
  for (const re of APPROX_TIME_PATTERNS) out = out.replace(re, "");
  // A remaining bare clock with no timeline backing is also unsupported.
  out = out.replace(/\s*\bat\s+\d{1,2}:\d{2}\b/gi, "");
  return out.replace(/\s{2,}/g, " ").replace(/\s+([.,;])/g, "$1").trim();
}

/** True when a statement claims an exact time. */
export function containsTimestamp(statement: string): boolean {
  return /\d{1,2}:\d{2}/.test(statement);
}

/**
 * Normalize an observation so its text and its timing agree: timeline-sourced
 * timings keep their clock, everything else loses it.
 */
export function normalizeTimedObservation(o: TimedObservation): TimedObservation {
  if (isDisplayableTiming(o.timingSource, o.timestampSeconds)) return o;
  return {
    statement: stripUnsupportedTime(o.statement),
    timestampSeconds: null,
    timingSource: "none",
  };
}
