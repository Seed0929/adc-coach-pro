// ---------------------------------------------------------------------------
// BotDiff Coaching Context Builder
//
// Prepares EVERYTHING a future OpenAI request will receive. It runs today with
// no AI connected: the deterministic engine consumes the same context, so the
// only missing piece for live AI is an API key.
//
// PURE + client-safe.
// ---------------------------------------------------------------------------
import type { CoachDossier } from "../player-memory";
import type { PlayerMemory } from "./player-memory-model";
import { buildPlayerMemory } from "./player-memory-model";
import { observationsForPillars, type BehaviorObservation } from "./behavior-engine";
import { routeQuestion, type RoutedQuestion } from "./question-router";
import type { Pillar } from "./pillars";

export interface CoachingContext {
  question: string;
  routed: RoutedQuestion;
  relevantPillars: Pillar[];
  playerMemory: PlayerMemory;
  observations: BehaviorObservation[];
  recurringHabits: string[];
  recentImprovements: string[];
  currentCoachingFocus: string;
  relevantStats: Record<string, string | number>;
  record: { wins: number; losses: number; winRate: number; matchesAnalyzed: number };
}

/** Pull just the statistics the routed mode cares about. */
function relevantStats(d: CoachDossier, routed: RoutedQuestion): Record<string, string | number> {
  const stats: Record<string, string | number> = {};
  const trend = (key: string) => d.trends.find((t) => t.key === key);
  const want = new Set(routed.pillars);
  if (want.has("lane")) {
    const cs = trend("cs");
    const lane = trend("lane");
    if (cs) stats["CS/min"] = cs.current;
    if (lane) stats["Early lane lead"] = lane.current;
  }
  if (want.has("teamfight")) {
    const dmg = trend("dmg");
    if (dmg) stats["Damage share"] = dmg.current;
  }
  if (want.has("macro")) {
    const obj = trend("obj");
    if (obj) stats["Objectives/game"] = obj.current;
  }
  if (want.has("decision")) {
    const kp = trend("kp");
    if (kp) stats["Kill participation"] = kp.current;
  }
  if (want.has("consistency")) {
    stats["Consistency"] = `${d.consistency.current}/100`;
  }
  return stats;
}

export function buildCoachingContext(
  d: CoachDossier,
  question: string,
  memory?: PlayerMemory,
): CoachingContext {
  const routed = routeQuestion(question);
  const playerMemory = memory ?? buildPlayerMemory(d);
  return {
    question,
    routed,
    relevantPillars: routed.pillars,
    playerMemory,
    observations: observationsForPillars(d, routed.pillars).slice(0, 6),
    recurringHabits: d.recurringHabits.map((h) => `${h.title} — ${h.count}/${d.matchesAnalyzed} games`),
    recentImprovements: playerMemory.recentImprovements,
    currentCoachingFocus: playerMemory.currentCoachingFocus,
    relevantStats: relevantStats(d, routed),
    record: {
      wins: d.wins,
      losses: d.losses,
      winRate: d.winRate,
      matchesAnalyzed: d.matchesAnalyzed,
    },
  };
}