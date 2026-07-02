import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  RiotError,
  RIOT_REGIONS,
  getRankByPuuid,
  getSummonerByPuuid,
  getLatestDDragonVersion,
  profileIconUrl,
  championSquareUrl,
  pickPrimaryRank,
} from "./riot.server";
import { analyzeAndStoreMatches, buildMatchInputs } from "./coaching.server";
import {
  buildPlayerProfile,
  toProfileMatch,
  type PlayerProfile,
  type ProfileMatch,
} from "./profile-engine";

// ---------------------------------------------------------------------------
// Player Profile & Progress server function.
//
// Reuses cached per-match analyses (coaching_analyses) and normalized match
// inputs, plus live ranked/summoner data, to assemble the full long-term
// improvement profile. No metric is recomputed that the coaching cache already
// stores — this reads straight through it.
// ---------------------------------------------------------------------------

export type PlayerProfileResult =
  | { ok: true; profile: PlayerProfile }
  | { ok: false; code: string; message: string };

const LIMIT = 50;

export const getPlayerProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlayerProfileResult> => {
    const { supabase, userId } = context;
    try {
      const { data: row } = await supabase
        .from("riot_accounts")
        .select("game_name, tag_line, region, puuid, summoner_level, profile_icon_id")
        .eq("profile_id", userId)
        .maybeSingle();
      if (!row) return { ok: false, code: "not_found", message: "No Riot account linked yet." };

      const [inputs, analyses] = await Promise.all([
        buildMatchInputs(supabase, userId, LIMIT),
        analyzeAndStoreMatches(supabase, userId, LIMIT),
      ]);

      const analysisById = new Map(analyses.map((a) => [a.matchId, a]));
      const matches: ProfileMatch[] = [];
      for (const input of inputs) {
        const analysis = analysisById.get(input.matchId);
        if (analysis) matches.push(toProfileMatch(input, analysis));
      }

      const version = await getLatestDDragonVersion();
      const [rankEntries, summoner] = await Promise.all([
        row.puuid ? getRankByPuuid(row.puuid, row.region).catch(() => []) : Promise.resolve([]),
        row.puuid ? getSummonerByPuuid(row.puuid, row.region).catch(() => null) : Promise.resolve(null),
      ]);

      const primary = pickPrimaryRank(rankEntries);
      const rankLabel = primary
        ? `${primary.tier ? primary.tier[0] + primary.tier.slice(1).toLowerCase() : primary.tier} ${primary.rank}`
        : "Unranked";
      const iconId = summoner?.profileIconId ?? row.profile_icon_id ?? null;
      const level = summoner?.summonerLevel ?? row.summoner_level ?? null;

      const profile = buildPlayerProfile({
        overview: {
          gameName: row.game_name,
          tagLine: row.tag_line,
          riotId: `${row.game_name}#${row.tag_line}`,
          region: row.region,
          regionLabel: RIOT_REGIONS[row.region]?.label ?? row.region,
          profileIconUrl: iconId != null ? profileIconUrl(version, iconId) : null,
          summonerLevel: level,
          rankLabel,
          lp: primary?.leaguePoints ?? null,
          accountLevel: level,
        },
        matches,
        imgFor: (name) => championSquareUrl(version, name),
        ranked: Boolean(primary),
        isDemo: false,
      });

      return { ok: true, profile };
    } catch (err) {
      if (err instanceof RiotError) return { ok: false, code: err.code, message: err.message };
      return { ok: false, code: "unknown", message: "Couldn't build your profile right now." };
    }
  });