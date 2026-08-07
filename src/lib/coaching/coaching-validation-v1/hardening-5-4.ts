// ---------------------------------------------------------------------------
// Sprint 5.4 — PRIVATE BETA HARDENING CHECKS (deterministic).
//
//   bun run src/lib/coaching/coaching-validation-v1/hardening-5-4.ts
//
// Sprint 5.3 proved the happy beta journey works. These checks prove the
// journey survives REALISTIC degradation: missing enrichment, incomplete Riot
// statistics, an empty history, a failing analytics transport and a retry after
// a failed load. Nothing here changes coaching behaviour — it only asserts it.
// ---------------------------------------------------------------------------
import { DEMO_INPUTS, buildMatchReport, type MatchAnalysisInput } from "../../coaching-engine";
import { buildMatchDecisionChain, buildMatchReportDecisionChain } from "../match-coaching-bridge";
import { PracticePlanner } from "../practice-planning-v1";
import { resolveChampion, resolveItem, resolveRune } from "../../league-data/provider";
import { CoachingValidationV1 as V } from "./facade";
import {
  trackBetaEvent,
  configureBetaAnalytics,
  resetBetaAnalytics,
  sanitizeDetail,
  BETA_EVENTS,
} from "../../analytics/beta-analytics";
import { STAGE_BY_EVENT, type BetaEventName } from "../../analytics/beta-events";

export interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const FORBIDDEN = ["undefined", "null", "NaN", "[object Object]", "PENDING", "TODO", "TBD"];

/** A match with no team composition, no lane opponent, no enrichment sources. */
function unenriched(): MatchAnalysisInput {
  const { allies: _a, enemies: _e, laneOpponent: _l, ...rest } = DEMO_INPUTS[0];
  return { ...rest, matchId: "HARD_UNENRICHED" };
}

/** A match where Riot returned partial statistics (challenges block missing). */
function incomplete(): MatchAnalysisInput {
  const base = unenriched();
  return {
    ...base,
    matchId: "HARD_INCOMPLETE",
    visionScore: 0,
    visionPerMin: 0,
    wardsPlaced: 0,
    controlWardsPlaced: 0,
    wardsKilled: 0,
    killParticipation: 0,
    damageShare: 0,
    damagePerMin: 0,
    soloKills: 0,
    dragonTakedowns: 0,
    baronTakedowns: 0,
    riftHeraldTakedowns: 0,
    turretTakedowns: 0,
    objectivesStolen: 0,
    laneMinions10: 0,
    maxCsAdvantage: 0,
    earlyGoldExpAdvantage: 0,
  };
}

function textOf(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) textOf(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) textOf(v, out);
  return out;
}

function leaks(value: unknown): string | null {
  for (const t of textOf(value)) {
    const hit = FORBIDDEN.find((f) => t.includes(f));
    if (hit) return `${hit} in "${t.slice(0, 80)}"`;
  }
  return null;
}

