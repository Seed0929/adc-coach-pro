// ---------------------------------------------------------------------------
// Decision Chain V1 — the integration engine (Sprint 5.1).
//
// It reads existing layers and connects them. It does NOT:
//   • score decisions (the Decision Prioritization Engine owns scoring),
//   • detect habits (Habit Intelligence owns detection),
//   • author curriculum (the Coaching Curriculum owns content),
//   • plan practice (the Practice Planning Engine owns plans),
//   • fabricate context that no source supplied.
//
// PURE + client-safe. No AI, no network, no persistence.
// ---------------------------------------------------------------------------
import type { GamePhase, LeagueFundamentalId } from "../knowledge-base";
import { getLeagueDecision } from "../knowledge-base";
import type { RoleId } from "../knowledge-base/templates/champion";
import type { UnifiedCoachingContext } from "../unified-coaching-context";
import { PENDING } from "../knowledge-base/types";
import type { Habit } from "../habit-intelligence";
import type { PlayerMemoryRecord } from "../player-memory-ledger";
import type { PracticePlan } from "../practice-planning-v1";
import type { PracticePlanInput } from "../practice-planning-v1";
import type { ReplayInput } from "../replay-intelligence-v1";
import type {
  DecisionActionId,
  DecisionCandidate,
  DecisionCandidateInput,
  DecisionChain,
  DecisionChainAIPayload,
  DecisionChainCompleteness,
  DecisionChainInput,
  DecisionChainLayer,
  DecisionChainSet,
  DecisionChainTrace,
  DecisionConfidence,
  DecisionConfidenceLevel,
  DecisionContextFactor,
  DecisionCounterfactual,
  DecisionEvidence,
  DecisionExplanation,
  DecisionGameContext,
  DecisionHabitContext,
  DecisionMemoryContext,
  DecisionPracticeReference,
} from "./types";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const isText = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v !== PENDING;

