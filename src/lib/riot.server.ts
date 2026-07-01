// ---------------------------------------------------------------------------
// Riot Games API service (server-only)
//
// All Riot API access lives here. The API key is read from the RIOT_API_KEY
// environment variable and never leaves the server. Add new Riot endpoints by
// adding a small typed function that reuses `riotFetch`.
// ---------------------------------------------------------------------------

/** Regional routing (account-v1) and platform routing (summoner/league-v4). */
interface RegionRouting {
  /** account-v1 regional cluster. */
  regional: "americas" | "asia" | "europe";
  /** platform host prefix for summoner/league-v4. */
  platform: string;
  label: string;
}

export const RIOT_REGIONS: Record<string, RegionRouting> = {
  NA: { regional: "americas", platform: "na1", label: "North America" },
  BR: { regional: "americas", platform: "br1", label: "Brazil" },
  LAN: { regional: "americas", platform: "la1", label: "Latin America North" },
  LAS: { regional: "americas", platform: "la2", label: "Latin America South" },
  OCE: { regional: "americas", platform: "oc1", label: "Oceania" },
  EUW: { regional: "europe", platform: "euw1", label: "Europe West" },
  EUNE: { regional: "europe", platform: "eun1", label: "Europe Nordic & East" },
  TR: { regional: "europe", platform: "tr1", label: "Turkey" },
  RU: { regional: "europe", platform: "ru", label: "Russia" },
  KR: { regional: "asia", platform: "kr", label: "Korea" },
  JP: { regional: "asia", platform: "jp1", label: "Japan" },
};

/** A user-facing error with a friendly message and a machine code. */
export class RiotError extends Error {
  code:
    | "invalid_region"
    | "not_found"
    | "rate_limited"
    | "auth"
    | "downtime"
    | "config"
    | "unknown";
  constructor(code: RiotError["code"], message: string) {
    super(message);
    this.name = "RiotError";
    this.code = code;
  }
}

function apiKey(): string {
  const key = process.env.RIOT_API_KEY;
  if (!key) {
    throw new RiotError(
      "config",
      "Riot API is not configured yet. Please try again shortly.",
    );
  }
  return key;
}

function resolveRegion(region: string): RegionRouting {
  const routing = RIOT_REGIONS[region?.toUpperCase?.() ?? ""];
  if (!routing) {
    throw new RiotError("invalid_region", `"${region}" is not a supported region.`);
  }
  return routing;
}

// --- Lightweight in-memory response cache -----------------------------------
// Worker instances are short-lived, but within a burst of requests this avoids
// hammering Riot for the same URL and helps stay under rate limits.
interface CacheEntry {
  expires: number;
  value: unknown;
}
const responseCache = new Map<string, CacheEntry>();

