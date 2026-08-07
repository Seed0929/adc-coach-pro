// ---------------------------------------------------------------------------
// BotDiff Unified Coaching Context (Sprint 3.6)
//
// The ONE canonical contract every coaching system passes around:
//
//   Coaching Pipeline → UnifiedCoachingContext → Match Report
//                                              → Replay Coach
//                                              → Practice Planner
//                                              → future AI Coach
//                                              → future Player Memory
//
// It stores REFERENCES (ids + pointers into the existing layers), never
// duplicated knowledge. Champion Intelligence, Habit data and Player Memory
// are OPTIONAL placeholders: with all three absent the context is still fully
// functional from League Intelligence + Curriculum + Role Intelligence +
// Decision ids.
//
// PURE + client-safe. No AI, no network, no persistence.
// ---------------------------------------------------------------------------
import {
  getLeagueDecision,
  type CurriculumTopicId,
  type LeagueDecision,
  type LeagueFundamentalId,
} from "./knowledge-base";
import type { RoleId } from "./knowledge-base/templates/champion";
import type { CoachingContext, CoachingIssue } from "./coaching-pipeline";
import type { PrioritizedDecision, DecisionScoreBreakdown } from "./decision-priority-engine";
import type { HabitContext } from "./habit-context";
import type { ChampionProfile } from "./champion-intelligence";
import type { MatchupProfileV1, MatchupRoleContext } from "./matchup-intelligence-v1/types";
import type {
  CompositionAvailability,
  CompositionRelationship,
  TeamCompositionAnalysis,
  TeamCompositionProfile,
} from "./team-composition-intelligence-v1/types";
import type {
  LanePhase,
  LaneContextKind,
  LaneStateAvailability,
  LaneStateDecisionPriority,
  LaneStateProfile,
  WaveState,
} from "./lane-state-intelligence-v1/types";

// ---------------------------------------------------------------------------
// Reference shapes — pointers into the permanent layers
// ---------------------------------------------------------------------------

/** Pointer into League Intelligence + the Fundamentals knowledge base. */
export interface LeagueIntelligenceRef {
  fundamental: LeagueFundamentalId;
  fundamentalLabel: string;
  /** Factual concept labels loaded by the pipeline, not coaching text. */
  conceptLabels: string[];
  /** Objectives / map zones the fundamental touches. */
  references: string[];
}

/** Pointer into the Coaching Curriculum. */
export interface CurriculumRef {
  topic: CurriculumTopicId;
  topicLabel: string;
  supportingTopics: CurriculumTopicId[];
  /** Decision-library pattern id when the habit is routed. */
  decisionPatternId?: string;
}

/** Pointer into Role Intelligence V1. */
export interface RoleIntelligenceRef {
  role: RoleId;
  roleLabel: string;
  /** Role decision priorities relevant to this fundamental (tier: decision). */
  decisionPriorities: string[];
}

/** Pointer into the League Decision Library. */
export interface DecisionRef {
  /** Stable habit / decision id — the aggregation + routing key. */
  decisionId: string;
  label: string;
  kind: CoachingIssue["kind"];
  /** League Decision Library id when the decision maps to one. */
  leagueDecisionId?: string;
}

/** Output of the Decision Prioritization Engine, by reference. */
export interface DecisionPriorityRef {
  /** 0-100 overall coaching priority. */
  priority: number;
  scores?: DecisionScoreBreakdown;
  reason?: string;
  evidence: string[];
}

/** Where this decision sits in the player's coaching queue. */
export type UnifiedPriorityRank =
  | "primary"
  | "secondary"
  | "recovery"
  | "reinforce"
  | "maintain"
  | "unranked";

export interface UnifiedCoachingPriority {
  rank: UnifiedPriorityRank;
  /** Position in the ranked list (0-based) when ranked by the engine. */
  order: number;
  impact: NonNullable<CoachingIssue["impact"]>;
}

/** Practice recommendation, referenced back into the curriculum. */
export interface PracticeRecommendationRef {
  topic: CurriculumTopicId;
  drill: string;
  measurable?: string;
  supportingDrills: string[];
}

