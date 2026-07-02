// ---------------------------------------------------------------------------
// BotDiff Player Memory (v1 — persistent, longitudinal coaching layer)
//
// Turns the full history of per-match analyses + normalized inputs into a
// coaching *dossier*: the thing a real coach carries between sessions. It knows
// the player's recurring habits, trends, identity, and highest-impact leak, and
// compares recent games against older ones.
//
// PURE and client-safe: no network, no DB, no secrets. The server builds it
// from cached analyses; the UI renders it and answers Quick-Ask prompts locally.
//
// Coaching priority (highest → lowest): recurring habits, lane phase, wave
// management, positioning, decision making, objective setup, teamfighting,
// champion-specific mistakes, farming consistency, vision (only when genuine).
// ---------------------------------------------------------------------------
import type { MatchAnalysisInput, MatchCoachingAnalysis } from "./coaching-engine";

export const PLAYER_MEMORY_VERSION = 1;

// Lower rank = higher coaching priority.
type Category =
  | "lane"
  | "wave"
  | "positioning"
  | "decision"
  | "objective"
  | "teamfight"
  | "champion"
  | "farming"
  | "vision";

const CATEGORY_RANK: Record<Category, number> = {
  lane: 1,
  wave: 2,
  positioning: 3,
  decision: 4,
  objective: 5,
  teamfight: 6,
  champion: 7,
  farming: 8,
  vision: 9,
};

export interface CoachPattern {
  id: string;
  kind: "strength" | "weakness";
  category: Category;
  title: string;
  detail: string;
  count: number; // games (of the analyzed window) the pattern appeared in
  streak: number; // consecutive most-recent games it appeared in
  rate: number; // 0-1 share of games
}

export interface CoachTrend {
  key: string;
  label: string;
  current: string;
  previous: string;
  direction: "up" | "down" | "flat";
  improved: boolean;
  note: string;
}

export interface ConsistencyDimension {
  label: string;
  score: number; // 0-100 (higher = more stable)
}

export interface ConsistencyMetric {
  current: number;
  previous: number;
  weeklyTrend: number; // signed change vs previous window
  monthlyTrend: number; // signed change over the whole window
  explanation: string;
  dimensions: ConsistencyDimension[];
}

export interface ImprovementPlan {
  biggestWeakness: string;
  why: string;
  practiceGoal: string;
  expectedImprovement: string;
  longTermObjective: string;
  estimatedImpact: string;
}

export interface ChampionAdvice {
  name: string;
  games: number;
  winRate: number;
  strength: string;
  weakness: string;
  note: string;
}

export interface QuickPrompt {
  id: string;
  text: string;
}

export interface CoachDossier {
  isDemo: boolean;
  matchesAnalyzed: number;
  wins: number;
  losses: number;
  winRate: number;

  identityTraits: string[];
  identitySummary: string;
  rankAssessment: string;
  rankPotential: string;
  overallSummary: string;

  primaryStrength: { title: string; detail: string };
  primaryWeakness: { title: string; detail: string };
  strengths: { title: string; detail: string }[];
  weaknesses: { title: string; detail: string }[];
  recurringHabits: CoachPattern[];

  biggestImprovementArea: string;
  trainingGoal: string;
  weeklySummary: string;

  improvementPlan: ImprovementPlan;
  consistency: ConsistencyMetric;
  championAdvice: ChampionAdvice[];

  mentalNotes: string;
  practicePlan: string[];
  futureGoal: string;

  trends: CoachTrend[];
  quickPrompts: QuickPrompt[];
}

// --- helpers ---------------------------------------------------------------

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);
const avg = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);
const pct = (n: number) => `${Math.round(n * 100)}%`;
const one = (n: number) => n.toFixed(1);
const objectivesOf = (m: MatchAnalysisInput) =>
  m.dragonTakedowns + m.baronTakedowns + m.riftHeraldTakedowns;
const kdaOf = (m: MatchAnalysisInput) =>
  m.deaths > 0 ? (m.kills + m.assists) / m.deaths : m.kills + m.assists;

