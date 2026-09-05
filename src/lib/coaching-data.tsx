// ---------------------------------------------------------------------------
// BotDiff Coaching Library adapter
//
// Single source of truth: this module derives every coaching surface
// (insights, tasks, goals, reports) DIRECTLY from the player-memory
// `CoachDossier`. There is no separate/legacy summary engine anymore — the
// Coaching Library, the AI Coach page and the dashboard all read from the same
// dossier so they can never show conflicting coaching.
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import { useCoachDossier } from "@/hooks/use-coach-dossier";
import type { CoachDossier, CoachPattern } from "./player-memory";

export type CoachingCategory =
  | "Laning"
  | "Wave Management"
  | "Trading"
  | "Farming"
  | "Vision"
  | "Map Awareness"
  | "Dragon & Baron Prep"
  | "Positioning"
  | "Team Fighting"
  | "Champion Mastery"
  | "Macro"
  | "Decision Making"
  | "Reliable Play";

export const COACHING_CATEGORIES: CoachingCategory[] = [
  "Laning",
  "Wave Management",
  "Trading",
  "Farming",
  "Vision",
  "Map Awareness",
  "Dragon & Baron Prep",
  "Positioning",
  "Team Fighting",
  "Champion Mastery",
  "Macro",
  "Decision Making",
  "Reliable Play",
];

export type Severity = "Low" | "Medium" | "High";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type GoalStatus =
  | "Not Started"
  | "In Progress"
  | "On Track"
  | "Achieved"
  | "Needs Work"
  | "New Focus"
  | "Needs More Data";
export type ProgressTrend = "Improving" | "Steady" | "Declining";

/**
 * A single, actionable coaching insight. This is the atomic unit the future AI
 * layer will produce. Each insight answers: what, why, and how to fix it.
 */
export interface CoachInsight {
  id: string;
  title: string;
  category: CoachingCategory;
  severity: Severity;
  /** 0-100 model confidence in this insight. */
  confidence: number;
  description: string;
  whyItMatters: string;
  recommendedAction: string;
  expectedImprovement: string;
  /** e.g. "+45 LP / month". */
  estimatedLpImpact: string;
  practiceDifficulty: Difficulty;
  /** e.g. "10 minutes". */
  estimatedPracticeTime: string;
  /** Concrete situations pulled from recent games. */
  examples: string[];
  /** Reserved for future AI-generated reasoning / notes. */
  aiNotes?: string;
  /** Improvement tracking for the underlying skill. */
  tracking: InsightTracking;
  /** Marks the single highest-priority insight (Today's Focus). */
  isTopPriority?: boolean;
}

/**
 * Player-readable tracking. Every field is either a real measured metric or an
 * observed occurrence count — never an abstract 0-100 rating.
 */
export interface InsightTracking {
  /** What the player is doing now, e.g. "5.5 CS/min" or "4 of last 6 games". */
  currentLabel: string;
  /** The next achievable goal, or null when BotDiff cannot set one honestly. */
  goalLabel: string | null;
  /** What the current measurement is called, e.g. "CS / min". */
  measureLabel: string;
  /** 0-1 progress, only when it is mathematically explainable. */
  progress: number | null;
  /** When BotDiff will look at this again. */
  evaluation: string | null;
  trend?: ProgressTrend;
  status: GoalStatus;
}

export interface PracticeTask {
  id: string;
  label: string;
  category: CoachingCategory;
  difficulty: Difficulty;
  /** e.g. "5 minutes" or "1 game". */
  estimatedDuration: string;
  done: boolean;
}

export interface ImprovementGoal {
  id: string;
  title: string;
  detail: string;
  category: CoachingCategory;
  /** What the measurement is called, e.g. "Deaths / game". */
  measureLabel: string;
  /** e.g. "9.0/game" or "Recurring in recent matches". */
  currentLabel: string;
  /** e.g. "≤ 7.0/game" — null when no honest goal exists yet. */
  goalLabel: string | null;
  /** e.g. "Next 5 comparable games". */
  evaluation: string | null;
  /** 0-1, only when the movement baseline → goal is explainable. */
  progress: number | null;
  trend?: ProgressTrend;
  status: GoalStatus;
}


