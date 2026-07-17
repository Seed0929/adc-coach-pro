// ---------------------------------------------------------------------------
// BotDiff Power Spike Intelligence (Sprint 1.9)
//
// BotDiff does NOT coach builds. It coaches DECISIONS. This module replaces the
// old Build Review with Power Spike Timing: it teaches WHEN a player reached
// their important item power spikes, how those timings compare to coaching
// baselines, and — most importantly — WHICH HABITS caused those timings.
//
//   Habit → Tempo → Power Spike → Objective → Fight → Game outcome
//
// IMPORTANT: this is architecture preparation. We do NOT yet have per-purchase
// Riot timeline data, so spike timings are honest ESTIMATES derived from the
// player's economy (gold/min, farm, deaths). Every value is labelled a coaching
// baseline, never a rigid requirement, and every comparison baseline is
// provider-agnostic so Riot Data Dragon and future statistical sources
// (same-rank winners, Masters+, Grandmasters+) can populate them later.
//
// PURE + client-safe. Grounded entirely in real MatchAnalysisInput stats.
// ---------------------------------------------------------------------------
import type { MatchAnalysisInput } from "../coaching-engine";
// Sprint 2.1 — go through the League Intelligence facade so every coaching
// module consumes the same validated champion identity + item ecosystem.
import { LeagueIntelligence } from "./league-intelligence";
const { Champion: ChampionIntel } = LeagueIntelligence;
const coreItemsFor = ChampionIntel.coreItemsFor;

export type SpikeSource = "estimated" | "curated" | "datadragon" | "statistical";
export type SpikeStatus = "ahead" | "onTrack" | "behind";
export type SpikeConfidence = "high" | "medium" | "low";

/**
 * Provider-agnostic comparison baselines for one core-item power spike. Today
 * these are curated coaching baselines; later a stats provider (Data Dragon +
 * ranked aggregates) can hydrate `sameRankMinute` / `highEloMinute` per rank
 * without touching the coaching logic.
 */
export interface SpikeBaseline {
  /** Coaching baseline for a winning player at the same rank. */
  sameRankMinute: number;
  /** Coaching baseline for Masters+ / high-elo players. */
  highEloMinute: number;
  source: SpikeSource;
}

export interface PowerSpikeItem {
  slot: number; // 1 = first core item, 2 = second, ...
  itemName: string;
  /** Estimated purchase (completion) time in minutes. */
  purchaseMinute: number;
  /** Same-rank coaching baseline. */
  targetMinute: number;
  /** High-elo coaching baseline. */
  highEloMinute: number;
  /** purchaseMinute - targetMinute (positive = later than baseline). */
  differenceMinutes: number;
  status: SpikeStatus;
  confidence: SpikeConfidence;
  baselineSource: SpikeSource;
}

/** One habit responsible for a tempo/power-spike outcome. */
export interface TempoFactor {
  cause: string; // short habit name
  detail: string; // one-line explanation
}

export interface PowerSpikeReview {
  hasData: boolean;
  /** Extremely short visible summary (one line). */
  headline: string;
  /** Celebrate good tempo first — null when there's nothing to praise. */
  positive: string | null;
  items: PowerSpikeItem[];
  /** WHY spikes were early/late — the habits, never just "the item was late". */
  tempoFactors: TempoFactor[];
  /** Decision → Tempo → Power Spike → Objective → Fight → Outcome. */
  decisionChain: string[];
  /** Detailed coaching kept inside "Learn More". */
  learnMore: {
    tempo: string;
    economy: string;
    waveManagement: string;
    recallTiming: string;
    objectivePrep: string;
    decisionRelationships: string;
    expectedImpact: string;
  };
  /** Exactly ONE practice goal — one habit at a time. */
  practiceGoal: string;
  /** True while spike timings are estimated (no Riot purchase timeline yet). */
  baselinesApproximate: boolean;
}

