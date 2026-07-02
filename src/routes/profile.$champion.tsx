import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { ArrowLeft, ArrowDownRight, ArrowUpRight, Minus, ShieldAlert, Sparkles } from "lucide-react";
import { AppShell, Pill, DemoModeBanner } from "@/components/app-shell";
import { usePlayerProfile } from "@/hooks/use-player-profile";

export const Route = createFileRoute("/profile/$champion")({
  component: ChampionProgressPage,
});

function ChampionProgressPage() {
  const { champion } = Route.useParams();
  const { profile } = usePlayerProfile();
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

  const chron = [...matches].reverse().map((m, i) => ({ game: `G${i + 1}`, score: m.botDiffScore }));
  const TrendIcon = champ.trend > 0 ? ArrowUpRight : champ.trend < 0 ? ArrowDownRight : Minus;
  const trendTone = champ.trend > 0 ? "text-success" : champ.trend < 0 ? "text-destructive" : "text-muted-foreground";

  const stats: { label: string; value: string }[] = [
    { label: "Games Played", value: `${champ.games}` },
    { label: "Win Rate", value: `${champ.winRate}%` },
    { label: "Average Grade", value: champ.avgGradeLetter },
    { label: "Average CS", value: `${champ.avgCs}/min` },
    { label: "Average Vision", value: `${champ.avgVision}` },
    { label: "Average KDA", value: `${champ.avgKda} : 1` },
    { label: "BotDiff Score", value: `${champ.botDiffScore}` },
  ];

  return (
    <AppShell>
      {profile.isDemo && <DemoModeBanner />}
      <Link to="/profile" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Profile
      </Link>

      <div className="glass rise flex flex-wrap items-center gap-4 rounded-3xl p-6">
        <img src={champ.img} alt="" className="size-16 rounded-2xl object-cover ring-1 ring-white/10" />
        <div className="flex-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{champ.name}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>Improvement trend</span>
            <span className={`inline-flex items-center gap-0.5 font-medium ${trendTone}`}>
              <TrendIcon className="size-4" />
              {champ.trend > 0 ? "+" : ""}{champ.trend} pts
            </span>
          </div>
        </div>
        <span className="font-display text-4xl font-semibold text-primary">{champ.avgGradeLetter}</span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {stats.map((s) => (
          <div key={s.label} className="glass rise rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-1 font-display text-xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="glass rise rounded-3xl p-6">
          <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">BotDiff Score over time</h2>
          {chron.length > 1 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chron} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="champGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="game" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--foreground)",
                    }}
                  />
                  <Area type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5} fill="url(#champGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Play more games on {champ.name} to see a trend.</p>
          )}
        </div>

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