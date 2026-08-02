// ---------------------------------------------------------------------------
// Coaching Narrative Engine V1 — permanent narrative shapes (Sprint 4.1).
//
//   League Intelligence → Curriculum → Role Intelligence
//     → League Decision Library → Champion Intelligence (optional)
//     → Coaching Pipeline → Decision Prioritization Engine
//     → Unified Coaching Context → Habit Intelligence → Player Memory
//         → [Coaching Narrative Engine V1]
//
// This layer NEVER detects, scores, or invents anything. It converts already
// deterministic coaching data into consistent coaching explanations, and every
// sentence carries a trace back to the layer it came from.
//
// PURE + client-safe. No AI, no network, no Riot calls.
// ---------------------------------------------------------------------------
import type { CurriculumTopicId, LeagueFundamentalId } from "../knowledge-base";
import type { RoleId } from "../knowledge-base/templates/champion";
import type { UnifiedCoachingContext } from "../unified-coaching-context";
import type { DecisionPriorityResult } from "../decision-priority-engine";
import type { Habit } from "../habit-intelligence";
import type { PlayerMemoryRecord, PlayerMemorySummary } from "../player-memory-ledger";

/** Which permanent layer a narrative sentence was read from. */
export type NarrativeLayer =
  | "league-intelligence"
  | "curriculum"
  | "role-intelligence"
  | "decision-library"
  | "decision-priority"
  | "habit-intelligence"
  | "player-memory"
  | "champion-intelligence";

/** Traceability record — proves a statement was not invented. */
export interface NarrativeTrace {
  layer: NarrativeLayer;
  /** Stable id inside that layer (topic id, decision id, habit id, ...). */
  ref: string;
  /** Which narrative field the layer contributed to. */
  field: string;
}

export type NarrativeDifficultyLevel = "easy" | "moderate" | "hard";

export interface NarrativeDifficultyEstimate {
  /** 0-100, straight from the Decision Prioritization Engine when present. */
  score: number;
  level: NarrativeDifficultyLevel;
  explanation: string;
}

/** The permanent, reusable Narrative object. */
export interface Narrative {
  /** Stable id — mirrors the decision id so surfaces can key off it. */
  id: string;
  kind: "strength" | "weakness";
  role: RoleId;
  roleLabel: string;
  /** Present ONLY when Champion Intelligence supplied a champion. */
  champion: string | null;

  title: string;
  summary: string;
  rootCause: string;
  whyItMatters: string;
  positiveReinforcement: string;
  primaryCoachingPoint: string;
  supportingCoachingPoints: string[];
  recoveryAdvice: string;
  practiceRecommendation: string;
  difficultyEstimate: NarrativeDifficultyEstimate;
  confidenceExplanation: string;
  expectedImprovement: string;

  relatedFundamentals: LeagueFundamentalId[];
  relatedDecisions: string[];
  relatedHabits: string[];
  relatedCurriculumTopics: CurriculumTopicId[];

  /** Every statement's origin layer. */
  traces: NarrativeTrace[];
  /** Readable paragraph sequence built from the fields above. */
  fullText: string;
}

/** Everything the engine may read for ONE narrative. */
export interface NarrativeSource {
  unified: UnifiedCoachingContext;
  /** OPTIONAL — Habit Intelligence aggregate for the same decision id. */
  habit?: Habit;
  /** OPTIONAL — Player Memory record for the same decision id. */
  memory?: PlayerMemoryRecord;
}

/** Everything the engine may read for a full coaching surface. */
export interface NarrativeInput {
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
}

export interface NarrativeMatchReport {
  role: RoleId;
  roleLabel: string;
  /** Opens every review on a win — Player Memory / strength first. */
  coachingWin: Narrative | null;
  primary: Narrative | null;
  secondary: Narrative | null;
  recovery: Narrative | null;
  all: Narrative[];
  headline: string;
  championIntelligenceUsed: boolean;
}

export interface NarrativePracticeItem {
  decisionId: string;
  topic: CurriculumTopicId;
  fundamental: LeagueFundamentalId;
  recommendation: string;
  measurable?: string;
  difficulty: NarrativeDifficultyEstimate;
  expectedImprovement: string;
  narrative: Narrative;
}

export interface NarrativePracticePlan {
  role: RoleId;
  roleLabel: string;
  focus: Narrative | null;
  items: NarrativePracticeItem[];
  headline: string;
}

export interface NarrativeReplaySummary {
  role: RoleId;
  roleLabel: string;
  /** One line per decision, in priority order. */
  moments: { decisionId: string; label: string; line: string }[];
  narrative: Narrative | null;
  headline: string;
}

export interface NarrativeImprovementSummary {
  improving: Narrative[];
  regressing: Narrative[];
  strengths: Narrative[];
  headline: string;
  /** Long-term framing pulled from Player Memory when available. */
  memoryHeadline: string | null;
}