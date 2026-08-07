// ---------------------------------------------------------------------------
// Lane State Intelligence V1 — permanent interfaces ONLY (Sprint 5.0).
//
//   Champion Intelligence ─┐
//   Matchup Intelligence ──┼→ [Lane State Intelligence] → Decision
//   Team Composition ──────┤                              Prioritization
//   Item / Rune (optional) ┘                            → Unified Context
//
// This layer answers ONE question: "what is happening in this lane right
// now?". It NEVER answers "what should the player do" — that belongs to the
// reasoning layer. Champion / matchup / item / rune / composition facts are
// never duplicated here: only references into those layers.
//
// UNKNOWN is always a valid state. Missing information is never invented.
// Pure + client-safe. No Riot API, no persistence, no coaching text.
// ---------------------------------------------------------------------------
import { PENDING, type KnowledgeSource, type Pending } from "../knowledge-base/types";
import type { LeagueFundamentalId } from "../knowledge-base/fundamentals";
import type { CurriculumTopicId } from "../knowledge-base/curriculum";
import type { RoleId } from "../knowledge-base/templates/champion";

export const LANE_STATE_ROLES: RoleId[] = ["top", "jungle", "mid", "adc", "support"];

/** The kind of lane context a role is in — never forced into an ADC model. */
export type LaneContextKind =
  | "LANE"
  | "ROAMING"
  | "JUNGLE"
  | "SHARED_LANE"
  | "NO_ACTIVE_LANE"
  | "UNKNOWN";

export type LanePhase =
  | "EARLY"
  | "LEVEL_2"
  | "LEVEL_3"
  | "LEVEL_6"
  | "FIRST_RECALL"
  | "MID_LANE_PHASE"
  | "TOWER_PLATE_PHASE"
  | "MID_GAME_TRANSITION"
  | "LATE_LANE_STATE"
  | "UNKNOWN";

export type WaveState =
  | "UNKNOWN"
  | "NEUTRAL"
  | "PUSHING_TOWARD_PLAYER"
  | "PUSHING_TOWARD_ENEMY"
  | "FREEZE"
  | "SLOW_PUSH"
  | "CRASHING"
  | "BOUNCING"
  | "FROZEN_NEAR_PLAYER"
  | "FROZEN_NEAR_ENEMY";

export type WaveSize = "UNKNOWN" | "SMALL" | "STANDARD" | "LARGE" | "STACKED";
export type WaveDirection = "UNKNOWN" | "TOWARD_PLAYER" | "TOWARD_ENEMY" | "STATIC";
export type WavePosition =
  | "UNKNOWN"
  | "PLAYER_TOWER"
  | "PLAYER_SIDE"
  | "MIDDLE"
  | "ENEMY_SIDE"
  | "ENEMY_TOWER";

/** Coarse likelihood scale. Never a percentage, never a prediction of play. */
export type StateLikelihood = "UNKNOWN" | "NONE" | "LOW" | "MODERATE" | "HIGH";

/** Coarse magnitude scale used for advantages / pressure / threats. */
export type StateMagnitude = "UNKNOWN" | "NONE" | "SLIGHT" | "CLEAR" | "SIGNIFICANT";

/** Which participant a state favours. */
export type StateOwner = "PLAYER" | "ENEMY" | "EVEN" | "UNKNOWN";

export type ResourceState = "UNKNOWN" | "EMPTY" | "LOW" | "MODERATE" | "HEALTHY" | "FULL" | "NONE";
export type HealthState = "UNKNOWN" | "CRITICAL" | "LOW" | "MODERATE" | "HEALTHY" | "FULL";

export type TowerState =
  | "UNKNOWN"
  | "FULL_HEALTH"
  | "PLATES_REMAINING"
  | "PLATES_GONE"
  | "VULNERABLE"
  | "DESTROYED";

export type RecallState =
  | "UNKNOWN"
  | "NO_WINDOW"
  | "WINDOW_AVAILABLE"
  | "RECALLING"
  | "BASE"
  | "RETURNING"
  | "RECENTLY_RETURNED";

export type LaneTempo = "UNKNOWN" | "PLAYER_TEMPO" | "ENEMY_TEMPO" | "NEUTRAL" | "RESET_WINDOW";
export type LanePriority = "UNKNOWN" | "PLAYER" | "ENEMY" | "SHARED" | "NONE";
export type LaneSafety = "UNKNOWN" | "SAFE" | "CAUTIOUS" | "EXPOSED" | "CRITICAL";
export type LaneControl = "UNKNOWN" | "PLAYER" | "ENEMY" | "CONTESTED" | "NEUTRAL";

