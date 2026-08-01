// ---------------------------------------------------------------------------
// Champion Intelligence Framework V1 — public facade.
//
// OPTIONAL layer. Every API resolves through Role Intelligence first and only
// enriches the result when a populated ChampionProfile exists. No coaching
// surface is required to know whether champion data is available, and the
// existing coaching engine keeps behaving exactly as it does today.
//
// Pure + client-safe. No Riot API, no Data Dragon, no statistics.
// ---------------------------------------------------------------------------
import type { RoleId } from "../knowledge-base/templates/champion";
import type { CurriculumTopicId } from "../knowledge-base/curriculum";
import { curriculumForRole } from "../knowledge-base/curriculum";
import { leagueDecisionsForRole, getLeagueDecision } from "../knowledge-base/league-decision-library";
import {
  inheritableRoleProfile,
  roleHabitLibrary,
  rolePracticeLibrary,
  safeRoleFallback,
  type InheritableRoleProfile,
  type RolePracticeItem,
} from "../role-intelligence-v1";
import {
  emptyChampionProfileV1,
  type ChampionCoachingPoint,
  type ChampionCurriculumReference,
  type ChampionDecisionReference,
  type ChampionPowerSpikeReference,
  type ChampionPracticeFocus,
  type ChampionProfileV1,
  type ChampionResolution,
  type ChampionRoleOverride,
} from "./types";
import { hasChampionProfile, rawChampionProfile } from "./registry";

export * from "./types";
export * from "./registry";

const DEFAULT_ROLE: RoleId = "adc";

function resolveRole(profile: ChampionProfileV1 | undefined, role?: RoleId): RoleId {
  if (role) return role;
  const p = profile?.primaryRole;
  if (p && p !== "__pending__") return p;
  return DEFAULT_ROLE;
}

function wrap<T>(championId: string, role: RoleId, fromChampion: boolean, value: T): ChampionResolution<T> {
  return { championId, role, fromChampion, value };
}

/**
 * The raw record when (and only when) it exists and is populated. Consumers
 * should prefer `getProfile()` which never returns undefined.
 */
export function get(championId: string): ChampionProfileV1 | undefined {
  return hasChampionProfile(championId) ? rawChampionProfile(championId) : undefined;
}

/** Always returns a valid profile — a placeholder record when unpopulated. */
export function getProfile(championId: string): ChampionProfileV1 {
  return get(championId) ?? emptyChampionProfileV1(championId);
}

/**
 * How a champion expresses its role. Falls back to the pure Role Intelligence
 * profile, and layers champion overrides on top when available.
 */
export function getRoleExpression(
  championId: string,
  role?: RoleId,
): ChampionResolution<{ role: InheritableRoleProfile; overrides: ChampionRoleOverride[] }> {
  const p = get(championId);
  const r = resolveRole(p, role);
  const overrides = (p?.roleOverrides ?? []).filter((o) => o.role === r);
  return wrap(championId, r, Boolean(p), { role: inheritableRoleProfile(r), overrides });
}

/** Curriculum topics to teach. Role-derived unless the champion refines it. */
export function getCurriculum(
  championId: string,
  role?: RoleId,
): ChampionResolution<{ topics: CurriculumTopicId[]; references: ChampionCurriculumReference[] }> {
  const p = get(championId);
  const r = resolveRole(p, role);
  const roleTopics = curriculumForRole(r).map((t) => t.id);
  const refs = p?.curriculumReferences ?? [];
  const topics = refs.length
    ? Array.from(new Set([...refs.map((x) => x.topic), ...roleTopics]))
    : roleTopics;
  return wrap(championId, r, refs.length > 0, { topics, references: refs });
}

/**
 * Decision Library weighting for this champion. When no champion data exists
 * the role's decisions are returned with a neutral multiplier.
 */
