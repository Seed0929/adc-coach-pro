// ---------------------------------------------------------------------------
// BotDiff Player Profile & Progress engine (pure, client-safe).
//
// Turns the player's per-match coaching analyses + normalized inputs into a
// long-term improvement journal: BotDiff Score, improvement history, champion
// progress, achievements, session summary, and personal records.
//
// This module is PURE: no network, no database, no secrets. The server builds
// `{ input, analysis }` pairs from cached data and feeds them here. The demo
// builder produces the same shape so guests see a full profile.
// ---------------------------------------------------------------------------
import {
  analyzeMatch,
  toGrade,
  type CoachingGrades,
  type Grade,
  type MatchAnalysisInput,
  type MatchCoachingAnalysis,
} from "./coaching-engine";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);
const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

/** A single game, enriched with its BotDiff analysis. Newest-first in lists. */
export interface ProfileMatch {
  matchId: string;
  champion: string;
  role: string;
  win: boolean;
  gameCreation: string | null;
  durationMin: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  cs: number;
  csPerMin: number;
  gold: number;
  goldPerMin: number;
  visionScore: number;
  visionPerMin: number;
  killParticipation: number; // 0-1
  objectiveTakedowns: number;
  damageToChampions: number;
  damagePerMin: number;
  botDiffScore: number; // 0-100
  grades: CoachingGrades;
  strengths: string[];
  weaknesses: string[];
}

export interface TopChampion {
  name: string;
  img: string;
  games: number;
  winrate: number;
}

export interface PlayerOverview {
  gameName: string;
  tagLine: string;
  riotId: string;
  region: string;
  regionLabel: string;
  profileIconUrl: string | null;
  summonerLevel: number | null;
  rankLabel: string; // "Diamond I" or "Unranked"
  lp: number | null;
  mainRole: string;
  totalGames: number;
  accountLevel: number | null;
  topChampions: TopChampion[];
}

export interface ScoreBreakdown {
  label: string;
  value: number; // 0-100
}

export interface BotDiffScore {
  current: number;
  previous: number;
  weeklyChange: number;
  monthlyChange: number;
  best: number;
  lowest: number;
  series: { label: string; score: number }[];
  breakdown: ScoreBreakdown[];
}

export type TrendWindow = 10 | 20 | 50 | 0; // 0 = all time

export interface TrendMetric {
  key: string;
  label: string;
  unit: string;
  average: number;
  delta: number; // change first-half -> second-half of the window
  direction: "up" | "down" | "flat";
  better: boolean; // is the direction an improvement?
  points: { i: number; value: number }[]; // chronological
}

export interface ChampionProgress {
  name: string;
  img: string;
  games: number;
  wins: number;
  winRate: number;
  avgGradeLetter: Grade;
  avgCs: number;
  avgVision: number;
  avgKda: number;
  botDiffScore: number;
  trend: number;
  strongest: string;
  weakest: string;
  commonMistake: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide key resolved in the UI
  unlocked: boolean;
  progress: number; // 0-100
}

export interface SessionLine {
  label: string;
  value: string;
  positive: boolean;
}

export interface SessionSummary {
  games: number;
  wins: number;
  losses: number;
  lines: SessionLine[];
}

export interface PersonalRecord {
  label: string;
  value: string;
  sub: string;
  icon: string;
}

export interface PlayerProfile {
  isDemo: boolean;
  overview: PlayerOverview;
  score: BotDiffScore;
  matches: ProfileMatch[]; // newest-first
  champions: ChampionProgress[];
  achievements: Achievement[];
  sessionSummary: SessionSummary | null;
  records: PersonalRecord[];
}

const GRADE_LABELS: Record<keyof CoachingGrades, string> = {
  laning: "Laning",
  farming: "Farming",
  vision: "Vision",
  objective: "Objectives",
  teamfight: "Team Fighting",
  consistency: "Consistency",
};

// --- per-match assembly ----------------------------------------------------