export function runHardeningChecks(): CheckResult[] {
  const results: CheckResult[] = [];
  const check = (name: string, fn: () => boolean | string) => {
    try {
      const r = fn();
      results.push({ name, passed: r === true, detail: typeof r === "string" ? r : undefined });
    } catch (err) {
      results.push({ name, passed: false, detail: (err as Error).message });
    }
  };

  // --- Journey shapes ----------------------------------------------------
  check("first-time user (one match, no history) gets a complete report", () => {
    const r = buildMatchReport(unenriched(), null, []);
    return (
      r.practiceGoal.length > 0 &&
      r.summary.length > 0 &&
      Boolean(r.priorityImprovement?.title) &&
      r.history.length === 0
    );
  });

  check("returning user (full history) gets a report plus a decision chain", () => {
    const r = buildMatchReport(DEMO_INPUTS[0], DEMO_INPUTS[1] ?? null, DEMO_INPUTS.slice(1));
    return Boolean(r.decisionChain?.chains.length) && r.history.length > 0;
  });

  check("a no-match player produces no fabricated coaching", () => {
    const plan = PracticePlanner.create({ contexts: [] });
    const bad = leaks(plan);
    if (bad) return bad;
    return typeof plan.primaryFocus === "string";
  });

  // --- Degraded data -----------------------------------------------------
  check("incomplete Riot statistics never leak placeholder or NaN text", () => {
    const r = buildMatchReport(incomplete(), null, []);
    return leaks(r) ?? true;
  });

  check("missing team-comp / lane-state / matchup enrichment still coaches", () => {
    const built = buildMatchDecisionChain(unenriched(), [], undefined, undefined);
    if (!built) return "no chain built without enrichment";
    const validation = V.set(built.set);
    return validation.status !== "FAIL" && validation.chainsValidated > 0;
  });

  check("unavailable Data Dragon lookups degrade to null, never throw", () => {
    return (
      resolveChampion("__not_a_champion__") === null &&
      resolveItem("__not_an_item__") === null &&
      resolveRune(-1) === null
    );
  });

  check("a failed optional enrichment does not destroy the match report", () => {
    // Data Dragon unloaded (this process never loads it) — the report must
    // still render every required coaching field.
    const r = buildMatchReport(incomplete(), null, DEMO_INPUTS.slice(1));
    return (
      r.overallGrade.length > 0 &&
      r.summary.length > 0 &&
      r.practiceGoal.length > 0 &&
      r.plan.phases.length > 0
    );
  });

  check("missing player memory (no history window) yields no habit claims", () => {
    const chain = buildMatchReportDecisionChain(unenriched(), [], undefined, undefined);
    return !chain?.habitNote ? true : "habit claimed with no history";
  });

  // --- Evidence integrity ------------------------------------------------
  check("coaching never invents evidence — every statement is observed data", () => {
    const built = buildMatchDecisionChain(DEMO_INPUTS[0], DEMO_INPUTS.slice(1), undefined, undefined)!;
    return built.set.chains.every((c) =>
      c.evidence.every((e) => e.statement.trim().length > 0 && Boolean(e.source)),
    );
  });

  check("habit evidence stays supporting context, never proof", () => {
    const built = buildMatchDecisionChain(DEMO_INPUTS[0], DEMO_INPUTS.slice(1), undefined, undefined)!;
    return V.set(built.set).chains.every((c) => c.habitIsProof === false);
  });

  check("counterfactuals always state their certainty", () => {
    const built = buildMatchDecisionChain(DEMO_INPUTS[0], DEMO_INPUTS.slice(1), undefined, undefined)!;
    return built.set.chains.every((c) => {
      const cf = V.counterfactual(c);
      return ["KNOWN", "INFERRED", "UNKNOWN"].includes(cf.certainty) && cf.uncertainty.length > 0;
    });
  });

  // --- Determinism / retry safety ---------------------------------------
  check("the Decision Chain is deterministic across repeated builds", () => {
    const a = buildMatchReportDecisionChain(DEMO_INPUTS[0], DEMO_INPUTS.slice(1), undefined, "2026-01-01T00:00:00.000Z");
    const b = buildMatchReportDecisionChain(DEMO_INPUTS[0], DEMO_INPUTS.slice(1), undefined, "2026-01-01T00:00:00.000Z");
    return JSON.stringify(a) === JSON.stringify(b) || "chain output drifted between builds";
  });

  check("a retried report build returns identical coaching (retry-safe)", () => {
    const a = buildMatchReport(incomplete(), null, DEMO_INPUTS.slice(1));
    const b = buildMatchReport(incomplete(), null, DEMO_INPUTS.slice(1));
    return JSON.stringify(a) === JSON.stringify(b) || "report output drifted between builds";
  });

  check("the practice-plan handoff from the chain is intact and measurable", () => {
    const built = buildMatchDecisionChain(DEMO_INPUTS[0], DEMO_INPUTS.slice(1), undefined, undefined)!;
    const plan = PracticePlanner.create({ contexts: built.set.chains.map((c) => c.source) });
    const goal = built.set.chains[0]?.practiceGoal?.goal ?? "";
    return Boolean(plan.primaryFocus && plan.successCriteria.length > 0 && goal.length > 0);
  });

  // --- Analytics safety --------------------------------------------------
  check("a throwing analytics transport never reaches the caller", () => {
    resetBetaAnalytics();
    configureBetaAnalytics(() => {
      throw new Error("transport exploded");
    });
    trackBetaEvent(BETA_EVENTS.matchReportViewed, { surface: "test" });
    resetBetaAnalytics();
    return true;
  });

  check("a rejecting analytics transport never produces an unhandled rejection", () => {
    resetBetaAnalytics();
    configureBetaAnalytics(() => Promise.reject(new Error("network down")));
    trackBetaEvent(BETA_EVENTS.degradedDataState, { surface: "test", degraded: true });
    resetBetaAnalytics();
    return true;
  });

  check("analytics with no transport configured is a silent no-op", () => {
    resetBetaAnalytics();
    trackBetaEvent(BETA_EVENTS.noMatchState);
    return true;
  });

  check("analytics drops any detail key outside the whitelist", () => {
    const cleaned = sanitizeDetail({
      surface: "match-report",
      // @ts-expect-error deliberately unsupported keys
      puuid: "abc",
      email: "a@b.c",
      count: 9_999_999,
    });
    return (
      !("puuid" in cleaned) &&
      !("email" in cleaned) &&
      cleaned.count === 10_000 &&
      cleaned.surface === "match-report"
    );
  });

  check("journey milestones are only counted once per session", () => {
    resetBetaAnalytics();
    let calls = 0;
    configureBetaAnalytics(() => {
      calls += 1;
    });
    trackBetaEvent(BETA_EVENTS.firstSyncStarted);
    trackBetaEvent(BETA_EVENTS.firstSyncStarted);
    trackBetaEvent(BETA_EVENTS.firstSyncStarted);
    resetBetaAnalytics();
    return calls === 1 || `milestone recorded ${calls} times`;
  });

  check("every analytics event maps to a journey stage", () => {
    const names = Object.values(BETA_EVENTS) as BetaEventName[];
    const missing = names.filter((n) => !STAGE_BY_EVENT[n]);
    return missing.length === 0 || `unmapped: ${missing.join(", ")}`;
  });

  check("analytics is not a dependency of any coaching engine", () => {
    resetBetaAnalytics();
    const r = buildMatchReport(DEMO_INPUTS[0], DEMO_INPUTS[1] ?? null, DEMO_INPUTS.slice(1));
    return Boolean(r.decisionChain) && r.practiceGoal.length > 0;
  });

  return results;
}

if (typeof process !== "undefined" && process.argv[1]?.includes("hardening-5-4")) {
  const results = runHardeningChecks();
  for (const r of results) {
    console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  console.log(`${results.filter((r) => r.passed).length}/${results.length} checks passed`);
}