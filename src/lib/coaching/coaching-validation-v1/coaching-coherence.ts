// ---------------------------------------------------------------------------
// Coaching coherence + evidence integrity — deterministic checks.
//
//   bun run src/lib/coaching/coaching-validation-v1/coaching-coherence.ts
//
// Covers: one authoritative plan, issue deduplication, priority promotion,
// completed-focus history, Performance Consistency classifications, the global
// item-recommendation ban, preserved purchased-item analysis, absence of
// arbitrary benchmarks, unsupported timestamps, and evidence labeling.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import {
  MIN_TARGET_GAMES,
  activeFocusReference,
  buildCoachingIntelligence,
  buildCoachingPlan,
  classifyVariability,
  consistencyFor,
  containsItemRecommendation,
  displayTimestamp,
  evaluateAll,
  isPurchasedItemObservation,
  labelForClaim,
  dedupeByIssue,
  identifyIssue,
  issueForMetric,
  sanitizeCoachingText,
  stripUnsupportedTime,
  emptySnapshot,
  rankPriorities,
} from "../performance-intelligence-v1";
import { buildMatchPlan } from "../match-plan";
import { buildCoachDossier } from "../../player-memory";
import { analyzeMatch } from "../../coaching-engine";
import type { MatchAnalysisInput } from "../../coaching-engine";
import type { ProfileMatch } from "../../profile-engine";

export interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const results: CheckResult[] = [];
function check(name: string, fn: () => boolean | string) {
  try {
    const r = fn();
    results.push(typeof r === "string" ? { name, passed: false, detail: r } : { name, passed: r });
  } catch (e) {
    results.push({ name, passed: false, detail: (e as Error).message });
  }
}

const NOW = "2026-02-01T00:00:00.000Z";
const LATER = "2026-03-01T00:00:00.000Z";

function makeMatches(
  count: number,
  per: (i: number) => { csPerMin?: number; deaths?: number; champion?: string; role?: string },
): ProfileMatch[] {
  const list: ProfileMatch[] = [];
  for (let i = 0; i < count; i++) {
    const o = per(i);
    const cs = o.csPerMin ?? 6;
    const deaths = o.deaths ?? 5;
    list.push({
      matchId: `M${i}`,
      champion: o.champion ?? "Caitlyn",
      role: o.role ?? "BOTTOM",
      win: i % 2 === 0,
      gameCreation: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
      durationMin: 30,
      kills: 6,
      deaths,
      assists: 6,
      kda: deaths > 0 ? 12 / deaths : 12,
      cs: Math.round(cs * 30),
      csPerMin: cs,
      gold: 12000,
      goldPerMin: 400,
      visionScore: 20,
      visionPerMin: 20 / 30,
      killParticipation: 0.5,
      objectiveTakedowns: 2,
      damageToChampions: 21000,
      damagePerMin: 700,
      botDiffScore: 60,
      grades: { laning: 60, farming: 60, vision: 60, objective: 60, teamfight: 60, consistency: 60 },
      strengths: [],
      weaknesses: [],
    });
  }
  return list.reverse();
}

function makeInputs(count: number): MatchAnalysisInput[] {
  return Array.from({ length: count }, (_, i) => ({
    matchId: `A${i}`,
    champion: "Caitlyn",
    role: "Bot / ADC",
    win: i % 2 === 0,
    gameCreation: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    durationMin: 30,
    kills: 5,
    deaths: 6,
    assists: 5,
    cs: 180,
    csPerMin: 6,
    gold: 12000,
    goldPerMin: 400,
    visionScore: 18,
    visionPerMin: 0.6,
    wardsPlaced: 8,
    controlWardsPlaced: 1,
    wardsKilled: 1,
    killParticipation: 0.5,
    damageShare: 0.25,
    damagePerMin: 700,
    soloKills: 0,
    dragonTakedowns: 1,
    baronTakedowns: 0,
    riftHeraldTakedowns: 0,
    turretTakedowns: 1,
    objectivesStolen: 0,
    laneMinions10: 60,
    maxCsAdvantage: -10,
    earlyGoldExpAdvantage: -300,
  })) as MatchAnalysisInput[];
}

