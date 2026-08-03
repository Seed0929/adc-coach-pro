// ---------------------------------------------------------------------------
// Practice Planning Engine V1 — the coaching action layer (Sprint 4.2).
//
// Turns deterministic coaching data into ONE measurable improvement plan:
//   ONE primary improvement · ONE supporting concept
//   ONE measurable challenge · ONE success condition
//
// Nothing here is random: every focus resolves
//   Decision ID → League Fundamental → Player Habit → Coaching Priority
// and every field records a trace back to the layer it came from.
//
// Champion Intelligence stays OPTIONAL — with no champion record the planner
// runs entirely on League Intelligence + Role Intelligence + Curriculum +
// Decision Library + Habit Intelligence + Player Memory.
//
// PURE + client-safe. In-memory only; persistence lands in a later sprint.
// ---------------------------------------------------------------------------
import {
  getCurriculumTopic,
  getFundamental,
  type CurriculumTopicId,
  type LeagueFundamentalId,
} from "../knowledge-base";
import type { RoleId } from "../knowledge-base/templates/champion";
import { getRoleProfile, rolePracticeLibrary } from "../role-intelligence-v1";
import type { UnifiedCoachingContext } from "../unified-coaching-context";
import type { Habit } from "../habit-intelligence";
import type { PlayerMemoryRecord } from "../player-memory-ledger";
import type { Narrative } from "../narrative-engine-v1";
import type {
  PracticeChecklistItem,
  PracticeDifficulty,
  PracticeDifficultyLevel,
  PracticeFocus,
  PracticeLayer,
  PracticeNextFocus,
  PracticePlan,
  PracticePlanInput,
  PracticePlanUpdate,
  PracticeProgress,
  PracticeSuccessCriterion,
  PracticeTrace,
} from "./types";

// ---------------------------------------------------------------------------
// Measurable fallbacks — one per League Fundamental, never vague.
// Used ONLY when neither the curriculum practice library nor Role
// Intelligence supplied a measurable target for the fundamental.
// ---------------------------------------------------------------------------
const MEASURABLE_BY_FUNDAMENTAL: Record<LeagueFundamentalId, string> = {
  "wave-management": "Crash the wave before your first recall in 3 of 3 games",
  tempo: "Recall within 10 seconds of crashing the wave, every lane phase",
  economy: "Miss fewer than 10 minions by 10 minutes",
  vision: "Place a control ward every back and finish above 25 vision score",
  "objective-control": "Arrive before the first dragon spawns in 3 of 3 games",
  positioning: "Take fewer than 2 avoidable deaths before 15 minutes",
  trading: "Only start a trade with your key ability available",
  "map-movement": "Catch one extra side wave before every grouped fight",
  "resource-management": "Enter every objective fight with your summoner up",
  "power-spikes": "Buy your first completed item before the 15-minute mark",
  "champion-identity": "Play every fight inside your champion's damage range",
  "win-conditions": "Name your win condition out loud before 10 minutes",
  "decision-making": "Skip every coinflip fight where you have no numbers advantage",
  consistency: "Repeat the same opening 10 minutes in 3 consecutive games",
};

function difficultyLevel(score: number): PracticeDifficultyLevel {
  if (score >= 66) return "easy";
  if (score >= 33) return "moderate";
  return "hard";
}

