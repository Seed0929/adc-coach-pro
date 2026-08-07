// ---------------------------------------------------------------------------
// Team Composition Registry — the ONE place composition knowledge lives.
//
// Empty by design in Sprint 4.9: no fabricated composition knowledge, no tier
// lists and no win rates ship. New compositions are added by registering
// profiles — the engine and every consumer stay untouched.
// ---------------------------------------------------------------------------
import {
  COMPOSITION_ROLES,
  makeCompositionId,
  normalizeChampionKey,
  type CompositionRoleInput,
  type TeamCompositionProfile,
} from "./types";

const REGISTRY = new Map<string, TeamCompositionProfile>();

export function registerTeamCompositions(profiles: TeamCompositionProfile[]): void {
  for (const p of profiles) REGISTRY.set(p.compositionId, p);
}

export function clearTeamCompositions(): void {
  REGISTRY.clear();
}

export function rawTeamComposition(
  champions: CompositionRoleInput,
  side?: string | null,
): TeamCompositionProfile | undefined {
  return (
    REGISTRY.get(makeCompositionId(champions, side)) ??
    REGISTRY.get(makeCompositionId(champions, null))
  );
}

export function rawTeamCompositionById(compositionId: string): TeamCompositionProfile | undefined {
  return REGISTRY.get(compositionId);
}

export function hasTeamComposition(champions: CompositionRoleInput, side?: string | null): boolean {
  return Boolean(rawTeamComposition(champions, side));
}

/** True when AUTHORED composition knowledge exists (not just a stub record). */
export function hasCompositionKnowledge(
  champions: CompositionRoleInput,
  side?: string | null,
): boolean {
  return Boolean(rawTeamComposition(champions, side)?.populated);
}

export function allTeamCompositions(): TeamCompositionProfile[] {
  return Array.from(REGISTRY.values());
}

export function registeredCompositionIds(): string[] {
  return Array.from(REGISTRY.keys());
}

export function registeredCompositionCount(): number {
  return REGISTRY.size;
}

/** Every registered composition containing the champion in any role. */
export function compositionsForChampion(championId: string): TeamCompositionProfile[] {
  const key = normalizeChampionKey(championId);
  return allTeamCompositions().filter((p) =>
    p.champions.some((c) => normalizeChampionKey(c) === key),
  );
}

/** Every registered composition with a champion assigned to the given role. */
export function compositionsForRole(role: string): TeamCompositionProfile[] {
  const r = COMPOSITION_ROLES.find((x) => x === String(role).toLowerCase());
  if (!r) return [];
  return allTeamCompositions().filter((p) => p.roleAssignments[r].championKnown || Boolean(p.roleAssignments[r].champion));
}
