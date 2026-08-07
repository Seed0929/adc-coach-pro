// ---------------------------------------------------------------------------
// Coaching Validation V1 — permanent shapes (Sprint 5.2).
//
// NOT an intelligence layer. It adds no coaching content, no scoring and no
// new knowledge. It only answers one question about output the existing
// architecture already produced:
//
//   "Can this coaching statement be traced back to evidence, and if not,
//    which source is missing?"
//
// Missing data is reported EXPLICITLY. Nothing is ever invented to fill a gap.
// ---------------------------------------------------------------------------
import type { CurriculumTopicId, LeagueFundamentalId } from "../knowledge-base";
import type { RoleId } from "../knowledge-base/templates/champion";
import type {
  DecisionChainLayer,
  DecisionChainSet,
  DecisionConfidenceLevel,
} from "../decision-chain-v1";

/** Overall verdict for a validated coaching result. */
export type ValidationStatus = "PASS" | "PARTIAL" | "FAIL";

/** Beta-blocker classification used by the audit. */
export type ValidationSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "NON_BLOCKING";

/** Per-field state. MISSING is explicit — never silently filled in. */
export type ContractFieldState = "PRESENT" | "PLACEHOLDER" | "MISSING";

/** The seven contract fields every prioritized coaching decision must cover. */
export type ContractFieldId =
  | "decision"
  | "evidence"
  | "context"
  | "priority"
  | "fundamental"
  | "explanation"
  | "practiceReference";

export interface ContractFieldResult {
  field: ContractFieldId;
  state: ContractFieldState;
  /** Which layer supplied (or should have supplied) the field. */
  source: DecisionChainLayer | null;
  detail: string;
}

/** How well the data supports a counterfactual claim. */
export type CounterfactualCertainty = "KNOWN" | "INFERRED" | "UNKNOWN";

export interface CounterfactualValidation {
  present: boolean;
  certainty: CounterfactualCertainty;
  /** "What decision was available?" */
  alternativeDecision: string | null;
  /** "Why was it potentially better?" */
  reason: string | null;
  /** "What evidence supports that?" */
  evidence: string[];
  /** "What remains uncertain?" — always populated when certainty !== KNOWN. */
  uncertainty: string;
}

/** An explicit missing-data state. Consumers must render it, not paper over it. */
export interface MissingDataState {
  field: string;
  requiredSource: DecisionChainLayer | "riot-timeline" | "player-history";
  reason: string;
  severity: ValidationSeverity;
}

export interface ChainValidation {
  chainId: string;
  decisionId: string;
  role: RoleId;
  champion: string | null;
  fundamental: LeagueFundamentalId | null;
  curriculumTopic: CurriculumTopicId | null;
  status: ValidationStatus;
  fields: ContractFieldResult[];
  /** True when every explanation beat resolves to at least one evidence item. */
  traceable: boolean;
  observedEvidenceCount: number;
  knowledgeEvidenceCount: number;
  confidence: DecisionConfidenceLevel;
  /** Habit support only — never treated as proof of the current event. */
  habitSupporting: boolean;
  habitIsProof: false;
  memoryEnriches: boolean;
  memoryOverrides: false;
  counterfactual: CounterfactualValidation;
  missing: MissingDataState[];
}

export interface SourceAvailability {
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
  observedEvidence: boolean;
  prioritization: boolean;
}

export interface PipelineValidation {
  version: 1;
  status: ValidationStatus;
  role: RoleId;
  champion: string | null;
  matchId: string | null;
  playerId: string | null;
  chainsValidated: number;
  /** Validation of the primary (highest-priority) chain, when one exists. */
  primary: ChainValidation | null;
  chains: ChainValidation[];
  sources: SourceAvailability;
  layersUsed: DecisionChainLayer[];
  completenessPercent: number;
  missing: MissingDataState[];
  /** Human-readable path the data actually travelled. */
  dataPath: string[];
  notes: string[];
}

/** Audit entry used by the beta-blocker report. */
export interface AuditFinding {
  id: string;
  severity: ValidationSeverity;
  area: string;
  finding: string;
  /** True only when a real player cannot complete the coaching loop. */
  blocksBeta: boolean;
}

export interface PipelineAudit {
  status: ValidationStatus;
  findings: AuditFinding[];
  blockers: AuditFinding[];
  validation: PipelineValidation;
}

export type { DecisionChainSet };
