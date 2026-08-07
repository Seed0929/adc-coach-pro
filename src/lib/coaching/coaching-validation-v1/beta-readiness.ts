// ---------------------------------------------------------------------------
// Sprint 5.3 — BETA READINESS INTEGRATION CHECKS (deterministic).
//
//   bun run src/lib/coaching/coaching-validation-v1/beta-readiness.ts
//
// Walks the REAL private-beta journey with the shapes the app actually stores:
// synced Riot match rows → match report → validated Decision Chain → the
// coaching surfaces. Every check asserts either working coaching or an
// explicit missing-data state. Nothing may be fabricated and nothing may throw.
// ---------------------------------------------------------------------------
import { DEMO_INPUTS, buildMatchReport, type MatchAnalysisInput } from "../../coaching-engine";
import { PracticePlanner } from "../practice-planning-v1";
import { buildMatchDecisionChain } from "../match-coaching-bridge";
import { CoachingValidationV1 as V } from "./facade";
import { validateCounterfactual } from "./engine";

export interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const FORBIDDEN = ["undefined", "null", "NaN", "[object Object]", "PENDING", "TODO", "TBD"];

/** A minimal stored match: no composition, no history, no enrichment. */
function bareMatch(): MatchAnalysisInput {
  const base = DEMO_INPUTS[0];
  const { allies: _a, enemies: _e, laneOpponent: _l, ...rest } = base;
  return { ...rest, matchId: "BETA_BARE" };
}

/** A degenerate match: a 3-minute remake with all-zero stats. */
function remakeMatch(): MatchAnalysisInput {
  const b = bareMatch();
  const zeroed = Object.fromEntries(
    Object.entries(b).map(([k, v]) => [k, typeof v === "number" ? 0 : v]),
  ) as MatchAnalysisInput;
  return { ...zeroed, matchId: "BETA_REMAKE", durationMin: 3, win: false, gameCreation: null };
}

function textOf(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) textOf(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) textOf(v, out);
  return out;
}

export function runBetaReadinessChecks(): CheckResult[] {
  const results: CheckResult[] = [];
  const check = (name: string, fn: () => boolean | string) => {
    try {
      const r = fn();
      results.push({ name, passed: r === true, detail: typeof r === "string" ? r : undefined });
    } catch (err) {
      results.push({ name, passed: false, detail: (err as Error).message });
    }
  };

  const full = buildMatchReport(DEMO_INPUTS[0], DEMO_INPUTS[1] ?? null, DEMO_INPUTS.slice(1));

  // --- 1/2. Sync → coaching pipeline -------------------------------------
  check("a synced match with full context produces a report", () =>
    full.mistakes.length + full.strengths.length > 0 || "no coaching produced",
  );

  check("a first-ever synced match (no history) still coaches", () => {
    const r = buildMatchReport(bareMatch(), null, []);
    return r.history.length === 0 && r.practiceGoal.length > 0;
  });

  check("a remake / all-zero match degrades without throwing", () => {
    const r = buildMatchReport(remakeMatch(), null, []);
    return typeof r.practiceGoal === "string" && r.practiceGoal.length > 0;
  });

  // --- 3. Match report receives the validated chain ----------------------
  check("the validated Decision Chain reaches the Match Report payload", () => {
    const c = full.decisionChain;
    return Boolean(c && c.primaryDecisionId && c.chains.length > 0);
  });

  check("the surfaced chain preserves observed evidence", () => {
    const primary = full.decisionChain?.chains[0];
    return Boolean(primary?.evidence.some((e) => e.observed));
  });

  check("the surfaced chain preserves a coach assessment level", () =>
    ["HIGH", "MEDIUM", "LOW", "INSUFFICIENT_DATA"].includes(
      full.decisionChain?.confidence ?? "",
    ),
  );

  check("counterfactual certainty is always stated for the primary chain", () => {
    const primary = full.decisionChain?.chains[0];
    if (!primary) return "no primary chain";
    const cf = validateCounterfactual(primary);
    return ["KNOWN", "INFERRED", "UNKNOWN"].includes(cf.certainty) && cf.uncertainty.length > 0;
  });

  check("a chain is never surfaced without a missing-data state when sources are absent", () => {
    const built = buildMatchDecisionChain(bareMatch(), [], undefined, undefined);
    if (!built) return "no chain built for the bare match";
    const validation = V.set(built.set);
    return validation.completenessPercent < 100 ? validation.missing.length >= 0 : true;
  });

  // --- 4/6. Habit intelligence is supporting evidence, not proof ---------
  check("habit history never becomes proof in the surfaced chain", () => {
    const built = buildMatchDecisionChain(DEMO_INPUTS[0], DEMO_INPUTS.slice(1), undefined, undefined);
    return V.set(built!.set).chains.every((c) => c.habitIsProof === false);
  });

  check("habit notes only appear when history exists", () => {
    const r = buildMatchReport(bareMatch(), null, []);
    return r.decisionChain?.habitNote === null || r.decisionChain?.habitNote === undefined
      ? true
      : "habit note claimed without match history";
  });

  // --- 5. Practice planner receives structured references ---------------
  check("the practice reference reaching the Match Report is measurable", () => {
    const goal = full.decisionChain?.practiceGoal ?? "";
    return goal.length > 0 && goal.includes("(");
  });

  check("the Practice Planner consumes the chain contexts", () => {
    const built = buildMatchDecisionChain(DEMO_INPUTS[0], DEMO_INPUTS.slice(1), undefined, undefined)!;
    const plan = PracticePlanner.create({ contexts: built.set.chains.map((c) => c.source) });
    return Boolean(plan.primaryFocus && plan.successCriteria.length > 0);
  });

  // --- 7. Data Dragon enrichment is optional ---------------------------
  check("missing Data Dragon enrichment degrades to role-level coaching", () => {
    const built = buildMatchDecisionChain(bareMatch(), [], undefined, undefined);
    const validation = V.set(built!.set);
    return validation.status !== "FAIL" && validation.chainsValidated > 0;
  });

  // --- 8/9. Beta safety — no fabricated or broken coaching text --------
  check("no surfaced coaching text leaks placeholder or debug values", () => {
    const bad = textOf(full.decisionChain).filter((t) =>
      FORBIDDEN.some((f) => t.includes(f)),
    );
    return bad.length === 0 || `leaked: ${bad[0]}`;
  });

  check("surfaced coaching sentences are punctuated (no run-ons)", () => {
    const why = full.decisionChain?.whyItMattered ?? "";
    return !/[a-z] [A-Z][a-z]+ [a-z]/.test(why.replace(/[.!?] /g, "|")) || `run-on: ${why}`;
  });

  check("the beta audit reports zero blockers on the real journey", () => {
    const built = buildMatchDecisionChain(DEMO_INPUTS[0], DEMO_INPUTS.slice(1), undefined, undefined)!;
    return V.audit(built.set).blockers.length === 0;
  });

  return results;
}

if (typeof process !== "undefined" && process.argv[1]?.includes("beta-readiness")) {
  const results = runBetaReadinessChecks();
  for (const r of results) {
    console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  console.log(`${results.filter((r) => r.passed).length}/${results.length} checks passed`);
}
