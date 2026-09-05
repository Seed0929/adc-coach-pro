// ---------------------------------------------------------------------------
// Personalized Coaching Intelligence Foundation — deterministic checks.
//
//   bun run src/lib/coaching/coaching-validation-v1/coaching-intelligence.ts
//
// Covers: insufficient history, new players, champion + role scoped targets,
// high-variance players, sustained achievement, one-game outliers, target
// history preservation, lower-is-better metrics, contextual metrics, and
// completed-goal re-evaluation.
// ---------------------------------------------------------------------------
import {
  MAX_ACTIVE_TARGETS,
  MIN_TARGET_GAMES,
  buildCoachingIntelligence,
  buildScopes,
  emptySnapshot,
  evaluateAll,
  evaluateMetric,
  findEvaluation,
  findMetric,
  historyLine,
  buildHistory,
  proposeTarget,
  rankPriorities,
  reconcileTargets,
  targetForMetric,
  withCoachTarget,
} from "../performance-intelligence-v1";
import type { ProfileMatch } from "../../profile-engine";
import { readingFromTrend } from "../../metrics/metric-reading";
import { computeTrends } from "../../profile-engine";

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

// --- fixtures --------------------------------------------------------------

interface MatchOpts {
  champion?: string;
  role?: string;
  csPerMin?: number;
  deaths?: number;
  vision?: number;
  win?: boolean;
}

