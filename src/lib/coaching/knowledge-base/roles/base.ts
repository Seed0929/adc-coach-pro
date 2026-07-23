// ---------------------------------------------------------------------------
// Base Role Intelligence — every role module inherits from this contract.
//
// A Role Intelligence module is a thin lens over the Knowledge Base's Role
// Template. Coach Engine asks a role intelligence module: "what does this
// role expect right now?" — it never contains coaching or player evaluation.
// ---------------------------------------------------------------------------
import type { RoleTemplate } from "../templates/role";
import type { RoleId } from "../templates/champion";

export interface RoleIntelligence {
  id: RoleId;
  label: string;
  /** Returns the underlying Role Template record — the single source of truth. */
  template(): RoleTemplate;
  responsibilities(): string[];
  primaryResponsibilities(): string[];
  secondaryResponsibilities(): string[];
  teamfightResponsibilities(): string[];
  objectivePriorities(): string[];
  successConditions(): string[];
  failureConditions(): string[];
  winConditionFramework(): string[];
  primaryWinConditions(): string[];
  secondaryWinConditions(): string[];
  lanePriorities(): string[];
  typicalTempoGoals(): string[];
  typicalRecallWindows(): string[];
  powerSpikePhilosophy(): string[];
  lateGameResponsibilities(): string[];
  teamfightIdentity(): string;
  sideLaneResponsibilities(): string[];
  commonMistakes(): string[];
  commonGoodHabits(): string[];
}

/** Wraps a RoleTemplate into a uniform RoleIntelligence interface. */
export function roleIntelligenceFromTemplate(t: RoleTemplate): RoleIntelligence {
  return {
    id: t.id,
    label: t.label,
    template: () => t,
    responsibilities: () => t.coreResponsibilities,
    primaryResponsibilities: () => t.primaryResponsibilities,
    secondaryResponsibilities: () => t.secondaryResponsibilities,
    teamfightResponsibilities: () => t.teamfightResponsibilities,
    objectivePriorities: () => t.objectivePriorities,
    successConditions: () => t.successConditions,
    failureConditions: () => t.failureConditions,
    winConditionFramework: () => t.winConditionFramework,
    primaryWinConditions: () => t.primaryWinConditions,
    secondaryWinConditions: () => t.secondaryWinConditions,
    lanePriorities: () => t.lanePriorities,
    typicalTempoGoals: () => t.typicalTempoGoals,
    typicalRecallWindows: () => t.typicalRecallWindows,
    powerSpikePhilosophy: () => t.powerSpikePhilosophy,
    lateGameResponsibilities: () => t.lateGameResponsibilities,
    teamfightIdentity: () => t.teamfightIdentity,
    sideLaneResponsibilities: () => t.sideLaneResponsibilities,
    commonMistakes: () => t.commonMistakes,
    commonGoodHabits: () => t.commonGoodHabits,
  };
}