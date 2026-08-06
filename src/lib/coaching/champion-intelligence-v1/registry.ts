// ---------------------------------------------------------------------------
// Champion Intelligence Registry — an EMPTY, in-memory store by design.
//
// Sprint 3.9 establishes architecture only: no champions are populated, no
// Data Dragon, no Riot API, no statistics. A later sprint calls
// `registerChampionProfiles()` from a pure data source.
// ---------------------------------------------------------------------------
import type { ChampionProfileV1 } from "./types";

const REGISTRY = new Map<string, ChampionProfileV1>();

/** Stable lookup key — case/space/punctuation insensitive. */
export function championKey(championId: string): string {
  return (championId ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Data-source hook. Intentionally unused today. */
export function registerChampionProfiles(profiles: ChampionProfileV1[]): void {
  for (const p of profiles) REGISTRY.set(championKey(p.championId), p);
}

export function clearChampionProfiles(): void {
  REGISTRY.clear();
}

export function rawChampionProfile(championId: string): ChampionProfileV1 | undefined {
  return REGISTRY.get(championKey(championId));
}

export function hasChampionProfile(championId: string): boolean {
  const p = rawChampionProfile(championId);
  return Boolean(p?.populated);
}

export function registeredChampionIds(): string[] {
  return Array.from(REGISTRY.values()).map((p) => p.championId);
}

/**
 * Data Dragon entry point (Sprint 4.4). Champion Intelligence NEVER touches a
 * Riot endpoint: it asks the League Data Providers layer, which owns fetching,
 * caching, patch detection and fallback. Imported lazily so this module stays
 * pure and free of any network dependency.
 */
export async function hydrateChampionIntelligence(): Promise<{
  hydrated: boolean;
  patch: string;
  champions: number;
}> {
  try {
    const { hydrateChampionIntelligenceFromDataDragon } = await import(
      "../../league-data/champion-intelligence-bridge"
    );
    const result = await hydrateChampionIntelligenceFromDataDragon();
    return { hydrated: result.hydrated, patch: result.patch, champions: result.champions };
  } catch {
    // Riot unavailable → coaching continues on Role Intelligence, unchanged.
    return { hydrated: false, patch: "", champions: 0 };
  }
}