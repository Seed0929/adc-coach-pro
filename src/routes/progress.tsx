// ---------------------------------------------------------------------------
// Analytics / Progress — long-term MEASURABLE trends only.
//
// Product rule: this page answers "am I actually improving?" using real game
// statistics with real units (CS/min, deaths/game, KDA, gold/min, vision, kill
// participation). There is no composite behaviour score here, and no coaching
// advice is restated — the active focus is referenced with a link to Coaching.
// ---------------------------------------------------------------------------
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Target } from "lucide-react";
import { AppShell, PageHeader, DemoModeBanner, Pill } from "@/components/app-shell";
import { ProContextNote } from "@/components/pro/pro-lock";
import { MetricGraphCard } from "@/components/metrics/metric-graphs";
import { readingFromTrend } from "@/lib/metrics/metric-reading";
import { usePlayerProfile } from "@/hooks/use-player-profile";
import { useCoachDossier } from "@/hooks/use-coach-dossier";
import { activeFocusReference } from "@/lib/coaching/performance-intelligence-v1";
import { computeTrends, type TrendWindow } from "@/lib/profile-engine";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress — BotDiff" },
      {
        name: "description",
        content:
          "Track measurable improvement over time: CS/min, deaths per game, KDA, gold/min, vision and kill participation, with recent averages against your earlier games.",
      },
      { property: "og:title", content: "Progress — BotDiff" },
      {
        property: "og:description",
        content: "Am I actually improving? Real statistics, real units, no invented scores.",
      },
    ],
  }),
  component: Progress,
});

const WINDOWS: { label: string; value: TrendWindow }[] = [
  { label: "Last 10", value: 10 },
  { label: "Last 20", value: 20 },
  { label: "Last 50", value: 50 },
  { label: "All time", value: 0 },
];

function Progress() {
  const { profile } = usePlayerProfile();
  const { dossier } = useCoachDossier();
  const [win, setWin] = useState<TrendWindow>(10);
  const trends = computeTrends(profile.matches, win);
  const focus = activeFocusReference(dossier.plan);
  const source = profile.isDemo ? "Sample data" : "Your imported ranked games";

  return (
    <AppShell>
      {profile.isDemo && <DemoModeBanner />}
      <PageHeader
        eyebrow="Progress"
        title="Am I actually improving?"
        subtitle="Your real statistics over time — recent averages measured against your earlier games."
      />
      <ProContextNote surface="analytics" className="-mt-2 mb-6" />

      <div className="glass rise rounded-3xl p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">Statistical trends</h2>
            <p className="text-sm text-muted-foreground">
              Every line is a real game statistic in its own unit.
            </p>
          </div>
          <div className="flex gap-1 rounded-full bg-white/[0.04] p-1">
            {WINDOWS.map((w) => (
              <button
                key={w.label}
                onClick={() => setWin(w.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  win === w.value
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {trends.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Needs more data — import your ranked games to start tracking trends.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {trends.map((t) => (
              <MetricGraphCard
                key={t.key}
                reading={readingFromTrend(t, source)}
                height={180}
                className="!p-5"
              />
            ))}
          </div>
        )}
      </div>

      {trends.length > 0 && (
        <div className="glass rise mt-6 rounded-3xl p-6">
          <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">
            What changed recently
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trends.map((t) => (
              <div key={t.key} className="rounded-2xl bg-white/[0.03] p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm">{t.label}</span>
                  <Pill
                    tone={
                      t.trendLabel === "Improving"
                        ? "success"
                        : t.trendLabel === "Slipping"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {t.trendLabel}
                  </Pill>
                </div>
                <div className="mt-1 font-display text-xl font-semibold tabular-nums">
                  {t.current}
                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">{t.unit}</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {t.previous != null
                    ? `Previous 5-game average ${t.previous}${t.unit}`
                    : "Needs more data for a comparison"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coaching lives on the Coaching page — referenced here, never restated. */}
      <Link
        to="/coaching"
        className="glass glass-hover rise mb-4 mt-6 flex items-center justify-between gap-4 rounded-3xl p-6"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
            <Target className="size-5" />
          </span>
          <div>
            <div className="font-medium">
              {focus ?? "No active coaching focus yet — import more games."}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Open Coaching for the evidence behind it and what to practise.
            </p>
          </div>
        </div>
        <ArrowRight className="size-4 shrink-0 text-primary" />
      </Link>
    </AppShell>
  );
}
