import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Loader2, RefreshCw, Flag } from "lucide-react";
import { AppShell, PageHeader, DemoModeBadge } from "@/components/app-shell";
import { MatchCoachReport } from "@/components/match-coach-report";
import { useMatchReport } from "@/hooks/use-match-report";
import { ChampionBackdrop } from "@/components/champion-backdrop";
import { FeedbackDialog } from "@/components/feedback-dialog";

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
      {
        property: "og:description",
        content: "Read your match like feedback from a real League coach.",
      },
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
  const { report, loading, error, isDemo, retry } = useMatchReport(matchId);

  return (
    <AppShell>
      {report?.champion && (
        <div className="pointer-events-none fixed inset-0 -z-10">
          <ChampionBackdrop champions={report.champion} intensity="medium" />
        </div>
      )}
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
        <FeedbackDialog
          matchId={matchId}
          feature="match_report"
          defaultType="coaching_feedback"
          trigger={
            <button
              type="button"
              className="glass glass-hover ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium"
            >
              <Flag className="size-4" /> Report Issue
            </button>
          }
        />
      </div>

      {loading ? (
        <div className="glass flex items-center gap-3 rounded-3xl p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Analyzing this match…
        </div>
      ) : error || !report ? (
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {error ?? "This match doesn't have a coaching report yet."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              onClick={retry}
              className="glass glass-hover inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium"
            >
              <RefreshCw className="size-4" /> Try again
            </button>
            <Link
              to="/matches"
              className="glass glass-hover inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium"
            >
              Back to matches
            </Link>
          </div>
        </div>
      ) : (
        <MatchCoachReport report={report} isDemo={isDemo} />
      )}
    </AppShell>
  );
}
