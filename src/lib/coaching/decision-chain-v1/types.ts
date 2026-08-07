// ---------------------------------------------------------------------------
// Decision Chain V1 — permanent shapes (Sprint 5.1).
//
// The integration layer that connects everything already built:
//
//   RAW RIOT DATA → DATA DRAGON → LEAGUE KNOWLEDGE
//     → Role / Champion / Items / Runes / Matchup / Team Comp / Lane State
//     → UNIFIED COACHING CONTEXT → DECISION LIBRARY → DECISION PRIORITIZATION
//     → PLAYER HABITS / MEMORY → COACHING DECISION → FUNDAMENTAL
//     → EXPLANATION → COUNTERFACTUAL → PRACTICE GOAL
//
// This layer NEVER detects, scores or invents coaching content. It reads the
// existing layers, keeps every field traceable, and degrades gracefully when a
// layer is absent. PURE + client-safe. No AI, no network, no persistence.
// ---------------------------------------------------------------------------
import type { CurriculumTopicId, GamePhase, LeagueFundamentalId } from "../knowledge-base";
import type { RoleId } from "../knowledge-base/templates/champion";
import type { UnifiedCoachingContext } from "../unified-coaching-context";
import type { DecisionPriorityResult, DecisionScoreBreakdown } from "../decision-priority-engine";
import type { Habit } from "../habit-intelligence";
import type { PlayerMemoryRecord, PlayerMemorySummary } from "../player-memory-ledger";
import type { PracticePlan } from "../practice-planning-v1";
import type { LaneStateProfile } from "../lane-state-intelligence-v1/types";

/** Which permanent layer a chain field was read from. */
export type DecisionChainLayer =
  | "riot-data"
  | "data-dragon"
  | "league-intelligence"
  | "curriculum"
  | "role-intelligence"
  | "decision-library"
  | "decision-priority"
  | "champion-intelligence"
  | "item-intelligence"
  | "rune-intelligence"
  | "matchup-intelligence"
  | "team-composition-intelligence"
  | "lane-state-intelligence"
  | "habit-intelligence"
  | "player-memory"
  | "practice-planner"
  | "unified-context";

/** Traceability record — proves a chain statement was not invented. */
export interface DecisionChainTrace {
  layer: DecisionChainLayer;
  /** Stable id inside that layer (decision id, topic id, habit id, ...). */
  ref: string;
  /** Which chain field the layer contributed to. */
  field: string;
}

/** Evidence quality — never a vague "AI confidence" score. */
export type DecisionConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_DATA";

export interface DecisionConfidence {
  level: DecisionConfidenceLevel;
  /** 0-100, read from the Decision Prioritization Engine when available. */
  score: number;
  /** Why the level is what it is — sample size + evidence, not certainty theatre. */
  reason: string;
  evidenceCount: number;
  /** Matches backing the conclusion, when a source supplied it. */
  sampleSize: number;
  /** True when observed game evidence (not only knowledge references) exists. */
  observedEvidence: boolean;
}

/**
 * Canonical, role-agnostic action ids. Open-ended on purpose: a caller may
 * supply any decision id from the League Decision Library.
 */
export type DecisionActionId =
  | "push-wave"
  | "hold-wave"
  | "freeze-wave"
  | "trade"
  | "all-in"
  | "disengage"
  | "recall"
  | "roam"
  | "ward"
  | "contest-objective"
  | "concede-objective"
  | "farm-safely"
  | "pressure-tower"
  | "reset-tempo"
  | "group"
  | "split-push"
  | "track-jungler"
  | (string & {});

/** One decision that was available at the moment. Never assumes only one. */
export interface DecisionCandidate {
  actionId: DecisionActionId;
  label: string;
  /** Where the candidate came from. */
  source: DecisionChainLayer;
  /** True when a data source observed the option, false when knowledge-derived. */
  observed: boolean;
  /** Knowledge-layer reason the option existed. Never motivational filler. */
  rationale: string;
  /** 0-100 from the existing Decision Prioritization Engine, or null. */
  priority: number | null;
  fundamental?: LeagueFundamentalId;
  curriculumTopic?: CurriculumTopicId;
  evidence: string[];
  /** True for the decision the player actually took, when known. */
  taken: boolean;
  /** True for the option the prioritization engine ranked highest. */
  prioritized: boolean;
}

