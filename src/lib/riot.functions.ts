import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  RiotError,
  RIOT_REGIONS,
  getAccountByRiotId,
  getSummonerByPuuid,
  getRankByPuuid,
  getLatestDDragonVersion,
  profileIconUrl,
  pickPrimaryRank,
} from "./riot.server";

// ---------------------------------------------------------------------------
// Riot account server functions.
//
// These run server-side only. The Riot API key is read inside `riot.server.ts`
// and never reaches the browser. Every function returns a discriminated result
// so the UI can show a friendly message instead of crashing.
// ---------------------------------------------------------------------------

export interface RiotRankSummary {
  queueType: string;
  tier: string;
  division: string;
  lp: number;
  wins: number;
  losses: number;
}

export interface RiotAccountSummary {
  gameName: string;
  tagLine: string;
  region: string;
  regionLabel: string;
  summonerLevel: number | null;
  profileIconId: number | null;
  profileIconUrl: string | null;
  rank: RiotRankSummary | null;
}

export type RiotResult =
  | { ok: true; account: RiotAccountSummary }
  | { ok: false; code: RiotError["code"]; message: string };

function toResultError(err: unknown): RiotResult {
  if (err instanceof RiotError) return { ok: false, code: err.code, message: err.message };
  return {
    ok: false,
    code: "unknown",
    message: "Something went wrong. Please try again.",
  };
}

async function buildSummary(
  gameName: string,
  tagLine: string,
  region: string,
  puuid: string,
): Promise<{ summary: RiotAccountSummary; profileIconId: number | null; summonerLevel: number | null }> {
  const [summoner, rankEntries, version] = await Promise.all([
    getSummonerByPuuid(puuid, region).catch(() => null),
    getRankByPuuid(puuid, region).catch(() => []),
    getLatestDDragonVersion(),
  ]);

  const primary = pickPrimaryRank(rankEntries);
  const profileIconId = summoner?.profileIconId ?? null;
  const summonerLevel = summoner?.summonerLevel ?? null;

  const summary: RiotAccountSummary = {
    gameName,
    tagLine,
    region,
    regionLabel: RIOT_REGIONS[region]?.label ?? region,
    summonerLevel,
    profileIconId,
    profileIconUrl: profileIconId != null ? profileIconUrl(version, profileIconId) : null,
    rank: primary
      ? {
          queueType: primary.queueType,
          tier: primary.tier,
          division: primary.rank,
          lp: primary.leaguePoints,
          wins: primary.wins,
          losses: primary.losses,
        }
      : null,
  };
  return { summary, profileIconId, summonerLevel };
}

/** Validate a Riot account, then persist it to the signed-in user's profile. */
export const linkRiotAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { gameName: string; tagLine: string; region: string }) => {
    const gameName = (input?.gameName ?? "").trim();
    const tagLine = (input?.tagLine ?? "").trim().replace(/^#/, "");
    const region = (input?.region ?? "").trim().toUpperCase();
    return { gameName, tagLine, region };
  })
  .handler(async ({ data, context }): Promise<RiotResult> => {
    const { gameName, tagLine, region } = data;
    if (!gameName) return { ok: false, code: "not_found", message: "Enter your Riot Game Name." };
    if (!tagLine) return { ok: false, code: "not_found", message: "Enter your Tag Line." };
    if (!RIOT_REGIONS[region])
      return { ok: false, code: "invalid_region", message: "Choose a supported region." };

    try {
      // 1. Validate the account exists via the Account API.
      const account = await getAccountByRiotId(gameName, tagLine, region);

      // 2. Enrich with summoner + ranked data.
      const { summary, profileIconId, summonerLevel } = await buildSummary(
        account.gameName,
        account.tagLine,
        region,
        account.puuid,
      );

      // 3. Persist to the user's linked Riot account (RLS scopes to auth.uid()).
      const { supabase, userId } = context;
      const now = new Date().toISOString();
      const { error: upsertError } = await supabase.from("riot_accounts").upsert(
        {
          profile_id: userId,
          game_name: account.gameName,
          tag_line: account.tagLine,
          region,
          puuid: account.puuid,
          profile_icon_id: profileIconId,
          summoner_level: summonerLevel,
          linked_at: now,
          last_sync: now,
        },
        { onConflict: "profile_id" },
      );
      if (upsertError) throw upsertError;

      // 4. Mark onboarding complete and the profile as Riot-connected.
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ onboarding_complete: true, onboarding_completed: true, riot_connected: true })
        .eq("id", userId);
      if (profileError) throw profileError;

      return { ok: true, account: summary };
    } catch (err) {
      return toResultError(err);
    }
  });

