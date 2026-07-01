import { createFileRoute } from "@tanstack/react-router";
import champKaisa from "@/assets/champ-1.jpg";
import champEzreal from "@/assets/champ-2.jpg";
import heatmap from "@/assets/heatmap.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BottDiff — AI Coaching for League ADC Players" },
      {
        name: "description",
        content:
          "BottDiff is an AI coaching platform for League of Legends ADC players. Analyze CS/min, gold diff, positioning and get tactical, actionable feedback to climb.",
      },
      { property: "og:title", content: "BottDiff — AI Coaching for League ADC Players" },
      {
        property: "og:description",
        content:
          "AI-driven bot lane performance analysis. Track your metrics, master your champion pool, and train with priority drills.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

const stats = [
  { label: "CS / MIN", value: "9.4", delta: "+0.8", up: true },
  { label: "GOLD @ 10", value: "3,840", delta: "-120", up: false },
  { label: "DMG SHARE", value: "32.4%", delta: "+4.1%", up: true },
  { label: "KDA RATIO", value: "4.21", delta: "+1.2", up: true },
];

const champions = [
  {
    name: "KAI'SA",
    img: champKaisa,
    wr: "62% WINRATE",
    note: "Carry potential: High | Stability: Med",
    active: true,
  },
  {
    name: "EZREAL",
    img: champEzreal,
    wr: "48% WINRATE",
    note: "Carry potential: Med | Stability: High",
    active: false,
  },
];

const drills = [
  {
    tag: "Mechanical",
    tagClass: "text-primary",
    lvl: "LVL 4",
    title: "ORB WALKING INTENSITY",
    desc: "Maintain 180 APM while tracking enemy cooldowns.",
  },
  {
    tag: "Macro",
    tagClass: "text-gold",
    lvl: "LVL 2",
    title: "RECALL OPTIMIZATION",
    desc: "Sync back timers with wave crash and gold breakpoints.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-8">
          <span className="font-display text-2xl tracking-widest text-primary">BOTDIFF</span>
          <div className="hidden gap-6 text-xs font-medium uppercase tracking-tighter text-muted-foreground md:flex">
            <a href="#" className="text-foreground transition-colors hover:text-primary">Dashboard</a>
            <a href="#history" className="transition-colors hover:text-primary">Match History</a>
            <a href="#drills" className="transition-colors hover:text-primary">Drills</a>
            <a href="#" className="transition-colors hover:text-primary">VOD Review</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-sm border border-gold/30 bg-gold/5 px-3 py-1">
            <div className="size-1.5 rounded-full bg-gold shadow-[0_0_8px_hsl(45_60%_55%/0.6)]" />
            <span className="font-mono text-[10px] font-bold uppercase text-gold">Diamond I</span>
          </div>
          <div className="size-8 rounded-sm border border-border bg-surface-bright" />
        </div>
      </nav>

      <main className="mx-auto max-w-7xl animate-[fade-in_0.6s_var(--ease-out-expo)_both] space-y-6 p-6">
        {/* Hero / Performance Overview */}
        <header className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="scanline-effect rounded-sm border border-border bg-surface p-8 lg:col-span-8">
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h1 className="mb-1 font-display text-5xl tracking-tight">SITUATION REPORT</h1>
                <p className="max-w-md text-sm text-muted-foreground">
                  Your positioning at the 15-minute mark is currently 14% below Diamond average.
                  Focus on back-to-front kiting.
                </p>
              </div>
              <div className="text-right">
                <div className="mb-1 font-mono text-[10px] uppercase text-muted-foreground">
                  Overall BottDiff Score
                </div>
                <div className="font-display text-6xl leading-none text-primary">+12.4</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="space-y-1">
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">{s.label}</div>
                  <div className="font-display text-2xl">
                    {s.value}
                    <span className={`ml-1 text-[12px] ${s.up ? "text-primary" : "text-destructive"}`}>
                      {s.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:col-span-4">
            <div className="group relative flex-1 cursor-pointer rounded-sm border border-primary/20 bg-surface-bright p-6">
              <div className="absolute right-3 top-3 text-primary">
                <span className="rounded-full border border-primary/40 px-2 py-0.5 font-mono text-[10px]">
                  AI LIVE
                </span>
              </div>
              <h3 className="mb-3 font-display text-xl">Tactical Coach</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                "You're getting caught in the Dragon pit rotation. Stop pathing through unwarded
                tri-brush."
              </p>
              <button className="w-full bg-primary py-2 font-display tracking-widest text-primary-foreground transition-colors hover:bg-brand-dim">
                OPEN CHAT
              </button>
            </div>
            <div className="rounded-sm border border-border bg-surface p-6">
              <div className="mb-4 font-mono text-[10px] uppercase text-muted-foreground">
                Daily Drill Progression
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-background">
                <div className="h-full w-2/3 bg-primary shadow-[0_0_12px_hsl(185_100%_50%/0.4)]" />
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px]">
                <span>4/6 DRILLS COMPLETE</span>
                <span className="text-primary">67%</span>
              </div>
            </div>
          </div>
        </header>

        {/* Positioning Heatmap */}
        <section id="history" className="overflow-hidden rounded-sm border border-border bg-surface">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-display text-2xl tracking-tight">DEATH POSITIONING ANALYSIS</h2>
          </div>
          <div className="p-6">
            <img
              src={heatmap}
              alt="Tactical heatmap of bot lane death positioning"
              loading="lazy"
              width={1024}
              height={512}
              className="w-full rounded-sm border border-border object-cover"
            />
          </div>
        </section>

        {/* Main Data Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Champion Pool */}
          <section className="space-y-4 md:col-span-2">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl tracking-tight">CHAMPION MASTERY</h2>
              <span className="font-mono text-[10px] text-muted-foreground">SEASON 14 PHASE 2</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {champions.map((c) => (
                <div
                  key={c.name}
                  className={`rounded-r-sm border-l-2 bg-surface bg-gradient-to-r to-transparent p-4 ${
                    c.active ? "border-primary from-primary/5" : "border-muted-foreground from-muted/5"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={c.img}
                      alt={c.name}
                      loading="lazy"
                      width={48}
                      height={48}
                      className="size-12 rounded-sm border border-border object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-end justify-between">
                        <span className="font-display text-lg">{c.name}</span>
                        <span
                          className={`font-mono text-[10px] ${
                            c.active ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          {c.wr}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{c.note}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Priority Drills */}
          <section id="drills" className="space-y-4">
            <h2 className="font-display text-2xl tracking-tight">PRIORITY DRILLS</h2>
            <div className="space-y-3">
              {drills.map((d) => (
                <div
                  key={d.title}
                  className="group cursor-pointer border border-border bg-surface p-4 transition-colors hover:border-primary/40"
                >
                  <div className="mb-2 flex justify-between">
                    <span className={`font-mono text-[10px] uppercase tracking-tighter ${d.tagClass}`}>
                      {d.tag}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">{d.lvl}</span>
                  </div>
                  <div className="mb-1 font-display text-lg leading-none">{d.title}</div>
                  <p className="text-xs text-muted-foreground">{d.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Sticky Bottom Alert */}
      <div className="fixed bottom-6 right-6">
        <div className="animate-pulse cursor-pointer rounded-sm bg-primary px-4 py-2 font-display tracking-widest text-primary-foreground shadow-[0_0_24px_hsl(185_100%_50%/0.3)]">
          READY TO ANALYZE NEW REPLAY
        </div>
      </div>
    </div>
  );
}
