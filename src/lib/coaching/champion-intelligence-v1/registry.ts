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
 * Future Data Dragon entry point. Inert today — kept here so consumers never
 * need to know where champion data comes from.
 */
export function hydrateChampionIntelligence(): void {
  // Intentionally empty. Data Dragon is deferred to a later sprint.
}