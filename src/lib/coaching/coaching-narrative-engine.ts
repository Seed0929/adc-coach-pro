// ---------------------------------------------------------------------------
// BotDiff Coaching Narrative Engine (Sprint 3.4)
//
//   League Intelligence → Curriculum → Role Intelligence
//        → Coaching Pipeline → Decision Prioritization Engine
//              → Coaching Narrative Engine
//
// This layer does NOT detect mistakes. It explains WHY the game unfolded the
// way it did, always in the same seven-beat coaching sequence:
//
//   1. What happened
//   2. Why it happened
//   3. Which decision caused it
//   4. Which League fundamental it represents
//   5. How it changed the game state
//   6. What good players typically do instead
//   7. One specific improvement to practice next game
//
// Every sentence is selected from the knowledge layers already merged into a
// CoachingContext — nothing is invented, nothing is random, and identical
// inputs always produce byte-identical narratives.
//
// Champion Intelligence is OPTIONAL: when present it adds champion context,
// when absent the narrative falls back to Role + League Intelligence.
//
// PURE + client-safe. No AI, no network, no Riot calls.
// ---------------------------------------------------------------------------
import type { CoachingContext } from "./coaching-pipeline";
import {
  prioritizeDecisions,
  type DecisionPriorityInput,
  type DecisionPriorityResult,
  type PrioritizedDecision,
} from "./decision-priority-engine";
import { getDecisionPattern } from "./knowledge-base";
import type { RoleId } from "./knowledge-base/templates/champion";

// ---------------------------------------------------------------------------
// Narrative shapes
// ---------------------------------------------------------------------------

export interface NarrativeBeat {
  /** Stable slot id — surfaces can key off this without parsing text. */
  id:
    | "what-happened"
    | "why-it-happened"
    | "causing-decision"
    | "fundamental"
    | "game-state-change"
    | "what-good-players-do"
    | "practice-next-game";
  heading: string;
  body: string;
  /** Supporting lines from the knowledge layers (may be empty). */
  details: string[];
}

export interface CoachingNarrative {
  /** The decision this narrative explains. */
  decisionId: string;
  decisionLabel: string;
  kind: "strength" | "weakness";
  focusTopic: string;
  fundamental: string;
  role: RoleId;
  roleLabel: string;
  /** Champion name when Champion Intelligence contributed, else null. */
  champion: string | null;
  championContext: string[];
  /** The seven beats, always in the same order, never empty. */
  beats: NarrativeBeat[];
  /** Evidence sentences grounded in real games. */
  evidence: string[];
  /** One measurable thing to practice next game. */
  practiceGoal: string;
  /** Full narrative as a readable paragraph sequence. */
  fullText: string;
}

export interface CoachingNarrativeReport {
  role: RoleId;
  roleLabel: string;
  /** Narrative for the single decision to improve first. */
  primary: CoachingNarrative | null;
  /** Narrative for the secondary priority. */
  secondary: CoachingNarrative | null;
  /** Narrative celebrating the strength worth reinforcing. */
  strength: CoachingNarrative | null;
  /** Narrative for the cheapest in-game recovery win. */
  recovery: CoachingNarrative | null;
  /** Narratives for every ranked decision, priority order. */
  all: CoachingNarrative[];
  /** The priority result this narrative report was built from. */
  priorities: DecisionPriorityResult;
  championIntelligenceUsed: boolean;
}

// ---------------------------------------------------------------------------
// Beat assembly — every line comes from the merged knowledge context
// ---------------------------------------------------------------------------

function firstOf(...values: (string | undefined)[]): string {
  for (const v of values) if (v && v.trim()) return v.trim();
  return "";
}

