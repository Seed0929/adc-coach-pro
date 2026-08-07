// ---------------------------------------------------------------------------
// Decision Chain V1 — lightweight deterministic self-checks.
//
//   bun run src/lib/coaching/decision-chain-v1/checks.ts
// ---------------------------------------------------------------------------
import { runCoachingPipeline, type CoachingIssue } from "../coaching-pipeline";
import { prioritizeDecisions } from "../decision-priority-engine";
import { buildUnifiedCoachingContext } from "../unified-coaching-context";
import { buildLaneState } from "../lane-state-intelligence-v1";
import { PracticePlanner } from "../practice-planning-v1";
import { ReplayEngine } from "../replay-intelligence-v1";
import { createHabitEngine } from "../habit-intelligence";
import { DecisionChainV1 as DC } from "./facade";
import type { DecisionChainInput, DecisionEvidence } from "./types";

export interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

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

function contexts(withLaneState = false) {
  const pipeline = runCoachingPipeline(ISSUES, "adc");
  if (!withLaneState) return pipeline;
  const laneState = buildLaneState({
    role: "adc",
    gameTimeSeconds: 420,
    player: { champion: "Jinx", level: 8, gold: 2400, health: 900, maxHealth: 1000 },
    enemy: { champion: "Caitlyn", level: 7, gold: 1900, health: 400, maxHealth: 1000 },
    wave: { state: "CRASHING", size: "LARGE" },
  });
  return {
    ...pipeline,
    unifiedContexts: pipeline.contexts.map((c, order) =>
      buildUnifiedCoachingContext(c, { order, rank: order === 0 ? "primary" : "unranked", laneState }),
    ),
  };
}

function baseInput(withLaneState = false): DecisionChainInput {
  const pipeline = contexts(withLaneState);
  const priorities = prioritizeDecisions({
    issues: ISSUES.map((i) => ({
      ...i,
      evidenceData: { games: 4, total: 6, streak: 2, lossGames: 3, sentences: [i.evidence ?? ""] },
    })),
    role: "adc",
    gamesAnalyzed: 6,
  });
  return {
    contexts: pipeline.unifiedContexts,
    priorities,
    matchId: "EUW1_TEST",
    playerId: "player-1",
    now: "2026-01-01T00:00:00.000Z",
  };
}