/** Fetch the latest live Riot summary for the signed-in user's linked account. */
export const getRiotSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RiotResult> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("riot_accounts")
      .select("game_name, tag_line, region, puuid")
      .eq("profile_id", userId)
      .maybeSingle();

    if (error) return toResultError(error);
    if (!row) return { ok: false, code: "not_found", message: "No Riot account linked yet." };

    try {
      // Re-resolve the PUUID if it was never stored (legacy rows).
      let puuid = row.puuid;
      if (!puuid) {
        const account = await getAccountByRiotId(row.game_name, row.tag_line, row.region);
        puuid = account.puuid;
      }

      const { summary, profileIconId, summonerLevel } = await buildSummary(
        row.game_name,
        row.tag_line,
        row.region,
        puuid,
      );

      // Keep stored snapshot fresh (best-effort).
      await supabase
        .from("riot_accounts")
        .update({
          puuid,
          profile_icon_id: profileIconId,
          summoner_level: summonerLevel,
          last_sync: new Date().toISOString(),
        })
        .eq("profile_id", userId);

      return { ok: true, account: summary };
    } catch (err) {
      return toResultError(err);
    }
  });
// ---------------------------------------------------------------------------
// Discrete, normalized Riot endpoints.
//
// Each returns a discriminated { ok } result with a normalized JSON payload so
// the frontend never touches Riot directly and always gets a friendly error.
// ---------------------------------------------------------------------------
import {
  getMatchIdsByPuuid,
  getMatchById,
  queueLabel,
  championSquareUrl,
  type RiotMatchParticipant,
} from "./riot.server";

type Ok<T> = { ok: true; data: T };
type Fail = { ok: false; code: RiotError["code"]; message: string };
type ApiResult<T> = Ok<T> | Fail;

function fail(err: unknown): Fail {
  if (err instanceof RiotError) return { ok: false, code: err.code, message: err.message };
  return { ok: false, code: "unknown", message: "Something went wrong. Please try again." };
}

function normalizeInput(input: { gameName?: string; tagLine?: string; region?: string }) {
  return {
    gameName: (input?.gameName ?? "").trim(),
    tagLine: (input?.tagLine ?? "").trim().replace(/^#/, ""),
    region: (input?.region ?? "").trim().toUpperCase(),
  };
}

/** 1. Validate a Riot ID exists (gameName + tagLine). */
export const validateRiotId = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(normalizeInput)
  .handler(async ({ data }): Promise<ApiResult<{ valid: boolean; puuid: string; gameName: string; tagLine: string }>> => {
    const { gameName, tagLine, region } = data;
    if (!gameName || !tagLine) return { ok: false, code: "not_found", message: "Enter both your Riot Game Name and Tag Line." };
    if (!RIOT_REGIONS[region]) return { ok: false, code: "invalid_region", message: "Choose a supported region." };
    try {
      const acc = await getAccountByRiotId(gameName, tagLine, region);
      return { ok: true, data: { valid: true, puuid: acc.puuid, gameName: acc.gameName, tagLine: acc.tagLine } };
    } catch (err) {
      return fail(err);
    }
  });

/** 2. Fetch PUUID from a Riot ID. */
export const fetchPuuid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(normalizeInput)
  .handler(async ({ data }): Promise<ApiResult<{ puuid: string }>> => {
    const { gameName, tagLine, region } = data;
    if (!RIOT_REGIONS[region]) return { ok: false, code: "invalid_region", message: "Choose a supported region." };
    try {
      const acc = await getAccountByRiotId(gameName, tagLine, region);
      return { ok: true, data: { puuid: acc.puuid } };
    } catch (err) {
      return fail(err);
    }
  });

/** 3. Fetch Summoner (level + icon) by PUUID. */
export const fetchSummoner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { puuid?: string; region?: string }) => ({
    puuid: (input?.puuid ?? "").trim(),
    region: (input?.region ?? "").trim().toUpperCase(),
  }))
  .handler(async ({ data }): Promise<ApiResult<{ summonerLevel: number; profileIconId: number; profileIconUrl: string }>> => {
    if (!RIOT_REGIONS[data.region]) return { ok: false, code: "invalid_region", message: "Choose a supported region." };
    try {
      const [s, version] = await Promise.all([
        getSummonerByPuuid(data.puuid, data.region),
        getLatestDDragonVersion(),
      ]);
      return {
        ok: true,
        data: {
          summonerLevel: s.summonerLevel,
          profileIconId: s.profileIconId,
          profileIconUrl: profileIconUrl(version, s.profileIconId),
        },
      };
    } catch (err) {
      return fail(err);
    }
  });

