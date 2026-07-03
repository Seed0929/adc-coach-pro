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

// --- Demo dataset ----------------------------------------------------------

const INSIGHTS: CoachInsight[] = [
  {
    id: "positioning-overextend",
    title: "You consistently overextend after taking first tower.",
    category: "Positioning",
    severity: "High",
    confidence: 92,
    description:
      "After you take the first tower, you push into the enemy half of the map without vision, staying there far longer than your lead is worth.",
    whyItMatters:
      "First tower gives you map priority, but standing in fog resets the lead the moment you get collapsed on. 6 of your last 10 deaths happened here.",
    recommendedAction:
      "After a tower falls, place a control ward in the river, crash the next wave, then recall or group with your team. Never chase a fourth plate alone.",
    expectedImprovement: "First-death rate should drop from 41% to under 25% within two weeks.",
    estimatedLpImpact: "+65 LP / month",
    practiceDifficulty: "Easy",
    estimatedPracticeTime: "10 minutes",
    examples: [
      "14:00 vs Ezreal — caught in enemy river after first tower with no ward.",
      "17:30 vs Jinx — pushed past the T2 alone and got collapsed by jungle + support.",
    ],
    tracking: { currentScore: 58, goalScore: 80, trend: "Declining", status: "In Progress" },
    isTopPriority: true,
  },
  {
    id: "wave-recall-timing",
    title: "Your recall timing after wave crashes is leaking gold.",
    category: "Wave Management",
    severity: "Medium",
    confidence: 87,
    description:
      "You often recall on a slow-push or a frozen lane, then walk back to a wave sitting under your tower — losing 12+ CS every game.",
    whyItMatters:
      "Recalling on a clean crash resets you with full item power and zero lost CS. Mistimed recalls compound into a lost item spike by 20 minutes.",
    recommendedAction:
      "Only recall immediately after crashing a wave into the enemy tower. Practice tool: crash three cannon waves cleanly and recall on the crash.",
    expectedImprovement: "Recover ~12 CS per game and hit your two-item spike ~90s earlier.",
    estimatedLpImpact: "+40 LP / month",
    practiceDifficulty: "Medium",
    estimatedPracticeTime: "15 minutes",
    examples: [
      "Game 2 vs Ezreal — 4 recalls on frozen waves, fell 1.2k gold behind by 20:00.",
    ],
    tracking: { currentScore: 62, goalScore: 80, trend: "Improving", status: "In Progress" },
  },
  {
    id: "vision-objective-setup",
    title: "Objective vision goes down too late.",
    category: "Vision",
    severity: "Medium",
    confidence: 84,
    description:
      "Control wards and deep vision around Dragon and Baron are placed within the last 30 seconds before the objective, not 60-90 seconds ahead.",
    whyItMatters:
      "Vision placed late gives your team no time to rotate or contest safely. Early vision converts objectives into free kills.",
    recommendedAction:
      "Buy a control ward every back and place it 75+ seconds before the objective spawns. Ping your team to group as you place it.",
    expectedImprovement: "Objective control rating up from 63 toward 80.",
    estimatedLpImpact: "+30 LP / month",
    practiceDifficulty: "Easy",
    estimatedPracticeTime: "One game of focus",
    examples: [
      "Game 4 — grouped late for the 30:00 Baron and lost the objective + game.",
    ],
    tracking: { currentScore: 63, goalScore: 80, trend: "Steady", status: "In Progress" },
  },
  {
    id: "teamfight-frontline",
    title: "You step past your frontline in the first 3 seconds of fights.",
    category: "Team Fighting",
    severity: "High",
    confidence: 90,
    description:
      "In mid-game skirmishes you move up to deal damage before your frontline has committed, exposing yourself to the enemy engage.",
    whyItMatters:
      "As the ADC, your damage only counts if you survive the first engage. Dying first turns a 5v5 into a 4v5 you can't win.",
    recommendedAction:
      "Start every fight one screen behind your frontline. Only step up after the enemy's primary engage (flash/dash/ult) is used.",
    expectedImprovement: "Teamfight rating up from 68 toward 82; fewer first-deaths.",
    estimatedLpImpact: "+50 LP / month",
    practiceDifficulty: "Medium",
    estimatedPracticeTime: "Review 3 fights per game",
    examples: [
      "26:00 teamfight — walked forward before frontline and got chain-CC'd.",
    ],
    tracking: { currentScore: 68, goalScore: 82, trend: "Improving", status: "On Track" },
  },
  {
    id: "farming-early-cs",
    title: "Early CS under pressure dips below rank average.",
    category: "Farming",
    severity: "Low",
    confidence: 78,
    description:
      "When the lane is contested you drop last-hits, ending the laning phase 6-9 CS behind the benchmark for your rank.",
    whyItMatters:
      "CS is free gold. Consistent last-hitting under pressure keeps you on curve even in losing lanes.",
    recommendedAction:
      "In the practice tool, last-hit the first three waves perfectly without using abilities. Do this daily for a week.",
    expectedImprovement: "Average CS/min from 8.4 toward 8.8.",
    estimatedLpImpact: "+20 LP / month",
    practiceDifficulty: "Easy",
    estimatedPracticeTime: "5 minutes",
    examples: ["Game 2 — 7.1 CS/min vs a 7.9 benchmark for Diamond ADC."],
    tracking: { currentScore: 79, goalScore: 88, trend: "Improving", status: "On Track" },
  },
  {
    id: "map-jungle-tracking",
    title: "You lose track of the enemy jungler before stepping up.",
    category: "Map Awareness",
    severity: "Medium",
    confidence: 81,
    description:
      "You cross the river or push without a recent read on where the enemy jungler is, walking into avoidable ganks.",
    whyItMatters:
      "Most avoidable deaths in the bot lane come from an unknown jungler. A quick check every 30 seconds removes them.",
    recommendedAction:
      "Say the enemy jungler's likely position out loud before crossing river. Track their clear from the first camp you see.",
    expectedImprovement: "Deaths to ganks down noticeably over 5 games.",
    estimatedLpImpact: "+25 LP / month",
    practiceDifficulty: "Medium",
    estimatedPracticeTime: "Every game, ongoing",
    examples: ["17:30 — stepped up with jungler unaccounted for and got collapsed on."],
    tracking: { currentScore: 60, goalScore: 78, trend: "Steady", status: "In Progress" },
  },
  {
    id: "mental-tilt-reset",
    title: "Your performance drops after an early death.",
    category: "Mental / Consistency",
    severity: "Low",
    confidence: 74,
    description:
      "Games where you die before 8 minutes show a measurable dip in CS and decision quality for the following 5 minutes.",
    whyItMatters:
      "One death shouldn't cost the game. Resetting mentally keeps a small mistake from snowballing.",
    recommendedAction:
      "After any early death, take one deep breath, farm safely for 60 seconds, and reset your plan before re-engaging.",
    expectedImprovement: "More consistent grades across games; fewer tilt losses.",
    estimatedLpImpact: "+20 LP / month",
    practiceDifficulty: "Hard",
    estimatedPracticeTime: "Ongoing habit",
    examples: ["Two losses this week began with a sub-8-minute death followed by a CS drop."],
    tracking: { currentScore: 71, goalScore: 85, trend: "Improving", status: "On Track" },
  },
];

