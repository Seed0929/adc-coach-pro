// ---------------------------------------------------------------------------
// Lane State Intelligence V1 — deterministic engine (Sprint 5.0).
//
// Turns raw (and usually partial) lane observations into a structured
// LaneStateProfile. It DERIVES STATE ONLY: level advantage, health state,
// wave relationship, threat magnitude, reference routing. It never decides
// what the player should do — the reasoning layer owns that.
//
// Every derivation degrades to UNKNOWN when its inputs are missing.
// ---------------------------------------------------------------------------
import { PENDING, type KnowledgeSource, type Pending } from "../knowledge-base/types";
import type { LeagueFundamentalId } from "../knowledge-base/fundamentals";
import { getLeagueDecision } from "../knowledge-base/league-decision-library";
import type { RoleId } from "../knowledge-base/templates/champion";
import { ChampionIntelligenceV1 } from "../champion-intelligence-v1";
import { MatchupIntelligenceV1 } from "../matchup-intelligence-v1";
import {
  emptyLaneStateProfile,
  makeLaneStateId,
  type HealthState,
  type ItemSpikeState,
  type LaneContextKind,
  type LaneControl,
  type LanePhase,
  type LanePriority,
  type LaneSafety,
  type LaneStateAvailability,
  type LaneStateCurriculumReference,
  type LaneStateDecisionPriority,
  type LaneStateDecisionReference,
  type LaneStateHabitReference,
  type LaneStateInput,
  type LaneStateItemReference,
  type LaneStateParticipantInput,
  type LaneStatePracticeReference,
  type LaneStateProfile,
  type LaneStateRuneReference,
  type LaneTempo,
  type PowerSpikeState,
  type RecallState,
  type RecoveryState,
  type ResourceState,
  type StateLikelihood,
  type StateMagnitude,
  type StateOwner,
  type WaveDirection,
  type WavePosition,
  type WaveSize,
  type WaveState,
} from "./types";

const ROLES: RoleId[] = ["top", "jungle", "mid", "adc", "support"];

export function normalizeRole(role?: RoleId | string | null): RoleId | Pending {
  if (!role) return PENDING;
  const r = String(role).toLowerCase();
  const alias: Record<string, RoleId> = {
    top: "top",
    jungle: "jungle",
    jg: "jungle",
    mid: "mid",
    middle: "mid",
    adc: "adc",
    bottom: "adc",
    bot: "adc",
    marksman: "adc",
    support: "support",
    utility: "support",
    sup: "support",
  };
  return alias[r] ?? PENDING;
}

/** Default lane context for a role — never forces an ADC-style lane model. */
export function defaultLaneContext(role: RoleId | Pending): LaneContextKind {
  switch (role) {
    case "top":
    case "mid":
      return "LANE";
    case "adc":
    case "support":
      return "SHARED_LANE";
    case "jungle":
      return "JUNGLE";
    default:
      return "UNKNOWN";
  }
}

/** Coarse phase hint from the game clock. UNKNOWN when no clock is supplied. */
export function lanePhaseFromClock(seconds?: number): LanePhase {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return "UNKNOWN";
  if (seconds < 105) return "EARLY";
  if (seconds < 180) return "LEVEL_2";
  if (seconds < 330) return "LEVEL_3";
  if (seconds < 480) return "FIRST_RECALL";
  if (seconds < 600) return "LEVEL_6";
  if (seconds < 780) return "MID_LANE_PHASE";
  if (seconds < 840) return "TOWER_PLATE_PHASE";
  if (seconds < 1020) return "LATE_LANE_STATE";
  return "MID_GAME_TRANSITION";
}

// ---------------------------------------------------------------------------
// Primitive derivations
// ---------------------------------------------------------------------------

function ratio(current?: number, max?: number): number | undefined {
  if (typeof current !== "number" || typeof max !== "number" || max <= 0) return undefined;
  return Math.max(0, Math.min(1, current / max));
}

export function healthStateFrom(current?: number, max?: number): HealthState {
  const r = ratio(current, max);
  if (r === undefined) return "UNKNOWN";
  if (r >= 0.99) return "FULL";
  if (r >= 0.7) return "HEALTHY";
  if (r >= 0.45) return "MODERATE";
  if (r >= 0.2) return "LOW";
  return "CRITICAL";
}

