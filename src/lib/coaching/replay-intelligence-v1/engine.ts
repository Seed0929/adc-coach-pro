// ---------------------------------------------------------------------------
// Replay Intelligence Engine V1 — the timeline explanation layer (Sprint 4.3).
//
// Coaches the TIMELINE of decisions instead of isolated mistakes: every moment
// resolves Decision ID → League Fundamental → Curriculum Topic → Role →
// Habit → Coaching Priority, and records a trace back to its source layer.
//
// Champion Intelligence stays OPTIONAL — with no champion record the engine
// runs entirely on League Intelligence + Role Intelligence + Curriculum +
// Decision Library + Habit Intelligence + Player Memory + Unified Context.
//
// PURE + client-safe. No AI, no network, no Riot calls, no persistence.
// ---------------------------------------------------------------------------
import {
  getCurriculumTopic,
  getFundamental,
  getLeagueDecision,
  type CurriculumTopicId,
  type LeagueFundamentalId,
} from "../knowledge-base";
import type { GamePhase } from "../knowledge-base/types";
import type { RoleId } from "../knowledge-base/templates/champion";
import { getRoleProfile } from "../role-intelligence-v1";
import type { UnifiedCoachingContext } from "../unified-coaching-context";
import type { Habit } from "../habit-intelligence";
import type { PlayerMemoryRecord } from "../player-memory-ledger";
import type { Narrative } from "../narrative-engine-v1";
import type {
  ReplayConfidence,
  ReplayDecisionTimelineEntry,
  ReplayInput,
  ReplayLayer,
  ReplayMoment,
  ReplayMomentType,
  ReplayPriority,
  ReplayPriorityBand,
  ReplayTimeline,
  ReplayTimestamp,
  ReplayTrace,
} from "./types";

// ---------------------------------------------------------------------------
// Small deterministic helpers
// ---------------------------------------------------------------------------

function trace(layer: ReplayLayer, ref: string, field: string): ReplayTrace {
  return { layer, ref, field };
}

function firstOf(...values: (string | undefined | null)[]): string {
  for (const v of values) if (v && v.trim().length > 0) return v.trim();
  return "";
}