/** In-game recovery recommendation. */
export interface RecoveryRecommendationRef {
  topic: CurriculumTopicId;
  method: string;
  alternatives: string[];
}

/** What the player already does well and should keep doing. */
export interface PositiveReinforcementRef {
  example: string;
  supportingExamples: string[];
}

export interface StrengthToContinueRef {
  decisionId?: string;
  label: string;
  fundamental: LeagueFundamentalId;
}

/** Role philosophy sentences, selected from Role Intelligence. */
export interface RolePhilosophyRef {
  expectations: string[];
  tempo: string[];
  economy: string[];
  objectives: string[];
  positioning: string[];
  powerSpikes: string[];
}

/** How this role expresses this fundamental. */
export interface FundamentalExpressionRef {
  fundamental: LeagueFundamentalId;
  expression: string;
  example?: string;
}

/** Optional — Champion Intelligence is never required. */
export interface ChampionIntelligenceRef {
  champion: string;
  profile?: ChampionProfile;
}

/** Optional placeholder — filled by the future Habit Intelligence Engine. */
export interface HabitPlaceholderRef {
  habitContext?: HabitContext;
}

/**
 * OPTIONAL — Matchup Intelligence V1 (Sprint 4.8). Absent contexts remain
 * fully functional: Role only, Role + Champion, Role + Champion + Matchup, and
 * so on all degrade gracefully.
 */
export interface MatchupIntelligenceRef {
  matchupId: string;
  championA: string;
  championB: string;
  roleContext: MatchupRoleContext;
  /** True when authored matchup knowledge (not just the stub shape) exists. */
  populated: boolean;
  profile?: MatchupProfileV1;
}

/** Optional placeholder — filled by the future Player Memory layer. */
export interface PlayerMemoryPlaceholderRef {
  /** Stable player key (puuid / profile id) once a source provides it. */
  playerId?: string;
  currentCoachingFocus?: string;
  recurringHabitIds?: string[];
}

/**
 * OPTIONAL — Lane State Intelligence V1 (Sprint 5.0). Describes the CURRENT
 * lane state only; it never says what the player should do. Absent contexts
 * remain fully functional.
 */
export interface LaneStateIntelligenceRef {
  laneStateId: string;
  role?: RoleId;
  laneContext: LaneContextKind;
  lanePhase: LanePhase;
  waveState: WaveState;
  /** True when at least one real observation backed the state. */
  observed: boolean;
  availability: LaneStateAvailability;
  /** Decision routing hints, by reference. */
  decisionPriorities: LaneStateDecisionPriority[];
  profile?: LaneStateProfile;
}

/**
 * OPTIONAL — Team Composition Intelligence V1 (Sprint 4.9). Absent contexts
 * remain fully functional: Role only, Role + Champion, Role + Champion +
 * Matchup, Role + Champion + Team Composition, and every combination in
 * between degrade gracefully.
 */
export interface TeamCompositionIntelligenceRef {
  compositionId: string;
  /** The player's own role inside the analyzed team, when known. */
  playerRole?: RoleId;
  /** True when authored composition knowledge (not just the stub) exists. */
  populated: boolean;
  availability: CompositionAvailability;
  /** Structural composition-vs-composition relationships, by reference. */
  relationships: CompositionRelationship[];
  analyzedTeam?: TeamCompositionProfile;
  opposingTeam?: TeamCompositionProfile;
  analysis?: TeamCompositionAnalysis;
}

// ---------------------------------------------------------------------------
// The canonical contract
// ---------------------------------------------------------------------------