export function resourceStateFrom(p?: LaneStateParticipantInput): ResourceState {
  if (p?.resourceless) return "NONE";
  const r = ratio(p?.resource, p?.maxResource);
  if (r === undefined) return "UNKNOWN";
  if (r >= 0.99) return "FULL";
  if (r >= 0.6) return "HEALTHY";
  if (r >= 0.35) return "MODERATE";
  if (r > 0.05) return "LOW";
  return "EMPTY";
}

function magnitudeFromDelta(
  delta: number | undefined,
  thresholds: [number, number, number],
): { magnitude: StateMagnitude; owner: StateOwner } {
  if (delta === undefined || !Number.isFinite(delta)) {
    return { magnitude: "UNKNOWN", owner: "UNKNOWN" };
  }
  const abs = Math.abs(delta);
  const owner: StateOwner = abs < thresholds[0] ? "EVEN" : delta > 0 ? "PLAYER" : "ENEMY";
  const magnitude: StateMagnitude =
    abs < thresholds[0]
      ? "NONE"
      : abs < thresholds[1]
        ? "SLIGHT"
        : abs < thresholds[2]
          ? "CLEAR"
          : "SIGNIFICANT";
  return { magnitude, owner };
}

export function levelAdvantageFrom(playerLevel?: number, enemyLevel?: number) {
  if (typeof playerLevel !== "number" || typeof enemyLevel !== "number") {
    return { magnitude: "UNKNOWN" as StateMagnitude, owner: "UNKNOWN" as StateOwner };
  }
  return magnitudeFromDelta(playerLevel - enemyLevel, [1, 2, 3]);
}

export function goldAdvantageFrom(playerGold?: number, enemyGold?: number) {
  if (typeof playerGold !== "number" || typeof enemyGold !== "number") {
    return { magnitude: "UNKNOWN" as StateMagnitude, owner: "UNKNOWN" as StateOwner };
  }
  return magnitudeFromDelta(playerGold - enemyGold, [150, 600, 1500]);
}

export function minionAdvantageFrom(playerMinions?: number, enemyMinions?: number) {
  if (typeof playerMinions !== "number" || typeof enemyMinions !== "number") {
    return { magnitude: "UNKNOWN" as StateMagnitude, owner: "UNKNOWN" as StateOwner };
  }
  return magnitudeFromDelta(playerMinions - enemyMinions, [1, 3, 6]);
}

/**
 * Wave direction implied by a wave state. Never guessed from partial data:
 * an UNKNOWN wave state yields an UNKNOWN direction.
 */
export function waveDirectionFrom(state: WaveState, explicit?: WaveDirection): WaveDirection {
  if (explicit) return explicit;
  switch (state) {
    case "PUSHING_TOWARD_PLAYER":
      return "TOWARD_PLAYER";
    case "PUSHING_TOWARD_ENEMY":
    case "SLOW_PUSH":
    case "CRASHING":
      return "TOWARD_ENEMY";
    case "BOUNCING":
      return "TOWARD_PLAYER";
    case "FREEZE":
    case "FROZEN_NEAR_PLAYER":
    case "FROZEN_NEAR_ENEMY":
      return "STATIC";
    case "NEUTRAL":
      return "STATIC";
    default:
      return "UNKNOWN";
  }
}

export function wavePositionFrom(state: WaveState, explicit?: WavePosition): WavePosition {
  if (explicit) return explicit;
  switch (state) {
    case "FROZEN_NEAR_PLAYER":
      return "PLAYER_SIDE";
    case "FROZEN_NEAR_ENEMY":
      return "ENEMY_SIDE";
    case "CRASHING":
      return "ENEMY_TOWER";
    case "NEUTRAL":
      return "MIDDLE";
    default:
      return "UNKNOWN";
  }
}

interface WavePotentials {
  freezePotential: StateLikelihood;
  slowPushPotential: StateLikelihood;
  crashPotential: StateLikelihood;
  bouncePotential: StateLikelihood;
}