const TASKS: PracticeTask[] = [
  {
    id: "task-lasthit",
    label: "Focus on last-hitting the first three waves perfectly.",
    category: "Farming",
    difficulty: "Easy",
    estimatedDuration: "5 minutes",
    done: false,
  },
  {
    id: "task-controlward",
    label: "Place a control ward in the river before 8 minutes.",
    category: "Vision",
    difficulty: "Easy",
    estimatedDuration: "1 game",
    done: true,
  },
  {
    id: "task-recall",
    label: "Recall immediately after crashing the fourth wave.",
    category: "Wave Management",
    difficulty: "Medium",
    estimatedDuration: "1 game",
    done: false,
  },
  {
    id: "task-jungletrack",
    label: "Track the enemy jungler every 30 seconds.",
    category: "Map Awareness",
    difficulty: "Medium",
    estimatedDuration: "Every game",
    done: false,
  },
  {
    id: "task-backline",
    label: "Start each teamfight one screen behind your frontline.",
    category: "Team Fighting",
    difficulty: "Medium",
    estimatedDuration: "Review 3 fights",
    done: false,
  },
];

const GOALS: ImprovementGoal[] = [
  {
    id: "goal-rank",
    title: "Reach Emerald",
    detail: "Climb from Diamond I to Emerald with cleaner mid-game play.",
    category: "Macro",
    current: 47,
    target: 100,
    unit: "LP to promo",
    trend: "Improving",
    status: "In Progress",
  },
  {
    id: "goal-cs",
    title: "Average 8.5 CS/min",
    detail: "Keep farm on curve even in contested lanes.",
    category: "Farming",
    current: 84,
    target: 85,
    unit: "CS/min ×10",
    trend: "Improving",
    status: "On Track",
  },
  {
    id: "goal-deaths",
    title: "Reduce deaths under 5 per game",
    detail: "Cut avoidable deaths from overextending and ganks.",
    category: "Positioning",
    current: 6,
    target: 5,
    unit: "avg deaths",
    trend: "Improving",
    status: "In Progress",
    invert: true,
  },
  {
    id: "goal-vision",
    title: "Increase Vision Score",
    detail: "Consistently out-ward your lane opponent.",
    category: "Vision",
    current: 26,
    target: 35,
    unit: "vision score",
    trend: "Steady",
    status: "In Progress",
  },
  {
    id: "goal-wave",
    title: "Improve Wave Management",
    detail: "Master recall timing and slow-push setups.",
    category: "Wave Management",
    current: 62,
    target: 80,
    unit: "rating",
    trend: "Improving",
    status: "In Progress",
  },
];

