// ---------------------------------------------------------------------------
// League Data Providers — public facade (Sprint 4.4).
//
//   League Data Providers
//     ↓
//   Data Dragon Provider   (caching · version tracking · patch detection)
//     ↓
//   Champion Intelligence  (via champion-intelligence-bridge)
//     ↓
//   Coach Engine
//
// Data Dragon exists ONLY to provide validated League data. It supplies facts;
// BotDiff supplies understanding. Nothing in here calculates coaching,
// generates builds, or creates recommendations.
//
// Every consumer — including Champion Intelligence — must go through this
// module and must NEVER call a Riot endpoint directly.
// ---------------------------------------------------------------------------
export * from "./types";
export {
  DataDragonProvider,
  type DataDragonProviderFacade,
  loadLeagueData,
  refreshPatch,
  resetLeagueData,
  detectPatch,
  subscribeLeagueData,
  getLeagueDataRevision,
  onPatchChange,
  currentPatch,
  currentLocale,
  setLocale,
  isReady,
  isDegraded,
  snapshot,
  DDRAGON_CDN,
  COMMUNITY_DRAGON,
  FALLBACK_PATCH,
  DEFAULT_LOCALE,
} from "./provider";
export { ChampionRepository, type ChampionRepositoryFacade } from "./champion-repository";
export { ItemRepository, type ItemRepositoryFacade } from "./item-repository";
export { RuneRepository, type RuneRepositoryFacade } from "./rune-repository";
export { AssetRepository, type AssetRepositoryFacade } from "./asset-repository";
export { VersionRepository, type VersionRepositoryFacade } from "./version-repository";
export {
  hydrateChampionIntelligenceFromDataDragon,
  hydrateChampion,
  toChampionProfile,
  type HydrationResult,
} from "./champion-intelligence-bridge";
export {
  hydrateItemIntelligenceFromDataDragon,
  hydrateItem,
  toItemProfile,
  type ItemHydrationResult,
} from "./item-intelligence-bridge";
export { clearCache as clearLeagueDataCache } from "./cache";

import { DataDragonProvider } from "./provider";
import { ChampionRepository } from "./champion-repository";
import { ItemRepository } from "./item-repository";
import { RuneRepository } from "./rune-repository";
import { AssetRepository } from "./asset-repository";
import { VersionRepository } from "./version-repository";
import { hydrateChampionIntelligenceFromDataDragon } from "./champion-intelligence-bridge";
import { hydrateItemIntelligenceFromDataDragon } from "./item-intelligence-bridge";

/** One object every future intelligence module can depend on. */
export const LeagueDataProviders = {
  provider: DataDragonProvider,
  champions: ChampionRepository,
  items: ItemRepository,
  runes: RuneRepository,
  assets: AssetRepository,
  version: VersionRepository,
  /** Load Riot data and feed Champion Intelligence with validated facts. */
  hydrateChampionIntelligence: hydrateChampionIntelligenceFromDataDragon,
  hydrateItemIntelligence: hydrateItemIntelligenceFromDataDragon,
} as const;

export type LeagueDataProvidersFacade = typeof LeagueDataProviders;