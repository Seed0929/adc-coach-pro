import type { KnowledgeSource } from "../types";

export type EconomyConceptId =
  | "gold-per-minute" | "cs-efficiency" | "item-cost"
  | "bounty-gold" | "passive-gold" | "shutdown-value" | "objective-gold";

export interface EconomyTemplate {
  id: EconomyConceptId;
  label: string;
  definition: string;
  benchmarks: string[];
  source: KnowledgeSource;
}

export function emptyEconomyTemplate(id: EconomyConceptId, label: string): EconomyTemplate {
  return { id, label, definition: "", benchmarks: [], source: "curated" };
}