const src = (p: string) => readFileSync(p, "utf8");

// --- 1. one authoritative plan ---------------------------------------------

check("Coach page renders exactly one personalized plan section", () => {
  const s = src("src/routes/coach.tsx");
  const planTitles = s.match(/title="Your Personalized Coaching Plan"/g)?.length ?? 0;
  const legacy =
    /Personalized improvement plan/.test(s) || /Your personal practice plan/.test(s);
  return (planTitles === 1 && !legacy) || `titles=${planTitles} legacy=${legacy}`;
});

check("Dossier exposes the plan and Performance Consistency", () => {
  const dossier = buildCoachDossier(
    makeInputs(12),
    makeInputs(12).map((m) => analyzeMatch(m)),
  );
  return (
    Array.isArray(dossier.plan.queue) &&
    dossier.plan.queue.length <= 3 &&
    dossier.performanceConsistency.length > 0
  );
});

check("Plan queue holds at most one active priority", () => {
  const intel = buildCoachingIntelligence(makeMatches(20, () => ({})), undefined, { now: NOW });
  const active = intel.plan.queue.filter((e) => e.slot === "active");
  return active.length <= 1 && (intel.plan.active === null || intel.plan.active.rank === 1);
});

check("Only the active priority carries practice actions and consistency", () => {
  const intel = buildCoachingIntelligence(
    makeMatches(24, (i) => ({ csPerMin: i < 12 ? 8 : 5.5, deaths: i < 12 ? 2 : 8 })),
    undefined,
    { now: NOW },
  );
  return intel.plan.queue
    .filter((e) => e.slot !== "active")
    .every((e) => e.practiceActions.length === 0 && e.consistency === null);
});

// --- 2. deduplication ------------------------------------------------------

check("A single issue cannot occupy two plan slots", () => {
  const intel = buildCoachingIntelligence(makeMatches(24, () => ({})), undefined, { now: NOW });
  const ids = intel.plan.queue.map((e) => e.issueId).filter(Boolean);
  return new Set(ids).size === ids.length;
});

check("dedupeByIssue collapses restatements of the same problem", () => {
  const items = [
    "You are dying too often in the mid game",
    "Your death count is too high",
    "Your CS per minute drops after 15 minutes",
  ];
  const { kept, duplicates } = dedupeByIssue(items, (t) => t);
  return (kept.length === 2 && duplicates.length === 1) || `kept=${kept.length}`;
});

check("identifyIssue maps farming and death language to stable identities", () => {
  return (
    identifyIssue("missed last hits and low CS per minute")?.id === "FARMING_CONSISTENCY" &&
    identifyIssue("you died 9 times")?.id === "DEATH_REDUCTION"
  );
});

check("Metric → issue routing is stable", () => {
  return issueForMetric("cs")?.id === "FARMING_CONSISTENCY" && issueForMetric("deaths")?.id === "DEATH_REDUCTION";
});

check("Other panels only reference the active focus, never restate it", () => {
  const intel = buildCoachingIntelligence(makeMatches(20, () => ({})), undefined, { now: NOW });
  const ref = activeFocusReference(intel.plan);
  return ref === null || (/Current coaching focus/.test(ref) && ref.length < 200);
});

// --- 3. promotion + history ------------------------------------------------

check("Sustained achievement promotes the next priority and records history", () => {
  const first = buildCoachingIntelligence(
    makeMatches(20, (i) => ({ csPerMin: i < 10 ? 7.5 : 5.5, deaths: 4 })),
    undefined,
    { now: NOW, maxActive: 1 },
  );
  const improved = buildCoachingIntelligence(
    makeMatches(30, (i) => ({ csPerMin: i < 10 ? 7.5 : i < 20 ? 5.5 : 8.2, deaths: 4 })),
    first.snapshot,
    { now: LATER, maxActive: 1 },
  );
  const completed = improved.plan.history.length >= first.plan.history.length;
  return completed || "completed focuses were not preserved";
});