export type VisionState =
  | "UNKNOWN"
  | "NO_VISION"
  | "PARTIAL_VISION"
  | "CONTROLLED"
  | "ENEMY_CONTROLLED"
  | "CONTESTED";

export type MapState =
  | "UNKNOWN"
  | "QUIET"
  | "OBJECTIVE_WINDOW"
  | "ENEMY_ROAMING"
  | "ALLY_ROAMING"
  | "SKIRMISH_ACTIVE"
  | "TEAMFIGHT_ACTIVE";

export type PowerSpikeState =
  | "UNKNOWN"
  | "NONE"
  | "PLAYER_SPIKED"
  | "ENEMY_SPIKED"
  | "BOTH_SPIKED"
  | "PLAYER_APPROACHING"
  | "ENEMY_APPROACHING";

export type RecoveryState =
  | "UNKNOWN"
  | "STABLE"
  | "NEEDS_RESET"
  | "RECOVERING"
  | "BEHIND"
  | "AHEAD";

export type TradingState = "UNKNOWN" | "PLAYER_FAVOURED" | "ENEMY_FAVOURED" | "EVEN" | "NO_TRADES";
export type SpacingState = "UNKNOWN" | "RESPECTED" | "CONTESTED" | "OVEREXTENDED" | "PASSIVE";
export type PositioningState = "UNKNOWN" | "SAFE" | "AGGRESSIVE" | "OVEREXTENDED" | "TRAPPED";

/** Item power-spike relationship, referenced not duplicated. */
export type ItemSpikeState =
  | "UNKNOWN"
  | "NONE"
  | "COMPONENT"
  | "FIRST_ITEM"
  | "TWO_ITEM"
  | "COMPLETED_SPIKE";

// ---------------------------------------------------------------------------
// Reference shapes — pointers into existing layers, never duplicates
// ---------------------------------------------------------------------------

/** Reference into the League Decision Library. */
export interface LaneStateDecisionReference {
  decisionId: string;
  label: string | Pending;
  /** Multiplier the Decision Prioritization Engine may apply. 1 = unchanged. */
  weightMultiplier: number;
  note: string | Pending;
}

export interface LaneStateDecisionPriority {
  tier: "high" | "medium" | "low";
  decisionId: string;
  fundamental: LeagueFundamentalId | Pending;
  roles: RoleId[];
  note: string | Pending;
}

export interface LaneStateCurriculumReference {
  topicId: CurriculumTopicId | Pending;
  fundamental: LeagueFundamentalId | Pending;
  emphasis: "primary" | "secondary" | "situational";
  note: string | Pending;
}

export interface LaneStateHabitReference {
  habitId: string;
  fundamental: LeagueFundamentalId | Pending;
  label: string | Pending;
  roles: RoleId[];
}

export interface LaneStatePracticeReference {
  practiceId: string;
  label: string | Pending;
  fundamental: LeagueFundamentalId | Pending;
  measurable: string | Pending;
}

/** OPTIONAL pointer into Item Intelligence. */
export interface LaneStateItemReference {
  itemId: string;
  relevance: "power-spike" | "defensive" | "offensive" | "utility" | "unknown";
  owner: "player" | "enemy" | Pending;
  note: string | Pending;
}

/** OPTIONAL pointer into Rune Intelligence. */
export interface LaneStateRuneReference {
  runeId: number;
  relevance: "trading" | "sustain" | "burst" | "scaling" | "lane-pressure" | "resource" | "unknown";
  owner: "player" | "enemy" | Pending;
  note: string | Pending;
}

/** OPTIONAL pointer into Matchup Intelligence. */
export interface LaneStateMatchupReference {
  matchupId: string;
  championA: string;
  championB: string;
  populated: boolean;
}

/** OPTIONAL pointer into Team Composition Intelligence. */
export interface LaneStateCompositionReference {
  compositionId: string;
  side: "analyzed" | "opposing";
  populated: boolean;
}

/** OPTIONAL pointer into Champion Intelligence. */
export interface LaneStateChampionReference {
  champion: string | Pending;
  owner: "player" | "enemy";
  /** True when Champion Intelligence can back this champion with facts. */
  known: boolean;
}

/** Which sources were actually available when the state was assembled. */
export interface LaneStateAvailability {
  wave: boolean;
  health: boolean;
  resource: boolean;
  level: boolean;
  gold: boolean;
  items: boolean;
  runes: boolean;
  vision: boolean;
  tower: boolean;
  champion: boolean;
  matchup: boolean;
  teamComposition: boolean;
  /** True when ANY of the above is missing. */
  degraded: boolean;
}

// ---------------------------------------------------------------------------
// The profile
// ---------------------------------------------------------------------------

export interface LaneStateProfile {
  laneStateId: string;
  role: RoleId | Pending;
  laneContext: LaneContextKind;
  lanePhase: LanePhase;

