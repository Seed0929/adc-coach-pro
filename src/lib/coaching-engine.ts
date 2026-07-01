// ---------------------------------------------------------------------------
// BotDiff Coaching Engine (v1 — deterministic, rule-based)
//
// Turns raw Riot Match-V5 statistics into personalized coaching analysis:
// grades, scores, strengths, weaknesses, and specific practice tips.
//
// This module is PURE and client-safe: no network, no database, no secrets.
// The server extracts a `MatchAnalysisInput` from stored Riot data and feeds it
// here. Because the engine is expressed behind the `CoachingEngine` interface,
// the rule-based implementation can later be swapped for an LLM-backed engine
// that returns the exact same `MatchCoachingAnalysis` shape — no UI changes.
// ---------------------------------------------------------------------------

/** Bump when the scoring rules change so stored analyses can be recomputed. */
export const COACHING_ENGINE_VERSION = 1;

export type Grade = "S" | "A" | "B" | "C" | "D";

export interface CoachingGrades {
  laning: number; // 0-100
  farming: number;
  vision: number;
  objective: number;
  teamfight: number;
  consistency: number;
}

/** Normalized per-match statistics the engine reasons about. */
export interface MatchAnalysisInput {
  matchId: string;
  champion: string;
  role: string; // e.g. "Bot / ADC"
  win: boolean;
  gameCreation: string | null;
  durationMin: number;

  kills: number;
  deaths: number;
  assists: number;

  cs: number;
  csPerMin: number;

  gold: number;
  goldPerMin: number;

  visionScore: number;
  visionPerMin: number;
  wardsPlaced: number;
  controlWardsPlaced: number;
  wardsKilled: number;

  /** 0-1 share of the team's kills the player participated in. */
  killParticipation: number;
  /** 0-1 share of the team's damage to champions. */
  damageShare: number;
  damagePerMin: number;
  soloKills: number;

  dragonTakedowns: number;
  baronTakedowns: number;
  riftHeraldTakedowns: number;
  turretTakedowns: number;
  objectivesStolen: number;

  laneMinions10: number; // CS at 10 minutes
  maxCsAdvantage: number; // max CS lead over lane opponent
  earlyGoldExpAdvantage: number; // gold+xp advantage in the laning phase
}

export interface MatchCoachingAnalysis {
  matchId: string;
  champion: string;
  role: string;
  win: boolean;
  gameCreation: string | null;

  overallScore: number; // 0-100
  overallGrade: Grade;

  grades: CoachingGrades;
  gradeLetters: Record<keyof CoachingGrades, Grade>;

  aggressionScore: number; // 0-100
  riskScore: number; // 0-100 (higher = riskier / more deaths & overextends)
  carryPotential: number; // 0-100

  strengths: string[];
  weaknesses: string[];
  tips: string[]; // 3-5 specific, stat-driven coaching tips

  engineVersion: number;
  source: "rule-based" | "llm";
}

export interface CoachingSummary {
  isDemo: boolean;
  matchesAnalyzed: number;
  wins: number;
  losses: number;

  overallScore: number;
  overallGrade: Grade;

  grades: CoachingGrades;
  gradeLetters: Record<keyof CoachingGrades, Grade>;

  aggressionScore: number;
  riskScore: number;
  carryPotential: number;

  topStrengths: string[];
  topWeaknesses: string[];
  focusTip: string;

  perMatch: MatchCoachingAnalysis[];
}

/** Future-proofing seam: an LLM engine implements the same contract. */
export interface CoachingEngine {
  readonly version: number;
  readonly source: MatchCoachingAnalysis["source"];
  analyzeMatch(input: MatchAnalysisInput): MatchCoachingAnalysis;
}

// --- helpers ---------------------------------------------------------------

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);

/** Linear map of `v` in [min,max] onto a 0-100 score, clamped. */
function scale(v: number, min: number, max: number): number {
  if (max === min) return 0;
  return clamp(((v - min) / (max - min)) * 100);
}

export function toGrade(score: number): Grade {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 55) return "B";
  if (score >= 40) return "C";
  return "D";
}

function pct(n: number): number {
  return round(n * 100);
}

// --- scoring rules ---------------------------------------------------------

function farmingScore(m: MatchAnalysisInput): number {
  // ADC benchmark: ~8.0/min solid, 9.5+/min excellent, <6.5 weak.
  return scale(m.csPerMin, 4.5, 9.5);
}