// --- provider-agnostic baselines -------------------------------------------
// Curated coaching baselines (minutes) for the first three core-item spikes.
// A future provider can replace these per-rank via hydratePowerSpikeBaselines.
const CURATED_BASELINES: SpikeBaseline[] = [
  { sameRankMinute: 12.5, highEloMinute: 11.0, source: "curated" },
  { sameRankMinute: 22.0, highEloMinute: 20.0, source: "curated" },
  { sameRankMinute: 30.0, highEloMinute: 27.5, source: "curated" },
];

let ACTIVE_BASELINES: SpikeBaseline[] = CURATED_BASELINES;

/**
 * Inert hook for a FUTURE data source (Riot Data Dragon patch data + ranked
 * aggregates). Provider-agnostic on purpose: pass rank-specific baselines and
 * every downstream coaching surface updates with zero logic changes. Not
 * connected today.
 */
export function hydratePowerSpikeBaselines(baselines?: SpikeBaseline[]): void {
  if (baselines && baselines.length > 0) ACTIVE_BASELINES = baselines;
}

// --- estimation ------------------------------------------------------------

const round1 = (n: number) => Math.round(n * 10) / 10;
const mmss = (minutes: number) => {
  const s = Math.max(0, Math.round(minutes * 60));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
};
export const formatSpikeTime = mmss;

// Cumulative gold to complete each core spike (first legendary, then +boots,
// then +legendary). Kept broad — a Data Dragon hook can refine these later.
const CUMULATIVE_GOLD = [3100, 7200, 10200];

/**
 * Estimated spike completion time (minutes) from the player's economy. Early
 * gold income is slower than the whole-game average, plus recall/travel
 * overhead. Honest approximation until Riot purchase timestamps are wired in.
 */
function estimateSpikeMinute(m: MatchAnalysisInput, cumulativeGold: number): number {
  const gpm = m.goldPerMin > 0 ? m.goldPerMin : 350;
  const earlyGpm = gpm * 0.82;
  const overheadMin = 3;
  return round1(cumulativeGold / earlyGpm + overheadMin);
}

function coreItemNames(m: MatchAnalysisInput): string[] {
  // League Intelligence gate — archetype-correct core items only (never
  // Kraken Slayer on a mage, never mage items on a marksman). Callers should
  // already have suppressed the section for unknown champions.
  const names = coreItemsFor(m.champion);
  return [names[0] ?? "First core item", names[1] ?? "Second core item", names[2] ?? "Third core item"];
}

function statusFor(diff: number): SpikeStatus {
  if (diff <= -0.75) return "ahead";
  if (diff >= 0.75) return "behind";
  return "onTrack";
}

function buildItems(m: MatchAnalysisInput): PowerSpikeItem[] {
  const names = coreItemNames(m);
  const items: PowerSpikeItem[] = [];
  for (let slot = 0; slot < 3; slot++) {
    const purchaseMinute = estimateSpikeMinute(m, CUMULATIVE_GOLD[slot]);
    // Only include spikes the player realistically reached this game.
    if (purchaseMinute > m.durationMin + 1.5) break;
    const base = ACTIVE_BASELINES[slot] ?? CURATED_BASELINES[slot];
    const diff = round1(purchaseMinute - base.sameRankMinute);
    items.push({
      slot: slot + 1,
      itemName: names[slot],
      purchaseMinute,
      targetMinute: base.sameRankMinute,
      highEloMinute: base.highEloMinute,
      differenceMinutes: diff,
      status: statusFor(diff),
      // Estimated from economy only — earlier spikes are more reliable to infer.
      confidence: slot === 0 ? "medium" : slot === 1 ? "medium" : "low",
      baselineSource: base.source,
    });
  }
  return items;
}

// --- tempo analysis (WHY a spike was delayed) ------------------------------

