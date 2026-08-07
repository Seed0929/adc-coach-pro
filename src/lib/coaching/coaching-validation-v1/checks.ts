// ---------------------------------------------------------------------------
// Sprint 5.2 — END-TO-END COACHING VALIDATION (deterministic self-checks).
//
//   bun run src/lib/coaching/coaching-validation-v1/checks.ts
//
// Proves the REAL data path works: stored Riot match stats → match timeline →
// prioritization → unified context → decision chain → validation → the three
// coaching surfaces (Match Report, Replay Coach, Practice Planner) and the
// future AI Coach payload. Every scenario is exercised with and without the
// optional enrichment layers.
// ---------------------------------------------------------------------------
import { DEMO_INPUTS, buildMatchReport, type MatchAnalysisInput } from "../../coaching-engine";
import { buildMatchDecisionChain, buildMatchReportDecisionChain } from "../match-coaching-bridge";
import { runCoachingPipeline, type CoachingIssue } from "../coaching-pipeline";
import { prioritizeDecisions } from "../decision-priority-engine";
import { buildUnifiedCoachingContext } from "../unified-coaching-context";
import { buildLaneState } from "../lane-state-intelligence-v1";
import { PracticePlanner } from "../practice-planning-v1";
import { ReplayEngine } from "../replay-intelligence-v1";
import { createHabitEngine } from "../habit-intelligence";
import { createPlayerMemoryLedger } from "../player-memory-ledger";
import { DecisionChainV1 as DC } from "../decision-chain-v1";
import type { DecisionChainInput } from "../decision-chain-v1";
import { CoachingValidationV1 as V } from "./facade";
import type { RoleId } from "../knowledge-base/templates/champion";

export interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const NOW = "2026-01-01T00:00:00.000Z";
const ROLES: RoleId[] = ["top", "jungle", "mid", "adc", "support"];
const ROLE_LABELS: Record<RoleId, string> = {
  top: "Top",
  jungle: "Jungle",
  mid: "Mid",
  adc: "Bot / ADC",
  support: "Support",
};

const match = (index = 0): MatchAnalysisInput => DEMO_INPUTS[index % DEMO_INPUTS.length];
const history = (from = 1): MatchAnalysisInput[] => DEMO_INPUTS.slice(from);

const asRole = (m: MatchAnalysisInput, role: RoleId): MatchAnalysisInput => ({
  ...m,
  role: ROLE_LABELS[role],
});

const ISSUES: CoachingIssue[] = [
  {
    id: "wave-recall",
    label: "Late recalls after crashing the wave",
    kind: "weakness",
    evidence: "You stayed for one extra wave in 4 of your last 6 games.",
    impact: "high",
  },
  {
    id: "objective-positioning",
    label: "Out of position before objectives",
    kind: "weakness",
    evidence: "You died before 3 of the last 5 dragons.",
    impact: "medium",
  },
  {
    id: "damage-share",
    label: "High damage share in teamfights",
    kind: "strength",
    evidence: "You led your team in damage in 4 of 6 games.",
    impact: "medium",
  },
];

