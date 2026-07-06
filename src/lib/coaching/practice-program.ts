// ---------------------------------------------------------------------------
// BotDiff Personal Practice Program (Part 5)
//
// A structured, auto-updating practice plan derived ENTIRELY from the single
// CoachDossier. It refreshes after every analyzed match because the dossier
// does. No duplicated coaching logic, no generic filler — every line is tied to
// the player's own recurring habits and champion pool.
//
// PURE + client-safe.
// ---------------------------------------------------------------------------
import type { CoachDossier, CoachPattern } from "../player-memory";

export interface PracticePriority {
  title: string;
  why: string;
}

export interface PracticeProgram {
  priorities: PracticePriority[];
  drills: string[];
  gamesUntilReevaluate: number;
  championGoal: string;
  laneGoal: string;
  midGameGoal: string;
  teamfightGoal: string;
  successLooksLike: string;
  timeline: string;
}

const DRILLS: Record<string, string> = {
  lane: "Watch one high-elo VOD of your worst matchup and copy their first-back timing and trade pattern.",
  wave: "Drill wave crashes in the practice tool: shove three waves, recall on the crash, repeat for 10 minutes.",
  positioning: "In every fight, mentally say 'wait' before stepping forward — force the half-second delay.",
  decision: "After every wave crash, ask out loud: 'where is the next objective?' and move toward it.",
  objective: "Ping the objective 45s before it spawns every time so you path there early.",
  teamfight: "10 minutes of attack-move kiting in a custom game before your session.",
  farming: "Track your 10-minute CS every game and try to beat the previous number.",
  champion: "Lock one champion this week and learn its two hardest matchups.",
  vision: "Buy a control ward every recall and place it before you take a fight.",
};

function laneGoalFor(cat: string | undefined): string {
  if (cat === "lane" || cat === "wave" || cat === "farming")
    return "Finish laning phase even-or-ahead in CS at 10 minutes, and recall only on wave crashes.";
  return "Hold your CS lead and translate it into a clean first recall with an item advantage.";
}

export function buildPracticeProgram(d: CoachDossier): PracticeProgram {
  const weaknesses = d.weaknessPatterns.filter((w) => w.kind === "weakness");
  const top = weaknesses.slice(0, 3);
  const priorities: PracticePriority[] = top.length
    ? top.map((w: CoachPattern) => ({ title: w.title, why: w.detail }))
    : [
        { title: "Consistency", why: "Your leak is the gap between your best and worst games rather than any single mistake." },
        { title: "Replicating good games", why: "Turn your best recent game into your baseline." },
        { title: "Mental resets", why: "A quick reset between games keeps one loss from becoming three." },
      ];

  const drillCats = Array.from(new Set(top.map((w) => w.category)));
  const drills = drillCats.length
    ? drillCats.map((c) => DRILLS[c] ?? DRILLS.farming)
    : [DRILLS.farming, DRILLS.positioning];
  drills.push("Between games, review your first death and name the information you were missing.");

  const preferred = d.championAdvice[0];
  const championGoal = preferred
    ? `On ${preferred.name} (${preferred.winRate}% over ${preferred.games} games): lean on "${preferred.strength.toLowerCase()}" and cut out "${preferred.weakness.toLowerCase()}".`
    : "Pick two champions and play only those to build reps and matchup knowledge.";

  const topCat = top[0]?.category;
  return {
    priorities,
    drills,
    gamesUntilReevaluate: Math.max(5, Math.min(10, d.matchesAnalyzed >= 20 ? 10 : 5)),
    championGoal,
    laneGoal: laneGoalFor(topCat),
    midGameGoal:
      topCat === "decision" || topCat === "objective"
        ? "After each wave crash, rotate to the next objective and hold kill participation above 60%."
        : "Group with your support after the first drake and take mid tower with lane priority.",
    teamfightGoal:
      topCat === "positioning" || topCat === "teamfight"
        ? "Stand one screen behind your frontline; never be the first to die, and only step up once the enemy engage is used."
        : "Attack the closest safe target and keep auto-attacking through the whole fight for 30%+ damage share.",
    successLooksLike: d.improvementPlan.expectedImprovement,
    timeline: `Give this ${Math.max(5, Math.min(10, d.matchesAnalyzed >= 20 ? 10 : 5))} games. ${d.improvementPlan.estimatedImpact}`,
  };
}