function laningScore(m: MatchAnalysisInput): number {
  // Blend early CS, CS lead over opponent, and lane gold/xp advantage.
  const cs10 = scale(m.laneMinions10, 45, 85); // 85 CS @ 10 = elite
  const csLead = scale(m.maxCsAdvantage, -10, 25);
  const goldAdv = scale(m.earlyGoldExpAdvantage, -1200, 1500);
  return clamp(cs10 * 0.4 + csLead * 0.3 + goldAdv * 0.3);
}

function visionScoreGrade(m: MatchAnalysisInput): number {
  // ADC benchmark: ~0.8 vision/min solid, 1.2+ excellent.
  const vpm = scale(m.visionPerMin, 0.3, 1.3);
  const control = scale(m.controlWardsPlaced, 0, 5);
  return clamp(vpm * 0.75 + control * 0.25);
}

function objectiveScore(m: MatchAnalysisInput): number {
  const obj =
    m.dragonTakedowns + m.baronTakedowns + m.riftHeraldTakedowns + m.objectivesStolen;
  const objScore = scale(obj, 0, 6);
  const turrets = scale(m.turretTakedowns, 0, 7);
  return clamp(objScore * 0.6 + turrets * 0.4);
}

function teamfightScore(m: MatchAnalysisInput): number {
  const kp = scale(m.killParticipation, 0.3, 0.75);
  const dmg = scale(m.damageShare, 0.15, 0.38);
  const kda = m.deaths > 0 ? (m.kills + m.assists) / m.deaths : m.kills + m.assists;
  const kdaScore = scale(kda, 1, 6);
  return clamp(kp * 0.35 + dmg * 0.4 + kdaScore * 0.25);
}

function consistencyScore(m: MatchAnalysisInput): number {
  // Per-match proxy: staying alive and productive. Low deaths + healthy KDA.
  const deathsPerMin = m.durationMin > 0 ? m.deaths / m.durationMin : m.deaths;
  const deathScore = scale(deathsPerMin, 0.28, 0.05); // fewer = better (inverted range)
  const kda = m.deaths > 0 ? (m.kills + m.assists) / m.deaths : m.kills + m.assists;
  const kdaScore = scale(kda, 1, 5);
  return clamp(deathScore * 0.6 + kdaScore * 0.4);
}

function aggressionScore(m: MatchAnalysisInput): number {
  const kp = scale(m.killParticipation, 0.35, 0.8);
  const dpm = scale(m.damagePerMin, 300, 900);
  const solo = scale(m.soloKills, 0, 4);
  const kills = scale(m.kills, 2, 14);
  return clamp(kp * 0.3 + dpm * 0.3 + kills * 0.25 + solo * 0.15);
}

function riskScore(m: MatchAnalysisInput): number {
  // Higher = riskier. Driven by deaths and dying without payoff.
  const deathsPerMin = m.durationMin > 0 ? m.deaths / m.durationMin : m.deaths;
  const deathRisk = scale(deathsPerMin, 0.05, 0.32);
  const kda = m.deaths > 0 ? (m.kills + m.assists) / m.deaths : m.kills + m.assists;
  const lowRewardRisk = scale(2 - Math.min(kda, 2), 0, 2); // low KDA -> more risk
  return clamp(deathRisk * 0.7 + lowRewardRisk * 0.3);
}

function carryPotential(m: MatchAnalysisInput): number {
  const dmg = scale(m.damageShare, 0.18, 0.4);
  const kp = scale(m.killParticipation, 0.4, 0.8);
  const kda = m.deaths > 0 ? (m.kills + m.assists) / m.deaths : m.kills + m.assists;
  const kdaScore = scale(kda, 1.5, 6);
  const gold = scale(m.goldPerMin, 300, 500);
  return clamp(dmg * 0.35 + kp * 0.2 + kdaScore * 0.25 + gold * 0.2);
}

// --- strengths, weaknesses, tips ------------------------------------------

interface Signal {
  text: string;
  priority: number; // higher = more important to surface
}

