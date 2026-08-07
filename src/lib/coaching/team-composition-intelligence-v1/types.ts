// ---------------------------------------------------------------------------
// Team Composition Intelligence V1 — permanent interfaces ONLY (Sprint 4.9).
//
//   Champion Intelligence ─┐
//   Matchup Intelligence ──┼→ [Team Composition Intelligence] → Decision
//   Item / Rune (optional) ┘                                    Prioritization
//                                                             → Unified Context
//
// This layer stores COMPOSITION CONTEXT — "what does the shape of these ten
// champions change about the decisions that exist" — never coaching ("what
// should the player do"). Champion, matchup, item and rune facts are NOT
// duplicated here: only references into those layers.
//
// Every knowledge field is placeholder-capable (`Pending`) so a future
// authoritative knowledge source can populate it without touching consumers.
// Pure + client-safe. No Riot API, no statistics, no tier lists, no advice.
// ---------------------------------------------------------------------------
import { PENDING, type GamePhase, type KnowledgeSource, type Pending, type Rating } from "../knowledge-base/types";
import type { LeagueFundamentalId } from "../knowledge-base/fundamentals";
import type { CurriculumTopicId } from "../knowledge-base/curriculum";
import type { RoleId } from "../knowledge-base/templates/champion";

export const COMPOSITION_ROLES: RoleId[] = ["top", "jungle", "mid", "adc", "support"];

/** Which side of the analysis a composition sits on. */
export type TeamSide = "blue" | "red" | "analyzed" | "opposing" | Pending;

export type CompositionRating = Rating | Pending;

/** Coarse, non-numeric lean. Never a win rate, never a percentage. */
export type CompositionEdge = "analyzedTeam" | "opposingTeam" | "neutral" | "situational" | Pending;

/** One role slot in a composition. Champion-agnostic at the contract level. */
export interface CompositionSlot {
  role: RoleId;
  /** Champion id / name as supplied by the caller; empty when unknown. */
  champion: string | Pending;
  /** True when Champion Intelligence can back this slot with facts. */
  championKnown: boolean;
}

/**
 * The reusable shape of EVERY composition trait slot (damage, engage, scaling,
 * objectives, ...). `rating` says how pronounced the trait is, `notes` carries
 * authored structural context (empty until a knowledge source populates it).
 */
export interface CompositionTrait {
  /** Stable slot id, e.g. "engage", "scaling", "baron". */
  id: string;
  rating: CompositionRating;
  /** Phase this trait is most meaningful in, when known. */
  phase?: GamePhase;
  /** Roles that carry this trait for the team — routing hint only. */
  roles: RoleId[];
  /** Fundamentals this trait touches — routing hint only. */
  fundamentals: LeagueFundamentalId[];
  /** Structural context sentences. Never player advice. */
  notes: string[];
  /** Champion Intelligence fields this trait is derived from. */
  championFactRefs: string[];
}

/** Structural damage split. No damage values, no percentages. */
export interface CompositionDamageDistribution {
  physical: CompositionRating;
  magic: CompositionRating;
  trueDamage: CompositionRating;
  /** Roles carrying the majority of each damage type, by reference. */
  physicalRoles: RoleId[];
  magicRoles: RoleId[];
  /** Structural notes only. */
  notes: string[];
}

/** A structural strength / weakness / vulnerability, by reference. */
export interface CompositionObservation {
  id: string;
  label: string | Pending;
  fundamentals: LeagueFundamentalId[];
  /** Roles most involved in this observation. */
  roles: RoleId[];
  /** Existing League Decision Library ids this observation touches. */
  decisionRefs: string[];
  /** Structural context, never coaching output. */
  notes: string[];
}

/** Reference into the League Decision Library — never a duplicated decision. */
export interface CompositionDecisionReference {
  decisionId: string;
  label: string | Pending;
  /** Multiplier the Decision Prioritization Engine may apply. 1 = unchanged. */
  weightMultiplier: number;
  note: string | Pending;
}

