// ---------------------------------------------------------------------------
// RiotAssetService — the app-facing asset API.
//
// Sprint 4.4: this module is now a THIN DELEGATION LAYER over the League Data
// Providers stack. Every URL, patch version and piece of metadata comes from
// the Data Dragon provider (`src/lib/league-data`), which owns fetching,
// caching, patch detection and graceful fallback.
//
// The public surface is unchanged so no UI component needed to be touched.
// ---------------------------------------------------------------------------
import {
  AssetRepository,
  RuneRepository,
  DataDragonProvider,
  loadLeagueData,
  subscribeLeagueData,
  getLeagueDataRevision,
  currentPatch,
  isReady,
} from "./league-data";

export { subscribeLeagueData as subscribeAssets, getLeagueDataRevision as getAssetsSnapshot };

/** Resolve a champion display name (or already-normalised id) to a DDragon id. */
export const championId = AssetRepository.championId;

export const riotAssets = {
  get version() {
    return currentPatch();
  },
  get ready() {
    return isReady();
  },

  championId,

  /** 120×120 champion square icon (used for lists, cards, avatars). */
  championSquare(name: string): string {
    return AssetRepository.championSquare(name);
  },

  /** Full-resolution splash art — for blurred backgrounds. `skin` defaults to 0. */
  championSplash(name: string, skin = 0): string {
    return AssetRepository.championSplash(name, skin);
  },

  /** Loading-screen portrait (tall) art. */
  championLoading(name: string, skin = 0): string {
    return AssetRepository.championLoading(name, skin);
  },

  /** Riot profile icon by numeric icon id. */
  profileIcon(iconId: number | string): string {
    return AssetRepository.profileIcon(iconId);
  },

  /** Item icon by numeric item id. */
  item(itemId: number | string): string {
    return AssetRepository.itemIcon(itemId);
  },

  /** Summoner spell icon. Accepts a numeric key (from match-v5) or a spell id. */
  summonerSpell(spell: number | string): string {
    return AssetRepository.summonerSpellIcon(spell);
  },

  /** Individual rune (perk) icon by rune id, e.g. 8005 (Press the Attack). */
  rune(runeId: number): string {
    return AssetRepository.runeIcon(runeId);
  },

  /** Rune-tree (path) icon, e.g. Precision / Domination. */
  runeTree(treeId: number): string {
    return AssetRepository.runeTreeIcon(treeId);
  },

  runeName(runeId: number): string {
    return RuneRepository.name(runeId);
  },

  /** Official ranked emblem (Community Dragon, patch-independent). */
  rankEmblem(tier: string): string {
    return AssetRepository.rankEmblem(tier);
  },

  /** Small ranked mini-crest, nicer for inline chips. */
  rankMiniCrest(tier: string): string {
    return AssetRepository.rankMiniCrest(tier);
  },

  /** The underlying provider, for consumers that need full Riot metadata. */
  provider: DataDragonProvider,
} as const;

export type RiotAssetService = typeof riotAssets;

/** Idempotently detect the patch and load all Riot metadata (cached per patch). */
export function loadRiotAssets(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return loadLeagueData().then(() => undefined);
}