function dedupe(values: (string | undefined)[], limit: number): string[] {
  const out: string[] = [];
  for (const v of values) {
    if (!v || !v.trim()) continue;
    const t = v.trim();
    if (!out.includes(t)) out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

function championContextFor(c: CoachingContext): string[] {
  const champ = c.championIntelligence;
  if (!champ || !champ.isKnown) return [];
  return dedupe(
    [
      champ.identity ? `${champ.name}: ${champ.identity}` : undefined,
      champ.winCondition ? `Win condition: ${champ.winCondition}` : undefined,
      champ.powerSpikes.length ? `Power spikes: ${champ.powerSpikes.join(", ")}` : undefined,
    ],
    3,
  );
}

function buildBeats(
  d: PrioritizedDecision,
  c: CoachingContext,
  championContext: string[],
): NarrativeBeat[] {
  const pattern = c.routing?.decisionChainRef
    ? getDecisionPattern(c.routing.decisionChainRef)
    : undefined;
  const isStrength = d.kind === "strength";
  const chain = c.decisionChain;

  // Role + League fallbacks used whenever Champion Intelligence is absent.
  const roleLine = firstOf(
    c.roleProfile.fundamentalExpression.find((f) => f.fundamental === c.fundamental.id)?.philosophy,
    c.roleExpectations[0],
  );
  const leagueLine = firstOf(
    c.leagueKnowledge.concepts[0]
      ? `${c.leagueKnowledge.concepts[0].label}: ${c.leagueKnowledge.concepts[0].definition}`
      : undefined,
    c.leagueKnowledge.references[0],
    c.leagueKnowledge.purpose,
  );

  // 1 — What happened
  const whatHappened: NarrativeBeat = {
    id: "what-happened",
    heading: "What happened",
    body: firstOf(d.evidence[0], c.issue.evidence, `${d.label} — ${c.curriculumTopic.definition}`),
    details: dedupe([...d.evidence.slice(1), c.curriculumTopic.definition], 3),
  };

  // 2 — Why it happened
  const whyItHappened: NarrativeBeat = {
    id: "why-it-happened",
    heading: "Why it happened",
    body: firstOf(
      isStrength ? c.curriculumTopic.whyItMatters : pattern?.shortExplanation,
      c.curriculumTopic.whyItMatters,
      c.fundamental.purpose,
    ),
    details: dedupe(
      [
        pattern?.longExplanation,
        isStrength ? undefined : c.commonMistakes[0],
        c.curriculumTopic.commonMisconceptions[0],
        roleLine,
      ],
      3,
    ),
  };

  // 3 — Which decision caused it
  const causingDecision: NarrativeBeat = {
    id: "causing-decision",
    heading: "The decision behind it",
    body: firstOf(
      pattern?.decision,
      chain.decision,
      isStrength ? c.positiveExamples[0] : c.negativeExamples[0],
    ),
    details: dedupe(
      [
        pattern?.recognizeCue,
        isStrength ? c.positiveExamples[0] : c.negativeExamples[0],
        c.decisionPriority[0] ? `${c.decisionPriority[0].tier.toUpperCase()} priority for ${c.roleLabel}: ${c.decisionPriority[0].decision}` : undefined,
      ],
      3,
    ),
  };

  // 4 — Which League fundamental it represents
  const fundamentalBeat: NarrativeBeat = {
    id: "fundamental",
    heading: `Fundamental: ${c.fundamental.label}`,
    body: firstOf(c.fundamental.definition, c.leagueKnowledge.definition),
    details: dedupe(
      [
        `Curriculum topic: ${c.curriculumTopic.label} — ${c.curriculumTopic.definition}`,
        roleLine,
        leagueLine,
        ...c.fundamental.coreConcepts.slice(0, 2),
      ],
      4,
    ),
  };

  // 5 — How it changed the game state
  const gameState: NarrativeBeat = {
    id: "game-state-change",
    heading: "How it changed the game",
    body: firstOf(
      pattern?.immediateConsequence,
      chain.immediateResult,
      c.typicalConsequences[0],
    ),
    details: dedupe(
      [
        chain.tempoImpact,
        chain.objectiveImpact,
        chain.longTermImpact,
        pattern?.laterConsequence,
        pattern?.likelyOutcome,
      ],
      4,
    ),
  };

  // 6 — What good players typically do instead
  const goodPlayers: NarrativeBeat = {
    id: "what-good-players-do",
    heading: isStrength ? "What strong players do with this" : "What strong players do instead",
    body: firstOf(
      c.curriculumTopic.skillProgression.diamond,
      c.positiveExamples[0],
      c.curriculumTopic.positiveCoachingExamples[0],
    ),
    details: dedupe(
      [
        c.curriculumTopic.skillProgression.challenger,
        ...c.positiveExamples.slice(0, 2),
        ...championContext.slice(0, 1),
        roleLine,
      ],
      4,
    ),
  };

  // 7 — One specific improvement to practice next game
  const practice: NarrativeBeat = {
    id: "practice-next-game",
    heading: "Practice next game",
    body: firstOf(
      d.practice,
      c.routing?.practiceDrill,
      chain.practiceRecommendation,
      c.practiceDrills[0],
      c.practiceLibrary[0]?.measurable,
    ),
    details: dedupe(
      [
        c.practiceLibrary[0] ? `${c.practiceLibrary[0].label} — ${c.practiceLibrary[0].measurable}` : undefined,
        isStrength ? undefined : firstOf(d.recovery, c.recoveryAdvice[0]),
      ],
      2,
    ),
  };

  return [
    whatHappened,
    whyItHappened,
    causingDecision,
    fundamentalBeat,
    gameState,
    goodPlayers,
    practice,
  ];
}

/** Build the narrative for one prioritized decision. */
export function buildNarrativeForDecision(d: PrioritizedDecision): CoachingNarrative {
  const c = d.context;
  const championContext = championContextFor(c);
  const beats = buildBeats(d, c, championContext);
  const practiceGoal = beats[6].body;

  return {
    decisionId: d.id,
    decisionLabel: d.label,
    kind: d.kind,
    focusTopic: c.curriculumTopic.label,
    fundamental: c.fundamental.label,
    role: c.role,
    roleLabel: c.roleLabel,
    champion: championContext.length ? c.championIntelligence?.name ?? null : null,
    championContext,
    beats,
    evidence: d.evidence,
    practiceGoal,
    fullText: beats
      .filter((b) => b.body)
      .map((b) => `${b.heading}: ${b.body}`)
      .join("\n\n"),
  };
}

/** Build the full narrative report from an existing priority result. */
export function buildNarrativeReport(
  priorities: DecisionPriorityResult,
): CoachingNarrativeReport {
  const cache = new Map<string, CoachingNarrative>();
  const narrate = (d: PrioritizedDecision | null): CoachingNarrative | null => {
    if (!d) return null;
    const hit = cache.get(d.id);
    if (hit) return hit;
    const n = buildNarrativeForDecision(d);
    cache.set(d.id, n);
    return n;
  };

  const all = priorities.ranked.map((d) => narrate(d)!);

  return {
    role: priorities.role,
    roleLabel: priorities.roleLabel,
    primary: narrate(priorities.currentHighestPriority),
    secondary: narrate(priorities.secondaryPriority),
    strength: narrate(priorities.strengthWorthReinforcing),
    recovery: narrate(priorities.recoveryOpportunity),
    all,
    priorities,
    championIntelligenceUsed: priorities.championIntelligenceUsed,
  };
}

/** One-call path: detected issues → priorities → narrative report. */
export function buildCoachingNarrative(
  input: DecisionPriorityInput,
): CoachingNarrativeReport {
  return buildNarrativeReport(prioritizeDecisions(input));
}

/**
 * Namespaced facade — Match Reports, Replay Coach, Practice Planner, Weekly
 * Reports and the future AI Coach all consume narrative generation here so
 * every surface tells the player the exact same story.
 */
export const CoachingNarrative = {
  build: buildCoachingNarrative,
  fromPriorities: buildNarrativeReport,
  forDecision: buildNarrativeForDecision,
} as const;

export type CoachingNarrativeFacade = typeof CoachingNarrative;