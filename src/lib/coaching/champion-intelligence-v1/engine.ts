// ---------------------------------------------------------------------------
// Champion Intelligence Engine V1.
//
// The FINAL intelligence layer before external data. It is OPTIONAL by
// construction: every API resolves through Role Intelligence, the Curriculum
// and the League Decision Library first, and only *enriches* the result when a
// populated champion record exists. With an empty registry every call still
// returns complete, coachable material — identical to today's behavior.
//
// Pure + client-safe. No Riot API, no Data Dragon, no statistics, no champion
// hardcoding, no coaching copy authored here.
// ---------------------------------------------------------------------------
import { PENDING, isPending } from "../knowledge-base/types";
import type { RoleId } from "../knowledge-base/templates/champion";
import type { CurriculumTopicId } from "../knowledge-base/curriculum";
import { curriculumForRole } from "../knowledge-base/curriculum";
import { leagueDecisionsForRole, getLeagueDecision } from "../knowledge-base/league-decision-library";
import {
  inheritableRoleProfile,
  getRoleProfile,
  roleHabitLibrary,
  rolePracticeLibrary,
  safeRoleFallback,
  type InheritableRoleProfile,
  type RoleProfile,
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
import {
  emptyChampionIdentityV1,
  type ChampionIdentityV1,
  type ChampionPhilosophy,
} from "./identity";
import { hasChampionProfile, rawChampionProfile } from "./registry";

const DEFAULT_ROLE: RoleId = "adc";

function resolveRole(profile: ChampionProfileV1 | undefined, role?: RoleId): RoleId {
  if (role) return role;
  const p = profile?.primaryRole;
  if (p && !isPending(p)) return p;
  return DEFAULT_ROLE;
}

function wrap<T>(championId: string, role: RoleId, fromChampion: boolean, value: T): ChampionResolution<T> {
  return { championId, role, fromChampion, value };
}

/** The raw record, only when it exists AND is populated. */
export function get(championId: string): ChampionProfileV1 | undefined {
  return hasChampionProfile(championId) ? rawChampionProfile(championId) : undefined;
}

/** Always a valid profile — a placeholder record when unpopulated. */
export function getProfile(championId: string): ChampionProfileV1 {
  return get(championId) ?? emptyChampionProfileV1(championId);
}

/**
 * Build a philosophy slot from the champion record when possible, otherwise
 * inherit the ROLE's philosophy so coaching never degrades.
 */
function philosophy(
  base: ChampionPhilosophy,
  roleStatements: string[],
  championStatements: string[],
): ChampionPhilosophy {
  const statements = championStatements.length ? championStatements : roleStatements;
  return {
    fundamental: base.fundamental,
    summary: championStatements.length ? (championStatements[0] ?? PENDING) : (roleStatements[0] ?? PENDING),
    statements,
  };
}

function tendencyStatements(list: { tendency: string | typeof PENDING }[]): string[] {
  return list.map((t) => t.tendency).filter((t): t is string => !isPending(t));
}

function single(value: string | typeof PENDING): string[] {
  return isPending(value) ? [] : [value];
}

/**
 * The reusable ChampionIdentity. Champion fields are used when populated; every
 * remaining slot inherits Role Intelligence, so the object is always complete.
 */
export function getIdentity(championId: string, role?: RoleId): ChampionIdentityV1 {
  const p = get(championId);
  const r = resolveRole(p, role);
  const rp: RoleProfile = getRoleProfile(r);
  const id = emptyChampionIdentityV1(championId);

  if (!p) {
    return {
      ...id,
      primaryRole: r,
      lanePhilosophy: philosophy(id.lanePhilosophy, rp.primaryResponsibilities, []),
      teamfightPhilosophy: philosophy(id.teamfightPhilosophy, rp.teamfightResponsibilities, []),
      sideLanePhilosophy: philosophy(id.sideLanePhilosophy, rp.sideLaneResponsibilities, []),
      objectivePhilosophy: philosophy(id.objectivePhilosophy, rp.objectiveResponsibilities, []),
      waveManagementPhilosophy: philosophy(id.waveManagementPhilosophy, rp.wavePriority, []),
      recallPhilosophy: philosophy(id.recallPhilosophy, rp.recallPhilosophy, []),
      economyPhilosophy: philosophy(id.economyPhilosophy, rp.economyPhilosophy, []),
      visionPhilosophy: philosophy(id.visionPhilosophy, rp.visionResponsibilities, []),
      positioningPhilosophy: philosophy(id.positioningPhilosophy, rp.positioningPhilosophy, []),
      tradingPhilosophy: philosophy(id.tradingPhilosophy, rp.tempoPhilosophy, []),
      powerSpikePhilosophy: philosophy(id.powerSpikePhilosophy, rp.powerSpikePhilosophy, []),
      resourceManagementPhilosophy: philosophy(id.resourceManagementPhilosophy, [rp.primaryResource, rp.secondaryResource].filter(Boolean), []),
      winConditions: rp.primaryWinConditions,
      loseConditions: [],
      strengthLibrary: getStrengths(championId, r).value,
      weaknessLibrary: getWeaknesses(championId, r).value,
      practiceFocus: getPracticeFocus(championId, r).value,
      decisionOverrides: getDecisionAdjustments(championId, r).value,
      decisionLibraryReferences: getDecisionAdjustments(championId, r).value,
      curriculumReferences: getCurriculum(championId, r).value.references,
      roleIntelligenceOverrides: [],
      populated: false,
    };
  }

  return {
    ...id,
    championName: p.championName,
    championClass: p.championClass,
    championArchetype: isPending(p.championClass) ? PENDING : p.championClass,
    primaryRole: r,
    secondaryRoles: p.secondaryRoles,
    damageProfile: p.damageProfile,
    rangeType: p.rangeType,
    resourceType: p.resourceType,
    scalingCurve: p.scalingProfile,
    earlyGameIdentity: p.earlyGameIdentity,
    midGameIdentity: p.midGameIdentity,
    lateGameIdentity: p.lateGameIdentity,
    lanePhilosophy: philosophy(id.lanePhilosophy, rp.primaryResponsibilities, single(p.laneIdentity)),
    teamfightPhilosophy: philosophy(id.teamfightPhilosophy, rp.teamfightResponsibilities, single(p.teamfightIdentity)),
    sideLanePhilosophy: philosophy(id.sideLanePhilosophy, rp.sideLaneResponsibilities, single(p.sideLaneIdentity)),
    objectivePhilosophy: philosophy(id.objectivePhilosophy, rp.objectiveResponsibilities, p.objectiveStrengths),
    waveManagementPhilosophy: philosophy(id.waveManagementPhilosophy, rp.wavePriority, tendencyStatements(p.waveManagementTendencies)),
    recallPhilosophy: philosophy(id.recallPhilosophy, rp.recallPhilosophy, tendencyStatements(p.recallTendencies)),
    economyPhilosophy: philosophy(id.economyPhilosophy, rp.economyPhilosophy, p.economyPriorities),
    visionPhilosophy: philosophy(id.visionPhilosophy, rp.visionResponsibilities, tendencyStatements(p.visionTendencies)),
    positioningPhilosophy: philosophy(id.positioningPhilosophy, rp.positioningPhilosophy, []),
    tradingPhilosophy: philosophy(id.tradingPhilosophy, rp.tempoPhilosophy, []),
    powerSpikePhilosophy: philosophy(id.powerSpikePhilosophy, rp.powerSpikePhilosophy, []),
    resourceManagementPhilosophy: philosophy(id.resourceManagementPhilosophy, [rp.primaryResource, rp.secondaryResource].filter(Boolean), []),
    winConditions: p.winConditions.length ? p.winConditions : rp.primaryWinConditions,
    loseConditions: p.loseConditions,
    strengthLibrary: getStrengths(championId, r).value,
    weaknessLibrary: getWeaknesses(championId, r).value,
    practiceFocus: getPracticeFocus(championId, r).value,
    decisionOverrides: getDecisionAdjustments(championId, r).value,
    decisionLibraryReferences: getDecisionAdjustments(championId, r).value,
    curriculumReferences: getCurriculum(championId, r).value.references,
    roleIntelligenceOverrides: p.roleOverrides,
    source: p.source,
    patch: p.patch,
    populated: true,
  };
}

/** How the champion adjusts its role — role profile plus champion overrides. */
export function getRoleAdjustments(
  championId: string,
  role?: RoleId,
): ChampionResolution<{ role: InheritableRoleProfile; overrides: ChampionRoleOverride[] }> {
  const p = get(championId);
  const r = resolveRole(p, role);
  const overrides = (p?.roleOverrides ?? []).filter((o) => o.role === r);
  return wrap(championId, r, overrides.length > 0, { role: inheritableRoleProfile(r), overrides });
}

/** Decision Library weighting — neutral multipliers when no champion data. */
export function getDecisionAdjustments(
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
    note: PENDING,
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
  const fallback: ChampionPracticeFocus[] = rolePracticeLibrary(r).map((x) => ({
    label: x.label,
    fundamental: x.fundamental,
    measurable: x.measurable,
  }));
  return wrap(championId, r, false, fallback);
}

/** Curriculum topics — role-derived unless the champion refines them. */
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

/** Strength library — role strength habits when champion data is absent. */
export function getStrengths(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionCoachingPoint[]> {
  const p = get(championId);
  const r = resolveRole(p, role);
  if (p?.commonStrengths.length) return wrap(championId, r, true, p.commonStrengths);
  const fallback: ChampionCoachingPoint[] = roleHabitLibrary(r, "strength").map((h) => ({
    label: h.label,
    fundamental: h.fundamental,
    explanation: PENDING,
  }));
  return wrap(championId, r, false, fallback);
}

/** Weakness library — mirror of `getStrengths`. */
export function getWeaknesses(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionCoachingPoint[]> {
  const p = get(championId);
  const r = resolveRole(p, role);
  if (p?.commonMistakes.length) return wrap(championId, r, true, p.commonMistakes);
  const fallback: ChampionCoachingPoint[] = roleHabitLibrary(r, "mistake").map((h) => ({
    label: h.label,
    fundamental: h.fundamental,
    explanation: PENDING,
  }));
  return wrap(championId, r, false, fallback);
}

/** Power spike references. Empty until a data source populates them. */
export function getPowerSpikes(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionPowerSpikeReference[]> {
  const p = get(championId);
  const r = resolveRole(p, role);
  return wrap(championId, r, Boolean(p?.powerSpikeReferences.length), p?.powerSpikeReferences ?? []);
}

/**
 * The guaranteed-coaching escape hatch: complete material from a role alone.
 */
export function safeFallback(role?: RoleId): InheritableRoleProfile {
  return safeRoleFallback(role ?? DEFAULT_ROLE);
}

/** True when champion-specific coaching is available (never required). */
export function isAvailable(championId: string): boolean {
  return hasChampionProfile(championId);
}

/** Namespaced facade — the only surface consumers should depend on. */
export const ChampionIntelligence = {
  get,
  getProfile,
  getIdentity,
  getRoleAdjustments,
  getDecisionAdjustments,
  getPracticeFocus,
  getCurriculum,
  getStrengths,
  getWeaknesses,
  getPowerSpikes,
  safeFallback,
  isAvailable,
} as const;

export type ChampionIntelligenceEngine = typeof ChampionIntelligence;