/** A decision priority tier for the composition — reference + weight only. */
export interface CompositionDecisionPriority {
  tier: "high" | "medium" | "low";
  decisionId: string;
  fundamental: LeagueFundamentalId | Pending;
  roles: RoleId[];
  note: string | Pending;
}

/** Reference into the Coaching Curriculum. */
export interface CompositionCurriculumReference {
  topicId: CurriculumTopicId | Pending;
  fundamental: LeagueFundamentalId | Pending;
  emphasis: "primary" | "secondary" | "situational";
  note: string | Pending;
}

/** Reference allowing Habit Intelligence to see which habits matter here. */
export interface CompositionHabitReference {
  habitId: string;
  fundamental: LeagueFundamentalId | Pending;
  label: string | Pending;
  roles: RoleId[];
}

export interface CompositionPracticeReference {
  practiceId: string;
  label: string | Pending;
  fundamental: LeagueFundamentalId | Pending;
  measurable: string | Pending;
}

/** Pointer into Item Intelligence — ids only, never duplicated item data. */
export interface CompositionItemReference {
  itemId: string;
  relevance: "power-spike" | "defensive" | "offensive" | "utility" | "unknown";
  role?: RoleId;
  note: string | Pending;
}

/** Pointer into Rune Intelligence — ids only, never duplicated rune data. */
export interface CompositionRuneReference {
  runeId: number;
  relevance: "trading" | "sustain" | "burst" | "scaling" | "lane-pressure" | "resource" | "unknown";
  role?: RoleId;
  note: string | Pending;
}

/** Pointer into Matchup Intelligence — matchup context stays separate. */
export interface CompositionMatchupReference {
  matchupId: string;
  role: RoleId;
  /** True when authored matchup knowledge exists for that pairing. */
  populated: boolean;
}

/**
 * OPTIONAL game-state envelope. Nothing here is implemented in Sprint 4.9 —
 * the shape exists so future layers can pass state WITHOUT breaking contracts.
 */
export interface CompositionGameStateInput {
  gold?: Partial<Record<RoleId, number>>;
  levels?: Partial<Record<RoleId, number>>;
  itemIds?: Partial<Record<RoleId, string[]>>;
  runeIds?: Partial<Record<RoleId, number[]>>;
  towerState?: string;
  dragonState?: string;
  baronState?: string;
  visionState?: string;
  waveState?: string;
  objectiveTimers?: Record<string, number>;
  playerLocation?: string;
  cooldowns?: Record<string, number>;
  playerHistoryRefs?: string[];
  habitHistoryRefs?: string[];
}

/** Trait slot ids, in contract order. */
export const COMPOSITION_TRAIT_IDS = [
  "damage",
  "frontline",
  "backline",
  "engage",
  "disengage",
  "poke",
  "siege",
  "dive",
  "peel",
  "burst",
  "sustained-damage",
  "scaling",
  "early-game",
  "mid-game",
  "late-game",
  "waveclear",
  "objective-control",
  "baron",
  "dragon",
  "tower-siege",
  "vision",
  "zone-control",
  "mobility",
  "range",
  "teamfight",
  "split-push",
  "side-lane",
  "pick-potential",
  "counter-engage",
  "resource",
  "tempo",
  "snowball",
  "comeback",
] as const;

export type CompositionTraitId = (typeof COMPOSITION_TRAIT_IDS)[number];

/** The permanent team composition contract. */
export interface TeamCompositionProfile {
  /** `${side}__${top}_${jungle}_${mid}_${adc}_${support}` — order-stable. */
  compositionId: string;
  teamSide: TeamSide;
  roleAssignments: Record<RoleId, CompositionSlot>;
  champions: string[];

  primaryWinConditions: string[];
  secondaryWinConditions: string[];