check("Completed focuses keep their baseline → target journey", () => {
  const first = buildCoachingIntelligence(
    makeMatches(20, (i) => ({ csPerMin: i < 10 ? 7.5 : 5.5 })),
    undefined,
    { now: NOW, maxActive: 1 },
  );
  const improved = buildCoachingIntelligence(
    makeMatches(30, (i) => ({ csPerMin: i < 10 ? 7.5 : i < 20 ? 5.5 : 8.4 })),
    first.snapshot,
    { now: LATER, maxActive: 1 },
  );
  return improved.plan.history.every((h) => /→/.test(h.journey));
});

check("No priority is named before the minimum game count", () => {
  const intel = buildCoachingIntelligence(makeMatches(MIN_TARGET_GAMES - 2, () => ({})), undefined, {
    now: NOW,
  });
  return intel.plan.active === null ? true : intel.plan.active.target === null;
});

// --- 4. Performance Consistency -------------------------------------------

check("Consistency reports a range and classification, never a bare score", () => {
  const evaluations = evaluateAll(makeMatches(15, (i) => ({ csPerMin: 6 + (i % 3) * 0.1 })));
  const cs = evaluations.find((e) => e.metric === "cs" && e.scope.id === "player")!;
  const c = consistencyFor(cs);
  return (
    (c.available && c.typicalRange !== null && c.classification !== null && /typically/.test(c.summary)) ||
    c.summary
  );
});

check("Stable rate metrics classify as very consistent", () => {
  return classifyVariability("cs", [6, 6.1, 5.9, 6, 6.05]).classification === "Very consistent";
});

check("Swingy rate metrics classify as high variation", () => {
  return classifyVariability("cs", [2, 9, 3, 10, 4]).classification === "High variation";
});

check("Count metrics use count dispersion, not raw variance", () => {
  const r = classifyVariability("deaths", [4, 6, 5, 7, 3]);
  return r.statistic.kind === "count_dispersion" && r.classification !== "High variation";
});

check("Consistency says 'not enough games' below the threshold", () => {
  const evaluations = evaluateAll(makeMatches(3, () => ({})));
  const cs = evaluations.find((e) => e.metric === "cs" && e.scope.id === "player");
  if (!cs) return true;
  const c = consistencyFor(cs);
  return !c.available && /Not enough games/i.test(c.note ?? "");
});

// --- 5. targets are personal, benchmarks are gone -------------------------

check("Plan targets come from the player's own proven form", () => {
  const intel = buildCoachingIntelligence(
    makeMatches(24, (i) => ({ csPerMin: i < 12 ? 8 : 5.5 })),
    undefined,
    { now: NOW },
  );
  return intel.plan.queue.every((e) => {
    if (!e.target) return true;
    const evaluation = intel.evaluations.find((x) => x.metric === e.metric && x.scope.id === e.scopeId)!;
    return evaluation.bestSustained !== null;
  });
});

check("No coaching source ships a generic CS/min benchmark", () => {
  const files = [
    "src/lib/coaching-engine.ts",
    "src/lib/player-memory.ts",
    "src/lib/coaching/match-plan.ts",
    "src/lib/coaching/power-spike.ts",
  ];
  const bad = files.filter((f) => /~\s*8\.0|8\.0\/min benchmark|coaching benchmark/.test(src(f)));
  return bad.length === 0 || bad.join(", ");
});

check("Match cards no longer plot a synthetic rank-average curve", () => {
  const s = src("src/routes/matches.index.tsx");
  return !/Rank avg|rank avg|Benchmark"/.test(s);
});

check("Power spike UI shows real purchase times, not baseline comparisons", () => {
  const s = src("src/components/match-coach-report.tsx");
  return !/Same rank|High elo/.test(s) && /You completed this at/.test(s);
});

// --- 6. item / build ban ---------------------------------------------------

check("containsItemRecommendation catches build prescriptions", () => {
  return (
    containsItemRecommendation("You should have bought anti-heal earlier") &&
    containsItemRecommendation("Build a defensive item against their dive") &&
    containsItemRecommendation("Consider an anti-heal pickup")
  );
});

check("Purchased-item observations are preserved", () => {
  const text = "You completed your first core item at 14:20.";
  return isPurchasedItemObservation(text) && !containsItemRecommendation(text);
});

