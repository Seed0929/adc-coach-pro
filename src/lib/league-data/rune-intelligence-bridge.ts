// ---------------------------------------------------------------------------
// Data Dragon → Rune Intelligence bridge (Sprint 4.7).
//
//   League Data Providers → Data Dragon Provider → [this bridge]
//   → Rune Intelligence → Coaching Engine
//
// The ONLY place where Riot rune facts enter the coaching architecture. It maps
// validated Data Dragon runes onto the permanent RuneProfileV1 shape and
// registers them. It does NOT calculate coaching, recommend runes, infer builds
// or produce champion advice.
// ---------------------------------------------------------------------------
import {
  emptyRuneProfileV1,
  type RuneOfficialMetadata,
  type RuneProfileV1,
  type RuneSlotType,
} from "../coaching/rune-intelligence-v1/types";
import {
  rawRuneProfile,
  registerRuneProfiles,
} from "../coaching/rune-intelligence-v1/registry";
import { allRunes, currentPatch, loadLeagueData, resolveRune, resolveRuneTree } from "./provider";
import type { RuneData } from "./types";

function stripMarkup(text: string): string {
  return (text ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function slotType(rune: RuneData): RuneSlotType {
  if (rune.slot === 0) return "keystone";
  if (rune.slot > 0) return "minor";
  return "unknown";
}

/** Riot-derived descriptors only — tree + slot classification, no opinions. */
function tags(rune: RuneData): string[] {
  const list = [rune.treeKey, rune.treeName, slotType(rune)].filter(
    (t): t is string => typeof t === "string" && t.length > 0,
  );
  return Array.from(new Set(list));
}

function toOfficial(rune: RuneData): RuneOfficialMetadata {
  const tree = resolveRuneTree(rune.treeId);
  return {
    dataDragonId: rune.id,
    key: rune.key,
    name: rune.name,
    shortDesc: stripMarkup(rune.shortDesc),
    longDesc: stripMarkup(rune.longDesc),
    officialText: rune.longDesc ?? rune.shortDesc ?? "",
    treeId: rune.treeId,
    treeKey: rune.treeKey,
    treeName: rune.treeName,
    treeIcon: tree?.icon ?? "",
    slot: rune.slot,
    slotType: slotType(rune),
    isKeystone: rune.slot === 0,
    tags: tags(rune),
    icon: rune.icon,
    patch: rune.patch,
  };
}

/** Riot facts merged onto whatever coaching content already exists. */
export function toRuneProfile(rune: RuneData): RuneProfileV1 {
  const base = rawRuneProfile(rune.id) ?? emptyRuneProfileV1(rune.id);
  const official = toOfficial(rune);
  return {
    ...base,
    runeId: rune.id,
    official,
    source: "datadragon",
    patch: official.patch || currentPatch(),
    // `populated` means "coaching content exists" — Riot facts never set it.
    populated: base.populated,
  };
}

export interface RuneHydrationResult {
  hydrated: boolean;
  patch: string;
  runes: number;
  degraded: boolean;
}

/**
 * Load Data Dragon and push validated rune facts into Rune Intelligence.
 * Idempotent. When rune data cannot be loaded it returns `hydrated: false` and
 * every consumer keeps working against placeholder profiles.
 */
export async function hydrateRuneIntelligenceFromDataDragon(): Promise<RuneHydrationResult> {
  const snap = await loadLeagueData();
  const runes = allRunes();
  if (runes.length === 0) {
    return { hydrated: false, patch: snap.patch, runes: 0, degraded: true };
  }
  registerRuneProfiles(runes.map(toRuneProfile));
  return { hydrated: true, patch: snap.patch, runes: runes.length, degraded: snap.degraded };
}

/** Hydrate a single rune (used when only one profile is needed). */
export async function hydrateRune(runeId: number): Promise<RuneProfileV1 | null> {
  await loadLeagueData();
  const rune = resolveRune(runeId);
  if (!rune) return null;
  const profile = toRuneProfile(rune);
  registerRuneProfiles([profile]);
  return profile;
}
