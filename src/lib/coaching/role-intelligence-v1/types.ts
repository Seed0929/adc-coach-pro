// ---------------------------------------------------------------------------
// Role Intelligence V1 — the permanent layer between the League Coaching
// Curriculum and Champion Intelligence.
//
//   Curriculum -> Role Intelligence -> Champion Intelligence -> Coach Engine
//
// Role Profiles describe HOW a role expresses League fundamentals. They are
// champion-agnostic, patch-stable, and structured so Riot Data Dragon can
// enrich the champion layer later without touching this file.
//
// Facts + coaching philosophy only. No player evaluation. No champion data.
// ---------------------------------------------------------------------------
import type { RoleId } from "../knowledge-base/templates/champion";
import type { LeagueFundamentalId } from "../knowledge-base/fundamentals";
import type { KnowledgeSource } from "../knowledge-base/types";

export type DecisionPriorityTier = "high" | "medium" | "low";

export interface RoleDecisionPriority {
  tier: DecisionPriorityTier;
  decision: string;
  fundamental: LeagueFundamentalId;
}

export interface RoleHabitEntry {
  kind: "strength" | "mistake";
  label: string;
  fundamental: LeagueFundamentalId;
}

export interface RolePracticeItem {
  label: string;
  fundamental: LeagueFundamentalId;
  measurable: string;
}

export interface RoleFundamentalExpression {
  fundamental: LeagueFundamentalId;
  philosophy: string;
  example: string;
}

export interface RoleProfile {
  id: RoleId;
  label: string;
  primaryResponsibilities: string[];
  secondaryResponsibilities: string[];
  teamfightResponsibilities: string[];
  lateGameResponsibilities: string[];
  sideLaneResponsibilities: string[];
  primaryWinConditions: string[];
  secondaryWinConditions: string[];
  primaryResource: string;
  secondaryResource: string;
  goldPriority: string[];
  experiencePriority: string[];
  wavePriority: string[];
  tempoPhilosophy: string[];
  positioningPhilosophy: string[];
  powerSpikePhilosophy: string[];
  recallPhilosophy: string[];
  roamPhilosophy: string[];
  economyPhilosophy: string[];
  objectiveResponsibilities: string[];
  visionResponsibilities: string[];
  mapResponsibilities: string[];
  consistencyPriorities: string[];
  recoveryPriorities: string[];
  practicePriorities: string[];
  decisionPriorities: RoleDecisionPriority[];
  habitLibrary: RoleHabitEntry[];
  practiceLibrary: RolePracticeItem[];
  fundamentalExpression: RoleFundamentalExpression[];
  source: KnowledgeSource;
}

export interface InheritableRoleProfile {
  id: RoleId;
  label: string;
  primaryResponsibilities: string[];
  primaryWinConditions: string[];
  powerSpikePhilosophy: string[];
  positioningPhilosophy: string[];
  teamfightResponsibilities: string[];
  decisionPriorities: RoleDecisionPriority[];
  fundamentalExpression: RoleFundamentalExpression[];
}
