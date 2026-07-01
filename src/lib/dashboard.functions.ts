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
import {
  getLinkedAccount,
  readStoredMatches,
  syncMatchesForUser,
  type StoredMatch,
} from "./matches.server";

// ---------------------------------------------------------------------------
// Aggregated dashboard data. One server function returns everything the
// dashboard needs as a single normalized JSON object, computed from the user's
// stored Match-V5 history + live ranked info.
// ---------------------------------------------------------------------------

export interface DashboardRank {
  tier: string; // e.g. "Diamond"
  division: string; // e.g. "I"
  label: string; // e.g. "Diamond I"
  lp: number;
  wins: number;
  losses: number;
  winrate: number; // 0-100
}

export interface DashboardChampion {
  name: string;
  img: string;
  games: number;
  wins: number;
  wr: string; // e.g. "62%"
  winrate: number;
  kda: string; // e.g. "3.8 : 1"
}

export interface DashboardMatch {
  matchId: string;
  championName: string;
  championImg: string;
  win: boolean;
  kda: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  csPerMin: string;
  visionScore: number;
  damageShare: string;
  role: string;
  queueLabel: string;
  gameDuration: string;
  gameCreation: string | null;
}

export interface DashboardData {
  gameName: string;
  tagLine: string;
  region: string;
  regionLabel: string;
  summonerLevel: number | null;
  profileIconUrl: string | null;
  rank: DashboardRank | null;
  overallWinrate: number; // over the loaded matches, 0-100
  primaryRole: string;
  championPool: number;
  averages: {
    kda: string; // "3.8 : 1"
    kills: string;
    deaths: string;
    assists: string;
    csPerMin: string; // "8.4"
    cs: string;
    visionScore: string;
    damageShare: string; // "31%"
  };
  champions: DashboardChampion[];
  matches: DashboardMatch[];
  matchCount: number;
}

export type DashboardResult =
  | { ok: true; data: DashboardData }
  | { ok: false; code: RiotError["code"]; message: string };

function fail(err: unknown): DashboardResult {
  if (err instanceof RiotError) return { ok: false, code: err.code, message: err.message };
  return { ok: false, code: "unknown", message: "Couldn't load your Riot data right now." };
}

