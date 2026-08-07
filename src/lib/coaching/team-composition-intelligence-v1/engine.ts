// ---------------------------------------------------------------------------
// Team Composition Intelligence Engine V1 — deterministic accessors (4.9).
//
// Reads the registry ONLY. It never fetches, never ranks, never recommends,
// never fabricates statistics and never produces player advice. Champion facts
// are read through the Champion Intelligence facade and lane matchups stay in
// Matchup Intelligence, so nothing is duplicated here.
//
// Graceful degradation contract: unknown compositions, missing champions,
// incomplete role assignments, an absent enemy team, and unavailable Champion /
// Matchup / Item / Rune Intelligence or Data Dragon all resolve to canonical
// empty structures.
// ---------------------------------------------------------------------------
import { isPending, PENDING } from "../knowledge-base/types";
import {
  getIdentity as getChampionIdentity,
  isAvailable as championAvailable,
} from "../champion-intelligence-v1/engine";
import { makeMatchupId } from "../matchup-intelligence-v1/types";
import { hasMatchupKnowledge } from "../matchup-intelligence-v1/registry";
import type { RoleId } from "../knowledge-base/templates/champion";
import {
  COMPOSITION_ROLES,
  COMPOSITION_TRAIT_IDS,
  TRAIT_FIELD_BY_ID,
  emptyTeamCompositionProfile,
  makeCompositionId,
  normalizeChampionKey,
  normalizeRole,
  type CompositionAvailability,
  type CompositionComparison,
  type CompositionCurriculumReference,
  type CompositionDecisionPriority,
  type CompositionDecisionReference,
  type CompositionGameStateInput,
  type CompositionHabitReference,
  type CompositionItemReference,
  type CompositionMatchupReference,
  type CompositionObservation,
  type CompositionPracticeReference,
  type CompositionRelationship,
  type CompositionResolution,
  type CompositionRoleInput,
  type CompositionRuneReference,
  type CompositionTrait,
  type CompositionTraitId,
  type TeamCompositionAnalysis,
  type TeamCompositionProfile,
} from "./types";
import {
  allTeamCompositions,
  compositionsForChampion,
  compositionsForRole,
  rawTeamComposition,
  rawTeamCompositionById,
} from "./registry";

function resolve<T>(
  p: TeamCompositionProfile,
  value: T,
  fromComposition: boolean,
): CompositionResolution<T> {
  return { compositionId: p.compositionId, fromComposition, value };
}

/** Mark slots Champion Intelligence can back with facts. */
function hydrateSlots(p: TeamCompositionProfile): TeamCompositionProfile {
  const roleAssignments = { ...p.roleAssignments };
  for (const role of COMPOSITION_ROLES) {
    const slot = roleAssignments[role];
    const champion = slot.champion;
    roleAssignments[role] = {
      ...slot,
      championKnown:
        !isPending(champion) && Boolean(champion) ? championAvailable(champion) : false,
    };
  }
  return { ...p, roleAssignments };
}

// -- lookups ----------------------------------------------------------------

/** Always returns a structurally complete profile — never null. */
export function getComposition(
  champions: CompositionRoleInput = {},
  side?: string | null,
): TeamCompositionProfile {
  const registered = rawTeamComposition(champions, side);
  return hydrateSlots(registered ?? emptyTeamCompositionProfile(champions, side));
}

export function get(
  champions: CompositionRoleInput = {},
  side?: string | null,
): TeamCompositionProfile {
  return getComposition(champions, side);
}

export function getCompositionById(compositionId: string): TeamCompositionProfile | undefined {
  const p = rawTeamCompositionById(compositionId);
  return p ? hydrateSlots(p) : undefined;
}

export function getAllCompositions(): TeamCompositionProfile[] {
  return allTeamCompositions().map(hydrateSlots);
}

export function findCompositionsForChampion(championId: string): TeamCompositionProfile[] {
  return compositionsForChampion(championId).map(hydrateSlots);
}

export function findCompositionsForRole(role: string): TeamCompositionProfile[] {
  return compositionsForRole(role).map(hydrateSlots);
}