function collectStrengths(m: MatchAnalysisInput, g: CoachingGrades): string[] {
  const s: Signal[] = [];
  if (m.csPerMin >= 8.3) s.push({ text: "Strong CS consistency", priority: g.farming });
  if (m.visionPerMin >= 0.9) s.push({ text: "Excellent vision control", priority: g.vision });
  if (m.deaths <= 3) s.push({ text: "Rarely dies — disciplined positioning", priority: 90 });
  if (m.goldPerMin >= 430) s.push({ text: "Good gold efficiency", priority: 70 });
  if (m.damageShare >= 0.3) s.push({ text: "High damage output in fights", priority: g.teamfight });
  if (m.killParticipation >= 0.6) s.push({ text: "Great teamfight presence", priority: g.teamfight });
  if (m.earlyGoldExpAdvantage >= 600) s.push({ text: "Wins the early laning phase", priority: g.laning });
  const objectives = m.dragonTakedowns + m.baronTakedowns + m.riftHeraldTakedowns;
  if (objectives >= 3) s.push({ text: "Rarely dies before objectives", priority: g.objective });
  return s.sort((a, b) => b.priority - a.priority).map((x) => x.text);
}

function collectWeaknesses(m: MatchAnalysisInput, g: CoachingGrades): string[] {
  const w: Signal[] = [];
  if (m.csPerMin < 7) w.push({ text: "Misses too much CS", priority: 100 - g.farming });
  if (m.visionPerMin < 0.6) w.push({ text: "Low vision score", priority: 100 - g.vision });
  if (m.deaths >= 7) w.push({ text: "Dies too often", priority: 100 - g.consistency });
  if (m.win && m.earlyGoldExpAdvantage >= 800 && m.dragonTakedowns + m.baronTakedowns <= 1)
    w.push({ text: "Doesn't convert leads into objectives", priority: 95 });
  if (m.damageShare < 0.22) w.push({ text: "Low damage share in teamfights", priority: 100 - g.teamfight });
  if (m.killParticipation < 0.45) w.push({ text: "Roams / groups too late", priority: 80 });
  if (m.controlWardsPlaced < 1) w.push({ text: "Buys too few control wards", priority: 75 });
  if (m.earlyGoldExpAdvantage < -800) w.push({ text: "Falls behind early in lane", priority: 100 - g.laning });
  return w.sort((a, b) => b.priority - a.priority).map((x) => x.text);
}

function collectTips(m: MatchAnalysisInput, g: CoachingGrades): string[] {
  const t: Signal[] = [];

  if (m.csPerMin < 7.5) {
    t.push({
      text: `You averaged ${m.csPerMin.toFixed(1)} CS/min — below the ~8.0/min ADC benchmark. Catch side waves before grouping to close the gap.`,
      priority: 100 - g.farming,
    });
  }
  if (m.visionScore < m.durationMin * 0.7) {
    t.push({
      text: `You placed only ${m.wardsPlaced} wards for a ${m.visionScore} vision score. Buy a control ward every back to raise your map awareness.`,
      priority: 100 - g.vision,
    });
  }
  if (m.deaths >= 6) {
    t.push({
      text: `You died ${m.deaths} times this game. Fight from one screen behind your frontline and only step up after the enemy engage is used.`,
      priority: 100 - g.consistency,
    });
  }
  if (m.win && m.earlyGoldExpAdvantage >= 700 && m.dragonTakedowns + m.baronTakedowns <= 1) {
    t.push({
      text: `You built an early lead but secured only ${m.dragonTakedowns + m.baronTakedowns} major objective. Use leads to force dragons and towers, not just kills.`,
      priority: 92,
    });
  }
  if (m.damageShare < 0.24) {
    t.push({
      text: `You dealt ${pct(m.damageShare)}% of your team's damage. Position to output sustained DPS through the whole fight instead of one burst.`,
      priority: 100 - g.teamfight,
    });
  }
  if (m.killParticipation < 0.5) {
    t.push({
      text: `You joined only ${pct(m.killParticipation)}% of your team's kills. Rotate with your team after crashing waves to be present for fights.`,
      priority: 80,
    });
  }
  if (m.laneMinions10 > 0 && m.laneMinions10 < 65) {
    t.push({
      text: `You had ${m.laneMinions10} CS at 10 minutes (target ~75+). Last-hit the first three waves cleanly without using abilities.`,
      priority: 100 - g.laning,
    });
  }
  if (m.controlWardsPlaced < 2) {
    t.push({
      text: `You placed ${m.controlWardsPlaced} control ward(s). Keep one on you at all times and drop it near the next objective 60-90s early.`,
      priority: 60,
    });
  }

  // Guarantee at least 3 tips even for a clean game.
  if (t.length < 3) {
    const fillers: Signal[] = [
      {
        text: `Solid game (${m.win ? "win" : "loss"}). Keep reviewing your first death each game to find the pattern behind it.`,
        priority: 40,
      },
      {
        text: `Maintain your ${m.csPerMin.toFixed(1)} CS/min into the mid-game — don't drop farm after 15 minutes when you start grouping.`,
        priority: 35,
      },
      {
        text: `Aim to raise your vision score above ${Math.max(20, Math.round(m.durationMin * 0.9))} next game by warding objectives earlier.`,
        priority: 30,
      },
    ];
    for (const f of fillers) if (t.length < 3) t.push(f);
  }

  return t
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5)
    .map((x) => x.text);
}

