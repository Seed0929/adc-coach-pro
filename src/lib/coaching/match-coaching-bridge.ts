// ---------------------------------------------------------------------------
// Match → Decision Chain bridge (Sprint 5.2).
//
// Sprint 5.1 built Decision Chain V1 but nothing connected REAL Riot match
// data to it: `attachDecisionChain` was never called. This module is the
// missing wire and nothing else. It:
//
//   1. reads the already-derived, evidence-grounded match timeline,
//   2. runs the EXISTING Decision Prioritization Engine (single source of
//      truth for ranking — no new scoring here),
//   3. records the SAME derivation across the player's recent history through
//      the EXISTING Habit Intelligence engine (real observations only),
//   4. assembles Unified Coaching Contexts with the prioritization attached,
//   5. hands everything to Decision Chain V1.
//
// It NEVER fabricates evidence: every DecisionEvidence entry is a real stat
// sentence from the match timeline, and every habit observation comes from a
// detector that actually fired on a stored match.
//
// PURE + client-safe. No AI, no network, no persistence.
// ---------------------------------------------------------------------------
import type { MatchAnalysisInput } from "../coaching-engine";
import { buildMatchTimeline, type MatchTimeline } from "./decision-chain";
import { normalizeRole } from "./role-intelligence";
import { prioritizeDecisions, type PriorityIssueInput } from "./decision-priority-engine";
import { buildUnifiedCoachingContext, type UnifiedCoachingContext } from "./unified-coaching-context";
import { habitContextsFromContexts } from "./habit-context";
import { createHabitEngine, type Habit } from "./habit-intelligence";
import { DecisionChainV1 } from "./decision-chain-v1/facade";
import type {
  DecisionChainInput,
  DecisionChainSet,
  DecisionEvidence,
  MatchReportDecisionChain,
} from "./decision-chain-v1";

/** How many previous matches feed habit recurrence. Bounded on purpose. */
const HISTORY_WINDOW = 5;

function issuesFrom(timeline: MatchTimeline): PriorityIssueInput[] {
  return timeline.events.map((e) => ({
    id: e.id,
    label: e.decision,
    kind: e.tone === "negative" ? ("weakness" as const) : ("strength" as const),
    evidence: e.evidence,
    fundamentalHint: e.fundamental,
    category: e.category,
    impact: e.impact,
  }));
}

/** Real recurrence: how many of the previous matches the same detector fired in. */
function recurrenceMap(history: MatchAnalysisInput[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const h of history) {
    for (const e of buildMatchTimeline(h).events) {
      counts.set(e.id, (counts.get(e.id) ?? 0) + 1);
    }
  }
  return counts;
}

/** Habits aggregated from this match plus the recent history window. */
function habitsFor(
  m: MatchAnalysisInput,
  history: MatchAnalysisInput[],
  current: UnifiedCoachingContext[],
): Habit[] {
  const engine = createHabitEngine();
  // Oldest first so trends/streaks are chronologically correct.
  for (const h of [...history].reverse()) {
    const role = normalizeRole(h.role);
    const issues = issuesFrom(buildMatchTimeline(h));
    if (issues.length === 0) continue;
    const ranked = prioritizeDecisions({ issues, role, champion: h.champion }).ranked;
    const contexts = ranked.map((r) => r.context);
    const habitContexts = habitContextsFromContexts(contexts, { champion: h.champion });
    const unified = ranked.map((r, order) =>
      buildUnifiedCoachingContext(r.context, {
        order,
        rank: order === 0 ? "primary" : r.kind === "strength" ? "reinforce" : "unranked",
        prioritized: r,
        habitContext: habitContexts.find((x) => x.decisionId === r.id),
      }),
    );
    engine.record(unified, { matchId: h.matchId, timestamp: h.gameCreation ?? null });
  }
  if (current.length > 0) {
    engine.record(current, { matchId: m.matchId, timestamp: m.gameCreation ?? null });
  }
  return engine.aggregate();
}