export function toProfileMatch(
  input: MatchAnalysisInput,
  analysis: MatchCoachingAnalysis,
): ProfileMatch {
  const kda = input.deaths > 0 ? (input.kills + input.assists) / input.deaths : input.kills + input.assists;
  return {
    matchId: input.matchId,
    champion: input.champion,
    role: input.role,
    win: input.win,
    gameCreation: input.gameCreation,
    durationMin: input.durationMin,
    kills: input.kills,
    deaths: input.deaths,
    assists: input.assists,
    kda,
    cs: input.cs,
    csPerMin: input.csPerMin,
    gold: input.gold,
    goldPerMin: input.goldPerMin,
    visionScore: input.visionScore,
    visionPerMin: input.visionPerMin,
    killParticipation: input.killParticipation,
    objectiveTakedowns:
      input.dragonTakedowns + input.baronTakedowns + input.riftHeraldTakedowns,
    damageToChampions: Math.round(input.damagePerMin * input.durationMin),
    damagePerMin: input.damagePerMin,
    botDiffScore: analysis.overallScore,
    grades: analysis.grades,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
  };
}

// --- BotDiff Score ---------------------------------------------------------

/** Rolling average series over chronological scores (smooths single games). */
function rollingSeries(scores: number[], window = 5): number[] {
  return scores.map((_, i) => {
    const slice = scores.slice(Math.max(0, i - window + 1), i + 1);
    return round(avg(slice));
  });
}

function computeScore(chron: ProfileMatch[]): BotDiffScore {
  const scores = chron.map((m) => m.botDiffScore);
  if (scores.length === 0) {
    return {
      current: 0, previous: 0, weeklyChange: 0, monthlyChange: 0, best: 0, lowest: 0,
      series: [], breakdown: [],
    };
  }
  const series = rollingSeries(scores);
  const current = series[series.length - 1];
  const previous = series.length > 1 ? series[series.length - 2] : current;
  const best = Math.max(...series);
  const lowest = Math.min(...series);

  // Rolling value "as of" a cutoff date (or index fallback when no timestamps).
  const asOf = (msAgo: number): number => {
    const cutoff = Date.now() - msAgo;
    const upto = chron.filter((m) => m.gameCreation && new Date(m.gameCreation).getTime() <= cutoff);
    const sub = upto.length ? upto.map((m) => m.botDiffScore) : scores.slice(0, 1);
    return round(avg(sub.slice(-5)));
  };
  const weeklyChange = current - asOf(7 * 864e5);
  const monthlyChange = current - asOf(30 * 864e5);

  // Breakdown across the loaded window (recent form).
  const recent = chron.slice(-10);
  const g = (k: keyof CoachingGrades) => round(avg(recent.map((m) => m.grades[k])));
  const avgDeaths = avg(recent.map((m) => m.deaths));
  const trendSignal = clamp(50 + (current - previous) * 4 + weeklyChange * 2);
  const breakdown: ScoreBreakdown[] = [
    { label: "Consistency", value: g("consistency") },
    { label: "CS", value: g("farming") },
    { label: "Vision", value: g("vision") },
    { label: "Objectives", value: g("objective") },
    { label: "Positioning", value: round(clamp(100 - avgDeaths * 9)) },
    { label: "Team Fighting", value: g("teamfight") },
    { label: "Deaths", value: round(clamp(100 - avgDeaths * 8)) },
    { label: "Improvement", value: round(trendSignal) },
  ];

  return {
    current, previous, weeklyChange, monthlyChange, best, lowest,
    series: series.map((score, i) => ({ label: `G${i + 1}`, score })),
    breakdown,
  };
}

// --- improvement history ---------------------------------------------------

interface MetricDef {
  key: string;
  label: string;
  unit: string;
  get: (m: ProfileMatch) => number;
  higherIsBetter: boolean;
}

