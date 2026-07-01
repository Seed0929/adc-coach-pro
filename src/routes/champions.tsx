import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Pill, PageHeader } from "@/components/app-shell";
import champKaisa from "@/assets/champ-1.jpg";
import champEzreal from "@/assets/champ-2.jpg";

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

const champions = [
  {
    name: "Kai'Sa",
    img: champKaisa,
    mastery: 92,
    wr: "62%",
    games: 148,
    note: "Your best carry. Keep prioritizing this in tough queues.",
    tone: "success" as const,
  },
  {
    name: "Ezreal",
    img: champEzreal,
    mastery: 74,
    wr: "48%",
    games: 96,
    note: "Safe pick, but your mid-game positioning dips here.",
    tone: "warning" as const,
  },
];

function Champions() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Champion Pool"
        title="Master your pool"
        subtitle="A focused pool climbs faster. Here's where your strengths and gaps are."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {champions.map((c, i) => (
          <div
            key={c.name}
            style={{ animationDelay: `${i * 70}ms` }}
            className="glass glass-hover rise rounded-3xl p-6"
          >
            <div className="flex items-center gap-4">
              <img src={c.img} alt={c.name} className="size-16 rounded-2xl object-cover" />
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
          </div>
        ))}
      </div>
    </AppShell>
  );
}