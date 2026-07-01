import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  analyzeMatch,
  summarizeCoaching,
  COACHING_ENGINE_VERSION,
  buildDemoCoaching,
  type MatchAnalysisInput,
  type MatchCoachingAnalysis,
  type CoachingSummary,
} from "./coaching-engine";

// ---------------------------------------------------------------------------
// Coaching analysis server function.
//
// Loads the user's stored Riot matches, extracts a normalized stat input from
// each, runs the deterministic coaching engine, and PERSISTS the result in
// `coaching_analyses` so it is not recomputed on every page load. On the next
// call, already-analyzed matches (same engine version) are read straight from
// the database.
// ---------------------------------------------------------------------------

export type CoachingResult =
  | { ok: true; summary: CoachingSummary }
  | { ok: false; code: string; message: string };

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
function extractInput(row: any, puuid: string | null): MatchAnalysisInput | null {
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
  };
}

/** Load (or compute + store) the signed-in user's coaching analysis. */
export const getCoachingAnalysis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CoachingResult> => {
    const { supabase, userId } = context;
    try {
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
        .limit(20);

      if (!rows || rows.length === 0) {
        return { ok: false, code: "no_matches", message: "No matches to analyze yet." };
      }

      // Read previously stored analyses for these matches (current engine only).
      const matchIds = rows.map((r) => r.match_id);
      const { data: stored } = await supabase
        .from("coaching_analyses")
        .select("match_id, engine_version, analysis")
        .eq("profile_id", userId)
        .in("match_id", matchIds);
      const cache = new Map<string, MatchCoachingAnalysis>();
      for (const s of stored ?? []) {
        if (s.engine_version === COACHING_ENGINE_VERSION) {
          cache.set(s.match_id, s.analysis as MatchCoachingAnalysis);
        }
      }

      const analyses: MatchCoachingAnalysis[] = [];
      const toStore: { profile_id: string; match_id: string; engine_version: number; overall_score: number; analysis: MatchCoachingAnalysis }[] = [];

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
        await supabase.from("coaching_analyses").upsert(toStore as any, {
          onConflict: "profile_id,match_id",
        });
      }

      if (analyses.length === 0) {
        return { ok: false, code: "no_matches", message: "No analyzable matches yet." };
      }

      return { ok: true, summary: summarizeCoaching(analyses, false) };
    } catch (err) {
      return {
        ok: false,
        code: "unknown",
        message: "Couldn't build your coaching analysis right now.",
      };
    }
  });

/** Demo coaching used for guests / unlinked accounts. Same shape as live. */
export function demoCoachingSummary(): CoachingSummary {
  return buildDemoCoaching();
}