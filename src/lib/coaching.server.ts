// ---------------------------------------------------------------------------
// Coaching analysis helpers (server-only).
//
// Extracts a normalized engine input from stored Match-V5 rows, runs the
// deterministic coaching engine, and PERSISTS results in `coaching_analyses`
// (idempotent upsert on profile_id,match_id). Shared by coaching.functions.ts
// and the automatic match-sync path so every imported match is analyzed once.
// ---------------------------------------------------------------------------
import {
  analyzeMatch,
  COACHING_ENGINE_VERSION,
  type MatchAnalysisInput,
  type MatchCoachingAnalysis,
} from "./coaching-engine";

type SupabaseLike = { from: (t: string) => any };

const ROLE_LABELS: Record<string, string> = {
  BOTTOM: "Bot / ADC",
  UTILITY: "Support",
  MIDDLE: "Mid",
  TOP: "Top",
  JUNGLE: "Jungle",
};

const num = (v: unknown, d = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : d;

/** Build a normalized engine input from a stored match row + its raw payload. */
export function extractInput(row: any, puuid: string | null): MatchAnalysisInput | null {
  const durationSec = num(row.game_duration);
  const durationMin = Math.max(1, durationSec / 60);

  const info = row.raw?.info;
  const parts: any[] = info?.participants ?? [];
  const me =
    (puuid && parts.find((p) => p.puuid === puuid)) ||
    parts.find((p) => p.championName === row.champion_name) ||
    null;
  const ch = me?.challenges ?? {};

  const teamId = me?.teamId;
  const teamKills = parts
    .filter((p) => p.teamId === teamId)
    .reduce((s, p) => s + num(p.kills), 0);
  const teamDamage = parts
    .filter((p) => p.teamId === teamId)
    .reduce((s, p) => s + num(p.totalDamageDealtToChampions), 0);

  // Team compositions + lane opponent (for the Build & Matchup coach).
  const enemyTeamId = teamId === 100 ? 200 : teamId === 200 ? 100 : undefined;
  const nameOf = (p: any): string => String(p?.championName ?? "").trim();
  const allies = parts
    .filter((p) => p.teamId === teamId && p !== me)
    .map(nameOf)
    .filter(Boolean);
  const enemies = parts
    .filter((p) => enemyTeamId != null && p.teamId === enemyTeamId)
    .map(nameOf)
    .filter(Boolean);
  const myPos = me?.teamPosition ?? row.team_position ?? null;
  const laneOpponent =
    (myPos &&
      parts.find(
        (p) => p.teamId === enemyTeamId && p.teamPosition === myPos,
      )?.championName) ||
    null;

  const kills = num(row.kills, num(me?.kills));
  const deaths = num(row.deaths, num(me?.deaths));
  const assists = num(row.assists, num(me?.assists));
  const cs = num(row.cs, num(me?.totalMinionsKilled) + num(me?.neutralMinionsKilled));
  const gold = num(row.gold, num(me?.goldEarned));
  const visionScore = num(row.vision_score, num(me?.visionScore));
  const selfDamage = num(me?.totalDamageDealtToChampions);

  const killParticipation =
    num(ch.killParticipation) ||
    (teamKills > 0 ? (kills + assists) / teamKills : 0);
  const damageShare =
    (typeof ch.teamDamagePercentage === "number" ? ch.teamDamagePercentage : 0) ||
    (teamDamage > 0 ? selfDamage / teamDamage : 0);

  return {
    matchId: row.match_id,
    champion: row.champion_name,
    role: ROLE_LABELS[row.team_position] ?? row.team_position ?? "Bot / ADC",
    win: Boolean(row.win),
    gameCreation: row.game_creation ?? null,
    durationMin,
    kills,
    deaths,
    assists,
    cs,
    csPerMin: cs / durationMin,
    gold,
    goldPerMin: num(ch.goldPerMinute) || gold / durationMin,
    visionScore,
    visionPerMin: num(ch.visionScorePerMinute) || visionScore / durationMin,
    wardsPlaced: num(me?.wardsPlaced),
    controlWardsPlaced: num(ch.controlWardsPlaced, num(me?.detectorWardsPlaced)),
    wardsKilled: num(me?.wardsKilled),
    killParticipation,
    damageShare,
    damagePerMin: num(ch.damagePerMinute) || selfDamage / durationMin,
    soloKills: num(ch.soloKills),
    dragonTakedowns: num(ch.dragonTakedowns, num(me?.dragonKills)),
    baronTakedowns: num(ch.baronTakedowns, num(me?.baronKills)),
    riftHeraldTakedowns: num(ch.riftHeraldTakedowns),
    turretTakedowns: num(ch.turretTakedowns, num(me?.turretTakedowns)),
    objectivesStolen: num(me?.objectivesStolen),
    laneMinions10: num(ch.laneMinionsFirst10Minutes),
    maxCsAdvantage: num(ch.maxCsAdvantageOnLaneOpponent),
    earlyGoldExpAdvantage: num(
      ch.earlyLaningPhaseGoldExpAdvantage,
      num(ch.laningPhaseGoldExpAdvantage),
    ),
    allies,
    enemies,
    laneOpponent: laneOpponent ? String(laneOpponent) : null,
  };
}

/**
 * Load the user's most recent stored matches, reuse any already-computed
 * analyses (current engine version), analyze the rest, persist new ones, and
 * return the full analysis list (most recent first). Safe to call repeatedly.
 */
export async function analyzeAndStoreMatches(
  supabase: SupabaseLike,
  userId: string,
  limit = 20,
): Promise<MatchCoachingAnalysis[]> {
  const { data: account } = await supabase
    .from("riot_accounts")
    .select("puuid")
    .eq("profile_id", userId)
    .maybeSingle();
  const puuid = (account?.puuid as string | null) ?? null;

  const { data: rows } = await supabase
    .from("matches")
    .select(
      "match_id, champion_name, team_position, win, kills, deaths, assists, cs, gold, vision_score, game_duration, game_creation, raw",
    )
    .eq("profile_id", userId)
    .order("game_creation", { ascending: false })
    .limit(limit);

  if (!rows || rows.length === 0) return [];

  const matchIds = rows.map((r: any) => r.match_id);
  const { data: stored } = await supabase
    .from("coaching_analyses")
    .select("match_id, engine_version, analysis")
    .eq("profile_id", userId)
    .in("match_id", matchIds);

  const cache = new Map<string, MatchCoachingAnalysis>();
  for (const s of stored ?? []) {
    if (s.engine_version === COACHING_ENGINE_VERSION) {
      cache.set(s.match_id, s.analysis as unknown as MatchCoachingAnalysis);
    }
  }

  const analyses: MatchCoachingAnalysis[] = [];
  const toStore: {
    profile_id: string;
    match_id: string;
    engine_version: number;
    overall_score: number;
    analysis: MatchCoachingAnalysis;
  }[] = [];

  for (const row of rows) {
    const cached = cache.get(row.match_id);
    if (cached) {
      analyses.push(cached);
      continue;
    }
    const input = extractInput(row, puuid);
    if (!input) continue;
    const analysis = analyzeMatch(input);
    analyses.push(analysis);
    toStore.push({
      profile_id: userId,
      match_id: row.match_id,
      engine_version: COACHING_ENGINE_VERSION,
      overall_score: analysis.overallScore,
      analysis,
    });
  }

  if (toStore.length > 0) {
    await supabase
      .from("coaching_analyses")
      .upsert(toStore as any, { onConflict: "profile_id,match_id" });
  }

  return analyses;
}

/**
 * Load the user's stored matches and return normalized engine inputs, ordered
 * most-recent-first. Used by the per-match AI Coach report (which needs the
 * previous match for improvement-history comparisons). No Riot calls.
 */
export async function buildMatchInputs(
  supabase: SupabaseLike,
  userId: string,
  limit = 20,
): Promise<MatchAnalysisInput[]> {
  const { data: account } = await supabase
    .from("riot_accounts")
    .select("puuid")
    .eq("profile_id", userId)
    .maybeSingle();
  const puuid = (account?.puuid as string | null) ?? null;

  const { data: rows } = await supabase
    .from("matches")
    .select(
      "match_id, champion_name, team_position, win, kills, deaths, assists, cs, gold, vision_score, game_duration, game_creation, raw",
    )
    .eq("profile_id", userId)
    .order("game_creation", { ascending: false })
    .limit(limit);

  if (!rows || rows.length === 0) return [];

  const inputs: MatchAnalysisInput[] = [];
  for (const row of rows) {
    const input = extractInput(row, puuid);
    if (input) inputs.push(input);
  }
  return inputs;
}