/**
 * A point-in-time coaching report. Today these are hand-authored demo reports;
 * future Riot analysis simply appends new `CoachingReport` objects to history.
 */
export interface CoachingReport {
  id: string;
  date: string; // display date, e.g. "Jul 1, 2026"
  timeAgo: string;
  title: string;
  summary: string;
  overallGrade: string;
  gamesAnalyzed: number;
  /** Insight ids surfaced in this report. */
  insightIds: string[];
  highlights: string[];
  focusCategory: CoachingCategory;
}

export interface CoachingEngineData {
  insights: CoachInsight[];
  tasks: PracticeTask[];
  goals: ImprovementGoal[];
  reports: CoachingReport[];
}

// --- Dossier → coaching-library derivation ---------------------------------

const CATEGORY_MAP: Record<CoachPattern["category"], CoachingCategory> = {
  lane: "Laning",
  wave: "Wave Management",
  positioning: "Positioning",
  decision: "Decision Making",
  objective: "Dragon & Baron Prep",
  teamfight: "Team Fighting",
  champion: "Champion Mastery",
  farming: "Farming",
  vision: "Vision",
};

function severityFrom(p: CoachPattern): Severity {
  if (p.rate >= 0.6 || p.streak >= 3) return "High";
  if (p.rate >= 0.35) return "Medium";
  return "Low";
}

function lpImpact(p: CoachPattern): string {
  return p.rate >= 0.6 ? "High" : p.rate >= 0.35 ? "Moderate" : "Situational";
}

function gradeFromWinRate(wr: number): string {
  if (wr >= 60) return "A";
  if (wr >= 55) return "A-";
  if (wr >= 52) return "B+";
  if (wr >= 48) return "B";
  if (wr >= 45) return "B-";
  return "C";
}

/** Real coaching metrics → player-readable League categories. */
const METRIC_CATEGORY: Record<string, CoachingCategory> = {
  cs: "Farming",
  gold: "Farming",
  deaths: "Positioning",
  kda: "Team Fighting",
  kp: "Team Fighting",
  damage: "Team Fighting",
  vision: "Vision",
  objective: "Dragon & Baron Prep",
};

/** Occurrence goal: cut a repeating habit to at most this many of the next 5 games. */
function occurrenceGoal(count: number): number {
  return Math.max(0, Math.min(1, Math.floor(count / 3)));
}

/** The plan entry (if any) that already measures this pattern with a real metric. */
function planEntryFor(p: CoachPattern, d: CoachDossier) {
  return d.plan.queue.find(
    (e) =>
      e.issueLabel.toLowerCase() === p.title.toLowerCase() ||
      METRIC_CATEGORY[e.metric] === (CATEGORY_MAP[p.category] ?? "Macro"),
  );
}

function trackingFromPattern(p: CoachPattern, d: CoachDossier): InsightTracking {
  const entry = planEntryFor(p, d);
  // A real measured metric always wins over an occurrence estimate.
  if (entry?.target) {
    return {
      measureLabel: entry.metricName,
      currentLabel: `${entry.baseline}${entry.unit}`,
      goalLabel: `${entry.target.direction === "lower" ? "≤ " : ""}${entry.target.value}${entry.target.unit}`,
      progress: entry.target.progress,
      evaluation: entry.target.evaluationWindow,
      trend: p.streak >= 3 ? "Declining" : "Steady",
      status: entry.target.progress >= 1 ? "Achieved" : entry.slot === "active" ? "In Progress" : "Not Started",
    };
  }
  if (entry) {
    return {
      measureLabel: entry.metricName,
      currentLabel: `${entry.baseline}${entry.unit}`,
      goalLabel: null,
      progress: null,
      evaluation: null,
      status: "Needs More Data",
    };
  }
  // No supporting metric — coach the observed occurrences instead, never a rating.
  return {
    measureLabel: "Observed",
    currentLabel: `${p.count} of last ${d.matchesAnalyzed} games`,
    goalLabel: `≤ ${occurrenceGoal(p.count)} of your next 5 games`,
    progress: null,
    evaluation: "Reviewed after your next 5 games",
    trend: p.streak >= 3 ? "Declining" : "Steady",
    status: p.streak >= 3 ? "Needs Work" : "In Progress",
  };
}