// --- rule-based engine -----------------------------------------------------

export function analyzeMatch(m: MatchAnalysisInput): MatchCoachingAnalysis {
  const grades: CoachingGrades = {
    laning: round(laningScore(m)),
    farming: round(farmingScore(m)),
    vision: round(visionScoreGrade(m)),
    objective: round(objectiveScore(m)),
    teamfight: round(teamfightScore(m)),
    consistency: round(consistencyScore(m)),
  };

  // Weighted overall, with a small win bonus (winning IS the outcome).
  const base =
    grades.laning * 0.18 +
    grades.farming * 0.18 +
    grades.vision * 0.14 +
    grades.objective * 0.14 +
    grades.teamfight * 0.22 +
    grades.consistency * 0.14;
  const overallScore = round(clamp(base + (m.win ? 6 : -2)));

  const gradeLetters = {
    laning: toGrade(grades.laning),
    farming: toGrade(grades.farming),
    vision: toGrade(grades.vision),
    objective: toGrade(grades.objective),
    teamfight: toGrade(grades.teamfight),
    consistency: toGrade(grades.consistency),
  } satisfies Record<keyof CoachingGrades, Grade>;

  return {
    matchId: m.matchId,
    champion: m.champion,
    role: m.role,
    win: m.win,
    gameCreation: m.gameCreation,
    overallScore,
    overallGrade: toGrade(overallScore),
    grades,
    gradeLetters,
    aggressionScore: round(aggressionScore(m)),
    riskScore: round(riskScore(m)),
    carryPotential: round(carryPotential(m)),
    strengths: collectStrengths(m, grades),
    weaknesses: collectWeaknesses(m, grades),
    tips: collectTips(m, grades),
    engineVersion: COACHING_ENGINE_VERSION,
    source: "rule-based",
  };
}

export const ruleBasedEngine: CoachingEngine = {
  version: COACHING_ENGINE_VERSION,
  source: "rule-based",
  analyzeMatch,
};

// --- aggregation -----------------------------------------------------------

function frequency(lists: string[][], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const list of lists) for (const item of list) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text]) => text);
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

export function summarizeCoaching(
  analyses: MatchCoachingAnalysis[],
  isDemo = false,
): CoachingSummary {
  const n = analyses.length;
  const grades: CoachingGrades = {
    laning: round(avg(analyses.map((a) => a.grades.laning))),
    farming: round(avg(analyses.map((a) => a.grades.farming))),
    vision: round(avg(analyses.map((a) => a.grades.vision))),
    objective: round(avg(analyses.map((a) => a.grades.objective))),
    teamfight: round(avg(analyses.map((a) => a.grades.teamfight))),
    consistency: round(avg(analyses.map((a) => a.grades.consistency))),
  };

  // Aggregate consistency also rewards low variance across games.
  const scores = analyses.map((a) => a.overallScore);
  const mean = avg(scores);
  const variance = avg(scores.map((s) => (s - mean) ** 2));
  const stddev = Math.sqrt(variance);
  const stabilityBonus = clamp(100 - stddev * 3, 0, 100);
  grades.consistency = round(clamp(grades.consistency * 0.65 + stabilityBonus * 0.35));

  const overallScore = round(avg(scores));
  const gradeLetters = {
    laning: toGrade(grades.laning),
    farming: toGrade(grades.farming),
    vision: toGrade(grades.vision),
    objective: toGrade(grades.objective),
    teamfight: toGrade(grades.teamfight),
    consistency: toGrade(grades.consistency),
  } satisfies Record<keyof CoachingGrades, Grade>;

  return {
    isDemo,
    matchesAnalyzed: n,
    wins: analyses.filter((a) => a.win).length,
    losses: analyses.filter((a) => !a.win).length,
    overallScore,
    overallGrade: toGrade(overallScore),
    grades,
    gradeLetters,
    aggressionScore: round(avg(analyses.map((a) => a.aggressionScore))),
    riskScore: round(avg(analyses.map((a) => a.riskScore))),
    carryPotential: round(avg(analyses.map((a) => a.carryPotential))),
    topStrengths: frequency(analyses.map((a) => a.strengths), 4),
    topWeaknesses: frequency(analyses.map((a) => a.weaknesses), 4),
    focusTip: analyses[0]?.tips[0] ?? "Play a ranked game to unlock personalized coaching.",
    perMatch: analyses,
  };
}

