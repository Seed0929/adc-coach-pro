// ---------------------------------------------------------------------------
// Item Intelligence V1 — public facade (Sprint 4.6).
//
// The permanent reusable knowledge layer between Data Dragon and coaching.
// Consumed by Champion Intelligence, Replay Coach, Practice Planner, the
// Decision Engine, Match Reports, Unified Coaching Context and the future AI
// Coach. Entirely additive and optional: with the registry empty, every
// consumer receives the canonical placeholder profile and behaves as before.
// ---------------------------------------------------------------------------
export * from "./types";
export * from "./registry";
export * from "./engine";

import {
  get,
  getProfile,
  getOfficial,
  getName,
  getIcon,
  getStats,
  getGold,
  getBuildPath,
  getEffectText,
  getTags,
  getPatch,
  getIdentity,
  getPowerSpikeType,
  getPhaseValue,
  getValueMatrix,
  getRiskProfile,
  getPhilosophy,
  getMistakes,
  getDecisionReferences,
  getCurriculumReferences,
  getHabitReferences,
  getReplayReferences,
  getPracticeReferences,
  getComponents,
  byTag,
  findByName,
  isAvailable,
  isCoachingPopulated,
  safeFallback,
} from "./engine";
import {
  allItemProfiles,
  clearItemProfiles,
  hydrateItemIntelligence,
  registerItemProfiles,
  registeredItemCount,
  registeredItemIds,
} from "./registry";

export const ItemIntelligenceV1 = {
  get,
  getProfile,
  getOfficial,
  getName,
  getIcon,
  getStats,
  getGold,
  getBuildPath,
  getEffectText,
  getTags,
  getPatch,
  getIdentity,
  getPowerSpikeType,
  getPhaseValue,
  getValueMatrix,
  getRiskProfile,
  getPhilosophy,
  getMistakes,
  getDecisionReferences,
  getCurriculumReferences,
  getHabitReferences,
  getReplayReferences,
  getPracticeReferences,
  getComponents,
  byTag,
  findByName,
  isAvailable,
  isCoachingPopulated,
  safeFallback,
  all: allItemProfiles,
  ids: registeredItemIds,
  count: registeredItemCount,
  register: registerItemProfiles,
  clear: clearItemProfiles,
  hydrate: hydrateItemIntelligence,
} as const;

export type ItemIntelligenceV1Facade = typeof ItemIntelligenceV1;
