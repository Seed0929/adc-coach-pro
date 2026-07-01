import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  MessageSquareText,
  TrendingUp,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { AppShell, Pill } from "@/components/app-shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BotDiff — Your Personal League Coach" },
      {
        name: "description",
        content:
          "BotDiff is an AI-powered personal coach for League of Legends. Get calm, focused, personalized analysis of your own gameplay and know exactly what to improve next.",
      },
      { property: "og:title", content: "BotDiff — Your Personal League Coach" },
      {
        property: "og:description",
        content:
          "AI coaching that feels like sitting beside a Challenger coach after every ranked game.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AppShell>
      {/* Greeting */}
      <div className="rise mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">Welcome back</div>
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            How am I doing?
          </h1>
        </div>
        <Pill tone="primary">
          <Trophy className="size-3.5" /> Diamond I · 47 LP
        </Pill>
      </div>

      {/* Today's focus — the single most important thing */}
      <section
        className="glass glass-hover rise relative overflow-hidden rounded-3xl p-8 md:p-10"
        style={{ animationDelay: "60ms" }}
      >
        <div className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
            <Target className="size-4" /> Today's Focus
          </div>
          <h2 className="max-w-2xl font-display text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
            Hold your position one screen back in mid-game teamfights.
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            You died first in 6 of your last 10 fights. Kiting from the backline is the single
            highest-impact habit to fix this week.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/matches"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
            >
              Analyze Latest Matches
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/coach"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium transition-colors hover:bg-white/[0.06]"
            >
              <MessageSquareText className="size-4" /> Open AI Coach
            </Link>
          </div>
        </div>
      </section>

      {/* Snapshot */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {[
          { label: "Improvement Score", value: "+12.4", sub: "up 3.1 this week", tone: "success" as const },
          { label: "Current Rank", value: "Diamond I", sub: "peak this season", tone: "primary" as const },
          { label: "Focus Streak", value: "4 days", sub: "keep it going", tone: "warning" as const },
        ].map((s, i) => (
          <div
            key={s.label}
            className="glass glass-hover rise rounded-3xl p-6"
            style={{ animationDelay: `${120 + i * 60}ms` }}
          >
            <div className="text-sm text-muted-foreground">{s.label}</div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-tight">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Secondary actions */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { to: "/progress", label: "View Progress", desc: "Trends & skill growth", icon: TrendingUp },
          { to: "/champions", label: "Champion Pool", desc: "Mastery & matchups", icon: Sparkles },
          { to: "/coach", label: "Ask the Coach", desc: "Get instant guidance", icon: MessageSquareText },
        ].map((a, i) => (
          <Link
            key={a.to}
            to={a.to}
            className="glass glass-hover rise group flex items-center gap-4 rounded-2xl p-5"
            style={{ animationDelay: `${300 + i * 60}ms` }}
          >
            <span className="grid size-11 place-items-center rounded-xl bg-primary/12 text-primary">
              <a.icon className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="font-medium">{a.label}</div>
              <div className="truncate text-xs text-muted-foreground">{a.desc}</div>
            </div>
            <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
