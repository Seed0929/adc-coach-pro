// ---------------------------------------------------------------------------
// Curriculum Routing Layer — Sprint 3.0
//
// The Coach Engine must NEVER randomly explain concepts. Every detected habit
// (from the Habit Engine) or reusable decision pattern (from the Decision
// Library) is mapped here to one PRIMARY curriculum topic plus supporting
// topics, a recovery lesson, and a practice drill.
//
// Contract:
//   Detected Habit
//     ↓
//   Primary Curriculum Topic
//     ↓
//   Supporting Curriculum Topics
//     ↓
//   Practice Recommendation
//     ↓
//   Decision Chain explanation
//     ↓
//   Recovery Recommendation
//
// This module is champion-agnostic on purpose. Champion / Item / Rune /
// Matchup / Power Spike / Tempo / Economy facts come from League Intelligence
// and (eventually) Data Dragon. Routing only decides WHICH concepts are
// taught.
//
// Consumed by: Match Coach Report, Replay Coach, AI Coach, Practice Planner.
// PURE + client-safe.
// ---------------------------------------------------------------------------
import type { CurriculumTopic, CurriculumTopicId } from "./curriculum";
import {
  getCurriculumTopic,
  isCurriculumTopicId,
} from "./curriculum";
import type { RoleId } from "./templates/champion";
import type { KnowledgeSource } from "./types";

/** Elo tiers we surface routing for. `any` = the pattern applies at every tier. */
export type EloBand =
  | "any"
  | "iron-bronze"
  | "silver-gold"
  | "platinum-emerald"
  | "diamond-plus";

/** Higher = more coaching priority when multiple routes match. */
export type RoutingWeight = 1 | 2 | 3 | 4 | 5;

export interface CurriculumRoutingEntry {
  /** Stable id of the detected pattern — habit id OR decision pattern id. */
  patternId: string;
  /** Human label used in analytics / debugging. Not shown to users directly. */
  patternLabel: string;
  /** The single lesson this pattern is really about. */
  primaryTopic: CurriculumTopicId;
  /** Concepts that reinforce the primary lesson. Ordered by relevance. */
  supportingTopics: CurriculumTopicId[];
  /** Coaching priority (5 = must-teach). */
  importance: RoutingWeight;
  /** Empty array = universal (applies to every role). */
  roles: RoleId[];
  /** Where the pattern is most common. `any` = every tier. */
  typicalElo: EloBand;
  /** One-line concrete positive execution. */
  positiveExample: string;
  /** One-line concrete negative execution. */
  negativeExample: string;
  /** How to recover in the same game after this pattern happens. */
  recoveryMethod: string;
  /** One measurable practice drill (fed to the Practice Planner). */
  practiceDrill: string;
  /** Decision Library id to render as a chain — optional if none applies. */
  decisionChainRef?: string;
  /** The topic to open when the player asks "help me recover from this". */
  recoveryTopic?: CurriculumTopicId;
  source: KnowledgeSource;
}

const R = (
  e: Omit<CurriculumRoutingEntry, "source" | "recoveryTopic"> & {
    recoveryTopic?: CurriculumTopicId;
  },
): CurriculumRoutingEntry => ({
  source: "curated",
  recoveryTopic: e.recoveryTopic ?? e.primaryTopic,
  ...e,
});

