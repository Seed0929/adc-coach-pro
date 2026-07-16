// ---------------------------------------------------------------------------
// Item Intelligence — factual metadata about item CATEGORIES.
//
// Categorical, not item-by-item. Individual items are a Data Dragon concern;
// coaching only ever reasons at the category level (anti-heal, penetration,
// survivability, etc.), which keeps the engine robust across patches.
// ---------------------------------------------------------------------------
import {
  getItemCategory,
  isItemCategoryCompatible,
  type ItemCategory,
  type ItemCategoryMeta,
  type DamageProfile,
} from "../league-knowledge";

export type { ItemCategory, ItemCategoryMeta, DamageProfile };
export { getItemCategory, isItemCategoryCompatible };

/** The purpose a category serves in a coaching conversation — facts only. */
export type ItemPurpose =
  | "damage"
  | "penetration"
  | "sustain"
  | "utility"
  | "durability"
  | "anti-heal"
  | "anti-burst";

const CATEGORY_PURPOSE: Record<ItemCategory, ItemPurpose> = {
  crit: "damage",
  "on-hit": "damage",
  lethality: "penetration",
  "armor-pen": "penetration",
  "magic-pen": "penetration",
  "ability-power": "damage",
  "anti-heal": "anti-heal",
  "magic-resist": "durability",
  armor: "durability",
  survivability: "durability",
  "anti-burst": "anti-burst",
  lifesteal: "sustain",
  utility: "utility",
};

export function itemPurpose(category: ItemCategory): ItemPurpose {
  return CATEGORY_PURPOSE[category];
}

/** Which item categories share this purpose. */
export function categoriesByPurpose(purpose: ItemPurpose): ItemCategory[] {
  return (Object.keys(CATEGORY_PURPOSE) as ItemCategory[]).filter(
    (c) => CATEGORY_PURPOSE[c] === purpose,
  );
}

/** Illustrative items for a category — never a build guide, never coaching. */
export function exampleItems(category: ItemCategory): string[] {
  return getItemCategory(category).examples;
}
