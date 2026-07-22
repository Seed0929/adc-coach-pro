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
  };
}