/** Optional caller-supplied candidate — the engine never fabricates these. */
export interface DecisionCandidateInput {
  actionId: DecisionActionId;
  label?: string;
  rationale?: string;
  fundamental?: LeagueFundamentalId;
  curriculumTopic?: CurriculumTopicId;
  evidence?: string[];
  /** True when this is the action the player took. */
  taken?: boolean;
  /** Defaults to true — caller-supplied candidates come from real data. */
  observed?: boolean;
}

export type DecisionEvidenceKind =
  | "match-event"
  | "timestamp"
  | "champion-state"
  | "item-state"
  | "rune-state"
  | "wave-state"
  | "health"
  | "gold"
  | "level"
  | "objective-state"
  | "team-composition"
  | "matchup"
  | "player-history"
  | "habit-history"
  | "knowledge-reference";

export interface DecisionEvidence {
  id: string;
  kind: DecisionEvidenceKind;
  statement: string;
  source: DecisionChainLayer;
  /** True when a data source observed it; false for knowledge references. */
  observed: boolean;
  timestampSeconds?: number;
  matchId?: string;
}

/** What decision would have produced a better situation — evidence-based only. */
export interface DecisionCounterfactual {
  decisionTaken: string;
  alternativeDecision: string;
  /** Directional, never an invented exact outcome. */
  expectedAdvantage: string;
  reason: string;
  evidence: string[];
  confidence: DecisionConfidence;
}

/** Structured practice reference — always points at the Practice Planner. */
export interface DecisionPracticeReference {
  /** Present only when a Practice Plan was supplied. */
  practicePlanId?: string;
  fundamental: LeagueFundamentalId;
  curriculumTopic: CurriculumTopicId;
  goal: string;
  measurable?: string;
  source: DecisionChainLayer;
}

/** Habit Intelligence is SUPPORTING evidence — never proof, never an override. */
export interface DecisionHabitContext {
  decisionId: string;
  habitId?: string;
  status?: Habit["status"];
  trend?: Habit["trend"];
  occurrences: number;
  matchesObserved: number;
  /** 0-1 occurrence rate. */
  rate: number;
  streak: number;
  /** 0-100 from Habit Intelligence. */
  consistency: number;
  practicePriority: number;
  confidence: number;
  /** Always true: a habit supports a conclusion, it never establishes it. */
  supporting: true;
  note: string;
}

export interface DecisionMemoryContext {
  playerId?: string;
  memoryId?: string;
  standing?: PlayerMemoryRecord["standing"];
  longTermStrength: boolean;
  longTermWeakness: boolean;
  reinforcementCount: number;
  /** Current coaching focus, when Player Memory supplied one. */
  currentFocus?: string;
  note: string;
}

/** Context assembly — every source optional, nothing fabricated. */
export interface DecisionContextFactor {
  id: string;
  label: string;
  source: DecisionChainLayer;
  value: string;
  /** True when a data source observed the factor. */
  observed: boolean;
}

export interface DecisionGameContext {
  gamePhase: GamePhase | "unknown";
  gameTimestampSeconds: number | null;
  laneContext?: string;
  lanePhase?: string;
  waveState?: string;
  laneStateObserved: boolean;
  matchupId?: string;
  matchupPopulated: boolean;
  compositionId?: string;
  compositionPopulated: boolean;
  championIntelligenceUsed: boolean;
}

/** The seven-part structured coaching output every surface can render. */
export interface DecisionExplanation {
  whatHappened: string;
  whyItMattered: string;
  decisionsAvailable: string[];
  whyPrioritizedDecisionMattered: string;
  fundamentalItRelatesTo: string;
  habitThatMayHaveContributed: string | null;
  whatToPractice: string;
}

/** The permanent, reusable Decision Chain object. */
export interface DecisionChain {
  chainId: string;
  matchId: string | null;
  playerId: string | null;
  role: RoleId;
  roleLabel: string;
  /** Present ONLY when Champion Intelligence supplied a champion. */
  championId: string | null;
  gameTimestamp: number | null;
  gamePhase: GamePhase | "unknown";
  gameContext: DecisionGameContext;

  availableDecisions: DecisionCandidate[];
  selectedDecision: DecisionCandidate;

  /** 0-100 from the existing Decision Prioritization Engine. */
  decisionPriority: number;
  decisionImpact: number | null;
  decisionFrequency: number | null;
  decisionDifficulty: number | null;
  decisionAgency: number | null;
  decisionRecoverability: number | null;
  decisionSnowballPotential: number | null;
  decisionConsistency: number | null;
  /** Raw breakdown when available — never re-scored here. */
  scores?: DecisionScoreBreakdown;