export function isAvailable(champions: CompositionRoleInput, side?: string | null): boolean {
  return Boolean(rawTeamComposition(champions, side));
}

export function isKnowledgePopulated(
  champions: CompositionRoleInput,
  side?: string | null,
): boolean {
  return Boolean(rawTeamComposition(champions, side)?.populated);
}

// -- champion availability ---------------------------------------------------

export function getChampionAvailability(
  champions: CompositionRoleInput = {},
): CompositionAvailability {
  const knownRoles: RoleId[] = [];
  const missingRoles: RoleId[] = [];
  const unknownChampions: string[] = [];
  for (const role of COMPOSITION_ROLES) {
    const champion = champions[role];
    if (!champion) {
      missingRoles.push(role);
      continue;
    }
    if (championAvailable(champion)) knownRoles.push(role);
    else unknownChampions.push(champion);
  }
  return {
    knownRoles,
    missingRoles,
    unknownChampions,
    degraded: missingRoles.length > 0 || unknownChampions.length > 0,
  };
}

/** Champion identities per role, read from Champion Intelligence by reference. */
export function getChampionContext(champions: CompositionRoleInput = {}) {
  return {
    compositionId: makeCompositionId(champions, null),
    availability: getChampionAvailability(champions),
    identities: COMPOSITION_ROLES.reduce(
      (acc, role) => {
        const champion = champions[role];
        acc[role] = champion ? getChampionIdentity(champion, role) : undefined;
        return acc;
      },
      {} as Partial<Record<RoleId, ReturnType<typeof getChampionIdentity> | undefined>>,
    ),
  };
}

// -- traits ------------------------------------------------------------------

export function getTrait(
  traitId: CompositionTraitId,
  champions: CompositionRoleInput = {},
  side?: string | null,
): CompositionResolution<CompositionTrait> {
  const p = getComposition(champions, side);
  const value = p[TRAIT_FIELD_BY_ID[traitId]] as CompositionTrait;
  return resolve(p, value, !isPending(value.rating));
}

export function getTeamfightProfile(champions: CompositionRoleInput = {}, side?: string | null) {
  return getTrait("teamfight", champions, side);
}

export function getScalingProfile(champions: CompositionRoleInput = {}, side?: string | null) {
  return getTrait("scaling", champions, side);
}

export function getSideLaneProfile(champions: CompositionRoleInput = {}, side?: string | null) {
  return getTrait("side-lane", champions, side);
}

/** Objective context: overall control plus baron / dragon / tower slots. */
export function getObjectiveProfile(champions: CompositionRoleInput = {}, side?: string | null) {
  const p = getComposition(champions, side);
  return {
    compositionId: p.compositionId,
    fromComposition: !isPending(p.objectiveControlProfile.rating),
    objectiveControl: p.objectiveControlProfile,
    baron: p.baronProfile,
    dragon: p.dragonProfile,
    towerSiege: p.towerSiegeProfile,
    vision: p.visionProfile,
  };
}

// -- knowledge ---------------------------------------------------------------

export function getWinConditions(
  champions: CompositionRoleInput = {},
  side?: string | null,
): { primary: string[]; secondary: string[] } {
  const p = getComposition(champions, side);
  return { primary: p.primaryWinConditions, secondary: p.secondaryWinConditions };
}

export function getStrengths(
  champions: CompositionRoleInput = {},
  side?: string | null,
): CompositionObservation[] {
  return getComposition(champions, side).compositionStrengths;
}

export function getWeaknesses(
  champions: CompositionRoleInput = {},
  side?: string | null,
): CompositionObservation[] {
  return getComposition(champions, side).compositionWeaknesses;
}

export function getVulnerabilities(
  champions: CompositionRoleInput = {},
  side?: string | null,
): CompositionObservation[] {
  return getComposition(champions, side).vulnerabilities;
}

// -- references --------------------------------------------------------------

export function getDecisionPriorities(
  champions: CompositionRoleInput = {},
  side?: string | null,
  role?: RoleId | string | null,
): CompositionDecisionPriority[] {
  const all = getComposition(champions, side).decisionPriorities;
  const r = normalizeRole(role);
  return r ? all.filter((d) => d.roles.length === 0 || d.roles.includes(r)) : all;
}

