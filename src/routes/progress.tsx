import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { AppShell, PageHeader, DemoModeBanner } from "@/components/app-shell";
import { useBotDiffData } from "@/lib/player-data";
import { MetricGraphCard } from "@/components/metrics/metric-graphs";
import {
  BOTDIFF_SCORE_NAME,
  TREND_LABELS,
  classifyTrend,
  type MetricReading,
} from "@/lib/metrics/metric-reading";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress — BotDiff" },
      {
        name: "description",
        content:
          "See your improvement over time: skill trends, champion mastery, recent wins, current weaknesses, and today's mission.",
      },
      { property: "og:title", content: "Progress — BotDiff" },
      { property: "og:description", content: "Everything here communicates progress." },
    ],
  }),
  component: Progress,
});

function Progress() {
  const { isDemo, data } = useBotDiffData();
  const { trend, skills } = data;
  const delta = data.improvementDelta;
  const previous = trend.length > 1 ? data.improvementScore - delta : null;
  const scoreTrend = classifyTrend(data.improvementScore, previous, "higher", 1);
  const best = trend.length ? Math.max(...trend.map((t) => t.score)) : data.improvementScore;
  const atBest = data.improvementScore >= best;
  const reading: MetricReading = {
    key: "progress-score",
    name: BOTDIFF_SCORE_NAME,
    value: trend.length ? data.improvementScore : null,
    unit: "",
    direction: "higher",
    trend: scoreTrend,
    trendLabel: TREND_LABELS[scoreTrend],
    previous,
    comparison: previous == null ? "Not enough history for a comparison yet" : "vs your previous window",
    baseline: null,
    target: atBest ? null : { value: best, label: "Your best form", kind: "target" },
    targetNote: atBest ? "Current best stretch." : null,
    interpretation: atBest
      ? "You're performing at your best recent level — hold this shape."
      : "This line is your coaching score across your recent games, not your rank.",
    points: trend.map((t, i) => ({ index: i, value: t.score, label: t.week })),
    sourceLabel: isDemo ? "Sample data" : "Your imported ranked games",
  };
  return (
    <AppShell>
      {isDemo && <DemoModeBanner />}
      <PageHeader
        eyebrow="Progress"
        title="You're improving"
        subtitle="Steady growth beats grinding. Here's the shape of your climb."
      />

      {/* Trend */}
      <MetricGraphCard reading={reading} height={224} />

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Skills */}
        <div className="glass rise rounded-3xl p-6">
          <h2 className="mb-5 font-display text-lg font-semibold tracking-tight">Skill Trends</h2>
          <div className="space-y-4">
            {skills.map((s) => (
              <div key={s.label}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span>{s.label}</span>
                  <span className="text-muted-foreground">{s.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      s.tone === "warning" ? "bg-warning" : "bg-success"
                    }`}
                    style={{ width: `${s.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mission + plan */}
        <div className="space-y-6">
          <div className="glass rise rounded-3xl p-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <Target className="size-4" /> Today's Mission
            </div>
            <p className="text-lg font-medium leading-snug">{data.todaysMission}</p>
          </div>
          <div className="glass rise rounded-3xl p-6">
            <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Recent Improvements</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {data.recentImprovements.map((r) => (
                <li key={r}>✓ {r}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="glass rise rounded-3xl p-6">
          <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Personalized Plan</h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            {data.improvementPlan.map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="glass rise rounded-3xl p-6">
          <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Strengths</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {data.strengths.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
        </div>
        <div className="glass rise rounded-3xl p-6">
          <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Weaknesses</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {data.weaknesses.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}