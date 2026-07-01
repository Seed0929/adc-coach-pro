import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  RiotError,
  getAccountByRiotId,
  getMatchIdsByPuuid,
  getMatchById,
  queueLabel,
} from "./riot.server";

// ---------------------------------------------------------------------------
// Match history server functions.
//
// Imports a user's recent Match-V5 games and stores metadata in `matches`.
// Re-syncing is idempotent: rows are upserted on (profile_id, match_id) so
// nothing is duplicated. The full Riot payload is kept in `raw`, and a
// `timeline` column is reserved for future detailed timeline analysis.
// ---------------------------------------------------------------------------

export interface StoredMatch {
  id: string;
  matchId: string;
  championName: string;
  championId: number | null;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  visionScore: number | null;
  teamPosition: string | null;
  queueId: number | null;
  queueLabel: string | null;
  gameDuration: number;
  gameCreation: string | null;
}

export type MatchesResult =
  | { ok: true; matches: StoredMatch[]; imported?: number }
  | { ok: false; code: RiotError["code"]; message: string };

function toResultError(err: unknown): MatchesResult {
  if (err instanceof RiotError) return { ok: false, code: err.code, message: err.message };
  return { ok: false, code: "unknown", message: "Something went wrong. Please try again." };
}

type MatchRow = {
  id: string;
  match_id: string;
  champion_name: string;
  champion_id: number | null;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  vision_score: number | null;
  team_position: string | null;
  queue_id: number | null;
  queue_label: string | null;
  game_duration: number;
  game_creation: string | null;
};

function rowToMatch(r: MatchRow): StoredMatch {
  return {
    id: r.id,
    matchId: r.match_id,
    championName: r.champion_name,
    championId: r.champion_id,
    win: r.win,
    kills: r.kills,
    deaths: r.deaths,
    assists: r.assists,
    cs: r.cs,
    gold: r.gold,
    visionScore: r.vision_score,
    teamPosition: r.team_position,
    queueId: r.queue_id,
    queueLabel: r.queue_label,
    gameDuration: r.game_duration,
    gameCreation: r.game_creation,
  };
}

const SELECT_COLS =
  "id, match_id, champion_name, champion_id, win, kills, deaths, assists, cs, gold, vision_score, team_position, queue_id, queue_label, game_duration, game_creation";

async function getLinkedAccount(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<{ puuid: string; region: string } | null> {
  const { data: row } = await supabase
    .from("riot_accounts")
    .select("game_name, tag_line, region, puuid")
    .eq("profile_id", userId)
    .maybeSingle();
  if (!row) return null;
  let puuid = row.puuid as string | null;
  if (!puuid) {
    const account = await getAccountByRiotId(row.game_name, row.tag_line, row.region);
    puuid = account.puuid;
  }
  return { puuid: puuid!, region: row.region as string };
}

/** Return the user's stored matches (most recent first). No Riot calls. */
export const getStoredMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MatchesResult> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("matches")
      .select(SELECT_COLS)
      .eq("profile_id", userId)
      .order("game_creation", { ascending: false })
      .limit(20);
    if (error) return toResultError(error);
    return { ok: true, matches: (data ?? []).map(rowToMatch) };
  });

/** Import the user's 20 most recent matches from Riot; idempotent upsert. */
export const syncMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MatchesResult> => {
    const { supabase, userId } = context;
    try {
      const account = await getLinkedAccount(supabase, userId);
      if (!account) return { ok: false, code: "not_found", message: "No Riot account linked yet." };
      const { puuid, region } = account;

      const matchIds = await getMatchIdsByPuuid(puuid, region, 20);

      // Which of these are already stored? Skip re-fetching them.
      const { data: existingRows } = await supabase
        .from("matches")
        .select("match_id")
        .eq("profile_id", userId)
        .in("match_id", matchIds.length ? matchIds : ["__none__"]);
      const existing = new Set((existingRows ?? []).map((r: { match_id: string }) => r.match_id));
      const toFetch = matchIds.filter((id) => !existing.has(id));

      let imported = 0;
      // Fetch sequentially to stay well under Riot rate limits.
      for (const matchId of toFetch) {
        let match;
        try {
          match = await getMatchById(matchId, region);
        } catch (err) {
          if (err instanceof RiotError && err.code === "rate_limited") break;
          continue; // skip individual failures
        }
        const me = match.info.participants.find((p) => p.puuid === puuid);
        if (!me) continue;
        const cs = (me.totalMinionsKilled ?? 0) + (me.neutralMinionsKilled ?? 0);
        const { error: upErr } = await supabase.from("matches").upsert(
          {
            profile_id: userId,
            match_id: match.metadata.matchId,
            puuid,
            queue_id: match.info.queueId,
            queue_label: queueLabel(match.info.queueId),
            champion_name: me.championName,
            champion_id: me.championId,
            win: me.win,
            kills: me.kills,
            deaths: me.deaths,
            assists: me.assists,
            cs,
            gold: me.goldEarned,
            vision_score: me.visionScore ?? null,
            team_position: me.teamPosition || null,
            game_duration: match.info.gameDuration,
            game_creation: new Date(match.info.gameCreation).toISOString(),
            raw: match as unknown as import("@/integrations/supabase/types").Json,
          },
          { onConflict: "profile_id,match_id" },
        );
        if (!upErr) imported += 1;
      }

      // Update last_sync timestamp on the linked account (best-effort).
      await supabase
        .from("riot_accounts")
        .update({ last_sync: new Date().toISOString() })
        .eq("profile_id", userId);

      const { data, error } = await supabase
        .from("matches")
        .select(SELECT_COLS)
        .eq("profile_id", userId)
        .order("game_creation", { ascending: false })
        .limit(20);
      if (error) return toResultError(error);
      return { ok: true, matches: (data ?? []).map(rowToMatch), imported };
    } catch (err) {
      return toResultError(err);
    }
  });
