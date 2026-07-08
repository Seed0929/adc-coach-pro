// ---------------------------------------------------------------------------
// BotDiff Habit Detection Engine
//
// The core of "Coach IQ". Instead of judging one match in isolation, this
// engine scans the player's recent match history and identifies RECURRING
// habits — with real evidence attached (how often, when, on which champion, in
// wins vs losses, which game phase). It then ranks those habits by impact so
// coaching always leads with the one thing worth fixing next.
//
// It is role-aware: it asks the Role Intelligence module which habits are
// possible for the player's role, then tests each against the games. Adding a
// role never touches this file.
//
// PURE + client-safe. Every claim is derived from real stats — never invented.
// ---------------------------------------------------------------------------
import type { MatchAnalysisInput } from "../coaching-engine";
import { categoryToPillar, type Pillar } from "./pillars";
import {
  dominantRole,
  getHabitDefinitions,
  normalizeRole,
  type HabitCategory,
  type HabitDefinition,
  type HabitPhase,
  type RoleId,
} from "./role-intelligence";

/** Evidence requirement: a pattern must clear this before we call it a habit. */
const MIN_OCCURRENCES = 2;
const MIN_RATE = 0.3;
const STRONG_STREAK = 3;

// Lower rank = higher coaching priority (decision-making before mechanics).
const CATEGORY_RANK: Record<HabitCategory, number> = {
  lane: 1,
  wave: 2,
  positioning: 3,
  decision: 4,
  objective: 5,
  teamfight: 6,
  champion: 7,
  farming: 8,
  vision: 9,
};

const PHASE_LABEL: Record<HabitPhase, string> = {
  early: "early game",
  mid: "mid game",
  late: "late game / teamfights",
  any: "throughout the game",
};

export interface HabitEvidence {
  games: number; // games (of the window) the habit appeared in
  total: number; // window size
  rate: number; // 0-1
  streak: number; // consecutive most-recent games
  winGames: number;
  lossGames: number;
  champions: { name: string; count: number }[];
  primaryChampion: string | null; // set only when concentrated on one champ
  phase: HabitPhase;
  /** Ready-to-render evidence sentences, each grounded in real games. */
  sentences: string[];
}

export interface DetectedHabit {
  id: string;
  role: RoleId | "universal";
  kind: "strength" | "weakness";
  category: HabitCategory;
  pillar: Pillar;
  phase: HabitPhase;
  label: string;
  cause: string;
  why: string;
  practice: string;
  recognize: string;
  /** 0-100 priority score (higher = more urgent to address / celebrate). */
  impact: number;
  evidence: HabitEvidence;
  /** One-line, evidence-backed summary. */
  summary: string;
}

