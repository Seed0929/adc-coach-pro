import type { KnowledgeSource } from "../types";
import type { ChampionClass, DamageType } from "./champion";

export type ItemCategory =
  | "crit" | "on-hit" | "lethality" | "armor-pen" | "magic-pen"
  | "ability-power" | "anti-heal" | "magic-resist" | "armor"
  | "survivability" | "anti-burst" | "lifesteal" | "utility"
  | "mythic" | "boots" | "starter";

export interface ItemTemplate {
  id: string;
  name: string;
  category: ItemCategory;
  damageType: DamageType;
  primaryPurpose: string;
  secondaryPurpose?: string;
  powerSpikeContribution: "core" | "situational" | "luxury" | "unknown";
  idealUsers: string[];
  championClasses: ChampionClass[];
  purchaseConditions: string[];
  commonAlternatives: string[];
  tradeoffs: string[];
  source: KnowledgeSource;
}

export function emptyItemTemplate(id: string, name: string, category: ItemCategory): ItemTemplate {
  return {
    id, name, category,
    damageType: "unknown",
    primaryPurpose: "",
    powerSpikeContribution: "unknown",
    idealUsers: [],
    championClasses: [],
    purchaseConditions: [],
    commonAlternatives: [],
    tradeoffs: [],
    source: "curated",
  };
}