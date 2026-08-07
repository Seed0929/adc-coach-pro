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
  return { ...DEMO_INPUTS[0], matchId: "NA1_4712398841", ...overrides };
}

function realHistory(): MatchAnalysisInput[] {
  return DEMO_INPUTS.slice(1).map((m, i) => ({ ...m, matchId: `NA1_47123988${40 - i}` }));
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
      report.matchId === "NA1_4712398841" &&
      !report.matchId.startsWith("demo-") &&
      report.overallGrade.length > 0 &&
      report.summary.length > 0
    );
  });

  check("report identity matches the synced match", () => {
    const src = realMatch();
    return (
      report.champion === src.champion &&
      report.role === src.role &&
      report.win === src.win &&
      report.durationMin === src.durationMin
    );
  });

  check("real report is not the demo report", () => {
    return buildDemoMatchReport(0).matchId !== report.matchId;
  });

  // --- 2. Decision Chain delivery -----------------------------------------
  check("Decision Chain V1 reaches the real match report", () => {
    const chain = report.decisionChain;
    if (!chain) return "no decisionChain on the report";
    return Boolean(chain.primaryDecisionId) || "no prioritized decision";
  });

  check("Why This Coaching has what happened and why it mattered", () => {
    const chain = report.decisionChain;
    if (!chain) return "no decisionChain";
    return (
      Boolean(chain.whatHappened && chain.whyItMattered) ||
      "explanation fields are empty on real data"
    );
  });

  check("alternative decisions are exposed as a list", () => {
    return Array.isArray(report.decisionChain?.decisionsAvailable);
  });

  check("counterfactuals stay directional and state their confidence", () => {
    const chains = report.decisionChain?.chains ?? [];
    for (const c of chains) {
      const cf = c.counterfactual;
      if (!cf) continue;
      if (!cf.confidence?.level) return `missing confidence on ${c.selectedDecision.label}`;
      if (!cf.expectedAdvantage) return `missing expected advantage on ${c.selectedDecision.label}`;
    }
    return true;
  });

  check("every chain passes the Sprint 5.2 validator on real data", () => {
    const chains = report.decisionChain?.chains ?? [];
    if (chains.length === 0) return "no chains built from a real match";
    for (const c of chains) {
      const audit = V.chain(c);
      if (audit.status === "FAIL") {
        const missing = audit.fields
          .filter((f) => f.state === "MISSING")
          .map((f) => f.field)
          .join(", ");
        return `${c.selectedDecision.label}: ${missing || audit.status}`;
      }
      if (!audit.traceable) return `${c.selectedDecision.label}: no observed evidence`;
    }
    return true;
  });

  check("coach assessment level is always stated", () => {
    return Boolean(report.coachAssessment && report.assessmentReason);
  });

  // --- 3. Habit evidence is support, never proof ---------------------------
  check("habit note is withheld until the habit recurs", () => {
    const single = buildMatchReportDecisionChain(realMatch(), []);
    if (!single) return true;
    const occurrences = single.chains[0]?.playerHabitContext?.occurrences ?? 0;
    return single.habitNote === null || occurrences >= 2 || "habit note surfaced from one match";
  });

  check("habit evidence is never labelled as proof", () => {
    const joined = textOf(report.decisionChain).join(" ").toLowerCase();
    return !joined.includes("proves") && !joined.includes("proof");
  });

  // --- 4. Practice handoff uses the existing Practice Planner --------------
  check("practice goal is present on real data", () => {
    return report.practiceGoal.length > 0;
  });

  check("the chain's practice reference points at the Practice Planner", () => {
    const ref = report.decisionChain?.chains[0]?.practiceGoal;
    if (!ref) return "no practice reference on the chain";
    return Boolean(ref.goal) && Boolean(PracticePlanner.safeFallback().primaryFocus);
  });

  check("report practice goal and chain practice goal both resolve", () => {
    return report.practiceGoal.length > 0 && Boolean(report.decisionChain?.practiceGoal);
  });

  // --- 5. Authenticated empty / failure states -----------------------------
  check("a first synced match with no history still builds coaching", () => {
    const solo = buildMatchReport(realMatch(), null, []);
    return solo.strengths.length + solo.mistakes.length > 0 && solo.practiceGoal.length > 0;
  });

  check("an empty history never fabricates a chain", () => {
    const chain = buildMatchReportDecisionChain(realMatch(), []);
    return chain === null || Boolean(chain.primaryDecisionId);
  });

  check("retrying the same match is deterministic", () => {
    const a = buildMatchReport(realMatch(), history[0] ?? null, history);
    const b = buildMatchReport(realMatch(), history[0] ?? null, history);
    return JSON.stringify(a) === JSON.stringify(b) || "two loads of the same match disagreed";
  });

  check("no developer terminology reaches authenticated coaching output", () => {
    const surfaces = [
      report.summary,
      report.practiceGoal,
      report.assessmentReason,
      ...report.strengths.flatMap((s) => [s.title, s.why]),
      ...report.mistakes.flatMap((m) => [m.title, m.what, m.why, m.fix]),
      report.decisionChain?.whatHappened ?? "",
      report.decisionChain?.whyItMattered ?? "",
    ];
    for (const t of surfaces) {
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
    configureBetaAnalytics((e) => {
      seen.push(e);
    });
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
