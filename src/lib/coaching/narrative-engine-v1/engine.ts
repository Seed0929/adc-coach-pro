// ---------------------------------------------------------------------------
// Coaching Narrative Engine V1 — the permanent explanation layer.
//
// Reads ONLY deterministic coaching data:
//   Unified Coaching Context (which itself references League Intelligence,
//   Curriculum, Role Intelligence, the League Decision Library and the
//   Decision Prioritization Engine), Habit Intelligence, Player Memory and —
//   optionally — Champion Intelligence.
//
// It never detects, scores, persists or invents. Identical inputs always
// produce byte-identical narratives, and every field records the layer it was
// read from in `traces`.
// ---------------------------------------------------------------------------
import { getDecisionPattern, getLeagueDecision } from "../knowledge-base";
import type { CurriculumTopicId, LeagueFundamentalId } from "../knowledge-base";
import type { RoleId } from "../knowledge-base/templates/champion";
import { getRoleProfile } from "../role-intelligence-v1";
import type { UnifiedCoachingContext } from "../unified-coaching-context";
import type {
  Narrative,
  NarrativeDifficultyEstimate,
  NarrativeImprovementSummary,
  NarrativeInput,
  NarrativeMatchReport,
  NarrativePracticeItem,
  NarrativePracticePlan,
  NarrativeReplaySummary,
  NarrativeSource,
  NarrativeTrace,
} from "./types";

// ---------------------------------------------------------------------------
// Small deterministic helpers
// ---------------------------------------------------------------------------

function firstOf(...values: (string | undefined | null)[]): string {
  for (const v of values) if (v && v.trim()) return v.trim();
  return "";
}

