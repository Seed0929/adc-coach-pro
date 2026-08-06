// ---------------------------------------------------------------------------
// RuneRepository — Riot-validated rune + rune-tree facts and icons.
// Also exposes summoner spells, since Riot ships them as the same static set.
// ---------------------------------------------------------------------------
import {
  allRuneTrees,
  allRunes,
  allSummonerSpells,
  currentPatch,
  loadLeagueData,
  resolveRune,
  resolveRuneTree,
  resolveSummonerSpell,
} from "./provider";
import type { RuneData, RuneTreeData, SummonerSpellData } from "./types";

export function getRune(runeId: number): RuneData | null {
  return resolveRune(runeId);
}

export function getRuneName(runeId: number): string {
  return resolveRune(runeId)?.name ?? resolveRuneTree(runeId)?.name ?? "";
}

export function getRuneIcon(runeId: number): string {
  return resolveRune(runeId)?.icon ?? resolveRuneTree(runeId)?.icon ?? "";
}

export function getRuneTree(treeId: number): RuneTreeData | null {
  return resolveRuneTree(treeId);
}

/** The tree a given rune belongs to, resolved through the rune itself. */
export function getTreeForRune(runeId: number): RuneTreeData | null {
  const rune = resolveRune(runeId);
  return rune ? resolveRuneTree(rune.treeId) : resolveRuneTree(runeId);
}

export function getKeystones(treeId: number): RuneData[] {
  return resolveRuneTree(treeId)?.keystones ?? [];
}

export function isKeystone(runeId: number): boolean {
  return resolveRune(runeId)?.slot === 0;
}

export function getSummonerSpell(spell: string | number): SummonerSpellData | null {
  return resolveSummonerSpell(spell);
}

export function getSummonerSpellIcon(spell: string | number): string {
  return resolveSummonerSpell(spell)?.icon ?? "";
}

export function getSummonerSpellName(spell: string | number): string {
  return resolveSummonerSpell(spell)?.name ?? "";
}

export const RuneRepository = {
  ensureLoaded: loadLeagueData,
  get: getRune,
  all: allRunes,
  name: getRuneName,
  icon: getRuneIcon,
  tree: getRuneTree,
  trees: allRuneTrees,
  treeForRune: getTreeForRune,
  keystones: getKeystones,
  isKeystone,
  summonerSpell: getSummonerSpell,
  summonerSpells: allSummonerSpells,
  summonerSpellIcon: getSummonerSpellIcon,
  summonerSpellName: getSummonerSpellName,
  patch: currentPatch,
} as const;

export type RuneRepositoryFacade = typeof RuneRepository;