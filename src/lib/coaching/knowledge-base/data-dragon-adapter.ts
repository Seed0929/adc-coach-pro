// ---------------------------------------------------------------------------
// Data Dragon Adapter — the ONLY place that will know about Riot's payloads.
//
// Currently inert. When wired, this module will:
//   1. fetch Riot Data Dragon JSON,
//   2. map each entry into the matching *Template shape,
//   3. call the registry's register* functions,
//   4. flip `source: "curated"` → `source: "datadragon"`.
//
// The Coach Engine will not change. Consumers keep asking the registry.
// ---------------------------------------------------------------------------
export interface DataDragonHydrationOptions {
  patch?: string;
  locale?: string;
}

export interface DataDragonHydrationResult {
  hydrated: boolean;
  patch?: string;
  counts?: Record<string, number>;
  reason?: string;
}

/**
 * Entry point for Riot Data Dragon hydration (Sprint 4.4).
 *
 * Delegates to the League Data Providers layer, which owns all fetching,
 * caching, patch detection and fallback. This adapter stays free of Riot
 * endpoints and of coaching logic: it only routes validated facts into
 * Champion Intelligence.
 */
export async function hydrateFromDataDragon(
  opts: DataDragonHydrationOptions = {},
): Promise<DataDragonHydrationResult> {
  try {
    const { LeagueDataProviders } = await import("../../league-data");
    if (opts.locale) LeagueDataProviders.provider.setLocale(opts.locale);
    const result = await LeagueDataProviders.hydrateChampionIntelligence();
    if (!result.hydrated) {
      return { hydrated: false, patch: result.patch, reason: "Riot Data Dragon unavailable" };
    }
    return {
      hydrated: true,
      patch: result.patch,
      counts: { champions: result.champions },
    };
  } catch (error) {
    return {
      hydrated: false,
      reason: error instanceof Error ? error.message : "Data Dragon hydration failed",
    };
  }
}