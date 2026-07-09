import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  MessageSquareText,
  Target,
  Trophy,
  Gauge,
  Clock,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Activity,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Lightbulb,
  Dumbbell,
  AlertTriangle,
  Sparkles,
  Rocket,
  CheckCircle2,
  Circle,
  Globe,
  RefreshCw,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { AppShell, Pill, DemoModeBadge } from "@/components/app-shell";
import { CoachingCard } from "@/components/coaching-card";
import { useAuth } from "@/hooks/use-auth";
import { useBotDiffData, type Match, type Tone } from "@/lib/player-data";
import { ChampionBackdrop } from "@/components/champion-backdrop";
import { useRiotSummary } from "@/hooks/use-riot-summary";
import type { RiotAccountSummary } from "@/lib/riot.functions";
import { useCoachDossier } from "@/hooks/use-coach-dossier";
import { useSync, formatLastSynced } from "@/hooks/use-sync";

/** Live "Checking Riot..." / "Last synced: X ago" indicator for the hero. */
function SyncStatus() {
  const { checking, lastSyncedAt, linked } = useSync();
  const [, tick] = useState(0);

  // Re-render every 20s so the relative timestamp stays fresh.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 20_000);
    return () => clearInterval(id);
  }, []);

  if (!linked) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {checking ? (
        <>
          <Loader2 className="size-3.5 animate-spin text-primary" />
          <span>Checking Riot…</span>
        </>
      ) : (
        <>
          <RefreshCw className="size-3.5" />
          <span>{formatLastSynced(lastSyncedAt)}</span>
        </>
      )}
    </div>
  );
}

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
  component: DashboardPage,
});

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const toneText: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};
const toneBar: Record<Tone, string> = {
  neutral: "bg-muted-foreground/50",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

/** Section heading used across the dashboard. */
function SectionTitle({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-primary">
          <Icon className="size-4" />
        </span>
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function DashboardPage() {
  return <DashboardInner />;
}

function RiotAccountCard({
  summary,
  loading,
  error,
  onRefresh,
}: {
  summary: RiotAccountSummary | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <section className="glass rise mb-6 rounded-3xl p-5 md:p-6" style={{ animationDelay: "30ms" }}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          {summary?.profileIconUrl ? (
            <img
              src={summary.profileIconUrl}
              alt=""
              className="size-14 rounded-2xl object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-dim ring-1 ring-white/10">
              {loading ? <Loader2 className="size-5 animate-spin text-white" /> : <Trophy className="size-5 text-white" />}
            </div>
          )}
          {summary?.summonerLevel != null && (
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold ring-1 ring-white/10">
              {summary.summonerLevel}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {summary ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-lg font-semibold tracking-tight">
                  {summary.gameName}
                </span>
                <span className="text-muted-foreground">#{summary.tagLine}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Globe className="size-3.5" /> {summary.regionLabel}
                </span>
                {summary.summonerLevel != null && <span>· Level {summary.summonerLevel}</span>}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              {error ?? "Loading your Riot profile…"}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {summary && (
            <Pill tone={summary.rank ? "primary" : "neutral"}>
              <Trophy className="size-3.5" />
              {summary.rank
                ? `${summary.rank.tier} ${summary.rank.division} · ${summary.rank.lp} LP`
                : "Unranked"}
            </Pill>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh Riot profile"
            className="grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      {summary?.rank && (
        <div className="mt-3 text-xs text-muted-foreground">
          {summary.rank.wins}W / {summary.rank.losses}L ·{" "}
          {Math.round(
            (summary.rank.wins / Math.max(1, summary.rank.wins + summary.rank.losses)) * 100,
          )}
          % win rate
        </div>
      )}
    </section>
  );
}

function DashboardInner() {
  const { isDemo, data, identity } = useBotDiffData();
  const { profile, user } = useAuth();
  const { summary, loading: riotLoading, error: riotError, refresh: refreshRiot } = useRiotSummary();
  const { dossier } = useCoachDossier();
  const greetingName =
    summary?.gameName ?? profile?.username ?? identity?.gameName ?? data.playerName ?? user?.email?.split("@")[0];
  const avatarUrl = profile?.avatar_url ?? profile?.profile_picture;
  const focus = data.todaysFocus;
  const co = data.coachingOverview;
  const po = data.performanceOverview;
  const rankPill = summary
    ? summary.rank
      ? `${summary.rank.tier} ${summary.rank.division} · ${summary.rank.lp} LP`
      : "Unranked"
    : `${data.rank.tier} · ${data.rank.lp} LP`;
  // The champion from the most recent game becomes the session's visual identity.
  const sessionChampion = data.matches[0]?.champ;

  return (
    <AppShell>
      {sessionChampion && (
        <div className="pointer-events-none fixed inset-0 -z-10">
          <ChampionBackdrop champions={sessionChampion} />
        </div>
      )}
      {/* ---------------- HERO ---------------- */}
      <div className="rise mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="size-12 rounded-2xl object-cover ring-1 ring-white/10"
            />
          ) : summary?.profileIconUrl ? (
            <img
              src={summary.profileIconUrl}
              alt=""
              className="size-12 rounded-2xl object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dim ring-1 ring-white/10" />
          )}
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {greeting()} · {todayLabel()}
            </div>
            <div className="mt-0.5 flex items-center gap-3">
              <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
                Welcome back, {greetingName}
              </h1>
              {isDemo && <DemoModeBadge />}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Pill tone="primary">
            <Trophy className="size-3.5" /> {rankPill}
          </Pill>
          <SyncStatus />
        </div>
      </div>

      {/* Linked Riot account — real data replaces the demo profile once connected */}
      {(summary || riotLoading || riotError) && (
        <RiotAccountCard
          summary={summary}
          loading={riotLoading}
          error={riotError}
          onRefresh={refreshRiot}
        />
      )}

      {/* Today's Focus — the single most important coaching card */}
      <section
        className="glass glass-hover rise relative overflow-hidden rounded-3xl p-7 md:p-9"
        style={{ animationDelay: "60ms" }}
      >
        <div className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
            <Target className="size-4" /> Today's Focus
          </div>
          <h2 className="max-w-2xl font-display text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
            {focus.headline}
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">{focus.detail}</p>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FocusMetric icon={Gauge} label="Coach Assessment" value={focus.confidence >= 80 ? "Sure" : focus.confidence >= 60 ? "Confident" : "Early read"} tone="primary" />
            <FocusMetric icon={Zap} label="Est. Impact" value={focus.impact} tone="success" />
            <FocusMetric icon={Activity} label="Difficulty" value={focus.difficulty} tone="warning" />
            <FocusMetric icon={Clock} label="Practice Time" value={focus.practiceTime} tone="neutral" />
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/coach"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
            >
              <MessageSquareText className="size-4" /> Coach me on this
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/matches"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium transition-colors hover:bg-white/[0.06]"
            >
              Review latest matches
            </Link>
            <Link
              to="/coaching"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium transition-colors hover:bg-white/[0.06]"
            >
              Open coaching library
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- COACHING OVERVIEW ---------------- */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          icon={ShieldCheck}
          tone="success"
          label="Primary Strength"
          value={co.primaryStrength}
          delay={120}
        />
        <OverviewCard
          icon={ShieldAlert}
          tone="warning"
          label="Primary Weakness"
          value={co.primaryWeakness}
          delay={180}
        />
        <StatCard
          icon={Gauge}
          tone="primary"
          label="Consistency Score"
          value={`${co.consistencyScore}%`}
          sub="how repeatable your play is"
          delay={240}
        />
        <StatCard
          icon={TrendingUp}
          tone="success"
          label="Improvement Trend"
          value={`+${co.improvementTrendPct}%`}
          sub="over the last week"
          delay={300}
        />
      </div>

      {/* ---------------- PERFORMANCE OVERVIEW ---------------- */}
      <section className="mt-8 rise">
        <SectionTitle icon={Trophy} title="Performance Overview" />
        <div className="glass rounded-3xl p-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-7">
            <MiniStat label="Grade" value={po.grade} highlight />
            <MiniStat label="Rank" value={po.rank} />
            <MiniStat label="Role" value={po.role} />
            <MiniStat label="Champion Pool" value={`${po.championPool}`} />
            <MiniStat label="Avg CS" value={po.avgCs} />
            <MiniStat label="Avg Vision" value={po.avgVision} />
            <MiniStat label="Avg KDA" value={po.avgKda} />
          </div>
        </div>
      </section>

      {/* ---------------- COACHING ANALYSIS ---------------- */}
      <CoachingAnalysisSection />

      {/* ---------------- RECENT MATCHES ---------------- */}
      <section className="mt-8 rise">
        <SectionTitle
          icon={Activity}
          title="Recent Matches"
          action={
            <Link to="/matches" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          }
        />
        <div className="space-y-3">
          {data.matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      </section>

      {/* ---------------- CHAMPION PERFORMANCE ---------------- */}
      <section className="mt-8 rise">
        <SectionTitle
          icon={Sparkles}
          title="Champion Performance"
          action={
            <Link to="/champions" className="text-sm font-medium text-primary hover:underline">
              View pool
            </Link>
          }
        />
        <div className="grid gap-4 md:grid-cols-2">
          {data.champions.map((c) => (
            <div key={c.name} className="glass glass-hover flex items-center gap-4 rounded-2xl p-5">
              <img src={c.img} alt="" className="size-14 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${c.trend >= 0 ? "text-success" : "text-destructive"}`}>
                    {c.trend >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                    {c.trend >= 0 ? "+" : ""}{c.trend}%
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{c.games} games</span>
                  <span>·</span>
                  <span>{c.wr} WR</span>
                  <span>·</span>
                  <span>Grade {c.avgGrade}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${toneBar[c.tone]}`}
                    style={{ width: `${c.mastery}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- AI COACHING ---------------- */}
      <section className="mt-8 rise">
        <SectionTitle icon={Rocket} title="AI Coaching" />
        <div className="grid gap-4 md:grid-cols-2">
          <InsightCard icon={Lightbulb} tone="primary" title="Biggest Improvement Opportunity" body={data.aiInsight.biggestOpportunity} />
          <InsightCard icon={Dumbbell} tone="success" title="Recommended Practice" body={data.aiInsight.recommendedPractice} />
          <InsightCard icon={AlertTriangle} tone="warning" title="Common Mistake" body={data.aiInsight.commonMistake} />
          <InsightCard icon={CheckCircle2} tone="success" title="Positive Habit" body={data.aiInsight.positiveHabit} />
        </div>
        <div className="glass mt-4 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-success/15 text-success">
              <TrendingUp className="size-5" />
            </span>
            <div>
              <div className="text-sm text-muted-foreground">Estimated LP Gain</div>
              <div className="font-display text-xl font-semibold">{data.aiInsight.estimatedLpGain}</div>
            </div>
          </div>
          <Link
            to="/coach"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Build my practice plan <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* ---------------- GOALS + PROGRESS ---------------- */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rise">
          <SectionTitle icon={Target} title="Daily Goals" />
          <div className="glass space-y-4 rounded-3xl p-6">
            {data.dailyGoals.map((g) => (
              <div key={g.label}>
                <div className="mb-1.5 flex items-center gap-2 text-sm">
                  {g.done ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground" />
                  )}
                  <span className={g.done ? "text-muted-foreground line-through" : ""}>{g.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{g.progress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${g.done ? "bg-success" : "bg-primary"}`}
                    style={{ width: `${g.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rise">
          <SectionTitle
            icon={TrendingUp}
            title="Weekly Progress"
            action={
              <Link to="/progress" className="text-sm font-medium text-primary hover:underline">
                Analytics
              </Link>
            }
          />
          <div className="glass space-y-4 rounded-3xl p-6">
            {data.skills.map((s) => (
              <div key={s.label}>
                <div className="mb-1.5 flex items-center gap-2 text-sm">
                  <span>{s.label}</span>
                  <span
                    className={`ml-auto inline-flex items-center gap-1 text-xs font-medium ${s.delta >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {s.delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {s.delta >= 0 ? "+" : ""}{s.delta}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${toneBar[s.tone]}`}
                    style={{ width: `${s.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function scoreTone(value: number): Tone {
  if (value >= 75) return "success";
  if (value >= 55) return "primary";
  if (value >= 40) return "warning";
  return "danger";
}

function ScoreMeter({ label, value, tone, sub }: { label: string; value: number; tone: Tone; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`font-display text-lg font-semibold ${toneText[tone]}`}>{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${toneBar[tone]}`} style={{ width: `${value}%` }} />
      </div>
      <div className="mt-1.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function CoachingAnalysisSection() {
  const { dossier, loading } = useCoachDossier();

  return (
    <section className="mt-8 rise">
      <SectionTitle
        icon={Gauge}
        title="Coaching Analysis"
        action={
          dossier.isDemo ? (
            <Pill tone="warning">
              <Sparkles className="size-3.5" /> Demo Analysis
            </Pill>
          ) : (
            <span className="text-xs text-muted-foreground">
              {loading ? "Updating…" : `${dossier.matchesAnalyzed} games analyzed`}
            </span>
          )
        }
      />

      <div className="glass rounded-3xl p-6">
        {/* Identity + headline */}
        <div className="flex flex-wrap items-center gap-5">
          <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-primary/12">
            <div className="text-center">
              <div className="font-display text-3xl font-semibold text-foreground">
                {dossier.winRate}%
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                win rate
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {dossier.identitySummary}
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-foreground/90">
              {dossier.overallSummary}
            </p>
          </div>
        </div>

        {/* Consistency dimensions */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {dossier.consistency.dimensions.map((d) => (
            <ScoreMeter
              key={d.label}
              label={d.label}
              value={d.score}
              tone={scoreTone(d.score)}
              sub="stability"
            />
          ))}
        </div>

        {/* Strengths / weaknesses */}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-success">
              <ShieldCheck className="size-4" /> Strengths
            </div>
            <ul className="space-y-2 text-sm text-foreground/90">
              {(dossier.strengths.length
                ? dossier.strengths
                : [{ title: "Play more games to surface strengths.", detail: "" }]
              ).map((s) => (
                <li key={s.title} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                  <span>
                    <span className="font-medium">{s.title}</span>
                    {s.detail ? <span className="text-muted-foreground"> — {s.detail}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-warning">
              <ShieldAlert className="size-4" /> Weaknesses
            </div>
            <ul className="space-y-2 text-sm text-foreground/90">
              {(dossier.weaknesses.length
                ? dossier.weaknesses
                : [{ title: "No major weaknesses detected — keep it up.", detail: "" }]
              ).map((w) => (
                <li key={w.title} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                  <span>
                    <span className="font-medium">{w.title}</span>
                    {w.detail ? <span className="text-muted-foreground"> — {w.detail}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Recurring habits from the player's history */}
      {dossier.recurringHabits.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {dossier.recurringHabits.slice(0, 4).map((h) => (
            <div key={h.id} className="glass rounded-2xl p-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-medium">{h.title}</span>
                <span
                  className={`text-xs font-medium ${
                    h.kind === "strength" ? "text-success" : "text-warning"
                  }`}
                >
                  {h.count} games{h.streak > 1 ? ` · ${h.streak} in a row` : ""}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{h.detail}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FocusMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: Tone;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={`size-3.5 ${toneText[tone]}`} /> {label}
      </div>
      <div className="mt-1.5 font-display text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  tone,
  label,
  value,
  delay,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <div className="glass glass-hover rise rounded-3xl p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className={`flex items-center gap-2 text-xs font-medium ${toneText[tone]}`}>
        <Icon className="size-4" /> {label}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-foreground/90">{value}</p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  sub,
  delay,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  sub: string;
  delay: number;
}) {
  return (
    <div className="glass glass-hover rise rounded-3xl p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className={`flex items-center gap-2 text-xs font-medium ${toneText[tone]}`}>
        <Icon className="size-4" /> {label}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`mt-1 font-display font-semibold tracking-tight ${highlight ? "text-2xl text-primary" : "text-lg"}`}
      >
        {value}
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const [open, setOpen] = useState(false);
  const win = match.result === "Victory";
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span className={`h-12 w-1 rounded-full ${win ? "bg-success" : "bg-destructive"}`} />
        <img src={match.img} alt="" className="size-12 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{match.champ}</span>
            <span className={`text-xs font-medium ${win ? "text-success" : "text-destructive"}`}>
              {match.result}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>{match.kda} KDA</span>
            <span>· {match.cs} CS</span>
            <span>· {match.gameLength}</span>
            <span>· {match.when}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-xl font-semibold tracking-tight">{match.grade}</div>
          <div className="text-xs text-muted-foreground">grade</div>
        </div>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="animate-fade-in space-y-3 border-t border-white/[0.06] px-5 py-4 text-sm">
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="CS / min" value={match.stats.csPerMin} />
            <MiniStat label="Vision" value={match.stats.visionScore} />
            <MiniStat label="Damage share" value={match.stats.damageShare} />
          </div>
          <p className="text-success/90">
            <span className="font-medium text-success">Strength: </span>
            {match.biggestStrength}
          </p>
          <p className="text-warning/90">
            <span className="font-medium text-warning">Mistake: </span>
            {match.biggestMistake}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-primary">Coach: </span>
            {match.recommendation}
          </p>
          <Link
            to="/matches/$matchId"
            params={{ matchId: match.matchId }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            <Sparkles className="size-3.5" /> Analyze Match
          </Link>
        </div>
      )}
    </div>
  );
}

function InsightCard({
  icon: Icon,
  tone,
  title,
  body,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  body: string;
}) {
  return (
    <div className="glass glass-hover rounded-2xl p-5">
      <div className={`flex items-center gap-2 text-sm font-medium ${toneText[tone]}`}>
        <Icon className="size-4" /> {title}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-foreground/90">{body}</p>
    </div>
  );
}