  damageProfile: CompositionTrait;
  damageDistribution: CompositionDamageDistribution;
  frontlineProfile: CompositionTrait;
  backlineProfile: CompositionTrait;
  engageProfile: CompositionTrait;
  disengageProfile: CompositionTrait;
  pokeProfile: CompositionTrait;
  siegeProfile: CompositionTrait;
  diveProfile: CompositionTrait;
  peelProfile: CompositionTrait;
  burstProfile: CompositionTrait;
  sustainedDamageProfile: CompositionTrait;
  scalingProfile: CompositionTrait;
  earlyGameProfile: CompositionTrait;
  midGameProfile: CompositionTrait;
  lateGameProfile: CompositionTrait;
  waveclearProfile: CompositionTrait;
  objectiveControlProfile: CompositionTrait;
  baronProfile: CompositionTrait;
  dragonProfile: CompositionTrait;
  towerSiegeProfile: CompositionTrait;
  visionProfile: CompositionTrait;
  zoneControlProfile: CompositionTrait;
  mobilityProfile: CompositionTrait;
  rangeProfile: CompositionTrait;
  teamfightProfile: CompositionTrait;
  splitPushProfile: CompositionTrait;
  sideLaneProfile: CompositionTrait;
  pickPotential: CompositionTrait;
  counterEngageProfile: CompositionTrait;
  resourceProfile: CompositionTrait;
  tempoProfile: CompositionTrait;
  snowballProfile: CompositionTrait;
  comebackProfile: CompositionTrait;

  executionDifficulty: CompositionRating;

  compositionStrengths: CompositionObservation[];
  compositionWeaknesses: CompositionObservation[];
  vulnerabilities: CompositionObservation[];

  decisionPriorities: CompositionDecisionPriority[];
  decisionReferences: CompositionDecisionReference[];
  curriculumReferences: CompositionCurriculumReference[];
  habitReferences: CompositionHabitReference[];
  practiceReferences: CompositionPracticeReference[];

  /** OPTIONAL pointers into other layers — never duplicated data. */
  matchupReferences: CompositionMatchupReference[];
  itemReferences: CompositionItemReference[];
  runeReferences: CompositionRuneReference[];

  source: KnowledgeSource;
  patch: string | Pending;
  /** True ONLY when authored composition knowledge exists (never Riot facts). */
  populated: boolean;
}

/** Every accessor returns provenance so consumers can degrade safely. */
export interface CompositionResolution<T> {
  compositionId: string;
  /** True when the value came from a registered composition profile. */
  fromComposition: boolean;
  value: T;
}

/** Champion Intelligence availability across a composition. */
export interface CompositionAvailability {
  /** Roles whose champion is known to Champion Intelligence. */
  knownRoles: RoleId[];
  /** Roles with no champion supplied at all. */
  missingRoles: RoleId[];
  /** Champions supplied but unknown to Champion Intelligence. */
  unknownChampions: string[];
  degraded: boolean;
}

/**
 * A structural relationship between one trait of the analyzed team and the
 * opposing composition. Directional and reference-only — never a conclusion.
 */
export interface CompositionRelationship {
  id: string;
  /** Trait on the analyzed team. */
  analyzedTraitId: CompositionTraitId | string;
  /** Trait(s) on the opposing team that mediate its value. */
  opposingTraitIds: (CompositionTraitId | string)[];
  edge: CompositionEdge;
  magnitude: CompositionRating;
  fundamentals: LeagueFundamentalId[];
  decisionRefs: string[];
  notes: string[];
}

/** Directional composition-vs-composition context. */
export interface TeamCompositionAnalysis {
  version: 1;
  analyzedTeam: TeamCompositionProfile;
  /** OPTIONAL — absent enemy information degrades gracefully. */
  opposingTeam?: TeamCompositionProfile;
  /** The player's own role inside the analyzed team, when known. */
  playerRole?: RoleId;
  relationships: CompositionRelationship[];
  availability: {
    analyzedTeam: CompositionAvailability;
    opposingTeam?: CompositionAvailability;
  };
  /** True when matchup / item / rune / game-state inputs were supplied. */
  inputs: {
    matchups: boolean;
    items: boolean;
    runes: boolean;
    gameState: boolean;
  };
  /** OPTIONAL, unused in Sprint 4.9 — kept so contracts stay extensible. */
  gameState?: CompositionGameStateInput;
}