/** 4. Fetch ranked information by PUUID. */
export const fetchRanked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { puuid?: string; region?: string }) => ({
    puuid: (input?.puuid ?? "").trim(),
    region: (input?.region ?? "").trim().toUpperCase(),
  }))
  .handler(async ({ data }): Promise<ApiResult<{ solo: RiotRankSummary | null; flex: RiotRankSummary | null }>> => {
    if (!RIOT_REGIONS[data.region]) return { ok: false, code: "invalid_region", message: "Choose a supported region." };
    try {
      const entries = await getRankByPuuid(data.puuid, data.region);
      const map = (q: string) => {
        const e = entries.find((x) => x.queueType === q);
        return e
          ? { queueType: e.queueType, tier: e.tier, division: e.rank, lp: e.leaguePoints, wins: e.wins, losses: e.losses }
          : null;
      };
      return { ok: true, data: { solo: map("RANKED_SOLO_5x5"), flex: map("RANKED_FLEX_SR") } };
    } catch (err) {
      return fail(err);
    }
  });

export interface NormalizedMatch {
  matchId: string;
  championName: string;
  championImg: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kda: string;
  cs: number;
  csPerMin: string;
  gold: number;
  visionScore: number;
  damageToChampions: number;
  damageShare: string;
  role: string;
  queueId: number;
  queueLabel: string;
  gameDurationSec: number;
  gameDuration: string;
  gameCreation: string;
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function normalizeMatch(matchId: string, me: RiotMatchParticipant, info: { gameDuration: number; gameCreation: number; queueId: number; participants: RiotMatchParticipant[] }, version: string): NormalizedMatch {
  const cs = (me.totalMinionsKilled ?? 0) + (me.neutralMinionsKilled ?? 0);
  const mins = Math.max(1, info.gameDuration / 60);
  const teamDamage = info.participants
    .filter((p) => (p as any).teamId === (me as any).teamId)
    .reduce((s, p) => s + ((p as any).totalDamageDealtToChampions ?? 0), 0);
  const dmg = (me as any).totalDamageDealtToChampions ?? 0;
  return {
    matchId,
    championName: me.championName,
    championImg: championSquareUrl(version, me.championName),
    win: me.win,
    kills: me.kills,
    deaths: me.deaths,
    assists: me.assists,
    kda: `${me.kills} / ${me.deaths} / ${me.assists}`,
    cs,
    csPerMin: (cs / mins).toFixed(1),
    gold: me.goldEarned,
    visionScore: me.visionScore ?? 0,
    damageToChampions: dmg,
    damageShare: teamDamage > 0 ? `${Math.round((dmg / teamDamage) * 100)}%` : "0%",
    role: me.teamPosition || "UNKNOWN",
    queueId: info.queueId,
    queueLabel: queueLabel(info.queueId),
    gameDurationSec: info.gameDuration,
    gameDuration: fmtDuration(info.gameDuration),
    gameCreation: new Date(info.gameCreation).toISOString(),
  };
}

/** 5. Fetch match history (last 20 ranked games) as normalized objects. */
export const fetchMatchHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { puuid?: string; region?: string; count?: number }) => ({
    puuid: (input?.puuid ?? "").trim(),
    region: (input?.region ?? "").trim().toUpperCase(),
    count: Math.min(Math.max(Number(input?.count) || 20, 1), 20),
  }))
  .handler(async ({ data }): Promise<ApiResult<{ matches: NormalizedMatch[] }>> => {
    if (!RIOT_REGIONS[data.region]) return { ok: false, code: "invalid_region", message: "Choose a supported region." };
    try {
      const ids = await getMatchIdsByPuuid(data.puuid, data.region, data.count);
      const version = await getLatestDDragonVersion();
      const matches: NormalizedMatch[] = [];
      for (const id of ids) {
        try {
          const m = await getMatchById(id, data.region);
          const me = m.info.participants.find((p) => p.puuid === data.puuid);
          if (me) matches.push(normalizeMatch(m.metadata.matchId, me, m.info, version));
        } catch (err) {
          if (err instanceof RiotError && err.code === "rate_limited") break;
        }
      }
      return { ok: true, data: { matches } };
    } catch (err) {
      return fail(err);
    }
  });

/** 6. Fetch a single match's details as a normalized object. */
export const fetchMatchDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { matchId?: string; puuid?: string; region?: string }) => ({
    matchId: (input?.matchId ?? "").trim(),
    puuid: (input?.puuid ?? "").trim(),
    region: (input?.region ?? "").trim().toUpperCase(),
  }))
  .handler(async ({ data }): Promise<ApiResult<{ match: NormalizedMatch }>> => {
    if (!RIOT_REGIONS[data.region]) return { ok: false, code: "invalid_region", message: "Choose a supported region." };
    if (!data.matchId) return { ok: false, code: "not_found", message: "Missing match id." };
    try {
      const version = await getLatestDDragonVersion();
      const m = await getMatchById(data.matchId, data.region);
      const me = m.info.participants.find((p) => p.puuid === data.puuid);
      if (!me) return { ok: false, code: "not_found", message: "You weren't found in that match." };
      return { ok: true, data: { match: normalizeMatch(m.metadata.matchId, me, m.info, version) } };
    } catch (err) {
      return fail(err);
    }
  });
