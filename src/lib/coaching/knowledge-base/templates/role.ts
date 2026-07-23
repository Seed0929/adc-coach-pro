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
  /** Non-negotiable job of the role (subset of coreResponsibilities). */
  primaryResponsibilities: string[];
  /** Secondary duties that matter once primaries are met. */
  secondaryResponsibilities: string[];
  resourcePriorities: string[];
  objectivePriorities: string[];
  tempoExpectations: string[];
  laneResponsibilities: string[];
  mapResponsibilities: string[];
  teamfightResponsibilities: string[];
  commonHabits: string[];
  commonDecisionCategories: string[];
  successConditions: string[];
  failureConditions: string[];
  winConditionFramework: string[];
  /** Primary victory paths this role usually enables. */
  primaryWinConditions: string[];
  /** Situational secondary win conditions. */
  secondaryWinConditions: string[];
  /** Which lane priorities the role fights for. */
  lanePriorities: string[];
  /** Typical tempo goals per phase (what "on tempo" looks like). */
  typicalTempoGoals: string[];
  /** When this role usually wants to reset. */
  typicalRecallWindows: string[];
  /** How the role treats power spikes (rush, share, deny, delay). */
  powerSpikePhilosophy: string[];
  /** Job in the late game specifically. */
  lateGameResponsibilities: string[];
  /** One-line teamfight archetype (frontline, backline peel, flank, engage). */
  teamfightIdentity: string;
  /** What the role does in the side lane. */
  sideLaneResponsibilities: string[];
  /** Recurring negative patterns for the role. */
  commonMistakes: string[];
  /** Recurring positive patterns for the role. */
  commonGoodHabits: string[];
  source: KnowledgeSource;
}

export function emptyRoleTemplate(id: RoleId, label: string): RoleTemplate {
  return {
    id,
    label,
    coreResponsibilities: [],
    primaryResponsibilities: [],
    secondaryResponsibilities: [],
    resourcePriorities: [],
    objectivePriorities: [],
    tempoExpectations: [],
    laneResponsibilities: [],
    mapResponsibilities: [],
    teamfightResponsibilities: [],
    commonHabits: [],
    commonDecisionCategories: [],
    successConditions: [],
    failureConditions: [],
    winConditionFramework: [],
    primaryWinConditions: [],
    secondaryWinConditions: [],
    lanePriorities: [],
    typicalTempoGoals: [],
    typicalRecallWindows: [],
    powerSpikePhilosophy: [],
    lateGameResponsibilities: [],
    teamfightIdentity: "",
    sideLaneResponsibilities: [],
    commonMistakes: [],
    commonGoodHabits: [],
    source: "curated",
  };
}