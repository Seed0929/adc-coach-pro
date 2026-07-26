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
// Sprint 3.2 — the Practice Planner consumes the permanent coaching pipeline
// (Role Intelligence + Curriculum + League Intelligence) instead of inventing
// drills. The local DRILLS map stays only as a last-resort fallback.
import { runCoachingPipeline, type CoachingContext } from "./coaching-pipeline";
import { normalizeRole } from "./role-intelligence";

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
  /** The single curriculum lesson this program is built around. */
  focusLesson: string;
  /** Why the focus lesson matters — straight from the curriculum. */
  focusWhy: string;
  /** Measurable goal from Role Intelligence / curriculum decision chain. */
  measurableGoal: string;
  /** Supporting curriculum concepts that reinforce the focus lesson. */
  supportingConcepts: string[];
  /** Full merged knowledge for the focus lesson (optional consumers). */
  focusContext: CoachingContext | null;
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
  const role = normalizeRole(d.layeredMemory?.role?.role);
  const pipeline = runCoachingPipeline(
    (d.habits.length
      ? d.habits
          .filter((h) => h.kind === "weakness")
          .slice(0, 4)
          .map((h) => ({
            id: h.id,
            label: h.label,
            kind: h.kind,
            evidence: h.evidence.sentences[0],
            category: h.category,
            pillar: h.pillar,
          }))
      : top.map((w) => ({
          id: w.id,
          label: w.title,
          kind: w.kind,
          evidence: w.detail,
          category: w.category,
        }))),
    role,
  );
  const focus = pipeline.primary;
  const priorities: PracticePriority[] = top.length
    ? top.map((w: CoachPattern) => ({ title: w.title, why: w.detail }))
    : [
        { title: "Consistency", why: "Your leak is the gap between your best and worst games rather than any single mistake." },
        { title: "Replicating good games", why: "Turn your best recent game into your baseline." },
        { title: "Mental resets", why: "A quick reset between games keeps one loss from becoming three." },
      ];

  // Knowledge-base drills first; local fallbacks only when nothing routed.
  const knowledgeDrills = pipeline.practicePlan?.drills ?? [];
  const drillCats = Array.from(new Set(top.map((w) => w.category)));
  const drills = knowledgeDrills.length
    ? knowledgeDrills.slice(0, 4)
    : drillCats.length
      ? drillCats.map((c) => DRILLS[c] ?? DRILLS.farming)
      : [DRILLS.farming, DRILLS.positioning];
  if (focus) drills.push(focus.decisionChain.practiceRecommendation);
  else drills.push("Between games, review your first death and name the information you were missing.");

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
    focusLesson: focus?.curriculumTopic.label ?? "Consistency",
    focusWhy: focus?.whyItMatters ?? d.consistency.explanation,
    measurableGoal: pipeline.practicePlan?.measurableGoal ?? d.improvementPlan.practiceGoal,
    supportingConcepts: pipeline.practicePlan?.supportingConcepts ?? [],
    focusContext: focus,
  };
}