const METRIC_DEFS: MetricDef[] = [
  { key: "cs", label: "CS / min", unit: "/min", get: (m) => round(m.csPerMin * 10) / 10, higherIsBetter: true },
  { key: "vision", label: "Vision Score", unit: "", get: (m) => m.visionScore, higherIsBetter: true },
  { key: "deaths", label: "Deaths", unit: "/game", get: (m) => m.deaths, higherIsBetter: false },
  { key: "kda", label: "KDA", unit: ": 1", get: (m) => round(m.kda * 10) / 10, higherIsBetter: true },
  { key: "damage", label: "Damage", unit: "", get: (m) => m.damageToChampions, higherIsBetter: true },
  { key: "gold", label: "Gold / min", unit: "/min", get: (m) => round(m.goldPerMin), higherIsBetter: true },
  { key: "kp", label: "Kill Participation", unit: "%", get: (m) => round(m.killParticipation * 100), higherIsBetter: true },
  { key: "objective", label: "Objective Takedowns", unit: "/game", get: (m) => m.objectiveTakedowns, higherIsBetter: true },
];

/** Compute improvement-history trends over a window. `matches` is newest-first. */
export function computeTrends(matches: ProfileMatch[], window: TrendWindow): TrendMetric[] {
  const sliced = window === 0 ? matches : matches.slice(0, window);
  const chron = [...sliced].reverse();
  if (chron.length === 0) return [];
  return METRIC_DEFS.map((def) => {
    const values = chron.map(def.get);
    const half = Math.max(1, Math.floor(values.length / 2));
    const firstHalf = avg(values.slice(0, half));
    const secondHalf = avg(values.slice(-half));
    const rawDelta = secondHalf - firstHalf;
    const delta = Math.round(rawDelta * 10) / 10;
    const direction: TrendMetric["direction"] =
      Math.abs(rawDelta) < 0.05 ? "flat" : rawDelta > 0 ? "up" : "down";
    const better = direction === "flat" ? true : def.higherIsBetter ? rawDelta > 0 : rawDelta < 0;
    return {
      key: def.key,
      label: def.label,
      unit: def.unit,
      average: Math.round(avg(values) * 10) / 10,
      delta,
      direction,
      better,
      points: values.map((value, i) => ({ i, value })),
    };
  });
}

// --- champion progress -----------------------------------------------------

