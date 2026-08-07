// ---------------------------------------------------------------------------
// Matchup Intelligence V1 — lightweight deterministic self-checks.
//
// Dependency-free on purpose (no test runner required):
//   bun run src/lib/coaching/matchup-intelligence-v1/checks.ts
// or call runMatchupIntelligenceChecks() from any future test harness.
// ---------------------------------------------------------------------------
import { isPending } from "../knowledge-base/types";
import { MatchupIntelligenceV1 } from "./facade";
import type { MatchupIntelligenceRef } from "../unified-coaching-context";

export interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

export function runMatchupIntelligenceChecks(): CheckResult[] {
  const results: CheckResult[] = [];
  const check = (name: string, fn: () => boolean | string) => {
    try {
      const r = fn();
      results.push(typeof r === "string" ? { name, passed: false, detail: r } : { name, passed: r });
    } catch (e) {
      results.push({ name, passed: false, detail: String(e) });
    }
  };

  MatchupIntelligenceV1.clear();

  // profile creation
  check("profile creation fills every slot", () => {
    const p = MatchupIntelligenceV1.create({ championA: "Caitlyn", championB: "Jinx", roleContext: "adc" });
    return (
      p.matchupId === "caitlyn__jinx__adc" &&
      p.roleContext === "adc" &&
      isPending(p.rangeInteraction.edge) &&
      p.punishWindows.length === 0 &&
      p.populated === false
    );
  });

  MatchupIntelligenceV1.register([
    MatchupIntelligenceV1.create({ championA: "Caitlyn", championB: "Jinx", roleContext: "adc" }),
    MatchupIntelligenceV1.create({ championA: "Ashe", championB: "Jinx", roleContext: "support" }),
  ]);

  // champion lookup
  check("champion lookup finds both sides", () => {
    const found = MatchupIntelligenceV1.findMatchupsForChampion("jinx");
    return found.length === 2;
  });

  // role lookup
  check("role lookup is role-aware", () => {
    return (
      MatchupIntelligenceV1.findMatchupsForRole("adc").length === 1 &&
      MatchupIntelligenceV1.findMatchupsForRole("mid").length === 0
    );
  });

  // directional behavior
  check("matchups are directional", () => {
    return (
      MatchupIntelligenceV1.isAvailable("Caitlyn", "Jinx", "adc") &&
      !MatchupIntelligenceV1.isAvailable("Jinx", "Caitlyn", "adc") &&
      !MatchupIntelligenceV1.hasDirectionalCounterpart("Caitlyn", "Jinx", "adc")
    );
  });

  // missing matchup fallback
  check("missing matchup degrades to empty profile", () => {
    const p = MatchupIntelligenceV1.getMatchup("Zeri", "Draven", "adc");
    return p.matchupId === "zeri__draven__adc" && p.populated === false && isPending(p.patch);
  });

  // missing role fallback
  check("missing role resolves to 'any'", () => {
    return MatchupIntelligenceV1.getMatchup("Zeri", "Draven").roleContext === "any";
  });

  // missing champion fallback (Champion Intelligence empty)
  check("missing champion reports degraded availability", () => {
    const a = MatchupIntelligenceV1.getChampionAvailability("Zeri", "Draven");
    return a.degraded === true;
  });

  // Data Dragon unavailable fallback
  check("Data Dragon unavailable still returns champion context", () => {
    const ctx = MatchupIntelligenceV1.getChampionContext("Zeri", "Draven", "adc");
    return Boolean(ctx.championA && ctx.championB) && ctx.roleContext === "adc";
  });

  // decision references
  check("decision references default to empty, never fabricated", () => {
    return (
      MatchupIntelligenceV1.getDecisionReferences("Caitlyn", "Jinx", "adc").length === 0 &&
      MatchupIntelligenceV1.getDecisionPriorities("Caitlyn", "Jinx", "adc").length === 0
    );
  });

  // curriculum references
  check("curriculum references default to empty", () => {
    return MatchupIntelligenceV1.getCurriculumReferences("Caitlyn", "Jinx", "adc").length === 0;
  });

  // windows + safeFallback
  check("windows and safeFallback are structurally complete", () => {
    const p = MatchupIntelligenceV1.safeFallback("Zeri", "Draven", "adc");
    return (
      Array.isArray(p.punishWindows) &&
      Array.isArray(p.dangerWindows) &&
      Array.isArray(p.recoveryWindows) &&
      MatchupIntelligenceV1.getPunishWindows("Zeri", "Draven", "adc").length === 0
    );
  });

  // optional integration with Unified Coaching Context
  check("maps into the optional UnifiedCoachingContext reference", () => {
    const p = MatchupIntelligenceV1.getMatchup("Caitlyn", "Jinx", "adc");
    const ref: MatchupIntelligenceRef = {
      matchupId: p.matchupId,
      championA: p.championA,
      championB: p.championB,
      roleContext: p.roleContext,
      populated: p.populated,
      profile: p,
    };
    return ref.matchupId === "caitlyn__jinx__adc" && ref.populated === false;
  });

  MatchupIntelligenceV1.clear();
  return results;
}

export function matchupChecksPassed(): boolean {
  return runMatchupIntelligenceChecks().every((r) => r.passed);
}