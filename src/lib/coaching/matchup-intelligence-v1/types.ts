// ---------------------------------------------------------------------------
// Matchup Intelligence V1 — permanent interfaces ONLY (Sprint 4.8).
//
//   Champion Intelligence ─┐
//   Item Intelligence   ───┼→ [Matchup Intelligence] → Decision Prioritization
//   Rune Intelligence   ───┘                          → Unified Coaching Context
//
// This layer stores CONTEXT — "what changes because these two champions face
// each other" — never coaching ("what should the player do"). Champion, item
// and rune facts are NOT duplicated here: only references to those layers.
//
// Every knowledge field is placeholder-capable (`Pending`) so a future
// authoritative knowledge source can populate it without touching consumers.
// Pure + client-safe. No Riot API, no statistics, no recommendations.
// ---------------------------------------------------------------------------
import { PENDING, type GamePhase, type KnowledgeSource, type Pending, type Rating } from "../knowledge-base/types";
import type { LeagueFundamentalId } from "../knowledge-base/fundamentals";
import type { CurriculumTopicId } from "../knowledge-base/curriculum";
import type { RoleId } from "../knowledge-base/templates/champion";

/** Roles a matchup can be expressed in. `any` = role-agnostic context. */
export type MatchupRoleContext = RoleId | "any";

export const MATCHUP_ROLE_CONTEXTS: MatchupRoleContext[] = [
  "top",
  "jungle",
  "mid",
  "adc",
  "support",
  "any",
];

/**
 * Which side of the interaction the advantage sits on. Directional and
 * deliberately coarse — never a win rate, never a percentage.
 */
export type MatchupEdge = "championA" | "championB" | "neutral" | "situational" | Pending;

export type MatchupRating = Rating | Pending;

/**
 * The reusable shape of EVERY interaction slot. `edge` says where the
 * relationship leans, `magnitude` how pronounced it is, `notes` carries
 * authored structural context (empty until a knowledge source populates it).
 */
export interface MatchupInteraction {
  /** Stable slot id, e.g. "range", "all-in", "objective". */
  id: string;
  edge: MatchupEdge;
  magnitude: MatchupRating;
  /** Phase this interaction is most meaningful in, when known. */
  phase?: GamePhase;
  /** Fundamentals this interaction touches — routing hint only. */
  fundamentals: LeagueFundamentalId[];
  /** Structural context sentences. Never player advice. */
  notes: string[];
  /** Champion Intelligence fields this interaction is derived from. */
  championFactRefs: string[];
}

/** Phase-scoped context block. */
export interface MatchupPhaseProfile {
  phase: GamePhase | "lane";
  edge: MatchupEdge;
  summary: string | Pending;
  /** Structural context sentences, never coaching output. */
  context: string[];
  fundamentals: LeagueFundamentalId[];
}

/** A time/state window in which one champion's position changes. */
export type MatchupWindowKind = "punish" | "danger" | "recovery";

export interface MatchupWindow {
  id: string;
  kind: MatchupWindowKind;
  /** Whose window this is. */
  owner: "championA" | "championB" | Pending;
  label: string | Pending;
  /** Phase and/or level/item trigger — structural, never fabricated timings. */
  phase?: GamePhase;
  trigger: string | Pending;
  /** Preconditions a future game-state layer can evaluate. */
  preconditions: string[];
  fundamentals: LeagueFundamentalId[];
  decisionRefs: string[];
}

/** Reference into the League Decision Library — never a duplicated decision. */
export interface MatchupDecisionReference {
  decisionId: string;
  label: string | Pending;
  /** Multiplier the Decision Prioritization Engine may apply. 1 = unchanged. */
  weightMultiplier: number;
  note: string | Pending;
}

/** Reference into the Coaching Curriculum. */
export interface MatchupCurriculumReference {
  topicId: CurriculumTopicId | Pending;
  fundamental: LeagueFundamentalId | Pending;
  emphasis: "primary" | "secondary" | "situational";
  note: string | Pending;
}

/** Reference allowing Habit Intelligence to see which habits matter here. */
export interface MatchupHabitReference {
  habitId: string;
  fundamental: LeagueFundamentalId | Pending;
  label: string | Pending;
}

export interface MatchupPracticeReference {
  practiceId: string;
  label: string | Pending;
  fundamental: LeagueFundamentalId | Pending;
  measurable: string | Pending;
}

/** Pointer into Item Intelligence — ids only, never duplicated item data. */
export interface MatchupItemReference {
  itemId: string;
  /** Why this item id is structurally relevant to the interaction. */
  relevance: "power-spike" | "defensive" | "offensive" | "utility" | "unknown";
  owner: "championA" | "championB" | Pending;
  note: string | Pending;
}