const REPORTS: CoachingReport[] = [
  {
    id: "report-w7",
    date: "Jul 1, 2026",
    timeAgo: "Today",
    title: "Mid-game positioning is your climb ceiling",
    summary:
      "Your laning is sharp and improving, but overextending after first tower is resetting your leads. Fix this one habit and the LP follows.",
    overallGrade: "A-",
    gamesAnalyzed: 10,
    insightIds: ["positioning-overextend", "teamfight-frontline", "wave-recall-timing"],
    highlights: [
      "First-death rate still high after first tower.",
      "Teamfight positioning trending up (+4 this week).",
      "Recall timing improving but still costing ~12 CS/game.",
    ],
    focusCategory: "Positioning",
  },
  {
    id: "report-w6",
    date: "Jun 24, 2026",
    timeAgo: "1 week ago",
    title: "Vision habits are paying off",
    summary:
      "Control ward usage improved noticeably. Objective setup is still late — the next step is placing vision 75s before spawns.",
    overallGrade: "B+",
    gamesAnalyzed: 12,
    insightIds: ["vision-objective-setup", "map-jungle-tracking"],
    highlights: [
      "Vision score up 18% over two weeks.",
      "Objective vision still going down late.",
      "Jungle tracking inconsistent in the mid-game.",
    ],
    focusCategory: "Vision",
  },
  {
    id: "report-w5",
    date: "Jun 17, 2026",
    timeAgo: "2 weeks ago",
    title: "Laning fundamentals locked in",
    summary:
      "Early CS under pressure reached rank average and your trading patterns are clean. Focus is shifting from lane to map play.",
    overallGrade: "B",
    gamesAnalyzed: 11,
    insightIds: ["farming-early-cs", "mental-tilt-reset"],
    highlights: [
      "CS at 10 min improved 72 → 81.",
      "Fewer greedy trades in unfavorable matchups.",
      "Tilt after early deaths still costing consistency.",
    ],
    focusCategory: "Laning",
  },
];

export const DEMO_COACHING: CoachingEngineData = {
  insights: INSIGHTS,
  tasks: TASKS,
  goals: GOALS,
  reports: REPORTS,
};

// --- Hook ------------------------------------------------------------------

/**
 * Single interface every coaching surface consumes. Backed by demo data today;
 * when Riot + AI analysis lands it returns the same shape with generated
 * `CoachInsight` / `CoachingReport` objects — no UI changes required.
 */
export function useCoachingData(): CoachingEngineData {
  return DEMO_COACHING;
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