export function getDecisionOverrides(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionDecisionReference[]> {
  const p = get(championId);
  const r = resolveRole(p, role);
  const refs = (p?.decisionLibraryReferences ?? []).filter((x) => getLeagueDecision(x.decisionId));
  if (refs.length) return wrap(championId, r, true, refs);
  const fallback: ChampionDecisionReference[] = leagueDecisionsForRole(r).map((d) => ({
    decisionId: d.id,
    weightMultiplier: 1,
    note: "__pending__",
  }));
  return wrap(championId, r, false, fallback);
}

/** Power spike references. Empty until Data Dragon populates them. */
export function getPowerSpikes(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionPowerSpikeReference[]> {
  const p = get(championId);
  const r = resolveRole(p, role);
  return wrap(championId, r, Boolean(p?.powerSpikeReferences.length), p?.powerSpikeReferences ?? []);
}

/** Win conditions — role win conditions unless the champion defines its own. */
export function getWinConditions(
  championId: string,
  role?: RoleId,
): ChampionResolution<{ win: string[]; lose: string[] }> {
  const p = get(championId);
  const r = resolveRole(p, role);
  if (p?.winConditions.length) {
    return wrap(championId, r, true, { win: p.winConditions, lose: p.loseConditions });
  }
  const rp = inheritableRoleProfile(r);
  return wrap(championId, r, false, { win: rp.primaryWinConditions, lose: [] });
}

/** Common mistakes — role habit library when champion data is absent. */
export function getCommonMistakes(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionCoachingPoint[]> {
  const p = get(championId);
  const r = resolveRole(p, role);
  if (p?.commonMistakes.length) return wrap(championId, r, true, p.commonMistakes);
  const fallback: ChampionCoachingPoint[] = roleHabitLibrary(r, "mistake").map((h) => ({
    label: h.label,
    fundamental: h.fundamental,
    explanation: "__pending__",
  }));
  return wrap(championId, r, false, fallback);
}

/** Common strengths — mirror of `getCommonMistakes`. */
export function getCommonStrengths(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionCoachingPoint[]> {
  const p = get(championId);
  const r = resolveRole(p, role);
  if (p?.commonStrengths.length) return wrap(championId, r, true, p.commonStrengths);
  const fallback: ChampionCoachingPoint[] = roleHabitLibrary(r, "strength").map((h) => ({
    label: h.label,
    fundamental: h.fundamental,
    explanation: "__pending__",
  }));
  return wrap(championId, r, false, fallback);
}

/** Practice focus — role practice library when champion data is absent. */
export function getPracticeFocus(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionPracticeFocus[]> {
  const p = get(championId);
  const r = resolveRole(p, role);
  if (p?.practiceFocus.length) return wrap(championId, r, true, p.practiceFocus);
  const fallback: ChampionPracticeFocus[] = rolePracticeLibrary(r).map((x: RolePracticeItem) => ({
    label: x.label,
    fundamental: x.fundamental,
    measurable: x.measurable,
  }));
  return wrap(championId, r, false, fallback);
}

/**
 * The guaranteed-coaching escape hatch. Any surface can call this with only a
 * role and still produce complete coaching material.
 */
export function safeFallback(role?: RoleId): InheritableRoleProfile {
  return safeRoleFallback(role ?? DEFAULT_ROLE);
}

/** True when champion-specific coaching is available (never required). */
export function isPopulated(championId: string): boolean {
  return hasChampionProfile(championId);
}

/**
 * Namespaced facade — mirrors LeagueIntelligence / RoleIntelligenceV1 so the
 * data source can change without touching any consumer.
 */
export const ChampionIntelligenceV1 = {
  get,
  getProfile,
  getRoleExpression,
  getCurriculum,
  getDecisionOverrides,
  getPowerSpikes,
  getWinConditions,
  getCommonMistakes,
  getCommonStrengths,
  getPracticeFocus,
  getPracticeFocusFallback: safeFallback,
  safeFallback,
  isPopulated,
} as const;

export type ChampionIntelligenceFacade = typeof ChampionIntelligenceV1;