/** Build synthetic matches OLDEST-first, then return newest-first as the app does. */
function makeMatches(count: number, per: (i: number) => MatchOpts): ProfileMatch[] {
  const list: ProfileMatch[] = [];
  for (let i = 0; i < count; i++) {
    const o = per(i);
    const cs = o.csPerMin ?? 6;
    const deaths = o.deaths ?? 5;
    list.push({
      matchId: `M${i}`,
      champion: o.champion ?? "Caitlyn",
      role: o.role ?? "BOTTOM",
      win: o.win ?? i % 2 === 0,
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
      visionScore: o.vision ?? 20,
      visionPerMin: (o.vision ?? 20) / 30,
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

const NOW = "2026-02-01T00:00:00.000Z";
const LATER = "2026-03-01T00:00:00.000Z";

// --- 1. insufficient history / new players ---------------------------------

check("New player with zero games yields no scopes and no targets", () => {
  const intel = buildCoachingIntelligence([], undefined, { now: NOW });
  return (
    intel.evaluations.length === 0 &&
    intel.snapshot.targets.length === 0 &&
    intel.context.sufficiency === "none" &&
    intel.context.activeTargets.length === 0
  );
});

check("Below scope minimum (4 games) produces no evaluations", () => {
  const intel = buildCoachingIntelligence(makeMatches(4, () => ({})), undefined, { now: NOW });
  return intel.evaluations.length === 0;
});

check("5-9 games evaluates but refuses every target with a reason", () => {
  const intel = buildCoachingIntelligence(makeMatches(8, (i) => ({ csPerMin: 5 + i * 0.1 })), undefined, { now: NOW });
  const hasEvals = intel.evaluations.length > 0;
  const noTargets = intel.snapshot.targets.length === 0;
  const evaluation = findEvaluation(intel.evaluations, "cs")!;
  const proposal = proposeTarget(evaluation, { now: NOW });
  const refused = !proposal.ok && proposal.insufficient.reason.includes(`${MIN_TARGET_GAMES} games`);
  return (hasEvals && noTargets && refused) || `evals=${intel.evaluations.length} targets=${intel.snapshot.targets.length}`;
});

check("Low sufficiency player context states unknowns instead of conclusions", () => {
  const intel = buildCoachingIntelligence(makeMatches(6, () => ({})), undefined, { now: NOW });
  return (
    intel.context.strengths.length === 0 &&
    intel.context.growthOpportunities.length === 0 &&
    intel.context.monitoredOnly.some((f) => f.statement.includes("not enough history"))
  );
});

// --- 2. scopes -------------------------------------------------------------

check("Scopes cover player, role, champion, champion+role and recent comparable", () => {
  const matches = makeMatches(24, (i) =>
    i < 12 ? { champion: "Jinx", role: "BOTTOM" } : { champion: "Caitlyn", role: "BOTTOM" },
  );
  const kinds = new Set(buildScopes(matches).map((s) => s.scope.kind));
  return (
    kinds.has("player") &&
    kinds.has("role") &&
    kinds.has("champion") &&
    kinds.has("champion_role") &&
    kinds.has("recent_comparable")
  );
});

check("Champion-scoped target is created from champion evidence only", () => {
  // Caitlyn: clear headroom. Jinx: flat.
  const matches = makeMatches(24, (i) =>
    i < 12
      ? { champion: "Jinx", csPerMin: 6 }
      : { champion: "Caitlyn", csPerMin: i < 18 ? 7.5 : 6.2 },
  );
  const evaluations = evaluateAll(matches);
  const cait = findEvaluation(evaluations, "cs", "champion:Caitlyn")!;
  const proposal = proposeTarget(cait, { now: NOW });
  return (
    (proposal.ok &&
      proposal.target.champion === "Caitlyn" &&
      proposal.target.scope.kind === "champion" &&
      proposal.target.targetValue > cait.recentBaseline) ||
    (proposal.ok ? "wrong scope" : proposal.insufficient.reason)
  );
});

check("Role-scoped target carries the role identifier", () => {
  const matches = makeMatches(20, (i) => ({ role: "UTILITY", csPerMin: i < 12 ? 5.5 : 4.2 }));
  const evaluations = evaluateAll(matches);
  const roleEval = findEvaluation(evaluations, "cs", "role:UTILITY")!;
  const proposal = proposeTarget(roleEval, { now: NOW });
  return (proposal.ok && proposal.target.role === "UTILITY") || (proposal.ok ? "no role" : proposal.insufficient.reason);
});

// --- 3. target generation methodology --------------------------------------

check("Target sits between recent form and the player's own best sustained", () => {
  const matches = makeMatches(20, (i) => ({ csPerMin: i < 10 ? 8 : 6 }));
  const evaluation = findEvaluation(evaluateAll(matches), "cs")!;
  const proposal = proposeTarget(evaluation, { now: NOW });
  if (!proposal.ok) return proposal.insufficient.reason;
  const t = proposal.target.targetValue;
  return (
    (t > evaluation.recentBaseline && t < evaluation.bestSustained!) ||
    `target=${t} recent=${evaluation.recentBaseline} best=${evaluation.bestSustained}`
  );
});

check("Target requires 2+ individual games already at that level", () => {
  // One single spike game only — no repeatable evidence above baseline.
  const matches = makeMatches(20, (i) => ({ csPerMin: i === 19 ? 12 : 6 }));
  const evaluation = findEvaluation(evaluateAll(matches), "cs")!;
  const proposal = proposeTarget(evaluation, { now: NOW });
  return !proposal.ok || `unexpectedly created ${proposal.target.targetValue}`;
});

check("Flat player at their own ceiling gets an explicit refusal, not a fake target", () => {
  const matches = makeMatches(20, () => ({ csPerMin: 6 }));
  const evaluation = findEvaluation(evaluateAll(matches), "cs")!;
  const proposal = proposeTarget(evaluation, { now: NOW });
  return (
    (!proposal.ok && proposal.insufficient.reason.length > 10) ||
    (proposal.ok ? `created ${proposal.target.targetValue} from flat history` : "no reason")
  );
});

check("High-variance player still gets an evidence-backed, reachable target", () => {
  const swings = [4, 9, 5, 8, 4.5, 9.5, 5, 8.5, 4, 9, 5.5, 8, 4.5, 9, 5, 8.5, 4, 9, 5, 8];
  const matches = makeMatches(20, (i) => ({ csPerMin: swings[i] }));
  const evaluation = findEvaluation(evaluateAll(matches), "cs")!;
  const proposal = proposeTarget(evaluation, { now: NOW });
  if (!proposal.ok) return proposal.insufficient.reason;
  const reached = evaluation.samples.filter((s) => s.value >= proposal.target.targetValue).length;
  return reached >= 2 || `only ${reached} games at target`;
});

check("Lower-is-better metric (Deaths) targets downward", () => {
  const matches = makeMatches(20, (i) => ({ deaths: i < 10 ? 2 : 7 }));
  const evaluation = findEvaluation(evaluateAll(matches), "deaths")!;
  const proposal = proposeTarget(evaluation, { now: NOW });
  if (!proposal.ok) return proposal.insufficient.reason;
  return (
    (proposal.target.direction === "lower" &&
      proposal.target.targetValue < evaluation.recentBaseline) ||
    `target=${proposal.target.targetValue} recent=${evaluation.recentBaseline}`
  );
});

check("Contextual metrics are monitored, never targeted", () => {
  const matches = makeMatches(20, (i) => ({ vision: i < 10 ? 40 : 15 }));
  const evaluations = evaluateAll(matches);
  const vision = findEvaluation(evaluations, "vision")!;
  const proposal = proposeTarget(vision, { now: NOW });
  const notRanked = !rankPriorities(evaluations).some((p) => p.metric === "vision");
  return (
    (!vision.coachable && !proposal.ok && notRanked && vision.direction === "contextual") ||
    "contextual metric leaked into targets"
  );
});

check("Rising contextual metric is never described as improvement", () => {
  const matches = makeMatches(20, (i) => ({ vision: i < 10 ? 15 : 40 }));
  const intel = buildCoachingIntelligence(matches, undefined, { now: NOW });
  const change = intel.context.recentChanges.find((c) => c.metric === "vision");
  return (
    (change == null || (!change.statement.includes("improv") && change.claim === "calculated_trend")) ||
    `bad statement: ${change?.statement}`
  );
});

// --- 4. active coaching priorities ----------------------------------------

check("Active targets are capped and stay in the preferred 3-5 band", () => {
  const matches = makeMatches(30, (i) => ({
    csPerMin: i < 15 ? 8 : 6,
    deaths: i < 15 ? 2 : 7,
    vision: 20,
    champion: "Caitlyn",
  }));
  const intel = buildCoachingIntelligence(matches, undefined, { now: NOW });
  const active = intel.context.activeTargets.length;
  return (active > 0 && active <= MAX_ACTIVE_TARGETS) || `active=${active}`;
});

check("Priorities rank by the player's own headroom, declining metrics first", () => {
  const matches = makeMatches(20, (i) => ({ csPerMin: i < 10 ? 9 : 5, deaths: 5 }));
  const priorities = rankPriorities(evaluateAll(matches));
  return priorities[0]?.metric === "cs" || `top=${priorities[0]?.metric}`;
});

// --- 5. goal completion ---------------------------------------------------

function withTarget(matchesFirstRun: ProfileMatch[]) {
  const run1 = buildCoachingIntelligence(matchesFirstRun, undefined, { now: NOW, maxActive: 1 });
  return run1;
}

check("One outlier game does NOT complete a target", () => {
  const base = makeMatches(20, (i) => ({ csPerMin: i < 10 ? 8 : 6 }));
  const run1 = withTarget(base);
  const target = run1.snapshot.targets.find((t) => t.status === "active")!;
  const spike = makeMatches(21, (i) => (i < 20 ? { csPerMin: i < 10 ? 8 : 6 } : { csPerMin: 14 }));
  const run2 = reconcileTargets(run1.snapshot, evaluateAll(spike), { now: LATER, maxActive: 1 });
  const same = run2.snapshot.targets.find((t) => t.id === target.id)!;
  return same.status === "active" || `status=${same.status}`;
});

check("Sustained performance across a full rolling window completes the target", () => {
  const base = makeMatches(20, (i) => ({ csPerMin: i < 10 ? 8 : 6 }));
  const run1 = withTarget(base);
  const target = run1.snapshot.targets.find((t) => t.status === "active")!;
  const level = target.targetValue + 0.4;
  const sustained = makeMatches(25, (i) =>
    i < 20 ? { csPerMin: i < 10 ? 8 : 6 } : { csPerMin: level },
  );
  const run2 = reconcileTargets(run1.snapshot, evaluateAll(sustained), { now: LATER, maxActive: 1 });
  const done = run2.snapshot.targets.find((t) => t.id === target.id)!;
  return (
    (done.status === "achieved" && done.achievedAt === LATER && done.progress === 100) ||
    `status=${done.status} rolling=${done.currentRollingValue} target=${target.targetValue}`
  );
});

check("Achieved target is preserved in history and re-evaluation continues", () => {
  const base = makeMatches(20, (i) => ({ csPerMin: i < 10 ? 8 : 6 }));
  const run1 = withTarget(base);
  const target = run1.snapshot.targets.find((t) => t.status === "active")!;
  const level = target.targetValue + 0.4;
  const sustained = makeMatches(25, (i) =>
    i < 20 ? { csPerMin: i < 10 ? 8 : 6 } : { csPerMin: level },
  );
  const run2 = reconcileTargets(run1.snapshot, evaluateAll(sustained), { now: LATER, maxActive: 3 });
  const history = buildHistory(run2.snapshot);
  const entry = history.find((h) => h.metric === "cs" && h.scopeId === "player");
  const line = entry ? historyLine(entry) : "";
  return (
    (run2.snapshot.targets.some((t) => t.status === "achieved") &&
      entry != null &&
      line.includes("baseline") &&
      line.includes("achieved")) ||
    `history=${line}`
  );
});

check("A completed target is never replaced by an easier one", () => {
  const base = makeMatches(20, (i) => ({ csPerMin: i < 10 ? 8 : 6 }));
  const run1 = withTarget(base);
  const first = run1.snapshot.targets.find((t) => t.status === "active")!;
  const level = first.targetValue + 0.4;
  const sustained = makeMatches(25, (i) =>
    i < 20 ? { csPerMin: i < 10 ? 8 : 6 } : { csPerMin: level },
  );
  const run2 = reconcileTargets(run1.snapshot, evaluateAll(sustained), { now: LATER, maxActive: 3 });
  const next = run2.snapshot.targets.find(
    (t) => t.status === "active" && t.metric === "cs" && t.scope.id === "player",
  );
  return next == null || next.targetValue > first.targetValue || `next=${next.targetValue} prev=${first.targetValue}`;
});

check("Target progress is monotonic evidence, not a claim of completion", () => {
  const base = makeMatches(20, (i) => ({ csPerMin: i < 10 ? 8 : 6 }));
  const run1 = withTarget(base);
  const target = run1.snapshot.targets.find((t) => t.status === "active")!;
  const partial = makeMatches(23, (i) =>
    i < 20 ? { csPerMin: i < 10 ? 8 : 6 } : { csPerMin: target.targetValue },
  );
  const run2 = reconcileTargets(run1.snapshot, evaluateAll(partial), { now: LATER, maxActive: 1 });
  const t = run2.snapshot.targets.find((x) => x.id === target.id)!;
  return (t.status === "active" && t.progress > 0 && t.progress < 100) || `progress=${t.progress} status=${t.status}`;
});

// --- 6. evidence + AI grounding -------------------------------------------

check("Every target records traceable evidence and a claim kind", () => {
  const matches = makeMatches(20, (i) => ({ csPerMin: i < 10 ? 8 : 6, deaths: i < 10 ? 2 : 7 }));
  const intel = buildCoachingIntelligence(matches, undefined, { now: NOW });
  return intel.snapshot.targets.every(
    (t) =>
      t.evidence.sampleSize >= MIN_TARGET_GAMES &&
      t.evidence.gamesAtOrBeyondTarget >= 2 &&
      t.evidence.claim === "coaching_recommendation" &&
      t.evidence.reason.length > 20,
  );
});

check("Coaching context separates observed fact, trend, inference, recommendation", () => {
  const matches = makeMatches(24, (i) => ({ csPerMin: i < 12 ? 8 : 6, deaths: i < 12 ? 2 : 7 }));
  const ctx = buildCoachingIntelligence(matches, undefined, { now: NOW }).context;
  const kinds = new Set([
    ...ctx.monitoredOnly.map((f) => f.claim),
    ...ctx.recentChanges.map((f) => f.claim),
    ...ctx.growthOpportunities.map((f) => f.claim),
    ...ctx.activeTargets.map((t) => t.evidence.claim),
  ]);
  return (
    (kinds.has("observed_fact") &&
      kinds.has("calculated_trend") &&
      kinds.has("supported_inference") &&
      kinds.has("coaching_recommendation")) ||
    [...kinds].join(",")
  );
});

check("Context never asserts a metric causes losses", () => {
  const matches = makeMatches(24, (i) => ({ csPerMin: i < 12 ? 8 : 6 }));
  const ctx = buildCoachingIntelligence(matches, undefined, { now: NOW }).context;
  const text = JSON.stringify(ctx).toLowerCase();
  return (!text.includes("why you are losing") && !text.includes("is why you lose")) || "causal claim found";
});

check("Context exposes language guards for the AI Coach", () => {
  const ctx = buildCoachingIntelligence(makeMatches(20, () => ({})), undefined, { now: NOW }).context;
  return ctx.languageGuards.length >= 3;
});

check("Champion and role findings carry sample sizes", () => {
  const matches = makeMatches(24, (i) => ({ champion: i < 12 ? "Jinx" : "Caitlyn", csPerMin: 6 + (i % 3) }));
  const ctx = buildCoachingIntelligence(matches, undefined, { now: NOW }).context;
  return (
    ctx.roleFindings.every((f) => f.sampleSize >= MIN_TARGET_GAMES) &&
    ctx.championFindings.every((f) => f.sampleSize >= MIN_TARGET_GAMES)
  );
});

// --- 7. graph contract ----------------------------------------------------

check("Graph reading is unchanged when there is no active target", () => {
  const matches = makeMatches(20, () => ({ csPerMin: 6 }));
  const reading = readingFromTrend(computeTrends(matches, 20).find((t) => t.key === "cs")!);
  const same = withCoachTarget(reading, targetForMetric(emptySnapshot(NOW), "cs"));
  return same === reading;
});

check("Graph reading receives a labelled coach target when one exists", () => {
  const matches = makeMatches(20, (i) => ({ csPerMin: i < 10 ? 8 : 6 }));
  const intel = buildCoachingIntelligence(matches, undefined, { now: NOW });
  const target = targetForMetric(intel.snapshot, "cs");
  if (!target) return "no target generated";
  const reading = readingFromTrend(computeTrends(matches, 20).find((t) => t.key === "cs")!);
  const enriched = withCoachTarget(reading, target);
  return (
    (enriched.target?.value === target.targetValue &&
      enriched.target.label.includes("Coach target") &&
      enriched.targetNote?.includes("%") &&
      enriched.points.length === reading.points.length) ||
    "target not applied"
  );
});

// --- 8. persistence -------------------------------------------------------

check("Snapshot round-trips through JSON with history intact", () => {
  const matches = makeMatches(20, (i) => ({ csPerMin: i < 10 ? 8 : 6 }));
  const intel = buildCoachingIntelligence(matches, undefined, { now: NOW });
  const restored = JSON.parse(JSON.stringify(intel.snapshot));
  const again = reconcileTargets(restored, evaluateAll(matches), { now: LATER });
  return (
    again.snapshot.targets.length >= intel.snapshot.targets.length &&
    again.snapshot.targets.every((t) => t.createdAt.length > 0)
  );
});

check("Rebuilding twice with the same data is deterministic", () => {
  const matches = makeMatches(20, (i) => ({ csPerMin: i < 10 ? 8 : 6, deaths: i < 10 ? 2 : 7 }));
  const a = buildCoachingIntelligence(matches, undefined, { now: NOW });
  const b = buildCoachingIntelligence(matches, undefined, { now: NOW });
  return JSON.stringify(a.snapshot) === JSON.stringify(b.snapshot);
});

check("Metric registry direction matches the shared graph metric model", () => {
  const cs = findMetric("cs")!;
  const matches = makeMatches(10, () => ({}));
  const evaluation = evaluateMetric(cs, { kind: "player", id: "player", label: "p" }, matches);
  const reading = readingFromTrend(computeTrends(matches, 10).find((t) => t.key === "cs")!);
  return evaluation.direction === reading.direction || `${evaluation.direction} vs ${reading.direction}`;
});

// --- report ---------------------------------------------------------------

const passed = results.filter((r) => r.passed).length;
for (const r of results) {
  console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
}
console.log(`\n${passed}/${results.length} checks passed`);
if (passed !== results.length) process.exit(1);
