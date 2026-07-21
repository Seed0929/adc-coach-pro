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
import { __resetRegistryForHydration } from "./registry";

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
 * Entry point for Riot Data Dragon hydration. Inert today — returns a
 * `hydrated: false` result so callers can safely invoke it without a network.
 */
export async function hydrateFromDataDragon(
  _opts: DataDragonHydrationOptions = {},
): Promise<DataDragonHydrationResult> {
  // Reserved for the future. When implemented:
  //   __resetRegistryForHydration();
  //   register* templates mapped from Data Dragon payloads.
  void __resetRegistryForHydration; // keep import live for future work
  return { hydrated: false, reason: "Data Dragon integration not yet enabled" };
}