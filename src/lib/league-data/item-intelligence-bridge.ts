// ---------------------------------------------------------------------------
// Data Dragon → Item Intelligence bridge (Sprint 4.6).
//
//   League Data Providers → Data Dragon Provider → [this bridge]
//   → Item Intelligence → Coaching Engine
//
// The ONLY place where Riot item facts enter the coaching architecture. It maps
// validated Data Dragon items onto the permanent ItemProfileV1 shape and
// registers them. It does NOT calculate coaching, generate builds, recommend
// purchase order or infer usage — every coaching field stays as defined.
// ---------------------------------------------------------------------------
import {
  emptyItemProfileV1,
  type ItemOfficialMetadata,
  type ItemProfileV1,
} from "../coaching/item-intelligence-v1/types";
import {
  rawItemProfile,
  registerItemProfiles,
} from "../coaching/item-intelligence-v1/registry";
import { allItems, currentPatch, loadLeagueData, resolveItem } from "./provider";
import type { ItemData } from "./types";

/**
 * Riot ships active/passive text inside `description` as markup. We surface it
 * verbatim (tags stripped only for readability) — no parsing of effects into
 * coaching meaning.
 */
function effectText(item: ItemData): string {
  return (item.description ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function toOfficial(item: ItemData): ItemOfficialMetadata {
  return {
    dataDragonId: item.id,
    name: item.name,
    plaintext: item.plaintext,
    description: item.description,
    effectText: effectText(item),
    officialTags: item.tags,
    stats: item.stats,
    gold: item.gold,
    components: item.from,
    buildsInto: item.into,
    depth: item.depth,
    image: item.icon,
    patch: item.patch,
  };
}

/** Riot facts merged onto whatever coaching content already exists. */
export function toItemProfile(item: ItemData): ItemProfileV1 {
  const base = rawItemProfile(item.id) ?? emptyItemProfileV1(item.id);
  const official = toOfficial(item);
  return {
    ...base,
    itemId: item.id,
    official,
    source: "datadragon",
    patch: official.patch || currentPatch(),
    // `populated` means "coaching content exists" — Riot facts never set it.
    populated: base.populated,
  };
}

export interface ItemHydrationResult {
  hydrated: boolean;
  patch: string;
  items: number;
  degraded: boolean;
}

/**
 * Load Data Dragon and push validated item facts into Item Intelligence.
 * Idempotent. When Riot is unavailable it returns `hydrated: false` and every
 * consumer keeps working against placeholder profiles.
 */
export async function hydrateItemIntelligenceFromDataDragon(): Promise<ItemHydrationResult> {
  const snap = await loadLeagueData();
  const items = allItems();
  if (items.length === 0) {
    return { hydrated: false, patch: snap.patch, items: 0, degraded: true };
  }
  registerItemProfiles(items.map(toItemProfile));
  return { hydrated: true, patch: snap.patch, items: items.length, degraded: snap.degraded };
}

/** Hydrate a single item (used when only one profile is needed). */
export async function hydrateItem(itemId: string | number): Promise<ItemProfileV1 | null> {
  await loadLeagueData();
  const item = resolveItem(itemId);
  if (!item) return null;
  const profile = toItemProfile(item);
  registerItemProfiles([profile]);
  return profile;
}
