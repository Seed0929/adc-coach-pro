import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Crosshair, Eye, Sword, ShieldAlert, ThumbsUp } from "lucide-react";
import { AppShell, Pill, PageHeader } from "@/components/app-shell";
import champKaisa from "@/assets/champ-1.jpg";
import champEzreal from "@/assets/champ-2.jpg";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "Match Review — BotDiff" },
      {
        name: "description",
        content:
          "Open any game like a report: overall grade, LP impact, biggest mistake, biggest strength, and the highest-impact recommendations.",
      },
      { property: "og:title", content: "Match Review — BotDiff" },
      { property: "og:description", content: "Every match feels like opening a coaching report." },
    ],
  }),
  component: Matches,
});

type Match = {
  id: number;
  champ: string;
  img: string;
  result: "Victory" | "Defeat";
  grade: string;
  kda: string;
  cs: string;
  lp: string;
  when: string;
};

const matches: Match[] = [
  { id: 1, champ: "Kai'Sa", img: champKaisa, result: "Victory", grade: "A", kda: "8 / 3 / 11", cs: "241", lp: "+24", when: "2h ago" },
  { id: 2, champ: "Ezreal", img: champEzreal, result: "Defeat", grade: "C", kda: "4 / 7 / 6", cs: "198", lp: "-19", when: "3h ago" },
  { id: 3, champ: "Kai'Sa", img: champKaisa, result: "Victory", grade: "S", kda: "12 / 1 / 9", cs: "268", lp: "+21", when: "Yesterday" },
  { id: 4, champ: "Ezreal", img: champEzreal, result: "Defeat", grade: "B", kda: "6 / 5 / 8", cs: "212", lp: "-17", when: "Yesterday" },
];

function Matches() {
  const [active, setActive] = useState<Match>(matches[0]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Match Review"
        title="Your recent games"
        subtitle="Each match is a report — we surface only the insights that move your rank."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* List */}
        <div className="space-y-3">
          {matches.map((m, i) => {
            const win = m.result === "Victory";
            const selected = m.id === active.id;
            return (
              <button
                key={m.id}
                onClick={() => setActive(m)}
                style={{ animationDelay: `${i * 50}ms` }}
                className={`glass glass-hover rise flex w-full items-center gap-4 rounded-2xl p-4 text-left ${
                  selected ? "border-primary/40" : ""
                }`}
              >
                <img src={m.img} alt={m.champ} className="size-11 rounded-xl object-cover" />
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
          <div className="flex items-center gap-4">
            <img src={active.img} alt={active.champ} className="size-14 rounded-2xl object-cover" />
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
              <p className="text-sm text-muted-foreground">
                Overextended in the river without vision at 14:00 and got caught.
              </p>
            </div>
            <div className="rounded-2xl border border-success/20 bg-success/[0.06] p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-success">
                <ThumbsUp className="size-4" /> Biggest Strength
              </div>
              <p className="text-sm text-muted-foreground">
                Excellent early trades — you won lane by 900 gold at 10 minutes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Crosshair, label: "CS/min", value: "8.9" },
              { icon: Eye, label: "Vision", value: "24" },
              { icon: Sword, label: "DMG Share", value: "31%" },
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
            <p className="text-sm text-muted-foreground">
              Ward the river bush before rotating and hold back until your team groups. One habit —
              patience before mid-game skirmishes — would have saved this game.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}