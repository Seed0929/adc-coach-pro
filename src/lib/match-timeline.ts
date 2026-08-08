// ---------------------------------------------------------------------------
// Match Timeline Normalization (Sprint 5.6)
//
// PURE + client-safe. Turns Riot's Match-V5 timeline payload into the minimal
// representation BotDiff actually needs today: which items the player bought,
// and exactly when. Nothing here fetches, estimates, or fabricates anything —
// if Riot didn't give us an event, the value is simply absent.
//
// Role-agnostic and champion-agnostic by construction: everything is keyed on
// the player's PUUID → participantId, never on a champion or lane.
//
// This normalized object (NOT the raw Riot response) is what gets persisted in
// `matches.timeline`, so we never duplicate the full replay payload.
// ---------------------------------------------------------------------------

/** Bump when the normalized shape changes so stored rows can be re-fetched. */
export const MATCH_TIMELINE_VERSION = 1;

export interface TimelineItemPurchase {
  itemId: number;
  /** Riot game time of the purchase, in ms. */
  timestampMs: number;
  /** Same instant expressed in minutes (one decimal). */
  minute: number;
  /** Data Dragon item name, when the item repository was available. */
  itemName?: string;
  /** Data Dragon total gold cost, when known. */
  goldTotal?: number;
}

export interface NormalizedMatchTimeline {
  version: number;
  /** Riot participant slot (1-10) the purchases belong to. */
  participantId: number | null;
  /** The player this timeline was normalized for. */
  puuid: string | null;
  /** Item purchases for that participant, oldest first, undos removed. */
  purchases: TimelineItemPurchase[];
  /** The player's end-of-game inventory item ids (excludes the trinket). */
  finalItemIds: number[];
  /** Riot frame interval in ms, when reported. */
  frameIntervalMs: number | null;
  /** When this timeline was normalized (ISO). */
  fetchedAt: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Optional Data Dragon enrichment injected by the server (never required). */
export interface ItemFactLookup {
  name?: (itemId: number) => string | undefined;
  gold?: (itemId: number) => number | undefined;
}

/**
 * Normalize a raw Riot timeline for one player. Returns `null` for anything
 * malformed, missing, or unmatched — callers then keep the existing
 * "timeline unavailable" behaviour instead of guessing.
 */
export function normalizeRiotTimeline(
  raw: unknown,
  puuid: string | null,
  finalItemIds: number[] = [],
  facts: ItemFactLookup = {},
): NormalizedMatchTimeline | null {
  try {
    if (!isPlainObject(raw)) return null;
    const info = isPlainObject(raw.info) ? raw.info : null;
    if (!info) return null;

    const participants = Array.isArray(info.participants) ? info.participants : [];
    let participantId: number | null = null;
    if (puuid) {
      const hit = participants.find(
        (p) => isPlainObject(p) && p.puuid === puuid,
      ) as { participantId?: number } | undefined;
      if (typeof hit?.participantId === "number") participantId = hit.participantId;
    }
    if (participantId == null) {
      // metadata.participants is PUUID-ordered; index+1 is the participantId.
      const meta = isPlainObject((raw as { metadata?: unknown }).metadata)
        ? ((raw as { metadata: Record<string, unknown> }).metadata)
        : null;
      const list = Array.isArray(meta?.participants) ? (meta!.participants as unknown[]) : [];
      const idx = puuid ? list.indexOf(puuid) : -1;
      if (idx >= 0) participantId = idx + 1;
    }
    if (participantId == null) return null;

    const frames = Array.isArray(info.frames) ? info.frames : [];
    if (frames.length === 0) return null;

    const purchases: TimelineItemPurchase[] = [];
    for (const frame of frames) {
      if (!isPlainObject(frame)) continue;
      const events = Array.isArray(frame.events) ? frame.events : [];
      for (const ev of events) {
        if (!isPlainObject(ev)) continue;
        if (ev.participantId !== participantId) continue;
        const ts = typeof ev.timestamp === "number" ? ev.timestamp : null;
        if (ts == null) continue;

        if (ev.type === "ITEM_PURCHASED" && typeof ev.itemId === "number") {
          purchases.push({
            itemId: ev.itemId,
            timestampMs: ts,
            minute: round1(ts / 60000),
          });
        } else if (ev.type === "ITEM_UNDO") {
          // Riot reports the undone item in `beforeId`. Drop the most recent
          // matching purchase so undone buys never count as evidence.
          const undone = typeof ev.beforeId === "number" ? ev.beforeId : null;
          if (undone != null) {
            for (let i = purchases.length - 1; i >= 0; i--) {
              if (purchases[i].itemId === undone) {
                purchases.splice(i, 1);
                break;
              }
            }
          }
        }
      }
    }

    for (const p of purchases) {
      const name = facts.name?.(p.itemId);
      if (name) p.itemName = name;
      const gold = facts.gold?.(p.itemId);
      if (typeof gold === "number" && gold > 0) p.goldTotal = gold;
    }

    purchases.sort((a, b) => a.timestampMs - b.timestampMs);

    return {
      version: MATCH_TIMELINE_VERSION,
      participantId,
      puuid: puuid ?? null,
      purchases,
      finalItemIds: finalItemIds.filter((id) => typeof id === "number" && id > 0),
      frameIntervalMs:
        typeof info.frameInterval === "number" ? info.frameInterval : null,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Read a stored `matches.timeline` value back into a normalized timeline.
 * Returns null for legacy/foreign/corrupt payloads instead of throwing.
 */
export function readStoredTimeline(value: unknown): NormalizedMatchTimeline | null {
  if (!isPlainObject(value)) return null;
  if (value.version !== MATCH_TIMELINE_VERSION) return null;
  if (!Array.isArray(value.purchases)) return null;
  const purchases = value.purchases.filter(
    (p): p is TimelineItemPurchase =>
      isPlainObject(p) && typeof p.itemId === "number" && typeof p.timestampMs === "number",
  );
  return {
    version: MATCH_TIMELINE_VERSION,
    participantId: typeof value.participantId === "number" ? value.participantId : null,
    puuid: typeof value.puuid === "string" ? value.puuid : null,
    purchases: purchases.map((p) => ({
      ...p,
      minute: typeof p.minute === "number" ? p.minute : round1(p.timestampMs / 60000),
    })),
    finalItemIds: Array.isArray(value.finalItemIds)
      ? value.finalItemIds.filter((n): n is number => typeof n === "number")
      : [],
    frameIntervalMs:
      typeof value.frameIntervalMs === "number" ? value.frameIntervalMs : null,
    fetchedAt: typeof value.fetchedAt === "string" ? value.fetchedAt : new Date(0).toISOString(),
  };
}

/** True when the timeline carries usable purchase evidence. */
export function hasPurchaseEvidence(t: NormalizedMatchTimeline | null | undefined): boolean {
  return Boolean(t && t.purchases.length > 0);
}

/**
 * The player's completed-item purchases, oldest first: purchases that ended up
 * in the end-of-game inventory and cost real gold. Generic across every role
 * and champion — no build knowledge involved, only Riot evidence.
 */
export function completedItemPurchases(
  t: NormalizedMatchTimeline | null | undefined,
  minGold = 2000,
): TimelineItemPurchase[] {
  if (!t) return [];
  const finals = new Set(t.finalItemIds);
  const seen = new Set<number>();
  const out: TimelineItemPurchase[] = [];
  for (const p of t.purchases) {
    if (finals.size > 0 && !finals.has(p.itemId)) continue;
    if (typeof p.goldTotal !== "number" || p.goldTotal < minGold) continue;
    if (seen.has(p.itemId)) continue;
    seen.add(p.itemId);
    out.push(p);
  }
  return out;
}