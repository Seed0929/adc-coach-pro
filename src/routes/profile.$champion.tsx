import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowDownRight, ArrowUpRight, Minus, ShieldAlert, Sparkles } from "lucide-react";
import { AppShell, Pill, DemoModeBanner } from "@/components/app-shell";
import { usePlayerProfile } from "@/hooks/use-player-profile";
import { useRiotAssets } from "@/hooks/use-riot-assets";
import { ChampionBackdrop } from "@/components/champion-backdrop";
import { MetricGraphCard } from "@/components/metrics/metric-graphs";
import { TREND_LABELS, classifyTrend, type MetricReading } from "@/lib/metrics/metric-reading";

/**
 * Champion graph — a real, measurable statistic (CS per minute) across the
 * player's games on this champion. No composite score, no benchmarks.
 */
function championReading(
  name: string,
  chron: { game: string; value: number }[],
  isDemo: boolean,
): MetricReading {
  const current = chron[chron.length - 1].value;
  const previous = chron.length > 1 ? chron[chron.length - 2].value : null;
  const trend = classifyTrend(current, previous, "higher", 0.3);
  const best = Math.max(...chron.map((c) => c.value));
  const atBest = current >= best;
  return {
    key: `champ-${name}-cs`,
    name: `${name} — CS per minute`,
    value: current,
    unit: "/min",
    direction: "higher",
    trend,
    trendLabel: TREND_LABELS[trend],
    previous,
    comparison: previous == null ? "Not enough games on this champion yet" : "vs your previous game",
    baseline: null,
    target: atBest ? null : { value: best, label: `Your best ${name} game`, kind: "target" },
    targetNote: atBest ? "This is your best farming game on this champion." : null,
    interpretation: `Your farming rate across your ${name} games, measured in creeps per minute.`,
    points: chron.map((c, i) => ({ index: i, value: c.value, label: c.game })),
    sourceLabel: isDemo ? "Sample data" : "Your imported ranked games",
  };
}

export const Route = createFileRoute("/profile/$champion")({
  component: ChampionProgressPage,
});

function ChampionProgressPage() {
  const { champion } = Route.useParams();
  const { profile } = usePlayerProfile();
  const { assets } = useRiotAssets();
  const champ = profile.champions.find((c) => c.name === champion);
  const matches = profile.matches.filter((m) => m.champion === champion);

  if (!champ) {
    return (
      <AppShell>
        <Link to="/profile" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to Profile
        </Link>
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-muted-foreground">No games found on {champion} yet.</p>
        </div>
      </AppShell>
    );
  }

  const chron = [...matches].reverse().map((m, i) => ({ game: `G${i + 1}`, value: m.csPerMin }));
  const recent = chron.slice(-5).map((c) => c.value);
  const earlier = chron.slice(-10, -5).map((c) => c.value);
  const avg = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
  const csDelta = earlier.length ? Math.round((avg(recent) - avg(earlier)) * 10) / 10 : null;
  const TrendIcon = csDelta == null || csDelta === 0 ? Minus : csDelta > 0 ? ArrowUpRight : ArrowDownRight;
  const trendTone =
    csDelta == null || csDelta === 0
      ? "text-muted-foreground"
      : csDelta > 0
        ? "text-success"
        : "text-destructive";

  const stats: { label: string; value: string }[] = [
    { label: "Games Played", value: `${champ.games}` },
    { label: "Win Rate", value: `${champ.winRate}%` },
    { label: "Average CS", value: `${champ.avgCs}/min` },
    { label: "Average Vision", value: `${champ.avgVision}` },
    { label: "Average KDA", value: `${champ.avgKda} : 1` },
  ];

  return (
    <AppShell>
      {profile.isDemo && <DemoModeBanner />}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <ChampionBackdrop champions={champ.name} intensity="medium" />
      </div>
      <Link to="/profile" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Profile
      </Link>

      <div className="glass rise flex flex-wrap items-center gap-4 rounded-3xl p-6">
        <img src={assets.championSquare(champ.name)} alt="" className="size-16 rounded-2xl object-cover ring-1 ring-white/10" />
        <div className="flex-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{champ.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>CS / min, last 5 games vs the 5 before</span>
            <span className={`inline-flex items-center gap-0.5 font-medium ${trendTone}`}>
              <TrendIcon className="size-4" />
              {csDelta == null
                ? "Needs more data"
                : `${csDelta > 0 ? "+" : ""}${csDelta.toFixed(1)}/min`}
            </span>
          </div>
        </div>
        <span className="font-display text-4xl font-semibold text-primary">{champ.winRate}%</span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="glass rise rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-1 font-display text-xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {chron.length > 1 ? (
          <MetricGraphCard reading={championReading(champ.name, chron, profile.isDemo)} height={200} />
        ) : (
          <div className="glass rise rounded-3xl p-6">
            <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">CS per minute over time</h2>
            <p className="text-sm text-muted-foreground">Play more games on {champ.name} to see a trend.</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="glass rise rounded-3xl p-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-success">
              <Sparkles className="size-4" /> Strongest Area
            </div>
            <p className="text-lg font-medium">{champ.strongest}</p>
          </div>
          <div className="glass rise rounded-3xl p-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-warning">
              <ShieldAlert className="size-4" /> Weakest Area
            </div>
            <p className="text-lg font-medium">{champ.weakest}</p>
            <div className="mt-4 rounded-2xl bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Most Common Mistake</div>
              <p className="mt-1 text-sm">{champ.commonMistake}</p>
            </div>
          </div>
        </div>
      </div>

      {matches.length > 0 && (
        <div className="glass rise mb-4 mt-6 rounded-3xl p-6">
          <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">Recent games</h2>
          <div className="space-y-2">
            {matches.slice(0, 10).map((m) => (
              <div key={m.matchId} className="flex items-center gap-4 rounded-2xl bg-white/[0.03] px-4 py-3 text-sm">
                <Pill tone={m.win ? "success" : "danger"}>{m.win ? "Win" : "Loss"}</Pill>
                <span className="w-20 text-muted-foreground">{m.kills}/{m.deaths}/{m.assists}</span>
                <span className="w-20 text-muted-foreground">{m.csPerMin.toFixed(1)} cs/min</span>
                <span className="w-24 text-muted-foreground">{m.visionScore} vision</span>
                <span className="ml-auto font-display font-semibold text-primary">{m.botDiffScore}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}