// ---------------------------------------------------------------------------
// BotDiff Coaching Pipeline (Sprint 3.2)
//
// The permanent pipeline every coaching surface consumes:
//
//   Detect Issue
//     ↓ Identify Fundamental
//     ↓ Load League Intelligence
//     ↓ Load Curriculum
//     ↓ Load Role Intelligence
//     ↓ Merge Knowledge  →  CoachingContext
//     ↓ Coach Report  /  Practice Plan  /  Replay Coaching
//
// The Coach Engine NEVER invents coaching text here. Every sentence it emits
// is assembled from the knowledge layers that already exist:
//
//   League Knowledge Base → League Intelligence → Curriculum → Role
//   Intelligence → (optional) Champion Intelligence
//
// Champion Intelligence is OPTIONAL: when a champion has no profile, the
// pipeline still produces complete role-based coaching.
//
// PURE + client-safe. No AI, no network, no Riot calls.
// ---------------------------------------------------------------------------
import {
  getFundamental,
  getCurriculumTopic,
  curriculumForFundamental,
  roleExpressionForTopic,
  getCurriculumForHabit,
  getPracticeTopics,
  getRecoveryLesson,
  getSupportingConcepts,
  getDecisionPattern,
  type CurriculumRoutingEntry,
  type CurriculumTopic,
  type CurriculumTopicId,
  type DecisionChain as CurriculumDecisionChain,
  type LeagueFundamental,
  type LeagueFundamentalId,
} from "./knowledge-base";
import type { RoleId } from "./knowledge-base/templates/champion";
// League Intelligence modules are imported directly (not through the facade)
// so the pipeline never participates in the facade's re-export cycle.
import * as TempoIntel from "./league-intelligence/tempo";
import * as EconomyIntel from "./league-intelligence/economy";
import * as ObjectiveIntel from "./league-intelligence/objective";
import * as MapIntel from "./league-intelligence/map";
import {
  getRoleProfile,
  inheritableRoleProfile,
  roleDecisionPriorities,
  roleHabitLibrary,
  rolePracticeLibrary,
  type InheritableRoleProfile,
  type RoleDecisionPriority,
  type RoleHabitEntry,
  type RolePracticeItem,
  type RoleProfile,
} from "./role-intelligence-v1";
import { getChampionProfile, type ChampionProfile } from "./champion-intelligence";
import { habitContextsFromContexts, type HabitContext, type HabitContextOptions } from "./habit-context";
import {
  buildUnifiedCoachingContexts,
  type UnifiedCoachingContext,
} from "./unified-coaching-context";
import type { Fundamental as DisplayFundamental } from "./decision-chain";
import type { Pillar } from "./pillars";

// ---------------------------------------------------------------------------
// Step 2 — Identify Fundamental
// ---------------------------------------------------------------------------

/** Display fundamentals used by the decision chain → curriculum topic ids. */
const DISPLAY_TO_TOPIC: Record<DisplayFundamental, CurriculumTopicId> = {
  "Wave Management": "wave-management",
  Tempo: "tempo",
  Vision: "vision",
  Trading: "trading",
  "Recall Timing": "recall-timing",
  "Objective Setup": "objective-control",
  Positioning: "positioning",
  "Power Spikes": "power-spikes",
  Economy: "economy",
  "Map Movement": "map-movement",
  Teamfighting: "teamfighting",
  Spacing: "spacing",
  "Resource Management": "resource-management",
  "Champion Identity": "champion-identity",
};

/** Habit/pattern categories + pillars → curriculum topic ids. */
const CATEGORY_TO_TOPIC: Record<string, CurriculumTopicId> = {
  lane: "trading",
  wave: "wave-management",
  farming: "economy",
  economy: "economy",
  recall: "recall-timing",
  positioning: "positioning",
  teamfight: "teamfighting",
  spacing: "spacing",
  vision: "vision",
  objective: "objective-control",
  macro: "map-movement",
  tempo: "tempo",
  decision: "decision-making",
  mental: "mental-decision-making",
  consistency: "consistency",
  champion: "champion-identity",
  build: "power-spikes",
};

