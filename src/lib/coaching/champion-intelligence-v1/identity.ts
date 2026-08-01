// ---------------------------------------------------------------------------
// Champion Intelligence Engine V1 — the permanent ChampionIdentity object.
//
//   ... → Habit Intelligence → Player Memory → Champion Intelligence (LAST
//   intelligence layer before external data)
//
// A ChampionIdentity is a fully placeholder-capable, reusable description of
// how ONE champion expresses the League fundamentals. Nothing here is
// populated: Data Dragon (or a curator) later fills the same shape, which is
// why every text field is `string | Pending` and every list defaults to [].
//
// Pure + client-safe. No Riot API, no Data Dragon, no statistics, no hardcoded
// champion logic and no coaching copy.
// ---------------------------------------------------------------------------
import { PENDING, type Pending, type KnowledgeSource } from "../knowledge-base/types";
import type { LeagueFundamentalId } from "../knowledge-base/fundamentals";
import type { RoleId } from "../knowledge-base/templates/champion";
import type {
  ChampionClassId,
  ChampionCoachingPoint,
  ChampionCurriculumReference,
  ChampionDamageProfile,
  ChampionDecisionReference,
  ChampionPhaseIdentity,
  ChampionPracticeFocus,
  ChampionRangeType,
  ChampionResourceType,
  ChampionRoleOverride,
  ChampionScalingProfile,
} from "./types";

export type ChampionDifficulty = "low" | "moderate" | "high" | "very-high" | "unknown";

/** The coaching-facing archetype label. Kept open so data can refine it. */
export type ChampionArchetypeId = string;

/**
 * A philosophy slot. `statements` stays empty until a data source populates
 * it; consumers must therefore always be able to fall back to Role
 * Intelligence — see `championIdentity()` in ./engine.
 */
export interface ChampionPhilosophy {
  fundamental: LeagueFundamentalId;
  summary: string | Pending;
  statements: string[];
}

/**
 * The permanent ChampionIdentity shape. Every field on the Sprint 4.0 list is
 * present and placeholder-capable.
 */
export interface ChampionIdentityV1 {
  championId: string;
  championName: string | Pending;
  championClass: ChampionClassId | Pending;
  championArchetype: ChampionArchetypeId | Pending;
  primaryRole: RoleId | Pending;
  secondaryRoles: RoleId[];
  damageProfile: ChampionDamageProfile | Pending;
  rangeType: ChampionRangeType | Pending;
  resourceType: ChampionResourceType | Pending;
  difficulty: ChampionDifficulty | Pending;
  scalingCurve: ChampionScalingProfile | Pending;
  earlyGameIdentity: ChampionPhaseIdentity;
  midGameIdentity: ChampionPhaseIdentity;
  lateGameIdentity: ChampionPhaseIdentity;
  lanePhilosophy: ChampionPhilosophy;
  teamfightPhilosophy: ChampionPhilosophy;
  sideLanePhilosophy: ChampionPhilosophy;
  objectivePhilosophy: ChampionPhilosophy;
  waveManagementPhilosophy: ChampionPhilosophy;
  recallPhilosophy: ChampionPhilosophy;
  economyPhilosophy: ChampionPhilosophy;
  visionPhilosophy: ChampionPhilosophy;
  positioningPhilosophy: ChampionPhilosophy;
  tradingPhilosophy: ChampionPhilosophy;
  powerSpikePhilosophy: ChampionPhilosophy;
  resourceManagementPhilosophy: ChampionPhilosophy;
  winConditions: string[];
  loseConditions: string[];
  strengthLibrary: ChampionCoachingPoint[];
  weaknessLibrary: ChampionCoachingPoint[];
  practiceFocus: ChampionPracticeFocus[];
  decisionOverrides: ChampionDecisionReference[];
  curriculumReferences: ChampionCurriculumReference[];
  roleIntelligenceOverrides: ChampionRoleOverride[];
  decisionLibraryReferences: ChampionDecisionReference[];
  source: KnowledgeSource;
  patch?: string;
  /** False until a data source populates this identity. */
  populated: boolean;
}

export function emptyPhilosophy(fundamental: LeagueFundamentalId): ChampionPhilosophy {
  return { fundamental, summary: PENDING, statements: [] };
}

function emptyPhase(phase: "early" | "mid" | "late"): ChampionPhaseIdentity {
  return { phase, identity: PENDING, rating: "unknown", notes: [] };
}

/** A valid, placeholder-only identity. Never throws, never invents data. */
export function emptyChampionIdentityV1(championId: string): ChampionIdentityV1 {
  return {
    championId,
    championName: PENDING,
    championClass: "unknown",
    championArchetype: PENDING,
    primaryRole: PENDING,
    secondaryRoles: [],
    damageProfile: "unknown",
    rangeType: "unknown",
    resourceType: "unknown",
    difficulty: "unknown",
    scalingCurve: "unknown",
    earlyGameIdentity: emptyPhase("early"),
    midGameIdentity: emptyPhase("mid"),
    lateGameIdentity: emptyPhase("late"),
    lanePhilosophy: emptyPhilosophy("champion-identity"),
    teamfightPhilosophy: emptyPhilosophy("positioning"),
    sideLanePhilosophy: emptyPhilosophy("map-movement"),
    objectivePhilosophy: emptyPhilosophy("objective-control"),
    waveManagementPhilosophy: emptyPhilosophy("wave-management"),
    recallPhilosophy: emptyPhilosophy("tempo"),
    economyPhilosophy: emptyPhilosophy("economy"),
    visionPhilosophy: emptyPhilosophy("vision"),
    positioningPhilosophy: emptyPhilosophy("positioning"),
    tradingPhilosophy: emptyPhilosophy("trading"),
    powerSpikePhilosophy: emptyPhilosophy("power-spikes"),
    resourceManagementPhilosophy: emptyPhilosophy("resource-management"),
    winConditions: [],
    loseConditions: [],
    strengthLibrary: [],
    weaknessLibrary: [],
    practiceFocus: [],
    decisionOverrides: [],
    curriculumReferences: [],
    roleIntelligenceOverrides: [],
    decisionLibraryReferences: [],
    source: "curated",
    populated: false,
  };
}
