// ---------------------------------------------------------------------------
// Adapter: coaching-engine match inputs → the ProfileMatch shape the
// intelligence foundation evaluates. One conversion in one place, so the plan,
// the graphs and the profile all measure the exact same numbers.
// ---------------------------------------------------------------------------
import type { MatchAnalysisInput, MatchCoachingAnalysis } from "@/lib/coaching-engine";
import type { ProfileMatch } from "@/lib/profile-engine";

const EMPTY_GRADES: ProfileMatch["grades"] = {
  farming: 0,
  survivability: 0,
  vision: 0,
  teamfighting: 0,
  objectives: 0,
  damage: 0,
};

export function toProfileMatch(
  m: MatchAnalysisInput,
  analysis?: MatchCoachingAnalysis,
): ProfileMatch {
  const objectiveTakedowns =
    m.dragonTakedowns + m.baronTakedowns + m.riftHeraldTakedowns + m.turretTakedowns;
  const kda = m.deaths === 0 ? m.kills + m.assists : (m.kills + m.assists) / m.deaths;
  return {
    matchId: m.matchId,
    champion: m.champion,
    role: m.role,
    win: m.win,
    gameCreation: m.gameCreation,
    durationMin: m.durationMin,
    kills: m.kills,
    deaths: m.deaths,
    assists: m.assists,
    kda: Math.round(kda * 10) / 10,
    cs: m.cs,
    csPerMin: m.csPerMin,
    gold: m.gold,
    goldPerMin: m.goldPerMin,
    visionScore: m.visionScore,
    visionPerMin: m.visionPerMin,
    killParticipation: m.killParticipation,
    objectiveTakedowns,
    damageToChampions: Math.round(m.damagePerMin * m.durationMin),
    damagePerMin: m.damagePerMin,
    botDiffScore: analysis?.overallScore ?? 0,
    grades: analysis?.grades ?? EMPTY_GRADES,
    strengths: analysis?.strengths ?? [],
    weaknesses: analysis?.weaknesses ?? [],
  };
}

export function toProfileMatches(
  inputs: MatchAnalysisInput[],
  analyses: MatchCoachingAnalysis[] = [],
): ProfileMatch[] {
  const byId = new Map(analyses.map((a) => [a.matchId, a]));
  return inputs.map((m) => toProfileMatch(m, byId.get(m.matchId)));
}