function uniqStrings(list: (string | undefined | null)[], limit = 12): string[] {
  const out: string[] = [];
  for (const v of list) {
    if (!isText(v)) continue;
    if (!out.includes(v)) out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}

/** Deterministic phase from the game clock. Never guessed without a clock. */
export function phaseFromSeconds(seconds: number | null | undefined): GamePhase | "unknown" {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return "unknown";
  if (seconds < 840) return "early";
  if (seconds < 1500) return "mid";
  return "late";
}

function labelFromActionId(id: string): string {
  return id
    .split(/[-_:]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Confidence — evidence quality, never "AI confidence"
// ---------------------------------------------------------------------------

export function assessConfidence(
  evidence: DecisionEvidence[],
  sampleSize: number,
  priorityConfidence: number | null,
): DecisionConfidence {
  const observed = evidence.filter((e) => e.observed);
  const score = priorityConfidence ?? 0;
  let level: DecisionConfidenceLevel;
  let reason: string;

  if (observed.length === 0) {
    level = "INSUFFICIENT_DATA";
    reason = "No observed game evidence was supplied — only knowledge references are available.";
  } else if (observed.length >= 3 && sampleSize >= 5 && score >= 60) {
    level = "HIGH";
    reason = `${observed.length} observed data points across ${sampleSize} matches back this.`;
  } else if (observed.length >= 2 && (sampleSize >= 3 || score >= 45)) {
    level = "MEDIUM";
    reason = `${observed.length} observed data points${sampleSize ? ` across ${sampleSize} matches` : ""} back this.`;
  } else {
    level = "LOW";
    reason = `Only ${observed.length} observed data point${observed.length === 1 ? "" : "s"} back this so far.`;
  }

  return {
    level,
    score,
    reason,
    evidenceCount: evidence.length,
    sampleSize,
    observedEvidence: observed.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Context assembly — every source optional, nothing fabricated
// ---------------------------------------------------------------------------

function factor(
  id: string,
  label: string,
  source: DecisionChainLayer,
  value: string | undefined,
  observed: boolean,
): DecisionContextFactor | null {
  if (!isText(value)) return null;
  return { id, label, source, value, observed };
}

function compact(list: (DecisionContextFactor | null)[]): DecisionContextFactor[] {
  return list.filter((f): f is DecisionContextFactor => f !== null);
}

function laneStateFactors(u: UnifiedCoachingContext): DecisionContextFactor[] {
  const ls = u.laneState;
  if (!ls) return [];
  return compact([
    factor("lane-phase", "Lane phase", "lane-state-intelligence", ls.lanePhase, ls.observed),
    factor("wave-state", "Wave state", "lane-state-intelligence", ls.waveState, ls.observed),
    factor("lane-context", "Lane context", "lane-state-intelligence", ls.laneContext, ls.observed),
    factor(
      "lane-tempo",
      "Lane tempo",
      "lane-state-intelligence",
      ls.profile?.laneTempo,
      ls.observed,
    ),
    factor(
      "lane-priority",
      "Lane priority",
      "lane-state-intelligence",
      ls.profile?.lanePriority,
      ls.observed,
    ),
    factor("lane-safety", "Lane safety", "lane-state-intelligence", ls.profile?.laneSafety, ls.observed),
  ]);
}

function matchupFactors(u: UnifiedCoachingContext): DecisionContextFactor[] {
  const m = u.matchupIntelligence;
  if (!m) return [];
  return compact([
    factor("matchup", "Matchup", "matchup-intelligence", `${m.championA} vs ${m.championB}`, true),
    factor("matchup-role", "Matchup role", "matchup-intelligence", m.roleContext, true),
    factor(
      "matchup-edge",
      "Lane phase edge",
      "matchup-intelligence",
      m.populated && m.profile?.lanePhaseProfile.edge !== PENDING
        ? m.profile?.lanePhaseProfile.edge
        : undefined,
      m.populated,
    ),
  ]);
}

function compositionFactors(u: UnifiedCoachingContext): DecisionContextFactor[] {
  const t = u.teamComposition;
  if (!t) return [];
  return compact([
    factor("composition", "Team composition", "team-composition-intelligence", t.compositionId, true),
    factor(
      "composition-availability",
      "Composition knowledge",
      "team-composition-intelligence",
      String(t.availability),
      t.populated,
    ),
    ...t.relationships.slice(0, 3).map((r, i) =>
      factor(
        `composition-relationship-${i}`,
        "Composition relationship",
        "team-composition-intelligence",
        uniqStrings(r.notes)[0] ?? `${r.analyzedTraitId}: ${r.edge}`,
        t.populated,
      ),
    ),
  ]);
}

function championFactors(u: UnifiedCoachingContext): DecisionContextFactor[] {
  const c = u.championIntelligence;
  if (!c) return [];
  return compact([
    factor("champion", "Champion", "champion-intelligence", c.champion, true),
    factor("champion-role", "Champion role", "champion-intelligence", c.profile?.primaryRole, true),
  ]);
}

function itemFactors(ids: string[] | undefined): DecisionContextFactor[] {
  if (!ids?.length) return [];
  return ids
    .slice(0, 6)
    .map((id, i) => factor(`item-${i}`, "Item", "item-intelligence", id, true))
    .filter((f): f is DecisionContextFactor => f !== null);
}

function runeFactors(ids: string[] | undefined): DecisionContextFactor[] {
  if (!ids?.length) return [];
  return ids
    .slice(0, 6)
    .map((id, i) => factor(`rune-${i}`, "Rune", "rune-intelligence", id, true))
    .filter((f): f is DecisionContextFactor => f !== null);
}

// ---------------------------------------------------------------------------
// Habit + memory integration — supporting evidence only
// ---------------------------------------------------------------------------

export function habitContextFor(
  decisionId: string,
  habits: Habit[] | undefined,
): DecisionHabitContext | undefined {
  const habit = habits?.find((h) => h.decisionId === decisionId);
  if (!habit) return undefined;
  return {
    decisionId,
    habitId: habit.id,
    status: habit.status,
    trend: habit.trend,
    occurrences: habit.frequency.occurrences,
    matchesObserved: habit.frequency.matchesObserved,
    rate: habit.frequency.rate,
    streak: habit.frequency.streak,
    consistency: habit.consistency,
    practicePriority: habit.practicePriority,
    confidence: habit.confidence,
    supporting: true,
    note:
      habit.frequency.occurrences >= 2
        ? `You repeatedly make this type of decision in this situation — ${habit.frequency.occurrences} of ${habit.frequency.matchesObserved} recorded matches.`
        : `First recorded occurrence of this decision pattern — treated as context, not proof.`,
  };
}

export function memoryContextFor(
  decisionId: string,
  memories: PlayerMemoryRecord[] | undefined,
  playerId?: string,
  currentFocus?: string,
): DecisionMemoryContext | undefined {
  const record = memories?.find((m) => m.decisionId === decisionId);
  if (!record && !playerId && !currentFocus) return undefined;
  return {
    playerId,
    memoryId: record?.memoryId,
    standing: record?.standing,
    longTermStrength: record?.longTermStrength ?? false,
    longTermWeakness: record?.longTermWeakness ?? false,
    reinforcementCount: record?.reinforcementCount ?? 0,
    currentFocus,
    note: record?.coachingSummary ?? "No long-term memory for this decision yet.",
  };
}

// ---------------------------------------------------------------------------
// Available decisions
// ---------------------------------------------------------------------------

function selectedCandidate(u: UnifiedCoachingContext, taken: boolean): DecisionCandidate {
  const league = u.decision.leagueDecisionId ? getLeagueDecision(u.decision.leagueDecisionId) : undefined;
  return {
    actionId: u.decision.decisionId,
    label: u.decision.label,
    source: "decision-library",
    observed: u.decisionPriority.evidence.length > 0,
    rationale: league?.summary ?? u.source.whyItMatters,
    priority: u.decisionPriority.priority,
    fundamental: u.leagueIntelligence.fundamental,
    curriculumTopic: u.curriculum.topic,
    evidence: u.decisionPriority.evidence.slice(0, 4),
    taken,
    prioritized: true,
  };
}

/**
 * The set of decisions that were available. Caller-supplied candidates come
 * first; the remainder are references from Lane State + Role Intelligence.
 * Nothing here is invented — knowledge-derived options are flagged
 * `observed: false`.
 */
export function buildAvailableDecisions(
  u: UnifiedCoachingContext,
  supplied: DecisionCandidateInput[] | undefined,
): { candidates: DecisionCandidate[]; selected: DecisionCandidate } {
  const takenFromInput = supplied?.find((s) => s.taken);
  const selected = selectedCandidate(u, takenFromInput?.actionId === u.decision.decisionId);
  const byId = new Map<DecisionActionId, DecisionCandidate>();
  byId.set(selected.actionId, selected);

  for (const s of supplied ?? []) {
    const existing = byId.get(s.actionId);
    if (existing) {
      byId.set(s.actionId, {
        ...existing,
        taken: existing.taken || s.taken === true,
        observed: existing.observed || s.observed !== false,
        evidence: uniqStrings([...existing.evidence, ...(s.evidence ?? [])], 6),
      });
      continue;
    }
    byId.set(s.actionId, {
      actionId: s.actionId,
      label: s.label ?? labelFromActionId(s.actionId),
      source: "riot-data",
      observed: s.observed !== false,
      rationale: s.rationale ?? "Option supplied by an observed game source.",
      priority: null,
      fundamental: s.fundamental,
      curriculumTopic: s.curriculumTopic,
      evidence: s.evidence ?? [],
      taken: s.taken === true,
      prioritized: false,
    });
  }

  for (const p of u.laneState?.decisionPriorities ?? []) {
    if (byId.has(p.decisionId)) continue;
    if (u.laneState?.role && p.roles.length && !p.roles.includes(u.laneState.role)) continue;
    byId.set(p.decisionId, {
      actionId: p.decisionId,
      label: labelFromActionId(p.decisionId),
      source: "lane-state-intelligence",
      observed: false,
      rationale: isText(p.note) ? p.note : `Lane state routes a ${p.tier}-tier decision here.`,
      priority: null,
      fundamental: p.fundamental === PENDING ? undefined : (p.fundamental as LeagueFundamentalId),
      evidence: [],
      taken: false,
      prioritized: false,
    });
  }

  const candidates = [...byId.values()].sort(
    (a, b) =>
      Number(b.prioritized) - Number(a.prioritized) ||
      (b.priority ?? -1) - (a.priority ?? -1) ||
      Number(b.observed) - Number(a.observed) ||
      a.actionId.localeCompare(b.actionId),
  );
  return { candidates, selected };
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

function buildEvidence(
  u: UnifiedCoachingContext,
  input: DecisionChainInput,
  habit: DecisionHabitContext | undefined,
  timestampSeconds: number | null,
): DecisionEvidence[] {
  const out: DecisionEvidence[] = [];
  const push = (e: DecisionEvidence) => {
    if (!isText(e.statement)) return;
    if (out.some((x) => x.statement === e.statement)) return;
    out.push(e);
  };

  for (const e of input.evidenceByDecisionId?.[u.decision.decisionId] ?? []) push(e);

  if (timestampSeconds !== null) {
    push({
      id: `${u.decision.decisionId}:timestamp`,
      kind: "timestamp",
      statement: `Observed at ${Math.floor(timestampSeconds / 60)}:${String(timestampSeconds % 60).padStart(2, "0")}.`,
      source: "riot-data",
      observed: true,
      timestampSeconds,
      matchId: input.matchId,
    });
  }

  u.decisionPriority.evidence.forEach((statement, i) =>
    push({
      id: `${u.decision.decisionId}:priority-${i}`,
      kind: "player-history",
      statement,
      source: "decision-priority",
      observed: true,
      matchId: input.matchId,
    }),
  );

  if (habit) {
    push({
      id: `${u.decision.decisionId}:habit`,
      kind: "habit-history",
      statement: habit.note,
      source: "habit-intelligence",
      observed: habit.occurrences > 0,
    });
  }

  const ls = u.laneState;
  if (ls?.observed) {
    push({
      id: `${u.decision.decisionId}:wave`,
      kind: "wave-state",
      statement: `Lane state: ${ls.waveState} wave in the ${ls.lanePhase} phase (${ls.laneContext}).`,
      source: "lane-state-intelligence",
      observed: true,
    });
  }
  if (u.matchupIntelligence) {
    push({
      id: `${u.decision.decisionId}:matchup`,
      kind: "matchup",
      statement: `Matchup context: ${u.matchupIntelligence.championA} vs ${u.matchupIntelligence.championB}.`,
      source: "matchup-intelligence",
      observed: true,
    });
  }
  if (u.teamComposition) {
    push({
      id: `${u.decision.decisionId}:composition`,
      kind: "team-composition",
      statement: `Team composition context: ${u.teamComposition.compositionId}.`,
      source: "team-composition-intelligence",
      observed: true,
    });
  }
  for (const id of (input.itemIds ?? []).slice(0, 3)) {
    push({
      id: `${u.decision.decisionId}:item-${id}`,
      kind: "item-state",
      statement: `Item state included ${id}.`,
      source: "item-intelligence",
      observed: true,
    });
  }
  for (const id of (input.runeIds ?? []).slice(0, 3)) {
    push({
      id: `${u.decision.decisionId}:rune-${id}`,
      kind: "rune-state",
      statement: `Rune state included ${id}.`,
      source: "rune-intelligence",
      observed: true,
    });
  }

  push({
    id: `${u.decision.decisionId}:knowledge`,
    kind: "knowledge-reference",
    statement: `${u.curriculum.topicLabel} — ${u.leagueIntelligence.fundamentalLabel}.`,
    source: "curriculum",
    observed: false,
  });

  return out;
}

// ---------------------------------------------------------------------------
// Counterfactual — evidence-based language only
// ---------------------------------------------------------------------------

export function buildCounterfactual(
  u: UnifiedCoachingContext,
  candidates: DecisionCandidate[],
  selected: DecisionCandidate,
  confidence: DecisionConfidence,
): DecisionCounterfactual | null {
  if (u.decision.kind !== "weakness") return null;
  const alternativeCandidate = candidates.find((c) => c.actionId !== selected.actionId && !c.taken);
  const alternative =
    (isText(u.recoveryRecommendation.method) ? u.recoveryRecommendation.method : undefined) ??
    alternativeCandidate?.label;
  if (!isText(alternative)) return null;

  const advantage =
    uniqStrings([
      u.positiveReinforcement.example,
      u.source.curriculumTopic.positiveCoachingExamples[0],
      u.fundamentalExpression.expression,
    ])[0] ?? "";
  if (!isText(advantage)) return null;

  return {
    decisionTaken: selected.label,
    alternativeDecision: alternative,
    expectedAdvantage: advantage,
    reason: u.source.whyItMatters,
    evidence: uniqStrings([...selected.evidence, u.decisionPriority.reason], 4),
    confidence,
  };
}

// ---------------------------------------------------------------------------
// Practice reference — always the existing Practice Planner architecture
// ---------------------------------------------------------------------------

export function buildPracticeReference(
  u: UnifiedCoachingContext,
  plan: PracticePlan | undefined,
): DecisionPracticeReference {
  const planned = plan?.successCriteria.find((c) => c.decisionId === u.decision.decisionId);
  const primaryPlanned = plan?.primaryFocus.decisionId === u.decision.decisionId;
  return {
    practicePlanId: plan?.practicePlanId,
    fundamental: u.leagueIntelligence.fundamental,
    curriculumTopic: u.curriculum.topic,
    goal:
      (primaryPlanned ? plan?.primaryFocus.statement : undefined) ??
      planned?.statement ??
      u.practiceRecommendation.drill,
    measurable: planned?.measurable ?? u.practiceRecommendation.measurable,
    source: plan ? "practice-planner" : "curriculum",
  };
}

// ---------------------------------------------------------------------------
// Explanation — the structured coaching output
// ---------------------------------------------------------------------------

function buildExplanation(
  u: UnifiedCoachingContext,
  candidates: DecisionCandidate[],
  selected: DecisionCandidate,
  habit: DecisionHabitContext | undefined,
  practice: DecisionPracticeReference,
): DecisionExplanation {
  return {
    whatHappened: uniqStrings([u.decisionPriority.evidence[0], u.decision.label])[0] ?? u.decision.label,
    whyItMattered:
      uniqStrings([u.decisionPriority.reason, u.source.whyItMatters])[0] ?? u.source.whyItMatters,
    decisionsAvailable: candidates.map((c) => c.label),
    whyPrioritizedDecisionMattered: uniqStrings([
      selected.rationale,
      u.source.typicalConsequences[0],
      `${u.roleIntelligence.roleLabel} priority: ${u.roleIntelligence.decisionPriorities[0] ?? u.curriculum.topicLabel}`,
    ]).join(" "),
    fundamentalItRelatesTo: `${u.leagueIntelligence.fundamentalLabel} — ${u.fundamentalExpression.expression}`,
    habitThatMayHaveContributed: habit ? habit.note : null,
    whatToPractice: practice.measurable ? `${practice.goal} (${practice.measurable})` : practice.goal,
  };
}

// ---------------------------------------------------------------------------
// Chain assembly
// ---------------------------------------------------------------------------

function tracesFor(
  u: UnifiedCoachingContext,
  habit: DecisionHabitContext | undefined,
  memory: DecisionMemoryContext | undefined,
  practice: DecisionPracticeReference,
): DecisionChainTrace[] {
  const traces: DecisionChainTrace[] = [
    { layer: "unified-context", ref: u.decision.decisionId, field: "chain" },
    { layer: "league-intelligence", ref: u.leagueIntelligence.fundamental, field: "fundamentalId" },
    { layer: "curriculum", ref: u.curriculum.topic, field: "curriculumReference" },
    { layer: "role-intelligence", ref: u.roleIntelligence.role, field: "role" },
    { layer: "decision-priority", ref: u.decision.decisionId, field: "decisionPriority" },
  ];
  if (u.decision.leagueDecisionId)
    traces.push({ layer: "decision-library", ref: u.decision.leagueDecisionId, field: "selectedDecision" });
  if (u.championIntelligence)
    traces.push({ layer: "champion-intelligence", ref: u.championIntelligence.champion, field: "championContext" });
  if (u.matchupIntelligence)
    traces.push({ layer: "matchup-intelligence", ref: u.matchupIntelligence.matchupId, field: "matchupContext" });
  if (u.teamComposition)
    traces.push({
      layer: "team-composition-intelligence",
      ref: u.teamComposition.compositionId,
      field: "teamCompositionContext",
    });
  if (u.laneState)
    traces.push({ layer: "lane-state-intelligence", ref: u.laneState.laneStateId, field: "laneStateContext" });
  if (habit?.habitId)
    traces.push({ layer: "habit-intelligence", ref: habit.habitId, field: "playerHabitContext" });
  if (memory?.memoryId)
    traces.push({ layer: "player-memory", ref: memory.memoryId, field: "playerMemoryContext" });
  if (practice.practicePlanId)
    traces.push({ layer: "practice-planner", ref: practice.practicePlanId, field: "practiceGoal" });
  return traces;
}

/** Build ONE decision chain from the canonical contract. */
export function buildDecisionChain(
  u: UnifiedCoachingContext,
  input: DecisionChainInput,
  index = 0,
): DecisionChain {
  const decisionId = u.decision.decisionId;
  const timestampSeconds = input.timestampsByDecisionId?.[decisionId] ?? null;
  const gamePhase = phaseFromSeconds(timestampSeconds);
  const habit = habitContextFor(decisionId, input.habits);
  const memory = memoryContextFor(
    decisionId,
    input.memories,
    input.playerId ?? u.playerMemory?.playerId,
    input.memorySummary?.headline ?? u.playerMemory?.currentCoachingFocus,
  );

  const { candidates, selected } = buildAvailableDecisions(
    u,
    input.candidatesByDecisionId?.[decisionId],
  );
  const evidence = buildEvidence(u, input, habit, timestampSeconds);
  const sampleSize =
    habit?.matchesObserved ??
    input.memorySummary?.matchesRecorded ??
    (u.habit?.habitContext?.occurrence?.total ?? 0);
  const confidence = assessConfidence(evidence, sampleSize, u.decisionPriority.scores?.confidence ?? null);
  const practiceGoal = buildPracticeReference(u, input.practicePlan);
  const scores = u.decisionPriority.scores;

  const laneState = laneStateFactors(u);
  const matchup = matchupFactors(u);
  const composition = compositionFactors(u);
  const champion = championFactors(u);
  const items = itemFactors(input.itemIds);
  const runes = runeFactors(input.runeIds);

  const gameContext: DecisionGameContext = {
    gamePhase,
    gameTimestampSeconds: timestampSeconds,
    laneContext: u.laneState?.laneContext,
    lanePhase: u.laneState?.lanePhase,
    waveState: u.laneState?.waveState,
    laneStateObserved: u.laneState?.observed ?? false,
    matchupId: u.matchupIntelligence?.matchupId,
    matchupPopulated: u.matchupIntelligence?.populated ?? false,
    compositionId: u.teamComposition?.compositionId,
    compositionPopulated: u.teamComposition?.populated ?? false,
    championIntelligenceUsed: Boolean(u.championIntelligence),
  };

  return {
    chainId: `${input.matchId ?? "chain"}::${index}::${decisionId}`,
    matchId: input.matchId ?? null,
    playerId: input.playerId ?? u.playerMemory?.playerId ?? null,
    role: u.roleIntelligence.role,
    roleLabel: u.roleIntelligence.roleLabel,
    championId: u.championIntelligence?.champion ?? input.champion ?? null,
    gameTimestamp: timestampSeconds,
    gamePhase,
    gameContext,

    availableDecisions: candidates,
    selectedDecision: selected,

    decisionPriority: u.decisionPriority.priority,
    decisionImpact: scores?.impact ?? null,
    decisionFrequency: scores?.frequency ?? null,
    decisionDifficulty: scores?.difficulty ?? null,
    decisionAgency: scores?.playerAgency ?? null,
    decisionRecoverability: scores?.recoverability ?? null,
    decisionSnowballPotential: scores?.snowballPotential ?? null,
    decisionConsistency: scores?.consistency ?? null,
    scores,

    contextFactors: [...champion, ...laneState, ...matchup, ...composition, ...items, ...runes],
    matchupContext: matchup.length ? matchup : undefined,
    teamCompositionContext: composition.length ? composition : undefined,
    laneStateContext: laneState.length ? laneState : undefined,
    championContext: champion.length ? champion : undefined,
    itemContext: items.length ? items : undefined,
    runeContext: runes.length ? runes : undefined,
    playerHabitContext: habit,
    playerMemoryContext: memory,

    fundamentalId: u.leagueIntelligence.fundamental,
    fundamentalLabel: u.leagueIntelligence.fundamentalLabel,
    curriculumReference: {
      topic: u.curriculum.topic,
      topicLabel: u.curriculum.topicLabel,
      supportingTopics: u.curriculum.supportingTopics,
      decisionPatternId: u.curriculum.decisionPatternId,
    },

    explanation: buildExplanation(u, candidates, selected, habit, practiceGoal),
    counterfactual: buildCounterfactual(u, candidates, selected, confidence),
    practiceGoal,
    confidence,
    evidence,
    sourceReferences: tracesFor(u, habit, memory, practiceGoal),
    source: u,
  };
}

function completenessFor(
  contexts: UnifiedCoachingContext[],
  input: DecisionChainInput,
): DecisionChainCompleteness {
  const any = (fn: (u: UnifiedCoachingContext) => boolean) => contexts.some(fn);
  const flags = {
    role: contexts.length > 0,
    champion: any((u) => Boolean(u.championIntelligence)) || Boolean(input.champion),
    items: Boolean(input.itemIds?.length),
    runes: Boolean(input.runeIds?.length),
    matchup: any((u) => Boolean(u.matchupIntelligence)),
    teamComposition: any((u) => Boolean(u.teamComposition)),
    laneState: any((u) => Boolean(u.laneState)) || Boolean(input.laneState),
    gameState: Boolean(input.timestampsByDecisionId || input.evidenceByDecisionId),
    habits: Boolean(input.habits?.length),
    playerMemory: Boolean(input.memories?.length || input.memorySummary),
    practicePlan: Boolean(input.practicePlan),
  };
  const values = Object.values(flags);
  const percent = Math.round((values.filter(Boolean).length / values.length) * 100);
  return { ...flags, percent };
}

/**
 * Build the full Decision Chain set. Degrades gracefully: Role + Champion,
 * Role + Champion + Matchup, Role + Champion + Matchup + Lane State and full
 * context all work, and no missing source is ever fabricated.
 */
export function build(input: DecisionChainInput): DecisionChainSet {
  const createdAt = input.now ?? new Date().toISOString();
  const ordered = input.priorities
    ? [...input.contexts].sort((a, b) => {
        const rank = (u: UnifiedCoachingContext) =>
          input.priorities!.ranked.findIndex((r) => r.id === u.decision.decisionId);
        const ra = rank(a);
        const rb = rank(b);
        return (ra < 0 ? Number.MAX_SAFE_INTEGER : ra) - (rb < 0 ? Number.MAX_SAFE_INTEGER : rb);
      })
    : input.contexts;

  const chains = ordered.map((u, i) => buildDecisionChain(u, input, i));
  const weaknesses = chains.filter((c) => c.source.decision.kind === "weakness");
  const primary = weaknesses[0] ?? chains[0] ?? null;
  const secondary =
    weaknesses.find((c) => c.chainId !== primary?.chainId) ??
    chains.find((c) => c.chainId !== primary?.chainId) ??
    null;

  const layersUsed: DecisionChainLayer[] = [];
  for (const t of chains.flatMap((c) => c.sourceReferences)) {
    if (!layersUsed.includes(t.layer)) layersUsed.push(t.layer);
  }

  return {
    role: primary?.role ?? input.contexts[0]?.roleIntelligence.role ?? ("adc" as RoleId),
    roleLabel: primary?.roleLabel ?? input.contexts[0]?.roleIntelligence.roleLabel ?? "ADC",
    champion: primary?.championId ?? input.champion ?? null,
    matchId: input.matchId ?? null,
    playerId: input.playerId ?? null,
    chains,
    primary,
    secondary,
    completeness: completenessFor(input.contexts, input),
    layersUsed,
    traces: chains.flatMap((c) => c.sourceReferences),
    createdAt,
  };
}

/** Safe empty set — used when no coaching context exists yet. */
export function safeFallback(role: RoleId = "adc", now?: string): DecisionChainSet {
  return {
    role,
    roleLabel: role.toUpperCase(),
    champion: null,
    matchId: null,
    playerId: null,
    chains: [],
    primary: null,
    secondary: null,
    completeness: {
      role: false,
      champion: false,
      items: false,
      runes: false,
      matchup: false,
      teamComposition: false,
      laneState: false,
      gameState: false,
      habits: false,
      playerMemory: false,
      practicePlan: false,
      percent: 0,
    },
    layersUsed: [],
    traces: [],
    createdAt: now ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Consumer adapters — existing surfaces keep working without Decision Chains
// ---------------------------------------------------------------------------

/** Structured Decision Chain payload for the existing Match Report pipeline. */
export interface MatchReportDecisionChain {
  matchId: string | null;
  primaryDecisionId: string | null;
  primaryFundamental: LeagueFundamentalId | null;
  whatHappened: string | null;
  whyItMattered: string | null;
  decisionsAvailable: string[];
  habitNote: string | null;
  practiceGoal: string | null;
  counterfactual: DecisionCounterfactual | null;
  confidence: DecisionConfidenceLevel;
  chains: DecisionChain[];
}

export function forMatchReport(set: DecisionChainSet): MatchReportDecisionChain {
  const p = set.primary;
  return {
    matchId: set.matchId,
    primaryDecisionId: p?.source.decision.decisionId ?? null,
    primaryFundamental: p?.fundamentalId ?? null,
    whatHappened: p?.explanation.whatHappened ?? null,
    whyItMattered: p?.explanation.whyItMattered ?? null,
    decisionsAvailable: p?.explanation.decisionsAvailable ?? [],
    habitNote: p?.explanation.habitThatMayHaveContributed ?? null,
    practiceGoal: p?.explanation.whatToPractice ?? null,
    counterfactual: p?.counterfactual ?? null,
    confidence: p?.confidence.level ?? "INSUFFICIENT_DATA",
    chains: set.chains,
  };
}

/** Feed the existing Replay Coach without changing its architecture. */
export function toReplayInput(set: DecisionChainSet, input: DecisionChainInput): ReplayInput {
  const timestamps: Record<string, number> = { ...(input.timestampsByDecisionId ?? {}) };
  for (const c of set.chains) {
    if (c.gameTimestamp !== null) timestamps[c.source.decision.decisionId] = c.gameTimestamp;
  }
  return {
    contexts: set.chains.map((c) => c.source),
    priorities: input.priorities,
    habits: input.habits,
    memories: input.memories,
    memorySummary: input.memorySummary,
    practicePlan: input.practicePlan,
    champion: set.champion ?? undefined,
    matchId: set.matchId ?? undefined,
    timestampsByDecisionId: Object.keys(timestamps).length ? timestamps : undefined,
    now: input.now,
  };
}

/** Feed the existing Practice Planner without changing its architecture. */
export function toPracticePlanInput(
  set: DecisionChainSet,
  input: DecisionChainInput,
): PracticePlanInput {
  return {
    contexts: set.chains.map((c) => c.source),
    priorities: input.priorities,
    habits: input.habits,
    memories: input.memories,
    memorySummary: input.memorySummary,
    champion: set.champion ?? undefined,
    now: input.now,
  };
}

/** Structured reasoning a future AI Coach consumes instead of raw Riot data. */
export function toAIPayload(set: DecisionChainSet): DecisionChainAIPayload {
  const fundamentals: LeagueFundamentalId[] = [];
  for (const c of set.chains) if (!fundamentals.includes(c.fundamentalId)) fundamentals.push(c.fundamentalId);
  return {
    version: 1,
    role: set.role,
    champion: set.champion,
    matchId: set.matchId,
    playerId: set.playerId,
    decisionChain: set.chains.map((c) => ({
      chainId: c.chainId,
      decisionId: c.source.decision.decisionId,
      label: c.source.decision.label,
      priority: c.decisionPriority,
      gamePhase: c.gamePhase,
      availableDecisions: c.availableDecisions.map((d) => d.label),
      selectedDecision: c.selectedDecision.label,
    })),
    evidence: set.chains.flatMap((c) => c.evidence),
    fundamentals,
    habits: set.chains
      .map((c) => c.playerHabitContext)
      .filter((h): h is DecisionHabitContext => Boolean(h)),
    practiceGoals: set.chains.map((c) => c.practiceGoal),
    confidence: set.primary?.confidence.level ?? "INSUFFICIENT_DATA",
    completeness: set.completeness,
  };
}
