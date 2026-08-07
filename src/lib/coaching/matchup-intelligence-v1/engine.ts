// ---------------------------------------------------------------------------
// Matchup Intelligence Engine V1 — deterministic accessors (Sprint 4.8).
//
// Reads the registry ONLY. It never fetches, never ranks, never recommends,
// never fabricates timings or statistics, and never produces player advice.
// Champion facts are read through the Champion Intelligence facade so nothing
// is duplicated here.
//
// Graceful degradation contract: an unknown matchup, unknown champion, missing
// role or unavailable Data Dragon all resolve to the canonical empty profile.
// ---------------------------------------------------------------------------
import { isPending, PENDING } from "../knowledge-base/types";
import { getIdentity as getChampionIdentity, isAvailable as championAvailable } from "../champion-intelligence-v1/engine";
import type { RoleId } from "../knowledge-base/templates/champion";
import {
  emptyMatchupProfileV1,
  makeMatchupId,
  normalizeRoleContext,
  type MatchupChampionAvailability,
  type MatchupCurriculumReference,
  type MatchupDecisionPriority,
  type MatchupDecisionReference,
  type MatchupHabitReference,
  type MatchupInteraction,
  type MatchupMistakeReference,
  type MatchupPhaseProfile,
  type MatchupPracticeReference,
  type MatchupProfileV1,
  type MatchupResolution,
  type MatchupRoleContext,
  type MatchupWindow,
} from "./types";
import {
  allMatchupProfiles,
  matchupsForChampion,
  matchupsForRole,
  rawMatchupProfile,
  rawMatchupProfileById,
} from "./registry";

function resolve<T>(profile: MatchupProfileV1, value: T, fromMatchup: boolean): MatchupResolution<T> {
  return { matchupId: profile.matchupId, fromMatchup, value };
}

/** The directional profile, or the canonical empty profile when unknown. */
export function getMatchup(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): MatchupProfileV1 {
  const roleContext = normalizeRoleContext(role);
  return (
    rawMatchupProfile(championA, championB, roleContext) ??
    emptyMatchupProfileV1(championA, championB, roleContext)
  );
}

/** Null-returning lookup for consumers that want to branch explicitly. */
export function get(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): MatchupProfileV1 | null {
  return rawMatchupProfile(championA, championB, normalizeRoleContext(role)) ?? null;
}

export function getMatchupById(matchupId: string): MatchupProfileV1 | null {
  return rawMatchupProfileById(matchupId) ?? null;
}

export function getAllMatchups(): MatchupProfileV1[] {
  return allMatchupProfiles();
}

export function findMatchupsForChampion(championId: string): MatchupProfileV1[] {
  return matchupsForChampion(championId);
}

export function findMatchupsForRole(role: RoleId | MatchupRoleContext | string): MatchupProfileV1[] {
  return matchupsForRole(normalizeRoleContext(role));
}

export function isAvailable(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): boolean {
  return Boolean(rawMatchupProfile(championA, championB, normalizeRoleContext(role)));
}

/** True only when authored matchup knowledge exists. */
export function isKnowledgePopulated(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): boolean {
  return Boolean(rawMatchupProfile(championA, championB, normalizeRoleContext(role))?.populated);
}

/**
 * Directionality check — true when the reverse matchup is registered with its
 * own record. Consumers must never assume the reverse mirrors this one.
 */
export function hasDirectionalCounterpart(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): boolean {
  return Boolean(rawMatchupProfile(championB, championA, normalizeRoleContext(role)));
}

// -- phase + interaction accessors ------------------------------------------

export function getLanePhaseProfile(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): MatchupResolution<MatchupPhaseProfile> {
  const p = getMatchup(championA, championB, role);
  return resolve(p, p.lanePhaseProfile, !isPending(p.lanePhaseProfile.edge));
}