/** Structural potentials of the CURRENT wave. Not a recommendation. */
export function wavePotentialsFrom(state: WaveState): WavePotentials {
  const none: WavePotentials = {
    freezePotential: "UNKNOWN",
    slowPushPotential: "UNKNOWN",
    crashPotential: "UNKNOWN",
    bouncePotential: "UNKNOWN",
  };
  switch (state) {
    case "UNKNOWN":
      return none;
    case "PUSHING_TOWARD_PLAYER":
      return {
        freezePotential: "HIGH",
        slowPushPotential: "LOW",
        crashPotential: "LOW",
        bouncePotential: "MODERATE",
      };
    case "PUSHING_TOWARD_ENEMY":
      return {
        freezePotential: "LOW",
        slowPushPotential: "MODERATE",
        crashPotential: "HIGH",
        bouncePotential: "MODERATE",
      };
    case "SLOW_PUSH":
      return {
        freezePotential: "LOW",
        slowPushPotential: "HIGH",
        crashPotential: "HIGH",
        bouncePotential: "LOW",
      };
    case "CRASHING":
      return {
        freezePotential: "NONE",
        slowPushPotential: "NONE",
        crashPotential: "HIGH",
        bouncePotential: "HIGH",
      };
    case "BOUNCING":
      return {
        freezePotential: "MODERATE",
        slowPushPotential: "LOW",
        crashPotential: "LOW",
        bouncePotential: "HIGH",
      };
    case "FREEZE":
    case "FROZEN_NEAR_PLAYER":
      return {
        freezePotential: "HIGH",
        slowPushPotential: "NONE",
        crashPotential: "NONE",
        bouncePotential: "LOW",
      };
    case "FROZEN_NEAR_ENEMY":
      return {
        freezePotential: "HIGH",
        slowPushPotential: "NONE",
        crashPotential: "LOW",
        bouncePotential: "LOW",
      };
    case "NEUTRAL":
      return {
        freezePotential: "MODERATE",
        slowPushPotential: "MODERATE",
        crashPotential: "LOW",
        bouncePotential: "LOW",
      };
    default:
      return none;
  }
}

/** Lane tempo relationship. Reads wave + recall + level only. */
export function laneTempoFrom(
  waveState: WaveState,
  levelOwner: StateOwner,
  playerRecall: RecallState,
  enemyRecall: RecallState,
): LaneTempo {
  if (playerRecall === "BASE" || enemyRecall === "BASE") return "RESET_WINDOW";
  if (waveState === "CRASHING") return "RESET_WINDOW";
  if (waveState === "UNKNOWN" && levelOwner === "UNKNOWN") return "UNKNOWN";
  if (waveState === "PUSHING_TOWARD_ENEMY" || waveState === "SLOW_PUSH") return "PLAYER_TEMPO";
  if (waveState === "PUSHING_TOWARD_PLAYER") return "ENEMY_TEMPO";
  if (levelOwner === "PLAYER") return "PLAYER_TEMPO";
  if (levelOwner === "ENEMY") return "ENEMY_TEMPO";
  return "NEUTRAL";
}

export function lanePriorityFrom(waveState: WaveState, context: LaneContextKind): LanePriority {
  if (context === "JUNGLE" || context === "NO_ACTIVE_LANE") return "NONE";
  switch (waveState) {
    case "PUSHING_TOWARD_ENEMY":
    case "SLOW_PUSH":
    case "CRASHING":
      return "PLAYER";
    case "PUSHING_TOWARD_PLAYER":
    case "FROZEN_NEAR_PLAYER":
      return "ENEMY";
    case "NEUTRAL":
      return "SHARED";
    default:
      return "UNKNOWN";
  }
}

export function laneSafetyFrom(
  health: HealthState,
  wavePosition: WavePosition,
  gankThreat: StateLikelihood,
): LaneSafety {
  if (health === "UNKNOWN" && wavePosition === "UNKNOWN" && gankThreat === "UNKNOWN") {
    return "UNKNOWN";
  }
  if (health === "CRITICAL") return "CRITICAL";
  const exposed = wavePosition === "ENEMY_TOWER" || wavePosition === "ENEMY_SIDE";
  if (exposed && (gankThreat === "HIGH" || health === "LOW")) return "CRITICAL";
  if (exposed || gankThreat === "HIGH" || health === "LOW") return "EXPOSED";
  if (gankThreat === "MODERATE" || health === "MODERATE") return "CAUTIOUS";
  return "SAFE";
}

