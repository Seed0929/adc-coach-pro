// ---------------------------------------------------------------------------
// BotDiff Coaching Engine — the single entry point.
//
// Every coaching surface (dashboard, champion pages, match analysis, weekly
// reports, Quick Ask, future AI features) goes through this module. It:
//   1. routes a question into a specialized analysis mode,
//   2. builds the full coaching context (the future OpenAI payload),
//   3. produces a grounded, deterministic answer today, and
//   4. exposes proactive coaching + follow-up questions.
//
// PURE + client-safe. The AI provider lives behind a separate server module and
// is optional — nothing here depends on an API key.
// ---------------------------------------------------------------------------
import type { CoachDossier } from "../player-memory";
import { answerQuickAsk } from "../player-memory";
import { buildCoachingContext, type CoachingContext } from "./context-builder";
import { buildPlayerMemory, type PlayerMemory } from "./player-memory-model";
import { buildBehaviorObservations, type BehaviorObservation } from "./behavior-engine";
import { routeQuestion, type AnalysisMode } from "./question-router";

export * from "./pillars";
export * from "./league-knowledge";
export * from "./behavior-engine";
export * from "./player-memory-model";
export * from "./question-router";
export * from "./context-builder";
export * from "./ai-provider";
export * from "./master-prompt";
export * from "./champion-knowledge";
export * from "./champion-intelligence";
export * from "./match-plan";
export * from "./decision-chain";
export * from "./power-spike";
export * from "./practice-program";
export * from "./role-intelligence";
export * from "./habit-engine";
export {
  LeagueIntelligence,
  hydrateLeagueIntelligence,
  type LeagueIntelligenceFacade,
} from "./league-intelligence";
export {
  LeagueKnowledgeBase,
  type LeagueKnowledgeBaseFacade,
} from "./knowledge-base";

export interface CoachAnswer {
  answer: string;
  mode: AnalysisMode;
  source: "deterministic" | "ai";
  context: CoachingContext;
}

/**
 * Deterministic, evidence-grounded answer. This is the always-available brain
 * and the fallback whenever no AI provider is configured.
 */
export function coachAnswer(d: CoachDossier, question: string): CoachAnswer {
  const context = buildCoachingContext(d, question);
  return {
    answer: answerQuickAsk(d, question),
    mode: context.routed.mode,
    source: "deterministic",
    context,
  };
}

export interface ProactiveCoaching {
  biggestImprovement: string;
  biggestRecurringMistake: string;
  keepDoing: string;
  fixNext: string;
  nextGameChallenge: string;
}

/** Generated after every Riot sync — a proactive coaching briefing. */
export function proactiveCoaching(d: CoachDossier): ProactiveCoaching {
  const improved = d.trends.find((t) => t.improved && t.direction !== "flat");
  const obs = buildBehaviorObservations(d);
  const weakness = obs.find((o) => o.kind === "weakness");
  const strength = obs.find((o) => o.kind === "strength");

  return {
    biggestImprovement: improved
      ? `${improved.label}: ${improved.previous} → ${improved.current} over your last games.`
      : `Your metrics are holding steady at a ${d.winRate}% win rate — no big swings up or down.`,
    biggestRecurringMistake: weakness
      ? `${weakness.label}. ${weakness.evidence}`
      : "No single game-losing habit right now — your leak is consistency between games.",
    keepDoing: strength
      ? `${strength.label}. ${strength.evidence}`
      : `Keep replicating the decisions from your best recent games.`,
    fixNext: d.improvementPlan.practiceGoal,
    nextGameChallenge: nextGameChallenge(d),
  };
}

/** One concise, measurable challenge for the very next ranked game. */
export function nextGameChallenge(d: CoachDossier): string {
  const w = d.weaknessPatterns[0];
  if (!w) return "Replicate your best recent game's decisions from start to finish.";
  switch (w.category) {
    case "wave":
      return "Recall immediately after crashing your first cannon wave — no greedy extra wave.";
    case "positioning":
      return "Don't die before the first dragon, and never be the first one to die in a fight.";
    case "decision":
      return "Catch one extra side wave, then group — hold kill participation above 60%.";
    case "objective":
      return "Be alive and in position for the first dragon, with priority before it spawns.";
    case "lane":
      return "Hit 80+ CS by 10 minutes and finish the laning phase even or ahead.";
    case "teamfight":
      return "Deal at least 28% of your team's champion damage this game.";
    case "farming":
      return "Beat your last game's 10-minute CS number.";
    default:
      return "Buy a control ward every back and reach a 25+ vision score.";
  }
}

/**
 * A single meaningful follow-up question — only asked when it would genuinely
 * improve future coaching. Returns null when there's nothing worth asking.
 */
export function followUpQuestion(d: CoachDossier, memory?: PlayerMemory): string | null {
  const mem = memory ?? buildPlayerMemory(d);
  const greedyRecall = d.weaknessPatterns.find((w) => w.id === "wave-recall" || w.category === "wave");
  if (greedyRecall && greedyRecall.streak >= 2) {
    return "I've noticed you often stay for one extra wave before recalling. Is that intentional, or should we drill recall timing?";
  }
  if (mem.currentTrend === "improving" && mem.currentFocusPillar === "lane") {
    return "Your laning has improved noticeably. Want future coaching to shift more toward macro and objectives?";
  }
  if (mem.preferredChampions.length >= 2) {
    return `You've been playing more ${mem.preferredChampions[0]} lately. Should I prioritize ${mem.preferredChampions[0]} coaching over the rest of your pool?`;
  }
  return null;
}

export { routeQuestion };