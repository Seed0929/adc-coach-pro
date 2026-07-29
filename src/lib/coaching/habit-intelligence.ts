// ---------------------------------------------------------------------------
// BotDiff Habit Intelligence V1 (Sprint 3.7)
//
//   League Intelligence → Curriculum → Role Intelligence →
//   League Decision Library → Coaching Pipeline →
//   Decision Prioritization Engine → Unified Coaching Context →
//   [Habit Intelligence] → future Player Memory
//
// Consumes UnifiedCoachingContext objects ONLY. Never touches UI, Riot APIs,
// Data Dragon, or persistence. Fully deterministic: identical input order
// produces byte-identical Habit objects.
//
// Champion Intelligence is OPTIONAL — habits work entirely from Decision ids,
// League Intelligence, Curriculum and Role Intelligence when it is absent.
// ---------------------------------------------------------------------------
import type { CurriculumTopicId, DecisionSeverity, LeagueFundamentalId } from "./knowledge-base";
import type { RoleId } from "./knowledge-base/templates/champion";
import type { HabitContext, HabitPracticeRef, HabitScope } from "./habit-context";
import { buildHabitContext, habitAggregationKey } from "./habit-context";
import type { UnifiedCoachingContext } from "./unified-coaching-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HabitStatus =
  | "new"
  | "recurring"
  | "improving"
  | "regressing"
  | "resolved"
  | "strength";

export type HabitTrend = "improving" | "stable" | "regressing" | "unknown";

/** One observation of a decision inside one match. */
export interface HabitObservation {
  key: string;
  decisionId: string;
  label: string;
  kind: "weakness" | "strength" | string;
  fundamental: LeagueFundamentalId;
  curriculumTopic: CurriculumTopicId;
  curriculumTopicLabel: string;
  role: RoleId;
  champion?: string;
  severity: DecisionSeverity;
  priorityScore: number;
  confidence: number;
  matchId: string | null;
  timestamp: string | null;
  /** Monotonic sequence assigned on record() — keeps ordering deterministic. */
  sequence: number;
  outcome: HabitContext["outcome"];
  evidence: string[];
  practiceRecommendationRef: HabitPracticeRef;
  positiveReinforcement: string;
  recoveryRecommendation: string;
  scopes: HabitScope[];
  leagueDecisionId?: string;
}

/** The permanent, reusable Habit object. */
export interface Habit {
  /** Aggregation key: `<scope>:<...>:<decisionId>`. */
  id: string;
  scope: HabitScope;
  decisionId: string;
  label: string;
  kind: "weakness" | "strength" | string;
  fundamental: LeagueFundamentalId;
  curriculumTopic: CurriculumTopicId;
  curriculumTopicLabel: string;
  role: RoleId;
  /** OPTIONAL — only set on champion-scoped habits. */
  champion?: string;
  severity: DecisionSeverity;
  /** Occurrences vs matches observed. */
  frequency: HabitFrequency;
  /** 0-100 — how reliably the behavior repeats across the window. */
  consistency: number;
  /** 0-100 — improvement signal (recent half better than earlier half). */
  improvementTrend: number;
  /** 0-100 — regression signal (recent half worse than earlier half). */
  regressionTrend: number;
  /** 0-100 — how far the habit has moved toward resolved. */
  recoveryProgress: number;
  trend: HabitTrend;
  positiveReinforcement: string;
  /** 0-100 — what to work on first. */
  practicePriority: number;
  practiceRecommendationRef: HabitPracticeRef;
  recoveryRecommendation: string;
  /** 0-100 — sample-size backed certainty. */
  confidence: number;
  coachingNotes: string[];
  firstSeen: HabitSeen;
  lastSeen: HabitSeen;
  matchCount: number;
  status: HabitStatus;
  evidence: string[];
  leagueDecisionId?: string;
  observations: HabitObservation[];
}

export interface HabitFrequency {
  /** Matches this habit appeared in. */
  occurrences: number;
  /** Matches recorded for this scope. */
  matchesObserved: number;
  /** 0-1 occurrence rate. */
  rate: number;
  /** Consecutive most-recent matches containing the habit. */
  streak: number;
}

export interface HabitSeen {
  matchId: string | null;
  timestamp: string | null;
  sequence: number;
}

export interface HabitRecordOptions {
  matchId?: string | null;
  timestamp?: string | null;
  champion?: string;
}

