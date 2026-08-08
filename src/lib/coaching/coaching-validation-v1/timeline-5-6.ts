// ---------------------------------------------------------------------------
// Sprint 5.6 — RIOT TIMELINE INTEGRATION CHECKS (deterministic).
//
//   bun run src/lib/coaching/coaching-validation-v1/timeline-5-6.ts
//
// Covers the whole data path: Riot fetch (success / 404 / rate limit / network
// failure / malformed), persistence, reuse, normalization, participant
// matching, the optional MatchAnalysisInput contract, and Power Spike
// Intelligence with AND without timeline evidence — for every role.
//
// No real Riot calls: `fetch` is stubbed per check. No credentials are read
// beyond a local placeholder inside this process.
// ---------------------------------------------------------------------------
import { DEMO_INPUTS, type MatchAnalysisInput } from "../../coaching-engine";
import {
  MATCH_TIMELINE_VERSION,
  completedItemPurchases,
  normalizeRiotTimeline,
  readStoredTimeline,
} from "../../match-timeline";
import { buildPowerSpikeReview } from "../power-spike";

export interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const PUUID = "puuid-player";
const FACTS = {
  name: (id: number) => (id === 3031 ? "Infinity Edge" : id === 6672 ? "Kraken Slayer" : id === 1055 ? "Doran's Blade" : ""),
  gold: (id: number) => (id === 3031 ? 3450 : id === 6672 ? 3100 : id === 1055 ? 450 : 0),
} as const;

function rawTimeline(opts: { withUndo?: boolean; viaMetadata?: boolean } = {}) {
  const events: Record<string, unknown>[] = [
    { type: "ITEM_PURCHASED", timestamp: 60_000, participantId: 7, itemId: 1055 },
    { type: "ITEM_PURCHASED", timestamp: 720_000, participantId: 7, itemId: 6672 },
    { type: "ITEM_PURCHASED", timestamp: 900_000, participantId: 4, itemId: 3031 },
    { type: "ITEM_PURCHASED", timestamp: 1_320_000, participantId: 7, itemId: 3031 },
  ];
  if (opts.withUndo) {
    events.push({ type: "ITEM_UNDO", timestamp: 1_321_000, participantId: 7, beforeId: 3031 });
  }
  return {
    metadata: {
      matchId: "TEST_1",
      participants: opts.viaMetadata
        ? ["a", "b", "c", "d", "e", "f", PUUID, "h", "i", "j"]
        : ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
    },
    info: {
      frameInterval: 60_000,
      participants: opts.viaMetadata
        ? undefined
        : [{ participantId: 7, puuid: PUUID }, { participantId: 4, puuid: "other" }],
      frames: [{ timestamp: 0, events }],
    },
  };
}

const FINALS = [6672, 3031, 1055];

function inputWithTimeline(role: string, champion: string): MatchAnalysisInput {
  const base = DEMO_INPUTS[0];
  const timeline = normalizeRiotTimeline(rawTimeline(), PUUID, FINALS, FACTS);
  return { ...base, matchId: `TL_${role}`, role, champion, timeline };
}

// --- fake infrastructure ---------------------------------------------------

interface FakeRow {
  match_id: string;
  puuid: string | null;
  timeline: unknown;
  timeline_fetched: boolean;
  raw: unknown;
}

function fakeSupabase(row: FakeRow | null) {
  const state = { row, updates: 0 };
  const api = {
    from() {
      const q: any = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: state.row }),
        update: (patch: Record<string, unknown>) => {
          state.updates += 1;
          if (state.row) Object.assign(state.row, patch);
          return { eq: () => ({ eq: async () => ({ error: null }) }) };
        },
      };
      return q;
    },
  };
  return { supabase: api, state };
}

function stubFetch(handler: (url: string) => Promise<Response> | Response) {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: any) =>
    Promise.resolve(handler(String(input)))) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const status = (code: number) => new Response("err", { status: code });

const rawMatch = {
  info: {
    participants: [
      { puuid: PUUID, item0: 6672, item1: 3031, item2: 1055, item3: 0, item4: 0, item5: 0 },
    ],
  },
};

function freshRow(matchId: string): FakeRow {
  return { match_id: matchId, puuid: PUUID, timeline: null, timeline_fetched: false, raw: rawMatch };
}

