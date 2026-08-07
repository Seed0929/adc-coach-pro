// ---------------------------------------------------------------------------
// Item Intelligence Engine V1 — deterministic accessors (Sprint 4.6).
//
// Reads the registry ONLY. It never fetches, never ranks, never recommends and
// never infers coaching from Riot stats. When an item is unknown, every
// accessor returns the canonical empty profile so consumers keep working.
// ---------------------------------------------------------------------------
import { PENDING, isPending } from "../knowledge-base/types";
import {
  emptyItemProfileV1,
  type ItemCurriculumReference,
  type ItemDecisionReference,
  type ItemHabitReference,
  type ItemIdentity,
  type ItemMistakeLibrary,
  type ItemOfficialMetadata,
  type ItemPhaseValue,
  type ItemPhilosophy,
  type ItemPracticeReference,
  type ItemProfileV1,
  type ItemReplayReference,
  type ItemResolution,
  type ItemRiskProfile,
  type ItemValueMatrix,
} from "./types";
import { allItemProfiles, hasItemCoaching, rawItemProfile } from "./registry";

function resolve<T>(itemId: string | number, value: T, fromItem: boolean): ItemResolution<T> {
  return { itemId: String(itemId), fromItem, value };
}

/** The profile for an item, or the canonical empty profile when unknown. */
export function getProfile(itemId: string | number): ItemProfileV1 {
  return rawItemProfile(itemId) ?? emptyItemProfileV1(String(itemId));
}

/** Null-returning lookup for consumers that want to branch explicitly. */
export function get(itemId: string | number): ItemProfileV1 | null {
  return rawItemProfile(itemId) ?? null;
}

export function isAvailable(itemId: string | number): boolean {
  return Boolean(rawItemProfile(itemId));
}

/** True when a future coaching layer has populated this item. */
export function isCoachingPopulated(itemId: string | number): boolean {
  return hasItemCoaching(itemId);
}

// -- Riot facts --------------------------------------------------------------

export function getOfficial(itemId: string | number): ItemResolution<ItemOfficialMetadata | null> {
  const p = rawItemProfile(itemId);
  return resolve(itemId, p?.official ?? null, Boolean(p?.official));
}

export function getName(itemId: string | number): string {
  return rawItemProfile(itemId)?.official?.name ?? "";
}

export function getIcon(itemId: string | number): string {
  return rawItemProfile(itemId)?.official?.image ?? "";
}

export function getStats(itemId: string | number): Record<string, number> {
  return rawItemProfile(itemId)?.official?.stats ?? {};
}

export function getGold(itemId: string | number) {
  return (
    rawItemProfile(itemId)?.official?.gold ?? { total: 0, base: 0, sell: 0, purchasable: false }
  );
}

export function getBuildPath(itemId: string | number): { components: string[]; buildsInto: string[]; depth: number } {
  const o = rawItemProfile(itemId)?.official;
  return { components: o?.components ?? [], buildsInto: o?.buildsInto ?? [], depth: o?.depth ?? 0 };
}

export function getEffectText(itemId: string | number): string {
  return rawItemProfile(itemId)?.official?.effectText ?? "";
}

export function getTags(itemId: string | number): string[] {
  return rawItemProfile(itemId)?.official?.officialTags ?? [];
}

export function getPatch(itemId: string | number): string {
  const patch = rawItemProfile(itemId)?.patch;
  return !patch || isPending(patch) ? "" : patch;
}

// -- structured coaching slots (placeholders today) --------------------------

export function getIdentity(itemId: string | number): ItemResolution<ItemIdentity> {
  const p = getProfile(itemId);
  return resolve(itemId, p.identity, !isPending(p.identity.primaryPurpose));
}

export function getPowerSpikeType(itemId: string | number) {
  const p = getProfile(itemId);
  return resolve(itemId, p.identity.powerSpikeType, !isPending(p.identity.powerSpikeType));
}

export function getPhaseValue(itemId: string | number): ItemResolution<ItemPhaseValue> {
  const p = getProfile(itemId);
  const known = Object.values(p.phaseValue).some((v) => !isPending(v));
  return resolve(itemId, p.phaseValue, known);
}

export function getValueMatrix(itemId: string | number): ItemResolution<ItemValueMatrix> {
  const p = getProfile(itemId);
  const known = Object.values(p.value).some((v) => !isPending(v));
  return resolve(itemId, p.value, known);
}

export function getRiskProfile(itemId: string | number): ItemResolution<ItemRiskProfile> {
  const p = getProfile(itemId);
  return resolve(itemId, p.riskProfile, !isPending(p.riskProfile));
}

export function getPhilosophy(itemId: string | number): ItemResolution<ItemPhilosophy> {
  const p = getProfile(itemId);
  const known = Object.values(p.philosophy).some((v) => !isPending(v));
  return resolve(itemId, p.philosophy, known);
}

export function getMistakes(itemId: string | number): ItemResolution<ItemMistakeLibrary> {
  const p = getProfile(itemId);
  return resolve(itemId, p.mistakes, p.mistakes.purchase.length + p.mistakes.delay.length > 0);
}

export function getDecisionReferences(itemId: string | number): ItemDecisionReference[] {
  return getProfile(itemId).decisionReferences;
}

export function getCurriculumReferences(itemId: string | number): ItemCurriculumReference[] {
  return getProfile(itemId).curriculumReferences;
}

export function getHabitReferences(itemId: string | number): ItemHabitReference[] {
  return getProfile(itemId).habitReferences;
}

export function getReplayReferences(itemId: string | number): ItemReplayReference[] {
  return getProfile(itemId).replayReferences;
}

export function getPracticeReferences(itemId: string | number): ItemPracticeReference[] {
  return getProfile(itemId).practiceReferences;
}

// -- collection helpers (facts only) ----------------------------------------

/** All registered items carrying a Riot tag — factual lookup, not a build. */
export function byTag(tag: string): ItemProfileV1[] {
  const needle = tag.trim().toLowerCase();
  return allItemProfiles().filter((p) =>
    (p.official?.officialTags ?? []).some((t) => t.toLowerCase() === needle),
  );
}

export function findByName(name: string): ItemProfileV1 | null {
  const needle = name.trim().toLowerCase();
  return allItemProfiles().find((p) => (p.official?.name ?? "").toLowerCase() === needle) ?? null;
}

/** Riot component ids resolved into profiles, skipping anything unknown. */
export function getComponents(itemId: string | number): ItemProfileV1[] {
  return getBuildPath(itemId)
    .components.map((id) => rawItemProfile(id))
    .filter((p): p is ItemProfileV1 => Boolean(p));
}

/**
 * Graceful degradation contract: a structurally complete, placeholder-only
 * profile for an item Riot has no record of.
 */
export function safeFallback(itemId: string | number): ItemProfileV1 {
  return { ...emptyItemProfileV1(String(itemId)), patch: PENDING };
}
