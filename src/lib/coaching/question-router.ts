// ---------------------------------------------------------------------------
// BotDiff Question Router
//
// Quick Ask no longer funnels every question through one generic process.
// The router classifies a question into a specialized ANALYSIS MODE and
// declares which coaching pillars + statistics are relevant. Each mode gathers
// a different slice of the player's data BEFORE any AI is called, so the coach
// answers "Why do I lose lane?" completely differently from "How do I
// teamfight?".
//
// PURE + client-safe.
// ---------------------------------------------------------------------------
import type { Pillar } from "./pillars";

export type AnalysisMode =
  | "lane"
  | "macro"
  | "champion"
  | "consistency"
  | "decision"
  | "match-review"
  | "progress"
  | "teamfight"
  | "general";

export interface RoutedQuestion {
  mode: AnalysisMode;
  pillars: Pillar[];
  /** Which statistics this mode cares about (and which to ignore). */
  focusMetrics: string[];
  ignore: string[];
}

interface Rule {
  mode: AnalysisMode;
  pillars: Pillar[];
  focusMetrics: string[];
  ignore: string[];
  match: (q: string) => boolean;
}

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w));

const RULES: Rule[] = [
  {
    mode: "lane",
    pillars: ["lane"],
    focusMetrics: ["lane phase", "trades", "recalls", "CS", "matchup", "jungle pressure", "first objective"],
    ignore: ["late game", "teamfighting"],
    match: (q) => has(q, "lose lane", "losing lane", "laning", "early game", "first 10", "trade", "recall", "cs ", "farm"),
  },
  {
    mode: "teamfight",
    pillars: ["teamfight"],
    focusMetrics: ["positioning", "damage uptime", "target priority", "ability usage", "deaths", "assists"],
    ignore: ["lane"],
    match: (q) => has(q, "teamfight", "team fight", "fighting", "positioning", "kiting"),
  },
  {
    mode: "macro",
    pillars: ["macro"],
    focusMetrics: ["objectives", "map movement", "vision", "side lanes", "rotations"],
    ignore: ["mechanics"],
    match: (q) => has(q, "macro", "objective", "dragon", "baron", "vision", "rotate", "side lane", "map"),
  },
  {
    mode: "champion",
    pillars: ["champion"],
    focusMetrics: ["champion pool", "per-champion win rate", "matchups"],
    ignore: [],
    match: (q) => has(q, "champion", "pool", " on ", "should i play", "which champ", "matchup"),
  },
  {
    mode: "consistency",
    pillars: ["consistency", "decision", "macro"],
    focusMetrics: ["recurring habits", "consistency", "champion pool", "macro", "decision making", "improvement trends"],
    ignore: [],
    match: (q) => has(q, "hard stuck", "hardstuck", "climb", "stuck", "preventing", "rank up", "consistent", "consistency", "win rate", "winrate"),
  },
  {
    mode: "decision",
    pillars: ["decision"],
    focusMetrics: ["grouping timing", "shutdowns", "fight vs farm", "kill participation"],
    ignore: [],
    match: (q) => has(q, "decision", "when to", "should i group", "shutdown", "roam", "grouping"),
  },
  {
    mode: "progress",
    pillars: ["consistency"],
    focusMetrics: ["improvement trends only"],
    ignore: ["weaknesses"],
    match: (q) => has(q, "improved", "progress", "better over", "getting better", "last "),
  },
  {
    mode: "match-review",
    pillars: ["lane", "macro", "teamfight"],
    focusMetrics: ["last match", "what happened", "biggest mistake"],
    ignore: [],
    match: (q) => has(q, "last game", "last match", "review", "that game", "this game"),
  },
];

export function routeQuestion(prompt: string): RoutedQuestion {
  const q = prompt.toLowerCase();
  const rule = RULES.find((r) => r.match(q));
  if (rule) {
    return { mode: rule.mode, pillars: rule.pillars, focusMetrics: rule.focusMetrics, ignore: rule.ignore };
  }
  return {
    mode: "general",
    pillars: ["lane", "macro", "teamfight", "consistency"],
    focusMetrics: ["biggest recurring habit", "current focus"],
    ignore: [],
  };
}