function dedupe(values: (string | undefined | null)[], limit = 6): string[] {
  const out: string[] = [];
  for (const v of values) {
    if (!v || !v.trim()) continue;
    const t = v.trim();
    if (!out.includes(t)) out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

function uniq<T>(values: (T | undefined)[]): T[] {
  const out: T[] = [];
  for (const v of values) {
    if (v === undefined) continue;
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

function difficultyLevel(score: number): NarrativeDifficultyEstimate["level"] {
  if (score >= 66) return "hard";
  if (score >= 34) return "moderate";
  return "easy";
}

// ---------------------------------------------------------------------------
// Narrative assembly
// ---------------------------------------------------------------------------

function difficultyFor(s: NarrativeSource): NarrativeDifficultyEstimate {
  const c = s.unified.source;
  const score = s.unified.decisionPriority.scores?.difficulty ?? 50;
  const level = difficultyLevel(score);
  const topic = c.curriculumTopic.label;
  const explanation =
    level === "easy"
      ? `${topic} is a low-difficulty fix — the curriculum treats it as a habit change rather than a mechanic.`
      : level === "moderate"
        ? `${topic} takes deliberate repetition: the curriculum places it mid-way on the skill progression.`
        : `${topic} is a high-difficulty area — expect several games before the pattern changes.`;
  return { score, level, explanation };
}

function confidenceExplanationFor(s: NarrativeSource): string {
  const u = s.unified;
  if (s.habit) {
    return `Coach assessment ${Math.round(s.habit.confidence)}/100 — seen in ${s.habit.frequency.occurrences} of ${s.habit.frequency.matchesObserved} recorded games (${s.habit.status}).`;
  }
  const scored = u.decisionPriority.scores?.confidence;
  if (scored !== undefined) {
    return `Coach assessment ${Math.round(scored)}/100 — derived from this game's evidence and the ${u.roleIntelligence.roleLabel} decision priorities.`;
  }
  return `Coach assessment is based on a single game of evidence for ${u.decision.label}. It sharpens as more matches are imported.`;
}

function expectedImprovementFor(s: NarrativeSource): string {
  const u = s.unified;
  const c = u.source;
  const target = firstOf(
    u.practiceRecommendation.measurable,
    c.practiceLibrary[0]?.measurable,
    c.curriculumTopic.skillProgression?.diamond,
  );
  const priority = Math.round(u.decisionPriority.priority);
  const trend = s.habit?.trend;
  const base =
    u.decision.kind === "strength"
      ? `Leaning into this harder raises the ceiling of your best games rather than the floor.`
      : `Closing this is worth ${priority}/100 of your current coaching priority.`;
  const measurable = target ? ` Target: ${target}` : "";
  const trendLine =
    trend === "improving"
      ? " You are already trending in the right direction here."
      : trend === "regressing"
        ? " This has regressed recently, so the first win is stopping the slide."
        : "";
  return `${base}${measurable}${trendLine}`.trim();
}

function rootCauseFor(s: NarrativeSource): string {
  const u = s.unified;
  const c = u.source;
  const pattern = u.curriculum.decisionPatternId
    ? getDecisionPattern(u.curriculum.decisionPatternId)
    : undefined;
  const league = u.decision.leagueDecisionId
    ? getLeagueDecision(u.decision.leagueDecisionId)
    : undefined;
  if (u.decision.kind === "strength") {
    return firstOf(
      c.curriculumTopic.whyItMatters,
      u.fundamentalExpression.expression,
      c.fundamental.purpose,
    );
  }
  return firstOf(
    pattern?.shortExplanation,
    league?.summary,
    league?.negativeExample,
    c.decisionChain.decision,
    c.commonMistakes[0],
    u.fundamentalExpression.expression,
  );
}

function whyItMattersFor(s: NarrativeSource): string {
  const c = s.unified.source;
  const pattern = s.unified.curriculum.decisionPatternId
    ? getDecisionPattern(s.unified.curriculum.decisionPatternId)
    : undefined;
  return firstOf(
    pattern?.immediateConsequence,
    c.decisionChain.immediateResult,
    c.typicalConsequences[0],
    c.curriculumTopic.whyItMatters,
    c.fundamental.definition,
  );
}

function summaryFor(s: NarrativeSource): string {
  const u = s.unified;
  const c = u.source;
  const evidence = firstOf(u.decisionPriority.evidence[0], c.issue.evidence);
  const frame = `${u.decision.label} sits under ${u.curriculum.topicLabel} (${u.leagueIntelligence.fundamentalLabel}) for ${u.roleIntelligence.roleLabel}.`;
  const memoryLine = s.memory?.coachingSummary;
  return firstOf(
    evidence ? `${frame} ${evidence}` : "",
    memoryLine ? `${frame} ${memoryLine}` : "",
    `${frame} ${c.curriculumTopic.definition}`,
  );
}

function titleFor(s: NarrativeSource): string {
  const prefix = s.unified.decision.kind === "strength" ? "Keep doing" : "Next habit";
  return `${prefix}: ${s.unified.decision.label}`;
}

function primaryPointFor(s: NarrativeSource): string {
  const u = s.unified;
  const c = u.source;
  if (u.decision.kind === "strength") {
    return firstOf(
      c.curriculumTopic.skillProgression?.diamond,
      u.positiveReinforcement.example,
      u.fundamentalExpression.expression,
    );
  }
  return firstOf(
    u.practiceRecommendation.drill,
    c.decisionChain.practiceRecommendation,
    c.curriculumTopic.skillProgression?.diamond,
    u.fundamentalExpression.expression,
  );
}

function supportingPointsFor(s: NarrativeSource, championContext: string[]): string[] {
  const u = s.unified;
  const c = u.source;
  const pattern = u.curriculum.decisionPatternId
    ? getDecisionPattern(u.curriculum.decisionPatternId)
    : undefined;
  return dedupe(
    [
      u.fundamentalExpression.expression,
      u.fundamentalExpression.example,
      pattern?.laterConsequence,
      c.decisionChain.tempoImpact,
      c.decisionChain.objectiveImpact,
      u.roleIntelligence.decisionPriorities[0],
      c.curriculumTopic.commonMisconceptions?.[0],
      ...championContext,
      ...u.practiceRecommendation.supportingDrills.slice(0, 1),
    ],
    5,
  );
}

function championContextFor(u: UnifiedCoachingContext): string[] {
  const champ = u.source.championIntelligence;
  if (!champ || !champ.isKnown) return [];
  return dedupe(
    [
      champ.identity ? `${champ.name}: ${champ.identity}` : undefined,
      champ.winCondition ? `Win condition: ${champ.winCondition}` : undefined,
      champ.powerSpikes.length ? `Power spikes: ${champ.powerSpikes.join(", ")}` : undefined,
    ],
    3,
  );
}

function tracesFor(s: NarrativeSource): NarrativeTrace[] {
  const u = s.unified;
  const t: NarrativeTrace[] = [
    { layer: "league-intelligence", ref: u.leagueIntelligence.fundamental, field: "whyItMatters" },
    { layer: "curriculum", ref: u.curriculum.topic, field: "summary" },
    { layer: "role-intelligence", ref: u.roleIntelligence.role, field: "supportingCoachingPoints" },
    { layer: "decision-priority", ref: u.decision.decisionId, field: "difficultyEstimate" },
  ];
  if (u.curriculum.decisionPatternId)
    t.push({ layer: "decision-library", ref: u.curriculum.decisionPatternId, field: "rootCause" });
  if (u.decision.leagueDecisionId)
    t.push({ layer: "decision-library", ref: u.decision.leagueDecisionId, field: "rootCause" });
  if (s.habit)
    t.push({ layer: "habit-intelligence", ref: s.habit.id, field: "confidenceExplanation" });
  if (s.memory) t.push({ layer: "player-memory", ref: s.memory.memoryId, field: "summary" });
  if (u.championIntelligence)
    t.push({
      layer: "champion-intelligence",
      ref: u.championIntelligence.champion,
      field: "supportingCoachingPoints",
    });
  return t;
}

/** Build ONE narrative from deterministic coaching data. */
export function create(source: NarrativeSource): Narrative {
  const u = source.unified;
  const c = u.source;
  const championContext = championContextFor(u);
  const kind: Narrative["kind"] = u.decision.kind === "strength" ? "strength" : "weakness";

  const narrative: Narrative = {
    id: u.decision.decisionId,
    kind,
    role: u.roleIntelligence.role,
    roleLabel: u.roleIntelligence.roleLabel,
    champion: championContext.length ? (c.championIntelligence?.name ?? null) : null,
    title: titleFor(source),
    summary: summaryFor(source),
    rootCause: rootCauseFor(source),
    whyItMatters: whyItMattersFor(source),
    positiveReinforcement: firstOf(
      u.positiveReinforcement.example,
      source.memory?.longTermStrength ? source.memory.coachingSummary : "",
      c.curriculumTopic.positiveCoachingExamples?.[0],
      u.strengthToContinue ? `Keep leaning on ${u.strengthToContinue.label}.` : "",
    ),
    primaryCoachingPoint: primaryPointFor(source),
    supportingCoachingPoints: supportingPointsFor(source, championContext),
    recoveryAdvice: firstOf(
      u.recoveryRecommendation.method,
      c.recoveryAdvice[0],
      c.curriculumTopic.recoveryMethods?.[0],
    ),
    practiceRecommendation: firstOf(
      u.practiceRecommendation.drill,
      c.practiceDrills[0],
      c.decisionChain.practiceRecommendation,
      c.practiceLibrary[0]?.measurable,
    ),
    difficultyEstimate: difficultyFor(source),
    confidenceExplanation: confidenceExplanationFor(source),
    expectedImprovement: expectedImprovementFor(source),
    relatedFundamentals: uniq<LeagueFundamentalId>([
      u.leagueIntelligence.fundamental,
      u.fundamentalExpression.fundamental,
      source.habit?.fundamental,
      source.memory?.fundamental,
    ]),
    relatedDecisions: uniq<string>([
      u.decision.decisionId,
      u.decision.leagueDecisionId,
      u.curriculum.decisionPatternId,
    ]),
    relatedHabits: uniq<string>([source.habit?.id, source.memory?.habitRef]),
    relatedCurriculumTopics: uniq<CurriculumTopicId>([
      u.curriculum.topic,
      ...u.curriculum.supportingTopics,
    ]),
    traces: tracesFor(source),
    fullText: "",
  };

  narrative.fullText = [
    narrative.title,
    narrative.summary,
    narrative.rootCause ? `Root cause: ${narrative.rootCause}` : "",
    narrative.whyItMatters ? `Why it matters: ${narrative.whyItMatters}` : "",
    narrative.positiveReinforcement ? `Keep doing: ${narrative.positiveReinforcement}` : "",
    narrative.primaryCoachingPoint ? `Coaching point: ${narrative.primaryCoachingPoint}` : "",
    ...narrative.supportingCoachingPoints.map((p) => `• ${p}`),
    narrative.recoveryAdvice ? `In-game recovery: ${narrative.recoveryAdvice}` : "",
    narrative.practiceRecommendation ? `Practice: ${narrative.practiceRecommendation}` : "",
    `Difficulty: ${narrative.difficultyEstimate.level} — ${narrative.difficultyEstimate.explanation}`,
    narrative.confidenceExplanation,
    narrative.expectedImprovement,
  ]
    .filter(Boolean)
    .join("\n\n");

  return narrative;
}

// ---------------------------------------------------------------------------
// Input resolution
// ---------------------------------------------------------------------------

function sourcesFor(input: NarrativeInput): NarrativeSource[] {
  return input.contexts.map((unified) => ({
    unified,
    habit: input.habits?.find((h) => h.decisionId === unified.decision.decisionId),
    memory: input.memories?.find((m) => m.decisionId === unified.decision.decisionId),
  }));
}

function narrativesFor(input: NarrativeInput): Narrative[] {
  return sourcesFor(input).map((s) => create(s));
}

function roleOf(input: NarrativeInput): { role: RoleId; roleLabel: string } {
  const first = input.contexts[0];
  if (input.priorities)
    return { role: input.priorities.role, roleLabel: input.priorities.roleLabel };
  if (first)
    return { role: first.roleIntelligence.role, roleLabel: first.roleIntelligence.roleLabel };
  return { role: "adc", roleLabel: getRoleProfile("adc").label };
}

function byRank(list: Narrative[], input: NarrativeInput, rank: string): Narrative | null {
  const ctx = input.contexts.find((c) => c.coachingPriority.rank === rank);
  if (!ctx) return null;
  return list.find((n) => n.id === ctx.decision.decisionId) ?? null;
}

// ---------------------------------------------------------------------------
// Surface APIs — explanation only, no existing surface is modified
// ---------------------------------------------------------------------------

export function matchReport(input: NarrativeInput): NarrativeMatchReport {
  const { role, roleLabel } = roleOf(input);
  const all = narrativesFor(input);
  const weaknesses = all.filter((n) => n.kind === "weakness");
  const strengths = all.filter((n) => n.kind === "strength");
  const primary = byRank(all, input, "primary") ?? weaknesses[0] ?? null;
  const secondary =
    byRank(all, input, "secondary") ?? weaknesses.find((n) => n !== primary) ?? null;
  const recovery =
    byRank(all, input, "recovery") ??
    weaknesses.filter((n) => n !== primary && n !== secondary)[0] ??
    null;
  const coachingWin = byRank(all, input, "reinforce") ?? strengths[0] ?? null;

  return {
    role,
    roleLabel,
    coachingWin,
    primary,
    secondary,
    recovery,
    all,
    headline: firstOf(
      coachingWin ? `Today's coaching win: ${coachingWin.positiveReinforcement || coachingWin.title}` : "",
      primary ? `First habit to work on: ${primary.title}` : "",
      `No coachable decisions recorded for ${roleLabel} yet.`,
    ),
    championIntelligenceUsed: all.some((n) => n.champion !== null),
  };
}

export function practicePlan(input: NarrativeInput): NarrativePracticePlan {
  const { role, roleLabel } = roleOf(input);
  const items: NarrativePracticeItem[] = sourcesFor(input)
    .filter((s) => s.unified.decision.kind !== "strength")
    .map((s) => {
      const narrative = create(s);
      return {
        decisionId: narrative.id,
        topic: s.unified.practiceRecommendation.topic,
        fundamental: s.unified.leagueIntelligence.fundamental,
        recommendation: narrative.practiceRecommendation,
        measurable: s.unified.practiceRecommendation.measurable,
        difficulty: narrative.difficultyEstimate,
        expectedImprovement: narrative.expectedImprovement,
        narrative,
      };
    });
  const focus = items[0]?.narrative ?? null;
  return {
    role,
    roleLabel,
    focus,
    items,
    headline: focus
      ? `Practice focus: ${focus.practiceRecommendation}`
      : `Nothing to drill — maintain your current ${roleLabel} habits.`,
  };
}

export function replaySummary(input: NarrativeInput): NarrativeReplaySummary {
  const { role, roleLabel } = roleOf(input);
  const all = narrativesFor(input);
  return {
    role,
    roleLabel,
    moments: all.map((n) => ({
      decisionId: n.id,
      label: n.title,
      line: firstOf(n.summary, n.rootCause, n.whyItMatters),
    })),
    narrative: all[0] ?? null,
    headline: all[0]
      ? `${all.length} coachable decisions across this replay, led by ${all[0].title}.`
      : `No coachable decisions detected in this replay.`,
  };
}

export function decisionExplanation(input: NarrativeInput, decisionId: string): Narrative | null {
  const source = sourcesFor(input).find((s) => s.unified.decision.decisionId === decisionId);
  return source ? create(source) : null;
}

export function strengthExplanation(input: NarrativeInput): Narrative | null {
  const sources = sourcesFor(input);
  const strength =
    sources.find((s) => s.unified.coachingPriority.rank === "reinforce") ??
    sources.find((s) => s.unified.decision.kind === "strength") ??
    sources.find((s) => s.memory?.longTermStrength);
  return strength ? create(strength) : null;
}

export function weaknessExplanation(input: NarrativeInput): Narrative | null {
  const sources = sourcesFor(input);
  const weakness =
    sources.find((s) => s.unified.coachingPriority.rank === "primary") ??
    sources.find((s) => s.unified.decision.kind !== "strength");
  return weakness ? create(weakness) : null;
}

export function improvementSummary(input: NarrativeInput): NarrativeImprovementSummary {
  const sources = sourcesFor(input);
  const improving = sources
    .filter(
      (s) =>
        s.habit?.trend === "improving" ||
        (s.memory?.improvementHistory.length ?? 0) > (s.memory?.regressionHistory.length ?? 0),
    )
    .map((s) => create(s));
  const regressing = sources
    .filter((s) => s.habit?.trend === "regressing" || s.memory?.regressionHistory.length)
    .map((s) => create(s));
  const strengths = sources
    .filter((s) => s.unified.decision.kind === "strength" || s.memory?.longTermStrength)
    .map((s) => create(s));

  return {
    improving,
    regressing,
    strengths,
    headline: improving.length
      ? `${improving.length} habit${improving.length === 1 ? "" : "s"} moving in the right direction${regressing.length ? `, ${regressing.length} slipping` : ""}.`
      : regressing.length
        ? `${regressing.length} habit${regressing.length === 1 ? "" : "s"} slipping — that is where the next session starts.`
        : `Not enough recorded games yet to call a trend.`,
    memoryHeadline: input.memorySummary?.headline ?? null,
  };
}

/**
 * Guaranteed-safe narrative built from Role Intelligence alone. Used whenever
 * no coaching context exists yet — Champion Intelligence is never required.
 */
export function safeFallback(role: RoleId = "adc"): Narrative {
  const p = getRoleProfile(role);
  const expression = p.fundamentalExpression[0];
  const practice = p.practiceLibrary[0];
  const priority = p.decisionPriorities[0];

  const narrative: Narrative = {
    id: `role-fallback:${p.id}`,
    kind: "weakness",
    role: p.id,
    roleLabel: p.label,
    champion: null,
    title: `${p.label} fundamentals`,
    summary: `No coachable decisions have been recorded yet, so coaching starts from the ${p.label} role profile.`,
    rootCause: firstOf(priority?.decision, p.primaryResponsibilities[0]),
    whyItMatters: firstOf(p.primaryWinConditions[0], expression?.philosophy),
    positiveReinforcement: firstOf(
      p.habitLibrary.find((h) => h.kind === "strength")?.label,
      p.primaryResponsibilities[0],
    ),
    primaryCoachingPoint: firstOf(practice?.label, expression?.philosophy),
    supportingCoachingPoints: dedupe(
      [
        expression?.philosophy,
        expression?.example,
        p.tempoPhilosophy[0],
        p.positioningPhilosophy[0],
        p.economyPhilosophy[0],
      ],
      4,
    ),
    recoveryAdvice: firstOf(p.recoveryPriorities[0], p.consistencyPriorities[0]),
    practiceRecommendation: firstOf(practice?.measurable, p.practicePriorities[0]),
    difficultyEstimate: {
      score: 50,
      level: "moderate",
      explanation: `Role-level coaching only: without recorded games every ${p.label} fundamental is graded average difficulty.`,
    },
    confidenceExplanation: `Coach assessment is role-level only — import matches and this becomes evidence-backed.`,
    expectedImprovement: firstOf(
      practice?.measurable
        ? `Hitting "${practice.measurable}" is the first measurable ${p.label} milestone.`
        : "",
      p.primaryWinConditions[0],
    ),
    relatedFundamentals: uniq<LeagueFundamentalId>([
      expression?.fundamental,
      practice?.fundamental,
      priority?.fundamental,
    ]),
    relatedDecisions: [],
    relatedHabits: [],
    relatedCurriculumTopics: [],
    traces: [{ layer: "role-intelligence", ref: p.id, field: "all" }],
    fullText: "",
  };

  narrative.fullText = [
    narrative.title,
    narrative.summary,
    narrative.whyItMatters,
    narrative.primaryCoachingPoint,
    narrative.practiceRecommendation,
    narrative.confidenceExplanation,
  ]
    .filter(Boolean)
    .join("\n\n");

  return narrative;
}

/**
 * Namespaced facade — Match Reports, Replay Coach, Practice Planner, Weekly
 * Reports and the future AI Coach all read explanations through this object so
 * every surface tells the player the exact same story.
 */
export const NarrativeEngine = {
  create,
  matchReport,
  practicePlan,
  replaySummary,
  decisionExplanation,
  strengthExplanation,
  weaknessExplanation,
  improvementSummary,
  safeFallback,
} as const;

export type NarrativeEngineFacade = typeof NarrativeEngine;