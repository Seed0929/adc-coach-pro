import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell, PageHeader, Pill, DemoModeBanner } from "@/components/app-shell";
import { CoachingCard } from "@/components/coaching-card";
import { useCoachDossier } from "@/hooks/use-coach-dossier";
import { useBotDiffData } from "@/lib/player-data";
import { useCoachingData } from "@/lib/coaching-data";

/**
 * Shared scaffold for every Layer-3 "Full Analysis" destination. These pages
 * are the deep-dive homes that progressive dashboard cards expand into. They
 * read from the same Coach Dossier as every other surface — no duplicated
 * coaching logic, no placeholder copy.
 */
export type AnalysisKey =
  | "replay-coach"
  | "habit-analysis"
  | "champion-analysis"
  | "coach-memory"
  | "build-review"
  | "decision-timeline"
  | "practice-history";

function BackLink() {
  return (
    <Link
      to="/dashboard"
      className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Back to dashboard
    </Link>
  );
}

function AnalysisShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { isDemo } = useBotDiffData();
  return (
    <AppShell>
      {isDemo && <DemoModeBanner />}
      <BackLink />
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="space-y-4">{children}</div>
    </AppShell>
  );
}

function ReplayCoach() {
  const { data } = useBotDiffData();
  return (
    <AnalysisShell
      eyebrow="Full Analysis"
      title="Replay Coach"
      subtitle="Every recent game, reviewed. Open a match to walk through the moments that decided it."
    >
      {data.matches.map((m) => (
        <CoachingCard
          key={m.id}
          tone={m.result === "Victory" ? "success" : "danger"}
          eyebrow={m.result}
          title={`${m.champ} — Grade ${m.grade}`}
          summary={`${m.kda} KDA · ${m.cs} CS · ${m.gameLength} · ${m.when}`}
          readTime="45 sec"
          fullAnalysisTo="/matches/$matchId"
          fullAnalysisParams={{ matchId: m.matchId }}
          fullAnalysisLabel="Open match report"
        >
          <p className="text-success/90">
            <span className="font-medium text-success">Strength: </span>
            {m.biggestStrength}
          </p>
          <p className="text-warning/90">
            <span className="font-medium text-warning">Coachable moment: </span>
            {m.biggestMistake}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-primary">Coach: </span>
            {m.recommendation}
          </p>
        </CoachingCard>
      ))}
    </AnalysisShell>
  );
}

function HabitAnalysis() {
  const { dossier } = useCoachDossier();
  return (
    <AnalysisShell
      eyebrow="Full Analysis"
      title="Habit Analysis"
      subtitle="The recurring patterns BotDiff has detected across your games — ranked by how often they show up."
    >
      {dossier.recurringHabits.length === 0 && (
        <CoachingCard title="Not enough games yet" summary="Play a few more ranked games and your recurring habits will appear here." />
      )}
      {dossier.recurringHabits.map((h) => (
        <CoachingCard
          key={h.id}
          tone={h.kind === "strength" ? "success" : "warning"}
          eyebrow={h.kind === "strength" ? "Strength habit" : "Habit to build"}
          title={h.title}
          summary={h.detail}
          readTime="20 sec"
          headerRight={
            <Pill tone={h.kind === "strength" ? "success" : "warning"}>
              {h.count} games{h.streak > 1 ? ` · ${h.streak} in a row` : ""}
            </Pill>
          }
        />
      ))}
    </AnalysisShell>
  );
}

function ChampionAnalysis() {
  const { data } = useBotDiffData();
  return (
    <AnalysisShell
      eyebrow="Full Analysis"
      title="Champion Analysis"
      subtitle="How each champion in your pool is trending — mastery, win rate, and average grade."
    >
      {data.champions.map((c) => (
        <CoachingCard
          key={c.name}
          tone={c.trend >= 0 ? "success" : "warning"}
          title={c.name}
          summary={`${c.games} games · ${c.wr} win rate · Grade ${c.avgGrade} · ${c.mastery}% mastery`}
          readTime="20 sec"
          headerRight={
            <Pill tone={c.trend >= 0 ? "success" : "danger"}>
              {c.trend >= 0 ? "+" : ""}
              {c.trend}%
            </Pill>
          }
        />
      ))}
    </AnalysisShell>
  );
}