function cacheGet<T>(key: string): T | undefined {
  const hit = responseCache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expires) {
    responseCache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function cacheSet(key: string, value: unknown, ttlMs: number) {
  responseCache.set(key, { value, expires: Date.now() + ttlMs });
}

/** Core fetch wrapper: attaches the key, maps status codes to friendly errors. */
async function riotFetch<T>(url: string, cacheTtlMs = 0): Promise<T> {
  if (cacheTtlMs > 0) {
    const cached = cacheGet<T>(url);
    if (cached !== undefined) return cached;
  }
  let res: Response;
  try {
    res = await fetch(url, { headers: { "X-Riot-Token": apiKey() } });
  } catch {
    throw new RiotError(
      "downtime",
      "Could not reach Riot's servers. Please try again in a moment.",
    );
  }

  if (res.ok) {
    const data = (await res.json()) as T;
    if (cacheTtlMs > 0) cacheSet(url, data, cacheTtlMs);
    return data;
  }

  switch (res.status) {
    case 400:
      throw new RiotError("not_found", "That Riot ID doesn't look valid. Check the spelling.");
    case 401:
    case 403:
      throw new RiotError(
        "auth",
        "BotDiff's Riot access needs attention. Please try again later.",
      );
    case 404:
      throw new RiotError(
        "not_found",
        "We couldn't find that Riot account. Double-check the name, tag, and region.",
      );
    case 429:
      throw new RiotError(
        "rate_limited",
        "Riot is rate-limiting requests right now. Please wait a minute and try again.",
      );
    case 500:
    case 502:
    case 503:
    case 504:
      throw new RiotError(
        "downtime",
        "Riot's servers are having issues right now. Please try again shortly.",
      );
    default:
      throw new RiotError("unknown", "Something went wrong talking to Riot. Please try again.");
  }
}

// --- Typed API responses ---------------------------------------------------

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface RiotSummoner {
  id?: string; // encrypted summoner id (may be absent on newer responses)
  profileIconId: number;
  summonerLevel: number;
}

export interface RiotRankEntry {
  queueType: string;
  tier: string;
  rank: string; // division: I-IV
  leaguePoints: number;
  wins: number;
  losses: number;
}

/** match-v5: only the fields we consume. The Riot payload is much larger. */
export interface RiotMatchParticipant {
  puuid: string;
  championName: string;
  championId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  visionScore: number;
  teamPosition: string;
}

export interface RiotMatch {
  metadata: { matchId: string };
  info: {
    gameCreation: number;
    gameDuration: number;
    queueId: number;
    participants: RiotMatchParticipant[];
  };
}

// --- Endpoints -------------------------------------------------------------

/** account-v1: resolve a Riot ID (gameName#tagLine) to a PUUID. */
export async function getAccountByRiotId(
  gameName: string,
  tagLine: string,
  region: string,
): Promise<RiotAccount> {
  const { regional } = resolveRegion(region);
  const url = `https://${regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
    gameName,
  )}/${encodeURIComponent(tagLine)}`;
  return riotFetch<RiotAccount>(url, 60 * 60 * 1000);
}

/** summoner-v4: level + profile icon by PUUID. */
export async function getSummonerByPuuid(
  puuid: string,
  region: string,
): Promise<RiotSummoner> {
  const { platform } = resolveRegion(region);
  const url = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(
    puuid,
  )}`;
  return riotFetch<RiotSummoner>(url, 5 * 60 * 1000);
}

/** league-v4: ranked entries by PUUID. Returns [] if unranked or unavailable. */
export async function getRankByPuuid(
  puuid: string,
  region: string,
): Promise<RiotRankEntry[]> {
  const { platform } = resolveRegion(region);
  const url = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(
    puuid,
  )}`;
  try {
    return await riotFetch<RiotRankEntry[]>(url, 2 * 60 * 1000);
  } catch (err) {
    // Ranked data is best-effort — never fail the whole flow over it.
    if (err instanceof RiotError && (err.code === "not_found" || err.code === "downtime")) {
      return [];
    }
    throw err;
  }
}

/** Latest Data Dragon version, for building profile-icon URLs. */
let ddragonVersionCache: { value: string; expires: number } | null = null;
export async function getLatestDDragonVersion(): Promise<string> {
  if (ddragonVersionCache && Date.now() < ddragonVersionCache.expires) {
    return ddragonVersionCache.value;
  }
  try {
    const res = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    if (res.ok) {
      const versions = (await res.json()) as string[];
      if (versions.length > 0) {
        ddragonVersionCache = { value: versions[0], expires: Date.now() + 6 * 60 * 60 * 1000 };
        return versions[0];
      }
    }
  } catch {
    // fall through to a sensible default
  }
  return "14.24.1";
}

export function profileIconUrl(version: string, iconId: number): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${iconId}.png`;
}

/** Picks the most relevant ranked queue (Solo/Duo first, then Flex). */
export function pickPrimaryRank(entries: RiotRankEntry[]): RiotRankEntry | null {
  if (!entries.length) return null;
  return (
    entries.find((e) => e.queueType === "RANKED_SOLO_5x5") ??
    entries.find((e) => e.queueType === "RANKED_FLEX_SR") ??
    entries[0]
  );
}

/** match-v5: list of recent match IDs for a PUUID (most recent first). */
export async function getMatchIdsByPuuid(
  puuid: string,
  region: string,
  count = 20,
  start = 0,
): Promise<string[]> {
  const { regional } = resolveRegion(region);
  const url = `https://${regional}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(
    puuid,
  )}/ids?start=${start}&count=${Math.min(count, 100)}`;
  return riotFetch<string[]>(url);
}

/** match-v5: full match detail by match ID. */
export async function getMatchById(matchId: string, region: string): Promise<RiotMatch> {
  const { regional } = resolveRegion(region);
  const url = `https://${regional}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(
    matchId,
  )}`;
  return riotFetch<RiotMatch>(url, 24 * 60 * 60 * 1000);
}

/** Human-readable label for common Summoner's Rift queue IDs. */
export function queueLabel(queueId: number): string {
  const map: Record<number, string> = {
    400: "Normal Draft",
    420: "Ranked Solo/Duo",
    430: "Normal Blind",
    440: "Ranked Flex",
    450: "ARAM",
    490: "Quickplay",
    700: "Clash",
    900: "URF",
    1700: "Arena",
  };
  return map[queueId] ?? "Other";
}
/** Data Dragon champion square icon URL. */
export function championSquareUrl(version: string, championName: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championName}.png`;
}
