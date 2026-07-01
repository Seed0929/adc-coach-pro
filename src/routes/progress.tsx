import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, Target } from "lucide-react";
import { AppShell, Pill, PageHeader, DemoModeBanner } from "@/components/app-shell";
import { useBotDiffData } from "@/lib/player-data";

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
  return (
    <AppShell>
      {isDemo && <DemoModeBanner />}
      <PageHeader
        eyebrow="Progress"
        title="You're improving"
        subtitle="Steady growth beats grinding. Here's the shape of your climb."
      />

      {/* Trend */}
      <div className="glass rise rounded-3xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Improvement Score</div>
            <div className="font-display text-3xl font-semibold tracking-tight">
              {data.improvementScore} <span className="text-lg text-success">+{data.improvementDelta}</span>
            </div>
          </div>
          <Pill tone="success"><ArrowUpRight className="size-3.5" /> Trending up</Pill>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[50, 90]} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--foreground)",
                }}
              />
              <Area type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

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