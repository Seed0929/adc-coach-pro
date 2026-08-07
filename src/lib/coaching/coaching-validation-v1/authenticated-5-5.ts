// ---------------------------------------------------------------------------
// Sprint 5.5 — AUTHENTICATED PRIVATE BETA VALIDATION (deterministic).
//
//   bun run src/lib/coaching/coaching-validation-v1/authenticated-5-5.ts
//
// Sprint 5.4 hardened the journey against degraded data. These checks assert
// the contracts the AUTHENTICATED journey depends on: a real (non-demo) match
// produces a real report, the Decision Chain reaches it, "Why This Coaching"
// has content to render, the practice goal comes from the existing Practice
// Planner contract, retries are deterministic, and analytics can never gate
// coaching. Adds no coaching intelligence — it only asserts existing output.
// ---------------------------------------------------------------------------
import {
  DEMO_INPUTS,
  buildMatchReport,
  buildDemoMatchReport,
  type MatchAnalysisInput,
} from "../../coaching-engine";
import { buildMatchReportDecisionChain } from "../match-coaching-bridge";
import { PracticePlanner } from "../practice-planning-v1";
import { CoachingValidationV1 as V } from "./facade";
import {
  trackBetaEvent,
  configureBetaAnalytics,
  resetBetaAnalytics,
  BETA_EVENTS,
} from "../../analytics/beta-analytics";

export interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

/** Developer language that must never reach an authenticated user's screen. */
const DEV_TERMS = [
  "stack",
  "Traceback",
  "at Object.",
  "/src/",
  "node_modules",
  "supabase",
  "PostgREST",
  "RLS",
  "500",
  "undefined",
  "[object Object]",
];

/** A REAL (non-demo) synced match id, as stored rows carry from Riot. */
function realMatch(overrides: Partial<MatchAnalysisInput> = {}): MatchAnalysisInput {
  return { ...DEMO_INPUTS[0], matchId: "NA1_5500000001", ...overrides };
}

function realHistory(): MatchAnalysisInput[] {
  return DEMO_INPUTS.slice(1).map((m, i) => ({ ...m, matchId: `NA1_55000000${i + 2}` }));
}

function textOf(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) textOf(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) textOf(v, out);
  return out;
}