function insightFromPattern(p: CoachPattern, d: CoachDossier, top: boolean): CoachInsight {
  const isPlanTarget = d.improvementPlan.biggestWeakness === p.title;
  return {
    id: p.id,
    title: p.title,
    category: CATEGORY_MAP[p.category] ?? "Macro",
    severity: severityFrom(p),
    confidence: Math.min(96, 55 + p.count * 6),
    description: p.detail,
    whyItMatters: `This pattern showed up in ${p.count} of your last ${d.matchesAnalyzed} games${
      p.streak >= 3 ? ` — the last ${p.streak} in a row` : ""
    }. Recurring habits, not one-off mistakes, are what decide your rank.`,
    recommendedAction: isPlanTarget
      ? d.improvementPlan.practiceGoal
      : `Target "${p.title.toLowerCase()}" specifically for your next 5 games.`,
    expectedImprovement: isPlanTarget
      ? d.improvementPlan.expectedImprovement
      : "Removing a recurring habit shows up as steadier grades and fewer avoidable losses.",
    estimatedLpImpact: lpImpact(p),
    practiceDifficulty: "Medium",
    estimatedPracticeTime: "10–15 minutes",
    examples: [
      `Observed in ${p.count} of ${d.matchesAnalyzed} games (${Math.round(p.rate * 100)}%).`,
      ...(p.streak >= 2 ? [`Current streak: ${p.streak} games in a row.`] : []),
    ],
    aiNotes: isPlanTarget ? d.improvementPlan.why : undefined,
    tracking: trackingFromPattern(p, d),
    isTopPriority: top,
  };
}

/** Coaching goals come from the authoritative plan queue — real metrics only. */
function goalsFromPlan(d: CoachDossier): ImprovementGoal[] {
  const active: ImprovementGoal[] = d.plan.queue.map((e) => ({
    id: `goal-${e.metric}-${e.scopeId}`,
    title: e.issueLabel,
    detail: e.headline,
    category: METRIC_CATEGORY[e.metric] ?? "Macro",
    measureLabel: e.metricName,
    currentLabel: `${e.baseline}${e.unit}`,
    goalLabel: e.target
      ? `${e.target.direction === "lower" ? "≤ " : ""}${e.target.value}${e.target.unit}`
      : null,
    evaluation: e.target?.evaluationWindow ?? null,
    progress: e.target ? e.target.progress : null,
    status: e.target
      ? e.target.progress >= 1
        ? "Achieved"
        : e.slot === "active"
          ? "In Progress"
          : e.slot === "next"
            ? "New Focus"
            : "Not Started"
      : "Needs More Data",
  }));

  const completed: ImprovementGoal[] = d.plan.history.slice(0, 3).map((h, i) => ({
    id: `goal-done-${h.metric}-${i}`,
    title: h.issueLabel,
    detail: `${h.scopeLabel} · ${h.sampleSize} games`,
    category: METRIC_CATEGORY[h.metric] ?? "Macro",
    measureLabel: h.metricName,
    currentLabel: h.journey,
    goalLabel: null,
    evaluation: null,
    progress: 1,
    status: "Achieved",
  }));

  return [...active, ...completed];
}

