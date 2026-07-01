import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, History, Sparkles } from "lucide-react";
import { AppShell, Pill, PageHeader, DemoModeBanner } from "@/components/app-shell";
import { useBotDiffData } from "@/lib/player-data";
import { useCoachingData } from "@/lib/coaching-data";

export const Route = createFileRoute("/coaching/history")({
  head: () => ({
    meta: [
      { title: "Coaching History — BotDiff" },
      {
        name: "description",
        content:
          "A timeline of your past coaching reports. See how your focus and grades have evolved session over session.",
      },
      { property: "og:title", content: "Coaching History — BotDiff" },
      {
        property: "og:description",
        content: "Every coaching report, in order. Watch your game grow.",
      },
    ],
  }),
  component: CoachingHistory,
});

function CoachingHistory() {
  const { isDemo } = useBotDiffData();
  const { reports, insights } = useCoachingData();
  const titleOf = (id: string) => insights.find((i) => i.id === id)?.title ?? id;

  return (
    <AppShell>
      {isDemo && <DemoModeBanner />}
      <Link
        to="/coaching"
        className="rise mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Coaching
      </Link>
      <PageHeader
        eyebrow="Coaching History"
        title="Your coaching timeline"
        subtitle="Each report captures what your coach focused on that week. Future Riot analysis simply adds a new report to the top."
      />

      <div className="relative">
        <div className="absolute bottom-2 left-[19px] top-2 w-px bg-white/[0.08]" aria-hidden />
        <div className="space-y-6">
          {reports.map((report) => (
            <div key={report.id} className="rise relative pl-12">
              <span className="absolute left-0 top-1 grid size-10 place-items-center rounded-full border border-white/[0.08] bg-background text-primary">
                <History className="size-4" />
              </span>
              <div className="glass rounded-2xl p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">{report.date}</span>
                  <span className="text-xs text-muted-foreground">· {report.timeAgo}</span>
                  <Pill tone="primary">{report.focusCategory}</Pill>
                  <Pill tone="neutral">Grade {report.overallGrade}</Pill>
                  <Pill tone="neutral">{report.gamesAnalyzed} games</Pill>
                </div>
                <h2 className="font-display text-xl font-semibold">{report.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{report.summary}</p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                      Highlights
                    </div>
                    <ul className="space-y-1.5">
                      {report.highlights.map((h) => (
                        <li key={h} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                      Insights surfaced
                    </div>
                    <ul className="space-y-1.5">
                      {report.insightIds.map((id) => (
                        <li key={id} className="flex gap-2 text-sm text-muted-foreground">
                          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                          {titleOf(id)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}