  /** Wave */
  waveState: WaveState;
  waveSize: WaveSize;
  minionAdvantage: StateMagnitude;
  minionAdvantageOwner: StateOwner;
  waveDirection: WaveDirection;
  wavePosition: WavePosition;
  freezePotential: StateLikelihood;
  slowPushPotential: StateLikelihood;
  crashPotential: StateLikelihood;
  bouncePotential: StateLikelihood;

  /** Tower */
  towerPressure: StateMagnitude;
  towerPressureOwner: StateOwner;
  towerState: TowerState;

  /** Participant state */
  playerHealthState: HealthState;
  enemyHealthState: HealthState;
  playerResourceState: ResourceState;
  enemyResourceState: ResourceState;
  playerLevel: number | Pending;
  enemyLevel: number | Pending;
  levelAdvantage: StateMagnitude;
  levelAdvantageOwner: StateOwner;
  playerGold: number | Pending;
  enemyGold: number | Pending;
  goldAdvantage: StateMagnitude;
  goldAdvantageOwner: StateOwner;
  playerItemSpike: ItemSpikeState;
  enemyItemSpike: ItemSpikeState;
  playerRecallState: RecallState;
  enemyRecallState: RecallState;

  /** Lane relationship */
  laneTempo: LaneTempo;
  lanePriority: LanePriority;
  laneSafety: LaneSafety;
  laneControl: LaneControl;

  /** Threats — descriptive only, never a call to action. */
  allInThreat: StateMagnitude;
  allInThreatOwner: StateOwner;
  pokeThreat: StateMagnitude;
  pokeThreatOwner: StateOwner;
  gankThreat: StateLikelihood;
  diveThreat: StateLikelihood;
  roamOpportunity: StateLikelihood;
  roamThreat: StateLikelihood;
  junglerThreat: StateLikelihood;

  /** Map + macro relationship */
  visionState: VisionState;
  objectivePressure: StateMagnitude;
  objectivePressureOwner: StateOwner;
  mapState: MapState;

  /** Interaction quality */
  tradingState: TradingState;
  spacingState: SpacingState;
  positioningState: PositioningState;
  powerSpikeState: PowerSpikeState;
  recoveryState: RecoveryState;

  /** References — routing hints for the reasoning layer. */
  decisionPriorities: LaneStateDecisionPriority[];
  decisionReferences: LaneStateDecisionReference[];
  curriculumReferences: LaneStateCurriculumReference[];
  habitReferences: LaneStateHabitReference[];
  practiceReferences: LaneStatePracticeReference[];
  itemReferences: LaneStateItemReference[];
  runeReferences: LaneStateRuneReference[];
  championReferences: LaneStateChampionReference[];
  matchupReference?: LaneStateMatchupReference;
  compositionReferences: LaneStateCompositionReference[];

  /** Fundamentals the observed state touches — routing hint only. */
  fundamentals: LeagueFundamentalId[];

  availability: LaneStateAvailability;
  source: KnowledgeSource;
  /** True only when a real state source supplied at least one observation. */
  observed: boolean;
}

// ---------------------------------------------------------------------------
// Inputs — the contract future live game-state providers will fill
// ---------------------------------------------------------------------------

export interface LaneStateParticipantInput {
  champion?: string;
  level?: number;
  gold?: number;
  /** Current / max health. Both required for a health state to be derived. */
  health?: number;
  maxHealth?: number;
  resource?: number;
  maxResource?: number;
  /** Champions with no resource bar (rage / manaless) declare it explicitly. */
  resourceless?: boolean;
  itemIds?: string[];
  completedItems?: number;
  runeIds?: number[];
  summonerSpells?: string[];
  cooldowns?: Record<string, number>;
  recallState?: RecallState;
  position?: { x: number; y: number };
  itemSpike?: ItemSpikeState;
}

export interface LaneStateWaveInput {
  state?: WaveState;
  size?: WaveSize;
  direction?: WaveDirection;
  position?: WavePosition;
  playerMinions?: number;
  enemyMinions?: number;
}

export interface LaneStateMapInput {
  mapState?: MapState;
  visionState?: VisionState;
  junglerThreat?: StateLikelihood;
  gankThreat?: StateLikelihood;
  diveThreat?: StateLikelihood;
  roamOpportunity?: StateLikelihood;
  roamThreat?: StateLikelihood;
  objectivePressure?: StateMagnitude;
  objectivePressureOwner?: StateOwner;
  objectiveTimers?: Record<string, number>;
}

export interface LaneStateTowerInput {
  state?: TowerState;
  /** Which side's tower is under pressure, when known. */
  pressureOwner?: StateOwner;
  platesRemaining?: number;
  playerTowerHealthRatio?: number;
  enemyTowerHealthRatio?: number;
}

