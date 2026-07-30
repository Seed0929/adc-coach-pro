// ---------------------------------------------------------------------------
// BotDiff Player Memory V1 (Sprint 3.8)
//
//   League Intelligence → Curriculum → Role Intelligence →
//   League Decision Library → Coaching Pipeline →
//   Decision Prioritization Engine → Unified Coaching Context →
//   Habit Intelligence → [Player Memory]
//
// Player Memory is the permanent long-term coaching state of one player.
//
// Rules baked into this module:
//   • Consumes Habit Intelligence (and, through it, Unified Coaching Context).
//   • NEVER touches Riot APIs, Data Dragon, the UI, or persistence.
//   • No databases, no cloud storage — purely in-memory + deterministic.
//   • Champion Intelligence stays OPTIONAL; memory works entirely from
//     Decision ids, League Intelligence, Curriculum and Role Intelligence.
//
// Deterministic: the same recorded contexts in the same order always produce
// byte-identical memory snapshots (apart from the caller-supplied clock).
// ---------------------------------------------------------------------------
import type { CurriculumTopicId, LeagueFundamentalId } from "./knowledge-base";
import type { RoleId } from "./knowledge-base/templates/champion";
import type { HabitPracticeRef, HabitScope } from "./habit-context";
import type {
  Habit,
  HabitEngineInstance,
  HabitQuery,
  HabitRecordOptions,
} from "./habit-intelligence";
import { createHabitEngine } from "./habit-intelligence";
import type { UnifiedCoachingContext } from "./unified-coaching-context";

// ---------------------------------------------------------------------------
// Reference shapes — Player Memory stores REFERENCES, never duplicated data.
// ---------------------------------------------------------------------------

/** A pointer at one aggregated habit, plus the numbers memory reasons about. */
export interface MemoryHabitRef {
  habitId: string;
  decisionId: string;
  label: string;
  kind: Habit["kind"];
  scope: HabitScope;
  role: RoleId;
  /** OPTIONAL — present only when Champion Intelligence supplied a champion. */
  champion?: string;
  fundamental: LeagueFundamentalId;
  curriculumTopic: CurriculumTopicId;
  curriculumTopicLabel: string;
  status: Habit["status"];
  trend: Habit["trend"];
  severity: Habit["severity"];
  occurrences: number;
  matchesObserved: number;
  rate: number;
  streak: number;
  consistency: number;
  improvementTrend: number;
  regressionTrend: number;
  recoveryProgress: number;
  practicePriority: number;
  confidence: number;
  leagueDecisionId?: string;
  lastSeen: Habit["lastSeen"];
  firstSeen: Habit["firstSeen"];
}

/** Practice history reference — what was prescribed, for which habit, when. */
export interface MemoryPracticeRef {
  habitId: string;
  decisionId: string;
  curriculumTopic: CurriculumTopicId;
  practice: HabitPracticeRef;
  prescribedAtSequence: number;
  matchId: string | null;
  timestamp: string | null;
}

/** Curriculum progress reference — memory never copies curriculum content. */
export interface MemoryCurriculumProgressRef {
  topic: CurriculumTopicId;
  topicLabel: string;
  habitIds: string[];
  occurrences: number;
  /** 0-100 — how resolved this topic looks across the tracked window. */
  progress: number;
  trend: Habit["trend"];
}

export interface MemoryFundamentalProgressRef {
  fundamental: LeagueFundamentalId;
  habitIds: string[];
  occurrences: number;
  progress: number;
  trend: Habit["trend"];
}

export interface MemoryRoleProgressRef {
  role: RoleId;
  habitIds: string[];
  matchesObserved: number;
  occurrences: number;
  progress: number;
  trend: Habit["trend"];
}

export interface MemoryDecisionRef {
  decisionId: string;
  leagueDecisionId?: string;
  habitIds: string[];
  occurrences: number;
  lastSeenSequence: number;
}

/** The one thing the player is working on right now. */
export interface MemoryFocus {
  habitId: string;
  decisionId: string;
  label: string;
  fundamental: LeagueFundamentalId;
  curriculumTopic: CurriculumTopicId;
  practice: HabitPracticeRef;
  reason: string;
  priority: number;
  confidence: number;
  /** Match sequence the focus was selected on. */
  setAtSequence: number;
  setAt: string;
}

