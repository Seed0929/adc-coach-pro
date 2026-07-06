import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Brain,
  ChevronDown,
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ListChecks,
  Trophy,
  History,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { AppShell, Pill, PageHeader, DemoModeBanner } from "@/components/app-shell";
import { useBotDiffData } from "@/lib/player-data";
import {
  useCoachingData,
  useTodaysFocusInsight,
  groupInsightsByCategory,
  goalProgress,
  severityTone,
  trendTone,
  statusTone,
  type CoachInsight,
  type ImprovementGoal,
  type PracticeTask,
  type ProgressTrend,
} from "@/lib/coaching-data";

export const Route = createFileRoute("/coaching")({
  head: () => ({
    meta: [
      { title: "Coaching Library — BotDiff" },
      {
        name: "description",
        content:
          "Your personal coaching library: prioritized insights, practice tasks, and long-term goals that tell you exactly what to improve next.",
      },
      { property: "og:title", content: "Coaching Library — BotDiff" },
      {
        property: "og:description",
        content: "What should you improve next? Your coach has the answer.",
      },
    ],
  }),
  component: Coaching,
});

function TrendIcon({ trend }: { trend: ProgressTrend }) {
  if (trend === "Improving") return <TrendingUp className="size-3.5" />;
  if (trend === "Declining") return <TrendingDown className="size-3.5" />;
  return <Minus className="size-3.5" />;
}

/** Player-friendly replacement for "% confidence" — how sure the coach is. */
function assessmentLabel(n: number): string {
  if (n >= 80) return "Coach is sure";
  if (n >= 60) return "Coach is confident";
  return "Coach's early read";
}

