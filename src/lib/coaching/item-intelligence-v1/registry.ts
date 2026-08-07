// ---------------------------------------------------------------------------
// Item Intelligence Registry — in-memory store, empty by design.
//
// Riot facts arrive through the Data Dragon bridge; coaching content arrives
// from future intelligence layers. Item Intelligence NEVER calls a Riot
// endpoint itself.
// ---------------------------------------------------------------------------
import type { ItemProfileV1 } from "./types";

const REGISTRY = new Map<string, ItemProfileV1>();
const NAME_INDEX = new Map<string, string>();

/** Stable lookup key — works for numeric ids and item names alike. */
export function itemKey(itemId: string | number): string {
  return String(itemId ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function registerItemProfiles(profiles: ItemProfileV1[]): void {
  for (const p of profiles) {
    REGISTRY.set(itemKey(p.itemId), p);
    const name = p.official?.name;
    if (name) NAME_INDEX.set(itemKey(name), itemKey(p.itemId));
  }
}

export function clearItemProfiles(): void {
  REGISTRY.clear();
  NAME_INDEX.clear();
}

export function rawItemProfile(itemId: string | number): ItemProfileV1 | undefined {
  const key = itemKey(itemId);
  return REGISTRY.get(key) ?? REGISTRY.get(NAME_INDEX.get(key) ?? "");
}

/** True when Riot facts exist for this item. */
export function hasItemProfile(itemId: string | number): boolean {
  return Boolean(rawItemProfile(itemId));
}

/** True when COACHING content exists (not just Riot facts). */
export function hasItemCoaching(itemId: string | number): boolean {
  return Boolean(rawItemProfile(itemId)?.populated);
}

export function registeredItemIds(): string[] {
  return Array.from(REGISTRY.values()).map((p) => p.itemId);
}

export function allItemProfiles(): ItemProfileV1[] {
  return Array.from(REGISTRY.values());
}

export function registeredItemCount(): number {
  return REGISTRY.size;
}

/**
 * Data Dragon entry point. Lazily imported so this module stays pure and free
 * of any network dependency. Returns `hydrated: false` when Riot is
 * unavailable — every consumer degrades gracefully.
 */
export async function hydrateItemIntelligence(): Promise<{
  hydrated: boolean;
  patch: string;
  items: number;
}> {
  try {
    const { hydrateItemIntelligenceFromDataDragon } = await import(
      "../../league-data/item-intelligence-bridge"
    );
    const result = await hydrateItemIntelligenceFromDataDragon();
    return { hydrated: result.hydrated, patch: result.patch, items: result.items };
  } catch {
    return { hydrated: false, patch: "", items: 0 };
  }
}
