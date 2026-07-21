import type { KnowledgeSource } from "../types";

export type TempoConceptId =
  | "recall-timing" | "wave-crash-timing" | "item-completion-timing"
  | "rotation-timing" | "objective-setup" | "map-pressure"
  | "tempo-recovery" | "tempo-loss";

export interface TempoTemplate {
  id: TempoConceptId;
  label: string;
  definition: string;
  triggers: string[];
  outcomes: string[];
  source: KnowledgeSource;
}

export function emptyTempoTemplate(id: TempoConceptId, label: string): TempoTemplate {
  return { id, label, definition: "", triggers: [], outcomes: [], source: "curated" };
}