export function laneControlFrom(priority: LanePriority, tempo: LaneTempo): LaneControl {
  if (priority === "PLAYER" && tempo === "PLAYER_TEMPO") return "PLAYER";
  if (priority === "ENEMY" && tempo === "ENEMY_TEMPO") return "ENEMY";
  if (priority === "SHARED") return "CONTESTED";
  if (priority === "NONE") return "NEUTRAL";
  if (priority === "UNKNOWN" && tempo === "UNKNOWN") return "UNKNOWN";
  return "CONTESTED";
}

export function towerPressureFrom(
  wavePosition: WavePosition,
  waveState: WaveState,
): { magnitude: StateMagnitude; owner: StateOwner } {
  if (wavePosition === "ENEMY_TOWER" || waveState === "CRASHING") {
    return { magnitude: "CLEAR", owner: "PLAYER" };
  }
  if (wavePosition === "PLAYER_TOWER") return { magnitude: "CLEAR", owner: "ENEMY" };
  if (wavePosition === "ENEMY_SIDE") return { magnitude: "SLIGHT", owner: "PLAYER" };
  if (wavePosition === "PLAYER_SIDE") return { magnitude: "SLIGHT", owner: "ENEMY" };
  if (wavePosition === "MIDDLE") return { magnitude: "NONE", owner: "EVEN" };
  return { magnitude: "UNKNOWN", owner: "UNKNOWN" };
}

export function recallStateFrom(
  p: LaneStateParticipantInput | undefined,
  waveState: WaveState,
): RecallState {
  if (p?.recallState) return p.recallState;
  if (waveState === "CRASHING") return "WINDOW_AVAILABLE";
  if (waveState === "UNKNOWN") return "UNKNOWN";
  return "NO_WINDOW";
}

export function itemSpikeFrom(p?: LaneStateParticipantInput): ItemSpikeState {
  if (p?.itemSpike) return p.itemSpike;
  if (typeof p?.completedItems !== "number") return "UNKNOWN";
  if (p.completedItems <= 0) return p.itemIds?.length ? "COMPONENT" : "NONE";
  if (p.completedItems === 1) return "FIRST_ITEM";
  if (p.completedItems === 2) return "TWO_ITEM";
  return "COMPLETED_SPIKE";
}

export function powerSpikeStateFrom(
  playerSpike: ItemSpikeState,
  enemySpike: ItemSpikeState,
  levelOwner: StateOwner,
): PowerSpikeState {
  const spiked = (s: ItemSpikeState) =>
    s === "FIRST_ITEM" || s === "TWO_ITEM" || s === "COMPLETED_SPIKE";
  if (playerSpike === "UNKNOWN" && enemySpike === "UNKNOWN") {
    if (levelOwner === "PLAYER") return "PLAYER_APPROACHING";
    if (levelOwner === "ENEMY") return "ENEMY_APPROACHING";
    return "UNKNOWN";
  }
  const p = spiked(playerSpike);
  const e = spiked(enemySpike);
  if (p && e) return "BOTH_SPIKED";
  if (p) return "PLAYER_SPIKED";
  if (e) return "ENEMY_SPIKED";
  return "NONE";
}

export function recoveryStateFrom(
  goldOwner: StateOwner,
  goldMagnitude: StateMagnitude,
  health: HealthState,
  recall: RecallState,
): RecoveryState {
  if (health === "CRITICAL" || health === "LOW") return "NEEDS_RESET";
  if (recall === "RECALLING" || recall === "RETURNING" || recall === "BASE") return "RECOVERING";
  if (goldOwner === "UNKNOWN") return "UNKNOWN";
  if (goldOwner === "ENEMY" && (goldMagnitude === "CLEAR" || goldMagnitude === "SIGNIFICANT")) {
    return "BEHIND";
  }
  if (goldOwner === "PLAYER" && (goldMagnitude === "CLEAR" || goldMagnitude === "SIGNIFICANT")) {
    return "AHEAD";
  }
  return "STABLE";
}

/**
 * Immediate all-in threat relationship. Health + level only — champion
 * capability facts stay in Champion Intelligence, matchup facts in Matchup
 * Intelligence; this only reports the observed state relationship.
 */