/** Resolve any BotDiff issue label into a curriculum topic id. */
export function resolveTopicId(
  hint: string | undefined,
  category?: string,
  pillar?: Pillar,
): CurriculumTopicId {
  if (hint && hint in DISPLAY_TO_TOPIC) return DISPLAY_TO_TOPIC[hint as DisplayFundamental];
  const asTopic = hint ? getCurriculumTopic(hint as CurriculumTopicId) : undefined;
  if (asTopic) return asTopic.id;
  if (category && CATEGORY_TO_TOPIC[category]) return CATEGORY_TO_TOPIC[category];
  if (pillar && CATEGORY_TO_TOPIC[pillar]) return CATEGORY_TO_TOPIC[pillar];
  return "decision-making";
}

// ---------------------------------------------------------------------------
// Step 3 — Load League Intelligence (facts only)
// ---------------------------------------------------------------------------

export interface LeagueKnowledgeSlice {
  fundamental: LeagueFundamentalId;
  definition: string;
  purpose: string;
  coreConcepts: string[];
  /** Factual concepts pulled from the League Intelligence modules. */
  concepts: { label: string; definition: string }[];
  /** Objectives / map zones relevant to the fundamental, when applicable. */
  references: string[];
}

function leagueKnowledgeFor(f: LeagueFundamental): LeagueKnowledgeSlice {
  const concepts: { label: string; definition: string }[] = [];
  const references: string[] = [];

  if (f.id === "tempo" || f.id === "wave-management" || f.id === "power-spikes") {
    for (const c of TempoIntel.allTempoConcepts()) {
      concepts.push({ label: c.label, definition: c.definition });
    }
  }
  if (f.id === "economy" || f.id === "resource-management" || f.id === "power-spikes") {
    for (const c of EconomyIntel.allEconomyConcepts()) {
      concepts.push({ label: c.label, definition: c.definition });
    }
  }
  if (f.id === "objective-control" || f.id === "vision") {
    for (const o of ObjectiveIntel.allObjectives()) {
      references.push(`${o.label}: ${o.primaryReward}`);
    }
  }
  if (f.id === "map-movement" || f.id === "positioning" || f.id === "vision") {
    for (const z of MapIntel.allZones()) {
      references.push(
        `${z.label} (${z.side} side)${z.adjacentObjectives.length ? ` — near ${z.adjacentObjectives.join(", ")}` : ""}`,
      );
    }
  }

  return {
    fundamental: f.id,
    definition: f.definition,
    purpose: f.purpose,
    coreConcepts: f.coreConcepts,
    concepts: concepts.slice(0, 6),
    references: references.slice(0, 6),
  };
}

// ---------------------------------------------------------------------------
// The reusable CoachingContext — the standard input for Match Reports, Replay
// Coach, Practice Planner, Champion Intelligence, and the future AI Coach.
// ---------------------------------------------------------------------------

export interface CoachingIssue {
  /** Stable habit / decision-pattern id when known (drives curriculum routing). */
  id: string;
  label: string;
  kind: "strength" | "weakness";
  /** Evidence sentence grounded in the player's real games. */
  evidence?: string;
  /** Display fundamental, curriculum topic id, or free-text hint. */
  fundamentalHint?: string;
  category?: string;
  pillar?: Pillar;
  impact?: "high" | "medium" | "low";
}

