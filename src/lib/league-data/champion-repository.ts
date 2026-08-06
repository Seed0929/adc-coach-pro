// ---------------------------------------------------------------------------
// ChampionRepository — Riot-validated champion facts.
//
// Champions, classes, tags, resource type, range type, passive, abilities,
// ability metadata, images. No coaching, no builds, no evaluation.
// ---------------------------------------------------------------------------
import {
  allChampions,
  currentPatch,
  loadChampionDetail,
  loadLeagueData,
  resolveChampion,
} from "./provider";
import type { ChampionAbilityMeta, ChampionAssets, ChampionData } from "./types";

export function getChampion(idOrName: string | number): ChampionData | null {
  return resolveChampion(idOrName);
}

export async function ensureChampion(idOrName: string | number): Promise<ChampionData | null> {
  await loadLeagueData();
  const found = resolveChampion(idOrName);
  return found ? loadChampionDetail(found.id) : null;
}

/** Official Riot tags, e.g. ["Marksman", "Assassin"]. */
export function getTags(idOrName: string | number): string[] {
  return resolveChampion(idOrName)?.tags ?? [];
}

/** Official Riot classes (Riot exposes these as the same tag list). */
export function getClasses(idOrName: string | number): string[] {
  return resolveChampion(idOrName)?.classes ?? [];
}

export function getResourceType(idOrName: string | number) {
  return resolveChampion(idOrName)?.resourceType ?? "unknown";
}

export function getRangeType(idOrName: string | number) {
  return resolveChampion(idOrName)?.rangeType ?? "unknown";
}

export function getPassive(idOrName: string | number): ChampionAbilityMeta | null {
  return resolveChampion(idOrName)?.passive ?? null;
}

export function getAbilities(idOrName: string | number): ChampionAbilityMeta[] {
  return resolveChampion(idOrName)?.abilities ?? [];
}

export function getAbility(
  idOrName: string | number,
  slot: "P" | "Q" | "W" | "E" | "R",
): ChampionAbilityMeta | null {
  const champ = resolveChampion(idOrName);
  if (!champ) return null;
  if (slot === "P") return champ.passive;
  return champ.abilities.find((a) => a.slot === slot) ?? null;
}

export function getAssets(idOrName: string | number): ChampionAssets | null {
  return resolveChampion(idOrName)?.assets ?? null;
}

export function getStats(idOrName: string | number): Record<string, number> {
  return resolveChampion(idOrName)?.stats ?? {};
}

/** Every champion carrying a given official Riot tag. */
export function byTag(tag: string): ChampionData[] {
  const needle = tag.toLowerCase();
  return allChampions().filter((c) => c.tags.some((t) => t.toLowerCase() === needle));
}

export function championIds(): string[] {
  return allChampions().map((c) => c.id);
}

export function has(idOrName: string | number): boolean {
  return resolveChampion(idOrName) !== null;
}

export const ChampionRepository = {
  ensureLoaded: loadLeagueData,
  get: getChampion,
  ensure: ensureChampion,
  all: allChampions,
  ids: championIds,
  has,
  getTags,
  getClasses,
  getResourceType,
  getRangeType,
  getPassive,
  getAbilities,
  getAbility,
  getAssets,
  getStats,
  byTag,
  patch: currentPatch,
} as const;

export type ChampionRepositoryFacade = typeof ChampionRepository;