export function getDecisionReferences(
  champions: CompositionRoleInput = {},
  side?: string | null,
): CompositionDecisionReference[] {
  return getComposition(champions, side).decisionReferences;
}

export function getCurriculumReferences(
  champions: CompositionRoleInput = {},
  side?: string | null,
): CompositionCurriculumReference[] {
  return getComposition(champions, side).curriculumReferences;
}

export function getHabitReferences(
  champions: CompositionRoleInput = {},
  side?: string | null,
): CompositionHabitReference[] {
  return getComposition(champions, side).habitReferences;
}

export function getPracticeReferences(
  champions: CompositionRoleInput = {},
  side?: string | null,
): CompositionPracticeReference[] {
  return getComposition(champions, side).practiceReferences;
}

export function getItemReferences(
  champions: CompositionRoleInput = {},
  side?: string | null,
): CompositionItemReference[] {
  return getComposition(champions, side).itemReferences;
}

export function getRuneReferences(
  champions: CompositionRoleInput = {},
  side?: string | null,
): CompositionRuneReference[] {
  return getComposition(champions, side).runeReferences;
}

/**
 * Lane matchup pointers between two compositions. Matchup knowledge itself
 * stays entirely inside Matchup Intelligence — only ids cross this boundary.
 */
export function getMatchupReferences(
  analyzed: CompositionRoleInput = {},
  opposing?: CompositionRoleInput,
): CompositionMatchupReference[] {
  if (!opposing) return [];
  const refs: CompositionMatchupReference[] = [];
  for (const role of COMPOSITION_ROLES) {
    const a = analyzed[role];
    const b = opposing[role];
    if (!a || !b) continue;
    refs.push({
      matchupId: makeMatchupId(a, b, role),
      role,
      populated: hasMatchupKnowledge(a, b, role),
    });
  }
  return refs;
}

// -- directional analysis ----------------------------------------------------

export interface AnalyzeTeamInput {
  champions?: CompositionRoleInput;
  opposingChampions?: CompositionRoleInput;
  side?: string | null;
  opposingSide?: string | null;
  playerRole?: RoleId | string | null;
  /** OPTIONAL inputs — provided for extensibility, never required. */
  itemReferences?: CompositionItemReference[];
  runeReferences?: CompositionRuneReference[];
  gameState?: CompositionGameStateInput;
}

/**
 * Structural relationships between the analyzed team's traits and the enemy
 * traits that mediate their value. Emitted as references + `situational` leans
 * only — the Decision Prioritization Engine decides what they mean.
 */
const RELATIONSHIP_MAP: { id: string; analyzed: CompositionTraitId; opposing: CompositionTraitId[] }[] = [
  { id: "engage-vs-disengage", analyzed: "engage", opposing: ["disengage", "peel", "range"] },
  { id: "range-vs-mobility", analyzed: "range", opposing: ["mobility", "dive", "engage"] },
  { id: "poke-vs-sustain", analyzed: "poke", opposing: ["engage", "mobility"] },
  { id: "frontline-vs-burst", analyzed: "frontline", opposing: ["burst", "sustained-damage"] },
  { id: "backline-vs-dive", analyzed: "backline", opposing: ["dive", "pick-potential"] },
  { id: "scaling-vs-early", analyzed: "scaling", opposing: ["early-game", "snowball"] },
  { id: "teamfight-vs-pick", analyzed: "teamfight", opposing: ["pick-potential", "counter-engage"] },
  { id: "split-push-vs-teamfight", analyzed: "split-push", opposing: ["teamfight", "waveclear"] },
  { id: "siege-vs-waveclear", analyzed: "siege", opposing: ["waveclear", "counter-engage"] },
  { id: "objective-vs-zone-control", analyzed: "objective-control", opposing: ["zone-control", "vision"] },
  { id: "tempo-vs-comeback", analyzed: "tempo", opposing: ["comeback", "late-game"] },
];