/** Side-by-side comparison of two compositions, trait by trait. */
export interface CompositionComparison {
  analyzedCompositionId: string;
  opposingCompositionId: string | Pending;
  traits: {
    traitId: CompositionTraitId | string;
    analyzed: CompositionRating;
    opposing: CompositionRating;
    edge: CompositionEdge;
  }[];
  /** True when either side lacked registered knowledge. */
  degraded: boolean;
}

// ---------------------------------------------------------------------------
// Canonical empty shapes
// ---------------------------------------------------------------------------

export function normalizeChampionKey(champion: string): string {
  return String(champion ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeRole(role?: string | null): RoleId | undefined {
  const key = String(role ?? "").trim().toLowerCase();
  return (COMPOSITION_ROLES as string[]).includes(key) ? (key as RoleId) : undefined;
}

export function normalizeTeamSide(side?: string | null): TeamSide {
  const key = String(side ?? "").trim().toLowerCase();
  return key === "blue" || key === "red" || key === "analyzed" || key === "opposing"
    ? (key as TeamSide)
    : PENDING;
}

export type CompositionRoleInput = Partial<Record<RoleId, string>>;

export function emptySlot(role: RoleId): CompositionSlot {
  return { role, champion: PENDING, championKnown: false };
}

export function buildRoleAssignments(
  champions: CompositionRoleInput = {},
): Record<RoleId, CompositionSlot> {
  return COMPOSITION_ROLES.reduce(
    (acc, role) => {
      const champion = champions[role];
      acc[role] = champion
        ? { role, champion, championKnown: false }
        : emptySlot(role);
      return acc;
    },
    {} as Record<RoleId, CompositionSlot>,
  );
}

/** Order-stable composition id. Missing roles keep their slot in the key. */
export function makeCompositionId(
  champions: CompositionRoleInput = {},
  side?: string | null,
): string {
  const key = COMPOSITION_ROLES.map((r) => normalizeChampionKey(champions[r] ?? "") || "unknown").join("_");
  const s = normalizeTeamSide(side);
  return `${s === PENDING ? "unspecified" : s}__${key}`;
}

export function emptyTrait(id: string): CompositionTrait {
  return {
    id,
    rating: PENDING,
    roles: [],
    fundamentals: [],
    notes: [],
    championFactRefs: [],
  };
}

export function emptyDamageDistribution(): CompositionDamageDistribution {
  return {
    physical: PENDING,
    magic: PENDING,
    trueDamage: PENDING,
    physicalRoles: [],
    magicRoles: [],
    notes: [],
  };
}

/**
 * The canonical empty profile: structurally complete, knowledge-free. Returned
 * whenever a composition (or champion) is unknown so consumers never branch on
 * null.
 */
export function emptyTeamCompositionProfile(
  champions: CompositionRoleInput = {},
  side?: string | null,
): TeamCompositionProfile {
  const roleAssignments = buildRoleAssignments(champions);
  return {
    compositionId: makeCompositionId(champions, side),
    teamSide: normalizeTeamSide(side),
    roleAssignments,
    champions: COMPOSITION_ROLES.map((r) => champions[r]).filter((c): c is string => Boolean(c)),

    primaryWinConditions: [],
    secondaryWinConditions: [],

    damageProfile: emptyTrait("damage"),
    damageDistribution: emptyDamageDistribution(),
    frontlineProfile: emptyTrait("frontline"),
    backlineProfile: emptyTrait("backline"),
    engageProfile: emptyTrait("engage"),
    disengageProfile: emptyTrait("disengage"),
    pokeProfile: emptyTrait("poke"),
    siegeProfile: emptyTrait("siege"),
    diveProfile: emptyTrait("dive"),
    peelProfile: emptyTrait("peel"),
    burstProfile: emptyTrait("burst"),
    sustainedDamageProfile: emptyTrait("sustained-damage"),
    scalingProfile: emptyTrait("scaling"),
    earlyGameProfile: emptyTrait("early-game"),
    midGameProfile: emptyTrait("mid-game"),
    lateGameProfile: emptyTrait("late-game"),
    waveclearProfile: emptyTrait("waveclear"),
    objectiveControlProfile: emptyTrait("objective-control"),
    baronProfile: emptyTrait("baron"),
    dragonProfile: emptyTrait("dragon"),
    towerSiegeProfile: emptyTrait("tower-siege"),
    visionProfile: emptyTrait("vision"),
    zoneControlProfile: emptyTrait("zone-control"),
    mobilityProfile: emptyTrait("mobility"),
    rangeProfile: emptyTrait("range"),
    teamfightProfile: emptyTrait("teamfight"),
    splitPushProfile: emptyTrait("split-push"),
    sideLaneProfile: emptyTrait("side-lane"),
    pickPotential: emptyTrait("pick-potential"),
    counterEngageProfile: emptyTrait("counter-engage"),
    resourceProfile: emptyTrait("resource"),
    tempoProfile: emptyTrait("tempo"),
    snowballProfile: emptyTrait("snowball"),
    comebackProfile: emptyTrait("comeback"),

    executionDifficulty: PENDING,

    compositionStrengths: [],
    compositionWeaknesses: [],
    vulnerabilities: [],

    decisionPriorities: [],
    decisionReferences: [],
    curriculumReferences: [],
    habitReferences: [],
    practiceReferences: [],

    matchupReferences: [],
    itemReferences: [],
    runeReferences: [],

    source: "curated",
    patch: PENDING,
    populated: false,
  };
}

/** Map from trait id → profile field name, for generic trait access. */
export const TRAIT_FIELD_BY_ID: Record<CompositionTraitId, keyof TeamCompositionProfile> = {
  damage: "damageProfile",
  frontline: "frontlineProfile",
  backline: "backlineProfile",
  engage: "engageProfile",
  disengage: "disengageProfile",
  poke: "pokeProfile",
  siege: "siegeProfile",
  dive: "diveProfile",
  peel: "peelProfile",
  burst: "burstProfile",
  "sustained-damage": "sustainedDamageProfile",
  scaling: "scalingProfile",
  "early-game": "earlyGameProfile",
  "mid-game": "midGameProfile",
  "late-game": "lateGameProfile",
  waveclear: "waveclearProfile",
  "objective-control": "objectiveControlProfile",
  baron: "baronProfile",
  dragon: "dragonProfile",
  "tower-siege": "towerSiegeProfile",
  vision: "visionProfile",
  "zone-control": "zoneControlProfile",
  mobility: "mobilityProfile",
  range: "rangeProfile",
  teamfight: "teamfightProfile",
  "split-push": "splitPushProfile",
  "side-lane": "sideLaneProfile",
  "pick-potential": "pickPotential",
  "counter-engage": "counterEngageProfile",
  resource: "resourceProfile",
  tempo: "tempoProfile",
  snowball: "snowballProfile",
  comeback: "comebackProfile",
};

/** Create a profile from a partial authored record, filling every slot. */
export function createTeamCompositionProfile(
  input: Partial<TeamCompositionProfile> & { champions?: CompositionRoleInput; teamSide?: TeamSide },
): TeamCompositionProfile {
  const roleChampions: CompositionRoleInput =
    (input.champions as CompositionRoleInput | undefined) ??
    (input.roleAssignments
      ? COMPOSITION_ROLES.reduce((acc, role) => {
          const champ = input.roleAssignments?.[role]?.champion;
          if (champ && champ !== PENDING) acc[role] = champ;
          return acc;
        }, {} as CompositionRoleInput)
      : {});
  const base = emptyTeamCompositionProfile(roleChampions, input.teamSide as string | undefined);
  const { champions: _ignored, ...rest } = input;
  return {
    ...base,
    ...(rest as Partial<TeamCompositionProfile>),
    roleAssignments: base.roleAssignments,
    champions: base.champions,
    compositionId: base.compositionId,
    teamSide: base.teamSide,
  };
}
