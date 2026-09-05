// ---------------------------------------------------------------------------
// Your Personalized Coaching Plan — the single authoritative coaching queue.
//
// One ordered queue, never several simultaneous full assignments:
//   Priority #1  ACTIVE / FIX NOW  → full treatment
//   Priority #2  NEXT              → brief preview
//   Priority #3  LATER             → brief preview
//
// Deduplicated by issue identity (`issues.ts`), so the same underlying problem
// cannot occupy two slots or reappear in another panel as separate advice.
// Promotion is automatic: once #1's target is sustainably achieved it leaves the
// active set (see `targets.ts`), the queue is rebuilt, #2 becomes #1, and the
// completed focus is preserved in coaching history.
// ---------------------------------------------------------------------------
import { consistencyFor, type PerformanceConsistency } from "./consistency";
import { MIN_TARGET_GAMES, ROLLING_WINDOW } from "./evaluation";
import { labelForClaim, type EvidenceLabel } from "./evidence";
import { COACHING_ISSUES, findIssue, issueForMetric, type CoachingIssueId } from "./issues";
import { containsItemRecommendation } from "./item-policy";
import { activeTargets, completedTargets } from "./targets";
import type {
  CoachingIntelligenceSnapshot,
  CoachingPriority,
  CoachingTarget,
  DataSufficiency,
  MetricEvaluation,
} from "./types";

export type PlanSlot = "active" | "next" | "later";

export interface PlanEvidenceLine {
  statement: string;
  label: EvidenceLabel;
  sampleSize: number;
}

export interface PlanTarget {
  value: number;
  unit: string;
  direction: "higher" | "lower";
  progress: number;
  /** e.g. "6.5/min → 6.9/min" */
  journey: string;
  successMeasure: string;
  evaluationWindow: string;
  targetId: string;
}

export interface CoachingPlanEntry {
  rank: number;
  slot: PlanSlot;
  issueId: CoachingIssueId | null;
  issueLabel: string;
  metric: string;
  metricName: string;
  unit: string;
  scopeId: string;
  scopeLabel: string;
  /** One-line statement of the issue. */
  headline: string;
  whyItMatters: string;
  baseline: number;
  evidence: PlanEvidenceLine[];
  target: PlanTarget | null;
  /** Only the ACTIVE priority carries practice actions. */
  practiceActions: string[];
  consistency: PerformanceConsistency | null;
  sufficiency: DataSufficiency;
}

export interface CompletedFocus {
  issueId: CoachingIssueId | null;
  issueLabel: string;
  metric: string;
  metricName: string;
  scopeLabel: string;
  /** e.g. "6.1/min → 6.5/min" */
  journey: string;
  achievedAt: string | null;
  sampleSize: number;
}

export interface CoachingPlan {
  generatedAt: string;
  sufficiency: DataSufficiency;
  /** Ordered queue, max 3 entries. */
  queue: CoachingPlanEntry[];
  active: CoachingPlanEntry | null;
  history: CompletedFocus[];
  /** Honest note when BotDiff cannot yet name a priority. */
  note: string | null;
}

const SLOTS: PlanSlot[] = ["active", "next", "later"];
export const PLAN_QUEUE_LENGTH = 3;

const journeyLabel = (from: number, to: number, unit: string) => `${from}${unit} → ${to}${unit}`;

function successMeasure(target: CoachingTarget): string {
  const dir = target.direction === "higher" ? "at or above" : "at or below";
  return `Your rolling ${ROLLING_WINDOW}-game average sits ${dir} ${target.targetValue}${target.unit}, with most of those games individually meeting it.`;
}

function evaluationWindow(target: CoachingTarget): string {
  return `Reviewed over your next ${ROLLING_WINDOW} comparable games — one strong game does not close it out.`;
}

function evidenceFor(
  evaluation: MetricEvaluation,
  target: CoachingTarget | null,
  consistency: PerformanceConsistency | null,
): PlanEvidenceLine[] {
  const lines: PlanEvidenceLine[] = [
    {
      statement: `Across ${evaluation.sampleSize} games in this scope your ${evaluation.name.toLowerCase()} averages ${evaluation.longTermBaseline}${evaluation.unit}; your most recent ${ROLLING_WINDOW} games average ${evaluation.recentBaseline}${evaluation.unit}.`,
      label: labelForClaim("observed_fact"),
      sampleSize: evaluation.sampleSize,
    },
  ];
  if (evaluation.bestSustained != null) {
    lines.push({
      statement: `Your best sustained stretch is ${evaluation.bestSustained}${evaluation.unit}, so this level is something you have already produced.`,
      label: labelForClaim("calculated_trend"),
      sampleSize: evaluation.sampleSize,
    });
  }
  if (consistency?.available && consistency.typicalRange) {
    lines.push({
      statement: `Game to game you typically land between ${consistency.typicalRange.low}${evaluation.unit} and ${consistency.typicalRange.high}${evaluation.unit} (${consistency.classification?.toLowerCase()}).`,
      label: labelForClaim("calculated_trend"),
      sampleSize: consistency.sampleSize,
    });
  }
  if (target) {
    lines.push({
      statement: target.evidence.reason,
      label: labelForClaim(target.evidence.claim),
      sampleSize: target.evidence.sampleSize,
    });
  }
  return lines;
}

