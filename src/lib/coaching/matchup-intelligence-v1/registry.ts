// ---------------------------------------------------------------------------
// Matchup Intelligence Registry — the ONE place matchup knowledge lives.
//
// Empty by design in Sprint 4.8: no fabricated matchup knowledge ships. New
// champions, roles and relationships are added by registering profiles — the
// engine and every consumer stay untouched.
//
// Directional: A vs B and B vs A are separate keys.
// ---------------------------------------------------------------------------
import {
  makeMatchupId,
  normalizeChampionKey,
  normalizeRoleContext,
  type MatchupProfileV1,
  type MatchupRoleContext,
} from "./types";

const REGISTRY = new Map<string, MatchupProfileV1>();

export function registerMatchupProfiles(profiles: MatchupProfileV1[]): void {
  for (const p of profiles) {
    const id = makeMatchupId(p.championA, p.championB, p.roleContext);
    REGISTRY.set(id, { ...p, matchupId: id, roleContext: normalizeRoleContext(p.roleContext) });
  }
}

export function clearMatchupProfiles(): void {
  REGISTRY.clear();
}

/**
 * Exact directional lookup, then the role-agnostic (`any`) fallback for the
 * same direction. Reversing the champions is NEVER attempted — matchup
 * relationships are directional by contract.
 */
export function rawMatchupProfile(
  championA: string,
  championB: string,
  roleContext?: MatchupRoleContext | string | null,
): MatchupProfileV1 | undefined {
  const role = normalizeRoleContext(roleContext);
  return (
    REGISTRY.get(makeMatchupId(championA, championB, role)) ??
    REGISTRY.get(makeMatchupId(championA, championB, "any"))
  );
}

export function rawMatchupProfileById(matchupId: string): MatchupProfileV1 | undefined {
  return REGISTRY.get(matchupId);
}

export function hasMatchupProfile(
  championA: string,
  championB: string,
  roleContext?: MatchupRoleContext | string | null,
): boolean {
  return Boolean(rawMatchupProfile(championA, championB, roleContext));
}

/** True when AUTHORED matchup knowledge exists (not just a stub record). */
export function hasMatchupKnowledge(
  championA: string,
  championB: string,
  roleContext?: MatchupRoleContext | string | null,
): boolean {
  return Boolean(rawMatchupProfile(championA, championB, roleContext)?.populated);
}

export function allMatchupProfiles(): MatchupProfileV1[] {
  return Array.from(REGISTRY.values());
}

export function registeredMatchupIds(): string[] {
  return Array.from(REGISTRY.keys());
}

export function registeredMatchupCount(): number {
  return REGISTRY.size;
}

/** Every profile where the champion appears on either side. */
export function matchupsForChampion(championId: string): MatchupProfileV1[] {
  const key = normalizeChampionKey(championId);
  return allMatchupProfiles().filter(
    (p) => normalizeChampionKey(p.championA) === key || normalizeChampionKey(p.championB) === key,
  );
}

export function matchupsForRole(roleContext: MatchupRoleContext | string): MatchupProfileV1[] {
  const role = normalizeRoleContext(roleContext);
  return allMatchupProfiles().filter((p) => p.roleContext === role);
}