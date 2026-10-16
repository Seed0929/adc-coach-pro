import { Layers, Info } from "lucide-react";
import type { CoachChampionOption, CoachScope } from "@/lib/coaching.functions";

/** Few games can't support a reliable pattern; below this we say so. */
const MIN_CHAMPION_GAMES = 3;

function ago(iso: string | null): string {
  if (!iso) return "date unknown";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function ChampionSelector({
  champions,
  selected,
  totalGames,
  loading,
  onSelect,
}: {
  champions: CoachChampionOption[];
  selected: string | null;
  totalGames: number;
  loading: boolean;
  onSelect: (name: string | null) => void;
}) {
  const chip = (active: boolean) =>
    `flex shrink-0 items-center gap-2.5 rounded-2xl px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${
      active ? "bg-primary/15 ring-1 ring-primary/50" : "bg-white/[0.03] hover:bg-white/[0.06]"
    }`;
  return (
    <div className="glass rise mb-4 rounded-3xl p-3" role="group" aria-label="Coaching scope">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          aria-pressed={selected === null}
          disabled={loading}
          onClick={() => onSelect(null)}
          className={chip(selected === null)}
        >
          <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <Layers className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-medium">Overall Coaching</span>
            <span className="block text-xs text-muted-foreground">{totalGames} games</span>
          </span>
        </button>
        {champions.map((c) => (
          <button
            key={c.name}
            type="button"
            aria-pressed={selected === c.name}
            disabled={loading}
            onClick={() => onSelect(c.name)}
            className={chip(selected === c.name)}
          >
            <img src={c.iconUrl} alt="" className="size-9 rounded-xl object-cover" loading="lazy" />
            <span>
              <span className="block text-sm font-medium">{c.name}</span>
              <span className="block text-xs text-muted-foreground">
                {c.games} {c.games === 1 ? "game" : "games"}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** States exactly what the report below is built from. */
export function ScopeNote({ scope }: { scope: CoachScope }) {
  const thin = scope.champion !== null && scope.games < MIN_CHAMPION_GAMES;
  return (
    <div className="mb-6 flex items-start gap-2 px-1 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <p>
        {scope.champion
          ? `Champion-specific: built only from your ${scope.games} ${scope.champion} ${scope.games === 1 ? "game" : "games"} (most recent ${ago(scope.lastPlayed)}), out of ${scope.totalGames} stored games.`
          : `Account-wide: built from all ${scope.totalGames} stored games across every champion (most recent ${ago(scope.lastPlayed)}).`}
        {thin &&
          ` That's not enough ${scope.champion} games to call anything a pattern yet — treat this as early reads, and play a few more to firm it up.`}
      </p>
    </div>
  );
}
