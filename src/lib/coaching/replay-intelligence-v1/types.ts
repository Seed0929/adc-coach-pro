// ---------------------------------------------------------------------------
// Replay Intelligence Engine V1 — permanent timeline shapes (Sprint 4.3).
//
//   League Intelligence → Curriculum → Role Intelligence
//     → League Decision Library → Champion Intelligence (optional)
//     → Coaching Pipeline → Decision Prioritization Engine
//     → Unified Coaching Context → Habit Intelligence → Player Memory
//     → Coaching Narrative Engine → Practice Planning Engine
//         → [Replay Intelligence Engine V1]
//
// This layer NEVER detects raw events, scores, or invents coaching content.
// It reconstructs WHY a game developed the way it did by ordering already
// deterministic coaching data into a timeline of decisions, and every field
// carries a trace back to the layer it came from.
//
// It never says "you died" — every moment explains the fundamental, the tempo
// / economy / objective / teamfight consequence, the recovery option, and what
// to repeat or change.
//
// PURE + client-safe. No AI, no network, no Riot calls, no persistence.
// ---------------------------------------------------------------------------
import type { CurriculumTopicId, LeagueFundamentalId } from "../knowledge-base";
import type { GamePhase } from "../knowledge-base/types";
import type { RoleId } from "../knowledge-base/templates/champion";
import type { UnifiedCoachingContext } from "../unified-coaching-context";
import type { DecisionPriorityResult } from "../decision-priority-engine";
import type { Habit } from "../habit-intelligence";
import type { PlayerMemoryRecord, PlayerMemorySummary } from "../player-memory-ledger";
import type { Narrative } from "../narrative-engine-v1";
import type { PracticePlan } from "../practice-planning-v1";

/** Which permanent layer a replay field was read from. */
export type ReplayLayer =
  | "league-intelligence"
  | "curriculum"
  | "role-intelligence"
  | "decision-library"
  | "decision-priority"
  | "habit-intelligence"
  | "player-memory"
  | "narrative-engine"
  | "practice-planning"
  | "champion-intelligence";

/** Traceability record — proves a replay statement was not invented. */
export interface ReplayTrace {
  layer: ReplayLayer;
  /** Stable id inside that layer (topic id, decision id, habit id, ...). */
  ref: string;
  /** Which replay field the layer contributed to. */
  field: string;
}

/** How Replay Intelligence classifies a moment on the timeline. */
export type ReplayMomentType =
  | "positive-turning-point"
  | "negative-turning-point"
  | "recovery-opportunity"
  | "momentum-shift"
  | "snowball-moment"
  | "objective-swing"
  | "power-spike-window"
  | "good-discipline"
  | "bad-discipline";

/** Coaching-priority band, derived from the Decision Prioritization Engine. */
export type ReplayPriorityBand = "critical" | "high" | "moderate" | "low";

export interface ReplayPriority {
  /** 0-100, straight from the Decision Prioritization Engine when present. */
  score: number;
  band: ReplayPriorityBand;
  /** Position on the timeline's coaching queue (0-based). */
  order: number;
  explanation: string;
}

export interface ReplayConfidence {
  /** 0-100 — sample-size backed certainty (Habit Intelligence when present). */
  score: number;
  level: "low" | "medium" | "high";
  explanation: string;
}

/** A deterministic, ordered position on the replay timeline. */
export interface ReplayTimestamp {
  /** Timeline position in seconds. Deterministic, not a Riot event time. */
  seconds: number;
  /** `mm:ss` label for display surfaces. */
  label: string;
  phase: GamePhase;
  /** 0-based order on the timeline. */
  sequence: number;
  /** True when the position was derived, not supplied by a data source. */
  estimated: boolean;
}

/** The permanent, reusable ReplayMoment object. */
export interface ReplayMoment {
  /** Stable id — `<sequence>:<decisionId>`. */
  id: string;
  timestamp: ReplayTimestamp;
  decisionId: string;
  /** League Decision Library id when the decision maps to one. */
  leagueDecisionId?: string;
  leagueFundamental: LeagueFundamentalId;
  leagueFundamentalLabel: string;
  curriculumTopic: CurriculumTopicId;
  curriculumTopicLabel: string;
  role: RoleId;
  roleLabel: string;
  /** Present ONLY when Champion Intelligence supplied a champion. */
  champion: string | null;

  kind: "strength" | "weakness";
  type: ReplayMomentType;
  /** True for the moments that changed the direction of the game. */
  turningPoint: boolean;

  situationSummary: string;
  decisionMade: string;
  betterAlternative: string;
  immediateResult: string;
  longTermResult: string;
  tempoImpact: string;
  economyImpact: string;
  objectiveImpact: string;
  teamfightImpact: string;
  recoveryOpportunity: string;
  practiceReference: string;
  coachingPriority: ReplayPriority;
  confidence: ReplayConfidence;

  /** What to repeat (strength) or change (weakness). */
  repeatOrChange: string;
  /** Why this decision mattered — never "you died". */
  whyItMattered: string;
  evidence: string[];
  relatedHabitIds: string[];

  traces: ReplayTrace[];
  /** Readable coaching text assembled from the fields above. */
  fullText: string;
}

/** The full reconstructed timeline for one game / review window. */
export interface ReplayTimeline {
  replayId: string;
  role: RoleId;
  roleLabel: string;
  /** Present ONLY when Champion Intelligence supplied a champion. */
  champion: string | null;
  moments: ReplayMoment[];
  criticalMoments: ReplayMoment[];
  turningPoints: ReplayMoment[];
  positiveMoments: ReplayMoment[];
  recoveryMoments: ReplayMoment[];
  practiceMoments: ReplayMoment[];
  /** Story of the game, in timeline order. */
  storyline: string[];
  headline: string;
  /** How the game developed, one paragraph, knowledge-layer sentences only. */
  gameDevelopment: string;
  championIntelligenceUsed: boolean;
  traces: ReplayTrace[];
  createdAt: string;
}

/** A compact decision-only view for timeline surfaces. */
export interface ReplayDecisionTimelineEntry {
  sequence: number;
  timestampLabel: string
  phase: GamePhase;
  decisionId: string;
  label: string;
  type: ReplayMomentType;
  kind: "strength" | "weakness";
  priority: number;
  line: string;
}

/** Everything the replay engine may read. Only `contexts` is required. */
export interface ReplayInput {
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
  /** OPTIONAL — narratives from the Coaching Narrative Engine, by decision id. */
  narratives?: Narrative[];
  /** OPTIONAL — the active practice plan, for practice references. */
  practicePlan?: PracticePlan;
  /** OPTIONAL — Champion Intelligence hint; never required. */
  champion?: string;
  /** OPTIONAL — match id for ids / evidence. */
  matchId?: string;
  /** OPTIONAL — known game length in seconds; used to place moments. */
  gameDurationSeconds?: number;
  /** OPTIONAL — explicit timeline positions per decision id, in seconds. */
  timestampsByDecisionId?: Record<string, number>;
  /** OPTIONAL — deterministic timestamp for tests. */
  now?: string;
}