/** Synthetic scenario input, used for the context-level matrix (Step 3). */
function scenario(
  role: RoleId,
  opts: {
    champion?: string;
    laneState?: boolean;
    items?: boolean;
    runes?: boolean;
    habits?: boolean;
    memory?: boolean;
    evidence?: boolean;
    practice?: boolean;
  } = {},
): DecisionChainInput {
  const pipeline = runCoachingPipeline(ISSUES, role, opts.champion);
  const priorities = prioritizeDecisions({
    issues: ISSUES.map((i) => ({
      ...i,
      evidenceData: { games: 4, total: 6, streak: 2, lossGames: 3, sentences: [i.evidence ?? ""] },
    })),
    role,
    champion: opts.champion,
    gamesAnalyzed: 6,
  });
  const laneState = opts.laneState
    ? buildLaneState({
        role,
        gameTimeSeconds: 420,
        player: { champion: opts.champion ?? "Jinx", level: 8, gold: 2400, health: 900, maxHealth: 1000 },
        enemy: { champion: "Caitlyn", level: 7, gold: 1900, health: 400, maxHealth: 1000 },
        wave: { state: "CRASHING", size: "LARGE" },
      })
    : undefined;

  const contexts = pipeline.contexts.map((c, order) =>
    buildUnifiedCoachingContext(c, {
      order,
      rank: order === 0 ? "primary" : order === 1 ? "secondary" : "unranked",
      prioritized: priorities.ranked.find((r) => r.id === c.issue.id),
      habitContext: pipeline.habitContexts.find((h) => h.decisionId === c.issue.id),
      laneState,
    }),
  );

  const habitEngine = createHabitEngine();
  if (opts.habits || opts.memory) {
    habitEngine.record(contexts, { matchId: "m1", timestamp: NOW });
    habitEngine.record(contexts, { matchId: "m2", timestamp: NOW });
    habitEngine.record(contexts, { matchId: "m3", timestamp: NOW });
  }
  const ledger = createPlayerMemoryLedger({ playerId: "player-1", habitEngine, now: () => NOW });
  if (opts.memory) ledger.update();

  const input: DecisionChainInput = {
    contexts,
    priorities,
    matchId: "EUW1_TEST",
    playerId: "player-1",
    champion: opts.champion,
    laneState,
    itemIds: opts.items ? ["3031", "3006"] : undefined,
    runeIds: opts.runes ? ["8008"] : undefined,
    habits: opts.habits || opts.memory ? habitEngine.getHabits() : undefined,
    memories: opts.memory ? ledger.get() : undefined,
    memorySummary: opts.memory ? ledger.getSummary() : undefined,
    evidenceByDecisionId: opts.evidence
      ? {
          "wave-recall": [
            {
              id: "e1",
              kind: "match-event",
              statement: "Wave crashed at 7:10 and you recalled at 7:52.",
              source: "riot-data",
              observed: true,
              timestampSeconds: 430,
              matchId: "EUW1_TEST",
            },
            {
              id: "e2",
              kind: "gold",
              statement: "You backed with 1480 gold and bought nothing new.",
              source: "riot-data",
              observed: true,
              timestampSeconds: 470,
              matchId: "EUW1_TEST",
            },
          ],
        }
      : undefined,
    timestampsByDecisionId: opts.evidence ? { "wave-recall": 430 } : undefined,
    now: NOW,
  };

  if (opts.practice) {
    return {
      ...input,
      practicePlan: PracticePlanner.create({ contexts, priorities, now: NOW }),
    };
  }
  return input;
}

