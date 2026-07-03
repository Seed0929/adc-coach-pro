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
  | "Objective Control"
  | "Positioning"
  | "Team Fighting"
  | "Champion Mastery"
  | "Macro"
  | "Decision Making"
  | "Mental / Consistency";

export const COACHING_CATEGORIES: CoachingCategory[] = [
  "Laning",
  "Wave Management",
  "Trading",
  "Farming",
  "Vision",
  "Map Awareness",
  "Objective Control",
  "Positioning",
  "Team Fighting",
  "Champion Mastery",
  "Macro",
  "Decision Making",
  "Mental / Consistency",
];

export type Severity = "Low" | "Medium" | "High";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type GoalStatus = "Not Started" | "In Progress" | "On Track" | "Achieved";
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

export interface InsightTracking {
  currentScore: number; // 0-100
  goalScore: number; // 0-100
  trend: ProgressTrend;
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
  current: number;
  target: number;
  /** Unit label, e.g. "CS/min", "LP", "deaths". */
  unit: string;
  trend: ProgressTrend;
  status: GoalStatus;
  /** Lower numbers are better for this metric (e.g. deaths). */
  invert?: boolean;
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
  objective: "Objective Control",
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

function insightFromPattern(p: CoachPattern, d: CoachDossier, top: boolean): CoachInsight {
  const isPlanTarget = d.improvementPlan.biggestWeakness === p.title;
  const currentScore = Math.max(10, Math.round(100 - p.rate * 70));
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
    tracking: {
      currentScore,
      goalScore: Math.min(100, currentScore + 20),
      trend: p.streak >= 3 ? "Declining" : "Steady",
      status: "In Progress",
    },
    isTopPriority: top,
  };
}

function deriveCoachingData(d: CoachDossier): CoachingEngineData {
  const patterns = d.weaknessPatterns.length
    ? d.weaknessPatterns
    : ([] as CoachPattern[]);

  const insights: CoachInsight[] = patterns.map((p, i) => insightFromPattern(p, d, i === 0));

  if (insights.length === 0) {
    insights.push({
      id: "consistency",
      title: "Consistency is your climb ceiling",
      category: "Mental / Consistency",
      severity: "Medium",
      confidence: 70,
      description: d.improvementPlan.why,
      whyItMatters: d.consistency.explanation,
      recommendedAction: d.improvementPlan.practiceGoal,
      expectedImprovement: d.improvementPlan.expectedImprovement,
      estimatedLpImpact: "High",
      practiceDifficulty: "Medium",
      estimatedPracticeTime: "Ongoing",
      examples: [`Consistency is ${d.consistency.current}/100 across your last ${d.matchesAnalyzed} games.`],
      tracking: {
        currentScore: d.consistency.current,
        goalScore: 85,
        trend: d.consistency.weeklyTrend > 2 ? "Improving" : d.consistency.weeklyTrend < -2 ? "Declining" : "Steady",
        status: "In Progress",
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

  const consistencyTrend: ProgressTrend =
    d.consistency.weeklyTrend > 2 ? "Improving" : d.consistency.weeklyTrend < -2 ? "Declining" : "Steady";
  const wrTrend: ProgressTrend =
    d.winRate >= 55 ? "Improving" : d.winRate <= 45 ? "Declining" : "Steady";

  const goals: ImprovementGoal[] = [
    {
      id: "goal-consistency",
      title: "Raise your consistency",
      detail: d.consistency.explanation,
      category: "Mental / Consistency",
      current: d.consistency.current,
      target: 85,
      unit: "/100",
      trend: consistencyTrend,
      status: d.consistency.current >= 85 ? "Achieved" : "In Progress",
    },
    {
      id: "goal-winrate",
      title: "Reach a 55% win rate",
      detail: `Currently ${d.winRate}% over ${d.matchesAnalyzed} games.`,
      category: "Macro",
      current: d.winRate,
      target: 55,
      unit: "% WR",
      trend: wrTrend,
      status: d.winRate >= 55 ? "Achieved" : "In Progress",
    },
    ...patterns.slice(0, 3).map((p) => {
      const cur = Math.max(10, Math.round(100 - p.rate * 70));
      return {
        id: `goal-${p.id}`,
        title: `Fix: ${p.title}`,
        detail: p.detail,
        category: CATEGORY_MAP[p.category] ?? "Macro",
        current: cur,
        target: Math.min(100, cur + 20),
        unit: "rating",
        trend: (p.streak >= 3 ? "Declining" : "Improving") as ProgressTrend,
        status: "In Progress" as GoalStatus,
      };
    }),
  ];

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
};

/** Percentage complete for a goal, accounting for inverted (lower-is-better) metrics. */
export function goalProgress(goal: ImprovementGoal): number {
  if (goal.invert) {
    // Assume a sensible worst-case start of target + 4 for inverted metrics.
    const worst = goal.target + 4;
    const pct = ((worst - goal.current) / (worst - goal.target)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }
  return Math.max(0, Math.min(100, Math.round((goal.current / goal.target) * 100)));
}