/** Stability score from a coefficient of variation (lower CV = higher score). */
function stabilityFromValues(values: number[]): number {
  if (values.length < 2) return 70;
  const mean = avg(values);
  if (mean === 0) return 70;
  const variance = avg(values.map((v) => (v - mean) ** 2));
  const cv = Math.sqrt(variance) / Math.abs(mean);
  return round(clamp(100 - cv * 130));
}

// --- pattern detectors -----------------------------------------------------
// Each rule tests a single game. Aggregating across the window gives us counts
// and streaks, which is how we separate a one-off from a *recurring habit*.

interface PatternDef {
  id: string;
  kind: "strength" | "weakness";
  category: Category;
  title: string;
  test: (m: MatchAnalysisInput) => boolean;
  detail: (agg: Agg) => string;
}

interface Agg {
  n: number;
  csPerMin: number;
  deaths: number;
  kills: number;
  assists: number;
  damageShare: number;
  visionPerMin: number;
  killParticipation: number;
  earlyAdv: number;
  cs10: number;
  objectives: number;
  kda: number;
  winRate: number;
}

const WEAKNESS_DEFS: PatternDef[] = [
  {
    id: "lose-lane",
    kind: "weakness",
    category: "lane",
    title: "Losing the laning phase",
    test: (m) => m.earlyGoldExpAdvantage <= -450 || m.maxCsAdvantage <= -10,
    detail: (a) =>
      `You end the laning phase behind on gold/xp in these games. Falling behind early makes every trade and skirmish harder — play safer, freeze when you can't win the trade, and back on item timers.`,
  },
  {
    id: "wave-recall",
    kind: "weakness",
    category: "wave",
    title: "Staying on the map instead of recalling",
    test: (m) => m.csPerMin < 7 && m.deaths >= 4,
    detail: () =>
      `You frequently stay out after pushing a wave rather than recalling on the crash, which leads to avoidable deaths and lost CS. Recall the moment a wave crashes into tower.`,
  },
  {
    id: "die-after-lead",
    kind: "weakness",
    category: "positioning",
    title: "Dying after winning lane",
    test: (m) => m.earlyGoldExpAdvantage >= 300 && m.deaths >= 6,
    detail: () =>
      `You build early leads and then hand them back by overextending. Once you're ahead, play for objectives and tower plates from safety instead of forcing fights.`,
  },
  {
    id: "die-before-damage",
    kind: "weakness",
    category: "positioning",
    title: "Dying before dealing damage",
    test: (m) => m.deaths >= 6 && m.damageShare < 0.26,
    detail: (a) =>
      `You're dying (${one(a.deaths)} avg) without contributing your damage (${pct(a.damageShare)} share). Fight one screen behind your frontline and only step up once the enemy engage is used.`,
  },
  {
    id: "low-participation",
    kind: "weakness",
    category: "decision",
    title: "Not grouping for fights & objectives",
    test: (m) => m.killParticipation < 0.45,
    detail: (a) =>
      `Your kill participation sits at ${pct(a.killParticipation)}. Too often the team fights 4v5 while you're in a side lane. After crashing a wave, rotate to the next objective.`,
  },
  {
    id: "weak-objectives",
    kind: "weakness",
    category: "objective",
    title: "Weak objective setup",
    test: (m) => objectivesOf(m) <= 1 && m.durationMin >= 22,
    detail: () =>
      `You're often absent for dragons and barons. Objectives, not kills, close games — start pathing toward the pit 45–60 seconds before it spawns.`,
  },
  {
    id: "low-damage",
    kind: "weakness",
    category: "teamfight",
    title: "Low teamfight damage",
    test: (m) => m.damageShare < 0.22,
    detail: (a) =>
      `You deal ${pct(a.damageShare)} of your team's champion damage — low for an ADC. Attack the closest safe target and keep auto-attacking through the whole fight instead of one burst.`,
  },
  {
    id: "low-cs",
    kind: "weakness",
    category: "farming",
    title: "Inconsistent farming",
    test: (m) => m.csPerMin < 6.8,
    detail: (a) =>
      `Your CS averages ${one(a.csPerMin)}/min, under the ~8.0 benchmark. Catch side waves between objectives so your gold curve never flattens after 15 minutes.`,
  },
  {
    id: "low-vision",
    kind: "weakness",
    category: "vision",
    title: "Low vision control",
    test: (m) => m.visionPerMin < 0.5 && m.controlWardsPlaced < 1,
    detail: () =>
      `You're playing with very little vision, so fights start on the enemy's terms. Buy a control ward every back and drop it near the next objective.`,
  },
];