function nowIso(input?: string): string {
  return input ?? new Date().toISOString();
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function mmss(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function phaseOf(seconds: number): GamePhase {
  if (seconds < 14 * 60) return "early";
  if (seconds < 25 * 60) return "mid";
  return "late";
}

/** Fundamentals that naturally happen early → late. Keeps ordering stable. */
const FUNDAMENTAL_TIMELINE_WEIGHT: Record<LeagueFundamentalId, number> = {
  "champion-identity": 0,
  trading: 1,
  economy: 2,
  "wave-management": 3,
  "resource-management": 4,
  vision: 5,
  tempo: 6,
  "map-movement": 7,
  "power-spikes": 8,
  "objective-control": 9,
  positioning: 10,
  "decision-making": 11,
  "win-conditions": 12,
  consistency: 13,
};

function priorityBand(score: number): ReplayPriorityBand {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "moderate";
  return "low";
}

function confidenceLevel(score: number): ReplayConfidence["level"] {
  if (score >= 66) return "high";
  if (score >= 33) return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Lookups across the optional layers, always matched by decision id
// ---------------------------------------------------------------------------

function habitFor(input: ReplayInput, decisionId: string): Habit | undefined {
  return input.habits?.find((h) => h.decisionId === decisionId);
}

function memoryFor(input: ReplayInput, decisionId: string): PlayerMemoryRecord | undefined {
  return input.memories?.find((m) => m.decisionId === decisionId);
}

function narrativeFor(input: ReplayInput, decisionId: string): Narrative | undefined {
  return input.narratives?.find((n) => n.id === decisionId);
}

function roleOf(input: ReplayInput): { role: RoleId; roleLabel: string } {
  const role = input.priorities?.role ?? input.contexts[0]?.roleIntelligence.role ?? "adc";
  const roleLabel =
    input.priorities?.roleLabel ??
    input.contexts[0]?.roleIntelligence.roleLabel ??
    getRoleProfile(role).label;
  return { role, roleLabel };
}

function championOf(input: ReplayInput): string | null {
  return (
    input.champion ??
    input.contexts.find((c) => c.championIntelligence?.champion)?.championIntelligence?.champion ??
    null
  );
}

// ---------------------------------------------------------------------------
// Timeline placement — deterministic, never invented match events
// ---------------------------------------------------------------------------

/**
 * Order the contexts the way the game developed: explicit timestamps first,
 * then the natural early→late ordering of the fundamental each decision
 * belongs to, then coaching priority as the tiebreaker.
 */
function orderedContexts(input: ReplayInput): UnifiedCoachingContext[] {
  const explicit = input.timestampsByDecisionId ?? {};
  return [...input.contexts].sort((a, b) => {
    const ta = explicit[a.decision.decisionId];
    const tb = explicit[b.decision.decisionId];
    if (ta !== undefined && tb !== undefined) return ta - tb;
    if (ta !== undefined) return -1;
    if (tb !== undefined) return 1;
    const wa = FUNDAMENTAL_TIMELINE_WEIGHT[a.leagueIntelligence.fundamental] ?? 99;
    const wb = FUNDAMENTAL_TIMELINE_WEIGHT[b.leagueIntelligence.fundamental] ?? 99;
    if (wa !== wb) return wa - wb;
    return b.decisionPriority.priority - a.decisionPriority.priority;
  });
}

function timestampFor(
  c: UnifiedCoachingContext,
  sequence: number,
  total: number,
  input: ReplayInput,
): ReplayTimestamp {
  const explicit = input.timestampsByDecisionId?.[c.decision.decisionId];
  if (explicit !== undefined) {
    return {
      seconds: explicit,
      label: mmss(explicit),
      phase: phaseOf(explicit),
      sequence,
      estimated: false,
    };
  }
  // Spread the timeline evenly across the known (or a standard 30 min) game,
  // starting after the first wave so early-game decisions land in lane phase.
  const duration = input.gameDurationSeconds ?? 30 * 60;
  const start = 90;
  const step = total > 1 ? (duration - start) / (total + 1) : (duration - start) / 2;
  const seconds = Math.round(start + step * (sequence + 1));
  return {
    seconds,
    label: mmss(seconds),
    phase: phaseOf(seconds),
    sequence,
    estimated: true,
  };
}

// ---------------------------------------------------------------------------
// Turning point classification
// ---------------------------------------------------------------------------

function classify(
  c: UnifiedCoachingContext,
  habit: Habit | undefined,
  priority: number,
  phase: GamePhase,
): { type: ReplayMomentType; turningPoint: boolean } {
  const fundamental = c.leagueIntelligence.fundamental;
  const isStrength = c.decision.kind === "strength";
  const impact = c.coachingPriority.impact;

  if (isStrength) {
    if (fundamental === "objective-control" || fundamental === "win-conditions") {
      return { type: "objective-swing", turningPoint: true };
    }
    if (priority >= 66 || impact === "high") {
      return { type: "positive-turning-point", turningPoint: true };
    }
    if (habit && habit.improvementTrend >= 50) {
      return { type: "momentum-shift", turningPoint: true };
    }
    return { type: "good-discipline", turningPoint: false };
  }

  if (habit && habit.recoveryProgress >= 50) {
    return { type: "recovery-opportunity", turningPoint: false };
  }
  if (fundamental === "objective-control") {
    return { type: "objective-swing", turningPoint: true };
  }
  if (fundamental === "power-spikes" || fundamental === "economy") {
    return { type: "power-spike-window", turningPoint: phase !== "early" };
  }
  if (fundamental === "tempo" || fundamental === "map-movement") {
    return { type: "momentum-shift", turningPoint: true };
  }
  if (
    (fundamental === "positioning" || fundamental === "decision-making") &&
    (priority >= 66 || impact === "high")
  ) {
    return { type: "negative-turning-point", turningPoint: true };
  }
  if (habit && habit.regressionTrend >= 50) {
    return { type: "snowball-moment", turningPoint: true };
  }
  if (fundamental === "consistency" || fundamental === "resource-management") {
    return { type: "bad-discipline", turningPoint: false };
  }
  return priority >= 50
    ? { type: "negative-turning-point", turningPoint: true }
    : { type: "bad-discipline", turningPoint: false };
}

// ---------------------------------------------------------------------------
// Moment builder
// ---------------------------------------------------------------------------

function priorityFrom(
  c: UnifiedCoachingContext,
  habit: Habit | undefined,
  order: number,
): ReplayPriority {
  const score = clamp(
    c.decisionPriority.priority || habit?.practicePriority || (c.coachingPriority.impact === "high" ? 70 : 45),
  );
  return {
    score,
    band: priorityBand(score),
    order,
    explanation: firstOf(
      c.decisionPriority.reason,
      habit
        ? `${habit.label} appeared in ${habit.frequency.occurrences} of your last ${habit.frequency.matchesObserved} recorded games.`
        : "",
      `${c.leagueIntelligence.fundamentalLabel} decisions carry ${c.coachingPriority.impact} impact for ${c.roleIntelligence.roleLabel}.`,
    ),
  };
}

function confidenceFrom(
  c: UnifiedCoachingContext,
  habit: Habit | undefined,
  memory: PlayerMemoryRecord | undefined,
): ReplayConfidence {
  const score = clamp(habit?.confidence ?? (c.decisionPriority.evidence.length > 1 ? 60 : 40));
  return {
    score,
    level: confidenceLevel(score),
    explanation: firstOf(
      habit
        ? `Based on ${habit.frequency.matchesObserved} recorded game(s) containing this decision.`
        : "",
      memory ? `Your coaching history has tracked this ${memory.reinforcementCount} time(s).` : "",
      c.decisionPriority.evidence.length
        ? `Based on ${c.decisionPriority.evidence.length} piece(s) of evidence from this review.`
        : "Based on a single review — it will sharpen as more games are imported.",
    ),
  };
}

function buildMoment(
  c: UnifiedCoachingContext,
  sequence: number,
  total: number,
  input: ReplayInput,
): ReplayMoment {
  const traces: ReplayTrace[] = [];
  const decisionId = c.decision.decisionId;
  const habit = habitFor(input, decisionId);
  const memory = memoryFor(input, decisionId);
  const narrative = narrativeFor(input, decisionId);
  const league = c.decision.leagueDecisionId ? getLeagueDecision(c.decision.leagueDecisionId) : undefined;
  const topic = getCurriculumTopic(c.curriculum.topic);
  const fundamental = getFundamental(c.leagueIntelligence.fundamental);
  const chain = c.source.decisionChain;
  const isStrength = c.decision.kind === "strength";
  const timestamp = timestampFor(c, sequence, total, input);
  const priority = priorityFrom(c, habit, sequence);
  const { type, turningPoint } = classify(c, habit, priority.score, timestamp.phase);

  const situationSummary = firstOf(
    narrative?.summary,
    league?.summary,
    topic?.definition,
    `${c.roleIntelligence.roleLabel} decision around ${fundamental.label.toLowerCase()} at ${timestamp.label}.`,
  );
  traces.push(
    trace(
      narrative ? "narrative-engine" : league ? "decision-library" : topic ? "curriculum" : "league-intelligence",
      narrative?.id ?? league?.id ?? topic?.id ?? fundamental.id,
      "situationSummary",
    ),
  );

  const decisionMade = firstOf(
    isStrength ? league?.positiveExample : league?.negativeExample,
    isStrength ? c.positiveReinforcement.example : c.source.negativeExamples[0],
    chain?.decision,
    c.decision.label,
  );
  traces.push(
    trace(league ? "decision-library" : "curriculum", league?.id ?? c.curriculum.topic, "decisionMade"),
  );

  const betterAlternative = isStrength
    ? firstOf(
        c.positiveReinforcement.supportingExamples[0],
        topic?.positiveDecisions[0],
        `Keep making this ${fundamental.label.toLowerCase()} read — it is already the correct one.`,
      )
    : firstOf(
        topic?.positiveDecisions[0],
        league?.positiveExample,
        c.positiveReinforcement.example,
        c.fundamentalExpression.expression,
      );
  traces.push(
    trace(topic ? "curriculum" : "decision-library", topic?.id ?? league?.id ?? fundamental.id, "betterAlternative"),
  );

  const immediateResult = firstOf(
    league?.expectedConsequences.immediate,
    chain?.immediateResult,
    topic?.typicalConsequences[0],
    c.source.typicalConsequences[0],
  );
  traces.push(
    trace(league ? "decision-library" : "curriculum", league?.id ?? c.curriculum.topic, "immediateResult"),
  );

  const longTermResult = firstOf(
    league?.expectedConsequences.gameOutcome,
    chain?.longTermImpact,
    narrative?.expectedImprovement,
    topic?.typicalConsequences[1],
  );
  traces.push(
    trace(league ? "decision-library" : "curriculum", league?.id ?? c.curriculum.topic, "longTermResult"),
  );

  const tempoImpact = firstOf(
    chain?.tempoImpact,
    league?.expectedConsequences.later,
    c.rolePhilosophy.tempo[0],
    `Tempo shifts to whoever spends the next 30 seconds better than you did here.`,
  );
  traces.push(trace(chain?.tempoImpact ? "curriculum" : "role-intelligence", c.curriculum.topic, "tempoImpact"));

  const economyImpact = firstOf(
    c.rolePhilosophy.economy[0],
    topic?.typicalConsequences.find((t) => /gold|cs|item|farm/i.test(t)),
    `Gold swings follow this decision: lost time in lane becomes lost items later.`,
  );
  traces.push(trace("role-intelligence", c.roleIntelligence.role, "economyImpact"));

  const objectiveImpact = firstOf(
    chain?.objectiveImpact,
    c.rolePhilosophy.objectives[0],
    league?.expectedConsequences.later,
    `The next objective becomes harder to contest because of this decision.`,
  );
  traces.push(
    trace(chain?.objectiveImpact ? "curriculum" : "role-intelligence", c.curriculum.topic, "objectiveImpact"),
  );

  const teamfightImpact = firstOf(
    c.rolePhilosophy.positioning[0],
    topic?.typicalConsequences.find((t) => /fight|teamfight|engage/i.test(t)),
    `Later fights start on different terms because of the state this decision created.`,
  );
  traces.push(trace("role-intelligence", c.roleIntelligence.role, "teamfightImpact"));

  const recoveryOpportunity = firstOf(
    c.recoveryRecommendation.method,
    narrative?.recoveryAdvice,
    league?.recoveryAdvice,
    topic?.recoveryMethods[0],
    habit?.recoveryRecommendation,
  );
  traces.push(
    trace(
      c.recoveryRecommendation.method ? "curriculum" : narrative ? "narrative-engine" : "decision-library",
      c.curriculum.topic,
      "recoveryOpportunity",
    ),
  );

  const planReference =
    input.practicePlan &&
    (input.practicePlan.primaryFocus.decisionId === decisionId ||
      input.practicePlan.supportingFocus?.decisionId === decisionId)
      ? (input.practicePlan.successCriteria[0]?.measurable ?? input.practicePlan.primaryFocus.statement)
      : "";
  const practiceReference = firstOf(
    planReference,
    c.practiceRecommendation.measurable,
    c.practiceRecommendation.drill,
    narrative?.practiceRecommendation,
    league?.practiceRecommendation,
    topic?.practiceConcepts[0],
  );
  traces.push(
    trace(
      planReference ? "practice-planning" : c.practiceRecommendation.drill ? "curriculum" : "decision-library",
      planReference ? input.practicePlan!.practicePlanId : c.curriculum.topic,
      "practiceReference",
    ),
  );

  const whyItMattered = firstOf(
    narrative?.whyItMatters,
    topic?.whyItMatters,
    fundamental.purpose,
  );
  traces.push(
    trace(narrative ? "narrative-engine" : topic ? "curriculum" : "league-intelligence", narrative?.id ?? c.curriculum.topic, "whyItMattered"),
  );

  const repeatOrChange = isStrength
    ? firstOf(
        habit?.positiveReinforcement,
        c.positiveReinforcement.example,
        `Repeat this: it is the ${fundamental.label.toLowerCase()} habit holding your games together.`,
      )
    : firstOf(
        narrative?.primaryCoachingPoint,
        c.fundamentalExpression.expression,
        `Change this: play ${fundamental.label.toLowerCase()} the way your role expects before the next objective window.`,
      );
  traces.push(
    trace(
      isStrength ? (habit ? "habit-intelligence" : "curriculum") : narrative ? "narrative-engine" : "role-intelligence",
      habit?.id ?? narrative?.id ?? c.roleIntelligence.role,
      "repeatOrChange",
    ),
  );

  const evidence = [
    ...c.decisionPriority.evidence,
    ...(habit?.evidence ?? []),
    ...(memory ? [`Tracked in your coaching history since ${memory.firstSeen ?? "your first review"}.`] : []),
  ]
    .filter((e, i, arr) => e && arr.indexOf(e) === i)
    .slice(0, 4);
  if (habit) traces.push(trace("habit-intelligence", habit.id, "evidence"));
  if (memory) traces.push(trace("player-memory", memory.memoryId, "evidence"));
  if (c.championIntelligence?.champion) {
    traces.push(trace("champion-intelligence", c.championIntelligence.champion, "situationSummary"));
  }

  const confidence = confidenceFrom(c, habit, memory);

  const moment: ReplayMoment = {
    id: `${sequence}:${decisionId}`,
    timestamp,
    decisionId,
    leagueDecisionId: c.decision.leagueDecisionId,
    leagueFundamental: c.leagueIntelligence.fundamental,
    leagueFundamentalLabel: c.leagueIntelligence.fundamentalLabel,
    curriculumTopic: c.curriculum.topic,
    curriculumTopicLabel: c.curriculum.topicLabel,
    role: c.roleIntelligence.role,
    roleLabel: c.roleIntelligence.roleLabel,
    champion: c.championIntelligence?.champion ?? input.champion ?? null,
    kind: isStrength ? "strength" : "weakness",
    type,
    turningPoint,
    situationSummary,
    decisionMade,
    betterAlternative,
    immediateResult,
    longTermResult,
    tempoImpact,
    economyImpact,
    objectiveImpact,
    teamfightImpact,
    recoveryOpportunity,
    practiceReference,
    coachingPriority: priority,
    confidence,
    repeatOrChange,
    whyItMattered,
    evidence,
    relatedHabitIds: habit ? [habit.id] : [],
    traces,
    fullText: "",
  };
  return { ...moment, fullText: momentText(moment) };
}

function momentText(m: ReplayMoment): string {
  return [
    `${m.timestamp.label} — ${m.curriculumTopicLabel} (${m.leagueFundamentalLabel})`,
    `Situation: ${m.situationSummary}`,
    `Decision: ${m.decisionMade}`,
    `Why it mattered: ${m.whyItMattered}`,
    m.kind === "strength" ? `Keep doing: ${m.betterAlternative}` : `Better option: ${m.betterAlternative}`,
    `Right away: ${m.immediateResult}`,
    `Tempo: ${m.tempoImpact}`,
    `Economy: ${m.economyImpact}`,
    `Objectives: ${m.objectiveImpact}`,
    `Fights: ${m.teamfightImpact}`,
    `Later in the game: ${m.longTermResult}`,
    `Recovery: ${m.recoveryOpportunity}`,
    `Practice: ${m.practiceReference}`,
    m.kind === "strength" ? `Repeat: ${m.repeatOrChange}` : `Change: ${m.repeatOrChange}`,
  ]
    .filter((l) => !l.endsWith(": ") && l.trim().length > 0)
    .join("\n");
}

// ---------------------------------------------------------------------------
// buildTimeline()
// ---------------------------------------------------------------------------

let replaySequence = 0;

export function buildTimeline(input: ReplayInput): ReplayTimeline {
  if (input.contexts.length === 0) {
    return safeFallback(roleOf(input).role, input.now);
  }

  const { role, roleLabel } = roleOf(input);
  const ordered = orderedContexts(input);
  const moments = ordered.map((c, i) => buildMoment(c, i, ordered.length, input));
  const champion = championOf(input);

  const traces: ReplayTrace[] = moments.flatMap((m) => m.traces);
  const turningPoints = moments.filter((m) => m.turningPoint);
  const positiveMoments = moments.filter((m) => m.kind === "strength");
  const negatives = moments.filter((m) => m.kind === "weakness");
  const primary = negatives[0] ?? moments[0];

  const storyline = moments.map(
    (m) => `${m.timestamp.label} — ${m.situationSummary} ${m.immediateResult}`.trim(),
  );

  const headline = primary
    ? `${roleLabel}: the game turned on ${primary.curriculumTopicLabel.toLowerCase()} around ${primary.timestamp.label}.`
    : `${roleLabel}: a clean timeline — nothing decided this game against you.`;

  const gameDevelopment = [
    `Here is how the game developed for you as ${roleLabel}.`,
    ...moments
      .slice(0, 4)
      .map((m) => `At ${m.timestamp.label}, ${m.situationSummary} ${m.tempoImpact}`.trim()),
    primary ? `The decision that mattered most: ${primary.whyItMattered}` : "",
  ]
    .filter((s) => s.length > 0)
    .join(" ");

  replaySequence += 1;
  return {
    replayId: `replay-${input.matchId ?? "review"}-${replaySequence}`,
    role,
    roleLabel,
    champion,
    moments,
    criticalMoments: getCriticalMoments(moments),
    turningPoints,
    positiveMoments,
    recoveryMoments: getRecoveryMoments(moments),
    practiceMoments: getPracticeMoments(moments),
    storyline,
    headline,
    gameDevelopment,
    championIntelligenceUsed: Boolean(champion),
    traces,
    createdAt: nowIso(input.now),
  };
}

// ---------------------------------------------------------------------------
// Selectors — accept a timeline OR a raw moment list
// ---------------------------------------------------------------------------

function momentsOf(source: ReplayTimeline | ReplayMoment[]): ReplayMoment[] {
  return Array.isArray(source) ? source : source.moments;
}

export function getCriticalMoments(source: ReplayTimeline | ReplayMoment[]): ReplayMoment[] {
  return momentsOf(source)
    .filter((m) => m.coachingPriority.band === "critical" || m.coachingPriority.band === "high")
    .sort((a, b) => b.coachingPriority.score - a.coachingPriority.score);
}

export function getTurningPoints(source: ReplayTimeline | ReplayMoment[]): ReplayMoment[] {
  return momentsOf(source).filter((m) => m.turningPoint);
}

export function getPositiveMoments(source: ReplayTimeline | ReplayMoment[]): ReplayMoment[] {
  return momentsOf(source).filter(
    (m) => m.kind === "strength" || m.type === "positive-turning-point" || m.type === "good-discipline",
  );
}

export function getRecoveryMoments(source: ReplayTimeline | ReplayMoment[]): ReplayMoment[] {
  return momentsOf(source).filter(
    (m) => m.type === "recovery-opportunity" || m.recoveryOpportunity.length > 0,
  );
}

export function getPracticeMoments(source: ReplayTimeline | ReplayMoment[]): ReplayMoment[] {
  return momentsOf(source)
    .filter((m) => m.kind === "weakness" && m.practiceReference.length > 0)
    .sort((a, b) => b.coachingPriority.score - a.coachingPriority.score);
}

export function getDecisionTimeline(
  source: ReplayTimeline | ReplayMoment[],
): ReplayDecisionTimelineEntry[] {
  return momentsOf(source).map((m) => ({
    sequence: m.timestamp.sequence,
    timestampLabel: m.timestamp.label,
    phase: m.timestamp.phase,
    decisionId: m.decisionId,
    label: m.curriculumTopicLabel,
    type: m.type,
    kind: m.kind,
    priority: m.coachingPriority.score,
    line: `${m.timestamp.label} — ${m.decisionMade} → ${m.immediateResult}`,
  }));
}

export function getMoment(
  source: ReplayTimeline | ReplayMoment[],
  decisionId: string,
): ReplayMoment | null {
  return momentsOf(source).find((m) => m.decisionId === decisionId) ?? null;
}

// ---------------------------------------------------------------------------
// safeFallback() — role-level timeline when no coaching data exists yet
// ---------------------------------------------------------------------------

export function safeFallback(role: RoleId = "adc", now?: string): ReplayTimeline {
  const profile = getRoleProfile(role);
  const expression = profile.fundamentalExpression[0];
  const fundamentalId: LeagueFundamentalId = expression?.fundamental ?? "decision-making";
  const fundamental = getFundamental(fundamentalId);
  const topicId = (fundamental.curriculumTopics?.[0] ?? "decision-quality") as CurriculumTopicId;
  const topic = getCurriculumTopic(topicId);
  const seconds = 8 * 60;

  const base: ReplayMoment = {
    id: `0:${fundamentalId}`,
    timestamp: { seconds, label: mmss(seconds), phase: phaseOf(seconds), sequence: 0, estimated: true },
    decisionId: fundamentalId,
    leagueFundamental: fundamentalId,
    leagueFundamentalLabel: fundamental.label,
    curriculumTopic: topic?.id ?? topicId,
    curriculumTopicLabel: topic?.label ?? fundamental.label,
    role,
    roleLabel: profile.label,
    champion: null,
    kind: "weakness",
    type: "momentum-shift",
    turningPoint: false,
    situationSummary: firstOf(topic?.definition, fundamental.purpose),
    decisionMade: firstOf(topic?.negativeDecisions[0], `A ${fundamental.label.toLowerCase()} decision without a plan.`),
    betterAlternative: firstOf(topic?.positiveDecisions[0], expression?.philosophy, fundamental.purpose),
    immediateResult: firstOf(topic?.typicalConsequences[0], "You lose the initiative for the next 30 seconds."),
    longTermResult: firstOf(topic?.decisionChain.longTermImpact, "The lead compounds for whoever spends time better."),
    tempoImpact: firstOf(topic?.decisionChain.tempoImpact, profile.tempoPhilosophy?.[0], "Tempo follows the player who resets first."),
    economyImpact: firstOf(profile.economyPhilosophy?.[0], "Lost time in lane becomes lost items later."),
    objectiveImpact: firstOf(topic?.decisionChain.objectiveImpact, profile.objectivePhilosophy?.[0], "The next objective becomes harder to contest."),
    teamfightImpact: firstOf(profile.positioningPhilosophy?.[0], "Fights start on worse terms than they should."),
    recoveryOpportunity: firstOf(topic?.recoveryMethods[0], "Reset, catch the next side wave, and re-enter even."),
    practiceReference: firstOf(topic?.practiceConcepts[0], `Play three games focused only on ${fundamental.label.toLowerCase()}.`),
    coachingPriority: {
      score: 50,
      band: "high",
      order: 0,
      explanation: `Import a game and BotDiff will rank your ${profile.label} decisions by real impact.`,
    },
    confidence: {
      score: 20,
      level: "low",
      explanation: "No games recorded yet — this is role-level coaching, not your timeline.",
    },
    repeatOrChange: firstOf(expression?.philosophy, fundamental.purpose),
    whyItMattered: firstOf(topic?.whyItMatters, fundamental.purpose),
    evidence: [],
    relatedHabitIds: [],
    traces: [
      trace("role-intelligence", role, "situationSummary"),
      trace("league-intelligence", fundamentalId, "whyItMattered"),
      trace("curriculum", topic?.id ?? topicId, "practiceReference"),
    ],
    fullText: "",
  };
  const moment: ReplayMoment = { ...base, fullText: momentText(base) };

  return {
    replayId: `replay-fallback-${role}`,
    role,
    roleLabel: profile.label,
    champion: null,
    moments: [moment],
    criticalMoments: [moment],
    turningPoints: [],
    positiveMoments: [],
    recoveryMoments: [moment],
    practiceMoments: [moment],
    storyline: [`${moment.timestamp.label} — ${moment.situationSummary}`],
    headline: `${profile.label} timeline coaching — import a game to see your own decisions.`,
    gameDevelopment: firstOf(expression?.philosophy, fundamental.purpose),
    championIntelligenceUsed: false,
    traces: moment.traces,
    createdAt: nowIso(now),
  };
}

// ---------------------------------------------------------------------------
// Facade
// ---------------------------------------------------------------------------

export const ReplayEngine = {
  buildTimeline,
  getCriticalMoments,
  getTurningPoints,
  getPositiveMoments,
  getRecoveryMoments,
  getPracticeMoments,
  getDecisionTimeline,
  getMoment,
  safeFallback,
};

export type ReplayEngineFacade = typeof ReplayEngine;