function CoachMemory() {
  const { dossier } = useCoachDossier();
  return (
    <AnalysisShell
      eyebrow="Full Analysis"
      title="Coach Memory"
      subtitle="What your coach remembers about how you play — identity, strengths, growth opportunities, and consistency."
    >
      <CoachingCard
        tone="primary"
        eyebrow={dossier.identitySummary}
        title={`${dossier.winRate}% win rate over ${dossier.matchesAnalyzed} analyzed games`}
        summary={dossier.overallSummary}
        readTime="1 min"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-medium text-success">Strengths</div>
            <ul className="space-y-1.5 text-muted-foreground">
              {dossier.strengths.map((s) => (
                <li key={s.title}>
                  <span className="font-medium text-foreground">{s.title}</span>
                  {s.detail ? ` — ${s.detail}` : ""}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-warning">Growth Opportunities</div>
            <ul className="space-y-1.5 text-muted-foreground">
              {dossier.weaknesses.map((w) => (
                <li key={w.title}>
                  <span className="font-medium text-foreground">{w.title}</span>
                  {w.detail ? ` — ${w.detail}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {dossier.consistency.dimensions.map((d) => (
            <div key={d.label} className="rounded-xl bg-white/[0.03] p-3">
              <div className="text-[11px] text-muted-foreground">{d.label}</div>
              <div className="mt-0.5 font-display text-lg font-semibold">{d.score}</div>
            </div>
          ))}
        </div>
      </CoachingCard>
    </AnalysisShell>
  );
}

function BuildReview() {
  const { insights } = useCoachingData();
  const relevant = insights.filter(
    (i) => i.category === "Champion Mastery" || i.category === "Macro" || i.category === "Farming",
  );
  return (
    <AnalysisShell
      eyebrow="Full Analysis"
      title="Build Review"
      subtitle="Rune, item, and mastery coaching. Per-match recommended builds live inside each match report."
    >
      {(relevant.length ? relevant : insights.slice(0, 3)).map((i) => (
        <CoachingCard
          key={i.id}
          tone="primary"
          eyebrow={i.category}
          title={i.title}
          summary={i.description}
          readTime={i.estimatedPracticeTime}
        >
          <p className="text-muted-foreground">{i.whyItMatters}</p>
          <p className="text-muted-foreground">
            <span className="font-medium text-primary">Do this: </span>
            {i.recommendedAction}
          </p>
        </CoachingCard>
      ))}
    </AnalysisShell>
  );
}

function DecisionTimeline() {
  const { dossier } = useCoachDossier();
  return (
    <AnalysisShell
      eyebrow="Full Analysis"
      title="Decision Timeline"
      subtitle="The decisions that repeat across your games, in the order they tend to happen in a match."
    >
      {dossier.recurringHabits.map((h, idx) => (
        <CoachingCard
          key={h.id}
          tone={h.kind === "strength" ? "success" : "warning"}
          eyebrow={`Step ${idx + 1}`}
          title={h.title}
          summary={h.detail}
          readTime="20 sec"
        />
      ))}
    </AnalysisShell>
  );
}

function PracticeHistory() {
  const { goals, tasks, reports } = useCoachingData();
  return (
    <AnalysisShell
      eyebrow="Full Analysis"
      title="Practice History"
      subtitle="Your long-term goals, practice tasks, and past coaching reports in one place."
    >
      {goals.map((g) => (
        <CoachingCard
          key={g.id}
          tone="primary"
          eyebrow="Goal"
          title={g.title}
          summary={`${g.detail} — ${g.current} / ${g.target} ${g.unit}`}
          readTime="20 sec"
          headerRight={<Pill tone="primary">{g.status}</Pill>}
        />
      ))}
      {reports.map((r) => (
        <CoachingCard
          key={r.id}
          tone="neutral"
          eyebrow={`${r.date} · ${r.gamesAnalyzed} games`}
          title={r.title}
          summary={r.summary}
          readTime="1 min"
        >
          <ul className="space-y-1.5 text-muted-foreground">
            {r.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </CoachingCard>
      ))}
      <div className="text-xs text-muted-foreground">
        {tasks.length} practice tasks tracked. Complete them from the Coaching library.
      </div>
    </AnalysisShell>
  );
}

const PAGES: Record<AnalysisKey, () => React.JSX.Element> = {
  "replay-coach": ReplayCoach,
  "habit-analysis": HabitAnalysis,
  "champion-analysis": ChampionAnalysis,
  "coach-memory": CoachMemory,
  "build-review": BuildReview,
  "decision-timeline": DecisionTimeline,
  "practice-history": PracticeHistory,
};

export function AnalysisPage({ page }: { page: AnalysisKey }) {
  const Cmp = PAGES[page];
  return <Cmp />;
}