export function allInThreatFrom(
  playerHealth: HealthState,
  enemyHealth: HealthState,
  levelOwner: StateOwner,
): { magnitude: StateMagnitude; owner: StateOwner } {
  const score = (h: HealthState): number | undefined => {
    switch (h) {
      case "FULL":
        return 4;
      case "HEALTHY":
        return 3;
      case "MODERATE":
        return 2;
      case "LOW":
        return 1;
      case "CRITICAL":
        return 0;
      default:
        return undefined;
    }
  };
  const p = score(playerHealth);
  const e = score(enemyHealth);
  if (p === undefined || e === undefined) {
    if (levelOwner === "PLAYER") return { magnitude: "SLIGHT", owner: "PLAYER" };
    if (levelOwner === "ENEMY") return { magnitude: "SLIGHT", owner: "ENEMY" };
    return { magnitude: "UNKNOWN", owner: "UNKNOWN" };
  }
  const levelBonus = levelOwner === "PLAYER" ? 1 : levelOwner === "ENEMY" ? -1 : 0;
  return magnitudeFromDelta(p - e + levelBonus, [1, 2, 3]);
}

// ---------------------------------------------------------------------------
// Reference routing — pointers only, never coaching text
// ---------------------------------------------------------------------------

function decisionRef(
  decisionId: string,
  weightMultiplier: number,
): LaneStateDecisionReference | null {
  const decision = getLeagueDecision(decisionId);
  if (!decision) return null;
  return { decisionId, label: decision.label ?? PENDING, weightMultiplier, note: PENDING };
}

const WAVE_DECISIONS: Partial<Record<WaveState, string[]>> = {
  CRASHING: ["recall-on-crash", "leave-lane-after-crash", "reset-timing-discipline"],
  SLOW_PUSH: ["leave-lane-after-crash", "rotate-to-objective"],
  PUSHING_TOWARD_ENEMY: ["rotate-to-objective", "cross-map-trade"],
  PUSHING_TOWARD_PLAYER: ["hold-safe-angle", "manage-resources"],
  FROZEN_NEAR_PLAYER: ["hold-safe-angle"],
  FROZEN_NEAR_ENEMY: ["respect-jungle-tracking", "hold-safe-angle"],
  FREEZE: ["hold-safe-angle"],
  BOUNCING: ["manage-resources"],
  NEUTRAL: ["trade-on-cooldowns"],
};

const WAVE_FUNDAMENTALS: LeagueFundamentalId[] = ["wave-management", "tempo"];

/** Which fundamentals the observed state touches — routing hint only. */
export function fundamentalsFor(profile: LaneStateProfile): LeagueFundamentalId[] {
  const out = new Set<LeagueFundamentalId>();
  if (profile.waveState !== "UNKNOWN") WAVE_FUNDAMENTALS.forEach((f) => out.add(f));
  if (profile.levelAdvantage !== "UNKNOWN" || profile.goldAdvantage !== "UNKNOWN") {
    out.add("economy");
  }
  if (profile.playerResourceState !== "UNKNOWN") out.add("resource-management");
  if (profile.allInThreat !== "UNKNOWN") out.add("trading");
  if (profile.laneSafety !== "UNKNOWN") out.add("positioning");
  if (profile.visionState !== "UNKNOWN") out.add("vision");
  if (profile.objectivePressure !== "UNKNOWN") out.add("objective-control");
  if (profile.roamOpportunity !== "UNKNOWN" || profile.roamThreat !== "UNKNOWN") {
    out.add("map-movement");
  }
  if (profile.powerSpikeState !== "UNKNOWN") out.add("power-spikes");
  if (profile.playerRecallState !== "UNKNOWN") out.add("tempo");
  out.add("decision-making");
  return [...out];
}

function curriculumRefsFor(fundamentals: LeagueFundamentalId[]): LaneStateCurriculumReference[] {
  return fundamentals.map((f, i) => ({
    topicId: f,
    fundamental: f,
    emphasis: i === 0 ? "primary" : "situational",
    note: PENDING,
  }));
}

