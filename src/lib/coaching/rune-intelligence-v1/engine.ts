// ---------------------------------------------------------------------------
// Rune Intelligence Engine V1 — deterministic accessors (Sprint 4.7).
//
// Reads the registry ONLY. It never fetches, never ranks, never recommends and
// never infers coaching from Riot text. When a rune is unknown, every accessor
// returns the canonical empty profile so consumers keep working.
// ---------------------------------------------------------------------------
import { PENDING, isPending } from "../knowledge-base/types";
import {
  emptyRuneProfileV1,
  type RuneCurriculumReference,
  type RuneDecisionReference,
  type RuneHabitReference,
  type RuneIdentity,
  type RuneOfficialMetadata,
  type RunePracticeReference,
  type RuneProfileV1,
  type RuneRecoveryReference,
  type RuneReplayReference,
  type RuneResolution,
  type RuneScalingProfile,
  type RuneValueMatrix,
} from "./types";
import { allRuneProfiles, hasRuneCoaching, rawRuneProfile } from "./registry";

function idOf(rune: number | string, profile?: RuneProfileV1): number {
  if (profile) return profile.runeId;
  const numeric = typeof rune === "number" ? rune : Number(rune);
  return Number.isFinite(numeric) ? numeric : 0;
}

function resolve<T>(rune: number | string, value: T, fromRune: boolean, profile?: RuneProfileV1): RuneResolution<T> {
  return { runeId: idOf(rune, profile), fromRune, value };
}

/** The profile for a rune, or the canonical empty profile when unknown. */
export function getProfile(rune: number | string): RuneProfileV1 {
  return rawRuneProfile(rune) ?? emptyRuneProfileV1(idOf(rune));
}

/** Null-returning lookup for consumers that want to branch explicitly. */
export function get(rune: number | string): RuneProfileV1 | null {
  return rawRuneProfile(rune) ?? null;
}

export function isAvailable(rune: number | string): boolean {
  return Boolean(rawRuneProfile(rune));
}

/** True when a future coaching layer has populated this rune. */
export function isCoachingPopulated(rune: number | string): boolean {
  return hasRuneCoaching(rune);
}

// -- Riot facts --------------------------------------------------------------

export function getOfficial(rune: number | string): RuneResolution<RuneOfficialMetadata | null> {
  const p = rawRuneProfile(rune);
  return resolve(rune, p?.official ?? null, Boolean(p?.official), p);
}

export function getName(rune: number | string): string {
  return rawRuneProfile(rune)?.official?.name ?? "";
}

export function getIcon(rune: number | string): string {
  return rawRuneProfile(rune)?.official?.icon ?? "";
}

export function getOfficialText(rune: number | string): string {
  return rawRuneProfile(rune)?.official?.officialText ?? "";
}

export function getDescription(rune: number | string): { short: string; long: string } {
  const o = rawRuneProfile(rune)?.official;
  return { short: o?.shortDesc ?? "", long: o?.longDesc ?? "" };
}

export function getTree(rune: number | string): { id: number; key: string; name: string; icon: string } | null {
  const o = rawRuneProfile(rune)?.official;
  return o ? { id: o.treeId, key: o.treeKey, name: o.treeName, icon: o.treeIcon } : null;
}

export function getSlot(rune: number | string): RuneResolution<{ slot: number; slotType: RuneOfficialMetadata["slotType"] }> {
  const p = rawRuneProfile(rune);
  return resolve(
    rune,
    { slot: p?.official?.slot ?? -1, slotType: p?.official?.slotType ?? PENDING },
    Boolean(p?.official),
    p,
  );
}

export function isKeystone(rune: number | string): boolean {
  return Boolean(rawRuneProfile(rune)?.official?.isKeystone);
}

export function getTags(rune: number | string): string[] {
  return rawRuneProfile(rune)?.official?.tags ?? [];
}

export function getPatch(rune: number | string): string {
  const patch = rawRuneProfile(rune)?.patch;
  return !patch || isPending(patch) ? "" : patch;
}

// -- structured coaching slots (placeholders today) --------------------------

export function getIdentity(rune: number | string): RuneResolution<RuneIdentity> {
  const p = getProfile(rune);
  return resolve(rune, p.identity, !isPending(p.identity.primaryPurpose), p);
}

export function getScalingProfile(rune: number | string): RuneResolution<RuneScalingProfile> {
  const p = getProfile(rune);
  return resolve(rune, p.identity.scalingProfile, !isPending(p.identity.scalingProfile), p);
}

export function getValueMatrix(rune: number | string): RuneResolution<RuneValueMatrix> {
  const p = getProfile(rune);
  const known = Object.values(p.value).some((v) => !isPending(v));
  return resolve(rune, p.value, known, p);
}

export function getDecisionReferences(rune: number | string): RuneDecisionReference[] {
  return getProfile(rune).decisionReferences;
}

export function getCurriculumReferences(rune: number | string): RuneCurriculumReference[] {
  return getProfile(rune).curriculumReferences;
}

export function getHabitReferences(rune: number | string): RuneHabitReference[] {
  return getProfile(rune).habitReferences;
}

export function getReplayReferences(rune: number | string): RuneReplayReference[] {
  return getProfile(rune).replayReferences;
}

export function getPracticeReferences(rune: number | string): RunePracticeReference[] {
  return getProfile(rune).practiceReferences;
}

export function getRecoveryReferences(rune: number | string): RuneRecoveryReference[] {
  return getProfile(rune).recoveryReferences;
}

// -- collection helpers (facts only) ----------------------------------------

export function byTree(treeIdOrKey: number | string): RuneProfileV1[] {
  const needle = String(treeIdOrKey).toLowerCase();
  return allRuneProfiles().filter(
    (p) =>
      String(p.official?.treeId) === needle ||
      (p.official?.treeKey ?? "").toLowerCase() === needle ||
      (p.official?.treeName ?? "").toLowerCase() === needle,
  );
}

export function keystones(): RuneProfileV1[] {
  return allRuneProfiles().filter((p) => p.official?.isKeystone);
}

export function bySlot(slot: number): RuneProfileV1[] {
  return allRuneProfiles().filter((p) => p.official?.slot === slot);
}

export function findByName(name: string): RuneProfileV1 | null {
  const needle = name.trim().toLowerCase();
  return allRuneProfiles().find((p) => (p.official?.name ?? "").toLowerCase() === needle) ?? null;
}

/**
 * Graceful degradation contract: a structurally complete, placeholder-only
 * profile for a rune Riot has no loadable record of.
 */
export function safeFallback(rune: number | string): RuneProfileV1 {
  return { ...emptyRuneProfileV1(idOf(rune)), patch: PENDING };
}