function deriveCoachingData(d: CoachDossier): CoachingEngineData {
  const patterns = d.weaknessPatterns.length
    ? d.weaknessPatterns
    : ([] as CoachPattern[]);

  const insights: CoachInsight[] = patterns.map((p, i) => insightFromPattern(p, d, i === 0));

  if (insights.length === 0) {
    const consistency = d.performanceConsistency.find((c) => c.available && c.typicalRange);
    insights.push({
      id: "consistency",
      title: consistency
        ? `Your ${consistency.name.toLowerCase()} swings game to game`
        : "Not enough games yet to name a focus",
      category: "Reliable Play",
      severity: "Medium",
      confidence: 70,
      description: consistency?.summary ?? d.improvementPlan.why,
      whyItMatters: consistency
        ? `Steady ${consistency.name.toLowerCase()} is what turns a good game into a good week — right now your games look very different from each other.`
        : "BotDiff waits for enough comparable games before naming a focus, rather than guessing.",
      recommendedAction: d.improvementPlan.practiceGoal,
      expectedImprovement: d.improvementPlan.expectedImprovement,
      estimatedLpImpact: "High",
      practiceDifficulty: "Medium",
      estimatedPracticeTime: "Ongoing",
      examples: consistency?.typicalRange
        ? [
            `Recent range: ${consistency.typicalRange.low}${consistency.unit} – ${consistency.typicalRange.high}${consistency.unit} across ${consistency.sampleSize} games.`,
          ]
        : ["BotDiff needs more comparable games before it can measure this."],
      tracking: consistency?.typicalRange
        ? {
            measureLabel: consistency.name,
            currentLabel: `${consistency.average}${consistency.unit} (typically ${consistency.typicalRange.low}–${consistency.typicalRange.high}${consistency.unit})`,
            goalLabel: `Stay at or above ${consistency.average}${consistency.unit} in 4 of your next 5 games`,
            progress: null,
            evaluation: "Reviewed after your next 5 games",
            status: "In Progress",
          }
        : {
            measureLabel: "Status",
            currentLabel: "Needs more data",
            goalLabel: null,
            progress: null,
            evaluation: null,
            status: "Needs More Data",
          },
      isTopPriority: true,
    });
  }

  const focusCategory = insights[0]?.category ?? "Macro";

  const tasks: PracticeTask[] = d.practicePlan.map((label, i) => ({
    id: `task-${i}`,
    label,
    category: focusCategory,
    difficulty: i === 0 ? "Medium" : "Easy",
    estimatedDuration: "10 minutes",
    done: false,
  }));

  const goals = goalsFromPlan(d);

  const upTrends = d.trends.filter((t) => t.improved && t.direction !== "flat");
  const downTrends = d.trends.filter((t) => !t.improved && t.direction !== "flat");
  const highlights = [
    ...upTrends.slice(0, 2).map((t) => `${t.label} improving (${t.previous} → ${t.current}).`),
    ...downTrends.slice(0, 2).map((t) => `${t.label} slipping (${t.previous} → ${t.current}).`),
  ];
  if (highlights.length === 0) highlights.push("Metrics holding steady across recent games.");

  const reports: CoachingReport[] = [
    {
      id: "report-current",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      timeAgo: "Latest",
      title: `${d.biggestImprovementArea} is your climb ceiling`,
      summary: d.weeklySummary,
      overallGrade: gradeFromWinRate(d.winRate),
      gamesAnalyzed: d.matchesAnalyzed,
      insightIds: insights.slice(0, 3).map((i) => i.id),
      highlights,
      focusCategory,
    },
  ];

  return { insights, tasks, goals, reports };
}


// --- Hooks -----------------------------------------------------------------

/**
 * Single interface every coaching surface consumes. Derived live from the
 * player-memory dossier — the app's one coaching source of truth.
 */
export function useCoachingData(): CoachingEngineData {
  const { dossier } = useCoachDossier();
  return useMemo(() => deriveCoachingData(dossier), [dossier]);
}

/** The single highest-priority insight, surfaced as "Today's Focus". */
export function useTodaysFocusInsight(): CoachInsight {
  const { insights } = useCoachingData();
  return insights.find((i) => i.isTopPriority) ?? insights[0];
}

/** Groups insights by category for the coaching library. */
export function groupInsightsByCategory(
  insights: CoachInsight[],
): { category: CoachingCategory; insights: CoachInsight[] }[] {
  return COACHING_CATEGORIES.map((category) => ({
    category,
    insights: insights.filter((i) => i.category === category),
  })).filter((g) => g.insights.length > 0);
}

export const severityTone: Record<Severity, "danger" | "warning" | "success"> = {
  High: "danger",
  Medium: "warning",
  Low: "success",
};

export const trendTone: Record<ProgressTrend, "success" | "neutral" | "danger"> = {
  Improving: "success",
  Steady: "neutral",
  Declining: "danger",
};

export const statusTone: Record<GoalStatus, "neutral" | "primary" | "success" | "warning"> = {
  "Not Started": "neutral",
  "In Progress": "warning",
  "On Track": "primary",
  Achieved: "success",
  "Needs Work": "warning",
  "New Focus": "primary",
  "Needs More Data": "neutral",
};

    const pct = ((worst - goal.current) / (worst - goal.target)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }
  return Math.max(0, Math.min(100, Math.round((goal.current / goal.target) * 100)));
}