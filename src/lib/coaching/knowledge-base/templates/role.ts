// ---------------------------------------------------------------------------
// Role Template — the SHAPE every role definition satisfies.
// Facts about a role only. No player evaluation.
// ---------------------------------------------------------------------------
import type { KnowledgeSource } from "../types";
import type { RoleId } from "./champion";

export interface RoleTemplate {
  id: RoleId;
  label: string;
  coreResponsibilities: string[];
  resourcePriorities: string[];
  objectivePriorities: string[];
  tempoExpectations: string[];
  laneResponsibilities: string[];
  mapResponsibilities: string[];
  commonHabits: string[];
  commonDecisionCategories: string[];
  successConditions: string[];
  failureConditions: string[];
  winConditionFramework: string[];
  source: KnowledgeSource;
}

export function emptyRoleTemplate(id: RoleId, label: string): RoleTemplate {
  return {
    id,
    label,
    coreResponsibilities: [],
    resourcePriorities: [],
    objectivePriorities: [],
    tempoExpectations: [],
    laneResponsibilities: [],
    mapResponsibilities: [],
    commonHabits: [],
    commonDecisionCategories: [],
    successConditions: [],
    failureConditions: [],
    winConditionFramework: [],
    source: "curated",
  };
}