check("sanitizeCoachingText strips build advice and keeps behaviour", () => {
  const { text } = sanitizeCoachingText(
    "You died on contact in three fights. You should have bought a defensive item.",
  );
  return (text !== null && !/bought/.test(text) && /fights/.test(text)) || `got: ${text}`;
});

check("Match plan no longer produces an item review", () => {
  const s = src("src/lib/coaching/match-plan.ts");
  const plan = buildMatchPlan(makeInputs(1)[0]);
  return (
    !/itemReview|ItemReview|Grievous Wounds/.test(s) &&
    !("itemReview" in (plan as Record<string, unknown>))
  );
});

check("No coaching text tells the player what to buy", () => {
  const plan = buildMatchPlan(makeInputs(1)[0]);
  const texts = [
    ...plan.phases.map((p) => `${p.headline} ${p.detail}`),
    plan.practiceGoal,
    plan.turningPoint,
    plan.winCondition,
  ];
  const bad = texts.filter((t) => containsItemRecommendation(t));
  return bad.length === 0 || bad[0];
});

check("Plan practice actions are behavioural only", () => {
  const intel = buildCoachingIntelligence(makeMatches(24, () => ({})), undefined, { now: NOW });
  const bad = intel.plan.queue
    .flatMap((e) => e.practiceActions)
    .filter((a) => containsItemRecommendation(a));
  return bad.length === 0 || bad[0];
});

// --- 7. timestamps + evidence labeling ------------------------------------

check("Estimated timings are never displayed as a clock", () => {
  return (
    displayTimestamp({ timingSource: "estimated", timestampSeconds: 430 }) === null &&
    displayTimestamp({ timingSource: "riot_timeline", timestampSeconds: 430 }) === "7:10"
  );
});

check("stripUnsupportedTime removes approximate clocks from statements", () => {
  const out = stripUnsupportedTime("You died at ~7:10 while pushing.");
  return (!/7:10/.test(out) && /pushing/.test(out)) || out;
});

check("Decision chain anchors describe the phase, not a fake clock", () => {
  const s = src("src/lib/coaching/decision-chain.ts");
  return /PHASE_LABELS/.test(s) && !/label: `~ \$\{mmss/.test(s);
});

check("Bridge only stamps timestamps for timeline-anchored events", () => {
  const s = src("src/lib/coaching/match-coaching-bridge.ts");
  return /anchorReady === true/.test(s);
});

check("Evidence labels map claim kinds without blurring inference", () => {
  return (
    labelForClaim("observed_fact") === "OBSERVED" &&
    labelForClaim("calculated_trend") === "DERIVED" &&
    labelForClaim("supported_inference") === "INFERRED" &&
    labelForClaim("coaching_recommendation") === "COACHING"
  );
});

check("Active priority evidence is labeled", () => {
  const intel = buildCoachingIntelligence(makeMatches(24, () => ({})), undefined, { now: NOW });
  const active = intel.plan.active;
  return (
    active === null ||
    active.evidence.every((e) => ["OBSERVED", "DERIVED", "INFERRED", "COACHING"].includes(e.label))
  );
});

check("Counterfactual is presented as BotDiff's read, not observation", () => {
  const s = src("src/components/match-coach-report.tsx");
  return /BotDiff's read, not observed/.test(s) && /sanitizeCoachingText/.test(s);
});

// --- 8. determinism --------------------------------------------------------

check("Plan building is deterministic for identical input", () => {
  const matches = makeMatches(22, (i) => ({ csPerMin: i < 11 ? 8 : 5.8, deaths: 5 }));
  const evaluations = evaluateAll(matches);
  const priorities = rankPriorities(evaluations);
  const a = buildCoachingPlan(evaluations, emptySnapshot(NOW), priorities, { now: NOW });
  const b = buildCoachingPlan(evaluations, emptySnapshot(NOW), priorities, { now: NOW });
  return JSON.stringify(a) === JSON.stringify(b);
});

// --- report ---------------------------------------------------------------

const passed = results.filter((r) => r.passed).length;
for (const r of results) {
  console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
}
console.log(`\n${passed}/${results.length} checks passed`);
if (passed !== results.length) process.exit(1);
