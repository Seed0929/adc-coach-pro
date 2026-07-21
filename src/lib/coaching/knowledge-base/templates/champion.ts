// ---------------------------------------------------------------------------
// Champion Template — the SHAPE every champion record must satisfy.
//
// Generic + reusable. No champion-specific hardcoding. Data Dragon will
// populate these fields; the Coach Engine only READS from this template.
// ---------------------------------------------------------------------------
import type { GamePhase, KnowledgeSource, Pending, Rating } from "../types";

export type RoleId = "top" | "jungle" | "mid" | "adc" | "support";

export type ChampionClass =
  | "Marksman" | "Mage" | "Assassin" | "Fighter" | "Tank"
  | "Enchanter" | "Controller" | "Skirmisher" | "Diver"
  | "Juggernaut" | "Battlemage" | "Burst" | "Artillery"
  | "Warden" | "Vanguard" | "Catcher" | "Specialist" | "unknown";

export type ChampionSubclass = ChampionClass;
export type DamageType = "AD" | "AP" | "hybrid" | "true" | "unknown";
export type ScalingProfile = "early" | "mid" | "late" | "flat" | "unknown";

export interface ChampionPowerSpike {
  id: string;
  label: string;
  timing?: GamePhase;
  requirements?: string[];
}

/**
 * Structured, Data-Dragon-ready shape for a champion. Every field is optional
 * or Pending so records can be scaffolded before Riot data is wired up.
 */
export interface ChampionTemplate {
  id: string;
  name: string | Pending;
  primaryRole: RoleId | Pending;
  secondaryRole?: RoleId | Pending;
  championClass: ChampionClass | Pending;
  championSubclass?: ChampionSubclass | Pending;
  damageType: DamageType | Pending;
  scalingProfile: ScalingProfile | Pending;
  earlyGameRating: Rating | Pending;
  midGameRating: Rating | Pending;
  lateGameRating: Rating | Pending;
  identity?: string | Pending;
  primaryWinCondition?: string | Pending;
  secondaryWinCondition?: string | Pending;
  preferredTempo?: "aggressive" | "controlled" | "scaling" | "reactive" | Pending;
  powerSpikeProfile: ChampionPowerSpike[];
  /** Item categories this champion legitimately uses (e.g. "crit", "on-hit"). */
  supportedItemEcosystem: string[];
  /** Rune paths / categories that fit this champion. */
  supportedRuneEcosystem: string[];
  /** Summoner spell ids that make sense for this champion. */
  supportedSummonerSpells: string[];
  objectivePriorities: string[];
  lanePriorities: string[];
  commonStrengths: string[];
  commonWeaknesses: string[];
  source: KnowledgeSource;
}

export function emptyChampionTemplate(id: string): ChampionTemplate {
  return {
    id,
    name: "__pending__",
    primaryRole: "__pending__",
    championClass: "unknown",
    damageType: "unknown",
    scalingProfile: "unknown",
    earlyGameRating: "unknown",
    midGameRating: "unknown",
    lateGameRating: "unknown",
    powerSpikeProfile: [],
    supportedItemEcosystem: [],
    supportedRuneEcosystem: [],
    supportedSummonerSpells: [],
    objectivePriorities: [],
    lanePriorities: [],
    commonStrengths: [],
    commonWeaknesses: [],
    source: "curated",
  };
}