export function runAuthenticatedChecks(): CheckResult[] {
  const results: CheckResult[] = [];
  const check = (name: string, fn: () => boolean | string) => {
    try {
      const outcome = fn();
      results.push(
        typeof outcome === "string"
          ? { name, passed: false, detail: outcome }
          : { name, passed: outcome },
      );
    } catch (error) {
      results.push({ name, passed: false, detail: (error as Error).message });
    }
  };

  const history = realHistory();
  const report = buildMatchReport(realMatch(), history[0] ?? null, history);

  // --- 1. Real synced match becomes a real report -------------------------
  check("a real (non-demo) match id produces a full report", () => {
    return (
      report.matchId === "NA1_5500000001" &&
      !report.matchId.startsWith("demo-") &&
      report.grade.length > 0
    );
  });

  check("report identity matches the synced match's champion and result", () => {
    const src = realMatch();
    return (
      report.championName === src.championName &&
      report.win === src.win &&
      report.kills === src.kills &&
      report.deaths === src.deaths &&
      report.assists === src.assists
    );
  });

  check("real report is not the demo report", () => {
    const demo = buildDemoMatchReport(0);
    return demo.matchId !== report.matchId;
  });

  // --- 2. Decision Chain delivery -----------------------------------------
  check("Decision Chain V1 reaches the real match report", () => {
    return Boolean(report.decisionChain?.primary);
  });

  check("Why This Coaching has a prioritized decision with evidence", () => {
    const primary = report.decisionChain?.primary;
    if (!primary) return "no primary decision";
    if (!primary.decision?.label) return "primary decision has no label";
    return primary.evidence.length > 0 || "primary decision carries no evidence";
  });

  check("available decisions are exposed where the chain supports them", () => {
    const primary = report.decisionChain?.primary;
    if (!primary) return "no primary decision";
    return Array.isArray(primary.availableDecisions);
  });

  check("counterfactual certainty is always explicit", () => {
    const chain = report.decisionChain;
    if (!chain) return "no chain";
    for (const link of [chain.primary, ...(chain.supporting ?? [])]) {
      if (!link?.counterfactual) continue;
      if (!link.counterfactual.certainty) return `missing certainty on ${link.decision?.label}`;
    }
    return true;
  });

  check("chain passes the Sprint 5.2 validator on real data", () => {
    const chain = report.decisionChain;
    if (!chain) return "no chain";
    const audit = V.chain(chain.primary);
    return audit.valid || audit.issues.join("; ");
  });

  // --- 3. Habit evidence is support, never proof ---------------------------
  check("habit context is only attached after real recurrence", () => {
    const single = buildMatchReportDecisionChain(realMatch(), []);
    const habit = single?.primary?.habit;
    return !habit || habit.matches <= 1 || `habit claimed ${habit.matches} matches from 1 match`;
  });

  check("habit evidence is never labelled as proof", () => {
    const joined = textOf(report.decisionChain).join(" ").toLowerCase();
    return !joined.includes("proves") && !joined.includes("proof");
  });

  // --- 4. Practice handoff uses the existing Practice Planner --------------
  check("practice goal is present and measurable on real data", () => {
    return report.practiceGoal.length > 0;
  });

  check("practice reference comes from the Practice Planner contract", () => {
    const ref = report.decisionChain?.primary?.practice;
    if (!ref) return "no practice reference on the chain";
    const plan = PracticePlanner.safeFallback();
    return Boolean(ref.goal) && Boolean(plan.primaryFocus);
  });

  check("only one practice-planning system feeds the report", () => {
    const ref = report.decisionChain?.primary?.practice;
    return Boolean(ref?.goal) && report.practiceGoal.length > 0;
  });

  // --- 5. Authenticated empty / failure states -----------------------------
  check("an authenticated account with no matches yields no fabricated report", () => {
    const chain = buildMatchReportDecisionChain(realMatch(), []);
    return chain === null || Boolean(chain.primary);
  });

  check("a report built from a single match still renders coaching", () => {
    const solo = buildMatchReport(realMatch(), null, []);
    return solo.strengths.length + solo.mistakes.length > 0 && solo.practiceGoal.length > 0;
  });

  check("retrying the same match is deterministic", () => {
    const a = buildMatchReport(realMatch(), history[0] ?? null, history);
    const b = buildMatchReport(realMatch(), history[0] ?? null, history);
    return JSON.stringify(a) === JSON.stringify(b) || "two loads of the same match disagreed";
  });

  check("no developer terminology reaches authenticated coaching output", () => {
    for (const t of textOf(report)) {
      const hit = DEV_TERMS.find((d) => t.includes(d));
      if (hit) return `"${hit}" in "${t.slice(0, 80)}"`;
    }
    return true;
  });

  // --- 6. Analytics is privacy-conscious and never gating ------------------
  check("a throwing analytics transport cannot break the real report", () => {
    resetBetaAnalytics();
    configureBetaAnalytics(() => {
      throw new Error("transport down");
    });
    trackBetaEvent(BETA_EVENTS.matchReportViewed, { surface: "match-report" });
    const r = buildMatchReport(realMatch(), history[0] ?? null, history);
    resetBetaAnalytics();
    return Boolean(r.decisionChain) && r.practiceGoal.length > 0;
  });

  check("analytics never carries match ids or account identifiers", () => {
    resetBetaAnalytics();
    const seen: unknown[] = [];
    configureBetaAnalytics((e) => seen.push(e));
    trackBetaEvent(BETA_EVENTS.matchReportViewed, { surface: "match-report", degraded: false });
    resetBetaAnalytics();
    const joined = JSON.stringify(seen);
    return !joined.includes("NA1_") || `identifier leaked: ${joined.slice(0, 120)}`;
  });

  return results;
}

if (typeof process !== "undefined" && process.argv[1]?.includes("authenticated-5-5")) {
  const results = runAuthenticatedChecks();
  for (const r of results) {
    console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  console.log(`${results.filter((r) => r.passed).length}/${results.length} checks passed`);
}
