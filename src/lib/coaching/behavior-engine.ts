// ---------------------------------------------------------------------------
// BotDiff Behavior Engine
//
// BotDiff (not the AI) is responsible for DISCOVERING what the player does.
// This engine turns the detected patterns in a CoachDossier into structured,
// pillar-tagged behavioral observations — e.g. "Greedy recalls", "Late
// objective setup", "Strong teamfighting". The AI layer later EXPLAINS these;
// it never invents them.
//
// PURE + client-safe.
// ---------------------------------------------------------------------------
import type { CoachDossier, CoachPattern } from "../player-memory";
import { categoryToPillar, type Pillar } from "./pillars";

export interface BehaviorObservation {
  id: string;
  pillar: Pillar;
  kind: "strength" | "weakness";
  /** Short structured label, e.g. "Greedy recalls". */
  label: string;
  /** One-line plain-English description of the behaviour. */
  detail: string;
  /** Hard evidence: how often it shows up. */
  evidence: string;
  /** How habitual (0-1). */
  rate: number;
  streak: number;
}

// Maps the internal pattern ids to a crisp behaviour label.
const LABELS: Record<string, string> = {
  "lose-lane": "Loses the laning phase",
  "wave-recall": "Greedy recalls",
  "die-after-lead": "Throws early leads",
  "die-before-damage": "Dies before dealing damage",
  "low-participation": "Late to fights & objectives",
  "weak-objectives": "Late objective setup",
  "low-damage": "Low teamfight damage",
  "low-cs": "Inconsistent farming",
  "low-vision": "Weak vision control",
  "win-lane": "Strong lane trading",
  "disciplined": "Disciplined positioning",
  "present": "Strong fight presence",
  "objectives": "Strong objective control",
  "carry-damage": "Strong teamfighting",
  "clean-cs": "Excellent CS consistency",
};

function toObservation(p: CoachPattern, matches: number): BehaviorObservation {
  return {
    id: p.id,
    pillar: categoryToPillar(p.category),
    kind: p.kind,
    label: LABELS[p.id] ?? p.title,
    detail: p.detail,
    evidence: `Seen in ${p.count} of the last ${matches} games (${Math.round(
      p.rate * 100,
    )}%)${p.streak >= 3 ? `, incl. the last ${p.streak} in a row` : ""}.`,
    rate: p.rate,
    streak: p.streak,
  };
}

/** All structured behaviour observations, most-habitual first. */
export function buildBehaviorObservations(d: CoachDossier): BehaviorObservation[] {
  const all = [...d.weaknessPatterns, ...d.strengthPatterns];
  return all
    .map((p) => toObservation(p, d.matchesAnalyzed))
    .sort((a, b) => b.rate - a.rate || b.streak - a.streak);
}

/** Observations belonging to one or more pillars. */
export function observationsForPillars(
  d: CoachDossier,
  pillars: Pillar[],
): BehaviorObservation[] {
  const set = new Set(pillars);
  return buildBehaviorObservations(d).filter((o) => set.has(o.pillar));
}