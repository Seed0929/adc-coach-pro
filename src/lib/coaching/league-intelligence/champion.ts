// ---------------------------------------------------------------------------
// Champion Intelligence — factual metadata about champions.
//
// Thin facade over the existing champion-intelligence + league-knowledge maps
// so the League Intelligence Foundation exposes ONE consistent surface. No
// coaching decisions belong here — only facts (role, class, damage profile,
// scaling, identity, power spike profile, supported ecosystems).
// ---------------------------------------------------------------------------
import {
  championClasses,
  championDamageProfile,
  championPowerSpikes,
  championRoles,
  championScaling,
  championWinCondition,
  getChampion,
  hasChampionIdentity,
  isHealSource,
  type ChampionClass,
  type ChampionIdentity,
  type DamageProfile,
  type LeagueRole,
  type ScalingTier,
} from "../league-knowledge";
import {
  getChampionProfile,
  coreItemsFor,
  championRoleLabel,
  allowsCritBuild,
  allowsAdCarryBuild,
  allowsApMageBuild,
  isRoleLanguageSafe,
  type ChampionArchetype,
  type ChampionProfile,
} from "../champion-intelligence";
import type { ItemCategory } from "../league-knowledge";

export type {
  ChampionClass,
  ChampionIdentity,
  DamageProfile,
  LeagueRole,
  ScalingTier,
  ChampionArchetype,
  ChampionProfile,
};

export {
  getChampion,
  hasChampionIdentity,
  championClasses,
  championDamageProfile,
  championRoles,
  championScaling,
  championPowerSpikes,
  championWinCondition,
  isHealSource,
  getChampionProfile,
  coreItemsFor,
  championRoleLabel,
  allowsCritBuild,
  allowsAdCarryBuild,
  allowsApMageBuild,
  isRoleLanguageSafe,
};

/**
 * The item categories a champion's kit can meaningfully use. Provider-agnostic
 * — Data Dragon later hydrates the same shape. Purely factual.
 */
export function supportedItemEcosystem(name: string): ItemCategory[] {
  const p = getChampionProfile(name);
  const cats: ItemCategory[] = [];
  if (p.isMarksman) {
    if (p.archetype === "crit-marksman" || p.archetype === "utility-marksman") cats.push("crit", "lifesteal");
    if (p.archetype === "onhit-marksman" || p.archetype === "hybrid-marksman") cats.push("on-hit", "lifesteal");
    if (p.archetype === "lethality-marksman") cats.push("lethality", "armor-pen");
    cats.push("armor-pen", "anti-burst", "survivability");
  }
  if (p.isMage) cats.push("ability-power", "magic-pen", "anti-burst");
  if (p.isAssassin) {
    if (p.damageProfile === "AD") cats.push("lethality", "armor-pen");
    if (p.damageProfile === "AP" || p.damageProfile === "hybrid") cats.push("magic-pen", "ability-power");
    cats.push("anti-burst");
  }
  if (p.isBruiser) cats.push(p.damageProfile === "AP" ? "ability-power" : "on-hit", "survivability", "lifesteal");
  if (p.isTank) cats.push("armor", "magic-resist", "survivability", "utility");
  if (p.isSupport) cats.push("utility", p.damageProfile === "AP" ? "ability-power" : "armor");
  return Array.from(new Set(cats));
}

/**
 * The rune trees a champion's playstyle most commonly draws from. Advisory
 * fact, not a coaching recommendation.
 */
export function supportedRuneEcosystem(name: string): string[] {
  const p = getChampionProfile(name);
  const trees = new Set<string>();
  if (p.isMarksman || p.isBruiser || p.isSupport) trees.add("precision");
  if (p.isAssassin || p.archetype === "lethality-marksman") trees.add("domination");
  if (p.isMage || p.archetype === "artillery-mage" || p.archetype === "burst-mage") trees.add("sorcery");
  if (p.isTank || p.archetype === "warden-tank" || p.archetype === "vanguard-tank") trees.add("resolve");
  return Array.from(trees);
}

/**
 * The summoner spells appropriate for the champion's role. Facts only.
 */
export function supportedSummonerEcosystem(name: string): string[] {
  const p = getChampionProfile(name);
  const spells: string[] = ["flash"];
  if (p.isMarksman) spells.push("heal", "barrier", "cleanse", "exhaust");
  if (p.isSupport) spells.push("ignite", "exhaust", "heal");
  if (p.isMage || p.isAssassin) spells.push("ignite", "teleport", "barrier");
  if (p.isTank || p.isBruiser) spells.push("teleport", "ghost", "ignite");
  return Array.from(new Set(spells));
}