function tempoFactors(m: MatchAnalysisInput): TempoFactor[] {
  const out: TempoFactor[] = [];
  if (m.csPerMin < 7 && m.deaths >= 4) {
    out.push({
      cause: "Late recalls",
      detail: "Staying for one extra wave instead of backing on the crash delayed each item completion.",
    });
  }
  if (m.laneMinions10 > 0 && m.laneMinions10 < 70) {
    out.push({
      cause: "Missed early farm",
      detail: `Only ~${Math.round(m.laneMinions10)} CS at 10:00 (baseline ~75) — missed last-hits are missed item gold.`,
    });
  }
  if (m.csPerMin < 7) {
    out.push({
      cause: "Lost side-lane farm",
      detail: `${round1(m.csPerMin)} CS/min means free side waves were left uncollected between objectives.`,
    });
  }
  if (m.deaths >= 5) {
    out.push({
      cause: "Deaths before the spike",
      detail: `${m.deaths} deaths reset your gold income and pushed each purchase later.`,
    });
  }
  if (m.turretTakedowns < 1 && m.durationMin >= 16) {
    out.push({
      cause: "Missed plate gold",
      detail: "No early turret/plate participation — plate gold is one of the fastest ways to accelerate a first item.",
    });
  }
  if (m.killParticipation < 0.45) {
    out.push({
      cause: "Poor rotations",
      detail: `Kill participation of ${Math.round(m.killParticipation * 100)}% — being absent from plays costs the bounty gold that funds spikes.`,
    });
  }
  return out;
}

// --- positive coaching (celebrate good tempo first) ------------------------

function positiveNote(m: MatchAnalysisInput, items: PowerSpikeItem[]): string | null {
  const first = items[0];
  if (first && first.status === "ahead") {
    return `You reached your ${first.itemName} around ${mmss(first.purchaseMinute)} — earlier than most players at your rank. That's strong tempo.`;
  }
  if (m.deaths <= 3 && m.earlyGoldExpAdvantage >= 0) {
    return "Clean early recall timing and a healthy laning phase kept your economy on schedule — good tempo habits.";
  }
  if (m.csPerMin >= 8) {
    return `Strong farming (${round1(m.csPerMin)} CS/min) kept your gold curve climbing between objectives — that's what accelerates each spike.`;
  }
  if (first && first.status === "onTrack") {
    return `Your first power spike landed right around the coaching baseline — a solid, on-time tempo foundation to build on.`;
  }
  return null;
}

// --- decision relationships ------------------------------------------------

function decisionChain(m: MatchAnalysisInput, items: PowerSpikeItem[]): string[] {
  const delayed = items.find((i) => i.status === "behind");
  if (delayed) {
    return [
      "Stayed one extra wave",
      "Late recall — lost tempo",
      `${delayed.itemName} delayed ~${Math.abs(delayed.differenceMinutes)} min`,
      "Next objective fought without your spike",
      "Enemy gained a tempo advantage",
    ];
  }
  const early = items.find((i) => i.status === "ahead");
  if (early) {
    return [
      "Crashed the wave and recalled on time",
      "Early recall — kept tempo",
      `${early.itemName} completed ahead of baseline`,
      "Reached the next objective with your power spike",
      "Turned tempo into an advantage",
    ];
  }
  return [
    "Steady recall and farm decisions",
    "On-schedule tempo",
    "Core spikes near the coaching baseline",
    "Arrived at objectives roughly on time",
    "No tempo given away",
  ];
}

// --- one practice goal -----------------------------------------------------

function practiceGoal(m: MatchAnalysisInput, factors: TempoFactor[]): string {
  const primary = factors[0]?.cause;
  switch (primary) {
    case "Late recalls":
      return "This week, focus on recalling immediately after crashing a wave before neutral objectives — no greedy extra wave.";
    case "Missed early farm":
      return "This week, focus on last-hitting the first three waves cleanly and hitting 75+ CS by 10 minutes.";
    case "Lost side-lane farm":
      return "This week, focus on catching one side wave between objectives so your gold curve never stalls.";
    case "Deaths before the spike":
      return "This week, focus on backing with a safe lead and staying alive until your next item is complete.";
    case "Missed plate gold":
      return "This week, focus on shoving to help take at least one turret plate before they fall.";
    case "Poor rotations":
      return "This week, focus on rotating to the next play after every wave crash to stay part of the map.";
    default:
      return "This week, focus on replicating this game's recall timing so your power spikes stay on schedule.";
  }
}