function nowIso(input?: string): string {
  return input ?? new Date().toISOString();
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function trace(layer: PracticeLayer, ref: string, field: string): PracticeTrace {
  return { layer, ref, field };
}

function firstOf(...values: (string | undefined | null)[]): string {
  for (const v of values) if (v && v.trim().length > 0) return v.trim();
  return "";
}

// ---------------------------------------------------------------------------
// Lookups across the optional layers, always matched by decision id
// ---------------------------------------------------------------------------

function habitFor(input: PracticePlanInput, decisionId: string): Habit | undefined {
  return input.habits?.find((h) => h.decisionId === decisionId);
}

function memoryFor(input: PracticePlanInput, decisionId: string): PlayerMemoryRecord | undefined {
  return input.memories?.find((m) => m.decisionId === decisionId);
}

function narrativeFor(input: PracticePlanInput, decisionId: string): Narrative | undefined {
  return input.narratives?.find((n) => n.id === decisionId);
}

function roleOf(input: PracticePlanInput): { role: RoleId; roleLabel: string } {
  const role = input.priorities?.role ?? input.contexts[0]?.roleIntelligence.role ?? "adc";
  const roleLabel =
    input.priorities?.roleLabel ??
    input.contexts[0]?.roleIntelligence.roleLabel ??
    getRoleProfile(role).label;
  return { role, roleLabel };
}

/** Coachable contexts, ordered by the Decision Prioritization Engine. */
function coachableContexts(input: PracticePlanInput): UnifiedCoachingContext[] {
  return [...input.contexts]
    .filter((c) => c.decision.kind !== "strength")
    .sort((a, b) => {
      const pa = a.decisionPriority.priority;
      const pb = b.decisionPriority.priority;
      if (pb !== pa) return pb - pa;
      return a.coachingPriority.order - b.coachingPriority.order;
    });
}

function strengthContext(input: PracticePlanInput): UnifiedCoachingContext | undefined {
  return input.contexts.find((c) => c.decision.kind === "strength");
}

// ---------------------------------------------------------------------------
// Focus resolution — Decision ID → Fundamental → Habit → Coaching Priority
// ---------------------------------------------------------------------------

function measurableFor(u: UnifiedCoachingContext, role: RoleId): string {
  const fundamental = u.leagueIntelligence.fundamental;
  const fromRole = rolePracticeLibrary(role).find((p) => p.fundamental === fundamental)?.measurable;
  return firstOf(
    u.practiceRecommendation.measurable,
    fromRole,
    MEASURABLE_BY_FUNDAMENTAL[fundamental],
  );
}

function focusFrom(
  u: UnifiedCoachingContext,
  input: PracticePlanInput,
  field: string,
  traces: PracticeTrace[],
): PracticeFocus {
  const fundamental = getFundamental(u.leagueIntelligence.fundamental);
  const topic = getCurriculumTopic(u.curriculum.topic);
  const habit = habitFor(input, u.decision.decisionId);
  const narrative = narrativeFor(input, u.decision.decisionId);
  const champion = u.championIntelligence?.champion ?? input.champion;

  traces.push(trace("decision-library", u.decision.leagueDecisionId ?? u.decision.decisionId, field));
  traces.push(trace("league-intelligence", fundamental.id, field));
  traces.push(trace("curriculum", u.curriculum.topic, field));
  traces.push(trace("role-intelligence", u.roleIntelligence.role, field));
  if (habit) traces.push(trace("habit-intelligence", habit.id, field));
  if (narrative) traces.push(trace("narrative-engine", narrative.id, field));
  if (champion) traces.push(trace("champion-intelligence", champion, field));

  return {
    decisionId: u.decision.decisionId,
    label: u.decision.label,
    fundamental: fundamental.id,
    fundamentalLabel: fundamental.label,
    curriculumTopic: u.curriculum.topic,
    curriculumTopicLabel: topic?.label ?? u.curriculum.topicLabel,
    statement: firstOf(
      narrative?.practiceRecommendation,
      u.practiceRecommendation.drill,
      topic?.decisionChain.practiceRecommendation,
      `Work on ${u.decision.label.toLowerCase()}.`,
    ),
    ...(champion ? { champion } : {}),
  };
}

function criterionFrom(
  u: UnifiedCoachingContext,
  role: RoleId,
  statement: string,
): PracticeSuccessCriterion {
  return {
    statement,
    measurable: measurableFor(u, role),
    fundamental: u.leagueIntelligence.fundamental,
    curriculumTopic: u.curriculum.topic,
    decisionId: u.decision.decisionId,
  };
}

function difficultyFrom(
  u: UnifiedCoachingContext,
  input: PracticePlanInput,
  traces: PracticeTrace[],
): PracticeDifficulty {
  const narrative = narrativeFor(input, u.decision.decisionId);
  if (narrative) {
    traces.push(trace("narrative-engine", narrative.id, "difficulty"));
    return {
      score: narrative.difficultyEstimate.score,
      level: narrative.difficultyEstimate.level,
      explanation: narrative.difficultyEstimate.explanation,
    };
  }
  const score = u.decisionPriority.scores?.difficulty;
  if (typeof score === "number") {
    traces.push(trace("decision-priority", u.decision.decisionId, "difficulty"));
    const level = difficultyLevel(score);
    return {
      score: clamp(score),
      level,
      explanation:
        level === "easy"
          ? "This is a cheap win — a small habit change fixes it."
          : level === "moderate"
            ? "This takes a few focused games before it becomes automatic."
            : "This is a hard habit to change — expect several deliberate sessions.",
    };
  }
  traces.push(trace("curriculum", u.curriculum.topic, "difficulty"));
  return {
    score: 50,
    level: "moderate",
    explanation: "Treated as a moderate habit change until more games are recorded.",
  };
}

function estimatedSessionsFrom(difficulty: PracticeDifficulty, habit?: Habit): number {
  const base = difficulty.level === "easy" ? 2 : difficulty.level === "moderate" ? 3 : 5;
  if (!habit) return base;
  // A deeply consistent habit needs more repetitions to overwrite.
  const extra = habit.consistency >= 70 ? 2 : habit.consistency >= 40 ? 1 : 0;
  return base + extra;
}

function emptyProgress(sessionsTarget: number, checklistTotal: number): PracticeProgress {
  return {
    sessionsCompleted: 0,
    sessionsTarget,
    percent: 0,
    checklistCompleted: 0,
    checklistTotal,
    successCriteriaMet: false,
    lastUpdated: null,
    notes: [],
  };
}

function checklistFrom(
  primary: UnifiedCoachingContext,
  supporting: UnifiedCoachingContext | undefined,
  input: PracticePlanInput,
  role: RoleId,
  traces: PracticeTrace[],
): PracticeChecklistItem[] {
  const items: PracticeChecklistItem[] = [];
  const topic = getCurriculumTopic(primary.curriculum.topic);
  const habit = habitFor(input, primary.decision.decisionId);

  const push = (
    label: string,
    layer: PracticeLayer,
    ref: string,
    measurable?: string,
  ): void => {
    if (!label || items.some((i) => i.label === label)) return;
    items.push({
      id: `${primary.decision.decisionId}:step-${items.length + 1}`,
      label,
      ...(measurable ? { measurable } : {}),
      layer,
      ref,
      done: false,
    });
    traces.push(trace(layer, ref, "practiceChecklist"));
  };

  push(
    primary.practiceRecommendation.drill,
    "curriculum",
    primary.curriculum.topic,
    measurableFor(primary, role),
  );
  if (topic) {
    push(topic.practiceConcepts[0] ?? "", "curriculum", topic.id);
    push(topic.skillProgression.gold, "curriculum", topic.id);
  }
  if (habit?.practiceRecommendationRef?.drill) {
    push(
      habit.practiceRecommendationRef.drill,
      "habit-intelligence",
      habit.id,
      habit.practiceRecommendationRef.measurable,
    );
  }
  if (supporting) {
    push(
      supporting.practiceRecommendation.drill,
      "curriculum",
      supporting.curriculum.topic,
      measurableFor(supporting, role),
    );
  }
  push(primary.recoveryRecommendation.method, "curriculum", primary.curriculum.topic);
  return items.slice(0, 5);
}

function fullTextFor(plan: Omit<PracticePlan, "fullText">): string {
  const lines = [
    `Primary focus — ${plan.primaryFocus.curriculumTopicLabel}: ${plan.primaryFocus.statement}`,
    plan.supportingFocus
      ? `Supporting concept — ${plan.supportingFocus.curriculumTopicLabel}: ${plan.supportingFocus.statement}`
      : "",
    `Why this matters: ${plan.whyThisMatters}`,
    `Measurable challenge: ${plan.successCriteria[0]?.measurable ?? ""}`,
    `Success condition: ${plan.successCriteria[0]?.statement ?? ""}`,
    `Expected outcome: ${plan.expectedOutcome}`,
    `Keep doing: ${plan.positiveReinforcement}`,
    `If it goes wrong: ${plan.recoveryStrategy}`,
    `Reinforcement: ${plan.reinforcementStrategy}`,
    `Difficulty: ${plan.difficulty.level} — ${plan.difficulty.explanation}`,
    `Estimated sessions: ${plan.estimatedSessions}`,
  ].filter((l) => l.length > 0);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// create() — the one plan builder
// ---------------------------------------------------------------------------

let planSequence = 0;

export function create(input: PracticePlanInput): PracticePlan {
  const coachable = coachableContexts(input);
  if (coachable.length === 0) {
    return safeFallback(roleOf(input).role, input.now);
  }

  const { role, roleLabel } = roleOf(input);
  const primary = coachable[0];
  // ONE supporting concept — prefer a DIFFERENT fundamental so the plan
  // never asks the player to fix the same thing twice.
  const supporting =
    coachable
      .slice(1)
      .find((c) => c.leagueIntelligence.fundamental !== primary.leagueIntelligence.fundamental) ??
    coachable[1];

  const traces: PracticeTrace[] = [];
  const primaryFocus = focusFrom(primary, input, "primaryFocus", traces);
  const supportingFocus = supporting
    ? focusFrom(supporting, input, "supportingFocus", traces)
    : null;

  const habit = habitFor(input, primary.decision.decisionId);
  const memory = memoryFor(input, primary.decision.decisionId);
  const narrative = narrativeFor(input, primary.decision.decisionId);
  const topic = getCurriculumTopic(primary.curriculum.topic);
  const fundamental = getFundamental(primary.leagueIntelligence.fundamental);
  const strength = strengthContext(input);

  const difficulty = difficultyFrom(primary, input, traces);
  const estimatedSessions = estimatedSessionsFrom(difficulty, habit);

  const whyThisMatters = firstOf(
    narrative?.whyItMatters,
    topic?.whyItMatters,
    fundamental.purpose,
  );
  traces.push(
    trace(
      narrative ? "narrative-engine" : topic ? "curriculum" : "league-intelligence",
      narrative?.id ?? topic?.id ?? fundamental.id,
      "whyThisMatters",
    ),
  );

  const expectedOutcome = firstOf(
    narrative?.expectedImprovement,
    topic?.decisionChain.longTermImpact,
    `Cleaner ${fundamental.label.toLowerCase()} decisions that hold up across games.`,
  );
  traces.push(
    trace(
      narrative ? "narrative-engine" : "curriculum",
      narrative?.id ?? primary.curriculum.topic,
      "expectedOutcome",
    ),
  );

  // ONE measurable challenge / ONE success condition first, supporting after.
  const successCriteria: PracticeSuccessCriterion[] = [
    criterionFrom(primary, role, primaryFocus.statement),
  ];
  if (supporting && supportingFocus) {
    successCriteria.push(criterionFrom(supporting, role, supportingFocus.statement));
  }
  successCriteria.forEach((c) =>
    traces.push(trace("curriculum", c.curriculumTopic, "successCriteria")),
  );

  const reinforcementStrategy = firstOf(
    memory
      ? `You've seen this ${memory.reinforcementCount} time(s) — repeat the plan until it stops appearing in your reviews.`
      : "",
    habit
      ? `This habit shows up in ${habit.frequency.occurrences} of your last ${habit.frequency.matchesObserved} recorded games — repeat the challenge until the streak breaks.`
      : "",
    `Run the same challenge for ${estimatedSessions} games before changing focus.`,
  );
  traces.push(
    trace(
      memory ? "player-memory" : habit ? "habit-intelligence" : "curriculum",
      memory?.memoryId ?? habit?.id ?? primary.curriculum.topic,
      "reinforcementStrategy",
    ),
  );

  const recoveryStrategy = firstOf(
    narrative?.recoveryAdvice,
    primary.recoveryRecommendation.method,
    topic?.recoveryMethods[0],
    "Reset to safety, give up the wave, and rejoin on your next power spike.",
  );
  traces.push(
    trace(
      narrative ? "narrative-engine" : "curriculum",
      narrative?.id ?? primary.curriculum.topic,
      "recoveryStrategy",
    ),
  );

  const positiveReinforcement = firstOf(
    narrative?.positiveReinforcement,
    strength ? strength.positiveReinforcement.example : "",
    primary.positiveReinforcement.example,
    topic?.positiveCoachingExamples[0],
    "Keep repeating the decisions from your best recent game.",
  );
  traces.push(
    trace(
      narrative ? "narrative-engine" : strength ? "decision-library" : "curriculum",
      narrative?.id ?? strength?.decision.decisionId ?? primary.curriculum.topic,
      "positiveReinforcement",
    ),
  );

  const practiceChecklist = checklistFrom(primary, supporting, input, role, traces);

  const decisionIds = [primaryFocus.decisionId, supportingFocus?.decisionId].filter(
    (v): v is string => Boolean(v),
  );
  const leagueFundamentals = Array.from(
    new Set<LeagueFundamentalId>(
      [primaryFocus.fundamental, supportingFocus?.fundamental].filter(
        (v): v is LeagueFundamentalId => Boolean(v),
      ),
    ),
  );
  const curriculumTopics = Array.from(
    new Set<CurriculumTopicId>(
      [
        primaryFocus.curriculumTopic,
        supportingFocus?.curriculumTopic,
        ...primary.curriculum.supportingTopics,
      ].filter((v): v is CurriculumTopicId => Boolean(v)),
    ),
  );

  const createdAt = nowIso(input.now);
  planSequence += 1;
  const base: Omit<PracticePlan, "fullText"> = {
    practicePlanId: `plan:${role}:${primaryFocus.decisionId}:${planSequence}`,
    role,
    roleLabel,
    champion: primaryFocus.champion ?? null,
    primaryFocus,
    supportingFocus,
    decisionIds,
    leagueFundamentals,
    curriculumTopics,
    whyThisMatters,
    expectedOutcome,
    successCriteria,
    difficulty,
    estimatedSessions,
    progress: emptyProgress(estimatedSessions, practiceChecklist.length),
    reinforcementStrategy,
    recoveryStrategy,
    positiveReinforcement,
    practiceChecklist,
    completionStatus: "not-started",
    traces,
    createdAt,
    updatedAt: createdAt,
  };
  return { ...base, fullText: fullTextFor(base) };
}

// ---------------------------------------------------------------------------
// safeFallback() — a real, measurable plan from Role Intelligence alone
// ---------------------------------------------------------------------------

export function safeFallback(role: RoleId = "adc", now?: string): PracticePlan {
  const profile = getRoleProfile(role);
  const item = profile.practiceLibrary[0];
  const fundamentalId: LeagueFundamentalId = item?.fundamental ?? "consistency";
  const fundamental = getFundamental(fundamentalId);
  const topic = getCurriculumTopic(fundamentalId);
  const measurable = firstOf(item?.measurable, MEASURABLE_BY_FUNDAMENTAL[fundamentalId]);
  const statement = firstOf(
    item?.label,
    topic?.decisionChain.practiceRecommendation,
    `Practice ${fundamental.label.toLowerCase()} fundamentals.`,
  );

  const focus: PracticeFocus = {
    decisionId: `role-fallback:${role}:${fundamentalId}`,
    label: statement,
    fundamental: fundamentalId,
    fundamentalLabel: fundamental.label,
    curriculumTopic: topic?.id ?? fundamentalId,
    curriculumTopicLabel: topic?.label ?? fundamental.label,
    statement,
  };

  const traces: PracticeTrace[] = [
    trace("role-intelligence", role, "primaryFocus"),
    trace("league-intelligence", fundamentalId, "whyThisMatters"),
    trace("curriculum", focus.curriculumTopic, "successCriteria"),
  ];

  const checklist: PracticeChecklistItem[] = [
    {
      id: `${focus.decisionId}:step-1`,
      label: statement,
      measurable,
      layer: "role-intelligence",
      ref: role,
      done: false,
    },
    ...(profile.practicePriorities.slice(0, 2).map((label, i) => ({
      id: `${focus.decisionId}:step-${i + 2}`,
      label,
      layer: "role-intelligence" as PracticeLayer,
      ref: role,
      done: false,
    })) ?? []),
  ];

  const createdAt = nowIso(now);
  const base: Omit<PracticePlan, "fullText"> = {
    practicePlanId: `plan:${role}:fallback`,
    role,
    roleLabel: profile.label,
    champion: null,
    primaryFocus: focus,
    supportingFocus: null,
    decisionIds: [focus.decisionId],
    leagueFundamentals: [fundamentalId],
    curriculumTopics: [focus.curriculumTopic],
    whyThisMatters: firstOf(topic?.whyItMatters, fundamental.purpose),
    expectedOutcome: firstOf(
      topic?.decisionChain.longTermImpact,
      `A more repeatable ${profile.label} baseline in every game.`,
    ),
    successCriteria: [
      {
        statement,
        measurable,
        fundamental: fundamentalId,
        curriculumTopic: focus.curriculumTopic,
        decisionId: focus.decisionId,
      },
    ],
    difficulty: {
      score: 55,
      level: "moderate",
      explanation: "A baseline role habit — reachable within a few focused games.",
    },
    estimatedSessions: 3,
    progress: emptyProgress(3, checklist.length),
    reinforcementStrategy: "Repeat the same challenge for 3 games before changing focus.",
    recoveryStrategy: firstOf(
      topic?.recoveryMethods[0],
      profile.recoveryPriorities[0],
      "Reset, play safe, and rejoin on your next power spike.",
    ),
    positiveReinforcement: firstOf(
      topic?.positiveCoachingExamples[0],
      profile.primaryResponsibilities[0],
    ),
    practiceChecklist: checklist,
    completionStatus: "not-started",
    traces,
    createdAt,
    updatedAt: createdAt,
  };
  return { ...base, fullText: fullTextFor(base) };
}

// ---------------------------------------------------------------------------
// Pure helpers exposed on the facade
// ---------------------------------------------------------------------------

export function practiceChecklist(plan: PracticePlan): PracticeChecklistItem[] {
  return plan.practiceChecklist;
}

export function successCriteria(plan: PracticePlan): PracticeSuccessCriterion[] {
  return plan.successCriteria;
}

/** What to work on AFTER the given plan — never the same primary focus. */
export function nextFocus(input: PracticePlanInput, current?: PracticePlan): PracticeNextFocus {
  const done = new Set<string>(current?.decisionIds ?? []);
  const traces: PracticeTrace[] = [];
  const next = coachableContexts(input).find((c) => !done.has(c.decision.decisionId));
  if (!next) {
    return {
      focus: null,
      reason: current
        ? "Nothing else is queued — keep reinforcing your current plan until new games are recorded."
        : "No coachable decisions recorded yet.",
      traces,
    };
  }
  const focus = focusFrom(next, input, "nextFocus", traces);
  const habit = habitFor(input, next.decision.decisionId);
  return {
    focus,
    reason: firstOf(
      next.decisionPriority.reason,
      habit ? habit.coachingNotes[0] : "",
      `Next highest coaching priority for ${focus.fundamentalLabel}.`,
    ),
    traces,
  };
}

function recomputeProgress(plan: PracticePlan): PracticeProgress {
  const checklistTotal = plan.practiceChecklist.length;
  const checklistCompleted = plan.practiceChecklist.filter((i) => i.done).length;
  const sessionPercent =
    plan.progress.sessionsTarget > 0
      ? (plan.progress.sessionsCompleted / plan.progress.sessionsTarget) * 100
      : 0;
  const checklistPercent = checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0;
  const percent =
    plan.completionStatus === "completed"
      ? 100
      : Math.round(clamp((sessionPercent + checklistPercent) / 2));
  return { ...plan.progress, checklistTotal, checklistCompleted, percent };
}

// ---------------------------------------------------------------------------
// Planner instance — in-memory current plan + history
// ---------------------------------------------------------------------------

export interface PracticePlannerInstance {
  /** Build + set the current plan from deterministic coaching data. */
  create(input: PracticePlanInput): PracticePlan;
  /** The active plan, or null when nothing has been created yet. */
  getCurrent(): PracticePlan | null;
  /** Completed / replaced plans, oldest first. */
  getHistory(): PracticePlan[];
  /** Mark a plan completed and move it into history. */
  complete(planId?: string, options?: { now?: string; note?: string }): PracticePlan | null;
  /** Update progress / status on the current or a historical plan. */
  update(planId: string, update: PracticePlanUpdate): PracticePlan | null;
  /** What to focus on next, excluding the current plan's decisions. */
  nextFocus(input: PracticePlanInput): PracticeNextFocus;
  practiceChecklist(planId?: string): PracticeChecklistItem[];
  successCriteria(planId?: string): PracticeSuccessCriterion[];
  safeFallback(role?: RoleId): PracticePlan;
  reset(): void;
}

export function createPracticePlanner(): PracticePlannerInstance {
  let current: PracticePlan | null = null;
  const history: PracticePlan[] = [];

  const find = (planId?: string): PracticePlan | null => {
    if (!planId) return current;
    if (current?.practicePlanId === planId) return current;
    return history.find((p) => p.practicePlanId === planId) ?? null;
  };

  const store = (plan: PracticePlan): void => {
    if (current?.practicePlanId === plan.practicePlanId) {
      current = plan;
      return;
    }
    const idx = history.findIndex((p) => p.practicePlanId === plan.practicePlanId);
    if (idx >= 0) history[idx] = plan;
  };

  return {
    create(input) {
      const plan = create(input);
      if (current && current.practicePlanId !== plan.practicePlanId) {
        history.push(current);
      }
      current = plan;
      return plan;
    },
    getCurrent() {
      return current;
    },
    getHistory() {
      return [...history];
    },
    complete(planId, options = {}) {
      const plan = find(planId);
      if (!plan) return null;
      const now = nowIso(options.now);
      const completed: PracticePlan = {
        ...plan,
        completionStatus: "completed",
        practiceChecklist: plan.practiceChecklist.map((i) => ({ ...i, done: true })),
        progress: {
          ...plan.progress,
          sessionsCompleted: Math.max(plan.progress.sessionsCompleted, plan.progress.sessionsTarget),
          checklistCompleted: plan.practiceChecklist.length,
          checklistTotal: plan.practiceChecklist.length,
          successCriteriaMet: true,
          percent: 100,
          lastUpdated: now,
          notes: options.note ? [...plan.progress.notes, options.note] : plan.progress.notes,
        },
        updatedAt: now,
      };
      if (current?.practicePlanId === completed.practicePlanId) {
        history.push(completed);
        current = null;
      } else {
        store(completed);
      }
      return completed;
    },
    update(planId, update) {
      const plan = find(planId);
      if (!plan) return null;
      const now = nowIso(update.now);
      const doneIds = new Set(update.completedChecklistItemIds ?? []);
      const withChecklist: PracticePlan = {
        ...plan,
        completionStatus:
          update.completionStatus ??
          (plan.completionStatus === "not-started" ? "in-progress" : plan.completionStatus),
        practiceChecklist: plan.practiceChecklist.map((i) =>
          doneIds.has(i.id) ? { ...i, done: true } : i,
        ),
        progress: {
          ...plan.progress,
          sessionsCompleted: update.sessionsCompleted ?? plan.progress.sessionsCompleted,
          successCriteriaMet: update.successCriteriaMet ?? plan.progress.successCriteriaMet,
          lastUpdated: now,
          notes: update.note ? [...plan.progress.notes, update.note] : plan.progress.notes,
        },
        updatedAt: now,
      };
      const updated: PracticePlan = {
        ...withChecklist,
        progress: recomputeProgress(withChecklist),
      };
      store(updated);
      return updated;
    },
    nextFocus(input) {
      return nextFocus(input, current ?? undefined);
    },
    practiceChecklist(planId) {
      const plan = find(planId);
      return plan ? practiceChecklist(plan) : [];
    },
    successCriteria(planId) {
      const plan = find(planId);
      return plan ? successCriteria(plan) : [];
    },
    safeFallback(role = "adc") {
      return safeFallback(role);
    },
    reset() {
      current = null;
      history.length = 0;
    },
  };
}

/** Default in-memory planner + the pure builders, on one facade. */
export const PracticePlanner = Object.assign(createPracticePlanner(), {
  createPlan: create,
  buildSafeFallback: safeFallback,
  checklistOf: practiceChecklist,
  criteriaOf: successCriteria,
  nextFocusFor: nextFocus,
  createPlanner: createPracticePlanner,
});

export type PracticePlannerFacade = typeof PracticePlanner;