export interface CoachingContext {
  issue: CoachingIssue;
  role: RoleId;
  roleLabel: string;
  /** Full role profile (philosophies, responsibilities, priorities). */
  roleProfile: RoleProfile;
  /** Narrow view Champion Intelligence inherits from. */
  inheritableRole: InheritableRoleProfile;
  fundamental: LeagueFundamental;
  curriculumTopic: CurriculumTopic;
  supportingTopics: CurriculumTopic[];
  leagueKnowledge: LeagueKnowledgeSlice;
  routing?: CurriculumRoutingEntry;
  decisionPriority: RoleDecisionPriority[];
  decisionChain: CurriculumDecisionChain;
  practiceLibrary: RolePracticeItem[];
  habitLibrary: RoleHabitEntry[];
  /** Champion Intelligence stays OPTIONAL — undefined is a valid context. */
  championIntelligence?: ChampionProfile;
  /**
   * Champion Intelligence Engine V1 identity. Present ONLY when a populated
   * champion record exists in the registry, so coaching output is byte-for-byte
   * identical while the registry is empty.
   */
  championIdentity?: ChampionIdentityV1;

  // --- assembled knowledge every report can read -------------------------
  whyItMatters: string;
  commonMistakes: string[];
  positiveExamples: string[];
  negativeExamples: string[];
  typicalConsequences: string[];
  recoveryAdvice: string[];
  practiceDrills: string[];
  roleExpectations: string[];
  powerSpikePhilosophy: string[];
  tempoPhilosophy: string[];
  objectivePhilosophy: string[];
  economyPhilosophy: string[];
  positioningPhilosophy: string[];
  mentalFramework: string[];
  consistencyAdvice: string[];
  /** One assembled paragraph — built only from knowledge-layer sentences. */
  coachSummary: string;
}

