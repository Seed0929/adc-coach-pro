// ---------------------------------------------------------------------------
// Rune Intelligence Registry — in-memory store, empty by design.
//
// Riot facts arrive through the Data Dragon bridge; coaching content arrives
// from future intelligence layers. Rune Intelligence NEVER calls a Riot
// endpoint itself.
// ---------------------------------------------------------------------------
import type { RuneProfileV1 } from "./types";

const REGISTRY = new Map<number, RuneProfileV1>();
const NAME_INDEX = new Map<string, number>();

export function runeNameKey(name: string): string {
  return (name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function registerRuneProfiles(profiles: RuneProfileV1[]): void {
  for (const p of profiles) {
    REGISTRY.set(p.runeId, p);
    if (p.official?.name) NAME_INDEX.set(runeNameKey(p.official.name), p.runeId);
    if (p.official?.key) NAME_INDEX.set(runeNameKey(p.official.key), p.runeId);
  }
}

export function clearRuneProfiles(): void {
  REGISTRY.clear();
  NAME_INDEX.clear();
}

/** Accepts a numeric rune id, a Riot rune key, or a rune name. */
export function rawRuneProfile(rune: number | string): RuneProfileV1 | undefined {
  if (typeof rune === "number") return REGISTRY.get(rune);
  const numeric = Number(rune);
  if (Number.isFinite(numeric) && REGISTRY.has(numeric)) return REGISTRY.get(numeric);
  const id = NAME_INDEX.get(runeNameKey(rune));
  return id === undefined ? undefined : REGISTRY.get(id);
}

export function hasRuneProfile(rune: number | string): boolean {
  return Boolean(rawRuneProfile(rune));
}

/** True when COACHING content exists (not just Riot facts). */
export function hasRuneCoaching(rune: number | string): boolean {
  return Boolean(rawRuneProfile(rune)?.populated);
}

export function allRuneProfiles(): RuneProfileV1[] {
  return Array.from(REGISTRY.values());
}

export function registeredRuneIds(): number[] {
  return Array.from(REGISTRY.keys());
}

export function registeredRuneCount(): number {
  return REGISTRY.size;
}

/**
 * Data Dragon entry point. Lazily imported so this module stays pure and free
 * of any network dependency. Returns `hydrated: false` when rune data cannot
 * be loaded — every consumer degrades gracefully.
 */
export async function hydrateRuneIntelligence(): Promise<{
  hydrated: boolean;
  patch: string;
  runes: number;
}> {
  try {
    const { hydrateRuneIntelligenceFromDataDragon } = await import(
      "../../league-data/rune-intelligence-bridge"
    );
    const result = await hydrateRuneIntelligenceFromDataDragon();
    return { hydrated: result.hydrated, patch: result.patch, runes: result.runes };
  } catch {
    return { hydrated: false, patch: "", runes: 0 };
  }
}