export interface MatchChainBridgeResult {
  set: DecisionChainSet;
  input: DecisionChainInput;
}

/**
 * Build a Decision Chain set for one real match. `history` is older matches,
 * most-recent-first. Returns null only when there is nothing to coach.
 */
export function buildMatchDecisionChain(
  m: MatchAnalysisInput,
  history: MatchAnalysisInput[] = [],
  timeline?: MatchTimeline,
  now?: string,
): MatchChainBridgeResult | null {
  const tl = timeline ?? buildMatchTimeline(m);
  const issues = issuesFrom(tl);
  if (issues.length === 0) return null;

  const role = normalizeRole(m.role);
  const window = history.slice(0, HISTORY_WINDOW);
  const recurrence = recurrenceMap(window);
  const total = window.length + 1;

  // Real evidence data feeds the EXISTING prioritization engine.
  const withEvidence: PriorityIssueInput[] = issues.map((i) => {
    const past = recurrence.get(i.id) ?? 0;
    return {
      ...i,
      evidenceData: {
        games: past + 1,
        total,
        streak: past + 1,
        sentences: i.evidence ? [i.evidence] : [],
      },
    };
  });

  const priorities = prioritizeDecisions({
    issues: withEvidence,
    role,
    champion: m.champion,
    gamesAnalyzed: total,
  });

  const contexts = priorities.ranked.map((r) => r.context);
  const habitContexts = habitContextsFromContexts(contexts, { champion: m.champion, matchId: m.matchId });
  const unified = priorities.ranked.map((r, order) =>
    buildUnifiedCoachingContext(r.context, {
      order,
      rank: order === 0 ? "primary" : order === 1 ? "secondary" : r.kind === "strength" ? "reinforce" : "unranked",
      prioritized: r,
      habitContext: habitContexts.find((x) => x.decisionId === r.id),
    }),
  );

  // Observed evidence: real stat sentences + real timeline anchors.
  const evidenceByDecisionId: Record<string, DecisionEvidence[]> = {};
  const timestampsByDecisionId: Record<string, number> = {};
  for (const e of tl.events) {
    const seconds = e.replayAnchor.approxTimeSeconds ?? null;
    if (typeof seconds === "number") timestampsByDecisionId[e.id] = seconds;
    const list: DecisionEvidence[] = [];
    if (e.evidence) {
      list.push({
        id: `${e.id}:stat`,
        kind: "match-event",
        statement: e.evidence,
        source: "riot-data",
        observed: true,
        timestampSeconds: seconds ?? undefined,
        matchId: m.matchId,
      });
    }
    list.push({
      id: `${e.id}:outcome`,
      kind: "match-event",
      statement: e.outcome,
      source: "riot-data",
      observed: true,
      timestampSeconds: seconds ?? undefined,
      matchId: m.matchId,
    });
    if (typeof seconds === "number") {
      list.push({
        id: `${e.id}:clock`,
        kind: "timestamp",
        statement: `Observed around ${e.gameTime} of the game.`,
        source: "riot-data",
        observed: true,
        timestampSeconds: seconds,
        matchId: m.matchId,
      });
    }
    evidenceByDecisionId[e.id] = list;
  }

  const input: DecisionChainInput = {
    contexts: unified,
    priorities,
    habits: habitsFor(m, window, unified),
    evidenceByDecisionId,
    timestampsByDecisionId,
    matchId: m.matchId,
    champion: m.champion,
    now,
  };

  return { set: DecisionChainV1.build(input), input };
}

/** The optional Match Report payload. Returns null when unavailable. */
export function buildMatchReportDecisionChain(
  m: MatchAnalysisInput,
  history: MatchAnalysisInput[] = [],
  timeline?: MatchTimeline,
  now?: string,
): MatchReportDecisionChain | null {
  const built = buildMatchDecisionChain(m, history, timeline, now);
  if (!built || built.set.chains.length === 0) return null;
  return DecisionChainV1.forMatchReport(built.set);
}
