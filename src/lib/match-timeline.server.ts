// ---------------------------------------------------------------------------
// Riot timeline enrichment (server-only) — Sprint 5.6
//
// One Riot request per match: GET /lol/match/v5/matches/{matchId}/timeline.
// The response is normalized (see match-timeline.ts) and stored in the EXISTING
// `matches.timeline` / `matches.timeline_fetched` columns. No second timeline
// system, no duplicate storage, no raw-replay dumps.
//
// RATE-LIMIT POLICY
//   - A match with a stored timeline is NEVER re-fetched.
//   - Failures do NOT set `timeline_fetched`, so state stays accurate; instead a
//     short in-memory cooldown prevents request loops from repeated page views.
//   - Enrichment is bounded per sync (TIMELINE_BUDGET_PER_SYNC).
// ---------------------------------------------------------------------------
import { RiotError, getMatchTimelineById } from "./riot.server";
import {
  normalizeRiotTimeline,
  readStoredTimeline,
  type ItemFactLookup,
  type NormalizedMatchTimeline,
} from "./match-timeline";
import type { Json } from "@/integrations/supabase/types";

type SupabaseLike = { from: (t: string) => any };

/** Max timeline requests a single sync may spend. */
export const TIMELINE_BUDGET_PER_SYNC = 5;

/** Cooldown after a failed attempt, so a viewed match can't loop requests. */
const FAILURE_COOLDOWN_MS = 10 * 60 * 1000;
const cooldown = new Map<string, number>();

function onCooldown(key: string): boolean {
  const until = cooldown.get(key);
  if (until == null) return false;
  if (Date.now() > until) {
    cooldown.delete(key);
    return false;
  }
  return true;
}

export type TimelineFetchStatus =
  | "stored"
  | "reused"
  | "not_found"
  | "rate_limited"
  | "unavailable"
  | "malformed"
  | "skipped";

/** Data Dragon item names + gold, best-effort. Never blocks the timeline. */
async function itemFacts(): Promise<ItemFactLookup> {
  try {
    const { ItemRepository } = await import("./league-data/item-repository");
    await ItemRepository.ensureLoaded();
    return {
      name: (id) => ItemRepository.name(id) || undefined,
      gold: (id) => ItemRepository.gold(id)?.total || undefined,
    };
  } catch {
    return {};
  }
}

/** End-of-game inventory (item0..item5) for the player, from stored raw match. */
export function finalItemIdsFromRaw(raw: unknown, puuid: string | null): number[] {
  try {
    const parts = (raw as { info?: { participants?: any[] } })?.info?.participants ?? [];
    const me = puuid ? parts.find((p) => p.puuid === puuid) : null;
    if (!me) return [];
    return [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5]
      .filter((n: unknown): n is number => typeof n === "number" && n > 0);
  } catch {
    return [];
  }
}

/**
 * Ensure a single stored match has timeline data. Returns the normalized
 * timeline when available. A failure NEVER throws — timeline is enrichment,
 * not a dependency of the match report.
 */
export async function ensureMatchTimeline(
  supabase: SupabaseLike,
  userId: string,
  matchId: string,
  region: string,
): Promise<{ status: TimelineFetchStatus; timeline: NormalizedMatchTimeline | null }> {
  try {
    const { data: row } = await supabase
      .from("matches")
      .select("match_id, puuid, timeline, timeline_fetched, raw")
      .eq("profile_id", userId)
      .eq("match_id", matchId)
      .maybeSingle();
    if (!row) return { status: "skipped", timeline: null };

    const existing = readStoredTimeline(row.timeline);
    if (existing) return { status: "reused", timeline: existing };

    const key = `${userId}:${matchId}`;
    if (onCooldown(key)) return { status: "skipped", timeline: null };

    return await fetchAndStoreTimeline(supabase, userId, matchId, region, row.puuid, row.raw);
  } catch {
    return { status: "unavailable", timeline: null };
  }
}

/** Fetch + normalize + persist one match's timeline. Never throws. */
export async function fetchAndStoreTimeline(
  supabase: SupabaseLike,
  userId: string,
  matchId: string,
  region: string,
  puuid: string | null,
  raw: unknown,
): Promise<{ status: TimelineFetchStatus; timeline: NormalizedMatchTimeline | null }> {
  const key = `${userId}:${matchId}`;
  let payload: unknown;
  try {
    payload = await getMatchTimelineById(matchId, region);
  } catch (err) {
    cooldown.set(key, Date.now() + FAILURE_COOLDOWN_MS);
    if (err instanceof RiotError) {
      if (err.code === "not_found") return { status: "not_found", timeline: null };
      if (err.code === "rate_limited") return { status: "rate_limited", timeline: null };
    }
    return { status: "unavailable", timeline: null };
  }

  const normalized = normalizeRiotTimeline(
    payload,
    puuid ?? null,
    finalItemIdsFromRaw(raw, puuid ?? null),
    await itemFacts(),
  );
  if (!normalized) {
    // Malformed / unmatched participant: keep timeline_fetched false so the
    // stored state stays honest, and cool down to avoid a retry loop.
    cooldown.set(key, Date.now() + FAILURE_COOLDOWN_MS);
    return { status: "malformed", timeline: null };
  }

  const { error } = await supabase
    .from("matches")
    .update({
      timeline: normalized as unknown as Json,
      timeline_fetched: true,
    })
    .eq("profile_id", userId)
    .eq("match_id", matchId);
  if (error) return { status: "unavailable", timeline: normalized };
  return { status: "stored", timeline: normalized };
}

/**
 * Bounded enrichment for freshly imported matches. Stops at the request budget
 * and stops immediately on a rate limit — the sync itself always succeeds.
 *
 * BACKFILL: existing matches acquire timelines lazily (one request when their
 * report is opened) or via this path on the next sync. There is deliberately no
 * bulk backfill operation; a controlled backfill would call
 * `ensureMatchTimeline` over a small batch of match ids per invocation.
 */
export async function enrichTimelines(
  supabase: SupabaseLike,
  userId: string,
  matchIds: string[],
  region: string,
  budget = TIMELINE_BUDGET_PER_SYNC,
): Promise<{ fetched: number; rateLimited: boolean }> {
  let fetched = 0;
  let rateLimited = false;
  for (const matchId of matchIds.slice(0, Math.max(0, budget))) {
    const { status } = await ensureMatchTimeline(supabase, userId, matchId, region);
    if (status === "stored") fetched += 1;
    if (status === "rate_limited") {
      rateLimited = true;
      break;
    }
  }
  return { fetched, rateLimited };
}