import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MetricGraphCard } from "@/components/metrics/metric-graphs";
import { readingFromTrend } from "@/lib/metrics/metric-reading";
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

/**
 * Recent form in the player's own statistics. There is deliberately no
 * composite 0-100 score here: every number shown is a real game stat with a
 * unit, its previous 5-game average, and a plain-language trend word.
 */
function CurrentForm({ profile }: { profile: PlayerProfile }) {
  const trends = computeTrends(profile.matches, 10);
  if (trends.length === 0) {
    return (
      <div className="glass rise mt-6 rounded-3xl p-6">
        <h2 className="font-display text-lg font-semibold tracking-tight">Current form</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Needs more data — import a few ranked games and your recent averages appear here.
        </p>
      </div>
    );
  }
  return (
    <div className="glass rise mt-6 rounded-3xl p-6">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold tracking-tight">Current form</h2>
        <span className="text-xs text-muted-foreground">
          Recent 5-game averages vs the 5 games before them
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {trends.map((t) => (
          <div key={t.key} className="rounded-2xl bg-white/[0.03] p-4">
            <div className="text-xs text-muted-foreground">{t.label}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-semibold tabular-nums">
                {t.current}
                <span className="ml-0.5 text-xs font-normal text-muted-foreground">{t.unit}</span>
              </span>
              {t.previous != null && (
                <Delta
                  value={Math.round((t.current - t.previous) * 10) / 10}
                  higherIsBetter={t.higherIsBetter}
                />
              )}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {t.previous != null ? `Previous ${t.previous}${t.unit}` : "No earlier games to compare"}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
              {t.target != null && (
                <span className="text-[11px] text-muted-foreground">
                  Best sustained {t.target}
                  {t.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function Delta({
  value,
  suffix = "",
  higherIsBetter = true,
}: {
  value: number;
  suffix?: string;
  /** Deaths and other "lower is better" metrics invert the colour. */
  higherIsBetter?: boolean;
}) {
  const good = higherIsBetter ? value > 0 : value < 0;
  const bad = higherIsBetter ? value < 0 : value > 0;
  const tone = good ? "text-success" : bad ? "text-destructive" : "text-muted-foreground";
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
        <p className="text-sm text-muted-foreground">
          Import more of your games to unlock trend history.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {trends.map((t) => (
            <MetricGraphCard
              key={t.key}
              reading={readingFromTrend(t, profile.isDemo ? "Sample data" : "Your imported ranked games")}
              height={160}
              className="!p-5"
            />
          ))}
        </div>
      )}

    </div>
  );
}

function ProfilePage() {
  const { profile, loading } = usePlayerProfile();
  const { assets } = useRiotAssets();
  const { overview, champions, achievements, sessionSummary, records } = profile;
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

      {/* Current form — real statistics only, no composite score. */}
      <CurrentForm profile={profile} />


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
                  <span>{c.avgCs}/min CS · {c.avgKda} KDA</span>
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