function frequencyTop(items: string[]): string {
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it, (counts.get(it) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function championProgress(matches: ProfileMatch[], imgFor: (name: string) => string): ChampionProgress[] {
  const map = new Map<string, ProfileMatch[]>();
  for (const m of matches) {
    const list = map.get(m.champion) ?? [];
    list.push(m);
    map.set(m.champion, list);
  }
  return [...map.entries()]
    .map(([name, list]) => {
      const chron = [...list].reverse();
      const wins = list.filter((m) => m.win).length;
      const gradeAvgs: Record<keyof CoachingGrades, number> = {
        laning: avg(list.map((m) => m.grades.laning)),
        farming: avg(list.map((m) => m.grades.farming)),
        vision: avg(list.map((m) => m.grades.vision)),
        objective: avg(list.map((m) => m.grades.objective)),
        teamfight: avg(list.map((m) => m.grades.teamfight)),
        consistency: avg(list.map((m) => m.grades.consistency)),
      };
      const sorted = (Object.keys(gradeAvgs) as (keyof CoachingGrades)[]).sort(
        (a, b) => gradeAvgs[b] - gradeAvgs[a],
      );
      const scores = chron.map((m) => m.botDiffScore);
      const half = Math.max(1, Math.floor(scores.length / 2));
      const trend =
        scores.length >= 4 ? round(avg(scores.slice(-half)) - avg(scores.slice(0, half))) : 0;
      return {
        name,
        img: imgFor(name),
        games: list.length,
        wins,
        winRate: round((wins / list.length) * 100),
        avgGradeLetter: toGrade(round(avg(scores))),
        avgCs: Math.round(avg(list.map((m) => m.csPerMin)) * 10) / 10,
        avgVision: round(avg(list.map((m) => m.visionScore))),
        avgKda: Math.round(avg(list.map((m) => m.kda)) * 10) / 10,
        botDiffScore: round(avg(scores)),
        trend,
        strongest: GRADE_LABELS[sorted[0]],
        weakest: GRADE_LABELS[sorted[sorted.length - 1]],
        commonMistake: frequencyTop(list.flatMap((m) => m.weaknesses)) || "No recurring mistakes",
      };
    })
    .sort((a, b) => b.games - a.games);
}

// --- achievements ----------------------------------------------------------

function longestWinStreak(chron: ProfileMatch[]): number {
  let best = 0;
  let cur = 0;
  for (const m of chron) {
    cur = m.win ? cur + 1 : 0;
    if (cur > best) best = cur;
  }
  return best;
}

function buildAchievements(matches: ProfileMatch[], ranked: boolean): Achievement[] {
  const chron = [...matches].reverse();
  const total = matches.length;
  const wins = matches.filter((m) => m.win).length;
  const bestCs = Math.max(0, ...matches.map((m) => m.cs));
  const bestVision = Math.max(0, ...matches.map((m) => m.visionScore));
  const bestObjectives = Math.max(0, ...matches.map((m) => m.objectiveTakedowns));
  const streak = longestWinStreak(chron);
  const pct = (n: number, target: number) => round(clamp((n / target) * 100));

  return [
    { id: "first_win", name: "First Victory", description: "Win your first analyzed game.", icon: "trophy", unlocked: wins >= 1, progress: wins >= 1 ? 100 : 0 },
    { id: "ten_games", name: "10 Games Imported", description: "Import 10 games into BotDiff.", icon: "layers", unlocked: total >= 10, progress: pct(total, 10) },
    { id: "cs_club", name: "100 CS Club", description: "Reach 100+ CS in a single game.", icon: "sword", unlocked: bestCs >= 100, progress: pct(bestCs, 100) },
    { id: "vision_master", name: "Vision Master", description: "Reach a 40+ vision score in a game.", icon: "eye", unlocked: bestVision >= 40, progress: pct(bestVision, 40) },
    { id: "objective", name: "Objective Controller", description: "Take part in 4+ objectives in a game.", icon: "target", unlocked: bestObjectives >= 4, progress: pct(bestObjectives, 4) },
    { id: "win_streak", name: "Win Streak", description: "Win 3 games in a row.", icon: "flame", unlocked: streak >= 3, progress: pct(streak, 3) },
    { id: "marathon", name: "Marathon", description: "Import 50 games into BotDiff.", icon: "medal", unlocked: total >= 50, progress: pct(total, 50) },
    { id: "rank_promotion", name: "Ranked Climber", description: "Link a ranked account.", icon: "trending-up", unlocked: ranked, progress: ranked ? 100 : 0 },
  ];
}

// --- session summary -------------------------------------------------------

const SESSION_GAP_MS = 3 * 60 * 60 * 1000;

function groupSessions(chron: ProfileMatch[]): ProfileMatch[][] {
  const sessions: ProfileMatch[][] = [];
  let current: ProfileMatch[] = [];
  let prevTime: number | null = null;
  for (const m of chron) {
    const t = m.gameCreation ? new Date(m.gameCreation).getTime() : null;
    if (prevTime != null && t != null && t - prevTime > SESSION_GAP_MS) {
      if (current.length) sessions.push(current);
      current = [];
    }
    current.push(m);
    if (t != null) prevTime = t;
  }
  if (current.length) sessions.push(current);
  return sessions;
}

function buildSessionSummary(chron: ProfileMatch[]): SessionSummary | null {
  const sessions = groupSessions(chron);
  if (sessions.length < 2) return null;
  const last = sessions[sessions.length - 1];
  const prev = sessions[sessions.length - 2];
  const wins = last.filter((m) => m.win).length;

  const mean = (list: ProfileMatch[], get: (m: ProfileMatch) => number) => avg(list.map(get));
  const csDelta = mean(last, (m) => m.csPerMin) - mean(prev, (m) => m.csPerMin);
  const prevVision = mean(prev, (m) => m.visionScore);
  const visionPct = prevVision > 0 ? ((mean(last, (m) => m.visionScore) - prevVision) / prevVision) * 100 : 0;
  const deathDelta = mean(last, (m) => m.deaths) - mean(prev, (m) => m.deaths);
  const scoreDelta = round(mean(last, (m) => m.botDiffScore) - mean(prev, (m) => m.botDiffScore));

  const lines: SessionLine[] = [
    { label: "Wins", value: `${wins}W ${last.length - wins}L`, positive: wins >= last.length - wins },
    { label: "CS / min", value: `${csDelta >= 0 ? "+" : ""}${csDelta.toFixed(1)}`, positive: csDelta >= 0 },
    { label: "Vision", value: `${visionPct >= 0 ? "+" : ""}${round(visionPct)}%`, positive: visionPct >= 0 },
    { label: "Deaths", value: `${deathDelta >= 0 ? "+" : ""}${deathDelta.toFixed(1)}/game`, positive: deathDelta <= 0 },
    { label: "BotDiff Score", value: `${scoreDelta >= 0 ? "+" : ""}${scoreDelta} pts`, positive: scoreDelta >= 0 },
  ];
  return { games: last.length, wins, losses: last.length - wins, lines };
}

// --- personal records ------------------------------------------------------

function buildRecords(matches: ProfileMatch[]): PersonalRecord[] {
  if (matches.length === 0) return [];
  const best = <T>(get: (m: ProfileMatch) => number) =>
    matches.reduce((a, b) => (get(b) > get(a) ? b : a));
  const csM = best((m) => m.cs);
  const dmgM = best((m) => m.damageToChampions);
  const visM = best((m) => m.visionScore);
  const kpM = best((m) => m.killParticipation);
  const kdaM = best((m) => m.kda);
  const streak = longestWinStreak([...matches].reverse());
  return [
    { label: "Highest CS", value: `${csM.cs}`, sub: `${csM.champion} · ${csM.csPerMin.toFixed(1)}/min`, icon: "sword" },
    { label: "Highest Damage", value: dmgM.damageToChampions.toLocaleString(), sub: `${dmgM.champion}`, icon: "zap" },
    { label: "Best Vision Score", value: `${visM.visionScore}`, sub: `${visM.champion}`, icon: "eye" },
    { label: "Longest Win Streak", value: `${streak}`, sub: streak === 1 ? "game" : "games", icon: "flame" },
    { label: "Highest Kill Participation", value: `${round(kpM.killParticipation * 100)}%`, sub: `${kpM.champion}`, icon: "users" },
    { label: "Best KDA", value: `${kdaM.kda.toFixed(1)}`, sub: `${kdaM.champion} · ${kdaM.kills}/${kdaM.deaths}/${kdaM.assists}`, icon: "star" },
  ];
}

// --- top-level builder -----------------------------------------------------

export interface BuildProfileArgs {
  overview: Omit<PlayerOverview, "totalGames" | "mainRole" | "topChampions">;
  matches: ProfileMatch[]; // newest-first
  imgFor: (championName: string) => string;
  ranked: boolean;
  isDemo: boolean;
}

export function buildPlayerProfile(args: BuildProfileArgs): PlayerProfile {
  const { matches, imgFor, ranked, isDemo } = args;
  const chron = [...matches].reverse();
  const champions = championProgress(matches, imgFor);

  // Main role = most common.
  const roleCounts = new Map<string, number>();
  for (const m of matches) roleCounts.set(m.role, (roleCounts.get(m.role) ?? 0) + 1);
  const mainRole = [...roleCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Bot / ADC";

  const topChampions: TopChampion[] = champions.slice(0, 5).map((c) => ({
    name: c.name,
    img: c.img,
    games: c.games,
    winrate: c.winRate,
  }));

  return {
    isDemo,
    overview: {
      ...args.overview,
      totalGames: matches.length,
      mainRole,
      topChampions,
    },
    score: computeScore(chron),
    matches,
    champions,
    achievements: buildAchievements(matches, ranked),
    sessionSummary: buildSessionSummary(chron),
    records: buildRecords(matches),
  };
}

// --- demo profile ----------------------------------------------------------

const DEMO_CHAMPS = ["Kai'Sa", "Ezreal", "Jhin", "Caitlyn"];

function demoImg(name: string): string {
  const slug = name.replace(/[^A-Za-z]/g, "");
  return `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${slug}.png`;
}

function demoInputs(): MatchAnalysisInput[] {
  const inputs: MatchAnalysisInput[] = [];
  const count = 28;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1); // 0..1 improvement over time
    const champ = DEMO_CHAMPS[i % DEMO_CHAMPS.length];
    const win = i % 3 !== 0 || t > 0.55;
    const durationMin = 28 + (i % 6);
    const cs = Math.round(185 + t * 75 + (i % 5) * 4);
    const csPerMin = cs / durationMin;
    const deaths = Math.max(1, 7 - Math.round(t * 4) + (i % 4 === 0 ? 2 : 0));
    const kills = 4 + Math.round(t * 8) + (i % 4);
    const assists = 6 + Math.round(t * 6) + (i % 3);
    const visionScore = Math.round(18 + t * 24 + (i % 4) * 2);
    const damagePerMin = 380 + Math.round(t * 320) + (i % 5) * 20;
    // Spread games back in time ~5h apart so sessions/weekly/monthly compute.
    const gameCreation = new Date(Date.now() - (count - 1 - i) * 5 * 3600 * 1000).toISOString();
    inputs.push({
      matchId: `DEMO_${i}`,
      champion: champ,
      role: "Bot / ADC",
      win,
      gameCreation,
      durationMin,
      kills,
      deaths,
      assists,
      cs,
      csPerMin,
      gold: Math.round(durationMin * (360 + t * 90)),
      goldPerMin: 360 + t * 90,
      visionScore,
      visionPerMin: visionScore / durationMin,
      wardsPlaced: Math.round(8 + t * 8),
      controlWardsPlaced: Math.round(1 + t * 3),
      wardsKilled: Math.round(2 + t * 4),
      killParticipation: clamp(0.45 + t * 0.25 + (i % 3) * 0.02, 0, 1),
      damageShare: clamp(0.2 + t * 0.14, 0, 1),
      damagePerMin,
      soloKills: i % 5 === 0 ? 2 : 1,
      dragonTakedowns: Math.round(1 + t * 2),
      baronTakedowns: t > 0.5 && i % 2 === 0 ? 1 : 0,
      riftHeraldTakedowns: i % 3 === 0 ? 1 : 0,
      turretTakedowns: Math.round(2 + t * 4),
      objectivesStolen: 0,
      laneMinions10: Math.round(58 + t * 22),
      maxCsAdvantage: Math.round(-6 + t * 22),
      earlyGoldExpAdvantage: Math.round(-600 + t * 1600),
    });
  }
  return inputs;
}

export function buildDemoPlayerProfile(): PlayerProfile {
  const inputs = demoInputs();
  // newest-first to match live ordering.
  const matches = inputs
    .map((input) => toProfileMatch(input, analyzeMatch(input)))
    .reverse();
  return buildPlayerProfile({
    overview: {
      gameName: "Sample ADC",
      tagLine: "BOT",
      riotId: "Sample ADC#BOT",
      region: "NA",
      regionLabel: "North America",
      profileIconUrl: `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/profileicon/29.png`,
      summonerLevel: 214,
      rankLabel: "Diamond I",
      lp: 47,
      accountLevel: 214,
    },
    matches,
    imgFor: demoImg,
    ranked: true,
    isDemo: true,
  });
}