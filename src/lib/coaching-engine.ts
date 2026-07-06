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

// --- demo analysis ---------------------------------------------------------

/** Deterministic demo inputs so guests / unlinked users see a full report. */
export const DEMO_INPUTS: MatchAnalysisInput[] = [
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

// ---------------------------------------------------------------------------
// AI Coach v1 — per-match narrative report.
//
// Turns a single `MatchAnalysisInput` (plus the previous match for trends) into
// a human-readable coaching report: summary, strengths, mistakes, priority,
// practice goal, confidence, and an improvement-history comparison. PURE and
// deterministic — every claim is derived from real match statistics, never
// fabricated. Same "engine seam" idea: an LLM can later return this shape.
// ---------------------------------------------------------------------------

export type ReportGrade = "S+" | "S" | "A" | "B" | "C" | "D";
// Player-friendly replacement for the old "confidence" wording. Describes how
// much the coach trusts this read given the available match data.
export type CoachAssessment = "Reliable read" | "Solid read" | "Early read";

export interface CoachStrength {
  title: string;
  why: string;
}

export interface CoachMistake {
  title: string;
  what: string;
  why: string;
  fix: string;
}

export interface TrendItem {
  key: string;
  label: string;
  current: string;
  previous: string;
  /** Signed % or absolute change, pre-formatted for display. */
  change: string;
  direction: "up" | "down" | "flat";
  /** Whether the change is an improvement for the player. */
  improved: boolean;
}

export interface MatchCoachingReport {
  matchId: string;
  champion: string;
  role: string;
  win: boolean;
  gameCreation: string | null;
  durationMin: number;

  overallScore: number;
  overallGrade: ReportGrade;
  grades: CoachingGrades;
  gradeLetters: Record<keyof CoachingGrades, Grade>;

  summary: string;
  strengths: CoachStrength[];
  mistakes: CoachMistake[];
  priorityImprovement: { title: string; why: string };
  practiceGoal: string;
  coachAssessment: CoachAssessment;
  assessmentReason: string;

  history: TrendItem[];
  comparedMatchId: string | null;

  engineVersion: number;
  source: "rule-based" | "llm";
}

/** Report grade adds an S+ tier above the base engine's S. */
export function toReportGrade(score: number): ReportGrade {
  if (score >= 92) return "S+";
  return toGrade(score);
}

const fix1 = (n: number) => n.toFixed(1);

// --- summary ---------------------------------------------------------------

function buildSummary(m: MatchAnalysisInput, a: MatchCoachingAnalysis): string {
  const parts: string[] = [];

  // Laning phase.
  if (m.earlyGoldExpAdvantage >= 500 || m.maxCsAdvantage >= 12) {
    parts.push("You won the laning phase");
  } else if (m.earlyGoldExpAdvantage <= -500 || m.maxCsAdvantage <= -12) {
    parts.push("You fell behind in lane");
  } else {
    parts.push("You played a fairly even lane");
  }

  // The turning point / defining trait of the game.
  if (m.deaths >= 7) {
    parts.push(`but gave up too many kills with ${m.deaths} deaths`);
  } else if (m.killParticipation < 0.45) {
    parts.push(
      `but weren't present for enough fights (${pct(m.killParticipation)}% kill participation)`,
    );
  } else if (m.csPerMin < 6.5) {
    parts.push(`but dropped off on farm at ${fix1(m.csPerMin)} CS/min`);
  } else if (a.overallScore >= 80) {
    parts.push("and stayed impactful all game");
  } else if (m.win) {
    parts.push("and closed out the win cleanly");
  } else {
    parts.push("but couldn't swing the mid-to-late game");
  }

  const outcome = m.win ? "Result: victory." : "Result: defeat.";
  return `${parts.join(" ")}. ${outcome}`;
}

// --- strengths -------------------------------------------------------------

interface RankedStrength extends CoachStrength {
  priority: number;
}

function buildStrengths(m: MatchAnalysisInput, g: CoachingGrades): CoachStrength[] {
  const s: RankedStrength[] = [];

  if (m.csPerMin >= 8) {
    s.push({
      title: "Excellent CSing",
      why: `You farmed ${fix1(m.csPerMin)} CS/min (${m.cs} total), at or above the strong-ADC benchmark of ~8.0/min — that's a steady item lead.`,
      priority: g.farming + 5,
    });
  }
  if (m.visionPerMin >= 0.85 || m.controlWardsPlaced >= 3) {
    s.push({
      title: "Strong vision control",
      why: `A ${m.visionScore} vision score with ${m.controlWardsPlaced} control ward(s) meant you could see picks and objectives coming.`,
      priority: g.vision + 4,
    });
  }
  if (m.deaths <= 3) {
    s.push({
      title: "Disciplined positioning",
      why: `Only ${m.deaths} death(s) all game — you kept yourself alive to keep dealing damage instead of feeding shutdowns.`,
      priority: 88,
    });
  }
  if (m.killParticipation >= 0.6) {
    s.push({
      title: "Consistent objective & fight participation",
      why: `You were in on ${pct(m.killParticipation)}% of your team's kills, so you showed up when it mattered.`,
      priority: g.teamfight + 3,
    });
  }
  if (m.damageShare >= 0.3) {
    s.push({
      title: "High damage efficiency",
      why: `You dealt ${pct(m.damageShare)}% of your team's champion damage — carrying your share of the fights.`,
      priority: g.teamfight,
    });
  }
  if (m.earlyGoldExpAdvantage >= 500 || m.laneMinions10 >= 70) {
    s.push({
      title: "Safe, winning laning",
      why: `You had ${m.laneMinions10} CS at 10 min and a healthy early gold/xp lead — a clean start to the game.`,
      priority: g.laning + 2,
    });
  }
  const objectives = m.dragonTakedowns + m.baronTakedowns + m.riftHeraldTakedowns;
  if (objectives >= 3) {
    s.push({
      title: "Great objective control",
      why: `You were part of ${objectives} major objective takedowns (dragons/barons/heralds) — the fastest way to win games.`,
      priority: g.objective + 2,
    });
  }
  if (m.goldPerMin >= 420) {
    s.push({
      title: "Good gold income",
      why: `${Math.round(m.goldPerMin)} gold/min kept you ahead on item power spikes.`,
      priority: 60,
    });
  }

  // Guarantee three by surfacing the player's relatively best areas.
  if (s.length < 3) {
    const areas: RankedStrength[] = [
      { title: "Farming", why: `Your farming graded ${g.farming}/100 this game — your most reliable lever.`, priority: g.farming },
      { title: "Teamfighting", why: `Your teamfight impact graded ${g.teamfight}/100 relative to the lobby.`, priority: g.teamfight },
      { title: "Laning", why: `Your laning phase graded ${g.laning}/100.`, priority: g.laning },
      { title: "Staying alive", why: `Your consistency graded ${g.consistency}/100 — deaths kept in check.`, priority: g.consistency },
    ].sort((a, b) => b.priority - a.priority);
    for (const area of areas) {
      if (s.length >= 3) break;
      if (!s.some((x) => x.title === area.title)) s.push(area);
    }
  }

  return s.sort((a, b) => b.priority - a.priority).slice(0, 3).map(({ title, why }) => ({ title, why }));
}

// --- mistakes --------------------------------------------------------------

interface RankedMistake extends CoachMistake {
  priority: number;
}

function buildMistakes(m: MatchAnalysisInput, g: CoachingGrades): CoachMistake[] {
  const w: RankedMistake[] = [];

  if (m.deaths >= 6) {
    w.push({
      title: "Too many deaths",
      what: `You died ${m.deaths} times over ${Math.round(m.durationMin)} minutes.`,
      why: "Every death gives the enemy gold and free map control, and an ADC that's dead deals zero damage in the fight that decides the game.",
      fix: "Fight one screen behind your frontline and only step up after the enemy's engage is used. Treat each death as a lost teamfight.",
      priority: 100 - g.consistency + 10,
    });
  }
  if (m.csPerMin < 7) {
    w.push({
      title: "Weak wave management / CS",
      what: `You averaged ${fix1(m.csPerMin)} CS/min (${m.cs} total), below the ~8.0/min benchmark.`,
      why: "Missed minions are missed gold — over 30 minutes that's often a full item you didn't have in the fights you lost.",
      fix: "Catch side waves before grouping and last-hit the first three waves without using abilities to keep tempo.",
      priority: 100 - g.farming,
    });
  }
  if (m.visionPerMin < 0.6 || m.controlWardsPlaced < 1) {
    w.push({
      title: "Low vision score",
      what: `You finished with a ${m.visionScore} vision score and ${m.controlWardsPlaced} control ward(s).`,
      why: "Without wards you get caught out and can't see objective setups, so fights start on the enemy's terms.",
      fix: "Buy a control ward every back and place it near the next objective 60–90 seconds before it spawns.",
      priority: 100 - g.vision,
    });
  }
  if (m.killParticipation < 0.45) {
    w.push({
      title: "Missing objective rotations",
      what: `You joined only ${pct(m.killParticipation)}% of your team's kills.`,
      why: "Fights and objectives are where games are decided; being absent means your team fights 4v5 while you farm.",
      fix: "After crashing a wave, rotate with your team toward the next objective instead of staying in a dead lane.",
      priority: 82,
    });
  }
  if (m.earlyGoldExpAdvantage <= -600) {
    w.push({
      title: "Losing lane early",
      what: `You ended the laning phase down roughly ${Math.abs(Math.round(m.earlyGoldExpAdvantage))} gold/xp.`,
      why: "Falling behind early makes every trade and fight harder for the rest of the game.",
      fix: "Play safer when behind — freeze or slow-push, give up nothing greedy, and back on a timer to hit your first item.",
      priority: 100 - g.laning,
    });
  }
  if (m.win && m.earlyGoldExpAdvantage >= 700 && m.dragonTakedowns + m.baronTakedowns <= 1) {
    w.push({
      title: "Not converting leads into objectives",
      what: `You built an early lead but were in on only ${m.dragonTakedowns + m.baronTakedowns} major objective.`,
      why: "Leads that don't turn into dragons, barons, and towers eventually evaporate.",
      fix: "When ahead, push for dragons and mid tower with your team instead of hunting extra kills.",
      priority: 78,
    });
  }
  if (m.damageShare < 0.22) {
    w.push({
      title: "Low damage share in fights",
      what: `You dealt only ${pct(m.damageShare)}% of your team's champion damage.`,
      why: "As the ADC you're the team's sustained damage — low output usually means poor positioning or dying early.",
      fix: "Attack the closest safe target and keep auto-attacking through the whole fight instead of one burst then backing off.",
      priority: 100 - g.teamfight,
    });
  }

  // Guarantee three even in a clean game — with honest, low-severity notes.
  if (w.length < 3) {
    const fillers: RankedMistake[] = [
      {
        title: "Review your first death",
        what: "No glaring statistical mistake stood out this game.",
        why: "Even in strong games one avoidable death or recall often costs tempo.",
        fix: "Rewatch your first death next game and ask what information you were missing.",
        priority: 30,
      },
      {
        title: "Hold your mid-game farm",
        what: `You farmed ${fix1(m.csPerMin)} CS/min overall.`,
        why: "ADCs commonly stall out on CS after 15 minutes once fights start.",
        fix: "Keep clearing side waves between objectives so your gold curve never flattens.",
        priority: 25,
      },
      {
        title: "Push your vision further",
        what: `Vision score of ${m.visionScore} was acceptable but not dominant.`,
        why: "More vision turns coin-flip fights into ones you start ahead.",
        fix: `Aim to beat a ${Math.max(20, Math.round(m.durationMin * 0.9))} vision score next game.`,
        priority: 20,
      },
    ];
    for (const f of fillers) {
      if (w.length >= 3) break;
      if (!w.some((x) => x.title === f.title)) w.push(f);
    }
  }

  return w
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map(({ title, what, why, fix }) => ({ title, what, why, fix }));
}

// --- priority + practice goal ---------------------------------------------

function buildPriority(
  m: MatchAnalysisInput,
  mistakes: CoachMistake[],
): { title: string; why: string } {
  const top = mistakes[0];
  if (!top) {
    return {
      title: "Keep stacking clean games",
      why: "Nothing hurt you badly this game — focus on repeating the same decisions consistently.",
    };
  }
  return {
    title: top.title,
    why: `${top.why} Fixing this one habit is the single biggest win-rate lever from this game.`,
  };
}

function buildPracticeGoal(m: MatchAnalysisInput, priorityTitle: string): string {
  const t = priorityTitle.toLowerCase();
  if (t.includes("death")) {
    return `Die fewer than ${Math.max(4, m.deaths - 2)} times next game.`;
  }
  if (t.includes("cs") || t.includes("wave") || t.includes("farm")) {
    const target = Math.max(70, Math.round(m.laneMinions10) + 8);
    return `Reach ${target} CS by 10 minutes next game.`;
  }
  if (t.includes("vision")) {
    return `Place at least ${Math.max(2, m.controlWardsPlaced + 2)} control wards and hit a ${Math.max(25, Math.round(m.durationMin))} vision score.`;
  }
  if (t.includes("rotation") || t.includes("participation")) {
    return "Maintain above 60% kill participation next game.";
  }
  if (t.includes("lane")) {
    return "Finish the laning phase even or ahead in CS at 10 minutes.";
  }
  if (t.includes("objective")) {
    return "Rotate to be present for at least 3 dragon/baron takedowns next game.";
  }
  if (t.includes("damage")) {
    return "Deal at least 25% of your team's champion damage next game.";
  }
  return `Beat this game's ${fix1(m.csPerMin)} CS/min and ${m.visionScore} vision score next game.`;
}

// --- confidence ------------------------------------------------------------

function buildAssessment(m: MatchAnalysisInput): { level: CoachAssessment; reason: string } {
  if (m.durationMin < 12) {
    return { level: "Early read", reason: "This game was very short (possible remake), so I'm keeping this read light until you play a full one." };
  }
  const hasChallengeData =
    m.laneMinions10 > 0 || m.killParticipation > 0 || m.visionScore > 0;
  if (!hasChallengeData) {
    return { level: "Early read", reason: "Some detailed stats were missing for this match, so I'm only calling out what I can clearly see." };
  }
  if (m.durationMin >= 20 && m.killParticipation > 0 && m.laneMinions10 > 0) {
    return { level: "Reliable read", reason: "Full-length game with complete stats — you can trust everything in this review." };
  }
  return { level: "Solid read", reason: "Good data to work with here, though a couple of advanced stats were incomplete." };
}

// --- improvement history ---------------------------------------------------

function trend(
  key: string,
  label: string,
  current: number,
  previous: number,
  fmt: (n: number) => string,
  higherIsBetter: boolean,
): TrendItem {
  const diff = current - previous;
  const eps = Math.abs(previous) * 0.02;
  let direction: TrendItem["direction"] = "flat";
  if (diff > eps) direction = "up";
  else if (diff < -eps) direction = "down";
  const improved = direction === "flat" ? true : higherIsBetter ? diff > 0 : diff < 0;
  const sign = diff > 0 ? "+" : "";
  return {
    key,
    label,
    current: fmt(current),
    previous: fmt(previous),
    change: direction === "flat" ? "no change" : `${sign}${fmt(diff)}`,
    direction,
    improved,
  };
}

function buildHistory(
  m: MatchAnalysisInput,
  prev: MatchAnalysisInput | null,
  curScore: number,
  prevScore: number | null,
): TrendItem[] {
  if (!prev) return [];
  const objectives = (x: MatchAnalysisInput) =>
    x.dragonTakedowns + x.baronTakedowns + x.riftHeraldTakedowns;
  const int = (n: number) => `${Math.round(n)}`;
  const one = (n: number) => n.toFixed(1);
  const percent = (n: number) => `${Math.round(n * 100)}%`;
  return [
    trend("cs", "CS / min", m.csPerMin, prev.csPerMin, one, true),
    trend("vision", "Vision score", m.visionScore, prev.visionScore, int, true),
    trend("damage", "Damage share", m.damageShare, prev.damageShare, percent, true),
    trend("deaths", "Deaths", m.deaths, prev.deaths, int, false),
    trend("objectives", "Objective takedowns", objectives(m), objectives(prev), int, true),
    trend("kp", "Kill participation", m.killParticipation, prev.killParticipation, percent, true),
    trend("gold", "Gold / min", m.goldPerMin, prev.goldPerMin, int, true),
    trend("champion", "Overall performance", curScore, prevScore ?? curScore, int, true),
  ];
}

// --- public builder --------------------------------------------------------

/**
 * Build a full narrative coaching report for one match. `prev` is the
 * immediately-older match (or null) used for the improvement-history section.
 */
export function buildMatchReport(
  m: MatchAnalysisInput,
  prev: MatchAnalysisInput | null = null,
): MatchCoachingReport {
  const analysis = analyzeMatch(m);
  const prevAnalysis = prev ? analyzeMatch(prev) : null;
  const strengths = buildStrengths(m, analysis.grades);
  const mistakes = buildMistakes(m, analysis.grades);
  const priorityImprovement = buildPriority(m, mistakes);
  const confidence = buildConfidence(m);

  return {
    matchId: m.matchId,
    champion: m.champion,
    role: m.role,
    win: m.win,
    gameCreation: m.gameCreation,
    durationMin: m.durationMin,
    overallScore: analysis.overallScore,
    overallGrade: toReportGrade(analysis.overallScore),
    grades: analysis.grades,
    gradeLetters: analysis.gradeLetters,
    summary: buildSummary(m, analysis),
    strengths,
    mistakes,
    priorityImprovement,
    practiceGoal: buildPracticeGoal(m, priorityImprovement.title),
    confidence: confidence.level,
    confidenceReason: confidence.reason,
    history: buildHistory(m, prev, analysis.overallScore, prevAnalysis?.overallScore ?? null),
    comparedMatchId: prev?.matchId ?? null,
    engineVersion: COACHING_ENGINE_VERSION,
    source: "rule-based",
  };
}

/** Demo report for guests / unlinked accounts, indexed into the demo set. */
export function buildDemoMatchReport(index = 0): MatchCoachingReport {
  const i = ((index % DEMO_INPUTS.length) + DEMO_INPUTS.length) % DEMO_INPUTS.length;
  const prev = DEMO_INPUTS[i + 1] ?? DEMO_INPUTS[(i + 1) % DEMO_INPUTS.length] ?? null;
  return buildMatchReport(DEMO_INPUTS[i], prev);
}

/** All demo reports (chronological), used by the demo Match Review list. */
export function demoMatchReports(): MatchCoachingReport[] {
  return DEMO_INPUTS.map((_, i) => buildDemoMatchReport(i));
}