export function runCoachingValidationChecks(): CheckResult[] {
  const results: CheckResult[] = [];
  const check = (name: string, fn: () => boolean | string) => {
    try {
      const r = fn();
      results.push(typeof r === "string" ? { name, passed: false, detail: r } : { name, passed: r });
    } catch (e) {
      results.push({ name, passed: false, detail: String(e) });
    }
  };

  // --- Step 1/2 — real end-to-end path -----------------------------------
  check("real match data reaches the decision chain", () => {
    const built = buildMatchDecisionChain(match(), history(), undefined, NOW);
    return Boolean(built && built.set.chains.length > 0 && built.set.matchId === match().matchId);
  });

  check("chain evidence is observed Riot match data, not knowledge only", () => {
    const built = buildMatchDecisionChain(match(), history(), undefined, NOW)!;
    const v = V.set(built.set);
    return v.sources.observedEvidence && (v.primary?.observedEvidenceCount ?? 0) >= 2;
  });

  check("end-to-end validation of a real match passes the contract", () => {
    const built = buildMatchDecisionChain(match(), history(), undefined, NOW)!;
    const v = V.set(built.set);
    const p = v.primary!;
    const need = ["decision", "evidence", "context", "priority", "fundamental", "explanation", "practiceReference"];
    return need.every((f) => p.fields.find((x) => x.field === f)?.state !== "MISSING") && v.status !== "FAIL";
  });

  check("verified data path is reported in architecture order", () => {
    const built = buildMatchDecisionChain(match(), history(), undefined, NOW)!;
    const path = V.set(built.set).dataPath;
    return (
      path.includes("riot-data") &&
      path.indexOf("unified-context") < path.indexOf("decision-priority") &&
      path.indexOf("decision-priority") <= path.indexOf("practice-planner")
    );
  });

  // --- Step 3 — context levels A..H ---------------------------------------
  check("A. role only degrades gracefully", () => {
    const set = DC.build(scenario("adc"));
    const v = V.set(set);
    return set.chains.length === 3 && v.sources.role && !v.sources.champion && v.status !== "FAIL";
  });

  check("B. role + champion", () => {
    const v = V.set(DC.build(scenario("adc", { champion: "Jinx" })));
    return v.champion === "Jinx" && v.sources.champion;
  });

  check("C. role + champion + matchup context", () => {
    const set = DC.build(scenario("adc", { champion: "Jinx", laneState: true }));
    return set.primary!.gameContext.laneStateObserved === true;
  });

  check("D. role + champion + items + runes", () => {
    const v = V.set(DC.build(scenario("adc", { champion: "Jinx", items: true, runes: true })));
    return v.sources.items && v.sources.runes;
  });

  check("E. role + champion + lane state", () => {
    const v = V.set(DC.build(scenario("mid", { champion: "Ahri", laneState: true })));
    return v.sources.laneState && v.status !== "FAIL";
  });

  check("F. full context", () => {
    const v = V.set(
      DC.build(
        scenario("adc", {
          champion: "Jinx",
          laneState: true,
          items: true,
          runes: true,
          evidence: true,
          practice: true,
        }),
      ),
    );
    return v.completenessPercent >= 60 && v.status !== "FAIL";
  });

  check("G. full context + player habits", () => {
    const v = V.set(
      DC.build(scenario("adc", { champion: "Jinx", laneState: true, evidence: true, habits: true })),
    );
    return v.sources.habits && v.primary!.habitSupporting && v.primary!.habitIsProof === false;
  });

  check("H. full context + player memory", () => {
    const v = V.set(
      DC.build(
        scenario("adc", { champion: "Jinx", laneState: true, evidence: true, habits: true, memory: true }),
      ),
    );
    return v.sources.playerMemory && v.primary!.memoryEnriches && v.primary!.memoryOverrides === false;
  });

  // --- Step 4 — prioritization -------------------------------------------
  check("prioritization engine remains the single source of truth", () => {
    const input = scenario("adc");
    const set = DC.build(input);
    return set.chains.every((c) => c.decisionPriority === c.source.decisionPriority.priority);
  });

  check("prioritization is deterministic across runs", () => {
    const a = DC.build(scenario("adc")).chains.map((c) => `${c.source.decision.decisionId}:${c.decisionPriority}`);
    const b = DC.build(scenario("adc")).chains.map((c) => `${c.source.decision.decisionId}:${c.decisionPriority}`);
    return a.join("|") === b.join("|");
  });

  check("high-impact recurring problems outrank cosmetic ones", () => {
    const issues: CoachingIssue[] = [
      { id: "wave-recall", label: "Late recalls", kind: "weakness", evidence: "4 of 6 games", impact: "high" },
      { id: "vision-control-wards", label: "Few control wards", kind: "weakness", evidence: "1 of 6 games", impact: "low" },
    ];
    const ranked = prioritizeDecisions({
      issues: [
        { ...issues[0], evidenceData: { games: 5, total: 6, streak: 3, lossGames: 4 } },
        { ...issues[1], evidenceData: { games: 1, total: 6, streak: 0, lossGames: 0 } },
      ],
      role: "adc",
      gamesAnalyzed: 6,
    }).ranked;
    return ranked[0].id === "wave-recall";
  });

  check("a single bad outcome does not become the coaching priority", () => {
    const ranked = prioritizeDecisions({
      issues: [
        {
          id: "teamfight-positioning",
          label: "One bad fight",
          kind: "weakness",
          evidence: "Happened once.",
          impact: "high",
          evidenceData: { games: 1, total: 8, streak: 0, lossGames: 1 },
        },
        {
          id: "wave-recall",
          label: "Late recalls",
          kind: "weakness",
          evidence: "Happens most games.",
          impact: "medium",
          evidenceData: { games: 6, total: 8, streak: 4, lossGames: 4 },
        },
      ],
      role: "adc",
      gamesAnalyzed: 8,
    }).ranked;
    return ranked[0].id === "wave-recall" && ranked[0].scores.confidence >= ranked[1].scores.confidence;
  });

  check("player agency is preserved in the score breakdown", () => {
    const set = DC.build(scenario("adc"));
    return set.chains.every((c) => (c.decisionAgency ?? 0) > 0);
  });

  // --- Step 5 — habits ----------------------------------------------------
  check("habit is supporting evidence, never proof", () => {
    const set = DC.build(scenario("adc", { habits: true, evidence: true }));
    const h = set.primary!.playerHabitContext!;
    const v = V.chain(set.primary!);
    return h.supporting === true && v.habitIsProof === false && v.observedEvidenceCount > 0;
  });

  check("current-match evidence remains primary over habit history", () => {
    const withHabit = V.chain(DC.build(scenario("adc", { habits: true, evidence: true })).primary!);
    const withoutHabit = V.chain(DC.build(scenario("adc", { evidence: true })).primary!);
    return withHabit.observedEvidenceCount === withoutHabit.observedEvidenceCount;
  });

  check("habit intelligence identifies recurring patterns from real matches", () => {
    const built = buildMatchDecisionChain(match(), history(), undefined, NOW)!;
    return (built.input.habits?.length ?? 0) > 0;
  });

  // --- Step 6 — memory ----------------------------------------------------
  check("memory enriches without overriding evidence", () => {
    const withMemory = DC.build(
      scenario("adc", { habits: true, memory: true, evidence: true }),
    ).primary!;
    const withoutMemory = DC.build(scenario("adc", { habits: true, evidence: true })).primary!;
    return (
      Boolean(withMemory.playerMemoryContext) &&
      withMemory.explanation.whatHappened === withoutMemory.explanation.whatHappened &&
      withMemory.decisionPriority === withoutMemory.decisionPriority
    );
  });

  // --- Step 7 — counterfactuals ------------------------------------------
  check("counterfactual with no observed evidence is UNKNOWN", () => {
    const cf = V.chain(DC.build(scenario("adc")).primary!).counterfactual;
    return cf.certainty === "UNKNOWN" && cf.uncertainty.length > 0;
  });

  check("counterfactual with observed evidence is at least INFERRED", () => {
    const cf = V.chain(DC.build(scenario("adc", { evidence: true, habits: true })).primary!).counterfactual;
    return cf.certainty === "INFERRED" || cf.certainty === "KNOWN";
  });

  check("counterfactual answers the four required questions", () => {
    const built = buildMatchDecisionChain(match(), history(), undefined, NOW)!;
    const cf = V.chain(built.set.primary!).counterfactual;
    if (!cf.present) return cf.certainty === "UNKNOWN";
    return Boolean(cf.alternativeDecision && cf.reason && cf.evidence.length > 0 && cf.uncertainty);
  });

  // --- Step 8 — practice loop --------------------------------------------
  check("decision → fundamental → practice goal is traceable", () => {
    const built = buildMatchDecisionChain(match(), history(), undefined, NOW)!;
    const c = built.set.primary!;
    return (
      c.fundamentalId.length > 0 &&
      c.practiceGoal.fundamental === c.fundamentalId &&
      c.practiceGoal.curriculumTopic === c.curriculumReference.topic &&
      c.practiceGoal.goal.length > 0
    );
  });

  check("practice planner receives structured references, not free text", () => {
    const input = scenario("adc", { evidence: true, habits: true });
    const set = DC.build(input);
    const plan = PracticePlanner.create({ ...DC.forPracticePlanner(set, input), now: NOW });
    return plan.primaryFocus.decisionId.length > 0 && plan.primaryFocus.fundamental.length > 0;
  });

  check("practice goal is measurable where the architecture supports it", () => {
    const input = scenario("adc", { evidence: true, practice: true });
    const set = DC.build(input);
    return typeof set.primary!.practiceGoal.measurable === "string";
  });

  // --- Step 9/10/11 — surfaces -------------------------------------------
  check("Match Report consumes the decision chain from real data", () => {
    const report = buildMatchReport(match(), match(1), history());
    const dc = report.decisionChain;
    return Boolean(dc && dc.primaryDecisionId && dc.chains.length > 0 && dc.practiceGoal);
  });

  check("Match Report still works when the chain is unavailable", () => {
    const chain = buildMatchReportDecisionChain(
      { ...match(), matchId: "empty" },
      [],
      { events: [], anchorsApproximate: true },
      NOW,
    );
    const report = buildMatchReport(match(2), null, []);
    return chain === null && report.summary.length > 0 && report.plan.phases.length > 0;
  });

  check("Replay Coach consumes prioritized chain information", () => {
    const input = scenario("adc", { evidence: true });
    const set = DC.build(input);
    const timeline = ReplayEngine.buildTimeline(DC.forReplayCoach(set, input));
    return timeline.moments.length > 0;
  });

  check("AI Coach context receives reasoning, not raw Riot data", () => {
    const built = buildMatchDecisionChain(match(), history(), undefined, NOW)!;
    const payload = DC.forAICoach(built.set);
    return (
      payload.version === 1 &&
      payload.decisionChain.length > 0 &&
      payload.fundamentals.length > 0 &&
      payload.practiceGoals.length > 0 &&
      payload.evidence.some((e) => e.observed) &&
      !("raw" in payload)
    );
  });

  // --- Step 12 — all five roles ------------------------------------------
  for (const role of ROLES) {
    check(`${role.toUpperCase()}: role-level coaching works without champion intelligence`, () => {
      const v = V.set(DC.build(scenario(role)));
      return v.role === role && v.chainsValidated === 3 && v.status !== "FAIL" && !v.sources.champion;
    });

    check(`${role.toUpperCase()}: real match data validates end-to-end`, () => {
      const built = buildMatchDecisionChain(asRole(match(), role), history().map((h) => asRole(h, role)), undefined, NOW);
      if (!built) return "no chain built";
      const v = V.set(built.set);
      return v.role === role && v.status !== "FAIL" && v.sources.observedEvidence;
    });
  }

  // --- Step 13 — fallback testing ----------------------------------------
  check("missing enrichment layers never crash the chain", () => {
    const set = DC.build(scenario("support"));
    const v = V.set(set);
    return (
      !v.sources.champion &&
      !v.sources.items &&
      !v.sources.runes &&
      !v.sources.matchup &&
      !v.sources.teamComposition &&
      !v.sources.laneState &&
      !v.sources.habits &&
      !v.sources.playerMemory &&
      v.chainsValidated === 3
    );
  });

  check("missing data is reported explicitly, never invented", () => {
    const v = V.set(DC.build(scenario("top")));
    return (
      v.missing.some((m) => m.requiredSource === "habit-intelligence") &&
      v.missing.some((m) => m.requiredSource === "player-memory") &&
      v.missing.every((m) => m.reason.length > 0)
    );
  });

  check("no chains at all yields an explicit FAIL, not fake coaching", () => {
    const v = V.set(DC.build({ contexts: [], now: NOW }));
    return v.status === "FAIL" && v.chainsValidated === 0 && v.notes.length > 0;
  });

  check("partial Riot data still produces valid coaching", () => {
    const sparse: MatchAnalysisInput = {
      ...match(),
      matchId: "sparse",
      laneMinions10: 0,
      controlWardsPlaced: 0,
      damageShare: 0,
      killParticipation: 0,
    };
    const built = buildMatchDecisionChain(sparse, [], undefined, NOW);
    if (!built) return "no chain built from sparse data";
    return V.set(built.set).status !== "FAIL";
  });

  check("invalid optional data is ignored, not trusted", () => {
    const set = DC.build({
      ...scenario("jungle"),
      itemIds: [],
      runeIds: [],
      candidatesByDecisionId: {},
      evidenceByDecisionId: {},
    });
    return set.chains.length === 3 && set.completeness.items === false;
  });

  // --- Step 14 — beta blocker audit --------------------------------------
  check("audit reports no beta blockers on the real data path", () => {
    const built = buildMatchDecisionChain(match(), history(), undefined, NOW)!;
    const audit = V.audit(built.set);
    return audit.blockers.length === 0 && audit.status !== "FAIL";
  });

  check("audit flags a missing-evidence path as a critical blocker", () => {
    const audit = V.audit(DC.build(scenario("adc")));
    return audit.blockers.some((b) => b.id === "no-observed-evidence" && b.severity === "CRITICAL");
  });

  check("evidence traceability holds for every validated chain", () => {
    const built = buildMatchDecisionChain(match(), history(), undefined, NOW)!;
    return V.set(built.set).chains.every((c) => c.traceable);
  });

  return results;
}

if (typeof process !== "undefined" && process.argv[1]?.includes("coaching-validation-v1/checks")) {
  const results = runCoachingValidationChecks();
  for (const r of results) {
    console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  console.log(`${results.filter((r) => r.passed).length}/${results.length} checks passed`);
}