export function runDecisionChainChecks(): CheckResult[] {
  const results: CheckResult[] = [];
  const check = (name: string, fn: () => boolean | string) => {
    try {
      const r = fn();
      results.push(typeof r === "string" ? { name, passed: false, detail: r } : { name, passed: r });
    } catch (e) {
      results.push({ name, passed: false, detail: String(e) });
    }
  };

  // --- partial context ----------------------------------------------------
  check("role-only context builds a chain", () => {
    const set = DC.build({ contexts: contexts().unifiedContexts, now: "t" });
    return set.chains.length === 3 && set.primary !== null && set.completeness.role === true;
  });

  check("missing sources are never fabricated", () => {
    const set = DC.build({ contexts: contexts().unifiedContexts, now: "t" });
    const c = set.primary!;
    return (
      c.matchupContext === undefined &&
      c.teamCompositionContext === undefined &&
      c.laneStateContext === undefined &&
      c.itemContext === undefined &&
      c.runeContext === undefined &&
      c.playerHabitContext === undefined
    );
  });

  check("role + champion context works", () => {
    const pipeline = runCoachingPipeline(ISSUES, "adc", "Jinx");
    const set = DC.build({ contexts: pipeline.unifiedContexts, champion: "Jinx", now: "t" });
    return set.champion === "Jinx" && set.completeness.champion === true;
  });

  check("role + champion + lane state works", () => {
    const set = DC.build({ ...baseInput(true), champion: "Jinx" });
    return (
      set.completeness.laneState === true &&
      (set.primary!.laneStateContext?.length ?? 0) > 0 &&
      set.primary!.gameContext.laneStateObserved === true
    );
  });

  check("full context reports high completeness", () => {
    const input = baseInput(true);
    const set = DC.build({
      ...input,
      champion: "Jinx",
      itemIds: ["3031"],
      runeIds: ["8008"],
      timestampsByDecisionId: { "wave-recall": 430 },
      evidenceByDecisionId: {
        "wave-recall": [
          {
            id: "e1",
            kind: "match-event",
            statement: "Wave crashed at 7:10 and you recalled at 7:52.",
            source: "riot-data",
            observed: true,
          } satisfies DecisionEvidence,
        ],
      },
      habits: [],
    });
    return set.completeness.percent >= 60;
  });

  // --- multiple available decisions ---------------------------------------
  check("multiple available decisions are represented", () => {
    const input = baseInput(true);
    const set = DC.build({
      ...input,
      candidatesByDecisionId: {
        "wave-recall": [
          { actionId: "recall", taken: false },
          { actionId: "push-wave", taken: true },
          { actionId: "hold-wave" },
          { actionId: "ward" },
        ],
      },
    });
    const chain = set.chains.find((c) => c.source.decision.decisionId === "wave-recall")!;
    return chain.availableDecisions.length >= 4;
  });

  check("caller candidates are marked observed, knowledge candidates are not", () => {
    const set = DC.build({
      ...baseInput(true),
      candidatesByDecisionId: { "wave-recall": [{ actionId: "push-wave", taken: true }] },
    });
    const chain = set.chains.find((c) => c.source.decision.decisionId === "wave-recall")!;
    const supplied = chain.availableDecisions.find((c) => c.actionId === "push-wave")!;
    const knowledge = chain.availableDecisions.find((c) => c.source === "lane-state-intelligence");
    return supplied.observed === true && supplied.taken === true && (!knowledge || knowledge.observed === false);
  });

  // --- prioritization -----------------------------------------------------
  check("priority comes from the existing prioritization engine", () => {
    const input = baseInput();
    const set = DC.build(input);
    const ranked = input.priorities!.ranked[0];
    const chain = set.chains.find((c) => c.source.decision.decisionId === ranked.id);
    return Boolean(chain) && set.chains.every((c) => c.decisionPriority === c.source.decisionPriority.priority);
  });

  check("selected decision is the prioritized one", () =>
    DC.build(baseInput()).chains.every(
      (c) => c.selectedDecision.prioritized === true && c.availableDecisions[0].prioritized === true,
    ));

  check("score dimensions are copied, never recomputed", () => {
    const input = baseInput();
    const prioritized = input.priorities!.ranked[0];
    const set = DC.build({
      ...input,
      contexts: input.contexts.map((u) =>
        u.decision.decisionId === prioritized.id
          ? { ...u, decisionPriority: { ...u.decisionPriority, scores: prioritized.scores, priority: prioritized.priority } }
          : u,
      ),
    });
    const chain = set.chains.find((c) => c.source.decision.decisionId === prioritized.id)!;
    return (
      chain.decisionImpact === prioritized.scores.impact &&
      chain.decisionFrequency === prioritized.scores.frequency &&
      chain.decisionDifficulty === prioritized.scores.difficulty &&
      chain.decisionAgency === prioritized.scores.playerAgency &&
      chain.decisionRecoverability === prioritized.scores.recoverability &&
      chain.decisionSnowballPotential === prioritized.scores.snowballPotential &&
      chain.decisionConsistency === prioritized.scores.consistency
    );
  });

  // --- habit influence ----------------------------------------------------
  check("habits attach as supporting evidence", () => {
    const engine = createHabitEngine();
    const pipeline = contexts();
    engine.record(pipeline.unifiedContexts, { matchId: "m1" });
    engine.record(pipeline.unifiedContexts, { matchId: "m2" });
    const habits = engine.getHabits({ scope: "universal" });
    const set = DC.build({ ...baseInput(), habits });
    const chain = set.primary!;
    return (
      chain.playerHabitContext?.supporting === true &&
      chain.playerHabitContext.occurrences >= 1 &&
      chain.explanation.habitThatMayHaveContributed !== null
    );
  });

  check("habits never override game evidence or priority", () => {
    const engine = createHabitEngine();
    const pipeline = contexts();
    engine.record(pipeline.unifiedContexts, { matchId: "m1" });
    const habits = engine.getHabits({ scope: "universal" });
    const without = DC.build(baseInput());
    const withHabits = DC.build({ ...baseInput(), habits });
    return (
      withHabits.primary!.decisionPriority === without.primary!.decisionPriority &&
      withHabits.primary!.selectedDecision.actionId === without.primary!.selectedDecision.actionId
    );
  });

  check("no habit means no habit context", () =>
    DC.build(baseInput()).primary!.playerHabitContext === undefined);

  // --- curriculum + fundamentals -----------------------------------------
  check("curriculum references existing ids only", () =>
    DC.build(baseInput()).chains.every(
      (c) =>
        c.curriculumReference.topic === c.source.curriculum.topic &&
        c.fundamentalId === c.source.leagueIntelligence.fundamental,
    ));

  check("explanation names the fundamental", () =>
    DC.build(baseInput()).primary!.explanation.fundamentalItRelatesTo.includes(
      DC.build(baseInput()).primary!.fundamentalLabel,
    ));

  // --- counterfactual -----------------------------------------------------
  check("counterfactual is structured for weaknesses", () => {
    const cf = DC.build(baseInput()).primary!.counterfactual;
    return Boolean(
      cf &&
        cf.decisionTaken &&
        cf.alternativeDecision &&
        cf.expectedAdvantage &&
        cf.reason &&
        cf.confidence.level,
    );
  });

  check("strengths carry no counterfactual", () => {
    const set = DC.build(baseInput());
    const strength = set.chains.find((c) => c.source.decision.kind === "strength")!;
    return strength.counterfactual === null;
  });

  // --- practice -----------------------------------------------------------
  check("practice reference falls back to curriculum without a plan", () => {
    const p = DC.build(baseInput()).primary!.practiceGoal;
    return p.source === "curriculum" && p.practicePlanId === undefined && p.goal.length > 0;
  });

  check("practice reference points at the Practice Planner when a plan exists", () => {
    const input = baseInput();
    const plan = PracticePlanner.create({ contexts: input.contexts, priorities: input.priorities, now: "t" });
    const set = DC.build({ ...input, practicePlan: plan });
    const p = set.primary!.practiceGoal;
    return p.source === "practice-planner" && p.practicePlanId === plan.practicePlanId;
  });

  // --- evidence + confidence ---------------------------------------------
  check("evidence carries source + observed flags", () =>
    DC.build(baseInput()).primary!.evidence.every(
      (e) => Boolean(e.source) && typeof e.observed === "boolean" && e.statement.length > 0,
    ));

  check("timestamps become evidence and set the game phase", () => {
    const set = DC.build({ ...baseInput(), timestampsByDecisionId: { "wave-recall": 430 } });
    const chain = set.chains.find((c) => c.source.decision.decisionId === "wave-recall")!;
    return (
      chain.gameTimestamp === 430 &&
      chain.gamePhase === "early" &&
      chain.evidence.some((e) => e.kind === "timestamp")
    );
  });

  check("no clock means unknown phase, never a guess", () =>
    DC.build(baseInput()).primary!.gamePhase === "unknown");

  check("confidence uses evidence categories", () => {
    const levels = DC.build(baseInput()).chains.map((c) => c.confidence.level);
    return levels.every((l) => ["HIGH", "MEDIUM", "LOW", "INSUFFICIENT_DATA"].includes(l));
  });

  check("no observed evidence yields INSUFFICIENT_DATA", () => {
    const pipeline = runCoachingPipeline(
      [{ id: "wave-recall", label: "Late recalls", kind: "weakness" }],
      "adc",
    );
    const set = DC.build({ contexts: pipeline.unifiedContexts, now: "t" });
    return set.primary!.confidence.level === "INSUFFICIENT_DATA";
  });

  // --- traceability -------------------------------------------------------
  check("every chain is traceable to its source layers", () =>
    DC.build(baseInput()).chains.every(
      (c) =>
        c.sourceReferences.length >= 5 &&
        c.sourceReferences.some((t) => t.layer === "curriculum") &&
        c.sourceReferences.some((t) => t.layer === "decision-priority"),
    ));

  // --- integrations -------------------------------------------------------
  check("Match Report integration exposes structured data", () => {
    const payload = DC.forMatchReport(DC.build(baseInput()));
    return (
      payload.primaryDecisionId !== null &&
      payload.decisionsAvailable.length > 0 &&
      payload.practiceGoal !== null &&
      payload.chains.length === 3
    );
  });

  check("Match Report integration survives an empty chain set", () => {
    const payload = DC.forMatchReport(DC.safeFallback("mid", "t"));
    return payload.primaryDecisionId === null && payload.confidence === "INSUFFICIENT_DATA";
  });

  check("Replay Coach integration accepts the chain output", () => {
    const input = { ...baseInput(), timestampsByDecisionId: { "wave-recall": 430 } };
    const set = DC.build(input);
    const timeline = ReplayEngine.buildTimeline(DC.forReplayCoach(set, input));
    return timeline.moments.length === 3;
  });

  check("Practice Planner integration accepts the chain output", () => {
    const input = baseInput();
    const set = DC.build(input);
    const plan = PracticePlanner.create({ ...DC.forPracticePlanner(set, input), now: "t" });
    return plan.primaryFocus.decisionId.length > 0;
  });

  check("AI Coach payload carries reasoning, not raw Riot data", () => {
    const payload = DC.forAICoach(DC.build(baseInput()));
    return (
      payload.version === 1 &&
      payload.decisionChain.length === 3 &&
      payload.fundamentals.length > 0 &&
      payload.practiceGoals.length === 3
    );
  });

  check("empty input degrades to a safe fallback", () => {
    const set = DC.build({ contexts: [], now: "t" });
    return set.chains.length === 0 && set.primary === null && set.completeness.percent === 0;
  });

  return results;
}

if (typeof process !== "undefined" && process.argv[1]?.includes("decision-chain-v1/checks")) {
  const results = runDecisionChainChecks();
  for (const r of results) console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  console.log(`${results.filter((r) => r.passed).length}/${results.length} checks passed`);
}
