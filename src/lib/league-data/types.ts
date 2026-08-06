// ---------------------------------------------------------------------------
// League Data Providers — shared types (Sprint 4.4).
//
// These shapes describe RIOT FACTS ONLY. No coaching, no opinions, no
// recommendations. The Data Dragon provider is the single source of truth for
// champions, items, runes, summoner spells, assets and the patch version.
//
// Data Dragon supplies facts. BotDiff supplies understanding.
// ---------------------------------------------------------------------------

export type LeagueDataSource = "datadragon" | "cache" | "fallback";

/** Every provider result carries provenance so consumers can degrade safely. */
export interface LeagueDataResult<T> {
  data: T;
  /** Patch the data belongs to (e.g. "14.24.1"). */
  patch: string;
  source: LeagueDataSource;
  /** True when Riot services were unreachable and a fallback was used. */
  degraded: boolean;
  fetchedAt: string;
}

// --- raw Data Dragon payload shapes (subset we consume) --------------------

export interface DDImage {
  full: string;
  sprite?: string;
  group?: string;
}

export interface DDChampionSummary {
  id: string;
  key: string;
  name: string;
  title: string;
  tags: string[];
  partype: string;
  info?: { attack: number; defense: number; magic: number; difficulty: number };
  image?: DDImage;
  stats?: Record<string, number>;
}

export interface DDSpellPayload {
  id: string;
  name: string;
  description: string;
  tooltip?: string;
  maxrank?: number;
  cooldownBurn?: string;
  costBurn?: string;
  rangeBurn?: string;
  costType?: string;
  resource?: string;
  image?: DDImage;
}

export interface DDPassivePayload {
  name: string;
  description: string;
  image?: DDImage;
}

export interface DDChampionDetail extends DDChampionSummary {
  lore?: string;
  spells?: DDSpellPayload[];
  passive?: DDPassivePayload;
}

export interface DDItemPayload {
  name: string;
  description?: string;
  plaintext?: string;
  gold?: { total: number; base: number; sell: number; purchasable: boolean };
  tags?: string[];
  stats?: Record<string, number>;
  maps?: Record<string, boolean>;
  image?: DDImage;
  from?: string[];
  into?: string[];
  depth?: number;
}

export interface DDRunePayload {
  id: number;
  key: string;
  name: string;
  icon: string;
  shortDesc?: string;
  longDesc?: string;
}

export interface DDRuneTreePayload {
  id: number;
  key: string;
  name: string;
  icon: string;
  slots: { runes: DDRunePayload[] }[];
}

export interface DDSummonerSpellPayload {
  id: string;
  key: string;
  name: string;
  description: string;
  cooldownBurn?: string;
  summonerLevel?: number;
  modes?: string[];
  image?: DDImage;
}

// --- normalised repository shapes ------------------------------------------

export type OfficialRangeType = "melee" | "ranged" | "hybrid" | "unknown";

export type OfficialResourceType =
  | "mana" | "energy" | "fury" | "rage" | "health" | "shield" | "heat"
  | "flow" | "grit" | "ferocity" | "blood well" | "courage" | "none" | "unknown";

export interface ChampionAssets {
  square: string;
  splash: string;
  loading: string;
  centered: string;
  passiveIcon: string;
  abilityIcons: Record<string, string>;
}

export interface ChampionAbilityMeta {
  /** Slot key: "P" for passive, then "Q" | "W" | "E" | "R". */
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

/** Fully normalised, Riot-validated champion record. Facts only. */
export interface ChampionData {
  /** Data Dragon id, e.g. "Kaisa", "MonkeyKing". */
  id: string;
  /** Numeric Riot key as a string, e.g. "145". */
  key: string;
  name: string;
  title: string;
  /** Official Riot tags, e.g. ["Marksman", "Assassin"]. */
  tags: string[];
  /** Official Riot classes = the tag list, kept as a distinct accessor. */
  classes: string[];
  /** Official Riot `partype` normalised. */
  resourceType: OfficialResourceType;
  /** Derived strictly from Riot's `stats.attackrange` (no coaching judgement). */
  rangeType: OfficialRangeType;
  attackRange: number | null;
  info: { attack: number; defense: number; magic: number; difficulty: number } | null;
  stats: Record<string, number>;
  lore: string;
  passive: ChampionAbilityMeta | null;
  abilities: ChampionAbilityMeta[];
  assets: ChampionAssets;
  patch: string;
}

export interface ItemData {
  id: string;
  name: string;
  plaintext: string;
  description: string;
  tags: string[];
  stats: Record<string, number>;
  gold: { total: number; base: number; sell: number; purchasable: boolean };
  icon: string;
  from: string[];
  into: string[];
  depth: number;
  patch: string;
}

export interface RuneData {
  id: number;
  key: string;
  name: string;
  shortDesc: string;
  longDesc: string;
  icon: string;
  treeId: number;
  treeKey: string;
  treeName: string;
  /** 0 = keystone slot. */
  slot: number;
  patch: string;
}

export interface RuneTreeData {
  id: number;
  key: string;
  name: string;
  icon: string;
  keystones: RuneData[];
  runes: RuneData[];
  patch: string;
}

export interface SummonerSpellData {
  id: string;
  key: string;
  name: string;
  description: string;
  cooldown: string;
  icon: string;
  modes: string[];
  patch: string;
}

/** Snapshot of everything the provider currently holds. */
export interface LeagueDataSnapshot {
  patch: string;
  ready: boolean;
  degraded: boolean;
  champions: number;
  items: number;
  runes: number;
  summonerSpells: number;
  lastLoadedAt: string | null;
}