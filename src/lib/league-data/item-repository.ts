// ---------------------------------------------------------------------------
// ItemRepository — Riot-validated item facts (name, stats, gold, tags, icon).
//
// This repository NEVER recommends, ranks or builds items. It answers
// "what is item 3031?" — nothing more.
// ---------------------------------------------------------------------------
import { allItems, currentPatch, loadLeagueData, resolveItem } from "./provider";
import type { ItemData } from "./types";

export function getItem(itemId: string | number): ItemData | null {
  return resolveItem(itemId);
}

export function getItemName(itemId: string | number): string {
  return resolveItem(itemId)?.name ?? "";
}

export function getItemIcon(itemId: string | number): string {
  return resolveItem(itemId)?.icon ?? "";
}

export function getItemTags(itemId: string | number): string[] {
  return resolveItem(itemId)?.tags ?? [];
}

export function getItemStats(itemId: string | number): Record<string, number> {
  return resolveItem(itemId)?.stats ?? {};
}

export function getItemGold(itemId: string | number) {
  return resolveItem(itemId)?.gold ?? { total: 0, base: 0, sell: 0, purchasable: false };
}

/** Riot tag lookup (e.g. "CriticalStrike", "SpellBlock") — factual only. */
export function byTag(tag: string): ItemData[] {
  const needle = tag.toLowerCase();
  return allItems().filter((i) => i.tags.some((t) => t.toLowerCase() === needle));
}

export function findByName(name: string): ItemData | null {
  const needle = name.trim().toLowerCase();
  return allItems().find((i) => i.name.toLowerCase() === needle) ?? null;
}

export const ItemRepository = {
  ensureLoaded: loadLeagueData,
  get: getItem,
  all: allItems,
  name: getItemName,
  icon: getItemIcon,
  tags: getItemTags,
  stats: getItemStats,
  gold: getItemGold,
  byTag,
  findByName,
  patch: currentPatch,
} as const;

export type ItemRepositoryFacade = typeof ItemRepository;