const HABIT_BY_FUNDAMENTAL: Partial<Record<LeagueFundamentalId, string[]>> = {
  "wave-management": ["poor-wave-control"],
  trading: ["overtrading", "missed-punish-windows"],
  tempo: ["bad-recall-timing", "overstaying"],
  positioning: ["unsafe-positioning", "poor-spacing"],
  vision: ["low-vision-usage"],
  "resource-management": ["resource-mismanagement"],
};

function habitRefsFor(
  fundamentals: LeagueFundamentalId[],
  role: RoleId | Pending,
): LaneStateHabitReference[] {
  const roles = role === PENDING ? ROLES : [role];
  const out: LaneStateHabitReference[] = [];
  for (const f of fundamentals) {
    for (const habitId of HABIT_BY_FUNDAMENTAL[f] ?? []) {
      out.push({ habitId, fundamental: f, label: PENDING, roles });
    }
  }
  return out;
}

function practiceRefsFor(fundamentals: LeagueFundamentalId[]): LaneStatePracticeReference[] {
  return fundamentals.map((f) => ({
    practiceId: `practice__${f}`,
    label: PENDING,
    fundamental: f,
    measurable: PENDING,
  }));
}

function itemRefsFor(input: LaneStateInput): LaneStateItemReference[] {
  const refs: LaneStateItemReference[] = [];
  for (const [owner, p] of [
    ["player", input.player],
    ["enemy", input.enemy],
  ] as const) {
    for (const itemId of p?.itemIds ?? []) {
      refs.push({ itemId, relevance: "unknown", owner, note: PENDING });
    }
  }
  return refs;
}

function runeRefsFor(input: LaneStateInput): LaneStateRuneReference[] {
  const refs: LaneStateRuneReference[] = [];
  for (const [owner, p] of [
    ["player", input.player],
    ["enemy", input.enemy],
  ] as const) {
    for (const runeId of p?.runeIds ?? []) {
      refs.push({ runeId, relevance: "unknown", owner, note: PENDING });
    }
  }
  return refs;
}