/**
 * Build the queue. `priorities` are already ranked by the player's own
 * headroom; this layer applies issue deduplication, attaches supported targets,
 * and gives full treatment to the single active priority only.
 */
export function buildCoachingPlan(
  evaluations: MetricEvaluation[],
  snapshot: CoachingIntelligenceSnapshot,
  priorities: CoachingPriority[],
  options: { now?: string; totalGames?: number; sufficiency?: DataSufficiency } = {},
): CoachingPlan {
  const now = options.now ?? new Date().toISOString();
  const sufficiency = options.sufficiency ?? "none";
  const active = activeTargets(snapshot);
  const history = completedTargets(snapshot)
    .slice()
    .sort((a, b) => (b.achievedAt ?? "").localeCompare(a.achievedAt ?? ""))
    .map<CompletedFocus>((t) => {
      const issue = issueForMetric(t.metric);
      return {
        issueId: issue?.id ?? null,
        issueLabel: issue?.label ?? t.name,
        metric: t.metric,
        metricName: t.name,
        scopeLabel: t.scope.label,
        journey: journeyLabel(t.baselineAtCreation, t.targetValue, t.unit),
        achievedAt: t.achievedAt,
        sampleSize: t.sampleSize,
      };
    });

  // Candidate order: priorities that already hold an active target come first —
  // they are the commitments the player is currently being coached on.
  const withTargets = priorities.filter((p) =>
    active.some((t) => t.metric === p.metric && t.scope.id === p.scope.id),
  );
  const withoutTargets = priorities.filter((p) => !withTargets.includes(p));
  const ordered = [...withTargets, ...withoutTargets];

  // Deduplicate by issue identity: one issue may occupy only one slot.
  const seenIssues = new Set<CoachingIssueId>();
  const queue: CoachingPlanEntry[] = [];
  for (const priority of ordered) {
    if (queue.length >= PLAN_QUEUE_LENGTH) break;
    const issue = issueForMetric(priority.metric);
    if (issue) {
      if (seenIssues.has(issue.id)) continue;
      seenIssues.add(issue.id);
    }
    const evaluation = evaluations.find(
      (e) => e.metric === priority.metric && e.scope.id === priority.scope.id,
    );
    if (!evaluation) continue;
    const target = active.find((t) => t.metric === priority.metric && t.scope.id === priority.scope.id) ?? null;
    const slot = SLOTS[queue.length];
    const consistency = consistencyFor(evaluation);
    const practiceActions =
      slot === "active" && issue
        ? issue.practiceActions.filter((a) => !containsItemRecommendation(a)).slice(0, 3)
        : [];

    queue.push({
      rank: queue.length + 1,
      slot,
      issueId: issue?.id ?? null,
      issueLabel: issue?.label ?? evaluation.name,
      metric: evaluation.metric,
      metricName: evaluation.name,
      unit: evaluation.unit,
      scopeId: evaluation.scope.id,
      scopeLabel: evaluation.scope.label,
      headline: priority.reason,
      whyItMatters:
        issue?.whyItMatters ??
        "BotDiff coaches this because it is the largest gap between your recent form and a level you have already produced.",
      baseline: evaluation.recentBaseline,
      evidence: slot === "active" ? evidenceFor(evaluation, target, consistency) : evidenceFor(evaluation, target, null).slice(0, 1),
      target: target
        ? {
            value: target.targetValue,
            unit: target.unit,
            direction: target.direction,
            progress: target.progress,
            journey: journeyLabel(target.currentRollingValue, target.targetValue, target.unit),
            successMeasure: successMeasure(target),
            evaluationWindow: evaluationWindow(target),
            targetId: target.id,
          }
        : null,
      practiceActions,
      consistency: slot === "active" ? consistency : null,
      sufficiency: evaluation.sufficiency,
    });
  }

  return {
    generatedAt: now,
    sufficiency,
    queue,
    active: queue[0] ?? null,
    history,
    note:
      queue.length === 0
        ? `BotDiff needs ${MIN_TARGET_GAMES} comparable games before it will name a coaching priority. Until then it keeps observing instead of guessing.`
        : null,
  };
}

/** Every issue BotDiff can currently coach — used by dedupe audits. */
export function allIssueIds(): CoachingIssueId[] {
  return COACHING_ISSUES.map((i) => i.id);
}

/**
 * A one-line reference other panels may show instead of repeating the plan.
 * Never includes the practice actions or target — those live in the plan only.
 */
export function activeFocusReference(plan: CoachingPlan): string | null {
  const a = plan.active;
  if (!a) return null;
  const issue = a.issueId ? findIssue(a.issueId) : null;
  const label = issue?.label ?? a.metricName;
  return a.target
    ? `Current coaching focus: ${label} (${a.target.journey}). Full plan in Your Personalized Coaching Plan.`
    : `Current coaching focus: ${label}. Full plan in Your Personalized Coaching Plan.`;
}
