// ---------------------------------------------------------------------------
// AssetRepository — the single source of truth for every Riot asset URL.
//
// Champion images, ability icons, item icons, rune icons, summoner-spell
// icons, profile icons and ranked emblems. Always patch-aware; always falls
// back to a deterministic Data Dragon URL when metadata has not loaded yet, so
// UI never renders a broken image while the provider warms up.
// ---------------------------------------------------------------------------
import {
  COMMUNITY_DRAGON,
  DDRAGON_CDN,
  currentPatch,
  loadLeagueData,
  resolveChampion,
  resolveItem,
  resolveRune,
  resolveRuneTree,
  resolveSummonerSpell,
} from "./provider";

/** Data Dragon ids for names Riot spells differently from the display name. */
const MANUAL_IDS: Record<string, string> = {
  Wukong: "MonkeyKing",
  "Nunu & Willump": "Nunu",
  "Renata Glasc": "Renata",
  "Dr. Mundo": "DrMundo",
  "Kai'Sa": "Kaisa",
  "Kha'Zix": "Khazix",
  "Cho'Gath": "Chogath",
  "Vel'Koz": "Velkoz",
  "Rek'Sai": "RekSai",
  "Bel'Veth": "Belveth",
  "Kog'Maw": "KogMaw",
  LeBlanc: "Leblanc",
  "Master Yi": "MasterYi",
  "Miss Fortune": "MissFortune",
  "Twisted Fate": "TwistedFate",
  "Xin Zhao": "XinZhao",
  "Jarvan IV": "JarvanIV",
  "Lee Sin": "LeeSin",
  "Aurelion Sol": "AurelionSol",
  "Tahm Kench": "TahmKench",
};

/** Resolve any champion reference to its Data Dragon id. Never throws. */
export function championAssetId(nameOrId: string | number | null | undefined): string {
  if (nameOrId === null || nameOrId === undefined) return "";
  const known = resolveChampion(nameOrId);
  if (known) return known.id;
  const raw = String(nameOrId);
  return MANUAL_IDS[raw] ?? raw.replace(/[^A-Za-z0-9]/g, "");
}

export function championSquare(nameOrId: string | number): string {
  return `${DDRAGON_CDN}/${currentPatch()}/img/champion/${championAssetId(nameOrId)}.png`;
}

export function championSplash(nameOrId: string | number, skin = 0): string {
  return `${DDRAGON_CDN}/img/champion/splash/${championAssetId(nameOrId)}_${skin}.jpg`;
}

export function championLoading(nameOrId: string | number, skin = 0): string {
  return `${DDRAGON_CDN}/img/champion/loading/${championAssetId(nameOrId)}_${skin}.jpg`;
}

export function championCentered(nameOrId: string | number): string {
  const champ = resolveChampion(nameOrId);
  return champ ? champ.assets.centered : championSplash(nameOrId);
}

export function championPassiveIcon(nameOrId: string | number): string {
  return resolveChampion(nameOrId)?.assets.passiveIcon ?? "";
}

export function championAbilityIcon(
  nameOrId: string | number,
  slot: "P" | "Q" | "W" | "E" | "R",
): string {
  const champ = resolveChampion(nameOrId);
  if (!champ) return "";
  if (slot === "P") return champ.assets.passiveIcon;
  return champ.assets.abilityIcons[slot] ?? "";
}

export function itemIcon(itemId: string | number): string {
  return (
    resolveItem(itemId)?.icon ?? `${DDRAGON_CDN}/${currentPatch()}/img/item/${itemId}.png`
  );
}

export function runeIcon(runeId: number): string {
  return resolveRune(runeId)?.icon ?? resolveRuneTree(runeId)?.icon ?? "";
}

export function runeTreeIcon(treeId: number): string {
  return resolveRuneTree(treeId)?.icon ?? "";
}

export function summonerSpellIcon(spell: string | number): string {
  return (
    resolveSummonerSpell(spell)?.icon ??
    `${DDRAGON_CDN}/${currentPatch()}/img/spell/${spell}.png`
  );
}

export function profileIcon(iconId: number | string): string {
  return `${DDRAGON_CDN}/${currentPatch()}/img/profileicon/${iconId}.png`;
}

/** Ranked emblem (Community Dragon — patch independent). */
export function rankEmblem(tier: string): string {
  const t = (tier || "").toLowerCase();
  if (!t || t === "unranked") {
    return `${COMMUNITY_DRAGON}/images/ranked-emblem/emblem-unranked.png`;
  }
  return `${COMMUNITY_DRAGON}/images/ranked-emblem/emblem-${t}.png`;
}

export function rankMiniCrest(tier: string): string {
  return `${COMMUNITY_DRAGON}/images/ranked-mini-crests/${(tier || "unranked").toLowerCase()}.svg`;
}

export const AssetRepository = {
  ensureLoaded: loadLeagueData,
  championId: championAssetId,
  championSquare,
  championSplash,
  championLoading,
  championCentered,
  championPassiveIcon,
  championAbilityIcon,
  itemIcon,
  runeIcon,
  runeTreeIcon,
  summonerSpellIcon,
  profileIcon,
  rankEmblem,
  rankMiniCrest,
  patch: currentPatch,
} as const;

export type AssetRepositoryFacade = typeof AssetRepository;