export interface LaneStateInput {
  role?: RoleId | string | null;
  laneContext?: LaneContextKind;
  lanePhase?: LanePhase;
  /** Game clock in seconds — used only for phase hints, never for advice. */
  gameTimeSeconds?: number;
  player?: LaneStateParticipantInput;
  enemy?: LaneStateParticipantInput;
  wave?: LaneStateWaveInput;
  tower?: LaneStateTowerInput;
  map?: LaneStateMapInput;
  /** OPTIONAL — pure observations supplied by a future live state provider. */
  tradingState?: TradingState;
  spacingState?: SpacingState;
  positioningState?: PositioningState;
  /** OPTIONAL — compositions this lane sits inside, by id. */
  compositionIds?: { analyzed?: string; opposing?: string };
  source?: KnowledgeSource;
  /** Explicit id override; otherwise derived deterministically. */
  laneStateId?: string;
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export function makeLaneStateId(
  role: RoleId | Pending,
  laneContext: LaneContextKind,
  lanePhase: LanePhase,
): string {
  const r = role === PENDING ? "unknown" : role;
  return `${r}__${laneContext.toLowerCase()}__${lanePhase.toLowerCase()}`;
}

export function emptyLaneStateAvailability(): LaneStateAvailability {
  return {
    wave: false,
    health: false,
    resource: false,
    level: false,
    gold: false,
    items: false,
    runes: false,
    vision: false,
    tower: false,
    champion: false,
    matchup: false,
    teamComposition: false,
    degraded: true,
  };
}

/**
 * The canonical UNKNOWN lane state. Every consumer receives this shape when no
 * state information exists — nothing is ever fabricated.
 */
export function emptyLaneStateProfile(
  role: RoleId | Pending = PENDING,
  laneContext: LaneContextKind = "UNKNOWN",
  lanePhase: LanePhase = "UNKNOWN",
): LaneStateProfile {
  return {
    laneStateId: makeLaneStateId(role, laneContext, lanePhase),
    role,
    laneContext,
    lanePhase,

    waveState: "UNKNOWN",
    waveSize: "UNKNOWN",
    minionAdvantage: "UNKNOWN",
    minionAdvantageOwner: "UNKNOWN",
    waveDirection: "UNKNOWN",
    wavePosition: "UNKNOWN",
    freezePotential: "UNKNOWN",
    slowPushPotential: "UNKNOWN",
    crashPotential: "UNKNOWN",
    bouncePotential: "UNKNOWN",

    towerPressure: "UNKNOWN",
    towerPressureOwner: "UNKNOWN",
    towerState: "UNKNOWN",

    playerHealthState: "UNKNOWN",
    enemyHealthState: "UNKNOWN",
    playerResourceState: "UNKNOWN",
    enemyResourceState: "UNKNOWN",
    playerLevel: PENDING,
    enemyLevel: PENDING,
    levelAdvantage: "UNKNOWN",
    levelAdvantageOwner: "UNKNOWN",
    playerGold: PENDING,
    enemyGold: PENDING,
    goldAdvantage: "UNKNOWN",
    goldAdvantageOwner: "UNKNOWN",
    playerItemSpike: "UNKNOWN",
    enemyItemSpike: "UNKNOWN",
    playerRecallState: "UNKNOWN",
    enemyRecallState: "UNKNOWN",

    laneTempo: "UNKNOWN",
    lanePriority: "UNKNOWN",
    laneSafety: "UNKNOWN",
    laneControl: "UNKNOWN",

    allInThreat: "UNKNOWN",
    allInThreatOwner: "UNKNOWN",
    pokeThreat: "UNKNOWN",
    pokeThreatOwner: "UNKNOWN",
    gankThreat: "UNKNOWN",
    diveThreat: "UNKNOWN",
    roamOpportunity: "UNKNOWN",
    roamThreat: "UNKNOWN",
    junglerThreat: "UNKNOWN",

    visionState: "UNKNOWN",
    objectivePressure: "UNKNOWN",
    objectivePressureOwner: "UNKNOWN",
    mapState: "UNKNOWN",

    tradingState: "UNKNOWN",
    spacingState: "UNKNOWN",
    positioningState: "UNKNOWN",
    powerSpikeState: "UNKNOWN",
    recoveryState: "UNKNOWN",

    decisionPriorities: [],
    decisionReferences: [],
    curriculumReferences: [],
    habitReferences: [],
    practiceReferences: [],
    itemReferences: [],
    runeReferences: [],
    championReferences: [],
    compositionReferences: [],

    fundamentals: [],

    availability: emptyLaneStateAvailability(),
    source: "curated",
    observed: false,
  };
}