// ---------------------------------------------------------------------------
// Coaching Validation V1 — the validation engine (Sprint 5.2).
//
// Reads Decision Chain V1 output (which itself reads every existing layer) and
// verifies the end-to-end contract. It NEVER writes coaching content, never
// scores decisions and never fills a gap: an absent source becomes an explicit
// MissingDataState.
//
// PURE + client-safe. No AI, no network, no persistence.
// ---------------------------------------------------------------------------
import { PENDING } from "../knowledge-base/types";
import type { RoleId } from "../knowledge-base/templates/champion";
import type {
  DecisionChain,
  DecisionChainLayer,
  DecisionChainSet,
} from "../decision-chain-v1";
import type {
  AuditFinding,
  ChainValidation,
  ContractFieldResult,
  CounterfactualValidation,
  MissingDataState,
  PipelineAudit,
  PipelineValidation,
  SourceAvailability,
  ValidationStatus,
} from "./types";

const isText = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0 && v !== PENDING;

function worst(a: ValidationStatus, b: ValidationStatus): ValidationStatus {
  const rank: Record<ValidationStatus, number> = { FAIL: 0, PARTIAL: 1, PASS: 2 };
  return rank[a] <= rank[b] ? a : b;
}

// ---------------------------------------------------------------------------
// Counterfactual certainty — KNOWN / INFERRED / UNKNOWN
// ---------------------------------------------------------------------------

export function validateCounterfactual(chain: DecisionChain): CounterfactualValidation {
  const cf = chain.counterfactual;
  if (!cf) {
    return {
      present: false,
      certainty: "UNKNOWN",
      alternativeDecision: null,
      reason: null,
      evidence: [],
      uncertainty:
        "No alternative decision could be established from the available data, so no counterfactual is claimed.",
    };
  }

  const observed = chain.evidence.filter((e) => e.observed);
  const supported = cf.evidence.filter((e) => isText(e));
  // KNOWN requires observed, timestamped match evidence for the moment itself.
  const timestamped = observed.filter((e) => typeof e.timestampSeconds === "number");
  const certainty =
    timestamped.length >= 2 && supported.length >= 1 && cf.confidence.level === "HIGH"
      ? "KNOWN"
      : observed.length >= 1 && supported.length >= 1
        ? "INFERRED"
        : "UNKNOWN";

  const uncertainty =
    certainty === "KNOWN"
      ? "The alternative was available and observed; the exact result of taking it still cannot be replayed."
      : certainty === "INFERRED"
        ? "The alternative is inferred from observed evidence — the exact outcome is not established."
        : "There is not enough observed evidence to establish that the alternative was better.";

  return {
    present: true,
    certainty,
    alternativeDecision: isText(cf.alternativeDecision) ? cf.alternativeDecision : null,
    reason: isText(cf.reason) ? cf.reason : null,
    evidence: supported,
    uncertainty,
  };
}

// ---------------------------------------------------------------------------
// Contract fields
// ---------------------------------------------------------------------------

function contractFields(chain: DecisionChain): ContractFieldResult[] {
  const observed = chain.evidence.filter((e) => e.observed);
  const fields: ContractFieldResult[] = [];

  fields.push({
    field: "decision",
    state: isText(chain.selectedDecision.label) ? "PRESENT" : "MISSING",
    source: "decision-library",
    detail: chain.selectedDecision.label || "no decision label",
  });

  fields.push({
    field: "evidence",
    state: observed.length > 0 ? "PRESENT" : chain.evidence.length > 0 ? "PLACEHOLDER" : "MISSING",
    source: observed.length > 0 ? "riot-data" : "league-intelligence",
    detail:
      observed.length > 0
        ? `${observed.length} observed data point(s)`
        : `${chain.evidence.length} knowledge reference(s) only`,
  });

  const observedContext = chain.contextFactors.filter((f) => f.observed).length;
  fields.push({
    field: "context",
    state:
      chain.contextFactors.length === 0
        ? "MISSING"
        : observedContext > 0
          ? "PRESENT"
          : "PLACEHOLDER",
    source: "unified-context",
    detail: `${chain.contextFactors.length} context factor(s), ${observedContext} observed`,
  });

  fields.push({
    field: "priority",
    state: chain.decisionPriority > 0 ? "PRESENT" : "MISSING",
    source: "decision-priority",
    detail: `priority ${chain.decisionPriority}`,
  });

  fields.push({
    field: "fundamental",
    state: isText(chain.fundamentalId) ? "PRESENT" : "MISSING",
    source: "curriculum",
    detail: `${chain.fundamentalId} / ${chain.curriculumReference.topic}`,
  });

  const e = chain.explanation;
  const explanationComplete =
    isText(e.whatHappened) &&
    isText(e.whyItMattered) &&
    isText(e.whyPrioritizedDecisionMattered) &&
    isText(e.fundamentalItRelatesTo) &&
    isText(e.whatToPractice);
  fields.push({
    field: "explanation",
    state: explanationComplete ? "PRESENT" : isText(e.whatHappened) ? "PLACEHOLDER" : "MISSING",
    source: "curriculum",
    detail: explanationComplete
      ? "all explanation beats resolved"
      : "one or more explanation beats unresolved",
  });

  const practice = chain.practiceGoal;
  fields.push({
    field: "practiceReference",
    state: isText(practice?.goal)
      ? isText(practice.measurable)
        ? "PRESENT"
        : "PLACEHOLDER"
      : "MISSING",
    source: "practice-planner",
    detail: isText(practice?.measurable)
      ? `measurable: ${practice.measurable}`
      : "structured goal without a measurable pass condition",
  });

  return fields;
}

