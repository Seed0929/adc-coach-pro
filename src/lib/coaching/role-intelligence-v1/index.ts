// ---------------------------------------------------------------------------
// Role Intelligence V1 — public facade.
//
// The Coach Engine, Replay Coach, Practice Planner, and Champion Intelligence
// layer all consume role knowledge through this facade. Role Intelligence
// stays stable across patches; Champion Intelligence layers on top later
// once Riot Data Dragon populates champion-specific data.
//
// Facts + coaching philosophy only. No player evaluation. Pure + client-safe.
// ---------------------------------------------------------------------------
import type { RoleId } from "../knowledge-base/templates/champion";
import type { LeagueFundamentalId } from "../knowledge-base/fundamentals";
import type {
  InheritableRoleProfile,
  RoleDecisionPriority,
  RoleFundamentalExpression,
  RoleHabitEntry,
  RolePracticeItem,
  RoleProfile,
} from "./types";
import { ROLE_PROFILES } from "./profiles";

export * from "./types";
export { ROLE_PROFILES };

/** All role profiles keyed by role id. */
export function allRoleProfiles(): Record<RoleId, RoleProfile> {
  return ROLE_PROFILES;
}

/** Fetch a full role profile. */
export function getRoleProfile(role: RoleId): RoleProfile {
  return ROLE_PROFILES[role];
}

/** Narrow view of a role suitable for Champion Intelligence to inherit. */
export function inheritableRoleProfile(role: RoleId): InheritableRoleProfile {
  const p = ROLE_PROFILES[role];
  return {
    id: p.id,
    label: p.label,
    primaryResponsibilities: p.primaryResponsibilities,
    primaryWinConditions: p.primaryWinConditions,
    powerSpikePhilosophy: p.powerSpikePhilosophy,
    positioningPhilosophy: p.positioningPhilosophy,
    teamfightResponsibilities: p.teamfightResponsibilities,
    decisionPriorities: p.decisionPriorities,
    fundamentalExpression: p.fundamentalExpression,
  };
}

/** How this role expresses a specific fundamental (or `undefined`). */
export function roleFundamentalExpression(
  role: RoleId,
  fundamental: LeagueFundamentalId,
): RoleFundamentalExpression | undefined {
  return ROLE_PROFILES[role].fundamentalExpression.find(
    (f) => f.fundamental === fundamental,
  );
}

/** Decision priorities for a role, optionally filtered by tier. */
export function roleDecisionPriorities(
  role: RoleId,
  tier?: RoleDecisionPriority["tier"],
): RoleDecisionPriority[] {
  const list = ROLE_PROFILES[role].decisionPriorities;
  return tier ? list.filter((d) => d.tier === tier) : list;
}

/** Habit library, optionally filtered by kind. */
export function roleHabitLibrary(
  role: RoleId,
  kind?: RoleHabitEntry["kind"],
): RoleHabitEntry[] {
  const list = ROLE_PROFILES[role].habitLibrary;
  return kind ? list.filter((h) => h.kind === kind) : list;
}

/** Champion-agnostic practice drills for a role. */
export function rolePracticeLibrary(role: RoleId): RolePracticeItem[] {
  return ROLE_PROFILES[role].practiceLibrary;
}

/**
 * Match Report safety helper — always returns coaching material even when
 * Champion Intelligence is unavailable for a given champion.
 */
export function safeRoleFallback(role: RoleId): InheritableRoleProfile {
  return inheritableRoleProfile(role);
}

/**
 * Namespaced facade — mirrors the LeagueKnowledgeBase pattern. Consumers
 * should read Role Intelligence through this object so future storage or
 * hydration changes are transparent.
 */
export const RoleIntelligenceV1 = {
  get: getRoleProfile,
  all: allRoleProfiles,
  inheritable: inheritableRoleProfile,
  fundamentalExpression: roleFundamentalExpression,
  decisionPriorities: roleDecisionPriorities,
  habitLibrary: roleHabitLibrary,
  practiceLibrary: rolePracticeLibrary,
  safeFallback: safeRoleFallback,
} as const;

export type RoleIntelligenceFacade = typeof RoleIntelligenceV1;
