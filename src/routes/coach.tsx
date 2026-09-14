import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Sparkles,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Brain,
  Repeat,
  ShieldAlert,
  Gauge,
  Swords,
  HeartPulse,
  ListChecks,
  Flag,
} from "lucide-react";
import { AppShell, DemoModeBadge, Pill } from "@/components/app-shell";
import {
  ActiveFocusNote,
  CoachingPlanPanel,
  PerformanceConsistencyPanel,
} from "@/components/coaching-plan";
import { activeFocusReference } from "@/lib/coaching/performance-intelligence-v1";
import { useCoachDossier } from "@/hooks/use-coach-dossier";
import { proactiveCoaching, followUpQuestion } from "@/lib/coaching";

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "AI Coach — BotDiff" },
      {
        name: "description",
        content:
          "Your personal BotDiff coaching report: player identity, recurring habits, a rank-up plan, and answers grounded in your own games.",
      },
      { property: "og:title", content: "AI Coach — BotDiff" },
      {
        property: "og:description",
        content: "A Challenger-level AI coach that remembers your habits across every game.",
      },
    ],
  }),
  component: Coach,
});

interface ChatTurn {
  role: "coach" | "you";
  text: string;
}

function Section({
  icon: Icon,
  title,
  children,
  className = "",
}: {
  icon: typeof Sparkles;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass rise rounded-3xl p-6 ${className}`}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
          <Icon className="size-4" />
        </span>
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Coach() {
  const { dossier, loading } = useCoachDossier();



  const dirIcon = (d: "up" | "down" | "flat", improved: boolean) => {
    if (d === "flat") return <Minus className="size-3.5 text-muted-foreground" />;
    const Cmp = d === "up" ? TrendingUp : TrendingDown;
    return <Cmp className={`size-3.5 ${improved ? "text-success" : "text-destructive"}`} />;
  };

  const proactive = useMemo(() => proactiveCoaching(dossier), [dossier]);
  const followUp = useMemo(() => followUpQuestion(dossier), [dossier]);

  return (
    <AppShell>
      <div className="rise mb-6 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Sparkles className="size-5" />
        </span>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">AI Coach</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Reading your recent games…"
              : `A full report from your last ${dossier.matchesAnalyzed} games — built on your habits, not generic advice.`}
          </p>
        </div>
        {dossier.isDemo && <DemoModeBadge />}
      </div>

      {/* Overall summary + identity */}
      <Section icon={Brain} title="Overall coaching summary" className="mb-6">
        <p className="text-sm leading-relaxed text-foreground/90">{dossier.overallSummary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {dossier.identityTraits.map((t) => (
            <Pill key={t} tone="primary">
              {t}
            </Pill>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/[0.03] p-4">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Rank assessment</div>
            <p className="text-sm text-foreground/90">{dossier.rankAssessment}</p>
            <p className="mt-2 text-xs font-medium text-primary">{dossier.rankPotential}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] p-4">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Record</div>
            <p className="text-2xl font-display font-semibold">
              {dossier.wins}W · {dossier.losses}L
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{dossier.winRate}% win rate</p>
          </div>
        </div>
      </Section>

      {/* Proactive coaching briefing — generated after every Riot sync. */}
      <Section icon={Flag} title="Since your last sync" className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Biggest improvement", value: proactive.biggestImprovement, tone: "text-success" },
            { label: "Next habit to build", value: proactive.biggestRecurringMistake, tone: "text-warning" },
            { label: "Keep doing this", value: proactive.keepDoing, tone: "text-success" },
            { label: "Focus on this next", value: proactive.fixNext, tone: "text-warning" },
          ].map((row) => (
            <div key={row.label} className="rounded-2xl bg-white/[0.03] p-4">
              <div className={`mb-1 text-xs uppercase tracking-wider ${row.tone}`}>{row.label}</div>
              <p className="text-sm text-foreground/90">{row.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
            <Target className="size-3.5" /> Next game challenge
          </div>
          <p className="text-sm text-foreground/90">{proactive.nextGameChallenge}</p>
        </div>
        {followUp && (
          <p className="mt-3 rounded-2xl bg-white/[0.03] p-4 text-sm italic text-muted-foreground">
            "{followUp}"
          </p>
        )}
      </Section>


      {/* Strength + Weakness */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Section icon={Trophy} title="Primary strength">
          <h3 className="font-display text-base font-semibold text-success">{dossier.primaryStrength.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{dossier.primaryStrength.detail}</p>
        </Section>
        <Section icon={ShieldAlert} title="Primary growth opportunity">
          <h3 className="font-display text-base font-semibold text-warning">{dossier.primaryWeakness.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{dossier.primaryWeakness.detail}</p>
        </Section>
      </div>

      {/* Coaching priorities — the five things every player should always see. */}
      <Section icon={ListChecks} title={`What BotDiff is seeing · ${dossier.coachingPriority.roleLabel}`} className="mb-6">
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { label: "Biggest strength", item: dossier.coachingPriority.biggestStrength, tone: "text-success" },
            { label: "Biggest growth opportunity", item: dossier.coachingPriority.biggestWeakness, tone: "text-warning" },
            { label: "Most improved habit", item: dossier.coachingPriority.mostImprovedHabit, tone: "text-success" },
            { label: "Highest-impact habit to build", item: dossier.coachingPriority.highestImpactToFix, tone: "text-warning" },
          ].map((row) => (
            <div key={row.label} className="rounded-2xl bg-white/[0.03] p-4">
              <div className={`mb-1 text-xs uppercase tracking-wider ${row.tone}`}>{row.label}</div>
              <p className="text-sm font-medium text-foreground/90">{row.item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.item.why}</p>
              <p className="mt-1.5 text-xs italic text-muted-foreground/80">{row.item.evidence}</p>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <ActiveFocusNote text={activeFocusReference(dossier.plan)} />
        </div>
      </Section>

      {/* Recurring habits */}
      <Section icon={Repeat} title="Recurring habits" className="mb-6">
        {dossier.habits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No strong recurring habits yet — play more games to let me spot your patterns.
          </p>
        ) : (
          <div className="space-y-3">
            {dossier.habits.map((h) => (
              <div key={h.id} className="flex items-start gap-3 rounded-2xl bg-white/[0.03] p-4">
                <span
                  className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${
                    h.kind === "strength" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                  }`}
                >
                  {h.kind === "strength" ? <Trophy className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{h.label}</span>
                    <Pill tone={h.kind === "strength" ? "success" : "warning"}>
                      {h.evidence.games}/{h.evidence.total} games
                    </Pill>
                    {h.evidence.streak >= 3 && <Pill tone="danger">{h.evidence.streak} in a row</Pill>}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{h.why}</p>
                  <p className="mt-1.5 text-xs italic text-muted-foreground/80">{h.evidence.sentences.join(" ")}</p>
                  {h.kind === "weakness" && (
                    <p className="mt-1.5 text-xs text-primary/90">Practice: {h.practice}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* The single authoritative coaching plan */}
      <Section icon={Target} title="Your Personalized Coaching Plan" className="mb-6">
        <p className="mb-4 text-sm text-muted-foreground">
          One priority at a time, measured against levels you have already produced. When Priority #1
          is sustained, it moves to your completed focuses and the next one takes over.
        </p>
        <CoachingPlanPanel plan={dossier.plan} />
      </Section>

      {/* Performance consistency — plain language, no abstract scores */}
      <Section icon={Gauge} title="Performance consistency" className="mb-6">
        <p className="mb-4 text-sm text-muted-foreground">
          How repeatable your recent games have been: your average, the range you usually land in, and
          how much that varies.
        </p>
        <PerformanceConsistencyPanel readings={dossier.performanceConsistency} />
      </Section>

      {/* Trends / weekly */}
      {dossier.trends.length > 0 && (
        <Section icon={TrendingUp} title="Weekly improvement summary" className="mb-6">
          <p className="mb-4 text-sm text-muted-foreground">{dossier.weeklySummary}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dossier.trends.map((t) => (
              <div key={t.key} className="rounded-2xl bg-white/[0.03] p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{t.label}</span>
                  {dirIcon(t.direction, t.improved)}
                </div>
                <div className="text-sm font-medium">
                  {t.previous} → {t.current}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Champion advice */}
      {dossier.championAdvice.length > 0 && (
        <Section icon={Swords} title="Champion-specific advice" className="mb-6">
          <div className="grid gap-3 md:grid-cols-2">
            {dossier.championAdvice.map((c) => (
              <div key={c.name} className="rounded-2xl bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-semibold">{c.name}</span>
                  <Pill tone={c.winRate >= 55 ? "success" : c.winRate <= 45 ? "danger" : "neutral"}>
                    {c.winRate}% · {c.games}g
                  </Pill>
                </div>
                <p className="mt-2 text-xs text-success">↑ {c.strength}</p>
                <p className="text-xs text-warning">↓ {c.weakness}</p>
                <p className="mt-2 text-xs text-muted-foreground">{c.note}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section icon={HeartPulse} title="Mental & focus notes">
        <p className="text-sm leading-relaxed text-muted-foreground">{dossier.mentalNotes}</p>
        <div className="mt-3">
          <ActiveFocusNote text={activeFocusReference(dossier.plan)} />
        </div>
      </Section>

    </AppShell>
  );
}
