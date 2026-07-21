import type { KnowledgeSource } from "../types";

export type MatchupAxis =
  | "range-advantage" | "scaling-advantage" | "wave-advantage"
  | "roaming-advantage" | "all-in-threat" | "objective-priority"
  | "lane-pressure";

export type MatchupInteraction =
  | "counter" | "even" | "skill-matchup" | "scaling" | "kite" | "burst" | "poke";

export interface MatchupAxisReading {
  axis: MatchupAxis;
  favors: "player" | "opponent" | "even";
  note?: string;
}

export interface MatchupTemplate {
  id: string;
  championId: string;
  opponentId: string;
  interaction: MatchupInteraction;
  axes: MatchupAxisReading[];
  keyThresholds: string[];
  source: KnowledgeSource;
}

export function emptyMatchupTemplate(championId: string, opponentId: string): MatchupTemplate {
  return {
    id: `${championId}_vs_${opponentId}`,
    championId, opponentId,
    interaction: "even",
    axes: [],
    keyThresholds: [],
    source: "curated",
  };
}