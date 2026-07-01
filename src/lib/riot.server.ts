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

/** Core fetch wrapper: attaches the key, maps status codes to friendly errors. */
async function riotFetch<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { "X-Riot-Token": apiKey() } });
  } catch {
    throw new RiotError(
      "downtime",
      "Could not reach Riot's servers. Please try again in a moment.",
    );
  }

  if (res.ok) return (await res.json()) as T;

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
  return riotFetch<RiotAccount>(url);
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
  return riotFetch<RiotSummoner>(url);
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
    return await riotFetch<RiotRankEntry[]>(url);
  } catch (err) {
    // Ranked data is best-effort — never fail the whole flow over it.
    if (err instanceof RiotError && (err.code === "not_found" || err.code === "downtime")) {
      return [];
    }
    throw err;
  }
}

/** Latest Data Dragon version, for building profile-icon URLs. */
export async function getLatestDDragonVersion(): Promise<string> {
  try {
    const res = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    if (res.ok) {
      const versions = (await res.json()) as string[];
      if (versions.length > 0) return versions[0];
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