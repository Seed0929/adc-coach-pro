// ---------------------------------------------------------------------------
// Matchup Intelligence — factual archetype-vs-archetype relationships.
//
// Reasoning is archetype-level (never per-champion) so it scales to every
// current and future champion. Data Dragon / statistics later refine this.
// ---------------------------------------------------------------------------
import { getChampionProfile, type ChampionArchetype, type ChampionProfile } from "../champion-intelligence";

export type MatchupTendency = "favored" | "even" | "unfavored" | "unknown";

const REL: Partial<Record<ChampionArchetype, Partial<Record<ChampionArchetype, MatchupTendency>>>> = {
  "crit-marksman": {
    "lethality-marksman": "unfavored",
    "onhit-marksman": "even",
    "utility-marksman": "even",
    "hybrid-marksman": "even",
    "artillery-mage": "unfavored",
  },
  "onhit-marksman": {
    "crit-marksman": "even",
    "juggernaut": "favored",
    "warden-tank": "favored",
    "vanguard-tank": "favored",
  },
  "lethality-marksman": {
    "crit-marksman": "favored",
    "onhit-marksman": "favored",
    "warden-tank": "unfavored",
    "vanguard-tank": "unfavored",
  },
  "artillery-mage": {
    "crit-marksman": "favored",
    "assassin": "unfavored",
    "diver": "unfavored",
  },
  "burst-mage": {
    "utility-marksman": "favored",
    "assassin": "unfavored",
  },
  "assassin": {
    "burst-mage": "favored",
    "artillery-mage": "favored",
    "warden-tank": "unfavored",
  },
};

export function archetypeRelationship(a: ChampionArchetype, b: ChampionArchetype): MatchupTendency {
  return REL[a]?.[b] ?? "unknown";
}

export interface MatchupSummary {
  player: ChampionProfile;
  opponent: ChampionProfile;
  tendency: MatchupTendency;
  reason: string;
}

export function summarizeMatchup(playerName: string, opponentName: string): MatchupSummary {
  const player = getChampionProfile(playerName);
  const opponent = getChampionProfile(opponentName);
  const tendency = archetypeRelationship(player.archetype, opponent.archetype);
  const reason =
    tendency === "unknown"
      ? "No confident archetype relationship — treat as an even lane."
      : `${player.name} (${player.archetype}) is generally ${tendency} into ${opponent.name} (${opponent.archetype}).`;
  return { player, opponent, tendency, reason };
}