function uniq(list: (string | undefined)[], limit: number): string[] {
  const out: string[] = [];
  for (const v of list) {
    if (!v) continue;
    if (!out.includes(v)) out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Steps 1-6 of the pipeline for one issue: identify the fundamental, load
 * League Intelligence + Curriculum + Role Intelligence, merge into one
 * CoachingContext.
 */
export function buildCoachingContextFor(
  issue: CoachingIssue,
  role: RoleId,
  champion?: string,
): CoachingContext {
  const routing = getCurriculumForHabit(issue.id);
  const topicId = routing?.primaryTopic ?? resolveTopicId(issue.fundamentalHint, issue.category, issue.pillar);
  const topic =
    getCurriculumTopic(topicId) ??
    curriculumForFundamental("decision-making")[0] ??
    getCurriculumTopic("decision-making")!;
  const fundamental = getFundamental(topic.fundamental);
  const profile = getRoleProfile(role);
  const roleExpression = roleExpressionForTopic(topic.id, role);
  const fundamentalExpression = profile.fundamentalExpression.find(
    (f) => f.fundamental === topic.fundamental,
  );

  const supporting = routing
    ? getSupportingConcepts(issue.id)
    : curriculumForFundamental(topic.fundamental).filter((t) => t.id !== topic.id);
  const recoveryTopic = routing ? getRecoveryLesson(issue.id) : undefined;
  const practiceTopics = routing ? getPracticeTopics(issue.id) : [topic];
  const decisionPattern = routing?.decisionChainRef
    ? getDecisionPattern(routing.decisionChainRef)
    : undefined;

  const championIntelligence = champion ? getChampionProfile(champion) : undefined;
  const championIdentity =
    champion && championIntelligenceAvailable(champion)
      ? championIdentityFor(champion, role)
      : undefined;

  const practiceDrills = uniq(
    [
      routing?.practiceDrill,
      ...practiceTopics.flatMap((t) => t.practiceConcepts),
      ...rolePracticeLibrary(role)
        .filter((p) => p.fundamental === topic.fundamental)
        .map((p) => `${p.label} — ${p.measurable}`),
      ...fundamental.practiceConcepts,
    ],
    5,
  );

  const coachSummary = uniq(
    [
      `${topic.label}: ${topic.definition}`,
      topic.whyItMatters,
      issue.evidence,
      fundamentalExpression
        ? `As ${profile.label}, ${fundamentalExpression.philosophy}`
        : roleExpression?.expression,
      roleExpression?.example ?? fundamentalExpression?.example,
      routing?.recoveryMethod ?? recoveryTopic?.recoveryMethods[0] ?? topic.recoveryMethods[0],
      practiceDrills[0],
    ],
    7,
  ).join(" ");

  return {
    issue,
    role,
    roleLabel: profile.label,
    roleProfile: profile,
    inheritableRole: inheritableRoleProfile(role),
    fundamental,
    curriculumTopic: topic,
    supportingTopics: supporting.slice(0, 3),
    leagueKnowledge: leagueKnowledgeFor(fundamental),
    routing,
    decisionPriority: roleDecisionPriorities(role).filter(
      (d) => d.fundamental === topic.fundamental,
    ),
    decisionChain: topic.decisionChain,
    practiceLibrary: rolePracticeLibrary(role).filter(
      (p) => p.fundamental === topic.fundamental,
    ),
    habitLibrary: roleHabitLibrary(role).filter((h) => h.fundamental === topic.fundamental),
    championIntelligence,
    championIdentity,

    whyItMatters: topic.whyItMatters,
    commonMistakes: uniq([...topic.negativeDecisions, ...fundamental.poorDecisionExamples], 4),
    positiveExamples: uniq(
      [
        routing?.positiveExample,
        ...topic.positiveDecisions,
        ...fundamental.goodDecisionExamples,
      ],
      4,
    ),
    negativeExamples: uniq(
      [routing?.negativeExample, ...topic.negativeDecisions, ...fundamental.poorDecisionExamples],
      4,
    ),
    typicalConsequences: uniq(
      [
        decisionPattern?.immediateConsequence,
        decisionPattern?.laterConsequence,
        ...topic.typicalConsequences,
        ...fundamental.typicalConsequences,
      ],
      4,
    ),
    recoveryAdvice: uniq(
      [
        routing?.recoveryMethod,
        ...(recoveryTopic?.recoveryMethods ?? []),
        ...topic.recoveryMethods,
        ...profile.recoveryPriorities,
      ],
      4,
    ),
    practiceDrills,
    roleExpectations: uniq(
      [
        ...profile.primaryResponsibilities,
        ...profile.primaryWinConditions,
        roleExpression?.expression,
      ],
      5,
    ),
    powerSpikePhilosophy: profile.powerSpikePhilosophy,
    tempoPhilosophy: profile.tempoPhilosophy,
    objectivePhilosophy: profile.objectiveResponsibilities,
    economyPhilosophy: profile.economyPhilosophy,
    positioningPhilosophy: profile.positioningPhilosophy,
    mentalFramework: uniq(
      [
        ...(getCurriculumTopic("mental-decision-making")?.practiceConcepts ?? []),
        ...topic.commonMisconceptions,
      ],
      4,
    ),
    consistencyAdvice: uniq(
      [...profile.consistencyPriorities, ...(getCurriculumTopic("consistency")?.practiceConcepts ?? [])],
      4,
    ),
    coachSummary,
  };
}

// ---------------------------------------------------------------------------
// Steps 7-9 — Coach Report / Practice Plan / Replay Coaching
// ---------------------------------------------------------------------------

export interface PipelineCoachReport {
  focusTopic: string;
  headline: string;
  why: string;
  evidence: string[];
  decisionChain: string[];
  recovery: string[];
  roleExpectations: string[];
  strengthsToKeep: string[];
}

export interface PipelinePracticePlan {
  focusTopic: string;
  drills: string[];
  measurableGoal: string;
  supportingConcepts: string[];
}

export interface PipelineReplayCoaching {
  focusTopic: string;
  whatToLookFor: string[];
  positivePattern: string;
  negativePattern: string;
  decisionPriorities: string[];
}

export interface CoachingPipelineResult {
  role: RoleId;
  /** Merged knowledge for every detected issue, primary first. */
  contexts: CoachingContext[];
  primary: CoachingContext | null;
  report: PipelineCoachReport | null;
  practicePlan: PipelinePracticePlan | null;
  replayCoaching: PipelineReplayCoaching | null;
  /**
   * Standardized, aggregation-ready metadata for every detected decision.
   * Emitted for a future Habit Intelligence Engine — nothing consumes it yet
   * and no persistence or cross-game analysis happens here.
   */
  habitContexts: HabitContext[];
  /**
   * The canonical shared coaching contract, primary first. Match Reports,
   * Replay Coach, Practice Planner, the future AI Coach and Player Memory all
   * consume this object instead of re-deriving knowledge.
   */
  unifiedContexts: UnifiedCoachingContext[];
  /** The one canonical context for the primary decision. */
  unified: UnifiedCoachingContext | null;
}

const IMPACT_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 };

function issueWeight(c: CoachingContext): number {
  const impact = IMPACT_ORDER[c.issue.impact ?? "medium"] ?? 2;
  return (c.routing?.importance ?? 3) * 10 + impact;
}

function coachReport(c: CoachingContext): PipelineCoachReport {
  return {
    focusTopic: c.curriculumTopic.label,
    headline: c.coachSummary,
    why: c.whyItMatters,
    evidence: uniq([c.issue.evidence, ...c.leagueKnowledge.concepts.map((k) => `${k.label}: ${k.definition}`)], 4),
    decisionChain: [
      c.decisionChain.decision,
      c.decisionChain.immediateResult,
      c.decisionChain.tempoImpact,
      c.decisionChain.objectiveImpact,
      c.decisionChain.longTermImpact,
    ],
    recovery: c.recoveryAdvice,
    roleExpectations: c.roleExpectations,
    strengthsToKeep: c.habitLibrary.filter((h) => h.kind === "strength").map((h) => h.label),
  };
}

function practicePlan(c: CoachingContext): PipelinePracticePlan {
  return {
    focusTopic: c.curriculumTopic.label,
    drills: c.practiceDrills,
    measurableGoal:
      c.practiceLibrary[0]?.measurable ??
      c.decisionChain.practiceRecommendation ??
      c.practiceDrills[0],
    supportingConcepts: c.supportingTopics.map((t) => `${t.label}: ${t.definition}`),
  };
}

function replayCoaching(c: CoachingContext): PipelineReplayCoaching {
  return {
    focusTopic: c.curriculumTopic.label,
    whatToLookFor: uniq([...c.negativeExamples, ...c.commonMistakes], 4),
    positivePattern: c.positiveExamples[0] ?? c.curriculumTopic.positiveCoachingExamples[0] ?? "",
    negativePattern: c.negativeExamples[0] ?? "",
    decisionPriorities: (c.decisionPriority.length
      ? c.decisionPriority
      : c.roleProfile.decisionPriorities
    )
      .slice(0, 4)
      .map((d) => `${d.tier.toUpperCase()}: ${d.decision}`),
  };
}

/**
 * The permanent coaching pipeline. Feed it detected issues + the player's role
 * and it returns merged knowledge plus the three coaching outputs.
 */
export function runCoachingPipeline(
  issues: CoachingIssue[],
  role: RoleId,
  champion?: string,
  habitOptions?: HabitContextOptions,
): CoachingPipelineResult {
  const contexts = issues
    .map((i) => buildCoachingContextFor(i, role, champion))
    .sort((a, b) => issueWeight(b) - issueWeight(a));
  const primary = contexts.find((c) => c.issue.kind === "weakness") ?? contexts[0] ?? null;
  const habitContexts = habitContextsFromContexts(contexts, { champion, ...habitOptions });
  const unifiedContexts = buildUnifiedCoachingContexts(contexts, habitContexts);
  return {
    role,
    contexts,
    primary,
    report: primary ? coachReport(primary) : null,
    practicePlan: primary ? practicePlan(primary) : null,
    replayCoaching: primary ? replayCoaching(primary) : null,
    habitContexts,
    unifiedContexts,
    unified: unifiedContexts.find((u) => u.coachingPriority.rank === "primary") ?? null,
  };
}