// ---------------------------------------------------------------------------
// Routing table
//
// Pattern IDs come from:
//   • Habit Engine  (src/lib/coaching/role-intelligence.ts)  → e.g. "adc-greedy-recall"
//   • Decision Library (knowledge-base/decision-library.ts)  → e.g. "late-recall"
//
// Every entry is champion-agnostic. Role scoping is optional.
// ---------------------------------------------------------------------------
export const CURRICULUM_ROUTING: CurriculumRoutingEntry[] = [
  // ── Universal habits ──────────────────────────────────────────────────
  R({
    patternId: "u-overextend-lead",
    patternLabel: "Overextending with a lead",
    primaryTopic: "positioning",
    supportingTopics: ["decision-making", "mental-decision-making", "win-conditions"],
    importance: 5,
    roles: [],
    typicalElo: "silver-gold",
    positiveExample: "Ahead 2 kills — you crash the wave, take a plate, ward, and reset.",
    negativeExample: "Ahead 2 kills — you dive again solo and give the enemy shutdown gold.",
    recoveryMethod: "Play the next two minutes for vision and objectives from safety. Do not force another fight.",
    practiceDrill: "For 5 games: after every kill, ask 'what free objective does this unlock?' before re-engaging.",
    decisionChainRef: "unsafe-positioning",
  }),
  R({
    patternId: "u-low-participation",
    patternLabel: "Not grouping for fights & objectives",
    primaryTopic: "map-movement",
    supportingTopics: ["objective-control", "tempo", "decision-making"],
    importance: 4,
    roles: [],
    typicalElo: "any",
    positiveExample: "You crash your wave and immediately path toward the dragon pit before it spawns.",
    negativeExample: "You farm a side wave while your team contests baron 4v5.",
    recoveryMethod: "After the next wave crash, path directly to the next objective — even if it means giving up a side wave.",
    practiceDrill: "For 3 games: every time an objective timer hits 0:45, note your distance from it in gold.",
    decisionChainRef: "weak-rotation",
  }),
  R({
    patternId: "u-weak-objectives",
    patternLabel: "Weak objective setup",
    primaryTopic: "objective-control",
    supportingTopics: ["vision", "tempo", "map-movement"],
    importance: 5,
    roles: [],
    typicalElo: "any",
    positiveExample: "You clear enemy wards and place a control ward 60s before dragon spawns.",
    negativeExample: "Dragon spawns and you're still shoving a mid wave with no vision on the pit.",
    recoveryMethod: "Concede the current objective, reset vision, and set up the next one 60s early.",
    practiceDrill: "For 5 games: place at least one control ward near the next objective on every recall.",
    decisionChainRef: "poor-objective-setup",
  }),
  R({
    patternId: "u-die-before-damage",
    patternLabel: "Dies before dealing damage",
    primaryTopic: "spacing",
    supportingTopics: ["positioning", "teamfighting", "win-conditions"],
    importance: 5,
    roles: [],
    typicalElo: "any",
    positiveExample: "You hold one screen behind your frontline until the enemy's engage is on cooldown.",
    negativeExample: "You walk up first and get picked before your team steps in.",
    recoveryMethod: "For the rest of the game, wait for a teammate to be the first target before you step into range.",
    practiceDrill: "For 3 games: never be the first name in the kill feed during a teamfight.",
    decisionChainRef: "unsafe-positioning",
  }),

  // Universal strengths — routing reinforces the lesson, not fixes it.
  R({
    patternId: "u-disciplined",
    patternLabel: "Disciplined positioning",
    primaryTopic: "positioning",
    supportingTopics: ["spacing", "consistency"],
    importance: 3,
    roles: [],
    typicalElo: "any",
    positiveExample: "You disengage the moment your escape is down instead of taking one last auto.",
    negativeExample: "(strength) You did not overstay to force damage.",
    recoveryMethod: "Protect this habit — don't let a lead pressure you into risky plays.",
    practiceDrill: "Track deaths ≤3 per game for the next 5 games.",
    decisionChainRef: "disciplined-positioning",
  }),
  R({
    patternId: "u-fight-presence",
    patternLabel: "Strong fight presence",
    primaryTopic: "map-movement",
    supportingTopics: ["objective-control", "decision-making"],
    importance: 2,
    roles: [],
    typicalElo: "any",
    positiveExample: "You path to every dragon and baron on time.",
    negativeExample: "(strength) You do not miss key fights.",
    recoveryMethod: "Keep grouping on time — pair it with clean positioning to convert presence into impact.",
    practiceDrill: "Maintain kill participation ≥60% for the next 5 games.",
    decisionChainRef: "early-rotation",
  }),
  R({
    patternId: "u-objective-control",
    patternLabel: "Strong objective control",
    primaryTopic: "objective-control",
    supportingTopics: ["vision", "tempo"],
    importance: 2,
    roles: [],
    typicalElo: "any",
    positiveExample: "You reliably show up for dragons and barons with vision set up early.",
    negativeExample: "(strength) You do not miss objective windows.",
    recoveryMethod: "Keep setting up early — this is a real climbing strength.",
    practiceDrill: "Track dragon+baron participation ≥3 per game across 5 games.",
    decisionChainRef: "strong-objective-setup",
  }),

  // ── ADC habits ────────────────────────────────────────────────────────
  R({
    patternId: "adc-lose-lane",
    patternLabel: "Losing the laning phase",
    primaryTopic: "trading",
    supportingTopics: ["wave-management", "champion-identity", "economy"],
    importance: 5,
    roles: ["adc"],
    typicalElo: "iron-bronze",
    positiveExample: "You only step up to CS after the enemy's poke spell is on cooldown.",
    negativeExample: "You walk up to last-hit while low and eat a full combo.",
    recoveryMethod: "Freeze the wave near your tower, catch up on CS safely, and recall on the next crash.",
    practiceDrill: "For 5 games: only trade when the enemy's key spell is on cooldown.",
    decisionChainRef: "poor-resource-usage",
    recoveryTopic: "wave-management",
  }),
  R({
    patternId: "adc-greedy-recall",
    patternLabel: "Greedy recalls / staying too long",
    primaryTopic: "recall-timing",
    supportingTopics: ["wave-management", "economy", "tempo"],
    importance: 5,
    roles: ["adc"],
    typicalElo: "any",
    positiveExample: "Wave crashes into enemy tower — you recall instantly with 1300 gold.",
    negativeExample: "Wave crashes — you stay for one more and get collapsed on by the jungler.",
    recoveryMethod: "Next reset: recall the moment the wave crashes, no extra wave, no exceptions.",
    practiceDrill: "For 5 games: never spend more than 15s in lane after a wave crashes into their tower.",
    decisionChainRef: "late-recall",
  }),
  R({
    patternId: "adc-stay-after-trade",
    patternLabel: "Winning trades but not translating them",
    primaryTopic: "wave-management",
    supportingTopics: ["recall-timing", "tempo", "economy"],
    importance: 4,
    roles: ["adc"],
    typicalElo: "silver-gold",
    positiveExample: "You win a trade, crash the next wave, and recall on the crash for an item spike.",
    negativeExample: "You win a trade then stand in lane doing nothing while their support roams.",
    recoveryMethod: "Immediately convert the current wave state into a crash + reset — don't linger.",
    practiceDrill: "For 5 games: after every won trade, verbalize 'crash and reset' before your next action.",
    decisionChainRef: "wave-crash",
  }),
  R({
    patternId: "adc-fight-without-spike",
    patternLabel: "Fighting without item spikes",
    primaryTopic: "power-spikes",
    supportingTopics: ["decision-making", "teamfighting", "win-conditions"],
    importance: 5,
    roles: ["adc"],
    typicalElo: "any",
    positiveExample: "You disengage a mid-game skirmish because you're one item behind.",
    negativeExample: "You commit to a fight one item down and die before dealing damage.",
    recoveryMethod: "Farm two side waves to close the item gap before joining another fight.",
    practiceDrill: "For 3 games: refuse every fight until your two-item spike is complete.",
    decisionChainRef: "fighting-without-spike",
  }),
  R({
    patternId: "adc-weak-midgame-farm",
    patternLabel: "Weak mid-game farming",
    primaryTopic: "economy",
    supportingTopics: ["wave-management", "map-movement", "resource-management"],
    importance: 4,
    roles: ["adc"],
    typicalElo: "iron-bronze",
    positiveExample: "Between objectives you always catch the nearest side wave.",
    negativeExample: "You group with your team and stand still while three waves crash uncollected.",
    recoveryMethod: "For the next 5 minutes, prioritize the nearest uncollected side wave over grouping.",
    practiceDrill: "For 5 games: maintain CS/min ≥ 7.5 through minute 20.",
    decisionChainRef: "missed-wave-crash",
  }),
  R({
    patternId: "adc-low-vision",
    patternLabel: "Weak vision control",
    primaryTopic: "vision",
    supportingTopics: ["objective-control", "map-movement"],
    importance: 4,
    roles: ["adc"],
    typicalElo: "silver-gold",
    positiveExample: "You buy a control ward every recall and drop it before entering the river.",
    negativeExample: "You walk into the river blind and get picked before the fight starts.",
    recoveryMethod: "Buy one control ward on your next recall and place it before your next rotation.",
    practiceDrill: "For 5 games: place ≥1 control ward per recall.",
    decisionChainRef: "poor-objective-setup",
  }),
  R({
    patternId: "adc-win-lane",
    patternLabel: "Excellent lane trading",
    primaryTopic: "trading",
    supportingTopics: ["wave-management", "recall-timing"],
    importance: 3,
    roles: ["adc"],
    typicalElo: "any",
    positiveExample: "You punish every missed enemy skillshot with a full trade.",
    negativeExample: "(strength) You do not miss punish windows.",
    recoveryMethod: "Convert lane leads into plates and a first-drake setup — protect the lead by resetting on time.",
    practiceDrill: "Turn every 400+ gold lead into a plate or drake within 3 minutes.",
    decisionChainRef: "early-recall",
  }),
  R({
    patternId: "adc-carry-damage",
    patternLabel: "High carry damage",
    primaryTopic: "teamfighting",
    supportingTopics: ["spacing", "positioning"],
    importance: 3,
    roles: ["adc"],
    typicalElo: "any",
    positiveExample: "You keep auto-attacking the closest safe target through the fight.",
    negativeExample: "(strength) You already deal reliable damage.",
    recoveryMethod: "Protect this by staying alive longer — the next step is damage without dying.",
    practiceDrill: "For 5 games: damage share ≥30% AND deaths ≤3.",
    decisionChainRef: "fight-on-spike",
  }),
  R({
    patternId: "adc-clean-cs",
    patternLabel: "Reliable farming",
    primaryTopic: "economy",
    supportingTopics: ["wave-management", "consistency"],
    importance: 2,
    roles: ["adc"],
    typicalElo: "any",
    positiveExample: "You never let waves go uncollected.",
    negativeExample: "(strength) You do not drop CS.",
    recoveryMethod: "Protect this after minute 15 — the CS drop-off is where most ADCs lose their lead.",
    practiceDrill: "Maintain CS/min ≥8 for the next 5 games.",
    decisionChainRef: "disciplined-reset",
  }),

  // ── Jungle / Top / Mid / Support ──────────────────────────────────────
  R({
    patternId: "jgl-late-objectives",
    patternLabel: "Late objective setups",
    primaryTopic: "objective-control",
    supportingTopics: ["tempo", "vision", "map-movement"],
    importance: 5,
    roles: ["jungle"],
    typicalElo: "any",
    positiveExample: "Your last camp finishes 45s before dragon spawns and you ward the pit.",
    negativeExample: "You're clearing raptors when dragon spawns.",
    recoveryMethod: "Skip your next camp and reset vision around the upcoming objective.",
    practiceDrill: "For 5 games: be within 1500 range of the objective 45s before spawn.",
    decisionChainRef: "poor-objective-setup",
  }),
  R({
    patternId: "top-no-map-impact",
    patternLabel: "Wins lane but never influences the map",
    primaryTopic: "map-movement",
    supportingTopics: ["tempo", "win-conditions", "objective-control"],
    importance: 4,
    roles: ["top"],
    typicalElo: "silver-gold",
    positiveExample: "You crash your wave and TP into a dragon fight your team is contesting.",
    negativeExample: "You farm your lead while your team fights baron 4v5.",
    recoveryMethod: "Save TP for the next objective — do not spend it on a lane trade.",
    practiceDrill: "For 5 games: use ≥1 TP per game for an objective or side-lane pressure.",
    decisionChainRef: "weak-side-discipline",
  }),
  R({
    patternId: "mid-missed-roams",
    patternLabel: "Missing roam timers",
    primaryTopic: "map-movement",
    supportingTopics: ["wave-management", "tempo", "objective-control"],
    importance: 4,
    roles: ["mid"],
    typicalElo: "silver-gold",
    positiveExample: "You shove the wave and roam to bot before the enemy mid can follow.",
    negativeExample: "Your wave crashes and you stand in mid doing nothing.",
    recoveryMethod: "On the next shove, roam or ward the nearest objective — don't stay in mid.",
    practiceDrill: "For 5 games: at least 2 roams per game after shoving the wave.",
    decisionChainRef: "weak-rotation",
  }),
  R({
    patternId: "sup-late-roam",
    patternLabel: "Roaming and vision too late",
    primaryTopic: "vision",
    supportingTopics: ["map-movement", "objective-control", "tempo"],
    importance: 5,
    roles: ["support"],
    typicalElo: "any",
    positiveExample: "You leave lane on the recall and set up objective vision 60s early.",
    negativeExample: "Dragon is up and you're just arriving from bot lane.",
    recoveryMethod: "Concede the current objective and reset vision for the next one 60s early.",
    practiceDrill: "For 5 games: place ≥3 wards near the next objective before it spawns.",
    decisionChainRef: "poor-objective-setup",
  }),

  // ── Decision Library patterns (reusable across engines) ───────────────
  R({
    patternId: "late-recall",
    patternLabel: "Late Recall",
    primaryTopic: "recall-timing",
    supportingTopics: ["wave-management", "economy", "tempo"],
    importance: 5,
    roles: [],
    typicalElo: "any",
    positiveExample: "You recall on the crash with 1400 gold and return with an item spike.",
    negativeExample: "You stay for one more wave and get collapsed on with 1400 unspent gold.",
    recoveryMethod: "Reset immediately at the next crash — do not stack gold on the map.",
    practiceDrill: "Never carry more than 1500 unspent gold on the map for 5 games.",
    decisionChainRef: "late-recall",
  }),
  R({
    patternId: "poor-objective-setup",
    patternLabel: "Poor objective setup",
    primaryTopic: "objective-control",
    supportingTopics: ["vision", "tempo", "map-movement"],
    importance: 5,
    roles: [],
    typicalElo: "any",
    positiveExample: "You clear enemy vision 60s before the objective and hold priority.",
    negativeExample: "Objective spawns and neither team has priority; you contest blind.",
    recoveryMethod: "Concede the current objective, prep vision, and set up the next one.",
    practiceDrill: "Place a control ward near every objective 60s before it spawns for 5 games.",
    decisionChainRef: "poor-objective-setup",
  }),
  R({
    patternId: "unsafe-positioning",
    patternLabel: "Unsafe positioning",
    primaryTopic: "positioning",
    supportingTopics: ["spacing", "teamfighting", "mental-decision-making"],
    importance: 5,
    roles: [],
    typicalElo: "any",
    positiveExample: "You stay one screen behind your frontline until engage is used.",
    negativeExample: "You walk up first and get chunked before the fight starts.",
    recoveryMethod: "For the rest of the game, wait for a teammate to be the first target.",
    practiceDrill: "For 3 games: never be the first name in the fight-death kill feed.",
    decisionChainRef: "unsafe-positioning",
  }),
  R({
    patternId: "weak-rotation",
    patternLabel: "Weak rotation",
    primaryTopic: "map-movement",
    supportingTopics: ["tempo", "objective-control", "decision-making"],
    importance: 4,
    roles: [],
    typicalElo: "any",
    positiveExample: "You rotate to the next objective the moment your wave crashes.",
    negativeExample: "You farm a side wave while your team contests baron 4v5.",
    recoveryMethod: "Cut your next side wave and path to the fight.",
    practiceDrill: "For 5 games: after every wave crash, path toward the nearest objective within 10s.",
    decisionChainRef: "weak-rotation",
  }),
  R({
    patternId: "fighting-without-spike",
    patternLabel: "Fighting without a power spike",
    primaryTopic: "power-spikes",
    supportingTopics: ["decision-making", "economy", "teamfighting"],
    importance: 5,
    roles: [],
    typicalElo: "silver-gold",
    positiveExample: "You refuse a skirmish because you're one item behind.",
    negativeExample: "You engage a fight one item down and die first.",
    recoveryMethod: "Farm to close the item gap before joining another fight.",
    practiceDrill: "For 3 games: refuse every fight until your key spike is online.",
    decisionChainRef: "fighting-without-spike",
  }),
  R({
    patternId: "overchasing",
    patternLabel: "Overchasing kills",
    primaryTopic: "mental-decision-making",
    supportingTopics: ["positioning", "decision-making", "win-conditions"],
    importance: 4,
    roles: [],
    typicalElo: "iron-bronze",
    positiveExample: "You break off a chase into an unwarded jungle and take the free objective instead.",
    negativeExample: "You chase a low enemy into their jungle and die to a collapse.",
    recoveryMethod: "For the rest of the game, break off any chase that enters unwarded jungle.",
    practiceDrill: "For 5 games: no deaths from chasing into unwarded areas.",
    decisionChainRef: "overchasing",
  }),
];

