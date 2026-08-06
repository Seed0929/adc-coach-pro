// ---------------------------------------------------------------------------
// Champion Intelligence Framework V1 — permanent interfaces ONLY.
//
//   League Intelligence → Curriculum → Role Intelligence → Decision Library
//   → Pipeline → Prioritization → Unified Context → Habits → Player Memory
//   → (this layer, OPTIONAL)
//
// Champion Intelligence is an OPTIONAL enrichment lens over Role Intelligence.
// Every field is placeholder-capable (`Pending`) so Riot Data Dragon can later
// become a pure data source without touching any coaching module.
//
// No champion data is populated here. No Riot API calls. No statistics.
// Pure + client-safe. Facts and references only — never player evaluation.
// ---------------------------------------------------------------------------
import type { GamePhase, KnowledgeSource, Pending, Rating } from "../knowledge-base/types";
import type { LeagueFundamentalId } from "../knowledge-base/fundamentals";
import type { CurriculumTopicId } from "../knowledge-base/curriculum";
import type { RoleId } from "../knowledge-base/templates/champion";

export type ChampionRangeType = "melee" | "ranged" | "hybrid" | "unknown";

export type ChampionResourceType =
  | "mana"
  | "energy"
  | "fury"
  | "rage"
  | "health"
  | "shield"
  | "heat"
  | "flow"
  | "grit"
  | "ferocity"
  | "none"
  | "unknown";

export type ChampionClassId =
  | "Marksman" | "Mage" | "Assassin" | "Fighter" | "Tank" | "Support" | "unknown";

export type ChampionDamageProfile = "AD" | "AP" | "hybrid" | "true" | "unknown";
export type ChampionScalingProfile = "early" | "mid" | "late" | "flat" | "unknown";

/** A named identity for one phase of the game. */
export interface ChampionPhaseIdentity {
  phase: GamePhase;
  identity: string | Pending;
  rating: Rating | Pending;
  notes: string[];
}

/** Reference into the permanent power-spike layer (never a hardcoded stat). */
export interface ChampionPowerSpikeReference {
  id: string;
  label: string | Pending;
  timing?: GamePhase;
  /** Item / level / ability requirements, hydrated by Data Dragon later. */
  requirements: string[];
}

/** Reference into the League Coaching Curriculum. */
export interface ChampionCurriculumReference {
  topic: CurriculumTopicId;
  emphasis: "primary" | "secondary" | "situational";
  note: string | Pending;
}

/** Reference into the League Decision Library, optionally re-weighted. */
export interface ChampionDecisionReference {
  decisionId: string;
  /** Multiplier applied on top of the library priority. 1 = unchanged. */
  weightMultiplier: number;
  note: string | Pending;
}

/** Champion-level override of a Role Intelligence expectation. */
export interface ChampionRoleOverride {
  role: RoleId;
  fundamental?: LeagueFundamentalId;
  /** What the role normally expects. */
  roleExpectation: string | Pending;
  /** How this champion deviates from it. */
  championExpression: string | Pending;
}

/** A behavioral tendency (wave, recall, vision, roam, ...). */
export interface ChampionTendency {
  fundamental: LeagueFundamentalId;
  tendency: string | Pending;
  reason: string | Pending;
}

export interface ChampionCoachingPoint {
  label: string | Pending;
  fundamental: LeagueFundamentalId;
  /** Optional decision-library anchor so coaching stays de-duplicated. */
  decisionId?: string;
  explanation: string | Pending;
}

export interface ChampionPracticeFocus {
  label: string | Pending;
  fundamental: LeagueFundamentalId;
  measurable: string | Pending;
}

/** Official Riot ability metadata (facts only — supplied by Data Dragon). */
export interface ChampionOfficialAbility {
  slot: "P" | "Q" | "W" | "E" | "R";
  id: string;
  name: string;
  description: string;
  icon: string;
  maxRank?: number;
  cooldown?: string;
  cost?: string;
  range?: string;
  resource?: string;
}

/** Riot-provided visual assets for a champion. */
export interface ChampionVisualAssets {
  square: string;
  splash: string;
  loading: string;
  centered: string;
  passiveIcon: string;
  abilityIcons: Record<string, string>;
}

/**
 * Validated Riot facts attached to a ChampionProfile by the Data Dragon
 * provider. Present only when the provider has hydrated the champion; the
 * coaching layers treat it as OPTIONAL enrichment, exactly like the rest of
 * Champion Intelligence.
 */