// --- learn more copy -------------------------------------------------------

function learnMore(m: MatchAnalysisInput, items: PowerSpikeItem[]) {
  const behind = items.filter((i) => i.status === "behind").length;
  return {
    tempo:
      "Tempo is how fast you convert time into gold and pressure. Every recall, wave crash, and rotation either builds tempo or gives it away — and tempo is what decides when your power spikes arrive.",
    economy:
      `Your gold income this game averaged ${round1(m.goldPerMin)} gold/min. Item spikes are just gold thresholds, so a higher, steadier income moves every spike earlier — the numbers here are coaching baselines, not rigid requirements.`,
    waveManagement:
      "Crashing the wave before you recall lets you leave for base without losing CS or XP. Overstaying for one more minion is the most common reason a first item arrives late.",
    recallTiming:
      "Recalling on the crash means you come back with an item and full resources at the same time the wave resets. Backing on low HP mid-wave costs both gold and the wave.",
    objectivePrep:
      "Power spikes matter most around objectives. Reaching a spike a minute before Dragon or Baron lets you contest it with a real advantage instead of fighting into a stronger enemy.",
    decisionRelationships:
      behind > 0
        ? "A single late recall this game rippled forward: a delayed item meant the next objective was contested without your spike, which handed the enemy tempo. That's why we coach the decision, not the item."
        : "Your on-time spikes let you arrive at objectives with your power ready — proof that good recall and farm decisions compound into map advantages.",
    expectedImpact:
      "Reaching your first two spikes one minute earlier, consistently, is worth more over 100 games than any single build change — it means winning more of the fights that were previously coin-flips.",
  };
}

// --- entry point -----------------------------------------------------------

export function buildPowerSpikeReview(m: MatchAnalysisInput): PowerSpikeReview {
  // Failsafe — suppress rather than compare against impossible item paths.
  const profile = ChampionIntel.getChampionProfile(m.champion);
  if (!profile.canCoachItems) {
    return {
      hasData: false,
      headline: "No meaningful power-spike timing was identified for this match.",
      positive: null,
      items: [],
      tempoFactors: [],
      decisionChain: [],
      learnMore: {
        tempo: "",
        economy: "",
        waveManagement: "",
        recallTiming: "",
        objectivePrep: "",
        decisionRelationships:
          "BotDiff only compares power-spike timings when League Intelligence can validate the champion's item ecosystem. It would rather stay quiet than compare you against impossible items.",
        expectedImpact: "",
      },
      practiceGoal: "Keep replicating clean recall + farm decisions — that's what accelerates every spike.",
      baselinesApproximate: true,
    };
  }

  const items = buildItems(m);
  const factors = tempoFactors(m);
  const positive = positiveNote(m, items);

  const behind = items.filter((i) => i.status === "behind").length;
  const ahead = items.filter((i) => i.status === "ahead").length;
  const headline = items.length === 0
    ? "The game ended before your first power spike — focus on reaching your first item faster."
    : behind > 0
      ? `Your power spikes came ${behind === 1 ? "a spike" : `${behind} spikes`} later than baseline — the habits below are why.`
      : ahead > 0
        ? "Great tempo — your power spikes were ahead of the coaching baseline."
        : "Your power spikes landed right on the coaching baseline this game.";

  return {
    hasData: items.length > 0,
    headline,
    positive,
    items,
    tempoFactors: factors,
    decisionChain: decisionChain(m, items),
    learnMore: learnMore(m, items),
    practiceGoal: practiceGoal(m, factors),
    baselinesApproximate: true,
  };
}