// ---------------------------------------------------------------------------
// Indexing + lookups
// ---------------------------------------------------------------------------
const ROUTING_INDEX: Map<string, CurriculumRoutingEntry> = new Map(
  CURRICULUM_ROUTING.map((e) => [e.patternId, e]),
);

/** Full routing entry for a habit / decision id, or `undefined` if not routed. */
export function getCurriculumForHabit(
  patternId: string,
): CurriculumRoutingEntry | undefined {
  return ROUTING_INDEX.get(patternId);
}

/**
 * Primary + supporting curriculum topics for a habit, resolved to their full
 * `CurriculumTopic` records. Silently drops any topic id that has not been
 * populated yet — routing degrades gracefully.
 */
export function getPracticeTopics(patternId: string): CurriculumTopic[] {
  const entry = ROUTING_INDEX.get(patternId);
  if (!entry) return [];
  const ids: CurriculumTopicId[] = [entry.primaryTopic, ...entry.supportingTopics];
  const seen = new Set<CurriculumTopicId>();
  const out: CurriculumTopic[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const topic = getCurriculumTopic(id);
    if (topic) out.push(topic);
  }
  return out;
}

/** The lesson the Coach opens when a player asks "how do I recover from this". */
export function getRecoveryLesson(patternId: string): CurriculumTopic | undefined {
  const entry = ROUTING_INDEX.get(patternId);
  if (!entry) return undefined;
  return getCurriculumTopic(entry.recoveryTopic ?? entry.primaryTopic);
}