/** Pointer into Rune Intelligence — ids only, never duplicated rune data. */
export interface MatchupRuneReference {
  runeId: number;
  relevance: "trading" | "sustain" | "burst" | "scaling" | "lane-pressure" | "resource" | "unknown";
  owner: "championA" | "championB" | Pending;
  note: string | Pending;
}

/** A decision priority tier for the matchup — reference + weight only. */
export interface MatchupDecisionPriority {
  tier: "high" | "medium" | "low";
  decisionId: string;
  fundamental: LeagueFundamentalId | Pending;
  note: string | Pending;
}

/** A recurring structural mistake pattern in this matchup, by reference. */
export interface MatchupMistakeReference {
  id: string;
  label: string | Pending;
  fundamental: LeagueFundamentalId | Pending;
  decisionId?: string;
}

/**
 * OPTIONAL game-state envelope. Nothing here is implemented in Sprint 4.8 —
 * the shape exists so future layers can pass state WITHOUT breaking contracts.
 */
export interface MatchupGameStateInput {
  level?: number;
  gold?: number;
  itemIds?: string[];
  runeIds?: number[];
  healthPercent?: number;
  resourcePercent?: number;
  cooldowns?: Record<string, number>;
  waveState?: string;
  towerState?: string;
  jungleProximity?: string;
  visionState?: string;
  objectiveState?: string;
  teamComposition?: string[];
  playerHistoryRefs?: string[];
  habitHistoryRefs?: string[];
}

/** The permanent matchup contract. */
export interface MatchupProfileV1 {
  /** `${championA}__${championB}__${roleContext}` — directional. */
  matchupId: string;
  championA: string;
  championB: string;
  roleContext: MatchupRoleContext;

  lanePhaseProfile: MatchupPhaseProfile;
  earlyGameProfile: MatchupPhaseProfile;
  midGameProfile: MatchupPhaseProfile;
  lateGameProfile: MatchupPhaseProfile;

  powerSpikeInteraction: MatchupInteraction;
  rangeInteraction: MatchupInteraction;
  mobilityInteraction: MatchupInteraction;
  engageInteraction: MatchupInteraction;
  disengageInteraction: MatchupInteraction;
  pokeInteraction: MatchupInteraction;
  burstInteraction: MatchupInteraction;
  sustainInteraction: MatchupInteraction;
  waveclearInteraction: MatchupInteraction;
  scalingInteraction: MatchupInteraction;
  resourceInteraction: MatchupInteraction;
  tradingInteraction: MatchupInteraction;
  allInInteraction: MatchupInteraction;
  roamInteraction: MatchupInteraction;
  objectiveInteraction: MatchupInteraction;
  teamfightInteraction: MatchupInteraction;
  sideLaneInteraction: MatchupInteraction;
  visionInteraction: MatchupInteraction;
  tempoInteraction: MatchupInteraction;
  recallInteraction: MatchupInteraction;
  goldLeadInteraction: MatchupInteraction;
  levelLeadInteraction: MatchupInteraction;
  itemSpikeInteraction: MatchupInteraction;
  runeInteraction: MatchupInteraction;
  winConditionInteraction: MatchupInteraction;
  lossConditionInteraction: MatchupInteraction;

  punishWindows: MatchupWindow[];
  dangerWindows: MatchupWindow[];
  recoveryWindows: MatchupWindow[];

  decisionPriorities: MatchupDecisionPriority[];
  commonMistakes: MatchupMistakeReference[];
  practiceReferences: MatchupPracticeReference[];
  habitReferences: MatchupHabitReference[];
  decisionReferences: MatchupDecisionReference[];
  curriculumReferences: MatchupCurriculumReference[];

  /** OPTIONAL pointers into Item / Rune Intelligence. */
  itemReferences: MatchupItemReference[];
  runeReferences: MatchupRuneReference[];

  source: KnowledgeSource;
  patch: string | Pending;
  /** True ONLY when authored matchup knowledge exists (never Riot facts). */
  populated: boolean;
}

/** Every accessor returns provenance so consumers can degrade safely. */
export interface MatchupResolution<T> {
  matchupId: string;
  /** True when the value came from a registered matchup profile. */
  fromMatchup: boolean;
  value: T;
}

/** Champion Intelligence availability, surfaced for graceful degradation. */
export interface MatchupChampionAvailability {
  championA: boolean;
  championB: boolean;
  /** True when Data Dragon facts are missing for either champion. */
  degraded: boolean;
}

// ---------------------------------------------------------------------------
// Canonical empty shapes
// ---------------------------------------------------------------------------

