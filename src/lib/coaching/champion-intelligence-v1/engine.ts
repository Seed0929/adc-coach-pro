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
  emptyCapabilityProfile,
  emptyDifficultyProfile,
  emptyScalingCurve,
  emptyStyleProfile,
  type ChampionCapabilityProfile,
  type ChampionCoachingPoint,
  type ChampionCurriculumReference,
  type ChampionDecisionReference,
  type ChampionDifficultyProfile,
  type ChampionHabitReference,
  type ChampionPowerSpikeReference,
  type ChampionPracticeFocus,
  type ChampionPriority,
  type ChampionProfileV1,
  type ChampionReplayReference,
  type ChampionResolution,
  type ChampionRoleOverride,
  type ChampionScalingPoint,
  type ChampionStyleProfile,
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
 * Ordered power-spike timeline. Falls back to the flat reference list, then to
 * an empty timeline — the pipeline treats it as optional enrichment.
 */
export function getPowerSpikeTimeline(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionPowerSpikeReference[]> {
  const p = get(championId);
  const r = resolveRole(p, role);
  const order: Record<string, number> = { early: 0, mid: 1, late: 2 };
  const list = (p?.powerSpikeTimeline.length ? p.powerSpikeTimeline : p?.powerSpikeReferences) ?? [];
  const sorted = [...list].sort(
    (a, b) => (order[a.timing ?? "mid"] ?? 1) - (order[b.timing ?? "mid"] ?? 1),
  );
  return wrap(championId, r, sorted.length > 0, sorted);
}

/** Capability matrix (peel / engage / pick / split push / ...). */
export function getCapabilities(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionCapabilityProfile> {
  const p = get(championId);
  const r = resolveRole(p, role);
  return wrap(championId, r, Boolean(p), p?.capabilities ?? emptyCapabilityProfile());
}

/** Playstyle descriptors, inheriting Role Intelligence for empty slots. */
export function getStyle(championId: string, role?: RoleId): ChampionResolution<ChampionStyleProfile> {
  const p = get(championId);
  const r = resolveRole(p, role);
  const rp = getRoleProfile(r);
  const base = p?.style ?? emptyStyleProfile();
  const inherit = (value: string | typeof PENDING, roleValue?: string): string | typeof PENDING =>
    isPending(value) ? (roleValue ?? PENDING) : value;
  return wrap(championId, r, Boolean(p), {
    tradingStyle: inherit(base.tradingStyle, rp.tempoPhilosophy[0]),
    waveclearProfile: inherit(base.waveclearProfile, rp.wavePriority[0]),
    roamProfile: inherit(base.roamProfile, rp.sideLaneResponsibilities[0]),
    positioningPhilosophy: inherit(base.positioningPhilosophy, rp.positioningPhilosophy[0]),
    spacingPhilosophy: inherit(base.spacingPhilosophy, rp.positioningPhilosophy[1] ?? rp.positioningPhilosophy[0]),
    recoveryPhilosophy: inherit(base.recoveryPhilosophy, rp.recallPhilosophy[0]),
    recallPhilosophy: inherit(base.recallPhilosophy, rp.recallPhilosophy[0]),
  });
}

/** Difficulty triad. Only Riot's own rating is ever populated automatically. */
export function getDifficulty(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionDifficultyProfile> {
  const p = get(championId);
  const r = resolveRole(p, role);
  return wrap(championId, r, Boolean(p), p?.difficulty ?? emptyDifficultyProfile());
}

/** Structured early / mid / late scaling curve. */
export function getScalingCurve(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionScalingPoint[]> {
  const p = get(championId);
  const r = resolveRole(p, role);
  const curve = p?.scalingCurve.length ? p.scalingCurve : emptyScalingCurve();
  return wrap(championId, r, Boolean(p?.scalingCurve.length), curve);
}

function priorities(
  list: ChampionPriority[] | undefined,
  roleStatements: string[],
  fundamental: ChampionPriority["fundamental"],
): { value: ChampionPriority[]; fromChampion: boolean } {
  if (list?.length) return { value: list, fromChampion: true };
  return {
    value: roleStatements.map((priority, i) => ({ fundamental, priority, rank: i + 1 })),
    fromChampion: false,
  };
}

/** Vision priorities — role vision responsibilities when unpopulated. */
export function getVisionPriorities(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionPriority[]> {
  const p = get(championId);
  const r = resolveRole(p, role);
  const out = priorities(p?.visionPriorities, getRoleProfile(r).visionResponsibilities, "vision");
  return wrap(championId, r, out.fromChampion, out.value);
}

/** Economy priorities — role economy philosophy when unpopulated. */
export function getEconomyPriorities(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionPriority[]> {
  const p = get(championId);
  const r = resolveRole(p, role);
  const out = priorities(p?.economyPriorityList, getRoleProfile(r).economyPhilosophy, "economy");
  return wrap(championId, r, out.fromChampion, out.value);
}

/** Resource priorities — role resources when unpopulated. */
export function getResourcePriorities(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionPriority[]> {
  const p = get(championId);
  const r = resolveRole(p, role);
  const rp = getRoleProfile(r);
  const out = priorities(
    p?.resourcePriorities,
    [rp.primaryResource, rp.secondaryResource].filter(Boolean),
    "resource-management",
  );
  return wrap(championId, r, out.fromChampion, out.value);
}

/** Habit Intelligence references. Empty until populated — never invented. */
export function getHabitReferences(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionHabitReference[]> {
  const p = get(championId);
  const r = resolveRole(p, role);
  if (p?.habitReferences.length) return wrap(championId, r, true, p.habitReferences);
  const fallback: ChampionHabitReference[] = roleHabitLibrary(r, "mistake").map((h) => ({
    habitId: `${r}:${h.fundamental}`,
    fundamental: h.fundamental,
    note: PENDING,
  }));
  return wrap(championId, r, false, fallback);
}

/** Replay Intelligence references. */
export function getReplayReferences(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionReplayReference[]> {
  const p = get(championId);
  const r = resolveRole(p, role);
  return wrap(championId, r, Boolean(p?.replayReferences.length), p?.replayReferences ?? []);
}

/** Practice priorities — mirrors practice focus when not separately populated. */
export function getPracticePriorities(
  championId: string,
  role?: RoleId,
): ChampionResolution<ChampionPracticeFocus[]> {
  const p = get(championId);
  const r = resolveRole(p, role);
  if (p?.practicePriorities.length) return wrap(championId, r, true, p.practicePriorities);
  return getPracticeFocus(championId, role);
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
  getPracticePriorities,
  getCurriculum,
  getStrengths,
  getWeaknesses,
  getPowerSpikes,
  getPowerSpikeTimeline,
  getCapabilities,
  getStyle,
  getDifficulty,
  getScalingCurve,
  getVisionPriorities,
  getEconomyPriorities,
  getResourcePriorities,
  getHabitReferences,
  getReplayReferences,
  safeFallback,
  isAvailable,
} as const;

export type ChampionIntelligenceEngine = typeof ChampionIntelligence;
