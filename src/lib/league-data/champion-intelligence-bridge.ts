// ---------------------------------------------------------------------------
// Data Dragon → Champion Intelligence bridge.
//
//   League Data Providers → Data Dragon Provider → [this bridge]
//   → Champion Intelligence → Coach Engine
//
// This is the ONLY place where Riot facts enter the coaching architecture.
// It maps validated Data Dragon records onto the permanent ChampionProfileV1
// shape and registers them. It does NOT calculate coaching, generate builds,
// or create recommendations — every coaching field stays exactly as the
// coaching layers defined it (placeholder / curated).
// ---------------------------------------------------------------------------
import {
  emptyChampionProfileV1,
  type ChampionOfficialAbility,
  type ChampionOfficialMetadata,
  type ChampionProfileV1,
  type ChampionRangeType,
  type ChampionResourceType,
} from "../coaching/champion-intelligence-v1/types";
import {
  rawChampionProfile,
  registerChampionProfiles,
} from "../coaching/champion-intelligence-v1/registry";
import type { RoleId } from "../coaching/knowledge-base/templates/champion";
import { allChampions, currentPatch, loadLeagueData, resolveChampion } from "./provider";
import type { ChampionAbilityMeta, ChampionData } from "./types";

/** Riot's official tag → the lane(s) Riot itself associates with that tag. */
const TAG_ROLES: Record<string, RoleId[]> = {
  Marksman: ["adc"],
  Mage: ["mid"],
  Assassin: ["mid"],
  Fighter: ["top"],
  Tank: ["top"],
  Support: ["support"],
};

function officialRoles(tags: string[]): RoleId[] {
  const roles = new Set<RoleId>();
  for (const tag of tags) for (const r of TAG_ROLES[tag] ?? []) roles.add(r);
  return Array.from(roles);
}

function ability(meta: ChampionAbilityMeta): ChampionOfficialAbility {
  return { ...meta };
}

function toOfficial(champ: ChampionData): ChampionOfficialMetadata {
  return {
    dataDragonId: champ.id,
    key: champ.key,
    name: champ.name,
    title: champ.title,
    lore: champ.lore,
    officialTags: champ.tags,
    officialClasses: champ.classes,
    officialRoles: officialRoles(champ.tags),
    officialResourceType: champ.resourceType as ChampionResourceType,
    officialRangeType: champ.rangeType as ChampionRangeType,
    attackRange: champ.attackRange,
    stats: champ.stats,
    info: champ.info,
    passive: champ.passive ? ability(champ.passive) : null,
    abilities: champ.abilities.map(ability),
    assets: champ.assets,
    patch: champ.patch,
  };
}

/**
 * Merge Riot facts into an existing (or placeholder) ChampionProfileV1.
 * Coaching fields are never overwritten — only factual metadata is filled in.
 */
export function toChampionProfile(champ: ChampionData): ChampionProfileV1 {
  const existing = rawChampionProfile(champ.id);
  const base = existing ?? emptyChampionProfileV1(champ.id);
  const official = toOfficial(champ);
  const primaryRole =
    base.primaryRole !== "__pending__" ? base.primaryRole : official.officialRoles[0] ?? "__pending__";
  return {
    ...base,
    championId: champ.id,
    championName: champ.name,
    primaryRole,
    secondaryRoles:
      base.secondaryRoles.length > 0
        ? base.secondaryRoles
        : official.officialRoles.filter((r) => r !== primaryRole),
    // Riot's own tag is authoritative for class; coaching taxonomies stay put.
    championClass:
      base.championClass !== "unknown" && base.championClass !== "__pending__"
        ? base.championClass
        : ((champ.tags[0] as ChampionProfileV1["championClass"]) ?? "unknown"),
    rangeType: official.officialRangeType,
    resourceType: official.officialResourceType,
    official,
    source: "datadragon",
    patch: official.patch,
    // `populated` still means "coaching content exists", so it is untouched
    // unless a curated record already set it.
    populated: base.populated,
  };
}

export interface HydrationResult {
  hydrated: boolean;
  patch: string;
  champions: number;
  degraded: boolean;
}

/**
 * Load Data Dragon and push validated champion facts into the Champion
 * Intelligence registry. Idempotent and safe to call repeatedly; when Riot is
 * unavailable it returns `hydrated: false` and the coaching architecture keeps
 * running on Role Intelligence exactly as before.
 */
export async function hydrateChampionIntelligenceFromDataDragon(): Promise<HydrationResult> {
  const snap = await loadLeagueData();
  const champions = allChampions();
  if (champions.length === 0) {
    return { hydrated: false, patch: snap.patch, champions: 0, degraded: true };
  }
  registerChampionProfiles(champions.map(toChampionProfile));
  return {
    hydrated: true,
    patch: snap.patch,
    champions: champions.length,
    degraded: snap.degraded,
  };
}

/** Hydrate a single champion (used when a page only needs one profile). */
export async function hydrateChampion(idOrName: string | number): Promise<ChampionProfileV1 | null> {
  await loadLeagueData();
  const champ = resolveChampion(idOrName);
  if (!champ) return null;
  const profile = toChampionProfile(champ);
  registerChampionProfiles([profile]);
  return profile;
}

export function hydrationPatch(): string {
  return currentPatch();
}