function missingFor(chain: DecisionChain, fields: ContractFieldResult[]): MissingDataState[] {
  const missing: MissingDataState[] = [];
  for (const f of fields) {
    if (f.state !== "MISSING") continue;
    missing.push({
      field: f.field,
      requiredSource: f.source ?? "unified-context",
      reason: `${f.field} could not be traced to a source (${f.detail}).`,
      severity: f.field === "evidence" || f.field === "decision" ? "CRITICAL" : "HIGH",
    });
  }
  if (chain.gameTimestamp === null) {
    missing.push({
      field: "gameTimestamp",
      requiredSource: "riot-timeline",
      reason: "No timeline position was supplied for this decision.",
      severity: "MEDIUM",
    });
  }
  if (!chain.playerHabitContext) {
    missing.push({
      field: "playerHabitContext",
      requiredSource: "habit-intelligence",
      reason: "No recurring-habit history was supplied for this decision.",
      severity: "NON_BLOCKING",
    });
  }
  if (!chain.playerMemoryContext) {
    missing.push({
      field: "playerMemoryContext",
      requiredSource: "player-memory",
      reason: "No long-term memory record was supplied for this decision.",
      severity: "NON_BLOCKING",
    });
  }
  return missing;
}

// ---------------------------------------------------------------------------
// Chain validation
// ---------------------------------------------------------------------------

export function validateChain(chain: DecisionChain): ChainValidation {
  const fields = contractFields(chain);
  const missing = missingFor(chain, fields);
  const observed = chain.evidence.filter((e) => e.observed);
  const knowledge = chain.evidence.filter((e) => !e.observed);

  const criticalMissing = fields.some(
    (f) => f.state === "MISSING" && (f.field === "decision" || f.field === "evidence"),
  );
  const anyMissing = fields.some((f) => f.state === "MISSING");
  const anyPlaceholder = fields.some((f) => f.state === "PLACEHOLDER");
  const status: ValidationStatus = criticalMissing
    ? "FAIL"
    : anyMissing || anyPlaceholder
      ? "PARTIAL"
      : "PASS";

  return {
    chainId: chain.chainId,
    decisionId: chain.source.decision.decisionId,
    role: chain.role,
    champion: chain.championId,
    fundamental: isText(chain.fundamentalId) ? chain.fundamentalId : null,
    curriculumTopic: chain.curriculumReference.topic ?? null,
    status,
    fields,
    traceable: observed.length > 0 && isText(chain.explanation.whatHappened),
    observedEvidenceCount: observed.length,
    knowledgeEvidenceCount: knowledge.length,
    confidence: chain.confidence.level,
    habitSupporting: Boolean(chain.playerHabitContext?.supporting),
    habitIsProof: false,
    memoryEnriches: Boolean(chain.playerMemoryContext),
    memoryOverrides: false,
    counterfactual: validateCounterfactual(chain),
    missing,
  };
}

// ---------------------------------------------------------------------------
// Set / pipeline validation
// ---------------------------------------------------------------------------

function sourcesFrom(set: DecisionChainSet): SourceAvailability {
  const c = set.completeness;
  const chains = set.chains;
  return {
    role: c.role,
    champion: c.champion,
    items: c.items,
    runes: c.runes,
    matchup: c.matchup,
    teamComposition: c.teamComposition,
    laneState: c.laneState,
    gameState: c.gameState,
    habits: c.habits,
    playerMemory: c.playerMemory,
    practicePlan: c.practicePlan,
    observedEvidence: chains.some((x) => x.evidence.some((e) => e.observed)),
    prioritization: chains.some((x) => x.decisionPriority > 0),
  };
}

