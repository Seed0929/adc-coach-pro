import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  Eye,
  Flame,
  Gamepad2,
  Layers,
  Lock,
  Medal,
  Minus,
  Star,
  Sword,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { AppShell, Pill, DemoModeBanner } from "@/components/app-shell";
import { usePlayerProfile } from "@/hooks/use-player-profile";
import { useRiotAssets } from "@/hooks/use-riot-assets";
import { ChampionBackdrop } from "@/components/champion-backdrop";
import {
  computeTrends,
  type PlayerProfile,
  type TrendWindow,
} from "@/lib/profile-engine";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});

const ICONS: Record<string, LucideIcon> = {
  trophy: Trophy,
  layers: Layers,
  sword: Sword,
  eye: Eye,
  target: Target,
  flame: Flame,
  medal: Medal,
  "trending-up": TrendingUp,
  zap: Zap,
  users: Users,
  star: Star,
};

function ScoreRing({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative grid size-32 place-items-center">
      <svg className="size-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--glass-border)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s var(--ease-out-expo)" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-4xl font-semibold leading-none">{value}</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Score</div>
      </div>
    </div>
  );
}

function Delta({ value, suffix = "" }: { value: number; suffix?: string }) {
  const tone = value > 0 ? "text-success" : value < 0 ? "text-destructive" : "text-muted-foreground";
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-medium ${tone}`}>
      <Icon className="size-3.5" />
      {value > 0 ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

function StatTile({ label, value, delta }: { label: string; value: string | number; delta?: number }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-2xl font-semibold">{value}</span>
        {delta !== undefined && <Delta value={delta} />}
      </div>
    </div>
  );
}

const WINDOWS: { label: string; value: TrendWindow }[] = [
  { label: "Last 10", value: 10 },
  { label: "Last 20", value: 20 },
  { label: "Last 50", value: 50 },
  { label: "All Time", value: 0 },
];

function ImprovementHistory({ profile }: { profile: PlayerProfile }) {
  const [win, setWin] = useState<TrendWindow>(10);
  const trends = computeTrends(profile.matches, win);
  return (
    <div className="glass rise rounded-3xl p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">Improvement History</h2>
          <p className="text-sm text-muted-foreground">How each part of your game is trending.</p>
        </div>
        <div className="flex gap-1 rounded-full bg-white/[0.04] p-1">
          {WINDOWS.map((w) => (
            <button
              key={w.label}
              onClick={() => setWin(w.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                win === w.value ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
      {trends.length === 0 ? (
        <p className="text-sm text-muted-foreground">Play more games to unlock trend history.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trends.map((t) => (
            <div key={t.key} className="rounded-2xl bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t.label}</span>
                <Delta value={t.delta} suffix={t.unit} />
              </div>
              <div className="mt-1 font-display text-2xl font-semibold">
                {t.average}
                <span className="ml-1 text-sm font-normal text-muted-foreground">{t.unit}</span>
              </div>
              <div className="mt-2 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={t.points} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${t.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={t.better ? "var(--success)" : "var(--warning)"} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={t.better ? "var(--success)" : "var(--warning)"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={t.better ? "var(--success)" : "var(--warning)"}
                      strokeWidth={2}
                      fill={`url(#grad-${t.key})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfilePage() {
  const { profile, loading } = usePlayerProfile();
  const { assets } = useRiotAssets();
  const { overview, score, champions, achievements, sessionSummary, records } = profile;
  // Favorite champion (+ up to top 3) drive the profile's living backdrop.
  const topChampNames = overview.topChampions.slice(0, 3).map((c) => c.name);

  return (
    <AppShell>
      {profile.isDemo && <DemoModeBanner />}

      {/* Overview */}
      <div className="glass rise relative overflow-hidden rounded-3xl p-6">
        {topChampNames.length > 0 && (
          <ChampionBackdrop champions={topChampNames} intensity="medium" />
        )}
        <div className="relative flex flex-wrap items-center gap-5">
          {overview.profileIconUrl ? (
            <img
              src={overview.profileIconUrl}
              alt=""
              className="size-20 rounded-2xl object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-dim font-display text-2xl font-bold text-primary-foreground">
              {overview.gameName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                {overview.gameName}
                <span className="text-muted-foreground">#{overview.tagLine}</span>
              </h1>
              {overview.accountLevel != null && <Pill>Lvl {overview.accountLevel}</Pill>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Pill tone="primary">{overview.rankLabel}{overview.lp != null ? ` · ${overview.lp} LP` : ""}</Pill>
              <Pill>{overview.regionLabel}</Pill>
              <Pill>{overview.mainRole}</Pill>
              <span>{overview.totalGames} ranked games imported</span>
            </div>
          </div>
        </div>

        {overview.topChampions.length > 0 && (
          <div className="relative mt-6">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Top Champions</div>
            <div className="flex flex-wrap gap-3">
              {overview.topChampions.map((c) => (
                <Link
                  key={c.name}
                  to="/profile/$champion"
                  params={{ champion: c.name }}
                  className="glass-hover flex items-center gap-3 rounded-2xl bg-white/[0.03] px-3 py-2"
                >
                  <img src={assets.championSquare(c.name)} alt="" className="size-9 rounded-lg object-cover" />
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.games} games · {c.winrate}% WR</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BotDiff Score */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="glass rise grid place-items-center gap-4 rounded-3xl p-6 text-center">
          <ScoreRing value={score.current} />
          <div>
            <div className="font-display text-lg font-semibold">BotDiff Score</div>
            <p className="mt-1 max-w-[14rem] text-xs text-muted-foreground">
              Your overall improvement rating across consistency, farming, vision, objectives, positioning & teamfighting.
            </p>
          </div>
        </div>

        <div className="glass rise rounded-3xl p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="Current" value={score.current} delta={score.current - score.previous} />
            <StatTile label="Previous" value={score.previous} />
            <StatTile label="Weekly Change" value={score.current} delta={score.weeklyChange} />
            <StatTile label="Monthly Change" value={score.current} delta={score.monthlyChange} />
            <StatTile label="Best Ever" value={score.best} />
            <StatTile label="Lowest" value={score.lowest} />
          </div>
          <div className="mt-5">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Score Breakdown</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {score.breakdown.map((b) => (
                <div key={b.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{b.label}</span>
                    <span className="text-muted-foreground">{b.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        b.value >= 70 ? "bg-success" : b.value >= 50 ? "bg-primary" : "bg-warning"
                      }`}
                      style={{ width: `${b.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Session summary */}
      {sessionSummary && (
        <div className="glass rise mt-6 rounded-3xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/12 text-primary">
              <Gamepad2 className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">Since your last session</h2>
              <p className="text-sm text-muted-foreground">
                {sessionSummary.wins}W {sessionSummary.losses}L across {sessionSummary.games} games
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {sessionSummary.lines.map((l) => (
              <div key={l.label} className="rounded-2xl bg-white/[0.03] p-4">
                <div className="text-xs text-muted-foreground">{l.label}</div>
                <div className={`mt-1 font-display text-xl font-semibold ${l.positive ? "text-success" : "text-warning"}`}>
                  {l.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement history */}
      <div className="mt-6">
        <ImprovementHistory profile={profile} />
      </div>

      {/* Champion progress */}
      {champions.length > 0 && (
        <div className="glass rise mt-6 rounded-3xl p-6">
          <h2 className="mb-5 font-display text-lg font-semibold tracking-tight">Champion Progress</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {champions.map((c) => (
              <Link
                key={c.name}
                to="/profile/$champion"
                params={{ champion: c.name }}
                className="glass-hover rounded-2xl bg-white/[0.03] p-4"
              >
                <div className="flex items-center gap-3">
                  <img src={assets.championSquare(c.name)} alt="" className="size-11 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{c.name}</span>
                      <span className="font-display text-lg font-semibold text-primary">{c.avgGradeLetter}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{c.games} games · {c.winRate}% WR</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Score {c.botDiffScore}</span>
                  <Delta value={c.trend} />
                  <span className="inline-flex items-center gap-1 text-primary">
                    Details <ArrowRight className="size-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      <div className="glass rise mt-6 rounded-3xl p-6">
        <div className="mb-5 flex items-center gap-2">
          <Award className="size-5 text-primary" />
          <h2 className="font-display text-lg font-semibold tracking-tight">Achievements</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {achievements.map((a) => {
            const Icon = ICONS[a.icon] ?? Trophy;
            return (
              <div
                key={a.id}
                className={`rounded-2xl p-4 transition-opacity ${
                  a.unlocked ? "bg-primary/[0.08] ring-1 ring-primary/20" : "bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`grid size-9 place-items-center rounded-xl ${
                      a.unlocked ? "bg-primary/15 text-primary" : "bg-white/[0.05] text-muted-foreground"
                    }`}
                  >
                    {a.unlocked ? <Icon className="size-5" /> : <Lock className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.name}</div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{a.description}</p>
                {!a.unlocked && a.progress > 0 && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-primary/60" style={{ width: `${a.progress}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Personal records */}
      {records.length > 0 && (
        <div className="glass rise mb-4 mt-6 rounded-3xl p-6">
          <div className="mb-5 flex items-center gap-2">
            <Star className="size-5 text-primary" />
            <h2 className="font-display text-lg font-semibold tracking-tight">Personal Records</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {records.map((r) => {
              const Icon = ICONS[r.icon] ?? Star;
              return (
                <div key={r.label} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-4">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{r.label}</div>
                    <div className="font-display text-xl font-semibold">{r.value}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && (
        <p className="mt-4 text-center text-xs text-muted-foreground">Refreshing your latest data…</p>
      )}
    </AppShell>
  );
}