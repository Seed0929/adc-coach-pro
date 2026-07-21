import type { GamePhase, KnowledgeSource } from "../types";

export type ObjectiveId =
  | "grubs" | "herald" | "dragon" | "elder-dragon" | "baron"
  | "atakhan" | "tower" | "plate" | "inhibitor" | "nexus";

export interface ObjectiveTemplate {
  id: ObjectiveId;
  label: string;
  spawnPhase: GamePhase;
  respawnSeconds?: number;
  contestPriority: "low" | "medium" | "high" | "situational";
  setupRequirements: string[];
  rewards: string[];
  commonMistakes: string[];
  source: KnowledgeSource;
}

export function emptyObjectiveTemplate(id: ObjectiveId, label: string, spawnPhase: GamePhase): ObjectiveTemplate {
  return {
    id, label, spawnPhase,
    contestPriority: "medium",
    setupRequirements: [],
    rewards: [],
    commonMistakes: [],
    source: "curated",
  };
}