function ScoreBar({ current, goal }: { current: number; goal: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((current / goal) * 100)));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-primary-dim transition-[width] duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function InsightCard({ insight }: { insight: CoachInsight }) {
  const [open, setOpen] = useState(false);
  const t = insight.tracking;
  return (
    <div className="glass overflow-hidden rounded-2xl transition-colors">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
          <Brain className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Pill tone={severityTone[insight.severity]}>{insight.severity}</Pill>
            <Pill tone="neutral">{assessmentLabel(insight.confidence)}</Pill>
          </div>
          <div className="font-medium leading-snug">{insight.title}</div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {t.currentScore} → {t.goalScore}
            </span>
            <div className="flex-1">
              <ScoreBar current={t.currentScore} goal={t.goalScore} />
            </div>
            <Pill tone={trendTone[t.trend]}>
              <TrendIcon trend={t.trend} />
              {t.trend}
            </Pill>
          </div>
        </div>
        <ChevronDown
          className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-white/[0.06] p-4 text-sm">
            <Field label="Explanation">{insight.description}</Field>
            <Field label="Why it matters">{insight.whyItMatters}</Field>

            <div>
              <FieldLabel>Examples</FieldLabel>
              <ul className="mt-1.5 space-y-1.5">
                {insight.examples.map((ex) => (
                  <li key={ex} className="flex gap-2 text-muted-foreground">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                    {ex}
                  </li>
                ))}
              </ul>
            </div>

            <Field label="Suggested practice">{insight.recommendedAction}</Field>
            <Field label="Expected outcome">{insight.expectedImprovement}</Field>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric label="LP impact" value={insight.estimatedLpImpact} />
              <Metric label="Difficulty" value={insight.practiceDifficulty} />
              <Metric label="Practice time" value={insight.estimatedPracticeTime} />
              <Metric label="Status" value={t.status} />
            </div>

            <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-3">
              <div className="mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-primary">
                <Sparkles className="size-3" /> AI Notes
              </div>
              <p className="text-xs text-muted-foreground">
                {insight.aiNotes ??
                  "Personalized AI reasoning will appear here once your Riot account is connected and matches are analyzed."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <p className="mt-1 leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-2.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

function TaskRow({ task, checked, onToggle }: { task: PracticeTask; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-xl bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.05]"
    >
      {checked ? (
        <CheckCircle2 className="size-5 shrink-0 text-success" />
      ) : (
        <Circle className="size-5 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${checked ? "text-muted-foreground line-through" : "font-medium"}`}>
          {task.label}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full bg-white/[0.05] px-2 py-0.5">{task.category}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" /> {task.estimatedDuration}
          </span>
          <span>{task.difficulty}</span>
        </div>
      </div>
    </button>
  );
}

function GoalCard({ goal }: { goal: ImprovementGoal }) {
  const pct = goalProgress(goal);
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{goal.title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{goal.detail}</div>
        </div>
        <Pill tone={statusTone[goal.status]}>{goal.status}</Pill>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div className="font-display text-2xl font-semibold">{pct}%</div>
        <div className="text-right text-xs text-muted-foreground">
          {goal.current} / {goal.target} {goal.unit}
        </div>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-dim transition-[width] duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3">
        <Pill tone={trendTone[goal.trend]}>
          <TrendIcon trend={goal.trend} />
          {goal.trend}
        </Pill>
      </div>
    </div>
  );
}

function Coaching() {
  const { isDemo } = useBotDiffData();
  const { insights, tasks, goals } = useCoachingData();
  const focus = useTodaysFocusInsight();
  const grouped = groupInsightsByCategory(insights);
  const [done, setDone] = useState<Record<string, boolean>>(
    () => Object.fromEntries(tasks.map((t) => [t.id, t.done])),
  );
  const completed = Object.values(done).filter(Boolean).length;

  return (
    <AppShell>
      {isDemo && <DemoModeBanner />}
      <PageHeader
        eyebrow="Coaching Library"
        title="What to improve next"
        subtitle="Every insight your coach has surfaced — prioritized, explained, and turned into practice you can act on today."
      />

      {/* Today's Focus */}
      <section className="rise mb-8">
        <div className="glass relative overflow-hidden rounded-3xl p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/20 blur-[90px]" />
          <div className="relative">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Pill tone="primary">
                <Target className="size-3.5" /> Today's Focus
              </Pill>
              <Pill tone={severityTone[focus.severity]}>{focus.severity} priority</Pill>
              <Pill tone="neutral">{assessmentLabel(focus.confidence)}</Pill>
            </div>
            <h2 className="font-display text-2xl font-semibold leading-snug md:text-3xl">
              {focus.title}
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">{focus.whyItMatters}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Recommended practice" value={focus.estimatedPracticeTime} />
              <Metric label="Estimated improvement" value={focus.practiceDifficulty} />
              <Metric label="Expected LP impact" value={focus.estimatedLpImpact} />
              <Metric label="Category" value={focus.category} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Do this: </span>
              {focus.recommendedAction}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Insights grouped by category */}
        <div className="space-y-6 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-primary" />
            <h3 className="font-display text-xl font-semibold">Insights by category</h3>
          </div>
          {grouped.map((group) => (
            <div key={group.category} className="rise space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="font-mono text-xs uppercase tracking-[0.15em] text-primary">
                  {group.category}
                </span>
                <span className="h-px flex-1 bg-white/[0.06]" />
                <span className="text-xs">{group.insights.length}</span>
              </div>
              {group.insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          ))}
        </div>

        {/* Right rail: tasks + goals */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="size-4 text-primary" />
                <h3 className="font-display text-lg font-semibold">Practice tasks</h3>
              </div>
              <span className="text-xs text-muted-foreground">
                {completed}/{tasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  checked={done[task.id]}
                  onToggle={() => setDone((d) => ({ ...d, [task.id]: !d[task.id] }))}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-primary" />
                <h3 className="font-display text-lg font-semibold">Long-term goals</h3>
              </div>
            </div>
            <div className="space-y-3">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          </div>

          <Link
            to="/coaching/history"
            className="glass flex items-center justify-between rounded-2xl p-4 transition-colors hover:bg-white/[0.04]"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/12 text-primary">
                <History className="size-[18px]" />
              </span>
              <div>
                <div className="text-sm font-medium">Coaching history</div>
                <div className="text-xs text-muted-foreground">Your past coaching reports</div>
              </div>
            </div>
            <ChevronDown className="size-4 -rotate-90 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}