function decisionPrioritiesFor(
  refs: LaneStateDecisionReference[],
  role: RoleId | Pending,
): LaneStateDecisionPriority[] {
  const roles = role === PENDING ? ROLES : [role];
  return refs.map((r, i) => ({
    tier: i === 0 ? "high" : i === 1 ? "medium" : "low",
    decisionId: r.decisionId,
    fundamental: getLeagueDecision(r.decisionId)?.fundamental ?? PENDING,
    roles,
    note: PENDING,
  }));
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

function availabilityFor(input: LaneStateInput, matchupPopulated: boolean): LaneStateAvailability {
  const a: LaneStateAvailability = {
    wave: Boolean(input.wave?.state || typeof input.wave?.playerMinions === "number"),
    health: typeof input.player?.health === "number" && typeof input.player?.maxHealth === "number",
    resource:
      Boolean(input.player?.resourceless) ||
      (typeof input.player?.resource === "number" && typeof input.player?.maxResource === "number"),
    level: typeof input.player?.level === "number" && typeof input.enemy?.level === "number",
    gold: typeof input.player?.gold === "number" && typeof input.enemy?.gold === "number",
    items: Boolean(input.player?.itemIds?.length || typeof input.player?.completedItems === "number"),
    runes: Boolean(input.player?.runeIds?.length),
    vision: Boolean(input.map?.visionState),
    tower: Boolean(input.tower?.state),
    champion: Boolean(input.player?.champion && input.enemy?.champion),
    matchup: matchupPopulated,
    teamComposition: Boolean(input.compositionIds?.analyzed || input.compositionIds?.opposing),
    degraded: false,
  };
  a.degraded = Object.entries(a).some(([k, v]) => k !== "degraded" && v === false);
  return a;
}

// ---------------------------------------------------------------------------
// The builder
// ---------------------------------------------------------------------------

/**
 * Build a LaneStateProfile from (usually partial) observations.
 * With an empty input this returns the canonical UNKNOWN profile.
 */
export function buildLaneState(input: LaneStateInput = {}): LaneStateProfile {
  const role = normalizeRole(input.role);
  const laneContext = input.laneContext ?? defaultLaneContext(role);
  const lanePhase = input.lanePhase ?? lanePhaseFromClock(input.gameTimeSeconds);

  const base = emptyLaneStateProfile(role, laneContext, lanePhase);
  const source: KnowledgeSource = input.source ?? "curated";

  const waveState: WaveState = input.wave?.state ?? "UNKNOWN";
  const waveSize: WaveSize = input.wave?.size ?? "UNKNOWN";
  const waveDirection = waveDirectionFrom(waveState, input.wave?.direction);
  const wavePosition = wavePositionFrom(waveState, input.wave?.position);
  const potentials = wavePotentialsFrom(waveState);
  const minions = minionAdvantageFrom(input.wave?.playerMinions, input.wave?.enemyMinions);

  const playerHealthState = healthStateFrom(input.player?.health, input.player?.maxHealth);
  const enemyHealthState = healthStateFrom(input.enemy?.health, input.enemy?.maxHealth);
  const level = levelAdvantageFrom(input.player?.level, input.enemy?.level);
  const gold = goldAdvantageFrom(input.player?.gold, input.enemy?.gold);

  const playerRecallState = recallStateFrom(input.player, waveState);
  const enemyRecallState = recallStateFrom(input.enemy, waveState);

  const playerItemSpike = itemSpikeFrom(input.player);
  const enemyItemSpike = itemSpikeFrom(input.enemy);

  const laneTempo = laneTempoFrom(waveState, level.owner, playerRecallState, enemyRecallState);
  const lanePriority = lanePriorityFrom(waveState, laneContext);
  const gankThreat = input.map?.gankThreat ?? input.map?.junglerThreat ?? "UNKNOWN";
  const laneSafety = laneSafetyFrom(playerHealthState, wavePosition, gankThreat);
  const laneControl = laneControlFrom(lanePriority, laneTempo);

  const towerFromWave = towerPressureFrom(wavePosition, waveState);
  const allIn = allInThreatFrom(playerHealthState, enemyHealthState, level.owner);

  const matchup =
    input.player?.champion && input.enemy?.champion
      ? MatchupIntelligenceV1.getMatchup(input.player.champion, input.enemy.champion, role === PENDING ? null : role)
      : undefined;

  const championReferences = (
    [
      ["player", input.player?.champion],
      ["enemy", input.enemy?.champion],
    ] as const
  )
    .filter(([, champion]) => Boolean(champion))
    .map(([owner, champion]) => ({
      champion: champion as string,
      owner,
      known: ChampionIntelligenceV1.isAvailable(champion as string),
    }));

  const decisionReferences = (WAVE_DECISIONS[waveState] ?? [])
    .map((id) => decisionRef(id, 1))
    .filter((r): r is LaneStateDecisionReference => Boolean(r));

  const profile: LaneStateProfile = {
    ...base,
    laneStateId: input.laneStateId ?? makeLaneStateId(role, laneContext, lanePhase),

    waveState,
    waveSize,
    minionAdvantage: minions.magnitude,
    minionAdvantageOwner: minions.owner,
    waveDirection,
    wavePosition,
    ...potentials,

    towerPressure: towerFromWave.magnitude,
    towerPressureOwner: input.tower?.pressureOwner ?? towerFromWave.owner,
    towerState: input.tower?.state ?? "UNKNOWN",

    playerHealthState,
    enemyHealthState,
    playerResourceState: resourceStateFrom(input.player),
    enemyResourceState: resourceStateFrom(input.enemy),
    playerLevel: typeof input.player?.level === "number" ? input.player.level : PENDING,
    enemyLevel: typeof input.enemy?.level === "number" ? input.enemy.level : PENDING,
    levelAdvantage: level.magnitude,
    levelAdvantageOwner: level.owner,
    playerGold: typeof input.player?.gold === "number" ? input.player.gold : PENDING,
    enemyGold: typeof input.enemy?.gold === "number" ? input.enemy.gold : PENDING,
    goldAdvantage: gold.magnitude,
    goldAdvantageOwner: gold.owner,
    playerItemSpike,
    enemyItemSpike,
    playerRecallState,
    enemyRecallState,

    laneTempo,
    lanePriority,
    laneSafety,
    laneControl,

    allInThreat: allIn.magnitude,
    allInThreatOwner: allIn.owner,
    pokeThreat: "UNKNOWN",
    pokeThreatOwner: "UNKNOWN",
    gankThreat,
    diveThreat: input.map?.diveThreat ?? "UNKNOWN",
    roamOpportunity: input.map?.roamOpportunity ?? "UNKNOWN",
    roamThreat: input.map?.roamThreat ?? "UNKNOWN",
    junglerThreat: input.map?.junglerThreat ?? "UNKNOWN",

    visionState: input.map?.visionState ?? "UNKNOWN",
    objectivePressure: input.map?.objectivePressure ?? "UNKNOWN",
    objectivePressureOwner: input.map?.objectivePressureOwner ?? "UNKNOWN",
    mapState: input.map?.mapState ?? "UNKNOWN",

    tradingState: input.tradingState ?? "UNKNOWN",
    spacingState: input.spacingState ?? "UNKNOWN",
    positioningState: input.positioningState ?? "UNKNOWN",
    powerSpikeState: powerSpikeStateFrom(playerItemSpike, enemyItemSpike, level.owner),
    recoveryState: recoveryStateFrom(gold.owner, gold.magnitude, playerHealthState, playerRecallState),

    decisionReferences,
    decisionPriorities: decisionPrioritiesFor(decisionReferences, role),
    itemReferences: itemRefsFor(input),
    runeReferences: runeRefsFor(input),
    championReferences,
    matchupReference: matchup
      ? {
          matchupId: matchup.matchupId,
          championA: matchup.championA,
          championB: matchup.championB,
          populated: matchup.populated,
        }
      : undefined,
    compositionReferences: [
      ...(input.compositionIds?.analyzed
        ? [{ compositionId: input.compositionIds.analyzed, side: "analyzed" as const, populated: false }]
        : []),
      ...(input.compositionIds?.opposing
        ? [{ compositionId: input.compositionIds.opposing, side: "opposing" as const, populated: false }]
        : []),
    ],

    availability: availabilityFor(input, Boolean(matchup?.populated)),
    source,
    observed: false,
  };

  const fundamentals = fundamentalsFor(profile);
  profile.fundamentals = fundamentals;
  profile.curriculumReferences = curriculumRefsFor(fundamentals);
  profile.habitReferences = habitRefsFor(fundamentals, role);
  profile.practiceReferences = practiceRefsFor(fundamentals);
  profile.observed =
    profile.waveState !== "UNKNOWN" ||
    profile.playerHealthState !== "UNKNOWN" ||
    profile.levelAdvantage !== "UNKNOWN" ||
    profile.goldAdvantage !== "UNKNOWN" ||
    profile.towerState !== "UNKNOWN" ||
    profile.mapState !== "UNKNOWN";

  return profile;
}

/** The canonical UNKNOWN profile — used whenever no state source exists. */
export function safeFallback(role?: RoleId | string | null): LaneStateProfile {
  const r = normalizeRole(role);
  return emptyLaneStateProfile(r, defaultLaneContext(r), "UNKNOWN");
}

/** True when at least one real observation backed the profile. */
export function isObserved(profile: LaneStateProfile): boolean {
  return profile.observed;
}

/** True when any expected state source was missing. */
export function isDegraded(profile: LaneStateProfile): boolean {
  return profile.availability.degraded;
}

export function getWaveState(profile: LaneStateProfile): WaveState {
  return profile.waveState;
}

export function getLanePhase(profile: LaneStateProfile): LanePhase {
  return profile.lanePhase;
}

export function getDecisionReferences(profile: LaneStateProfile): LaneStateDecisionReference[] {
  return profile.decisionReferences;
}

export function getDecisionPriorities(profile: LaneStateProfile): LaneStateDecisionPriority[] {
  return profile.decisionPriorities;
}

export function getCurriculumReferences(profile: LaneStateProfile): LaneStateCurriculumReference[] {
  return profile.curriculumReferences;
}

export function getHabitReferences(profile: LaneStateProfile): LaneStateHabitReference[] {
  return profile.habitReferences;
}

export function getPracticeReferences(profile: LaneStateProfile): LaneStatePracticeReference[] {
  return profile.practiceReferences;
}

export function getFundamentals(profile: LaneStateProfile): LeagueFundamentalId[] {
  return profile.fundamentals;
}