const STRENGTH_DEFS: PatternDef[] = [
  {
    id: "win-lane",
    kind: "strength",
    category: "lane",
    title: "Excellent lane trading",
    test: (m) => m.earlyGoldExpAdvantage >= 400 || m.maxCsAdvantage >= 12,
    detail: () =>
      `You consistently create early HP and gold advantages in lane, giving you a head start on items and priority.`,
  },
  {
    id: "disciplined",
    kind: "strength",
    category: "positioning",
    title: "Disciplined positioning",
    test: (m) => m.deaths <= 3,
    detail: (a) =>
      `You keep your deaths low (${one(a.deaths)} avg), staying alive to keep dealing damage rather than feeding shutdowns.`,
  },
  {
    id: "present",
    kind: "strength",
    category: "decision",
    title: "Great fight presence",
    test: (m) => m.killParticipation >= 0.6,
    detail: (a) =>
      `You show up when it matters — ${pct(a.killParticipation)} kill participation means you're grouped for the fights that decide games.`,
  },
  {
    id: "objectives",
    kind: "strength",
    category: "objective",
    title: "Strong objective control",
    test: (m) => objectivesOf(m) >= 3,
    detail: () =>
      `You're reliably present for dragons and barons, the fastest way to convert leads into wins.`,
  },
  {
    id: "carry-damage",
    kind: "strength",
    category: "teamfight",
    title: "High carry damage",
    test: (m) => m.damageShare >= 0.3,
    detail: (a) =>
      `You output your share of the fight — ${pct(a.damageShare)} of team damage — carrying when positioned well.`,
  },
  {
    id: "clean-cs",
    kind: "strength",
    category: "farming",
    title: "Reliable farming",
    test: (m) => m.csPerMin >= 8,
    detail: (a) =>
      `Your farm is a real strength at ${one(a.csPerMin)} CS/min, keeping you ahead on item spikes.`,
  },
];

function buildAgg(ms: MatchAnalysisInput[]): Agg {
  return {
    n: ms.length,
    csPerMin: avg(ms.map((m) => m.csPerMin)),
    deaths: avg(ms.map((m) => m.deaths)),
    kills: avg(ms.map((m) => m.kills)),
    assists: avg(ms.map((m) => m.assists)),
    damageShare: avg(ms.map((m) => m.damageShare)),
    visionPerMin: avg(ms.map((m) => m.visionPerMin)),
    killParticipation: avg(ms.map((m) => m.killParticipation)),
    earlyAdv: avg(ms.map((m) => m.earlyGoldExpAdvantage)),
    cs10: avg(ms.map((m) => m.laneMinions10)),
    objectives: avg(ms.map((m) => objectivesOf(m))),
    kda: avg(ms.map((m) => kdaOf(m))),
    winRate: ms.length ? ms.filter((m) => m.win).length / ms.length : 0,
  };
}

function detectPatterns(inputs: MatchAnalysisInput[], defs: PatternDef[], agg: Agg): CoachPattern[] {
  const out: CoachPattern[] = [];
  for (const def of defs) {
    const flags = inputs.map((m) => def.test(m)); // most-recent first
    const count = flags.filter(Boolean).length;
    if (count === 0) continue;
    let streak = 0;
    for (const f of flags) {
      if (f) streak++;
      else break;
    }
    out.push({
      id: def.id,
      kind: def.kind,
      category: def.category,
      title: def.title,
      detail: def.detail(agg),
      count,
      streak,
      rate: count / inputs.length,
    });
  }
  // Sort by how habitual it is, then by coaching priority.
  return out.sort(
    (a, b) =>
      b.rate - a.rate ||
      b.streak - a.streak ||
      CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category],
  );
}

// --- identity --------------------------------------------------------------

