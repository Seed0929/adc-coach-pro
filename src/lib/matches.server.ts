// ---------------------------------------------------------------------------
// Match sync + read helpers (server-only).
//
// Shared by matches.functions.ts and dashboard.functions.ts so match import
// logic lives in exactly one place. Never imported by client code.
// ---------------------------------------------------------------------------
import {
  RiotError,
  getAccountByRiotId,
  getMatchIdsByPuuid,
  getMatchById,
  queueLabel,
} from "./riot.server";
import { analyzeAndStoreMatches } from "./coaching.server";
import type { Json } from "@/integrations/supabase/types";

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
  damageToChampions: number | null;
  teamDamageToChampions: number | null;
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
  puuid: string | null;
  raw: unknown;
};

export const SELECT_COLS =
  "id, match_id, champion_name, champion_id, win, kills, deaths, assists, cs, gold, vision_score, team_position, queue_id, queue_label, game_duration, game_creation, puuid, raw";

function extractDamage(raw: unknown, championName: string, puuidOrName: string) {
  try {
    const info = (raw as { info?: { participants?: any[] } })?.info;
    const parts = info?.participants ?? [];
    const me =
      parts.find((p) => p.puuid === puuidOrName) ??
      parts.find((p) => p.championName === championName);
    if (!me) return { self: null, team: null };
    const self = me.totalDamageDealtToChampions ?? null;
    const team = parts
      .filter((p) => p.teamId === me.teamId)
      .reduce((s, p) => s + (p.totalDamageDealtToChampions ?? 0), 0);
    return { self, team: team || null };
  } catch {
    return { self: null, team: null };
  }
}

export function rowToMatch(r: MatchRow): StoredMatch {
  const dmg = extractDamage(r.raw, r.champion_name, r.puuid ?? "");
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
    damageToChampions: dmg.self,
    teamDamageToChampions: dmg.team,
  };
}

type SupabaseLike = { from: (t: string) => any };

export async function getLinkedAccount(
  supabase: SupabaseLike,
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

export async function readStoredMatches(
  supabase: SupabaseLike,
  userId: string,
  limit = 20,
): Promise<StoredMatch[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(SELECT_COLS)
    .eq("profile_id", userId)
    .order("game_creation", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(rowToMatch);
}

/**
 * Import the user's most recent ranked-first matches from Riot. Idempotent:
 * rows are upserted on (profile_id, match_id). Returns how many new rows landed.
 */
export async function syncMatchesForUser(
  supabase: SupabaseLike,
  userId: string,
  count = 20,
): Promise<number> {
  const account = await getLinkedAccount(supabase, userId);
  if (!account) throw new RiotError("not_found", "No Riot account linked yet.");
  const { puuid, region } = account;

  const matchIds = await getMatchIdsByPuuid(puuid, region, count);

  const { data: existingRows } = await supabase
    .from("matches")
    .select("match_id")
    .eq("profile_id", userId)
    .in("match_id", matchIds.length ? matchIds : ["__none__"]);
  const existing = new Set((existingRows ?? []).map((r: { match_id: string }) => r.match_id));
  const toFetch = matchIds.filter((id) => !existing.has(id));

  let imported = 0;
  for (const matchId of toFetch) {
    let match;
    try {
      match = await getMatchById(matchId, region);
    } catch (err) {
      if (err instanceof RiotError && err.code === "rate_limited") break;
      continue;
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
        raw: match as unknown as Json,
      },
      { onConflict: "profile_id,match_id" },
    );
    if (!upErr) imported += 1;
  }

  await supabase
    .from("riot_accounts")
    .update({ last_sync: new Date().toISOString() })
    .eq("profile_id", userId);

  return imported;
}

/** Persist a single Match-V5 payload for a user. Idempotent upsert. */
async function upsertMatch(
  supabase: SupabaseLike,
  userId: string,
  puuid: string,
  match: Awaited<ReturnType<typeof getMatchById>>,
): Promise<boolean> {
  const me = match.info.participants.find((p) => p.puuid === puuid);
  if (!me) return false;
  const cs = (me.totalMinionsKilled ?? 0) + (me.neutralMinionsKilled ?? 0);
  const { error } = await supabase.from("matches").upsert(
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
      raw: match as unknown as Json,
    },
    { onConflict: "profile_id,match_id" },
  );
  return !error;
}

export interface AutoSyncResult {
  changed: boolean;
  imported: number;
  lastSyncedAt: string;
}

/**
 * Lightweight automatic sync. Fetches the few most-recent COMPLETED match IDs
 * from Riot (match-v5 only ever lists finished games, so in-progress matches
 * are ignored), imports any that aren't stored yet — deduped on match_id —
 * analyzes the new games, and records the sync timestamp on the profile.
 *
 * Returns `changed: false` fast when Riot's newest match is already stored so
 * the client can keep using cached data.
 */
export async function autoSyncForUser(
  supabase: SupabaseLike,
  userId: string,
  lookback = 5,
): Promise<AutoSyncResult> {
  const account = await getLinkedAccount(supabase, userId);
  if (!account) throw new RiotError("not_found", "No Riot account linked yet.");
  const { puuid, region } = account;

  const now = new Date().toISOString();
  const recentIds = await getMatchIdsByPuuid(puuid, region, lookback);

  let imported = 0;
  if (recentIds.length > 0) {
    const { data: existingRows } = await supabase
      .from("matches")
      .select("match_id")
      .eq("profile_id", userId)
      .in("match_id", recentIds);
    const existing = new Set(
      (existingRows ?? []).map((r: { match_id: string }) => r.match_id),
    );
    // Newest first — only import genuinely new games.
    const toFetch = recentIds.filter((id) => !existing.has(id));

    for (const matchId of toFetch) {
      let match;
      try {
        match = await getMatchById(matchId, region);
      } catch (err) {
        // Rate limits are retried inside riotFetch; if it still fails, stop and
        // keep whatever we managed to import — never interrupt the session.
        if (err instanceof RiotError && err.code === "rate_limited") break;
        continue;
      }
      if (await upsertMatch(supabase, userId, puuid, match)) imported += 1;
    }
  }

  if (imported > 0) {
    // Generate full coaching analysis for the freshly imported matches.
    try {
      await analyzeAndStoreMatches(supabase, userId);
    } catch {
      // Analysis is best-effort here; the coaching hook recomputes on demand.
    }
  }

  await supabase
    .from("riot_accounts")
    .update({ last_sync: now })
    .eq("profile_id", userId);
  await supabase.from("profiles").update({ last_synced_at: now }).eq("id", userId);

  return { changed: imported > 0, imported, lastSyncedAt: now };
}