// --- demo analysis ---------------------------------------------------------

/** Deterministic demo inputs so guests / unlinked users see a full report. */
const DEMO_INPUTS: MatchAnalysisInput[] = [
  {
    matchId: "DEMO_1", champion: "Kai'Sa", role: "Bot / ADC", win: true, gameCreation: null,
    durationMin: 32, kills: 8, deaths: 3, assists: 11, cs: 241, csPerMin: 7.5, gold: 14200,
    goldPerMin: 444, visionScore: 24, visionPerMin: 0.75, wardsPlaced: 12, controlWardsPlaced: 2,
    wardsKilled: 3, killParticipation: 0.61, damageShare: 0.31, damagePerMin: 720, soloKills: 1,
    dragonTakedowns: 2, baronTakedowns: 1, riftHeraldTakedowns: 0, turretTakedowns: 4,
    objectivesStolen: 0, laneMinions10: 72, maxCsAdvantage: 8, earlyGoldExpAdvantage: 900,
  },
  {
    matchId: "DEMO_2", champion: "Ezreal", role: "Bot / ADC", win: false, gameCreation: null,
    durationMin: 29, kills: 4, deaths: 7, assists: 6, cs: 198, csPerMin: 6.8, gold: 11800,
    goldPerMin: 407, visionScore: 18, visionPerMin: 0.62, wardsPlaced: 7, controlWardsPlaced: 1,
    wardsKilled: 1, killParticipation: 0.44, damageShare: 0.24, damagePerMin: 560, soloKills: 0,
    dragonTakedowns: 1, baronTakedowns: 0, riftHeraldTakedowns: 0, turretTakedowns: 2,
    objectivesStolen: 0, laneMinions10: 61, maxCsAdvantage: -6, earlyGoldExpAdvantage: -700,
  },
  {
    matchId: "DEMO_3", champion: "Kai'Sa", role: "Bot / ADC", win: true, gameCreation: null,
    durationMin: 35, kills: 12, deaths: 1, assists: 9, cs: 268, csPerMin: 7.7, gold: 16100,
    goldPerMin: 460, visionScore: 31, visionPerMin: 0.89, wardsPlaced: 15, controlWardsPlaced: 3,
    wardsKilled: 4, killParticipation: 0.68, damageShare: 0.38, damagePerMin: 830, soloKills: 2,
    dragonTakedowns: 3, baronTakedowns: 1, riftHeraldTakedowns: 1, turretTakedowns: 5,
    objectivesStolen: 0, laneMinions10: 78, maxCsAdvantage: 14, earlyGoldExpAdvantage: 1200,
  },
  {
    matchId: "DEMO_4", champion: "Ezreal", role: "Bot / ADC", win: false, gameCreation: null,
    durationMin: 36, kills: 6, deaths: 5, assists: 8, cs: 212, csPerMin: 5.9, gold: 12600,
    goldPerMin: 350, visionScore: 22, visionPerMin: 0.61, wardsPlaced: 9, controlWardsPlaced: 1,
    wardsKilled: 2, killParticipation: 0.52, damageShare: 0.27, damagePerMin: 540, soloKills: 0,
    dragonTakedowns: 1, baronTakedowns: 0, riftHeraldTakedowns: 0, turretTakedowns: 3,
    objectivesStolen: 0, laneMinions10: 68, maxCsAdvantage: 2, earlyGoldExpAdvantage: 200,
  },
];

export function buildDemoCoaching(): CoachingSummary {
  const analyses = DEMO_INPUTS.map(analyzeMatch);
  return summarizeCoaching(analyses, true);
}