function buildIdentity(agg: Agg): { traits: string[]; summary: string } {
  const traits: string[] = [];
  if (agg.deaths <= 3.5) traits.push("Disciplined");
  if (agg.deaths >= 6) traits.push("Risk Taker");
  if (agg.damageShare >= 0.3) traits.push("Carry-Oriented");
  if (agg.csPerMin >= 8) traits.push("Farmer");
  if (agg.killParticipation >= 0.6) traits.push("Teamfighter");
  if (agg.earlyAdv >= 350) traits.push("Lane Bully");
  if (agg.objectives >= 3) traits.push("Objective Focused");
  if (traits.length === 0) traits.push("Developing");

  const style =
    agg.deaths >= 6
      ? "an aggressive playmaker who trades survivability for impact"
      : agg.csPerMin >= 8
        ? "a farm-first scaler who wants to reach item spikes"
        : agg.killParticipation >= 0.6
          ? "a team-oriented ADC who lives in fights"
          : "a balanced ADC still finding a consistent identity";
  const summary = `You play like ${style}. Across your recent games you average ${one(agg.csPerMin)} CS/min, ${one(agg.deaths)} deaths, ${pct(agg.killParticipation)} kill participation and ${pct(agg.damageShare)} damage share.`;
  return { traits, summary };
}

// --- rank assessment -------------------------------------------------------

function rankAssessment(agg: Agg): { assessment: string; potential: string } {
  const skill =
    agg.csPerMin * 5 +
    (1 - Math.min(agg.deaths, 10) / 10) * 25 +
    agg.damageShare * 60 +
    agg.killParticipation * 25 +
    agg.winRate * 20;
  const assessment =
    skill >= 90
      ? "Your mechanics and decision-making are already ahead of your current bracket — inconsistency is what's holding your LP back, not skill."
      : skill >= 70
        ? "You have solid fundamentals for your rank. Cleaning up one recurring habit is what separates you from the next tier."
        : "Your fundamentals still have clear gaps. Tightening farming, deaths, and fight timing will move you up quickly.";
  const potential =
    skill >= 90 ? "Emerald+" : skill >= 70 ? "Platinum / Emerald" : "Gold";
  return { assessment, potential: `Estimated ceiling: ${potential} if your biggest leak is fixed.` };
}

// --- consistency -----------------------------------------------------------

function buildConsistency(inputs: MatchAnalysisInput[]): ConsistencyMetric {
  const dims = (ms: MatchAnalysisInput[]): ConsistencyDimension[] => [
    { label: "CS stability", score: stabilityFromValues(ms.map((m) => m.csPerMin)) },
    { label: "Death stability", score: stabilityFromValues(ms.map((m) => m.deaths + 1)) },
    { label: "Damage stability", score: stabilityFromValues(ms.map((m) => m.damageShare)) },
    { label: "Vision stability", score: stabilityFromValues(ms.map((m) => m.visionScore + 1)) },
    { label: "Objective participation", score: stabilityFromValues(ms.map((m) => objectivesOf(m) + 1)) },
    { label: "Kill participation", score: stabilityFromValues(ms.map((m) => m.killParticipation)) },
  ];
  const scoreOf = (ms: MatchAnalysisInput[]) =>
    ms.length ? round(avg(dims(ms).map((d) => d.score))) : 0;

  const recent = inputs.slice(0, 5);
  const prior = inputs.slice(5, 10);
  const current = scoreOf(recent.length ? recent : inputs);
  const previous = prior.length ? scoreOf(prior) : current;
  const monthly = current - scoreOf(inputs);

  const dimList = dims(recent.length ? recent : inputs);
  const worst = [...dimList].sort((a, b) => a.score - b.score)[0];
  const best = [...dimList].sort((a, b) => b.score - a.score)[0];
  const weeklyTrend = current - previous;
  const explanation =
    weeklyTrend > 3
      ? `Consistency is up ${weeklyTrend} points — your ${best?.label.toLowerCase()} steadied over your recent games.`
      : weeklyTrend < -3
        ? `Consistency dropped ${Math.abs(weeklyTrend)} points, driven mostly by swings in your ${worst?.label.toLowerCase()}.`
        : `Consistency is holding steady. Your biggest source of variance is ${worst?.label.toLowerCase()}.`;

  return {
    current,
    previous,
    weeklyTrend,
    monthlyTrend: monthly,
    explanation,
    dimensions: dimList,
  };
}

// --- trends ----------------------------------------------------------------

