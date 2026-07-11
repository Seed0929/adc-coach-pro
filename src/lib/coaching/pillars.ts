// ---------------------------------------------------------------------------
// BotDiff Coaching Pillars
//
// The six pillars are the single taxonomy the entire product revolves around.
// Every coaching insight — dashboard, champion pages, match analysis, weekly
// reports, Quick Ask, and future AI coaching — belongs to one or more pillars.
//
// PURE + client-safe. No network, no secrets.
// ---------------------------------------------------------------------------

export type Pillar =
  | "lane"
  | "macro"
  | "teamfight"
  | "champion"
  | "consistency"
  | "decision";

export const PILLARS: Pillar[] = [
  "lane",
  "macro",
  "teamfight",
  "champion",
  "consistency",
  "decision",
];

export interface PillarMeta {
  key: Pillar;
  label: string;
  description: string;
}

export const PILLAR_META: Record<Pillar, PillarMeta> = {
  lane: {
    key: "lane",
    label: "Lane",
    description: "Trading, wave management, CS, recalls and the early gold/xp race.",
  },
  macro: {
    key: "macro",
    label: "Macro",
    description: "Objectives, map movement, vision and side-lane decisions.",
  },
  teamfight: {
    key: "teamfight",
    label: "Teamfighting",
    description: "Positioning, damage uptime, target priority and staying alive in fights.",
  },
  champion: {
    key: "champion",
    label: "Champion Mastery",
    description: "Champion pool depth, matchup knowledge and per-champion consistency.",
  },
  consistency: {
    key: "consistency",
    label: "Reliable Play",
    description: "Repeating your best games and raising the floor of your worst ones.",
  },
  decision: {
    key: "decision",
    label: "Decision Making",
    description: "Grouping timing, shutdown management and when to fight vs. farm.",
  },
};

/**
 * The internal `player-memory` engine tags patterns with finer-grained
 * categories. This maps each of those to one of the six public pillars so the
 * whole app can speak a single vocabulary.
 */
export function categoryToPillar(category: string): Pillar {
  switch (category) {
    case "lane":
    case "wave":
    case "farming":
      return "lane";
    case "objective":
    case "vision":
      return "macro";
    case "positioning":
    case "teamfight":
      return "teamfight";
    case "champion":
      return "champion";
    case "decision":
      return "decision";
    default:
      return "consistency";
  }
}

export type PillarGrade = "S" | "A" | "B" | "C" | "D";

export function scoreToGrade(score: number): PillarGrade {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 55) return "B";
  if (score >= 40) return "C";
  return "D";
}