const DATA_PATH = [
  "riot-data",
  "data-dragon",
  "league-intelligence",
  "curriculum",
  "role-intelligence",
  "champion-intelligence",
  "item-intelligence",
  "rune-intelligence",
  "matchup-intelligence",
  "team-composition-intelligence",
  "lane-state-intelligence",
  "unified-context",
  "decision-library",
  "decision-priority",
  "habit-intelligence",
  "player-memory",
  "practice-planner",
] as const satisfies readonly DecisionChainLayer[];

export function validateSet(set: DecisionChainSet): PipelineValidation {
  const chains = set.chains.map(validateChain);
  const sources = sourcesFrom(set);
  const notes: string[] = [];

  let status: ValidationStatus = chains.length === 0 ? "FAIL" : "PASS";
  for (const c of chains) status = worst(status, c.status);
  if (chains.length === 0) notes.push("No decision chains were produced — nothing to validate.");
  if (!sources.observedEvidence) {
    notes.push("No observed match evidence reached the chain; coaching is knowledge-only.");
  }
  if (!sources.prioritization) {
    notes.push("Decision Prioritization Engine output was not attached — priority is 0.");
  }
  if (!sources.champion) {
    notes.push("Champion Intelligence absent — role-level coaching used, as designed.");
  }

  const missing: MissingDataState[] = [];
  for (const c of chains) {
    for (const m of c.missing) {
      if (!missing.some((x) => x.field === m.field && x.requiredSource === m.requiredSource)) {
        missing.push(m);
      }
    }
  }

  const dataPath = DATA_PATH.filter((l) => set.layersUsed.includes(l));

  return {
    version: 1,
    status,
    role: set.role as RoleId,
    champion: set.champion,
    matchId: set.matchId,
    playerId: set.playerId,
    chainsValidated: chains.length,
    primary: set.primary ? (chains.find((c) => c.chainId === set.primary!.chainId) ?? null) : null,
    chains,
    sources,
    layersUsed: set.layersUsed,
    completenessPercent: set.completeness.percent,
    missing,
    dataPath,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Beta-blocker audit
// ---------------------------------------------------------------------------

export function auditSet(set: DecisionChainSet): PipelineAudit {
  const validation = validateSet(set);
  const findings: AuditFinding[] = [];

  if (validation.chainsValidated === 0) {
    findings.push({
      id: "no-chains",
      severity: "CRITICAL",
      area: "decision-chain",
      finding: "No coaching decision could be produced for this match.",
      blocksBeta: true,
    });
  }
  if (!validation.sources.observedEvidence && validation.chainsValidated > 0) {
    findings.push({
      id: "no-observed-evidence",
      severity: "CRITICAL",
      area: "evidence",
      finding: "Coaching was produced without any observed match evidence.",
      blocksBeta: true,
    });
  }
  if (!validation.sources.prioritization && validation.chainsValidated > 0) {
    findings.push({
      id: "no-prioritization",
      severity: "HIGH",
      area: "decision-priority",
      finding: "Prioritization output is not attached, so the coaching focus is order-based only.",
      blocksBeta: false,
    });
  }
  if (validation.primary && !validation.primary.fields.some((f) => f.field === "practiceReference" && f.state === "PRESENT")) {
    findings.push({
      id: "practice-not-measurable",
      severity: "MEDIUM",
      area: "practice-planner",
      finding: "The primary practice reference has no measurable pass condition.",
      blocksBeta: false,
    });
  }
  if (!validation.sources.laneState) {
    findings.push({
      id: "no-lane-state",
      severity: "NON_BLOCKING",
      area: "lane-state-intelligence",
      finding: "Lane State Intelligence had no observed input; enrichment only.",
      blocksBeta: false,
    });
  }
  if (!validation.sources.habits) {
    findings.push({
      id: "no-habits",
      severity: "NON_BLOCKING",
      area: "habit-intelligence",
      finding: "No habit history supplied; single-match coaching still valid.",
      blocksBeta: false,
    });
  }

  const blockers = findings.filter((f) => f.blocksBeta);
  return {
    status: blockers.length > 0 ? "FAIL" : validation.status,
    findings,
    blockers,
    validation,
  };
}