export function getPhaseProfile(
  championA: string,
  championB: string,
  phase: "lane" | "early" | "mid" | "late",
  role?: RoleId | MatchupRoleContext | string | null,
): MatchupResolution<MatchupPhaseProfile> {
  const p = getMatchup(championA, championB, role);
  const value =
    phase === "lane"
      ? p.lanePhaseProfile
      : phase === "early"
        ? p.earlyGameProfile
        : phase === "mid"
          ? p.midGameProfile
          : p.lateGameProfile;
  return resolve(p, value, !isPending(value.edge));
}

export function getPowerSpikeInteraction(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): MatchupResolution<MatchupInteraction> {
  const p = getMatchup(championA, championB, role);
  return resolve(p, p.powerSpikeInteraction, !isPending(p.powerSpikeInteraction.edge));
}

/** Generic interaction accessor keyed by the profile field name. */
export function getInteraction(
  championA: string,
  championB: string,
  key: keyof MatchupProfileV1,
  role?: RoleId | MatchupRoleContext | string | null,
): MatchupResolution<MatchupInteraction | null> {
  const p = getMatchup(championA, championB, role);
  const candidate = p[key] as unknown;
  const interaction =
    candidate && typeof candidate === "object" && "edge" in (candidate as object)
      ? (candidate as MatchupInteraction)
      : null;
  return resolve(p, interaction, Boolean(interaction && !isPending(interaction.edge)));
}

// -- windows ----------------------------------------------------------------

export function getPunishWindows(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): MatchupWindow[] {
  return getMatchup(championA, championB, role).punishWindows;
}

export function getDangerWindows(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): MatchupWindow[] {
  return getMatchup(championA, championB, role).dangerWindows;
}

export function getRecoveryWindows(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): MatchupWindow[] {
  return getMatchup(championA, championB, role).recoveryWindows;
}

// -- references -------------------------------------------------------------

export function getDecisionPriorities(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): MatchupDecisionPriority[] {
  return getMatchup(championA, championB, role).decisionPriorities;
}

export function getDecisionReferences(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): MatchupDecisionReference[] {
  return getMatchup(championA, championB, role).decisionReferences;
}

export function getCurriculumReferences(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): MatchupCurriculumReference[] {
  return getMatchup(championA, championB, role).curriculumReferences;
}

export function getHabitReferences(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): MatchupHabitReference[] {
  return getMatchup(championA, championB, role).habitReferences;
}

export function getPracticeReferences(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): MatchupPracticeReference[] {
  return getMatchup(championA, championB, role).practiceReferences;
}

export function getCommonMistakes(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): MatchupMistakeReference[] {
  return getMatchup(championA, championB, role).commonMistakes;
}

// -- Champion Intelligence integration (facts by reference only) -------------

/**
 * Whether Champion Intelligence can back both sides of this matchup. Used by
 * consumers to decide how much context they can rely on — never to invent it.
 */
export function getChampionAvailability(
  championA: string,
  championB: string,
): MatchupChampionAvailability {
  const a = championAvailable(championA);
  const b = championAvailable(championB);
  return { championA: a, championB: b, degraded: !a || !b };
}

/**
 * Champion identities for both sides, read from Champion Intelligence. Returns
 * the layer's own placeholder identities when Data Dragon is unavailable.
 */
export function getChampionContext(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
) {
  const roleContext = normalizeRoleContext(role);
  const asRole = roleContext === "any" ? undefined : (roleContext as RoleId);
  return {
    matchupId: makeMatchupId(championA, championB, roleContext),
    roleContext,
    availability: getChampionAvailability(championA, championB),
    championA: getChampionIdentity(championA, asRole),
    championB: getChampionIdentity(championB, asRole),
  };
}

/**
 * Graceful degradation contract: a structurally complete, knowledge-free
 * profile for a matchup nothing is registered for.
 */
export function safeFallback(
  championA: string,
  championB: string,
  role?: RoleId | MatchupRoleContext | string | null,
): MatchupProfileV1 {
  return { ...emptyMatchupProfileV1(championA, championB, normalizeRoleContext(role)), patch: PENDING };
}