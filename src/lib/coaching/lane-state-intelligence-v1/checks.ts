// ---------------------------------------------------------------------------
// Lane State Intelligence V1 — lightweight deterministic self-checks.
//
//   bun run src/lib/coaching/lane-state-intelligence-v1/checks.ts
// ---------------------------------------------------------------------------
import { PENDING } from "../knowledge-base/types";
import { LaneStateIntelligenceV1 as LS } from "./facade";
import type { LaneStateInput } from "./types";
import type { LaneStateIntelligenceRef } from "../unified-coaching-context";

export interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const ADC_LANE: LaneStateInput = {
  role: "adc",
  gameTimeSeconds: 420,
  player: { champion: "Jinx", level: 8, gold: 2400, health: 900, maxHealth: 1000, resource: 300, maxResource: 400, completedItems: 1 },
  enemy: { champion: "Caitlyn", level: 7, gold: 1900, health: 400, maxHealth: 1000 },
  wave: { state: "CRASHING", size: "LARGE", playerMinions: 8, enemyMinions: 2 },
  tower: { state: "PLATES_REMAINING" },
  map: { visionState: "PARTIAL_VISION", gankThreat: "MODERATE", mapState: "QUIET" },
};

export function runLaneStateChecks(): CheckResult[] {
  const results: CheckResult[] = [];
  const check = (name: string, fn: () => boolean | string) => {
    try {
      const r = fn();
      results.push(typeof r === "string" ? { name, passed: false, detail: r } : { name, passed: r });
    } catch (e) {
      results.push({ name, passed: false, detail: String(e) });
    }
  };

  check("profile creation fills every slot", () => {
    const p = LS.build(ADC_LANE);
    return p.laneStateId.startsWith("adc__") && p.role === "adc" && p.observed === true;
  });

  check("wave state is never inferred from nothing", () => {
    const p = LS.build({ role: "mid" });
    return (
      p.waveState === "UNKNOWN" &&
      p.waveDirection === "UNKNOWN" &&
      p.wavePosition === "UNKNOWN" &&
      p.freezePotential === "UNKNOWN"
    );
  });

  check("wave states derive direction and potentials", () => {
    const p = LS.build({ wave: { state: "SLOW_PUSH" } });
    return p.waveDirection === "TOWARD_ENEMY" && p.slowPushPotential === "HIGH";
  });

  check("lane phase derives from the clock", () =>
    LS.lanePhaseFromClock(60) === "EARLY" &&
    LS.lanePhaseFromClock(400) === "FIRST_RECALL" &&
    LS.lanePhaseFromClock(undefined) === "UNKNOWN");

  check("level advantage is owner + magnitude", () => {
    const a = LS.levelAdvantageFrom(9, 7);
    const b = LS.levelAdvantageFrom(7, 7);
    return a.owner === "PLAYER" && a.magnitude === "CLEAR" && b.owner === "EVEN";
  });

  check("health states are ratio driven", () =>
    LS.healthStateFrom(1000, 1000) === "FULL" &&
    LS.healthStateFrom(150, 1000) === "CRITICAL" &&
    LS.healthStateFrom(undefined, 1000) === "UNKNOWN");

  check("gold advantage degrades to UNKNOWN", () =>
    LS.goldAdvantageFrom(3000, 1000).magnitude === "SIGNIFICANT" &&
    LS.goldAdvantageFrom(3000, undefined).magnitude === "UNKNOWN");

  check("lane tempo reads wave + recall", () => {
    const p = LS.build(ADC_LANE);
    return p.laneTempo === "RESET_WINDOW";
  });

  check("lane priority follows the wave", () =>
    LS.build({ role: "mid", wave: { state: "PUSHING_TOWARD_PLAYER" } }).lanePriority === "ENEMY");

  check("tower pressure follows the crash", () => {
    const p = LS.build(ADC_LANE);
    return p.towerPressureOwner === "PLAYER" && p.towerState === "PLATES_REMAINING";
  });

  check("all-in threat is a state, not a call to action", () => {
    const p = LS.build(ADC_LANE);
    return p.allInThreatOwner === "PLAYER" && p.allInThreat !== "UNKNOWN";
  });

  check("gank threat is never invented", () =>
    LS.build({ role: "top" }).gankThreat === "UNKNOWN");

  check("recall state derives a window on a crash", () => {
    const p = LS.build({ wave: { state: "CRASHING" } });
    return p.playerRecallState === "WINDOW_AVAILABLE";
  });

  check("missing state falls back to UNKNOWN everywhere", () => {
    const p = LS.build();
    return (
      p.observed === false &&
      p.availability.degraded === true &&
      p.playerLevel === PENDING &&
      p.goldAdvantage === "UNKNOWN" &&
      p.laneContext === "UNKNOWN"
    );
  });

  check("safeFallback returns the canonical UNKNOWN profile", () => {
    const p = LS.safeFallback("adc");
    return p.lanePhase === "UNKNOWN" && p.laneContext === "SHARED_LANE" && p.observed === false;
  });

  check("role-specific lane context", () =>
    LS.defaultLaneContext("jungle") === "JUNGLE" &&
    LS.defaultLaneContext("support") === "SHARED_LANE" &&
    LS.defaultLaneContext("mid") === "LANE" &&
    LS.build({ role: "jungle", wave: { state: "NEUTRAL" } }).lanePriority === "NONE");

  check("matchup integration is by reference only", () => {
    const p = LS.build(ADC_LANE);
    return Boolean(p.matchupReference) && p.matchupReference?.populated === false;
  });

  check("team composition integration is optional", () => {
    const none = LS.build({ role: "adc" });
    const some = LS.build({ role: "adc", compositionIds: { analyzed: "blue__x", opposing: "red__y" } });
    return none.compositionReferences.length === 0 && some.compositionReferences.length === 2;
  });

  check("decision + curriculum + habit references route, never coach", () => {
    const p = LS.build(ADC_LANE);
    return (
      p.decisionReferences.some((d) => d.decisionId === "recall-on-crash") &&
      p.decisionPriorities[0]?.tier === "high" &&
      p.curriculumReferences.length > 0 &&
      p.habitReferences.length > 0 &&
      p.practiceReferences.length > 0
    );
  });

  check("unified coaching context ref shape is satisfiable", () => {
    const p = LS.build(ADC_LANE);
    const ref: LaneStateIntelligenceRef = {
      laneStateId: p.laneStateId,
      role: "adc",
      laneContext: p.laneContext,
      lanePhase: p.lanePhase,
      waveState: p.waveState,
      observed: p.observed,
      availability: p.availability,
      decisionPriorities: p.decisionPriorities,
      profile: p,
    };
    return ref.waveState === "CRASHING";
  });

  return results;
}

if (typeof process !== "undefined" && process.argv?.[1]?.includes("lane-state-intelligence-v1/checks")) {
  const results = runLaneStateChecks();
  for (const r of results) {
    console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  console.log(`${results.filter((r) => r.passed).length}/${results.length} passed`);
}