export interface ChampionOfficialMetadata {
  /** Data Dragon id, e.g. "Kaisa". */
  dataDragonId: string;
  /** Numeric Riot key. */
  key: string;
  name: string;
  title: string;
  lore: string;
  officialTags: string[];
  officialClasses: string[];
  officialRoles: RoleId[];
  officialResourceType: ChampionResourceType;
  officialRangeType: ChampionRangeType;
  attackRange: number | null;
  stats: Record<string, number>;
  info: { attack: number; defense: number; magic: number; difficulty: number } | null;
  passive: ChampionOfficialAbility | null;
  abilities: ChampionOfficialAbility[];
  assets: ChampionVisualAssets;
  /** Riot patch these facts came from. */
  patch: string;
}

/**
 * The permanent ChampionProfile shape. Data Dragon populates it later; until
 * then `emptyChampionProfileV1()` yields a fully valid placeholder record.
 */
export interface ChampionProfileV1 {
  championId: string;
  championName: string | Pending;
  primaryRole: RoleId | Pending;
  secondaryRoles: RoleId[];
  championClass: ChampionClassId | Pending;
  damageProfile: ChampionDamageProfile | Pending;
  rangeType: ChampionRangeType | Pending;
  resourceType: ChampionResourceType | Pending;
  scalingProfile: ChampionScalingProfile | Pending;
  earlyGameIdentity: ChampionPhaseIdentity;
  midGameIdentity: ChampionPhaseIdentity;
  lateGameIdentity: ChampionPhaseIdentity;
  winConditions: string[];
  loseConditions: string[];
  teamfightIdentity: string | Pending;
  laneIdentity: string | Pending;
  sideLaneIdentity: string | Pending;
  objectiveStrengths: string[];
  waveManagementTendencies: ChampionTendency[];
  recallTendencies: ChampionTendency[];
  visionTendencies: ChampionTendency[];
  roamingTendencies: ChampionTendency[];
  economyPriorities: string[];
  powerSpikeReferences: ChampionPowerSpikeReference[];
  commonMistakes: ChampionCoachingPoint[];
  commonStrengths: ChampionCoachingPoint[];
  curriculumReferences: ChampionCurriculumReference[];
  decisionLibraryReferences: ChampionDecisionReference[];
  roleOverrides: ChampionRoleOverride[];
  practiceFocus: ChampionPracticeFocus[];
  /** Riot-validated facts from the Data Dragon provider (OPTIONAL). */
  official?: ChampionOfficialMetadata;
  /** Provenance so `curated` → `datadragon` is a data change, not a code one. */
  source: KnowledgeSource;
  patch?: string;
  /** False until Data Dragon (or a curator) fills this record in. */
  populated: boolean;
}

function phase(p: GamePhase): ChampionPhaseIdentity {
  return { phase: p, identity: "__pending__", rating: "unknown", notes: [] };
}

/** A valid, placeholder-only profile. Never throws, never invents data. */
export function emptyChampionProfileV1(championId: string): ChampionProfileV1 {
  return {
    championId,
    championName: "__pending__",
    primaryRole: "__pending__",
    secondaryRoles: [],
    championClass: "unknown",
    damageProfile: "unknown",
    rangeType: "unknown",
    resourceType: "unknown",
    scalingProfile: "unknown",
    earlyGameIdentity: phase("early"),
    midGameIdentity: phase("mid"),
    lateGameIdentity: phase("late"),
    winConditions: [],
    loseConditions: [],
    teamfightIdentity: "__pending__",
    laneIdentity: "__pending__",
    sideLaneIdentity: "__pending__",
    objectiveStrengths: [],
    waveManagementTendencies: [],
    recallTendencies: [],
    visionTendencies: [],
    roamingTendencies: [],
    economyPriorities: [],
    powerSpikeReferences: [],
    commonMistakes: [],
    commonStrengths: [],
    curriculumReferences: [],
    decisionLibraryReferences: [],
    roleOverrides: [],
    practiceFocus: [],
    source: "curated",
    populated: false,
  };
}

/**
 * What a consumer gets back from every API: the resolved champion view plus
 * the role fallback that produced it, and whether champion data existed.
 */
export interface ChampionResolution<T> {
  championId: string;
  role: RoleId;
  /** True when the value came from a populated champion record. */
  fromChampion: boolean;
  value: T;
}