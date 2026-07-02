import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AppShell, PageHeader, DemoModeBadge } from "@/components/app-shell";
import { MatchCoachReport } from "@/components/match-coach-report";
import { useMatchReport } from "@/hooks/use-match-report";

export const Route = createFileRoute("/matches/$matchId")({
  head: () => ({
    meta: [
      { title: "AI Coach — Match Review — BotDiff" },
      {
        name: "description",
        content:
          "A personalized AI coaching report for one match: grade, strengths, mistakes, priority improvement, practice goal, and how you've trended.",
      },
      { property: "og:title", content: "AI Coach — Match Review — BotDiff" },
      { property: "og:description", content: "Read your match like feedback from a real League coach." },
    ],
  }),
  component: MatchReportPage,
  errorComponent: () => (
    <AppShell>
      <p className="text-sm text-destructive">Something went wrong loading this match.</p>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <p className="text-sm text-muted-foreground">Match not found.</p>
    </AppShell>
  ),
});

function MatchReportPage() {
  const { matchId } = Route.useParams();
  const { report, loading, error, isDemo } = useMatchReport(matchId);

  return (
    <AppShell>
      <Link
        to="/matches"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to matches
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <PageHeader
          eyebrow="AI Coach"
          title="Match coaching report"
          subtitle="Why the game went the way it did — not just the stats."
        />
        {isDemo && <DemoModeBadge />}
      </div>

      {loading ? (
        <div className="glass flex items-center gap-3 rounded-3xl p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Analyzing this match…
        </div>
      ) : error || !report ? (
        <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">
          {error ?? "No report available for this match yet."}
        </div>
      ) : (
        <MatchCoachReport report={report} />
      )}
    </AppShell>
  );
}