function buildTrends(inputs: MatchAnalysisInput[]): CoachTrend[] {
  const recent = inputs.slice(0, Math.min(5, inputs.length));
  const prior = inputs.slice(5, 10);
  if (prior.length === 0) return [];
  const r = buildAgg(recent);
  const p = buildAgg(prior);
  const mk = (
    key: string,
    label: string,
    cur: number,
    prev: number,
    fmt: (n: number) => string,
    higherBetter: boolean,
    unit: string,
  ): CoachTrend => {
    const diff = cur - prev;
    const eps = Math.abs(prev) * 0.03 + 0.001;
    const direction = diff > eps ? "up" : diff < -eps ? "down" : "flat";
    const improved = direction === "flat" ? true : higherBetter ? diff > 0 : diff < 0;
    const note =
      direction === "flat"
        ? `Your ${label.toLowerCase()} is steady across the last ${recent.length} games.`
        : improved
          ? `Your ${label.toLowerCase()} has improved over your last ${recent.length} games.`
          : `Your ${label.toLowerCase()} has slipped over your last ${recent.length} games — worth attention.`;
    return { key, label, current: fmt(cur) + unit, previous: fmt(prev) + unit, direction, improved, note };
  };
  return [
    mk("cs", "CS / min", r.csPerMin, p.csPerMin, one, true, ""),
    mk("deaths", "Deaths", r.deaths, p.deaths, one, false, ""),
    mk("kp", "Kill participation", r.killParticipation, p.killParticipation, (n) => `${round(n * 100)}`, true, "%"),
    mk("dmg", "Damage share", r.damageShare, p.damageShare, (n) => `${round(n * 100)}`, true, "%"),
    mk("obj", "Objectives / game", r.objectives, p.objectives, one, true, ""),
    mk("lane", "Early lane lead", r.earlyAdv, p.earlyAdv, (n) => `${round(n)}`, true, "g"),
  ];
}

// --- champion advice -------------------------------------------------------

function buildChampionAdvice(inputs: MatchAnalysisInput[]): ChampionAdvice[] {
  const byChamp = new Map<string, MatchAnalysisInput[]>();
  for (const m of inputs) {
    const list = byChamp.get(m.champion) ?? [];
    list.push(m);
    byChamp.set(m.champion, list);
  }
  const out: ChampionAdvice[] = [];
  for (const [name, ms] of byChamp) {
    const a = buildAgg(ms);
    const wins = ms.filter((m) => m.win).length;
    const strengths = detectPatterns(ms, STRENGTH_DEFS, a);
    const weaknesses = detectPatterns(ms, WEAKNESS_DEFS, a);
    out.push({
      name,
      games: ms.length,
      winRate: round(a.winRate * 100),
      strength: strengths[0]?.title ?? "Solid all-round play",
      weakness: weaknesses[0]?.title ?? "No glaring recurring leak",
      note:
        a.winRate >= 0.55
          ? `${name} is a strength — keep prioritizing it in tough queues.`
          : a.winRate <= 0.45
            ? `${name}'s win rate is dragging — tighten the leak above or bench it while you climb.`
            : `${name} is roughly even. Fixing the leak above would tip it in your favor.`,
    });
  }
  return out.sort((x, y) => y.games - x.games).slice(0, 6);
}

// --- quick prompts ---------------------------------------------------------

function buildQuickPrompts(
  inputs: MatchAnalysisInput[],
  champs: ChampionAdvice[],
  primaryWeakness: string,
  potential: string,
): QuickPrompt[] {
  const prompts: QuickPrompt[] = [];
  const top = champs[0];
  const weak = [...champs].sort((a, b) => a.winRate - b.winRate)[0];
  if (weak && weak.winRate < 50) prompts.push({ id: "lose-lane-champ", text: `Why am I losing on ${weak.name}?` });
  if (top) prompts.push({ id: "improve-champ", text: `How can I improve my ${top.name} teamfighting?` });
  prompts.push({ id: "recurring", text: "What is my biggest recurring mistake?" });
  prompts.push({ id: "winrate", text: "Why has my win rate changed recently?" });
  prompts.push({ id: "next-game", text: "What should I focus on before my next ranked game?" });
  prompts.push({ id: "rank-goal", text: `What habits are stopping me from reaching ${potential.includes("Emerald") ? "Diamond" : "Emerald"}?` });
  prompts.push({ id: "improved", text: `What has improved over my last ${inputs.length} games?` });
  return prompts.slice(0, 7);
}