  contextFactors: DecisionContextFactor[];
  matchupContext?: DecisionContextFactor[];
  teamCompositionContext?: DecisionContextFactor[];
  laneStateContext?: DecisionContextFactor[];
  championContext?: DecisionContextFactor[];
  itemContext?: DecisionContextFactor[];
  runeContext?: DecisionContextFactor[];
  playerHabitContext?: DecisionHabitContext;
  playerMemoryContext?: DecisionMemoryContext;

  fundamentalId: LeagueFundamentalId;
  fundamentalLabel: string;
  curriculumReference: {
    topic: CurriculumTopicId;
    topicLabel: string;
    supportingTopics: CurriculumTopicId[];
    decisionPatternId?: string;
  };

  explanation: DecisionExplanation;
  counterfactual: DecisionCounterfactual | null;
  practiceGoal: DecisionPracticeReference;
  confidence: DecisionConfidence;
  evidence: DecisionEvidence[];
  sourceReferences: DecisionChainTrace[];
  /** Escape hatch: the canonical contract this chain was assembled from. */
  source: UnifiedCoachingContext;
}

/** How much context the assembly actually had. Nothing is inferred. */
export interface DecisionChainCompleteness {
  role: boolean;
  champion: boolean;
  items: boolean;
  runes: boolean;
  matchup: boolean;
  teamComposition: boolean;
  laneState: boolean;
  gameState: boolean;
  habits: boolean;
  playerMemory: boolean;
  practicePlan: boolean;
  /** 0-100 — share of the sources above that were present. */
  percent: number;
}

export interface DecisionChainSet {
  role: RoleId;
  roleLabel: string;
  champion: string | null;
  matchId: string | null;
  playerId: string | null;
  chains: DecisionChain[];
  /** The one decision the player should improve first. */
  primary: DecisionChain | null;
  secondary: DecisionChain | null;
  completeness: DecisionChainCompleteness;
  layersUsed: DecisionChainLayer[];
  traces: DecisionChainTrace[];
  createdAt: string;
}

/** Everything the engine may read. Only `contexts` is required. */
export interface DecisionChainInput {
  /** Canonical contracts, already ranked by the priority engine. */
  contexts: UnifiedCoachingContext[];
  /** OPTIONAL — the priority result the contexts came from. */
  priorities?: DecisionPriorityResult;
  /** OPTIONAL — Habit Intelligence habits, matched by decision id. */
  habits?: Habit[];
  /** OPTIONAL — Player Memory records, matched by decision id. */
  memories?: PlayerMemoryRecord[];
  /** OPTIONAL — Player Memory summary for long-term framing. */
  memorySummary?: PlayerMemorySummary;
  /** OPTIONAL — the active practice plan, for practice references. */
  practicePlan?: PracticePlan;
  /** OPTIONAL — real decisions available at the moment, by decision id. */
  candidatesByDecisionId?: Record<string, DecisionCandidateInput[]>;
  /** OPTIONAL — measured game evidence, by decision id. */
  evidenceByDecisionId?: Record<string, DecisionEvidence[]>;
  /** OPTIONAL — explicit timeline positions per decision id, in seconds. */
  timestampsByDecisionId?: Record<string, number>;
  /** OPTIONAL — lane state when the contexts did not carry one. */
  laneState?: LaneStateProfile;
  /** OPTIONAL — item ids the player had, by decision id or globally. */
  itemIds?: string[];
  /** OPTIONAL — rune ids the player ran. */
  runeIds?: string[];
  matchId?: string;
  playerId?: string;
  /** OPTIONAL — Champion Intelligence hint; never required. */
  champion?: string;
  /** OPTIONAL — deterministic timestamp for tests. */
  now?: string;
}

/** Structured payload a future AI Coach consumes instead of raw Riot data. */
export interface DecisionChainAIPayload {
  version: 1;
  role: RoleId;
  champion: string | null;
  matchId: string | null;
  playerId: string | null;
  decisionChain: {
    chainId: string;
    decisionId: string;
    label: string;
    priority: number;
    gamePhase: GamePhase | "unknown";
    availableDecisions: string[];
    selectedDecision: string;
  }[];
  evidence: DecisionEvidence[];
  fundamentals: LeagueFundamentalId[];
  habits: DecisionHabitContext[];
  practiceGoals: DecisionPracticeReference[];
  confidence: DecisionConfidenceLevel;
  completeness: DecisionChainCompleteness;
}
