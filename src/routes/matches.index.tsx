import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, Crosshair, Eye, Sword, ShieldAlert, ThumbsUp, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { AppShell, Pill, PageHeader, DemoModeBanner } from "@/components/app-shell";
import { useBotDiffData, type Match } from "@/lib/player-data";
import { useMatchHistory } from "@/hooks/use-match-history";
import { useRiotAssets } from "@/hooks/use-riot-assets";
import type { StoredMatch } from "@/lib/matches.functions";

export const Route = createFileRoute("/matches/")({
  head: () => ({
    meta: [
      { title: "Match Review — BotDiff" },
      {
        name: "description",
        content:
          "Open any game like a report: overall grade, LP impact, biggest mistake, biggest strength, CS and gold curves, and the highest-impact recommendations.",
      },
      { property: "og:title", content: "Match Review — BotDiff" },
      { property: "og:description", content: "Every match feels like opening a coaching report." },
    ],
  }),
  component: Matches,
});

const chartTooltip = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--foreground)",
} as const;

function CurveChart({
  match,
  dataKey,
  benchKey,
  label,
}: {
  match: Match;
  dataKey: "cs" | "gold" | "damage";
  benchKey: "csBenchmark" | "goldBenchmark" | "damageBenchmark";
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">You vs rank avg</span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={match.timeline} margin={{ left: -18, right: 8, top: 6, bottom: 0 }}>
            <XAxis
              dataKey="minute"
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(m) => `${m}'`}
            />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={44} />
            <Tooltip contentStyle={chartTooltip} />
            <Line
              type="monotone"
              dataKey={benchKey}
              name="Rank avg"
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              name="You"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Matches() {
  const history = useMatchHistory();
  // Real Riot match history takes over once the account is linked.
  if (history.linked) return <RealMatches history={history} />;
  return <DemoMatches />;
}

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function kdaRatio(m: StoredMatch): string {
  const ratio = m.deaths === 0 ? m.kills + m.assists : (m.kills + m.assists) / m.deaths;
  return `${ratio.toFixed(2)} KDA`;
}

function RealMatches({ history }: { history: ReturnType<typeof useMatchHistory> }) {
  const { matches, loading, syncing, error, lastImported, sync } = history;
  const { assets } = useRiotAssets();

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="Match Review"
          title="Your recent games"
          subtitle="Imported directly from your linked Riot account."
        />
        <button
          onClick={() => void sync()}
          disabled={syncing}
          className="glass glass-hover inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {syncing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {syncing ? "Syncing…" : "Sync Matches"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/[0.06] p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      {lastImported != null && !error && (
        <div className="mb-4 rounded-2xl border border-success/20 bg-success/[0.06] p-4 text-sm text-success">
          {lastImported > 0
            ? `Imported ${lastImported} new match${lastImported === 1 ? "" : "es"}.`
            : "You're already up to date."}
        </div>
      )}

      {loading && matches.length === 0 ? (
        <div className="glass flex items-center gap-3 rounded-3xl p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your matches…
        </div>
      ) : matches.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No matches imported yet. Hit <span className="font-medium text-foreground">Sync Matches</span> to
            pull your 20 most recent games from Riot.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m, i) => {
            const win = m.win;
            return (
              <Link
                key={m.id}
                to="/matches/$matchId"
                params={{ matchId: m.matchId }}
                style={{ animationDelay: `${i * 40}ms` }}
                className={`glass glass-hover rise flex flex-wrap items-center gap-4 rounded-2xl p-4 ${
                  win ? "border-success/25" : "border-destructive/25"
                }`}
              >
                <img
                  src={assets.championSquare(m.championName)}
                  alt={m.championName}
                  className="size-11 rounded-xl object-cover"
                  loading="lazy"
                  onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.championName}</span>
                    <Pill tone={win ? "success" : "danger"}>{win ? "Victory" : "Defeat"}</Pill>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {m.queueLabel ?? "Match"} · {fmtDate(m.gameCreation)} · {fmtDuration(m.gameDuration)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right sm:grid-cols-3">
                  <div>
                    <div className="font-display text-base font-semibold">
                      {m.kills}/{m.deaths}/{m.assists}
                    </div>
                    <div className="text-xs text-muted-foreground">{kdaRatio(m)}</div>
                  </div>
                  <div>
                    <div className="font-display text-base font-semibold">{m.cs}</div>
                    <div className="text-xs text-muted-foreground">CS</div>
                  </div>
                  <div>
                    <div className="font-display text-base font-semibold text-primary">
                      {(m.gold / 1000).toFixed(1)}k
                    </div>
                    <div className="text-xs text-muted-foreground">Gold</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <Sparkles className="size-3.5" /> AI Coach
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function DemoMatches() {
  const { isDemo, data } = useBotDiffData();
  const { assets } = useRiotAssets();
  const [activeId, setActiveId] = useState<number>(data.matches[0].id);
  const active = data.matches.find((m) => m.id === activeId) ?? data.matches[0];
  const activeIndex = data.matches.findIndex((m) => m.id === active.id);

  return (
    <AppShell>
      {isDemo && <DemoModeBanner />}
      <PageHeader
        eyebrow="Match Review"
        title="Your recent games"
        subtitle="Each match is a report — we surface only the insights that move your rank."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* List */}
        <div className="space-y-3">
          {data.matches.map((m, i) => {
            const win = m.result === "Victory";
            const selected = m.id === active.id;
            return (
              <button
                key={m.id}
                onClick={() => setActiveId(m.id)}
                style={{ animationDelay: `${i * 50}ms` }}
                className={`glass glass-hover rise flex w-full items-center gap-4 rounded-2xl p-4 text-left ${
                  selected ? "border-primary/40" : ""
                }`}
              >
                <img src={assets.championSquare(m.champ)} alt={m.champ} className="size-11 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.champ}</span>
                    <Pill tone={win ? "success" : "danger"}>{m.result}</Pill>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {m.kda} · {m.cs} CS · {m.when}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl font-semibold text-primary">{m.grade}</div>
                  <div className={`text-xs ${win ? "text-success" : "text-destructive"}`}>{m.lp} LP</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Report */}
        <div className="glass rise rounded-3xl p-7" key={active.id}>
          <ChampionBackdrop champions={active.champ} intensity="medium" />
          <div className="relative flex items-center gap-4">
            <img src={assets.championSquare(active.champ)} alt={active.champ} className="size-14 rounded-2xl object-cover" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-semibold tracking-tight">{active.champ}</h2>
                <Pill tone={active.result === "Victory" ? "success" : "danger"}>{active.result}</Pill>
              </div>
              <div className="text-sm text-muted-foreground">{active.kda} · {active.cs} CS</div>
            </div>
            <div className="text-right">
              <div className="font-display text-4xl font-semibold text-primary">{active.grade}</div>
              <div className="text-xs text-muted-foreground">Overall Grade</div>
            </div>
          </div>

          <div className="my-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.06] p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-destructive">
                <ShieldAlert className="size-4" /> Biggest Mistake
              </div>
              <p className="text-sm text-muted-foreground">{active.biggestMistake}</p>
            </div>
            <div className="rounded-2xl border border-success/20 bg-success/[0.06] p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-success">
                <ThumbsUp className="size-4" /> Biggest Strength
              </div>
              <p className="text-sm text-muted-foreground">{active.biggestStrength}</p>
            </div>
          </div>

          {/* CS & gold curves */}
          <div className="grid gap-3 xl:grid-cols-3">
            <CurveChart match={active} dataKey="cs" benchKey="csBenchmark" label="CS over time" />
            <CurveChart match={active} dataKey="gold" benchKey="goldBenchmark" label="Gold over time" />
            <CurveChart match={active} dataKey="damage" benchKey="damageBenchmark" label="Damage over time" />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Crosshair, label: "CS/min", value: active.stats.csPerMin },
              { icon: Eye, label: "Vision", value: active.stats.visionScore },
              { icon: Sword, label: "DMG Share", value: active.stats.damageShare },
              { icon: ArrowUpRight, label: "LP Impact", value: active.lp },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/[0.03] p-4">
                <s.icon className="mb-2 size-4 text-muted-foreground" />
                <div className="font-display text-lg font-semibold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-primary/[0.07] p-5">
            <div className="mb-1 text-sm font-medium text-primary">Recommendation</div>
            <p className="text-sm text-muted-foreground">{active.recommendation}</p>
          </div>

          <Link
            to="/matches/$matchId"
            params={{ matchId: `demo-${activeIndex < 0 ? 0 : activeIndex}` }}
            className="glass glass-hover mt-4 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-primary"
          >
            Open full AI Coach report <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* Positioning heatmap */}
      <div className="mt-6 glass rise rounded-3xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">Death & Positioning Heatmap</h2>
          <Pill tone="warning">Mid-game hotspots</Pill>
        </div>
        <div className="grid gap-5 md:grid-cols-[1.2fr_1fr] md:items-center">
          <img
            src={data.heatmapImg}
            alt="Positioning heatmap showing where deaths cluster on the map"
            className="w-full rounded-2xl border border-white/10 object-cover"
          />
          <p className="rounded-2xl bg-white/[0.03] p-4 text-sm text-muted-foreground">
            {data.heatmapNote}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