export interface UnifiedCoachingContext {
  /** Contract version so future consumers can migrate safely. */
  version: 1;
  leagueIntelligence: LeagueIntelligenceRef;
  curriculum: CurriculumRef;
  roleIntelligence: RoleIntelligenceRef;
  decision: DecisionRef;
  decisionPriority: DecisionPriorityRef;
  coachingPriority: UnifiedCoachingPriority;
  practiceRecommendation: PracticeRecommendationRef;
  recoveryRecommendation: RecoveryRecommendationRef;
  positiveReinforcement: PositiveReinforcementRef;
  strengthToContinue?: StrengthToContinueRef;
  rolePhilosophy: RolePhilosophyRef;
  fundamentalExpression: FundamentalExpressionRef;
  /** OPTIONAL — absent contexts remain fully functional. */
  championIntelligence?: ChampionIntelligenceRef;
  /** OPTIONAL — reserved for the Habit Intelligence Engine. */
  habit?: HabitPlaceholderRef;
  /** OPTIONAL — matchup context, never required by any consumer. */
  matchupIntelligence?: MatchupIntelligenceRef;
  /** OPTIONAL — team composition context, never required by any consumer. */
  teamComposition?: TeamCompositionIntelligenceRef;
  /** OPTIONAL — lane state context, never required by any consumer. */
  laneState?: LaneStateIntelligenceRef;
  /** OPTIONAL — reserved for Player Memory. */
  playerMemory?: PlayerMemoryPlaceholderRef;
  /** Escape hatch: the merged pipeline knowledge this context references. */
  source: CoachingContext;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export interface UnifiedContextOptions {
  rank?: UnifiedPriorityRank;
  order?: number;
  prioritized?: PrioritizedDecision;
  habitContext?: HabitContext;
  playerMemory?: PlayerMemoryPlaceholderRef;
  strengthToContinue?: StrengthToContinueRef;
  /** OPTIONAL matchup profile — omit it and nothing changes. */
  matchup?: MatchupProfileV1;
  /** OPTIONAL team composition analysis — omit it and nothing changes. */
  teamComposition?: TeamCompositionAnalysis;
  /** OPTIONAL lane state — omit it and nothing changes. */
  laneState?: LaneStateProfile;
}

function leagueDecisionFor(c: CoachingContext): LeagueDecision | undefined {
  return getLeagueDecision(c.issue.id) ?? undefined;
}

/**
 * Assemble the canonical contract from one merged CoachingContext. Everything
 * is a reference into an existing layer — no new coaching text is invented.
 */
export function buildUnifiedCoachingContext(
  c: CoachingContext,
  options: UnifiedContextOptions = {},
): UnifiedCoachingContext {
  const league = leagueDecisionFor(c);
  const expression = c.roleProfile.fundamentalExpression.find(
    (f) => f.fundamental === c.curriculumTopic.fundamental,
  );

  return {
    version: 1,
    leagueIntelligence: {
      fundamental: c.fundamental.id,
      fundamentalLabel: c.fundamental.label,
      conceptLabels: c.leagueKnowledge.concepts.map((k) => k.label),
      references: c.leagueKnowledge.references,
    },
    curriculum: {
      topic: c.curriculumTopic.id,
      topicLabel: c.curriculumTopic.label,
      supportingTopics: c.supportingTopics.map((t) => t.id),
      decisionPatternId: c.routing?.decisionChainRef,
    },
    roleIntelligence: {
      role: c.role,
      roleLabel: c.roleLabel,
      decisionPriorities: (c.decisionPriority.length
        ? c.decisionPriority
        : c.roleProfile.decisionPriorities
      )
        .slice(0, 4)
        .map((d) => `${d.tier.toUpperCase()}: ${d.decision}`),
    },
    decision: {
      decisionId: c.issue.id,
      label: c.issue.label,
      kind: c.issue.kind,
      leagueDecisionId: league?.id,
    },
    decisionPriority: {
      priority: options.prioritized?.priority ?? 0,
      scores: options.prioritized?.scores,
      reason: options.prioritized?.reason,
      evidence: options.prioritized?.evidence ?? (c.issue.evidence ? [c.issue.evidence] : []),
    },
    coachingPriority: {
      rank: options.rank ?? "unranked",
      order: options.order ?? 0,
      impact: c.issue.impact ?? "medium",
    },
    practiceRecommendation: {
      topic: c.curriculumTopic.id,
      drill: c.practiceDrills[0] ?? c.decisionChain.practiceRecommendation,
      measurable: c.practiceLibrary[0]?.measurable,
      supportingDrills: c.practiceDrills.slice(1),
    },
    recoveryRecommendation: {
      topic: c.curriculumTopic.id,
      method: c.recoveryAdvice[0] ?? c.curriculumTopic.recoveryMethods[0] ?? "",
      alternatives: c.recoveryAdvice.slice(1),
    },
    positiveReinforcement: {
      example: c.positiveExamples[0] ?? c.curriculumTopic.positiveCoachingExamples[0] ?? "",
      supportingExamples: c.positiveExamples.slice(1),
    },
    strengthToContinue:
      options.strengthToContinue ??
      (c.issue.kind === "strength"
        ? { decisionId: c.issue.id, label: c.issue.label, fundamental: c.fundamental.id }
        : c.habitLibrary.find((h) => h.kind === "strength")
          ? {
              label: c.habitLibrary.find((h) => h.kind === "strength")!.label,
              fundamental: c.fundamental.id,
            }
          : undefined),
    rolePhilosophy: {
      expectations: c.roleExpectations,
      tempo: c.tempoPhilosophy,
      economy: c.economyPhilosophy,
      objectives: c.objectivePhilosophy,
      positioning: c.positioningPhilosophy,
      powerSpikes: c.powerSpikePhilosophy,
    },
    fundamentalExpression: {
      fundamental: c.curriculumTopic.fundamental,
      expression: expression?.philosophy ?? c.fundamental.purpose,
      example: expression?.example,
    },
    championIntelligence: c.championIntelligence
      ? { champion: c.championIntelligence.name, profile: c.championIntelligence }
      : undefined,
    habit: options.habitContext ? { habitContext: options.habitContext } : undefined,
    matchupIntelligence: options.matchup
      ? {
          matchupId: options.matchup.matchupId,
          championA: options.matchup.championA,
          championB: options.matchup.championB,
          roleContext: options.matchup.roleContext,
          populated: options.matchup.populated,
          profile: options.matchup,
        }
      : undefined,
    teamComposition: options.teamComposition
      ? {
          compositionId: options.teamComposition.analyzedTeam.compositionId,
          playerRole: options.teamComposition.playerRole,
          populated: options.teamComposition.analyzedTeam.populated,
          availability: options.teamComposition.availability.analyzedTeam,
          relationships: options.teamComposition.relationships,
          analyzedTeam: options.teamComposition.analyzedTeam,
          opposingTeam: options.teamComposition.opposingTeam,
          analysis: options.teamComposition,
        }
      : undefined,
    playerMemory: options.playerMemory,
    laneState: options.laneState
      ? {
          laneStateId: options.laneState.laneStateId,
          role: options.laneState.role === PENDING_ROLE ? undefined : (options.laneState.role as RoleId),
          laneContext: options.laneState.laneContext,
          lanePhase: options.laneState.lanePhase,
          waveState: options.laneState.waveState,
          observed: options.laneState.observed,
          availability: options.laneState.availability,
          decisionPriorities: options.laneState.decisionPriorities,
          profile: options.laneState,
        }
      : undefined,
    source: c,
  };
}

/** Build the canonical contract for a list of merged contexts, in order. */
export function buildUnifiedCoachingContexts(
  contexts: CoachingContext[],
  habitContexts: HabitContext[] = [],
): UnifiedCoachingContext[] {
  const weaknesses = contexts.filter((c) => c.issue.kind === "weakness");
  const primary = weaknesses[0] ?? contexts[0];
  const secondary = weaknesses[1];
  return contexts.map((c, order) =>
    buildUnifiedCoachingContext(c, {
      order,
      rank:
        c === primary
          ? "primary"
          : c === secondary
            ? "secondary"
            : c.issue.kind === "strength"
              ? "reinforce"
              : "unranked",
      habitContext: habitContexts.find((h) => h.decisionId === c.issue.id),
    }),
  );
}

export const UnifiedCoaching = {
  build: buildUnifiedCoachingContext,
  buildAll: buildUnifiedCoachingContexts,
};

export type UnifiedCoachingFacade = typeof UnifiedCoaching;