/** Supporting topics only (primary excluded), fully resolved. */
export function getSupportingConcepts(patternId: string): CurriculumTopic[] {
  const entry = ROUTING_INDEX.get(patternId);
  if (!entry) return [];
  const out: CurriculumTopic[] = [];
  for (const id of entry.supportingTopics) {
    const topic = getCurriculumTopic(id);
    if (topic) out.push(topic);
  }
  return out;
}

/** All routing entries applicable to a role (empty roles = universal). */
export function routingForRole(role: RoleId): CurriculumRoutingEntry[] {
  return CURRICULUM_ROUTING.filter(
    (e) => e.roles.length === 0 || e.roles.includes(role),
  );
}

/** All routing entries whose primary or supporting topic matches the given id. */
export function routingForTopic(
  topicId: CurriculumTopicId,
): CurriculumRoutingEntry[] {
  return CURRICULUM_ROUTING.filter(
    (e) => e.primaryTopic === topicId || e.supportingTopics.includes(topicId),
  );
}

/**
 * Rank the routes for the current match by importance. When several habits
 * fire, the Coach Engine feeds them here and takes the top-N to teach.
 * Unknown ids are dropped, not fabricated.
 */
export function rankRoutesByImportance(
  patternIds: string[],
): CurriculumRoutingEntry[] {
  const seen = new Set<string>();
  const out: CurriculumRoutingEntry[] = [];
  for (const id of patternIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const entry = ROUTING_INDEX.get(id);
    if (entry) out.push(entry);
  }
  return out.sort((a, b) => b.importance - a.importance);
}

/** Type guard — useful when reading pattern ids from persisted data. */
export function isRoutedPatternId(id: string): boolean {
  return ROUTING_INDEX.has(id);
}

/** Escape hatch for tests + debugging. Do not mutate. */
export function _allRoutingEntries(): readonly CurriculumRoutingEntry[] {
  return CURRICULUM_ROUTING;
}

// Re-export for callers who only import from the routing module.
export { isCurriculumTopicId };