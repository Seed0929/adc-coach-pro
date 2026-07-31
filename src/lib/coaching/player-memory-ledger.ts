// ---------------------------------------------------------------------------
// BotDiff Player Memory V1 (Sprint 3.8)
//
//   League Intelligence → Curriculum → Role Intelligence →
//   League Decision Library → Coaching Pipeline →
//   Decision Prioritization Engine → Unified Coaching Context →
//   Habit Intelligence → [Player Memory]
//
// Player Memory is the LONG-TERM coaching history of a player. It consumes
// Habit Intelligence only. It never touches UI, Riot APIs, Data Dragon, or
// persistence. Everything here is in-memory and deterministic: the same
// recorded matches in the same order always produce identical memories.
//
// Champion Intelligence is OPTIONAL — when no champion is known, memories are
// built entirely from Decision ids, Fundamentals, Curriculum topics and Role
// Intelligence carried on the Unified Coaching Context.
// ---------------------------------------------------------------------------
import type { CurriculumTopicId, LeagueFundamentalId } from "./knowledge-base";
import type { RoleId } from "./knowledge-base/templates/champion";
import type { HabitPracticeRef, HabitScope } from "./habit-context";
import {
  createHabitEngine,
  type Habit,
  type HabitEngineInstance,
  type HabitQuery,
  type HabitRecordOptions,
  type HabitTrend,
} from "./habit-intelligence";
import type { UnifiedCoachingContext } from "./unified-coaching-context";

// ---------------------------------------------------------------------------
// Memory object
// ---------------------------------------------------------------------------

export type MemoryStanding = "strength" | "weakness" | "neutral";

/** One point on a memory's long-term trend line (one recorded match). */
export interface MemoryTrendPoint {
  sequence: number;
  matchId: string | null;
  timestamp: string | null;
  /** 0-100 practice priority at that point in time. */
  priority: number;
  /** 0-100 sample-size backed certainty at that point in time. */
  confidence: number;
  trend: HabitTrend;
  occurrences: number;
}

/** One improvement / regression event in the player's history. */
export interface MemoryHistoryEvent {
  sequence: number;
  matchId: string | null;
  timestamp: string | null;
  /** Signed delta in practice priority vs the previous recorded match. */
  delta: number;
  note: string;
}

/** A practice recommendation the memory has surfaced, with how often. */
export interface MemoryPracticeEntry {
  practiceRef: HabitPracticeRef;
  timesRecommended: number;
  firstRecommended: string | null;
  lastRecommended: string | null;
}

export interface MemoryConfidencePoint {
  sequence: number;
  timestamp: string | null;
  confidence: number;
}