export async function runTimelineChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const check = async (name: string, fn: () => Promise<boolean | string> | boolean | string) => {
    try {
      const r = await fn();
      results.push({ name, passed: r === true, detail: typeof r === "string" ? r : undefined });
    } catch (err) {
      results.push({ name, passed: false, detail: (err as Error).message });
    }
  };

  process.env.RIOT_API_KEY = process.env.RIOT_API_KEY || "test-key";
  const { ensureMatchTimeline } = await import("../../match-timeline.server");

  // --- normalization ------------------------------------------------------
  await check("purchase events normalize for the correct participant", () => {
    const t = normalizeRiotTimeline(rawTimeline(), PUUID, FINALS, FACTS);
    if (!t) return "normalization returned null";
    if (t.participantId !== 7) return `participantId ${t.participantId}`;
    if (t.purchases.length !== 3) return `purchases ${t.purchases.length}`;
    return t.purchases.every((p) => p.itemId !== 3031 || p.timestampMs === 1_320_000);
  });

  await check("participant matching falls back to metadata puuid order", () => {
    const t = normalizeRiotTimeline(rawTimeline({ viaMetadata: true }), PUUID, FINALS, FACTS);
    return t?.participantId === 7 || `participantId ${t?.participantId}`;
  });

  await check("ITEM_UNDO removes the undone purchase", () => {
    const t = normalizeRiotTimeline(rawTimeline({ withUndo: true }), PUUID, FINALS, FACTS);
    return !t?.purchases.some((p) => p.itemId === 3031) || "undone purchase kept";
  });

  await check("malformed timeline responses normalize to null", () => {
    return (
      normalizeRiotTimeline(null, PUUID) === null &&
      normalizeRiotTimeline({ info: {} }, PUUID) === null &&
      normalizeRiotTimeline({ info: { frames: [] } }, PUUID) === null &&
      normalizeRiotTimeline(rawTimeline(), "unknown-puuid", FINALS, FACTS) === null
    );
  });

  await check("stored timelines read back; other versions are rejected", () => {
    const t = normalizeRiotTimeline(rawTimeline(), PUUID, FINALS, FACTS)!;
    const back = readStoredTimeline(JSON.parse(JSON.stringify(t)));
    if (!back || back.purchases.length !== t.purchases.length) return "round-trip lost purchases";
    return readStoredTimeline({ ...t, version: MATCH_TIMELINE_VERSION + 1 }) === null;
  });

  await check("completed-item purchases exclude cheap and sold items", () => {
    const t = normalizeRiotTimeline(rawTimeline(), PUUID, FINALS, FACTS)!;
    const done = completedItemPurchases(t);
    if (done.length !== 2) return `expected 2, got ${done.length}`;
    return done[0].itemId === 6672 && done[1].itemId === 3031;
  });

  // --- fetch + persistence -----------------------------------------------
  await check("successful fetch normalizes, persists and marks timeline_fetched", async () => {
    const { supabase, state } = fakeSupabase(freshRow("OK_1"));
    const restore = stubFetch(() => json(rawTimeline()));
    try {
      const r = await ensureMatchTimeline(supabase, "u1", "OK_1", "EUW");
      if (r.status !== "stored") return `status ${r.status}`;
      if (!state.row?.timeline_fetched) return "timeline_fetched not set";
      return Boolean(r.timeline && r.timeline.purchases.length > 0);
    } finally {
      restore();
    }
  });

  await check("an existing timeline is reused without a Riot request", async () => {
    const stored = normalizeRiotTimeline(rawTimeline(), PUUID, FINALS, FACTS)!;
    const row = { ...freshRow("REUSE_1"), timeline: JSON.parse(JSON.stringify(stored)), timeline_fetched: true };
    const { supabase } = fakeSupabase(row);
    let calls = 0;
    const restore = stubFetch(() => {
      calls += 1;
      return json(rawTimeline());
    });
    try {
      const r = await ensureMatchTimeline(supabase, "u1", "REUSE_1", "EUW");
      return (r.status === "reused" && calls === 0) || `status ${r.status}, calls ${calls}`;
    } finally {
      restore();
    }
  });

  await check("404 reports not_found and leaves timeline_fetched false", async () => {
    const { supabase, state } = fakeSupabase(freshRow("NF_1"));
    const restore = stubFetch(() => status(404));
    try {
      const r = await ensureMatchTimeline(supabase, "u1", "NF_1", "EUW");
      return (r.status === "not_found" && state.row?.timeline_fetched === false) || `status ${r.status}`;
    } finally {
      restore();
    }
  });

  await check("rate limiting is reported and never loops", async () => {
    const { supabase } = fakeSupabase(freshRow("RL_1"));
    let calls = 0;
    const restore = stubFetch(() => {
      calls += 1;
      return new Response("rate", { status: 429, headers: { "Retry-After": "0" } });
    });
    try {
      const first = await ensureMatchTimeline(supabase, "u1", "RL_1", "EUW");
      const callsAfterFirst = calls;
      const second = await ensureMatchTimeline(supabase, "u1", "RL_1", "EUW");
      if (first.status !== "rate_limited") return `status ${first.status}`;
      if (second.status !== "skipped") return `second status ${second.status}`;
      return calls === callsAfterFirst || "cooldown did not prevent a second request";
    } finally {
      restore();
    }
  });

  await check("network failure degrades to unavailable, never throws", async () => {
    const { supabase, state } = fakeSupabase(freshRow("NET_1"));
    const restore = stubFetch(() => {
      throw new Error("socket closed");
    });
    try {
      const r = await ensureMatchTimeline(supabase, "u1", "NET_1", "EUW");
      return (r.status === "unavailable" && state.row?.timeline_fetched === false) || `status ${r.status}`;
    } finally {
      restore();
    }
  });

  await check("malformed Riot payload is stored as nothing", async () => {
    const { supabase, state } = fakeSupabase(freshRow("BAD_1"));
    const restore = stubFetch(() => json({ info: { frames: [] } }));
    try {
      const r = await ensureMatchTimeline(supabase, "u1", "BAD_1", "EUW");
      return (
        (r.status === "malformed" &&
          r.timeline === null &&
          state.row?.timeline_fetched === false &&
          state.row?.timeline === null) ||
        `status ${r.status}`
      );
    } finally {
      restore();
    }
  });

  await check("an unknown match id never triggers a Riot request", async () => {
    const { supabase } = fakeSupabase(null);
    let calls = 0;
    const restore = stubFetch(() => {
      calls += 1;
      return json(rawTimeline());
    });
    try {
      const r = await ensureMatchTimeline(supabase, "u1", "MISSING", "EUW");
      return (r.status === "skipped" && calls === 0) || `status ${r.status}, calls ${calls}`;
    } finally {
      restore();
    }
  });

  // --- contract + power spike --------------------------------------------
  await check("MatchAnalysisInput without a timeline keeps the existing fallback", () => {
    const review = buildPowerSpikeReview(DEMO_INPUTS[0]);
    if (review.timelineAvailable) return "timelineAvailable true without evidence";
    if (review.items.some((i) => i.timingAvailable)) return "fabricated timing";
    return review.timelineUnavailableMessage.length > 0;
  });

  await check("MatchAnalysisInput with null timeline is safe", () => {
    const review = buildPowerSpikeReview({ ...DEMO_INPUTS[0], timeline: null });
    return review.timelineAvailable === false;
  });

  await check("power-spike timing uses real purchase timestamps when available", () => {
    const review = buildPowerSpikeReview(inputWithTimeline("Bot / ADC", DEMO_INPUTS[0].champion));
    if (!review.timelineAvailable) return "timeline evidence ignored";
    const first = review.items[0];
    if (!first?.timingAvailable) return "first spike has no timing";
    if (first.purchaseTime !== "12:00") return `purchaseTime ${first.purchaseTime}`;
    if (!first.differenceLabel) return "missing difference label";
    return first.confidence === "high" && review.items.length === 2;
  });

  await check("timeline evidence works for every role and champion", () => {
    const cases: [string, string][] = [
      ["Top", "Garen"],
      ["Jungle", "Lee Sin"],
      ["Mid", "Ahri"],
      ["Bot / ADC", "Caitlyn"],
      ["Support", "Nautilus"],
    ];
    for (const [role, champ] of cases) {
      const review = buildPowerSpikeReview(inputWithTimeline(role, champ));
      if (!review.hasData) continue; // champion item coaching may be suppressed
      if (!review.timelineAvailable) return `${role}/${champ}: timeline ignored`;
      if (!review.items[0]?.purchaseTime) return `${role}/${champ}: no purchase time`;
    }
    return true;
  });

  await check("existing matches (no timeline column) still analyze identically", () => {
    const a = JSON.stringify(buildPowerSpikeReview(DEMO_INPUTS[1]));
    const b = JSON.stringify(buildPowerSpikeReview({ ...DEMO_INPUTS[1], timeline: undefined }));
    return a === b || "timeline-free analysis is not deterministic";
  });

  return results;
}

if (typeof process !== "undefined" && process.argv[1]?.includes("timeline-5-6")) {
  const results = await runTimelineChecks();
  for (const r of results) {
    console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  console.log(`${results.filter((r) => r.passed).length}/${results.length} checks passed`);
}