export interface HabitQuery {
  scope?: HabitScope;
  role?: RoleId;
  champion?: string;
  fundamental?: LeagueFundamentalId;
  kind?: "weakness" | "strength";
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

const RECURRING_MIN_OCCURRENCES = 2;
const RECURRING_MIN_RATE = 0.3;
const TREND_MIN_OCCURRENCES = 3;
const TREND_DELTA = 8; // priority-score points

// ---------------------------------------------------------------------------
// Observation extraction (pure)
// ---------------------------------------------------------------------------

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Derive the standardized observation from the canonical contract. */
export function observationFromUnified(
  u: UnifiedCoachingContext,
  sequence: number,
  options: HabitRecordOptions = {},
): HabitObservation {
  const champion =
    options.champion ?? u.championIntelligence?.champion ?? u.habit?.habitContext?.champion;
  const base: HabitContext =
    u.habit?.habitContext ??
    buildHabitContext(u.source, {
      champion,
      matchId: options.matchId ?? null,
      timestamp: options.timestamp ?? null,
    });

  const evidence = u.decisionPriority.evidence.length
    ? u.decisionPriority.evidence
    : base.evidence;

  return {
    key: base.decisionId,
    decisionId: u.decision.decisionId,
    label: u.decision.label,
    kind: u.decision.kind,
    fundamental: u.leagueIntelligence.fundamental,
    curriculumTopic: u.curriculum.topic,
    curriculumTopicLabel: u.curriculum.topicLabel,
    role: u.roleIntelligence.role,
    champion,
    severity: base.severity,
    priorityScore: u.decisionPriority.priority || base.priorityScore,
    confidence: u.decisionPriority.scores?.confidence ?? base.confidence,
    matchId: options.matchId ?? base.matchId,
    timestamp: options.timestamp ?? base.timestamp,
    sequence,
    outcome: base.outcome,
    evidence,
    practiceRecommendationRef: {
      ...base.practiceRecommendationRef,
      drill: u.practiceRecommendation.drill || base.practiceRecommendationRef.drill,
      measurable: u.practiceRecommendation.measurable ?? base.practiceRecommendationRef.measurable,
    },
    positiveReinforcement: u.positiveReinforcement.example,
    recoveryRecommendation: u.recoveryRecommendation.method,
    scopes: champion ? ["universal", "role", "champion"] : ["universal", "role"],
    leagueDecisionId: u.decision.leagueDecisionId ?? base.leagueDecisionId,
  };
}

// ---------------------------------------------------------------------------
// Aggregation (pure)
// ---------------------------------------------------------------------------

function scopeKey(o: HabitObservation, scope: HabitScope): string {
  return habitAggregationKey(
    {
      decisionId: o.decisionId,
      role: o.role,
      champion: o.champion,
    } as HabitContext,
    scope,
  );
}

function meanPriority(list: HabitObservation[]): number {
  if (!list.length) return 0;
  return list.reduce((s, o) => s + o.priorityScore, 0) / list.length;
}

function streakOf(sorted: HabitObservation[], matchOrder: number[]): number {
  // Consecutive most-recent matches (by sequence) containing the habit.
  const seen = new Set(sorted.map((o) => o.sequence));
  let streak = 0;
  for (let i = matchOrder.length - 1; i >= 0; i--) {
    if (seen.has(matchOrder[i])) streak++;
    else break;
  }
  return streak;
}

function severityRank(s: DecisionSeverity): number {
  return s === "high" ? 3 : s === "medium" ? 2 : 1;
}

function highestSeverity(list: HabitObservation[]): DecisionSeverity {
  return list.reduce<DecisionSeverity>(
    (acc, o) => (severityRank(o.severity) > severityRank(acc) ? o.severity : acc),
    "low",
  );
}

function buildCoachingNotes(h: Omit<Habit, "coachingNotes">): string[] {
  const notes: string[] = [];
  const { frequency } = h;
  if (frequency.occurrences > 0) {
    notes.push(
      `This showed up in ${frequency.occurrences} of your last ${frequency.matchesObserved} tracked games.`,
    );
  }
  if (frequency.streak >= 2) {
    notes.push(`It has appeared in your last ${frequency.streak} games in a row.`);
  }
  if (h.status === "improving") {
    notes.push(`Trending the right way — ${h.curriculumTopicLabel} is costing you less than before.`);
  }
  if (h.status === "regressing") {
    notes.push(`Getting worse recently — ${h.curriculumTopicLabel} needs attention again.`);
  }
  if (h.status === "strength") {
    notes.push(`Keep doing this: it is one of your most repeatable habits.`);
  }
  if (h.recoveryProgress >= 60 && h.kind === "weakness") {
    notes.push(`You are most of the way to putting this habit behind you.`);
  }
  if (h.practiceRecommendationRef.drill) {
    notes.push(`Practice: ${h.practiceRecommendationRef.drill}`);
  }
  return notes;
}

/**
 * Aggregate observations into Habit objects for one scope. Deterministic:
 * ordering is derived from sequence numbers only.
 */
export function aggregateObservations(
  observations: HabitObservation[],
  scope: HabitScope = "universal",
  matchSequences?: number[],
): Habit[] {
  const relevant =
    scope === "champion" ? observations.filter((o) => o.champion) : observations;

  const allSequences =
    matchSequences ??
    Array.from(new Set(observations.map((o) => o.sequence))).sort((a, b) => a - b);

  const buckets = new Map<string, HabitObservation[]>();
  for (const o of relevant) {
    const key = scopeKey(o, scope);
    const list = buckets.get(key);
    if (list) list.push(o);
    else buckets.set(key, [o]);
  }

  const habits: Habit[] = [];
  for (const [id, listRaw] of buckets) {
    const list = [...listRaw].sort((a, b) => a.sequence - b.sequence);
    const latest = list[list.length - 1];
    const first = list[0];

    const matchesObserved = allSequences.length || list.length;
    const occurrences = new Set(list.map((o) => o.sequence)).size;
    const rate = matchesObserved ? occurrences / matchesObserved : 0;
    const streak = streakOf(list, allSequences);

    const consistency = clamp(Math.round(rate * 100));

    // Trend: compare average priority of the earlier half vs the recent half.
    const half = Math.floor(list.length / 2);
    const earlier = list.slice(0, half);
    const recent = list.slice(list.length - half);
    const delta = half >= 1 ? meanPriority(earlier) - meanPriority(recent) : 0;
    const enoughData = occurrences >= TREND_MIN_OCCURRENCES;

    const improvementTrend = enoughData && delta > 0 ? clamp(Math.round(delta * 2)) : 0;
    const regressionTrend = enoughData && delta < 0 ? clamp(Math.round(-delta * 2)) : 0;

    let trend: HabitTrend = "unknown";
    if (enoughData) {
      if (delta > TREND_DELTA) trend = "improving";
      else if (delta < -TREND_DELTA) trend = "regressing";
      else trend = "stable";
    }

    const kind = latest.kind;
    const severity = highestSeverity(list);
    const avgPriority = meanPriority(list);

    // Recovery: how far the habit has fallen off relative to the window.
    const gamesSinceLast =
      allSequences.length > 0
        ? allSequences.filter((s) => s > latest.sequence).length
        : 0;
    const recoveryProgress =
      kind === "strength"
        ? 0
        : clamp(
            Math.round(
              (gamesSinceLast / Math.max(1, matchesObserved)) * 60 + improvementTrend * 0.4,
            ),
          );

    const confidence = clamp(
      Math.round(
        Math.min(100, occurrences * 18) * 0.6 +
          (latest.confidence || Math.min(100, matchesObserved * 10)) * 0.4,
      ),
    );

    const practicePriority = clamp(
      Math.round(
        avgPriority * 0.45 +
          consistency * 0.2 +
          severityRank(severity) * 8 +
          regressionTrend * 0.2 +
          Math.min(streak, 5) * 3 -
          recoveryProgress * 0.15,
      ),
    );

    let status: HabitStatus;
    if (kind === "strength") status = "strength";
    else if (recoveryProgress >= 75 && trend !== "regressing") status = "resolved";
    else if (trend === "regressing") status = "regressing";
    else if (trend === "improving") status = "improving";
    else if (occurrences >= RECURRING_MIN_OCCURRENCES && rate >= RECURRING_MIN_RATE)
      status = "recurring";
    else status = "new";

    const evidence = Array.from(new Set(list.flatMap((o) => o.evidence))).filter(Boolean);

    const partial: Omit<Habit, "coachingNotes"> = {
      id,
      scope,
      decisionId: latest.decisionId,
      label: latest.label,
      kind,
      fundamental: latest.fundamental,
      curriculumTopic: latest.curriculumTopic,
      curriculumTopicLabel: latest.curriculumTopicLabel,
      role: latest.role,
      champion: scope === "champion" ? latest.champion : latest.champion,
      severity,
      frequency: {
        occurrences,
        matchesObserved,
        rate: round(rate),
        streak,
      },
      consistency,
      improvementTrend,
      regressionTrend,
      recoveryProgress,
      trend,
      positiveReinforcement: latest.positiveReinforcement,
      practicePriority,
      practiceRecommendationRef: latest.practiceRecommendationRef,
      recoveryRecommendation: latest.recoveryRecommendation,
      confidence,
      firstSeen: { matchId: first.matchId, timestamp: first.timestamp, sequence: first.sequence },
      lastSeen: {
        matchId: latest.matchId,
        timestamp: latest.timestamp,
        sequence: latest.sequence,
      },
      matchCount: occurrences,
      status,
      evidence,
      leagueDecisionId: latest.leagueDecisionId,
      observations: list,
    };

    habits.push({ ...partial, coachingNotes: buildCoachingNotes(partial) });
  }

  return sortHabits(habits);
}

function sortHabits(habits: Habit[]): Habit[] {
  return [...habits].sort(
    (a, b) =>
      b.practicePriority - a.practicePriority ||
      b.frequency.occurrences - a.frequency.occurrences ||
      a.decisionId.localeCompare(b.decisionId),
  );
}

function matchesQuery(h: Habit, q: HabitQuery): boolean {
  if (q.scope && h.scope !== q.scope) return false;
  if (q.role && h.role !== q.role) return false;
  if (q.champion && h.champion !== q.champion) return false;
  if (q.fundamental && h.fundamental !== q.fundamental) return false;
  if (q.kind && h.kind !== q.kind) return false;
  return true;
}

// ---------------------------------------------------------------------------
// The engine — in-memory only, no persistence
// ---------------------------------------------------------------------------

export interface HabitEngineInstance {
  /** Record one (or many) unified contexts from a single match. */
  record(
    input: UnifiedCoachingContext | UnifiedCoachingContext[],
    options?: HabitRecordOptions,
  ): HabitObservation[];
  /** Rebuild every habit for a scope from recorded observations. */
  aggregate(scope?: HabitScope): Habit[];
  getHabits(query?: HabitQuery): Habit[];
  getRecurringHabits(query?: HabitQuery): Habit[];
  getImprovingHabits(query?: HabitQuery): Habit[];
  getRegressingHabits(query?: HabitQuery): Habit[];
  getTopPriorityHabit(query?: HabitQuery): Habit | undefined;
  getTopStrength(query?: HabitQuery): Habit | undefined;
  getObservations(): HabitObservation[];
  reset(): void;
}

export function createHabitEngine(): HabitEngineInstance {
  let observations: HabitObservation[] = [];
  /** Deterministic match ordering: one sequence number per recorded match. */
  const matchSequence = new Map<string, number>();
  let nextSequence = 0;

  function sequenceFor(options: HabitRecordOptions): number {
    const key = options.matchId ?? options.timestamp ?? `__match_${nextSequence}`;
    const existing = matchSequence.get(key);
    if (existing !== undefined) return existing;
    const seq = nextSequence++;
    matchSequence.set(key, seq);
    return seq;
  }

  function allSequences(): number[] {
    return Array.from(matchSequence.values()).sort((a, b) => a - b);
  }

  function aggregate(scope: HabitScope = "universal"): Habit[] {
    return aggregateObservations(observations, scope, allSequences());
  }

  function habitsFor(query: HabitQuery = {}): Habit[] {
    const scope: HabitScope = query.scope ?? (query.champion ? "champion" : "universal");
    return aggregate(scope).filter((h) => matchesQuery(h, query));
  }

  return {
    record(input, options = {}) {
      const list = Array.isArray(input) ? input : [input];
      if (!list.length) return [];
      const sequence = sequenceFor(options);
      const recorded = list.map((u) => observationFromUnified(u, sequence, options));
      observations = [...observations, ...recorded];
      return recorded;
    },
    aggregate,
    getHabits: habitsFor,
    getRecurringHabits(query = {}) {
      return habitsFor(query).filter(
        (h) =>
          h.kind !== "strength" &&
          h.frequency.occurrences >= RECURRING_MIN_OCCURRENCES &&
          h.frequency.rate >= RECURRING_MIN_RATE,
      );
    },
    getImprovingHabits(query = {}) {
      return habitsFor(query)
        .filter((h) => h.trend === "improving" || h.status === "resolved")
        .sort((a, b) => b.improvementTrend - a.improvementTrend);
    },
    getRegressingHabits(query = {}) {
      return habitsFor(query)
        .filter((h) => h.trend === "regressing")
        .sort((a, b) => b.regressionTrend - a.regressionTrend);
    },
    getTopPriorityHabit(query = {}) {
      return habitsFor({ ...query, kind: query.kind ?? "weakness" }).find(
        (h) => h.status !== "resolved",
      );
    },
    getTopStrength(query = {}) {
      return habitsFor({ ...query, kind: "strength" })[0];
    },
    getObservations() {
      return [...observations];
    },
    reset() {
      observations = [];
      matchSequence.clear();
      nextSequence = 0;
    },
  };
}

/**
 * Shared, in-memory engine instance. Stateless consumers can also build their
 * own with `createHabitEngine()`. Nothing is persisted anywhere.
 */
export const HabitEngine = Object.assign(createHabitEngine(), {
  create: createHabitEngine,
  /** One-shot helper: aggregate a batch of unified contexts without state. */
  from(
    matches: { contexts: UnifiedCoachingContext[]; matchId?: string; timestamp?: string }[],
    scope: HabitScope = "universal",
  ): Habit[] {
    const engine = createHabitEngine();
    for (const m of matches) {
      engine.record(m.contexts, { matchId: m.matchId ?? null, timestamp: m.timestamp ?? null });
    }
    return engine.aggregate(scope);
  },
});

export type HabitIntelligenceFacade = typeof HabitEngine;