export interface MemoryMilestone {
  id: string;
  kind: "resolved" | "improving" | "strength" | "focus-change";
  label: string;
  detail: string;
  habitId?: string;
  atSequence: number;
  at: string;
}

export interface MemoryRecoveryEntry {
  habitId: string;
  decisionId: string;
  label: string;
  recoveryProgress: number;
  recoveryRecommendation: string;
  status: Habit["status"];
  atSequence: number;
}

/** Placeholder — a future match importer fills these; memory never fetches. */
export interface MemoryMatchRef {
  matchId: string | null;
  timestamp: string | null;
  sequence: number;
  role: RoleId | null;
  /** OPTIONAL — Champion Intelligence placeholder. */
  champion?: string;
  contextCount: number;
}

export interface MemoryTrendPoint {
  sequence: number;
  matchId: string | null;
  value: number;
}

export interface MemoryTrend {
  direction: "improving" | "stable" | "regressing" | "unknown";
  /** 0-100 current reading. */
  value: number;
  /** Signed delta between the earlier and recent halves of the window. */
  delta: number;
  points: MemoryTrendPoint[];
}

// ---------------------------------------------------------------------------
// The permanent PlayerMemory object
// ---------------------------------------------------------------------------

export interface PlayerMemoryV1 {
  version: 1;
  playerId: string;
  primaryRole: RoleId | null;
  matchesObserved: number;

  activeHabits: MemoryHabitRef[];
  improvingHabits: MemoryHabitRef[];
  regressingHabits: MemoryHabitRef[];
  consistentStrengths: MemoryHabitRef[];
  longTermWeaknesses: MemoryHabitRef[];

  currentCoachingFocus: MemoryFocus | null;
  previousCoachingFocus: MemoryFocus | null;

  practiceHistory: MemoryPracticeRef[];
  curriculumProgress: MemoryCurriculumProgressRef[];
  fundamentalProgress: MemoryFundamentalProgressRef[];
  roleProgress: MemoryRoleProgressRef[];
  decisionLibraryRefs: MemoryDecisionRef[];

  confidenceTrend: MemoryTrend;
  improvementTrend: MemoryTrend;
  regressionTrend: MemoryTrend;

  milestones: MemoryMilestone[];
  recoveryHistory: MemoryRecoveryEntry[];

  lastUpdated: string;
  /** Placeholder references only — never fetched from Riot. */
  matchHistoryRefs: MemoryMatchRef[];
}

export interface PlayerMemoryProgressSummary {
  matchesObserved: number;
  primaryRole: RoleId | null;
  focus: string | null;
  previousFocus: string | null;
  improvingCount: number;
  regressingCount: number;
  recurringCount: number;
  strengthCount: number;
  resolvedCount: number;
  confidence: number;
  headline: string;
  lines: string[];
}

/** Compact object a future AI Coach / prompt builder can serialize verbatim. */
export interface PlayerMemoryCoachSnapshot {
  playerId: string;
  primaryRole: RoleId | null;
  matchesObserved: number;
  currentFocus: string | null;
  currentFocusPractice: string | null;
  previousFocus: string | null;
  recurringProblems: string[];
  improvingAreas: string[];
  regressingAreas: string[];
  consistentStrengths: string[];
  curriculumInProgress: string[];
  milestones: string[];
  confidenceTrend: MemoryTrend["direction"];
  improvementTrend: MemoryTrend["direction"];
  regressionTrend: MemoryTrend["direction"];
  lastUpdated: string;
}

export interface PlayerMemoryOptions {
  playerId?: string;
  /** Injected clock keeps snapshots deterministic in tests. */
  now?: () => string;
  /** Bring your own habit engine (e.g. one shared with a replay session). */
  habitEngine?: HabitEngineInstance;
}

