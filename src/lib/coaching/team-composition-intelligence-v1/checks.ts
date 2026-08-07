// ---------------------------------------------------------------------------
// Team Composition Intelligence V1 — lightweight deterministic self-checks.
//
// Dependency-free on purpose (no test runner required):
//   bun run src/lib/coaching/team-composition-intelligence-v1/checks.ts
// or call runTeamCompositionChecks() from any future test harness.
// ---------------------------------------------------------------------------
import { isPending } from "../knowledge-base/types";
import { TeamCompositionIntelligenceV1 as TC } from "./facade";
import type { TeamCompositionIntelligenceRef } from "../unified-coaching-context";

export interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const BLUE = { top: "Ornn", jungle: "Sejuani", mid: "Orianna", adc: "Jinx", support: "Lulu" } as const;
const RED = { top: "Jax", jungle: "Nidalee", mid: "Zed", adc: "Caitlyn", support: "Thresh" } as const;

export function runTeamCompositionChecks(): CheckResult[] {
  const results: CheckResult[] = [];
  const check = (name: string, fn: () => boolean | string) => {
    try {
      const r = fn();
      results.push(typeof r === "string" ? { name, passed: false, detail: r } : { name, passed: r });
    } catch (e) {
      results.push({ name, passed: false, detail: String(e) });
    }
  };

  TC.clear();

  check("composition creation fills every slot", () => {
    const p = TC.create({ champions: BLUE, teamSide: "blue" });
    return (
      p.compositionId === "blue__ornn_sejuani_orianna_jinx_lulu" &&
      isPending(p.teamfightProfile.rating) &&
      p.compositionStrengths.length === 0 &&
      p.populated === false
    );
  });

  check("role assignment covers all five roles", () => {
    const p = TC.create({ champions: BLUE, teamSide: "blue" });
    return (
      p.roleAssignments.top.champion === "Ornn" &&
      p.roleAssignments.support.champion === "Lulu" &&
      Object.keys(p.roleAssignments).length === 5
    );
  });

  TC.register([
    TC.create({ champions: BLUE, teamSide: "blue" }),
    TC.create({ champions: RED, teamSide: "red" }),
  ]);

  check("team lookup finds a registered composition", () => TC.isAvailable(BLUE, "blue"));

  check("opposing team lookup finds the enemy composition", () => TC.isAvailable(RED, "red"));

  check("champion lookup finds compositions by champion", () => {
    return TC.findCompositionsForChampion("jinx").length === 1;
  });

  check("composition comparison covers every trait", () => {
    const cmp = TC.compareCompositions(BLUE, RED);
    return cmp.traits.length > 30 && cmp.degraded === true;
  });

  check("strength retrieval never fabricates data", () => TC.getStrengths(BLUE, "blue").length === 0);

  check("weakness retrieval never fabricates data", () => TC.getWeaknesses(BLUE, "blue").length === 0);

  check("vulnerability retrieval never fabricates data", () => {
    return TC.getVulnerabilities(BLUE, "blue").length === 0;
  });

  check("win-condition retrieval defaults to empty", () => {
    const wc = TC.getWinConditions(BLUE, "blue");
    return wc.primary.length === 0 && wc.secondary.length === 0;
  });

  check("teamfight profile is structurally complete", () => {
    const t = TC.getTeamfightProfile(BLUE, "blue");
    return t.value.id === "teamfight" && isPending(t.value.rating) && t.fromComposition === false;
  });

  check("objective profile exposes baron / dragon / tower slots", () => {
    const o = TC.getObjectiveProfile(BLUE, "blue");
    return (
      o.baron.id === "baron" && o.dragon.id === "dragon" && o.towerSiege.id === "tower-siege"
    );
  });

  check("missing champion degrades to empty profile", () => {
    const p = TC.getComposition({ top: "Nobody" }, "blue");
    return p.populated === false && p.roleAssignments.top.championKnown === false;
  });

  check("missing role reports availability, never invents one", () => {
    const a = TC.getChampionAvailability({ top: "Ornn", mid: "Orianna" });
    return a.missingRoles.length === 3 && a.degraded === true;
  });

  check("missing opposing team still yields an analysis", () => {
    const analysis = TC.analyzeTeam({ champions: BLUE, side: "blue", playerRole: "adc" });
    return (
      analysis.opposingTeam === undefined &&
      analysis.playerRole === "adc" &&
      analysis.relationships.length > 0 &&
      analysis.inputs.matchups === false
    );
  });

  check("directional analysis links lane matchups by reference only", () => {
    const analysis = TC.analyzeTeam({ champions: BLUE, opposingChampions: RED, playerRole: "adc" });
    const adc = analysis.analyzedTeam.matchupReferences.find((m) => m.role === "adc");
    return (
      analysis.analyzedTeam.matchupReferences.length === 5 &&
      adc?.matchupId === "jinx__caitlyn__adc" &&
      adc?.populated === false
    );
  });

  check("partial context (no items / runes / game state) is valid", () => {
    const analysis = TC.analyzeTeam({ champions: { adc: "Jinx" } });
    return (
      analysis.inputs.items === false &&
      analysis.inputs.runes === false &&
      analysis.inputs.gameState === false
    );
  });

  check("optional item / rune inputs pass through without recommendations", () => {
    const analysis = TC.analyzeTeam({
      champions: BLUE,
      itemReferences: [{ itemId: "3031", relevance: "power-spike", role: "adc", note: "__pending__" }],
      runeReferences: [{ runeId: 8008, relevance: "scaling", role: "adc", note: "__pending__" }],
    });
    return analysis.inputs.items && analysis.inputs.runes;
  });

  check("decision + curriculum + habit references default to empty", () => {
    return (
      TC.getDecisionPriorities(BLUE, "blue", "adc").length === 0 &&
      TC.getDecisionReferences(BLUE, "blue").length === 0 &&
      TC.getCurriculumReferences(BLUE, "blue").length === 0 &&
      TC.getHabitReferences(BLUE, "blue").length === 0 &&
      TC.getPracticeReferences(BLUE, "blue").length === 0
    );
  });

  check("safeFallback is structurally complete", () => {
    const p = TC.safeFallback({}, null);
    return p.compositionId.startsWith("unspecified__") && isPending(p.patch);
  });

  check("maps into the optional UnifiedCoachingContext reference", () => {
    const analysis = TC.analyzeTeam({ champions: BLUE, opposingChampions: RED, playerRole: "adc" });
    const ref: TeamCompositionIntelligenceRef = {
      compositionId: analysis.analyzedTeam.compositionId,
      playerRole: analysis.playerRole,
      populated: analysis.analyzedTeam.populated,
      availability: analysis.availability.analyzedTeam,
      relationships: analysis.relationships,
      analyzedTeam: analysis.analyzedTeam,
      opposingTeam: analysis.opposingTeam,
      analysis,
    };
    return ref.populated === false && ref.playerRole === "adc";
  });

  TC.clear();
  return results;
}

export function teamCompositionChecksPassed(): boolean {
  return runTeamCompositionChecks().every((r) => r.passed);
}