// --- assemble --------------------------------------------------------------

export function buildCoachDossier(
  inputs: MatchAnalysisInput[],
  analyses: MatchCoachingAnalysis[],
  isDemo = false,
): CoachDossier {
  const agg = buildAgg(inputs);
  const weaknesses = detectPatterns(inputs, WEAKNESS_DEFS, agg);
  const strengths = detectPatterns(inputs, STRENGTH_DEFS, agg);
  const recurring = [...weaknesses, ...strengths]
    .filter((p) => p.rate >= 0.4 || p.streak >= 3)
    .sort((a, b) => b.rate - a.rate || b.streak - a.streak)
    .slice(0, 6);

  const { traits, summary } = buildIdentity(agg);
  const { assessment, potential } = rankAssessment(agg);
  const consistency = buildConsistency(inputs);
  const trends = buildTrends(inputs);
  const championAdvice = buildChampionAdvice(inputs);

  const topWeakness = weaknesses[0];
  const topStrength = strengths[0];
  const wins = inputs.filter((m) => m.win).length;

  const streakNote = topWeakness && topWeakness.streak >= 3
    ? ` This is now the ${topWeakness.streak}${ordinal(topWeakness.streak)} game in a row it has shown up — it's your defining habit right now.`
    : topWeakness
      ? ` It appeared in ${topWeakness.count} of your last ${inputs.length} games.`
      : "";

  const improvedTrend = trends.find((t) => t.improved && t.direction !== "flat");
  const overallSummary =
    `${summary} ${assessment}` +
    (topWeakness ? ` Your highest-impact leak is "${topWeakness.title.toLowerCase()}".${streakNote}` : "") +
    (improvedTrend ? ` On the bright side, ${improvedTrend.note.toLowerCase()}` : "");

  const improvementPlan: ImprovementPlan = topWeakness
    ? {
        biggestWeakness: topWeakness.title,
        why: topWeakness.detail,
        practiceGoal: practiceGoalFor(topWeakness, agg),
        expectedImprovement: expectedFor(topWeakness),
        longTermObjective: `Turn "${topWeakness.title.toLowerCase()}" from a recurring habit into a non-issue across a full ${Math.max(5, inputs.length)}-game set.`,
        estimatedImpact: impactFor(topWeakness),
      }
    : {
        biggestWeakness: "No single dominant leak",
        why: "You don't have one recurring, game-losing habit right now — your issue is consistency between good and bad games.",
        practiceGoal: "Replicate your best game's decisions in your next 5 games.",
        expectedImprovement: "Fewer throwaway losses and a tighter LP curve.",
        longTermObjective: "Raise your floor so your worst games look like your average ones.",
        estimatedImpact: "Consistency alone is often worth a full division.",
      };

  const mentalNotes =
    consistency.weeklyTrend < -3
      ? "Your recent games swing a lot. Consider shorter sessions and hard-stopping after two losses — variance this high usually points to tilt, not mechanics."
      : consistency.current >= 75
        ? "You're mentally steady — your games look alike whether you win or lose. That reliability is a real climbing asset."
        : "You're fairly steady, but the occasional off-game costs LP. A quick reset routine between games will smooth out the dips.";

  const practicePlan = buildPracticePlan(topWeakness, agg);
  const futureGoal = `Over the next 10 games, ${topWeakness ? `cut "${topWeakness.title.toLowerCase()}" out of your play` : "hold your consistency above 80"} and aim to lift your win rate from ${pct(agg.winRate)} toward 55%+.`;
  const weeklySummary = buildWeeklySummary(inputs, trends, agg);

  return {
    isDemo,
    matchesAnalyzed: inputs.length,
    wins,
    losses: inputs.length - wins,
    winRate: round(agg.winRate * 100),
    identityTraits: traits,
    identitySummary: summary,
    rankAssessment: assessment,
    rankPotential: potential,
    overallSummary,
    primaryStrength: topStrength
      ? { title: topStrength.title, detail: topStrength.detail }
      : { title: "Steady fundamentals", detail: "Nothing stands out as elite yet, but nothing is broken either — you're a well-rounded ADC." },
    primaryWeakness: topWeakness
      ? { title: topWeakness.title, detail: topWeakness.detail }
      : { title: "Consistency", detail: "Your main leak is the gap between your good and bad games rather than any single mistake." },
    strengths: strengths.slice(0, 3).map((s) => ({ title: s.title, detail: s.detail })),
    weaknesses: weaknesses.slice(0, 3).map((w) => ({ title: w.title, detail: w.detail })),
    recurringHabits: recurring,
    biggestImprovementArea: topWeakness?.title ?? "Consistency",
    trainingGoal: improvementPlan.practiceGoal,
    weeklySummary,
    improvementPlan,
    consistency,
    championAdvice,
    mentalNotes,
    practicePlan,
    futureGoal,
    trends,
    quickPrompts: buildQuickPrompts(inputs, championAdvice, topWeakness?.title ?? "consistency", potential),
  };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function practiceGoalFor(w: CoachPattern, agg: Agg): string {
  switch (w.category) {
    case "lane":
      return "Finish the laning phase even or ahead in CS at 10 minutes in your next 5 games.";
    case "wave":
      return "Recall on every clean wave crash instead of shoving into a frozen lane.";
    case "positioning":
      return `Die fewer than ${Math.max(4, Math.round(agg.deaths) - 2)} times per game and never die first in a fight.`;
    case "decision":
      return "Hold kill participation above 60% by rotating to objectives after wave crashes.";
    case "objective":
      return "Be present for at least 3 dragon/baron takedowns per game.";
    case "teamfight":
      return "Deal at least 28% of your team's champion damage next game.";
    case "farming":
      return `Beat ${one(Math.max(8, agg.csPerMin + 0.8))} CS/min in your next 5 games.`;
    default:
      return "Buy a control ward every back and hit a 25+ vision score.";
  }
}

function expectedFor(w: CoachPattern): string {
  switch (w.category) {
    case "positioning":
      return "Fewer first-deaths means you're alive for the fight that decides the game — expect win rate to climb within ~10 games.";
    case "wave":
      return "Cleaner recalls convert into ~1 extra item's worth of gold per game over a set.";
    case "lane":
      return "A neutral-or-ahead lane removes the uphill start that loses close games.";
    case "farming":
      return "Steadier CS is a direct gold gain — often a full extra item by 30 minutes.";
    default:
      return "Fixing this should show up as steadier grades and fewer avoidable losses.";
  }
}

function impactFor(w: CoachPattern): string {
  const sev = w.rate >= 0.6 ? "high" : w.rate >= 0.4 ? "moderate" : "situational";
  return `Estimated impact: ${sev}. It shows up in ${Math.round(w.rate * 100)}% of your recent games, so fixing it moves the needle almost every match.`;
}

function buildPracticePlan(w: CoachPattern | undefined, agg: Agg): string[] {
  const base = [
    "Warm up: 10 minutes of last-hitting in the practice tool before your first ranked game.",
    "Between games, review your first death and name what information you were missing.",
  ];
  if (!w) return [...base, "Play only your two best champions this week to build reps."];
  const specific: Record<Category, string> = {
    lane: "Watch one high-elo VOD of your matchup and copy their first-back timing.",
    wave: "Drill wave crashes: shove three waves, recall on the crash, repeat for 10 minutes.",
    positioning: "In each fight, physically say 'wait' before you step forward — force the delay.",
    decision: "Set a mental timer: after every wave crash, ask 'where's the next objective?'",
    objective: "Ping the objective at 45s before spawn every time so you path there early.",
    teamfight: "Practice attack-move kiting in a custom game for 10 minutes.",
    champion: "Lock one champion this week and learn its two hardest matchups.",
    farming: "Track your 10-minute CS every game and try to beat the last one.",
    vision: "Buy a control ward on every recall and place it before you take a fight.",
  };
  return [specific[w.category], ...base];
}

function buildWeeklySummary(inputs: MatchAnalysisInput[], trends: CoachTrend[], agg: Agg): string {
  if (inputs.length < 3) return "Play a few more ranked games this week to unlock a full weekly review.";
  const up = trends.filter((t) => t.improved && t.direction !== "flat").map((t) => t.label.toLowerCase());
  const down = trends.filter((t) => !t.improved && t.direction !== "flat").map((t) => t.label.toLowerCase());
  const parts: string[] = [`You played ${inputs.length} recent games at a ${pct(agg.winRate)} win rate.`];
  if (up.length) parts.push(`Improving: ${up.join(", ")}.`);
  if (down.length) parts.push(`Slipping: ${down.join(", ")}.`);
  if (!up.length && !down.length) parts.push("Your metrics held steady across the week.");
  return parts.join(" ");
}

// --- Quick-Ask answering ---------------------------------------------------
// Deterministic, data-grounded responses. Never generic — every answer cites
// the player's own numbers.

export function answerQuickAsk(d: CoachDossier, prompt: string): string {
  const q = prompt.toLowerCase();
  const champMatch = d.championAdvice.find((c) => q.includes(c.name.toLowerCase()));

  if (champMatch && (q.includes("los") || q.includes("why"))) {
    return `On ${champMatch.name} you're at ${champMatch.winRate}% over ${champMatch.games} games. Your recurring issue there is "${champMatch.weakness.toLowerCase()}". ${d.primaryWeakness.detail} Focus that specific fix on ${champMatch.name} and the games should swing back.`;
  }
  if (champMatch && (q.includes("improve") || q.includes("teamfight") || q.includes("better"))) {
    return `Your ${champMatch.name} strength is "${champMatch.strength.toLowerCase()}", so lean on it. The thing capping you is "${champMatch.weakness.toLowerCase()}". Practice goal: ${d.improvementPlan.practiceGoal}`;
  }
  if (q.includes("recurring") || q.includes("biggest mistake") || q.includes("biggest leak")) {
    const h = d.recurringHabits.find((x) => x.kind === "weakness");
    if (h) return `Your biggest recurring mistake is "${h.title.toLowerCase()}" — it's shown up in ${h.count} of your last ${d.matchesAnalyzed} games${h.streak >= 3 ? ` and the last ${h.streak} in a row` : ""}. ${h.detail}`;
    return `You don't have one dominant recurring mistake right now. ${d.improvementPlan.why}`;
  }
  if (q.includes("win rate") || q.includes("winrate") || q.includes("dropped") || q.includes("changed")) {
    const down = d.trends.find((t) => !t.improved && t.direction !== "flat");
    return `You're at a ${d.winRate}% win rate over your last ${d.matchesAnalyzed} games. ${down ? `The biggest driver is your ${down.label.toLowerCase()} moving from ${down.previous} to ${down.current}. ${down.note}` : "Your stats are steady, so the swings are mostly variance — tighten your consistency (currently " + d.consistency.current + "/100) to smooth it out."}`;
  }
  if (q.includes("next") && (q.includes("game") || q.includes("ranked"))) {
    return `Before your next game, focus on one thing: ${d.trainingGoal} That directly attacks your biggest leak, "${d.biggestImprovementArea.toLowerCase()}". Ignore everything else for now.`;
  }
  if (q.includes("reach") || q.includes("stopping") || q.includes("rank") || q.includes("climb")) {
    return `${d.rankAssessment} ${d.rankPotential} The habit in your way is "${d.biggestImprovementArea.toLowerCase()}". ${d.improvementPlan.why}`;
  }
  if (q.includes("improved") || q.includes("better over") || q.includes("progress")) {
    const up = d.trends.filter((t) => t.improved && t.direction !== "flat");
    if (up.length) return `Over your last ${d.matchesAnalyzed} games you've improved: ${up.map((t) => `${t.label.toLowerCase()} (${t.previous} → ${t.current})`).join(", ")}. Keep it up. ${d.weeklySummary}`;
    return `Your metrics have held roughly steady recently. ${d.weeklySummary}`;
  }
  if (q.includes("practice") || q.includes("today") || q.includes("drill")) {
    return `Today's practice plan:\n• ${d.practicePlan.join("\n• ")}`;
  }
  if (q.includes("strength") || q.includes("good at")) {
    return `Your standout strength is "${d.primaryStrength.title.toLowerCase()}". ${d.primaryStrength.detail} Build your game plan around it.`;
  }
  // Default: full read.
  return `${d.overallSummary} Right now the single highest-impact thing you can do is: ${d.trainingGoal}`;
}