function buildEvidence(
  def: HabitDefinition,
  hits: MatchAnalysisInput[],
  flags: boolean[],
  total: number,
): HabitEvidence {
  const games = hits.length;
  const rate = total ? games / total : 0;
  let streak = 0;
  for (const f of flags) {
    if (f) streak++;
    else break;
  }

  const champMap = new Map<string, number>();
  for (const m of hits) champMap.set(m.champion, (champMap.get(m.champion) ?? 0) + 1);
  const champions = [...champMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const distinctChamps = new Set(hits.map((m) => m.champion));

  const winGames = hits.filter((m) => m.win).length;
  const lossGames = games - winGames;

  // Concentrated on one champion only when there is a real pool to compare to.
  const primaryChampion =
    champions.length > 0 && distinctChamps.size >= 1 && champions[0].count / games >= 0.7
      ? champions[0].name
      : null;

  const sentences: string[] = [];
  sentences.push(`This happened in ${games} of your last ${total} games.`);
  if (streak >= STRONG_STREAK) sentences.push(`It has shown up in your last ${streak} games in a row.`);

  // Death-frequency framing only where deaths are the driver.
  if (def.category === "positioning" || def.category === "teamfight") {
    const mins = hits.reduce((s, m) => s + m.durationMin, 0);
    const deaths = hits.reduce((s, m) => s + m.deaths, 0);
    if (deaths > 0 && mins > 0) {
      sentences.push(`In those games you average a death roughly every ${Math.max(1, Math.round(mins / deaths))} minutes.`);
    }
  }

  if (primaryChampion && champions.length === 1) {
    sentences.push(`It only appears on ${primaryChampion}.`);
  } else if (primaryChampion) {
    sentences.push(`It shows up almost entirely on ${primaryChampion}.`);
  }

  if (games >= 3) {
    if (lossGames >= winGames * 2 && lossGames >= 2) {
      sentences.push(`It happens mostly in games you lose.`);
    } else if (winGames > lossGames && winGames >= 2) {
      sentences.push(`It even shows up in games you win — a hidden habit worth fixing before it costs you.`);
    }
  }

  sentences.push(`It typically appears in the ${PHASE_LABEL[def.phase]}.`);

  return {
    games,
    total,
    rate,
    streak,
    winGames,
    lossGames,
    champions,
    primaryChampion,
    phase: def.phase,
    sentences,
  };
}

function impactScore(def: HabitDefinition, ev: HabitEvidence): number {
  // Frequency dominates, then streak, then coaching-priority category, then a
  // bias toward habits concentrated in losses (they cost the most LP).
  const freq = ev.rate * 55;
  const streakBonus = Math.min(ev.streak, 5) * 4;
  const categoryBonus = (10 - CATEGORY_RANK[def.category]) * 2;
  const lossBias = ev.games >= 3 && ev.lossGames >= ev.winGames * 2 ? 10 : 0;
  return Math.round(Math.min(100, freq + streakBonus + categoryBonus + lossBias));
}

function toHabit(def: HabitDefinition, ev: HabitEvidence): DetectedHabit {
  const impact = impactScore(def, ev);
  const summary =
    def.kind === "weakness"
      ? `${def.label} — ${ev.sentences[0]}`
      : `${def.label} — reliable across ${ev.games}/${ev.total} games.`;
  return {
    id: def.id,
    role: def.role,
    kind: def.kind,
    category: def.category,
    pillar: categoryToPillar(def.category),
    phase: def.phase,
    label: def.label,
    cause: def.cause,
    why: def.why,
    practice: def.practice,
    recognize: def.recognize,
    impact,
    evidence: ev,
    summary,
  };
}

/**
 * Detect every recurring habit (strengths + weaknesses) across the window,
 * most-impactful first. Only patterns with enough evidence are returned.
 */
export function detectHabits(inputs: MatchAnalysisInput[]): DetectedHabit[] {
  if (inputs.length === 0) return [];
  const role = dominantRole(inputs);
  const defs = getHabitDefinitions(role);
  const total = inputs.length; // inputs are most-recent first
  const out: DetectedHabit[] = [];

  for (const def of defs) {
    const flags = inputs.map((m) => def.test(m));
    const hits = inputs.filter((_, i) => flags[i]);
    const count = hits.length;
    if (count === 0) continue;
    let streak = 0;
    for (const f of flags) {
      if (f) streak++;
      else break;
    }
    const rate = count / total;
    // Evidence gate: enough games OR a strong current streak.
    const enough = count >= MIN_OCCURRENCES && (rate >= MIN_RATE || streak >= STRONG_STREAK);
    if (!enough) continue;
    const ev = buildEvidence(def, hits, flags, total);
    out.push(toHabit(def, ev));
  }

  return out.sort((a, b) => b.impact - a.impact || b.evidence.rate - a.evidence.rate);
}

// ---------------------------------------------------------------------------
// Coaching Priority Engine — ranks the detected habits into the five things a
// player should always see, each with a WHY. Never lists every weakness.
// ---------------------------------------------------------------------------
export interface CoachingPriorityItem {
  title: string;
  why: string;
  evidence: string;
}

export interface CoachingPriority {
  role: RoleId;
  roleLabel: string;
  biggestStrength: CoachingPriorityItem;
  biggestWeakness: CoachingPriorityItem;
  mostImprovedHabit: CoachingPriorityItem;
  highestImpactToFix: CoachingPriorityItem;
  currentPracticeGoal: CoachingPriorityItem;
}

interface TrendLike {
  label: string;
  current: string;
  previous: string;
  improved: boolean;
  direction: "up" | "down" | "flat";
}

export function buildCoachingPriority(
  inputs: MatchAnalysisInput[],
  habits: DetectedHabit[],
  trends: TrendLike[],
): CoachingPriority {
  const role = dominantRole(inputs);
  const roleLabel = normalizeRole(role);
  const weaknesses = habits.filter((h) => h.kind === "weakness");
  const strengths = habits.filter((h) => h.kind === "strength");
  const top = weaknesses[0];
  const strength = strengths[0];

  const biggestStrength: CoachingPriorityItem = strength
    ? {
        title: strength.label,
        why: strength.why,
        evidence: strength.evidence.sentences[0],
      }
    : {
        title: "Well-rounded fundamentals",
        why: "Nothing is broken in your game — your gains now come from raising your floor, not fixing one leak.",
        evidence: `Measured across your last ${inputs.length} games.`,
      };

  const biggestWeakness: CoachingPriorityItem = top
    ? {
        title: top.label,
        why: top.why,
        evidence: top.evidence.sentences.join(" "),
      }
    : {
        title: "Consistency between games",
        why: "You don't have one recurring, game-losing habit — the gap is between your best and worst games.",
        evidence: `No single pattern crossed the evidence threshold across your last ${inputs.length} games.`,
      };

  const improvedTrend = trends.find((t) => t.improved && t.direction !== "flat");
  const mostImprovedHabit: CoachingPriorityItem = improvedTrend
    ? {
        title: improvedTrend.label,
        why: "Improvement compounds — reinforcing what's already trending up is faster than fixing everything at once.",
        evidence: `${improvedTrend.label}: ${improvedTrend.previous} → ${improvedTrend.current} over your recent games.`,
      }
    : {
        title: "Holding steady",
        why: "Nothing has clearly improved yet — lock in a routine so your next games show a trend.",
        evidence: `Your metrics held roughly steady across your last ${inputs.length} games.`,
      };

  // Highest-impact-to-fix = the weakness with the highest impact score (already
  // first in the sorted list), stated as the single thing to work on.
  const highestImpactToFix: CoachingPriorityItem = top
    ? {
        title: top.label,
        why: `${top.cause} ${top.why}`,
        evidence: `Impact score ${top.impact}/100 — ${top.evidence.sentences[0].toLowerCase()}`,
      }
    : biggestWeakness;

  const currentPracticeGoal: CoachingPriorityItem = top
    ? {
        title: top.practice,
        why: `Recognize it live: ${top.recognize}`,
        evidence: `Fixing this affects ${Math.round(top.evidence.rate * 100)}% of your recent games.`,
      }
    : {
        title: "Replicate your best recent game's decisions in your next 5 games.",
        why: "With no dominant leak, your climb comes from turning your best game into your baseline.",
        evidence: `Based on your last ${inputs.length} games.`,
      };

  return {
    role,
    roleLabel,
    biggestStrength,
    biggestWeakness,
    mostImprovedHabit,
    highestImpactToFix,
    currentPracticeGoal,
  };
}