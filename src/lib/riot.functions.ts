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