/** The permanent, reusable Player Memory object. */
export interface PlayerMemoryRecord {
  memoryId: string;
  decisionId: string;
  leagueDecisionId?: string;
  fundamental: LeagueFundamentalId;
  curriculumTopic: CurriculumTopicId;
  curriculumTopicLabel: string;
  role: RoleId;
  /** OPTIONAL — present only when Champion Intelligence supplied a champion. */
  champion?: string;
  scope: HabitScope;
  /** Stable reference back into Habit Intelligence (habit id). */
  habitRef: string;
  label: string;
  standing: MemoryStanding;
  trendHistory: MemoryTrendPoint[];
  /** True when this memory has behaved as a long-term strength. */
  longTermStrength: boolean;
  /** True when this memory has behaved as a long-term weakness. */
  longTermWeakness: boolean;
  improvementHistory: MemoryHistoryEvent[];
  regressionHistory: MemoryHistoryEvent[];
  practiceHistory: MemoryPracticeEntry[];
  /** How many recorded matches reinforced this memory. */
  reinforcementCount: number;
  confidenceHistory: MemoryConfidencePoint[];
  coachingSummary: string;
  active: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerMemoryQuery extends HabitQuery {
  includeArchived?: boolean;
}

export interface PlayerMemorySummary {
  playerId: string;
  primaryRole: RoleId | null;
  matchesRecorded: number;
  totalMemories: number;
  activeMemories: number;
  archivedMemories: number;
  longTermStrengths: string[];
  longTermWeaknesses: string[];
  improving: string[];
  regressing: string[];
  topPriorityMemoryId: string | null;
  topStrengthMemoryId: string | null;
  headline: string;
  updatedAt: string;
}

export interface PlayerMemoryTimelineEntry {
  sequence: number;
  matchId: string | null;
  timestamp: string | null;
  memoryId: string;
  label: string;
  kind: "recorded" | "improvement" | "regression";
  note: string;
}

export interface PlayerMemoryRecordOptions extends HabitRecordOptions {
  /** Scopes to materialize memories for. Defaults to universal + role. */
  scopes?: HabitScope[];
}

export interface PlayerMemoryOptions {
  playerId?: string;
  /** Bring your own Habit Intelligence engine (shared state) if desired. */
  habitEngine?: HabitEngineInstance;
  /** Clock injection keeps tests deterministic. */
  now?: () => string;
}

// ---------------------------------------------------------------------------
// Derivation helpers (pure)
// ---------------------------------------------------------------------------

const STRENGTH_MIN_MATCHES = 3;
const WEAKNESS_MIN_OCCURRENCES = 3;
const WEAKNESS_MIN_RATE = 0.34;
const DELTA_THRESHOLD = 5;

function memoryIdFor(habit: Habit): string {
  return `mem:${habit.id}`;
}

function standingFor(habit: Habit): MemoryStanding {
  if (habit.kind === "strength" || habit.status === "strength") return "strength";
  if (habit.status === "resolved") return "neutral";
  return "weakness";
}

function summarize(habit: Habit, standing: MemoryStanding): string {
  const topic = habit.curriculumTopicLabel || habit.curriculumTopic;
  const seen = `${habit.frequency.occurrences} of ${habit.frequency.matchesObserved} recorded games`;
  if (standing === "strength") {
    return `${habit.label} is a long-term strength — it has held up across ${seen}. Keep leaning on it while we work on ${topic.toLowerCase()} elsewhere.`;
  }
  if (standing === "neutral") {
    return `${habit.label} used to cost you games and has now settled — it showed in ${seen} and is trending clean. Maintenance only.`;
  }
  if (habit.trend === "improving") {
    return `${habit.label} is still a live habit (${seen}) but the recent trend is upward. Stay on the current ${topic.toLowerCase()} work.`;
  }
  if (habit.trend === "regressing") {
    return `${habit.label} has regressed recently (${seen}). This is the ${topic.toLowerCase()} pattern to attack first.`;
  }
  return `${habit.label} keeps repeating across ${seen}. It sits under ${topic} and remains a long-term weakness until the streak breaks.`;
}

function isLongTermStrength(habit: Habit): boolean {
  return (
    (habit.kind === "strength" || habit.status === "strength") &&
    habit.frequency.occurrences >= STRENGTH_MIN_MATCHES
  );
}

function isLongTermWeakness(habit: Habit): boolean {
  return (
    habit.kind !== "strength" &&
    habit.status !== "resolved" &&
    habit.frequency.occurrences >= WEAKNESS_MIN_OCCURRENCES &&
    habit.frequency.rate >= WEAKNESS_MIN_RATE
  );
}

// ---------------------------------------------------------------------------
// The Player Memory instance — in-memory only, no persistence
// ---------------------------------------------------------------------------

export interface PlayerMemoryLedgerInstance {
  /** Record one match worth of Unified Coaching Contexts into long-term memory. */
  record(
    input: UnifiedCoachingContext | UnifiedCoachingContext[],
    options?: PlayerMemoryRecordOptions,
  ): PlayerMemoryRecord[];
  /** Re-derive every memory from Habit Intelligence without new observations. */
  update(): PlayerMemoryRecord[];
  /** All memories, or one by memory id. */
  get(): PlayerMemoryRecord[];
  get(memoryId: string): PlayerMemoryRecord | undefined;
  getStrengths(query?: PlayerMemoryQuery): PlayerMemoryRecord[];
  getWeaknesses(query?: PlayerMemoryQuery): PlayerMemoryRecord[];
  getImproving(query?: PlayerMemoryQuery): PlayerMemoryRecord[];
  getRegressing(query?: PlayerMemoryQuery): PlayerMemoryRecord[];
  getPracticeHistory(query?: PlayerMemoryQuery): MemoryPracticeEntry[];
  getSummary(): PlayerMemorySummary;
  getTimeline(): PlayerMemoryTimelineEntry[];
  archive(memoryId: string): PlayerMemoryRecord | undefined;
  /** Escape hatch for consumers that also need raw habits. */
  habits(): HabitEngineInstance;
  reset(): void;
}

export function createPlayerMemoryLedger(
  options: PlayerMemoryOptions = {},
): PlayerMemoryLedgerInstance {
  const playerId = options.playerId ?? "local";
  const clock = options.now ?? (() => new Date().toISOString());
  const habitEngine = options.habitEngine ?? createHabitEngine();

  let memories = new Map<string, PlayerMemoryRecord>();
  const archived = new Set<string>();
  let scopes: HabitScope[] = ["universal", "role"];
  let matchesRecorded = 0;
  let lastMatch: { sequence: number; matchId: string | null; timestamp: string | null } = {
    sequence: -1,
    matchId: null,
    timestamp: null,
  };

  function currentHabits(): Habit[] {
    const seen = new Set<string>();
    const all: Habit[] = [];
    for (const scope of scopes) {
      for (const habit of habitEngine.aggregate(scope)) {
        if (seen.has(habit.id)) continue;
        seen.add(habit.id);
        all.push(habit);
      }
    }
    return all;
  }

  function mergePractice(
    existing: MemoryPracticeEntry[],
    ref: HabitPracticeRef,
    timestamp: string | null,
  ): MemoryPracticeEntry[] {
    const id = ref?.practiceId ?? ref?.curriculumTopic ?? "practice";
    const next = existing.map((e) => ({ ...e }));
    const match = next.find((e) => (e.practiceRef?.practiceId ?? e.practiceRef?.curriculumTopic) === id);
    if (match) {
      match.timesRecommended += 1;
      match.lastRecommended = timestamp;
      return next;
    }
    next.push({
      practiceRef: ref,
      timesRecommended: 1,
      firstRecommended: timestamp,
      lastRecommended: timestamp,
    });
    return next;
  }

  /** Fold the current habit aggregate into the long-term memory objects. */
  function sync(matchMeta = lastMatch): PlayerMemoryRecord[] {
    const now = clock();
    const next = new Map<string, PlayerMemoryRecord>();

    for (const habit of currentHabits()) {
      const memoryId = memoryIdFor(habit);
      const previous = memories.get(memoryId);
      const standing = standingFor(habit);
      const priority = habit.practicePriority;
      const point: MemoryTrendPoint = {
        sequence: matchMeta.sequence,
        matchId: habit.lastSeen.matchId ?? matchMeta.matchId,
        timestamp: habit.lastSeen.timestamp ?? matchMeta.timestamp,
        priority,
        confidence: habit.confidence,
        trend: habit.trend,
        occurrences: habit.frequency.occurrences,
      };

      const trendHistory = previous ? [...previous.trendHistory] : [];
      const lastPoint = trendHistory[trendHistory.length - 1];
      const isNewPoint = !lastPoint || lastPoint.sequence !== point.sequence;
      if (isNewPoint) trendHistory.push(point);
      else trendHistory[trendHistory.length - 1] = point;

      const improvementHistory = previous ? [...previous.improvementHistory] : [];
      const regressionHistory = previous ? [...previous.regressionHistory] : [];
      if (lastPoint && isNewPoint) {
        const delta = Math.round((point.priority - lastPoint.priority) * 10) / 10;
        if (delta <= -DELTA_THRESHOLD) {
          improvementHistory.push({
            sequence: point.sequence,
            matchId: point.matchId,
            timestamp: point.timestamp,
            delta,
            note: `${habit.label} eased off — practice priority dropped ${Math.abs(delta)} points.`,
          });
        } else if (delta >= DELTA_THRESHOLD) {
          regressionHistory.push({
            sequence: point.sequence,
            matchId: point.matchId,
            timestamp: point.timestamp,
            delta,
            note: `${habit.label} came back — practice priority rose ${delta} points.`,
          });
        }
      }

      const confidenceHistory = previous ? [...previous.confidenceHistory] : [];
      const lastConfidence = confidenceHistory[confidenceHistory.length - 1];
      if (!lastConfidence || lastConfidence.sequence !== point.sequence) {
        confidenceHistory.push({
          sequence: point.sequence,
          timestamp: point.timestamp,
          confidence: habit.confidence,
        });
      } else {
        confidenceHistory[confidenceHistory.length - 1] = {
          sequence: point.sequence,
          timestamp: point.timestamp,
          confidence: habit.confidence,
        };
      }

      const practiceHistory =
        habit.practiceRecommendationRef && isNewPoint
          ? mergePractice(previous?.practiceHistory ?? [], habit.practiceRecommendationRef, point.timestamp)
          : (previous?.practiceHistory ?? []);

      next.set(memoryId, {
        memoryId,
        decisionId: habit.decisionId,
        leagueDecisionId: habit.leagueDecisionId,
        fundamental: habit.fundamental,
        curriculumTopic: habit.curriculumTopic,
        curriculumTopicLabel: habit.curriculumTopicLabel,
        role: habit.role,
        ...(habit.champion ? { champion: habit.champion } : {}),
        scope: habit.scope,
        habitRef: habit.id,
        label: habit.label,
        standing,
        trendHistory,
        longTermStrength: isLongTermStrength(habit) || (previous?.longTermStrength ?? false),
        longTermWeakness: isLongTermWeakness(habit),
        improvementHistory,
        regressionHistory,
        practiceHistory,
        reinforcementCount: habit.frequency.occurrences,
        confidenceHistory,
        coachingSummary: summarize(habit, standing),
        active: !archived.has(memoryId) && habit.status !== "resolved",
        archived: archived.has(memoryId),
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      });
    }

    // Memories whose habits no longer aggregate are kept, marked inactive.
    for (const [id, memory] of memories) {
      if (!next.has(id)) next.set(id, { ...memory, active: false });
    }

    memories = next;
    return listMemories();
  }

  function listMemories(): PlayerMemoryRecord[] {
    return Array.from(memories.values()).sort((a, b) => {
      const ap = a.trendHistory[a.trendHistory.length - 1]?.priority ?? 0;
      const bp = b.trendHistory[b.trendHistory.length - 1]?.priority ?? 0;
      return bp - ap || a.memoryId.localeCompare(b.memoryId);
    });
  }

  function matchesQuery(m: PlayerMemoryRecord, q: PlayerMemoryQuery = {}): boolean {
    if (!q.includeArchived && m.archived) return false;
    if (q.scope && m.scope !== q.scope) return false;
    if (q.role && m.role !== q.role) return false;
    if (q.champion && m.champion !== q.champion) return false;
    if (q.fundamental && m.fundamental !== q.fundamental) return false;
    if (q.kind === "strength" && m.standing !== "strength") return false;
    if (q.kind === "weakness" && m.standing !== "weakness") return false;
    return true;
  }

  function query(q: PlayerMemoryQuery = {}): PlayerMemoryRecord[] {
    return listMemories().filter((m) => matchesQuery(m, q));
  }

  function latestTrend(m: PlayerMemoryRecord): HabitTrend {
    return m.trendHistory[m.trendHistory.length - 1]?.trend ?? "unknown";
  }

  const instance: PlayerMemoryLedgerInstance = {
    record(input, opts = {}) {
      const list = Array.isArray(input) ? input : [input];
      if (opts.scopes?.length) scopes = [...opts.scopes];
      const recorded = habitEngine.record(list, opts);
      if (recorded.length) {
        matchesRecorded += 1;
        lastMatch = {
          sequence: recorded[0].sequence,
          matchId: recorded[0].matchId,
          timestamp: recorded[0].timestamp,
        };
      }
      return sync();
    },
    update() {
      return sync();
    },
    get(memoryId?: string) {
      if (memoryId === undefined) return listMemories();
      return memories.get(memoryId);
    },
    getStrengths(q = {}) {
      return query({ ...q, kind: "strength" }).sort(
        (a, b) => b.reinforcementCount - a.reinforcementCount,
      );
    },
    getWeaknesses(q = {}) {
      return query({ ...q, kind: "weakness" });
    },
    getImproving(q = {}) {
      return query(q).filter(
        (m) => latestTrend(m) === "improving" || m.improvementHistory.length > 0,
      );
    },
    getRegressing(q = {}) {
      return query(q).filter(
        (m) => latestTrend(m) === "regressing" || m.regressionHistory.length > 0,
      );
    },
    getPracticeHistory(q = {}) {
      const merged = new Map<string, MemoryPracticeEntry>();
      for (const m of query(q)) {
        for (const entry of m.practiceHistory) {
          const id = entry.practiceRef?.practiceId ?? entry.practiceRef?.curriculumTopic ?? m.memoryId;
          const existing = merged.get(id);
          if (!existing) {
            merged.set(id, { ...entry });
            continue;
          }
          existing.timesRecommended += entry.timesRecommended;
          existing.lastRecommended = entry.lastRecommended ?? existing.lastRecommended;
        }
      }
      return Array.from(merged.values()).sort((a, b) => b.timesRecommended - a.timesRecommended);
    },
    getSummary() {
      const all = listMemories();
      const active = all.filter((m) => !m.archived);
      const strengths = active.filter((m) => m.longTermStrength || m.standing === "strength");
      const weaknesses = active.filter((m) => m.standing === "weakness");
      const improving = instance.getImproving();
      const regressing = instance.getRegressing();
      const topWeakness = weaknesses[0] ?? null;
      const topStrength = strengths[0] ?? null;
      const headline = !matchesRecorded
        ? "No coaching history yet — import matches and your long-term memory starts building."
        : topWeakness
          ? `Across ${matchesRecorded} recorded games your defining pattern is ${topWeakness.label.toLowerCase()}${
              topStrength ? `, balanced by ${topStrength.label.toLowerCase()}` : ""
            }.`
          : `Across ${matchesRecorded} recorded games nothing repeats often enough to call a long-term weakness yet.`;
      return {
        playerId,
        primaryRole: active[0]?.role ?? null,
        matchesRecorded,
        totalMemories: all.length,
        activeMemories: active.filter((m) => m.active).length,
        archivedMemories: all.filter((m) => m.archived).length,
        longTermStrengths: strengths.map((m) => m.memoryId),
        longTermWeaknesses: weaknesses.filter((m) => m.longTermWeakness).map((m) => m.memoryId),
        improving: improving.map((m) => m.memoryId),
        regressing: regressing.map((m) => m.memoryId),
        topPriorityMemoryId: topWeakness?.memoryId ?? null,
        topStrengthMemoryId: topStrength?.memoryId ?? null,
        headline,
        updatedAt: all[0]?.updatedAt ?? clock(),
      };
    },
    getTimeline() {
      const entries: PlayerMemoryTimelineEntry[] = [];
      for (const m of listMemories()) {
        for (const p of m.trendHistory) {
          entries.push({
            sequence: p.sequence,
            matchId: p.matchId,
            timestamp: p.timestamp,
            memoryId: m.memoryId,
            label: m.label,
            kind: "recorded",
            note: `${m.label} observed (${p.occurrences} total, priority ${p.priority}).`,
          });
        }
        for (const e of m.improvementHistory) {
          entries.push({ ...e, memoryId: m.memoryId, label: m.label, kind: "improvement" });
        }
        for (const e of m.regressionHistory) {
          entries.push({ ...e, memoryId: m.memoryId, label: m.label, kind: "regression" });
        }
      }
      return entries.sort(
        (a, b) => a.sequence - b.sequence || a.memoryId.localeCompare(b.memoryId),
      );
    },
    archive(memoryId) {
      const memory = memories.get(memoryId);
      if (!memory) return undefined;
      archived.add(memoryId);
      const updated: PlayerMemoryRecord = {
        ...memory,
        archived: true,
        active: false,
        updatedAt: clock(),
      };
      memories.set(memoryId, updated);
      return updated;
    },
    habits() {
      return habitEngine;
    },
    reset() {
      memories = new Map();
      archived.clear();
      matchesRecorded = 0;
      lastMatch = { sequence: -1, matchId: null, timestamp: null };
      scopes = ["universal", "role"];
      habitEngine.reset();
    },
  };

  return instance;
}

/**
 * Shared, in-memory Player Memory. Consumers that need isolated state build
 * their own with `createPlayerMemoryLedger()`. Nothing is persisted anywhere.
 */
export const PlayerMemoryLedger = Object.assign(createPlayerMemoryLedger(), {
  create: createPlayerMemoryLedger,
  /** One-shot helper: derive long-term memories from a batch of matches. */
  from(
    matches: { contexts: UnifiedCoachingContext[]; matchId?: string; timestamp?: string; champion?: string }[],
    options: PlayerMemoryOptions = {},
  ): PlayerMemoryRecord[] {
    const ledger = createPlayerMemoryLedger(options);
    for (const m of matches) {
      ledger.record(m.contexts, {
        matchId: m.matchId ?? null,
        timestamp: m.timestamp ?? null,
        ...(m.champion ? { champion: m.champion, scopes: ["universal", "role", "champion"] as HabitScope[] } : {}),
      });
    }
    return ledger.get();
  },
});

export type PlayerMemoryLedgerFacade = typeof PlayerMemoryLedger;
