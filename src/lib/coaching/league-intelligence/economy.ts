// ---------------------------------------------------------------------------
// Economy Intelligence — factual concepts about gold / CS / item cost.
// ---------------------------------------------------------------------------
import type { KnowledgeSource } from "../league-knowledge";

export interface EconomyConcept {
  id: string;
  label: string;
  definition: string;
  source: KnowledgeSource;
}

export const ECONOMY_CONCEPTS: Record<string, EconomyConcept> = {
  goldPerMinute: { id: "goldPerMinute", label: "Gold per minute", definition: "Average gold generated each minute — the tempo of your income.", source: "curated" },
  csEfficiency: { id: "csEfficiency", label: "CS efficiency", definition: "Creep score relative to time — how consistently waves convert to gold.", source: "curated" },
  itemCost: { id: "itemCost", label: "Item cost", definition: "Total gold required to complete an item — anchors power-spike timing.", source: "curated" },
  bountyGold: { id: "bountyGold", label: "Bounty gold", definition: "Extra gold enemies earn for killing a fed player — powers comebacks.", source: "curated" },
  passiveGold: { id: "passiveGold", label: "Passive gold", definition: "Gold generated per second regardless of actions — the income floor.", source: "curated" },
};

export function getEconomyConcept(id: keyof typeof ECONOMY_CONCEPTS): EconomyConcept {
  return ECONOMY_CONCEPTS[id];
}
export function allEconomyConcepts(): EconomyConcept[] { return Object.values(ECONOMY_CONCEPTS); }