export function normalizeChampionKey(champion: string): string {
  return String(champion ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeRoleContext(role?: string | null): MatchupRoleContext {
  const key = String(role ?? "").trim().toLowerCase();
  return (MATCHUP_ROLE_CONTEXTS as string[]).includes(key) ? (key as MatchupRoleContext) : "any";
}

/** Directional matchup id — A vs B is NOT the same key as B vs A. */
export function makeMatchupId(
  championA: string,
  championB: string,
  roleContext: MatchupRoleContext = "any",
): string {
  return `${normalizeChampionKey(championA)}__${normalizeChampionKey(championB)}__${normalizeRoleContext(roleContext)}`;
}

export function emptyInteraction(id: string): MatchupInteraction {
  return {
    id,
    edge: PENDING,
    magnitude: PENDING,
    fundamentals: [],
    notes: [],
    championFactRefs: [],
  };
}

export function emptyPhaseProfile(phase: MatchupPhaseProfile["phase"]): MatchupPhaseProfile {
  return { phase, edge: PENDING, summary: PENDING, context: [], fundamentals: [] };
}

/** Interaction slot ids, in contract order. */
export const MATCHUP_INTERACTION_IDS = [
  "power-spike",
  "range",
  "mobility",
  "engage",
  "disengage",
  "poke",
  "burst",
  "sustain",
  "waveclear",
  "scaling",
  "resource",
  "trading",
  "all-in",
  "roam",
  "objective",
  "teamfight",
  "side-lane",
  "vision",
  "tempo",
  "recall",
  "gold-lead",
  "level-lead",
  "item-spike",
  "rune",
  "win-condition",
  "loss-condition",
] as const;

export type MatchupInteractionId = (typeof MATCHUP_INTERACTION_IDS)[number];

/**
 * The canonical empty profile: structurally complete, knowledge-free. Returned
 * whenever a matchup (or champion) is unknown so consumers never branch on null.
 */
export function emptyMatchupProfileV1(
  championA: string,
  championB: string,
  roleContext: MatchupRoleContext = "any",
): MatchupProfileV1 {
  return {
    matchupId: makeMatchupId(championA, championB, roleContext),
    championA,
    championB,
    roleContext: normalizeRoleContext(roleContext),

    lanePhaseProfile: emptyPhaseProfile("lane"),
    earlyGameProfile: emptyPhaseProfile("early"),
    midGameProfile: emptyPhaseProfile("mid"),
    lateGameProfile: emptyPhaseProfile("late"),

    powerSpikeInteraction: emptyInteraction("power-spike"),
    rangeInteraction: emptyInteraction("range"),
    mobilityInteraction: emptyInteraction("mobility"),
    engageInteraction: emptyInteraction("engage"),
    disengageInteraction: emptyInteraction("disengage"),
    pokeInteraction: emptyInteraction("poke"),
    burstInteraction: emptyInteraction("burst"),
    sustainInteraction: emptyInteraction("sustain"),
    waveclearInteraction: emptyInteraction("waveclear"),
    scalingInteraction: emptyInteraction("scaling"),
    resourceInteraction: emptyInteraction("resource"),
    tradingInteraction: emptyInteraction("trading"),
    allInInteraction: emptyInteraction("all-in"),
    roamInteraction: emptyInteraction("roam"),
    objectiveInteraction: emptyInteraction("objective"),
    teamfightInteraction: emptyInteraction("teamfight"),
    sideLaneInteraction: emptyInteraction("side-lane"),
    visionInteraction: emptyInteraction("vision"),
    tempoInteraction: emptyInteraction("tempo"),
    recallInteraction: emptyInteraction("recall"),
    goldLeadInteraction: emptyInteraction("gold-lead"),
    levelLeadInteraction: emptyInteraction("level-lead"),
    itemSpikeInteraction: emptyInteraction("item-spike"),
    runeInteraction: emptyInteraction("rune"),
    winConditionInteraction: emptyInteraction("win-condition"),
    lossConditionInteraction: emptyInteraction("loss-condition"),

    punishWindows: [],
    dangerWindows: [],
    recoveryWindows: [],

    decisionPriorities: [],
    commonMistakes: [],
    practiceReferences: [],
    habitReferences: [],
    decisionReferences: [],
    curriculumReferences: [],

    itemReferences: [],
    runeReferences: [],

    source: "curated",
    patch: PENDING,
    populated: false,
  };
}

/** Create a profile from a partial authored record, filling every slot. */
export function createMatchupProfileV1(
  input: Partial<MatchupProfileV1> & { championA: string; championB: string },
): MatchupProfileV1 {
  const roleContext = normalizeRoleContext(input.roleContext);
  const base = emptyMatchupProfileV1(input.championA, input.championB, roleContext);
  return {
    ...base,
    ...input,
    roleContext,
    matchupId: makeMatchupId(input.championA, input.championB, roleContext),
  };
}