const ROLE_LABELS: Record<string, string> = {
  BOTTOM: "Bot / ADC",
  UTILITY: "Support",
  MIDDLE: "Mid",
  TOP: "Top",
  JUNGLE: "Jungle",
};

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d}d ago`;
}

function buildDashboard(
  account: { gameName: string; tagLine: string; region: string },
  matches: StoredMatch[],
  rankEntries: Awaited<ReturnType<typeof getRankByPuuid>>,
  summonerLevel: number | null,
  profileIconId: number | null,
  version: string,
): DashboardData {
  const primary = pickPrimaryRank(rankEntries);
  const rank: DashboardRank | null = primary
    ? {
        tier: primary.tier ? primary.tier[0] + primary.tier.slice(1).toLowerCase() : primary.tier,
        division: primary.rank,
        label: `${primary.tier ? primary.tier[0] + primary.tier.slice(1).toLowerCase() : primary.tier} ${primary.rank}`,
        lp: primary.leaguePoints,
        wins: primary.wins,
        losses: primary.losses,
        winrate:
          primary.wins + primary.losses > 0
            ? Math.round((primary.wins / (primary.wins + primary.losses)) * 100)
            : 0,
      }
    : null;

  const n = matches.length;
  const sum = matches.reduce(
    (acc, m) => {
      acc.kills += m.kills;
      acc.deaths += m.deaths;
      acc.assists += m.assists;
      acc.cs += m.cs;
      acc.vision += m.visionScore ?? 0;
      acc.wins += m.win ? 1 : 0;
      acc.durationMin += (m.gameDuration || 0) / 60;
      if (m.damageToChampions != null && m.teamDamageToChampions) {
        acc.damageShareSum += m.damageToChampions / m.teamDamageToChampions;
        acc.damageShareCount += 1;
      }
      return acc;
    },
    { kills: 0, deaths: 0, assists: 0, cs: 0, vision: 0, wins: 0, durationMin: 0, damageShareSum: 0, damageShareCount: 0 },
  );

  const avgKills = n ? sum.kills / n : 0;
  const avgDeaths = n ? sum.deaths / n : 0;
  const avgAssists = n ? sum.assists / n : 0;
  const kdaRatio = avgDeaths > 0 ? (avgKills + avgAssists) / avgDeaths : avgKills + avgAssists;
  const csPerMin = sum.durationMin > 0 ? sum.cs / sum.durationMin : 0;
  const damageShare = sum.damageShareCount > 0 ? sum.damageShareSum / sum.damageShareCount : 0;

  // Role frequency.
  const roleCounts: Record<string, number> = {};
  for (const m of matches) {
    const r = m.teamPosition || "";
    if (r) roleCounts[r] = (roleCounts[r] ?? 0) + 1;
  }
  const topRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const primaryRole = topRole ? ROLE_LABELS[topRole] ?? topRole : "Bot / ADC";

  // Champion pool aggregation.
  const champMap = new Map<string, { name: string; games: number; wins: number; k: number; d: number; a: number }>();
  for (const m of matches) {
    const c = champMap.get(m.championName) ?? { name: m.championName, games: 0, wins: 0, k: 0, d: 0, a: 0 };
    c.games += 1;
    c.wins += m.win ? 1 : 0;
    c.k += m.kills;
    c.d += m.deaths;
    c.a += m.assists;
    champMap.set(m.championName, c);
  }
  const champions: DashboardChampion[] = [...champMap.values()]
    .sort((a, b) => b.games - a.games)
    .map((c) => {
      const winrate = c.games ? Math.round((c.wins / c.games) * 100) : 0;
      const kda = c.d > 0 ? ((c.k + c.a) / c.d).toFixed(1) : (c.k + c.a).toFixed(1);
      return {
        name: c.name,
        img: championSquareUrl(version, c.name),
        games: c.games,
        wins: c.wins,
        wr: `${winrate}%`,
        winrate,
        kda: `${kda} : 1`,
      };
    });

  const dashMatches: DashboardMatch[] = matches.map((m) => {
    const mins = Math.max(1, (m.gameDuration || 0) / 60);
    const share =
      m.damageToChampions != null && m.teamDamageToChampions
        ? `${Math.round((m.damageToChampions / m.teamDamageToChampions) * 100)}%`
        : "—";
    return {
      matchId: m.matchId,
      championName: m.championName,
      championImg: championSquareUrl(version, m.championName),
      win: m.win,
      kda: `${m.kills} / ${m.deaths} / ${m.assists}`,
      kills: m.kills,
      deaths: m.deaths,
      assists: m.assists,
      cs: m.cs,
      csPerMin: (m.cs / mins).toFixed(1),
      visionScore: m.visionScore ?? 0,
      damageShare: share,
      role: m.teamPosition ? ROLE_LABELS[m.teamPosition] ?? m.teamPosition : "—",
      queueLabel: m.queueLabel ?? "",
      gameDuration: fmtDuration(m.gameDuration || 0),
      gameCreation: m.gameCreation,
    };
  });

  return {
    gameName: account.gameName,
    tagLine: account.tagLine,
    region: account.region,
    regionLabel: RIOT_REGIONS[account.region]?.label ?? account.region,
    summonerLevel,
    profileIconUrl: profileIconId != null ? profileIconUrl(version, profileIconId) : null,
    rank,
    overallWinrate: n ? Math.round((sum.wins / n) * 100) : 0,
    primaryRole,
    championPool: champMap.size,
    averages: {
      kda: `${kdaRatio.toFixed(1)} : 1`,
      kills: avgKills.toFixed(1),
      deaths: avgDeaths.toFixed(1),
      assists: avgAssists.toFixed(1),
      csPerMin: csPerMin.toFixed(1),
      cs: n ? Math.round(sum.cs / n).toString() : "0",
      visionScore: n ? Math.round(sum.vision / n).toString() : "0",
      damageShare: `${Math.round(damageShare * 100)}%`,
    },
    champions,
    matches: dashMatches.map((m) => ({ ...m, gameCreation: m.gameCreation })),
    matchCount: n,
  };
}

/** Load the signed-in user's full live dashboard. Syncs matches if none stored. */
export const getRiotDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardResult> => {
    const { supabase, userId } = context;
    try {
      const { data: row } = await supabase
        .from("riot_accounts")
        .select("game_name, tag_line, region, puuid")
        .eq("profile_id", userId)
        .maybeSingle();
      if (!row) return { ok: false, code: "not_found", message: "No Riot account linked yet." };

      const account = await getLinkedAccount(supabase, userId);
      if (!account) return { ok: false, code: "not_found", message: "No Riot account linked yet." };

      // Ensure we have matches to aggregate.
      let matches = await readStoredMatches(supabase, userId, 20);
      if (matches.length === 0) {
        try {
          await syncMatchesForUser(supabase, userId, 20);
          matches = await readStoredMatches(supabase, userId, 20);
        } catch {
          // best-effort: still show rank even if match sync failed
        }
      }

      const [rankEntries, summoner, version] = await Promise.all([
        getRankByPuuid(account.puuid, account.region).catch(() => []),
        getSummonerByPuuid(account.puuid, account.region).catch(() => null),
        getLatestDDragonVersion(),
      ]);

      const dashboard = buildDashboard(
        { gameName: row.game_name, tagLine: row.tag_line, region: row.region },
        matches,
        rankEntries,
        summoner?.summonerLevel ?? null,
        summoner?.profileIconId ?? null,
        version,
      );

      return { ok: true, data: dashboard };
    } catch (err) {
      return fail(err);
    }
  });