export function buildRelationships(
  analyzed: TeamCompositionProfile,
  opposing?: TeamCompositionProfile,
): CompositionRelationship[] {
  return RELATIONSHIP_MAP.map((entry) => {
    const trait = analyzed[TRAIT_FIELD_BY_ID[entry.analyzed]] as CompositionTrait;
    const known =
      !isPending(trait.rating) &&
      Boolean(opposing) &&
      entry.opposing.some(
        (id) => !isPending((opposing![TRAIT_FIELD_BY_ID[id]] as CompositionTrait).rating),
      );
    return {
      id: entry.id,
      analyzedTraitId: entry.analyzed,
      opposingTraitIds: entry.opposing,
      edge: known ? "situational" : PENDING,
      magnitude: known ? trait.rating : PENDING,
      fundamentals: trait.fundamentals,
      decisionRefs: [],
      notes: [],
    } satisfies CompositionRelationship;
  });
}

/** Directional composition-vs-composition context. Never a conclusion. */
export function analyzeTeam(input: AnalyzeTeamInput = {}): TeamCompositionAnalysis {
  const analyzedChampions = input.champions ?? {};
  const analyzedTeamBase = getComposition(analyzedChampions, input.side ?? "analyzed");
  const opposingTeam = input.opposingChampions
    ? getComposition(input.opposingChampions, input.opposingSide ?? "opposing")
    : undefined;

  const matchupReferences = getMatchupReferences(analyzedChampions, input.opposingChampions);
  const analyzedTeam: TeamCompositionProfile = {
    ...analyzedTeamBase,
    matchupReferences: analyzedTeamBase.matchupReferences.length
      ? analyzedTeamBase.matchupReferences
      : matchupReferences,
    itemReferences: input.itemReferences ?? analyzedTeamBase.itemReferences,
    runeReferences: input.runeReferences ?? analyzedTeamBase.runeReferences,
  };

  return {
    version: 1,
    analyzedTeam,
    opposingTeam,
    playerRole: normalizeRole(input.playerRole),
    relationships: buildRelationships(analyzedTeam, opposingTeam),
    availability: {
      analyzedTeam: getChampionAvailability(analyzedChampions),
      opposingTeam: input.opposingChampions
        ? getChampionAvailability(input.opposingChampions)
        : undefined,
    },
    inputs: {
      matchups: matchupReferences.length > 0,
      items: Boolean(input.itemReferences?.length),
      runes: Boolean(input.runeReferences?.length),
      gameState: Boolean(input.gameState),
    },
    gameState: input.gameState,
  };
}

/** Trait-by-trait comparison. Degrades to PENDING leans when knowledge is absent. */
export function compareCompositions(
  analyzed: CompositionRoleInput = {},
  opposing?: CompositionRoleInput,
): CompositionComparison {
  const a = getComposition(analyzed, "analyzed");
  const b = opposing ? getComposition(opposing, "opposing") : undefined;
  const traits = COMPOSITION_TRAIT_IDS.map((traitId) => {
    const at = (a[TRAIT_FIELD_BY_ID[traitId]] as CompositionTrait).rating;
    const bt = b ? (b[TRAIT_FIELD_BY_ID[traitId]] as CompositionTrait).rating : PENDING;
    const known = !isPending(at) && !isPending(bt);
    return {
      traitId,
      analyzed: at,
      opposing: bt,
      edge: known ? ("situational" as const) : PENDING,
    };
  });
  return {
    analyzedCompositionId: a.compositionId,
    opposingCompositionId: b?.compositionId ?? PENDING,
    traits,
    degraded: !a.populated || !b || !b.populated,
  };
}

/** Which role the given champion occupies in a composition, if any. */
export function findRoleForChampion(
  champions: CompositionRoleInput,
  championId: string,
): RoleId | undefined {
  const key = normalizeChampionKey(championId);
  return COMPOSITION_ROLES.find((r) => normalizeChampionKey(champions[r] ?? "") === key);
}

/**
 * Graceful degradation contract: a structurally complete, knowledge-free
 * profile for a composition nothing is registered for.
 */
export function safeFallback(
  champions: CompositionRoleInput = {},
  side?: string | null,
): TeamCompositionProfile {
  return { ...emptyTeamCompositionProfile(champions, side), patch: PENDING };
}
