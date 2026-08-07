// ---------------------------------------------------------------------------
// Champion Intelligence V1 — public facade.
//
// The FINAL intelligence layer before external data, and entirely OPTIONAL:
// every API resolves through Role Intelligence / Curriculum / Decision Library
// first and only enriches when a populated champion record exists. With the
// registry empty (today), coaching output is identical to before this layer.
//
// Pure + client-safe. No Riot API, no Data Dragon, no statistics.
// ---------------------------------------------------------------------------
import type { RoleId } from "../knowledge-base/templates/champion";
import {
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
} from "./engine";
import { getRoleProfile } from "../role-intelligence-v1";
import type { ChampionResolution } from "./types";

export * from "./types";
export * from "./registry";
export * from "./identity";
export * from "./engine";

/** Win / lose conditions, inherited from the role when unpopulated. */
export function getWinConditions(
  championId: string,
  role?: RoleId,
): ChampionResolution<{ win: string[]; lose: string[] }> {
  const identity = getIdentity(championId, role);
  const resolvedRole = role ?? (identity.primaryRole === "__pending__" ? "adc" : identity.primaryRole);
  const rp = getRoleProfile(resolvedRole);
  return {
    championId,
    role: resolvedRole,
    fromChampion: identity.populated && identity.winConditions !== rp.primaryWinConditions,
    value: { win: identity.winConditions, lose: identity.loseConditions },
  };
}

/** Backwards-compatible aliases kept so existing consumers stay untouched. */
export const getRoleExpression = getRoleAdjustments;
export const getDecisionOverrides = getDecisionAdjustments;
export const getCommonStrengths = getStrengths;
export const getCommonMistakes = getWeaknesses;
export const isPopulated = isAvailable;

export const ChampionIntelligenceV1 = {
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
  // aliases
  getRoleExpression: getRoleAdjustments,
  getDecisionOverrides: getDecisionAdjustments,
  getCommonStrengths: getStrengths,
  getCommonMistakes: getWeaknesses,
  getWinConditions,
  isPopulated: isAvailable,
} as const;

export type ChampionIntelligenceFacade = typeof ChampionIntelligenceV1;
