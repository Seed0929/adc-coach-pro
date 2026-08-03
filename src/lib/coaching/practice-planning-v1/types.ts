// ---------------------------------------------------------------------------
// Practice Planning Engine V1 — permanent plan shapes (Sprint 4.2).
//
//   League Intelligence → Curriculum → Role Intelligence
//     → League Decision Library → Champion Intelligence (optional)
//     → Coaching Pipeline → Decision Prioritization Engine
//     → Unified Coaching Context → Habit Intelligence → Player Memory
//     → Coaching Narrative Engine → [Practice Planning Engine V1]
//
// This layer NEVER detects, scores, or invents coaching content. It converts
// already-deterministic coaching data into ONE measurable improvement plan,
// and every field carries a trace back to the layer it came from.
//
// PURE + client-safe. No AI, no network, no Riot calls, no persistence.
// ---------------------------------------------------------------------------
import type { CurriculumTopicId, LeagueFundamentalId } from "../knowledge-base";
import type { RoleId } from "../knowledge-base/templates/champion";
import type { UnifiedCoachingContext } from "../unified-coaching-context";
import type { DecisionPriorityResult } from "../decision-priority-engine";
import type { Habit } from "../habit-intelligence";
import type { PlayerMemoryRecord, PlayerMemorySummary } from "../player-memory-ledger";
import type { Narrative } from "../narrative-engine-v1";

/** Which permanent layer a plan field was read from. */
export type PracticeLayer =
  | "league-intelligence"
  | "curriculum"
  | "role-intelligence"
  | "decision-library"
  | "decision-priority"
  | "habit-intelligence"
  | "player-memory"
  | "narrative-engine"
  | "champion-intelligence";

/** Traceability record — proves a plan statement was not invented. */
export interface PracticeTrace {
  layer: PracticeLayer;
  /** Stable id inside that layer (topic id, decision id, habit id, ...). */
  ref: string;
  /** Which plan field the layer contributed to. */
  field: string;
}

export type PracticeDifficultyLevel = "easy" | "moderate" | "hard";

export interface PracticeDifficulty {
  /** 0-100, straight from the Decision Prioritization Engine when present. */
  score: number;
  level: PracticeDifficultyLevel;
  explanation: string;
}

/** ONE focus — a decision id resolved through the curriculum + fundamentals. */
export interface PracticeFocus {
  decisionId: string;
  label: string;
  fundamental: LeagueFundamentalId;
  fundamentalLabel: string;
  curriculumTopic: CurriculumTopicId;
  curriculumTopicLabel: string;
  /** The coaching statement the player reads for this focus. */
  statement: string;
  /** OPTIONAL — only when Champion Intelligence supplied a champion. */
  champion?: string;
}

/** ONE measurable challenge with its pass condition. */
export interface PracticeSuccessCriterion {
  /** What the player must do. */
  statement: string;
  /** The measurable target — always present, never vague. */
  measurable: string;
  fundamental: LeagueFundamentalId;
  curriculumTopic: CurriculumTopicId;
  decisionId: string;
}

export interface PracticeChecklistItem {
  id: string;
  label: string;
  /** Measurable target when the step has one. */
  measurable?: string;
  /** Where the step came from. */
  layer: PracticeLayer;
  ref: string;
  done: boolean;
}

export type PracticeCompletionStatus =
  | "not-started"
  | "in-progress"
  | "completed"
  | "abandoned";

/** Progress placeholder — persistence lands in a later sprint. */
export interface PracticeProgress {
  sessionsCompleted: number;
  sessionsTarget: number;
  /** 0-100. */
  percent: number;
  checklistCompleted: number;
  checklistTotal: number;
  successCriteriaMet: boolean;
  lastUpdated: string | null;
  notes: string[];
}

/** The permanent, reusable Practice Plan object. */
export interface PracticePlan {
  practicePlanId: string;
  role: RoleId;
  roleLabel: string;
  /** Present ONLY when Champion Intelligence supplied a champion. */
  champion: string | null;

  /** ONE primary improvement. */
  primaryFocus: PracticeFocus;
  /** ONE supporting concept — null when nothing else is worth adding. */
  supportingFocus: PracticeFocus | null;

  decisionIds: string[];
  leagueFundamentals: LeagueFundamentalId[];
  curriculumTopics: CurriculumTopicId[];

  whyThisMatters: string;
  expectedOutcome: string;
  /** ONE success condition first; supporting criteria follow. */
  successCriteria: PracticeSuccessCriterion[];
  difficulty: PracticeDifficulty;
  estimatedSessions: number;
  progress: PracticeProgress;
  reinforcementStrategy: string;
  recoveryStrategy: string;
  positiveReinforcement: string;
  practiceChecklist: PracticeChecklistItem[];
  completionStatus: PracticeCompletionStatus;

  /** Every field's origin layer. */
  traces: PracticeTrace[];
  /** Readable plan text assembled from the fields above. */
  fullText: string;
  createdAt: string;
  updatedAt: string;
}

/** Everything the planner may read. Only `contexts` is required. */
export interface PracticePlanInput {
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
  /** OPTIONAL — Champion Intelligence hint; never required. */
  champion?: string;
  /** OPTIONAL — deterministic timestamp for tests. */
  now?: string;
}

export interface PracticePlanUpdate {
  completionStatus?: PracticeCompletionStatus;
  sessionsCompleted?: number;
  /** Checklist item ids to mark done. */
  completedChecklistItemIds?: string[];
  successCriteriaMet?: boolean;
  note?: string;
  now?: string;
}

/** What the planner recommends focusing on next, once a plan is complete. */
export interface PracticeNextFocus {
  focus: PracticeFocus | null;
  reason: string;
  traces: PracticeTrace[];
}