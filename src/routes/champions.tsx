import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Pill, PageHeader, DemoModeBanner } from "@/components/app-shell";
import { useBotDiffData } from "@/lib/player-data";
import { useRiotAssets } from "@/hooks/use-riot-assets";

export const Route = createFileRoute("/champions")({
  head: () => ({
    meta: [
      { title: "Champion Pool — BotDiff" },
      {
        name: "description",
        content:
          "Track mastery, win rates, and your weakest matchups across your champion pool with personalized coaching notes.",
      },
      { property: "og:title", content: "Champion Pool — BotDiff" },
      { property: "og:description", content: "Master your pool with focused, personalized notes." },
    ],
  }),
  component: Champions,
});

function Champions() {
  const { isDemo, data } = useBotDiffData();
  const { assets } = useRiotAssets();
  return (
    <AppShell>
      {isDemo && <DemoModeBanner />}
      <PageHeader
        eyebrow="Champion Pool"
        title="Master your pool"
        subtitle="A focused pool climbs faster. Here's where your strengths and gaps are."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {data.champions.map((c, i) => (
          <Link
            key={c.name}
            to="/profile/$champion"
            params={{ champion: c.name }}
            style={{ animationDelay: `${i * 70}ms` }}
            className="glass glass-hover rise block rounded-3xl p-6"
          >
            <div className="flex items-center gap-4">
              <img src={assets.championSquare(c.name)} alt={c.name} className="size-16 rounded-2xl object-cover" />
              <div className="flex-1">
                <h2 className="font-display text-xl font-semibold tracking-tight">{c.name}</h2>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Pill tone={c.tone}>{c.wr} WR</Pill>
                  <span>{c.games} games</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                <span>Mastery</span>
                <span>{c.mastery}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${c.mastery}%` }}
                />
              </div>
            </div>

            <p className="mt-5 rounded-2xl bg-white/[0.03] p-4 text-sm text-muted-foreground">
              {c.note}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
              View champion analysis →
            </span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}