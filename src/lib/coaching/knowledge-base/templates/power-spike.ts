import type { GamePhase, KnowledgeSource } from "../types";

export type PowerSpikeTrigger = "level" | "item" | "ultimate" | "component" | "stack";

export interface PowerSpikeTemplate {
  id: string;
  label: string;
  trigger: PowerSpikeTrigger;
  timing: GamePhase;
  requirementRef?: string | number;
  playstyleAfter: string;
  windowOfDominance?: string;
  source: KnowledgeSource;
}

export function emptyPowerSpikeTemplate(id: string, label: string, trigger: PowerSpikeTrigger, timing: GamePhase): PowerSpikeTemplate {
  return { id, label, trigger, timing, playstyleAfter: "", source: "curated" };
}