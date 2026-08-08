# Sprint 5.6 — Riot Timeline Integration V1

Data-pipeline only. No UI changes, no new coaching intelligence.

## Riot request budget (new)

| Path | Extra Riot requests |
| --- | --- |
| Opening a match report | 0 if a timeline is stored, otherwise **1** (`/lol/match/v5/matches/{matchId}/timeline`) |
| `syncMatches` / `autoSync` | at most `TIMELINE_BUDGET_PER_SYNC = 5`, newest imports first, stops on rate limit |

Failures never set `timeline_fetched`. A failed attempt starts a 10-minute
in-memory cooldown per (user, match) so repeated page views cannot loop
requests. Timelines are cached 24h in `riotFetch` (a finished match's timeline
is immutable).

## Storage

`matches.timeline` holds the **normalized** timeline (~1.3 KB) rather than the
raw Riot payload (~770 KB for a 32-minute game). `matches.timeline_fetched` is
set to `true` only after a successful normalize + persist.

## Normalized shape (`src/lib/match-timeline.ts`, version 1)

```
{ version, participantId, puuid, purchases: [{ itemId, timestampMs, minute, itemName?, goldTotal? }],
  finalItemIds, frameIntervalMs, fetchedAt }
```

Participant resolution: `info.participants[].puuid` → fallback
`metadata.participants` index + 1. `ITEM_UNDO` removes the matching purchase.
Malformed / unmatched payloads normalize to `null`.

## Contract

`MatchAnalysisInput.timeline?: NormalizedMatchTimeline | null` — optional,
role- and champion-agnostic, backwards compatible.

## Coaching path

Riot timeline → `matches.timeline` → `readStoredTimeline` in `extractInput`
→ `MatchAnalysisInput.timeline` → `buildPowerSpikeReview` →
`completedItemPurchases` (end-of-game inventory + ≥2000g, deduped, oldest
first). With evidence, spike slots carry real purchase times, baselines and
`confidence: "high"`; without it the existing "timeline unavailable" fallback is
unchanged and no minute is ever fabricated.

## Backfill

No bulk operation. Existing matches acquire a timeline lazily (one request when
their report is opened) or through the bounded per-sync enrichment. A future
controlled backfill should call `ensureMatchTimeline` over a small batch of
match ids per invocation, honouring the same cooldown and stopping on
`rate_limited`.

## Validation

- Sprint 5.6 timeline checks: 18/18 PASS (`timeline-5-6.ts`)
- Sprint 5.4 hardening: 21/21 PASS
- Sprint 5.5 authenticated: 20/20 PASS
- Coaching validation: 49/49 PASS
- Beta readiness: 16/16 PASS
- Typecheck: clean

Real match (NA1_5616749442, Caitlyn): timeline fetched, 22 purchase events,
participantId 4, stored and normalized. Evidence-based spikes:
The Collector 11.4m, Hexoptics C44 14.9m, Infinity Edge 21.8m,
Lord Dominik's Regards 28.8m.

## Production key

Development Riot configuration only. Production Riot API key validation remains
a pending beta-readiness step.