export interface PlayerMemoryRecordOptions extends HabitRecordOptions {
  role?: RoleId;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function habitRef(h: Habit): MemoryHabitRef {
  return {
    habitId: h.id,
    decisionId: h.decisionId,
    label: h.label,
    kind: h.kind,
    scope: h.scope,
    role: h.role,
    champion: h.champion,
    fundamental: h.fundamental,
    curriculumTopic: h.curriculumTopic,
    curriculumTopicLabel: h.curriculumTopicLabel,
    status: h.status,
    trend: h.trend,
    severity: h.severity,
    occurrences: h.frequency.occurrences,
    matchesObserved: h.frequency.matchesObserved,
    rate: h.frequency.rate,
    streak: h.frequency.streak,
    consistency: h.consistency,
    improvementTrend: h.improvementTrend,
    regressionTrend: h.regressionTrend,
    recoveryProgress: h.recoveryProgress,
    practicePriority: h.practicePriority,
    confidence: h.confidence,
    leagueDecisionId: h.leagueDecisionId,
    lastSeen: h.lastSeen,
    firstSeen: h.firstSeen,
  };
}

function dominantTrend(habits: Habit[]): Habit["trend"] {
  const improving = habits.filter((h) => h.trend === "improving").length;
  const regressing = habits.filter((h) => h.trend === "regressing").length;
  if (!habits.length) return "unknown";
  if (improving > regressing) return "improving";
  if (regressing > improving) return "regressing";
  return "stable";
}

/** 0-100 progress: recovery + improvement, penalised by how often it recurs. */
function progressOf(habits: Habit[]): number {
  if (!habits.length) return 0;
  const weaknesses = habits.filter((h) => h.kind !== "strength");
  if (!weaknesses.length) return 100;
  const score =
    weaknesses.reduce(
      (sum, h) =>
        sum + h.recoveryProgress * 0.5 + h.improvementTrend * 0.3 + (100 - h.consistency) * 0.2,
      0,
    ) / weaknesses.length;
  return clamp(score);
}

function trendFrom(points: MemoryTrendPoint[]): MemoryTrend {
  if (!points.length) {
    return { direction: "unknown", value: 0, delta: 0, points: [] };
  }
  const half = Math.floor(points.length / 2);
  const earlier = points.slice(0, half);
  const recent = points.slice(points.length - Math.max(half, 1));
  const avg = (list: MemoryTrendPoint[]) =>
    list.length ? list.reduce((s, p) => s + p.value, 0) / list.length : 0;
  const delta = half >= 1 ? Math.round(avg(recent) - avg(earlier)) : 0;
  const direction: MemoryTrend["direction"] =
    points.length < 2 ? "unknown" : delta > 4 ? "improving" : delta < -4 ? "regressing" : "stable";
  return {
    direction,
    value: clamp(points[points.length - 1].value),
    delta,
    points,
  };
}

function focusFrom(h: Habit, sequence: number, at: string): MemoryFocus {
  return {
    habitId: h.id,
    decisionId: h.decisionId,
    label: h.label,
    fundamental: h.fundamental,
    curriculumTopic: h.curriculumTopic,
    practice: h.practiceRecommendationRef,
    reason:
      h.coachingNotes[0] ??
      `${h.curriculumTopicLabel} is the highest-value habit to fix right now.`,
    priority: h.practicePriority,
    confidence: h.confidence,
    setAtSequence: sequence,
    setAt: at,
  };
}

const EMPTY_TREND: MemoryTrend = { direction: "unknown", value: 0, delta: 0, points: [] };

export function emptyPlayerMemory(playerId = "local", now = new Date().toISOString()): PlayerMemoryV1 {
  return {
    version: 1,
    playerId,
    primaryRole: null,
    matchesObserved: 0,
    activeHabits: [],
    improvingHabits: [],
    regressingHabits: [],
    consistentStrengths: [],
    longTermWeaknesses: [],
    currentCoachingFocus: null,
    previousCoachingFocus: null,
    practiceHistory: [],
    curriculumProgress: [],
    fundamentalProgress: [],
    roleProgress: [],
    decisionLibraryRefs: [],
    confidenceTrend: EMPTY_TREND,
    improvementTrend: EMPTY_TREND,
    regressionTrend: EMPTY_TREND,
    milestones: [],
    recoveryHistory: [],
    lastUpdated: now,
    matchHistoryRefs: [],
  };
}

// ---------------------------------------------------------------------------
// The service — in-memory only, no persistence, no I/O
// ---------------------------------------------------------------------------

export interface PlayerMemoryInstance {
  /** Record one match worth of unified coaching contexts into memory. */
  record(
    input: UnifiedCoachingContext | UnifiedCoachingContext[],
    options?: PlayerMemoryRecordOptions,
  ): PlayerMemoryV1;
  /** Read the current memory object (deep-frozen copy semantics: fresh build). */
  load(): PlayerMemoryV1;
  /** Recompute memory from everything recorded so far. */
  update(patch?: Partial<Pick<PlayerMemoryV1, "playerId" | "primaryRole">>): PlayerMemoryV1;
  getCurrentFocus(): MemoryFocus | null;
  getImprovingAreas(query?: HabitQuery): MemoryHabitRef[];
  getRecurringProblems(query?: HabitQuery): MemoryHabitRef[];
  getStrengthHistory(query?: HabitQuery): MemoryHabitRef[];
  getProgressSummary(): PlayerMemoryProgressSummary;
  getCoachSnapshot(): PlayerMemoryCoachSnapshot;
  /** The habit engine backing this memory — read-only usage encouraged. */
  habits(): HabitEngineInstance;
  reset(): void;
}

export function createPlayerMemory(options: PlayerMemoryOptions = {}): PlayerMemoryInstance {
  const now = options.now ?? (() => new Date().toISOString());
  const engine = options.habitEngine ?? createHabitEngine();
  let playerId = options.playerId ?? "local";
  let overrideRole: RoleId | null = null;

  let memory: PlayerMemoryV1 = emptyPlayerMemory(playerId, now());
  let matchRefs: MemoryMatchRef[] = [];
  let practiceHistory: MemoryPracticeRef[] = [];
  let milestones: MemoryMilestone[] = [];
  let confidencePoints: MemoryTrendPoint[] = [];
  let improvementPoints: MemoryTrendPoint[] = [];
  let regressionPoints: MemoryTrendPoint[] = [];
  let currentFocus: MemoryFocus | null = null;
  let previousFocus: MemoryFocus | null = null;
  const seenMilestones = new Set<string>();
  let sequence = -1;

  function primaryRole(habits: Habit[]): RoleId | null {
    if (overrideRole) return overrideRole;
    const counts = new Map<RoleId, number>();
    for (const ref of matchRefs) {
      if (!ref.role) continue;
      counts.set(ref.role, (counts.get(ref.role) ?? 0) + 1);
    }
    for (const h of habits) counts.set(h.role, (counts.get(h.role) ?? 0) + 1);
    let best: RoleId | null = null;
    let bestCount = 0;
    for (const [role, count] of counts) {
      if (count > bestCount) {
        best = role;
        bestCount = count;
      }
    }
    return best;
  }

  function rebuild(): PlayerMemoryV1 {
    const at = now();
    const habits = engine.aggregate("universal");
    const weaknesses = habits.filter((h) => h.kind !== "strength");
    const strengths = habits.filter((h) => h.kind === "strength");
    const matchesObserved = matchRefs.length;

    // ---- focus selection ---------------------------------------------------
    const topWeakness = weaknesses.find((h) => h.status !== "resolved");
    if (topWeakness && currentFocus?.habitId !== topWeakness.id) {
      const next = focusFrom(topWeakness, sequence, at);
      if (currentFocus) {
        previousFocus = currentFocus;
        const id = `focus-change:${next.habitId}:${sequence}`;
        if (!seenMilestones.has(id)) {
          seenMilestones.add(id);
          milestones = [
            ...milestones,
            {
              id,
              kind: "focus-change",
              label: `New focus: ${next.label}`,
              detail: `Focus moved from "${currentFocus.label}" to "${next.label}".`,
              habitId: next.habitId,
              atSequence: sequence,
              at,
            },
          ];
        }
      }
      currentFocus = next;
    } else if (!topWeakness && currentFocus) {
      previousFocus = currentFocus;
      currentFocus = null;
    }

    // ---- milestones --------------------------------------------------------
    for (const h of habits) {
      const kind: MemoryMilestone["kind"] | null =
        h.status === "resolved"
          ? "resolved"
          : h.status === "improving"
            ? "improving"
            : h.status === "strength" && h.frequency.occurrences >= 3
              ? "strength"
              : null;
      if (!kind) continue;
      const id = `${kind}:${h.id}`;
      if (seenMilestones.has(id)) continue;
      seenMilestones.add(id);
      milestones = [
        ...milestones,
        {
          id,
          kind,
          label:
            kind === "resolved"
              ? `Cleaned up: ${h.label}`
              : kind === "improving"
                ? `Improving: ${h.label}`
                : `Reliable strength: ${h.label}`,
          detail: h.coachingNotes[0] ?? `${h.curriculumTopicLabel} — ${h.label}.`,
          habitId: h.id,
          atSequence: sequence,
          at,
        },
      ];
    }

    // ---- curriculum / fundamental / role / decision progress ---------------
    const byTopic = new Map<CurriculumTopicId, Habit[]>();
    const byFundamental = new Map<LeagueFundamentalId, Habit[]>();
    const byRole = new Map<RoleId, Habit[]>();
    const byDecision = new Map<string, Habit[]>();
    for (const h of habits) {
      byTopic.set(h.curriculumTopic, [...(byTopic.get(h.curriculumTopic) ?? []), h]);
      byFundamental.set(h.fundamental, [...(byFundamental.get(h.fundamental) ?? []), h]);
      byRole.set(h.role, [...(byRole.get(h.role) ?? []), h]);
      byDecision.set(h.decisionId, [...(byDecision.get(h.decisionId) ?? []), h]);
    }

    const occurrencesOf = (list: Habit[]) =>
      list.reduce((s, h) => s + h.frequency.occurrences, 0);

    const curriculumProgress: MemoryCurriculumProgressRef[] = Array.from(byTopic)
      .map(([topic, list]) => ({
        topic,
        topicLabel: list[0].curriculumTopicLabel,
        habitIds: list.map((h) => h.id),
        occurrences: occurrencesOf(list),
        progress: progressOf(list),
        trend: dominantTrend(list),
      }))
      .sort((a, b) => b.occurrences - a.occurrences || a.topic.localeCompare(b.topic));

    const fundamentalProgress: MemoryFundamentalProgressRef[] = Array.from(byFundamental)
      .map(([fundamental, list]) => ({
        fundamental,
        habitIds: list.map((h) => h.id),
        occurrences: occurrencesOf(list),
        progress: progressOf(list),
        trend: dominantTrend(list),
      }))
      .sort((a, b) => b.occurrences - a.occurrences || a.fundamental.localeCompare(b.fundamental));

    const roleProgress: MemoryRoleProgressRef[] = Array.from(byRole)
      .map(([role, list]) => ({
        role,
        habitIds: list.map((h) => h.id),
        matchesObserved,
        occurrences: occurrencesOf(list),
        progress: progressOf(list),
        trend: dominantTrend(list),
      }))
      .sort((a, b) => b.occurrences - a.occurrences || a.role.localeCompare(b.role));

    const decisionLibraryRefs: MemoryDecisionRef[] = Array.from(byDecision)
      .map(([decisionId, list]) => ({
        decisionId,
        leagueDecisionId: list.find((h) => h.leagueDecisionId)?.leagueDecisionId,
        habitIds: list.map((h) => h.id),
        occurrences: occurrencesOf(list),
        lastSeenSequence: Math.max(...list.map((h) => h.lastSeen.sequence)),
      }))
      .sort(
        (a, b) => b.occurrences - a.occurrences || a.decisionId.localeCompare(b.decisionId),
      );

    // ---- recovery history --------------------------------------------------
    const recoveryHistory: MemoryRecoveryEntry[] = weaknesses
      .filter((h) => h.recoveryProgress > 0)
      .map((h) => ({
        habitId: h.id,
        decisionId: h.decisionId,
        label: h.label,
        recoveryProgress: h.recoveryProgress,
        recoveryRecommendation: h.recoveryRecommendation,
        status: h.status,
        atSequence: h.lastSeen.sequence,
      }))
      .sort((a, b) => b.recoveryProgress - a.recoveryProgress);

    memory = {
      version: 1,
      playerId,
      primaryRole: primaryRole(habits),
      matchesObserved,
      activeHabits: habits.map(habitRef),
      improvingHabits: habits
        .filter((h) => h.trend === "improving" || h.status === "resolved")
        .sort((a, b) => b.improvementTrend - a.improvementTrend)
        .map(habitRef),
      regressingHabits: habits
        .filter((h) => h.trend === "regressing")
        .sort((a, b) => b.regressionTrend - a.regressionTrend)
        .map(habitRef),
      consistentStrengths: strengths
        .filter((h) => h.frequency.occurrences >= 2)
        .map(habitRef),
      longTermWeaknesses: weaknesses
        .filter((h) => h.status === "recurring" || h.status === "regressing")
        .map(habitRef),
      currentCoachingFocus: currentFocus,
      previousCoachingFocus: previousFocus,
      practiceHistory,
      curriculumProgress,
      fundamentalProgress,
      roleProgress,
      decisionLibraryRefs,
      confidenceTrend: trendFrom(confidencePoints),
      improvementTrend: trendFrom(improvementPoints),
      regressionTrend: trendFrom(regressionPoints),
      milestones,
      recoveryHistory,
      lastUpdated: at,
      matchHistoryRefs: matchRefs,
    };

    return memory;
  }

  function pushTrendPoints(matchId: string | null, seq: number, habits: Habit[]) {
    const avg = (pick: (h: Habit) => number) =>
      habits.length ? clamp(habits.reduce((s, h) => s + pick(h), 0) / habits.length) : 0;
    confidencePoints = [
      ...confidencePoints,
      { sequence: seq, matchId, value: avg((h) => h.confidence) },
    ];
    improvementPoints = [
      ...improvementPoints,
      { sequence: seq, matchId, value: avg((h) => h.improvementTrend) },
    ];
    regressionPoints = [
      ...regressionPoints,
      { sequence: seq, matchId, value: avg((h) => h.regressionTrend) },
    ];
  }

  return {
    record(input, recordOptions = {}) {
      const list = Array.isArray(input) ? input : [input];
      if (!list.length) return rebuild();

      const observations = engine.record(list, recordOptions);
      sequence = observations.length ? observations[0].sequence : sequence + 1;
      const first = observations[0];

      matchRefs = [
        ...matchRefs,
        {
          matchId: recordOptions.matchId ?? first?.matchId ?? null,
          timestamp: recordOptions.timestamp ?? first?.timestamp ?? null,
          sequence,
          role: recordOptions.role ?? first?.role ?? null,
          champion: recordOptions.champion ?? first?.champion,
          contextCount: list.length,
        },
      ];

      practiceHistory = [
        ...practiceHistory,
        ...observations.map((o) => ({
          habitId: `universal:${o.decisionId}`,
          decisionId: o.decisionId,
          curriculumTopic: o.curriculumTopic,
          practice: o.practiceRecommendationRef,
          prescribedAtSequence: o.sequence,
          matchId: o.matchId,
          timestamp: o.timestamp,
        })),
      ];

      const habits = engine.aggregate("universal");
      pushTrendPoints(recordOptions.matchId ?? first?.matchId ?? null, sequence, habits);

      return rebuild();
    },

    load() {
      return memory;
    },

    update(patch = {}) {
      if (patch.playerId) playerId = patch.playerId;
      if (patch.primaryRole !== undefined) overrideRole = patch.primaryRole;
      return rebuild();
    },

    getCurrentFocus() {
      return currentFocus;
    },

    getImprovingAreas(query = {}) {
      return engine
        .getImprovingHabits(query)
        .map(habitRef);
    },

    getRecurringProblems(query = {}) {
      return engine.getRecurringHabits(query).map(habitRef);
    },

    getStrengthHistory(query = {}) {
      return engine
        .getHabits({ ...query, kind: "strength" })
        .sort((a, b) => b.frequency.occurrences - a.frequency.occurrences)
        .map(habitRef);
    },

    getProgressSummary() {
      const m = memory;
      const resolved = m.activeHabits.filter((h) => h.status === "resolved").length;
      const recurring = m.longTermWeaknesses.length;
      const lines: string[] = [];
      if (m.currentCoachingFocus) {
        lines.push(`Current focus: ${m.currentCoachingFocus.label}.`);
        if (m.currentCoachingFocus.practice.drill) {
          lines.push(`Practice: ${m.currentCoachingFocus.practice.drill}`);
        }
      }
      if (m.previousCoachingFocus) {
        lines.push(`Previous focus: ${m.previousCoachingFocus.label}.`);
      }
      if (m.improvingHabits.length) {
        lines.push(
          `Improving: ${m.improvingHabits.slice(0, 3).map((h) => h.label).join(", ")}.`,
        );
      }
      if (m.regressingHabits.length) {
        lines.push(
          `Slipping: ${m.regressingHabits.slice(0, 3).map((h) => h.label).join(", ")}.`,
        );
      }
      if (m.consistentStrengths.length) {
        lines.push(
          `Keep doing: ${m.consistentStrengths.slice(0, 3).map((h) => h.label).join(", ")}.`,
        );
      }

      const headline = m.matchesObserved
        ? m.currentCoachingFocus
          ? `Across ${m.matchesObserved} tracked games, ${m.currentCoachingFocus.label.toLowerCase()} is the habit worth the most LP right now.`
          : `Across ${m.matchesObserved} tracked games, nothing recurring is costing you games — keep reinforcing what works.`
        : "No tracked games yet — memory starts building on your first imported match.";

      return {
        matchesObserved: m.matchesObserved,
        primaryRole: m.primaryRole,
        focus: m.currentCoachingFocus?.label ?? null,
        previousFocus: m.previousCoachingFocus?.label ?? null,
        improvingCount: m.improvingHabits.length,
        regressingCount: m.regressingHabits.length,
        recurringCount: recurring,
        strengthCount: m.consistentStrengths.length,
        resolvedCount: resolved,
        confidence: m.confidenceTrend.value,
        headline,
        lines,
      };
    },

    getCoachSnapshot() {
      const m = memory;
      return {
        playerId: m.playerId,
        primaryRole: m.primaryRole,
        matchesObserved: m.matchesObserved,
        currentFocus: m.currentCoachingFocus?.label ?? null,
        currentFocusPractice: m.currentCoachingFocus?.practice.drill ?? null,
        previousFocus: m.previousCoachingFocus?.label ?? null,
        recurringProblems: m.longTermWeaknesses.map((h) => h.label),
        improvingAreas: m.improvingHabits.map((h) => h.label),
        regressingAreas: m.regressingHabits.map((h) => h.label),
        consistentStrengths: m.consistentStrengths.map((h) => h.label),
        curriculumInProgress: m.curriculumProgress
          .filter((c) => c.progress < 100)
          .map((c) => c.topicLabel),
        milestones: m.milestones.map((x) => x.label),
        confidenceTrend: m.confidenceTrend.direction,
        improvementTrend: m.improvementTrend.direction,
        regressionTrend: m.regressionTrend.direction,
        lastUpdated: m.lastUpdated,
      };
    },

    habits() {
      return engine;
    },

    reset() {
      engine.reset();
      matchRefs = [];
      practiceHistory = [];
      milestones = [];
      confidencePoints = [];
      improvementPoints = [];
      regressionPoints = [];
      currentFocus = null;
      previousFocus = null;
      seenMilestones.clear();
      overrideRole = null;
      sequence = -1;
      memory = emptyPlayerMemory(playerId, now());
    },
  };
}

/**
 * Shared in-memory Player Memory service. Consumers that need isolation build
 * their own with `PlayerMemoryService.create()`. Nothing is persisted anywhere.
 */
export const PlayerMemoryService = Object.assign(createPlayerMemory(), {
  create: createPlayerMemory,
  empty: emptyPlayerMemory,
  /** One-shot: build memory from a batch of matches without keeping state. */
  from(
    matches: {
      contexts: UnifiedCoachingContext[];
      matchId?: string;
      timestamp?: string;
      role?: RoleId;
      champion?: string;
    }[],
    options: PlayerMemoryOptions = {},
  ): PlayerMemoryV1 {
    const service = createPlayerMemory(options);
    for (const m of matches) {
      service.record(m.contexts, {
        matchId: m.matchId ?? null,
        timestamp: m.timestamp ?? null,
        role: m.role,
        champion: m.champion,
      });
    }
    return service.load();
  },
});

export type PlayerMemoryFacade = typeof PlayerMemoryService;