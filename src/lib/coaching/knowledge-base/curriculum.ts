// ---------------------------------------------------------------------------
// League Coaching Curriculum V1 — permanent, role-agnostic teaching material.
//
// The curriculum is the TEACHING layer on top of the League Knowledge Base.
// - Fundamentals (fundamentals.ts) define WHAT the concept is.
// - Decision Library (decision-library.ts) defines REUSABLE coaching patterns.
// - Role Differentiation (role-differentiation.ts) defines HOW each role
//   expresses a fundamental.
// - This file (CURRICULUM) defines HOW BotDiff TEACHES each concept:
//   short definition, why it matters, positive/negative decisions, typical
//   consequences, recovery, practice ideas, common misconceptions, and a
//   skill progression from bronze-thinking → challenger-thinking.
//
// Every curriculum topic follows the same Decision Framework so Coach Engine,
// Replay Coach, Practice Planner, and future OpenAI prompts can all consume
// the same shape.
//
// Facts + teaching only. No player evaluation. Pure + client-safe.
// Champion-specific examples are intentionally absent — Data Dragon will
// enrich these later without changing the curriculum shape.
// ---------------------------------------------------------------------------
import type { KnowledgeSource } from "./types";
import type { LeagueFundamentalId } from "./fundamentals";
import type { RoleId } from "./templates/champion";
import { roleExpressionsFor, type RoleExpression } from "./role-differentiation";

/**
 * Curriculum covers every League Fundamental plus a handful of teaching-only
 * topics that don't map 1:1 onto a fundamental (e.g. Spacing is a lens on
 * Positioning; Recall Timing is a lens on Tempo; Mental Decision Making is a
 * lens on Decision Making). The IDs are stable so consumers can look topics
 * up without knowing whether they resolve to a fundamental or a sub-topic.
 */
export type CurriculumTopicId =
  | LeagueFundamentalId
  | "spacing"
  | "recall-timing"
  | "teamfighting"
  | "mental-decision-making";

/**
 * Decision Framework — every coaching topic follows the same causal chain.
 * Coach Engine will render these top-to-bottom so players see cause → effect.
 */
export interface DecisionChain {
  decision: string;
  immediateResult: string;
  tempoImpact: string;
  objectiveImpact: string;
  longTermImpact: string;
  practiceRecommendation: string;
}

/** Role-specific execution of a curriculum topic. */
export interface CurriculumRoleExpression {
  role: RoleId;
  expression: string;
  example: string;
}

export interface CurriculumTopic {
  id: CurriculumTopicId;
  label: string;
  /** Which fundamental this topic belongs to (topics may share a fundamental). */
  fundamental: LeagueFundamentalId;
  /** One-sentence plain-English definition. Bronze-friendly. */
  definition: string;
  /** Why the concept matters — what it unlocks or protects. */
  whyItMatters: string;
  /** Canonical positive decisions to celebrate. */
  positiveDecisions: string[];
  /** Canonical negative decisions to correct. */
  negativeDecisions: string[];
  /** What usually happens when the topic is executed poorly. */
  typicalConsequences: string[];
  /** How to recover after breaking the concept. */
  recoveryMethods: string[];
  /** Practice concepts — measurable, reusable. */
  practiceConcepts: string[];
  /** Common misconceptions BotDiff should push back on. */
  commonMisconceptions: string[];
  /**
   * Skill progression ladder: how the same concept is understood at each
   * skill tier. Coach Engine can use this to tailor explanations later.
   */
  skillProgression: {
    bronze: string;
    gold: string;
    diamond: string;
    challenger: string;
  };
  /** Positive coaching examples — celebrate good execution. */
  positiveCoachingExamples: string[];
  /** Canonical decision chain (Decision → Impact → Practice). */
  decisionChain: DecisionChain;
  /** How each role expresses this topic. Falls back to role-differentiation. */
  roleExpressions: CurriculumRoleExpression[];
  source: KnowledgeSource;
}

function roleExpressionsFrom(
  fundamental: LeagueFundamentalId,
  overrides?: CurriculumRoleExpression[],
): CurriculumRoleExpression[] {
  if (overrides && overrides.length > 0) return overrides;
  return roleExpressionsFor(fundamental).map((e: RoleExpression) => ({
    role: e.role,
    expression: e.expression,
    example: e.example,
  }));
}

type TopicSeed = Omit<CurriculumTopic, "source" | "roleExpressions"> & {
  roleExpressionOverrides?: CurriculumRoleExpression[];
};

function T(seed: TopicSeed): CurriculumTopic {
  return {
    ...seed,
    roleExpressions: roleExpressionsFrom(seed.fundamental, seed.roleExpressionOverrides),
    source: "curated",
  };
}

// ---------------------------------------------------------------------------
// Curriculum entries.
// ---------------------------------------------------------------------------

const WAVE_MANAGEMENT: CurriculumTopic = T({
  id: "wave-management",
  label: "Wave Management",
  fundamental: "wave-management",
  definition: "Deliberately setting the state of the minion wave to control where and when the lane fights.",
  whyItMatters: "Wave state controls recalls, dive safety, roam windows, and tempo. Every other lane decision inherits from it.",
  positiveDecisions: [
    "Crash the wave into tower before recalling",
    "Freeze near your tower when down in matchup",
    "Slow-push a big wave before an objective spawn",
  ],
  negativeDecisions: [
    "Auto-attacking a stable wave for no reason",
    "Recalling with the wave still in the middle",
    "Shoving without a plan while the enemy is missing",
  ],
  typicalConsequences: [
    "Free reset for the enemy laner",
    "CS bleed while walking back to lane",
    "Dive vulnerability at your own tower",
  ],
  recoveryMethods: [
    "Freeze the next wave to recover the CS gap safely",
    "Wait for the wave to bounce and reset lane state",
    "Ask jungler for a lane reset via gank or river vision",
  ],
  practiceConcepts: [
    "Never leave lane without either crashing or freezing",
    "Say the wave plan out loud before each auto attack",
  ],
  commonMisconceptions: [
    "Pushing = winning. Pushing without a plan hands the enemy a free reset.",
    "Freezing is only for losing lanes — freezing also denies enemy CS when even.",
  ],
  skillProgression: {
    bronze: "Auto-attacks every minion out of habit.",
    gold: "Recognizes freeze vs. push but recalls at the wrong moment.",
    diamond: "Sets wave state on purpose for the next 2 waves ahead.",
    challenger: "Uses wave state to script the entire mid-game around objectives.",
  },
  positiveCoachingExamples: [
    "You crashed the wave then recalled — that's a textbook tempo reset.",
    "You froze after a lost trade — you turned a loss into safe CS.",
  ],
  decisionChain: {
    decision: "Crash the wave under tower before recalling.",
    immediateResult: "Wave resets, you lose no CS while backing.",
    tempoImpact: "You return to lane on time and on tempo.",
    objectiveImpact: "You arrive at the next objective with items and prio.",
    longTermImpact: "Wave discipline compounds into item leads and dive safety.",
    practiceRecommendation: "Every recall this session must follow a wave crash or a freeze — never mid-lane.",
  },
});

const TEMPO: CurriculumTopic = T({
  id: "tempo",
  label: "Tempo",
  fundamental: "tempo",
  definition: "Being ahead in the moment that matters — levels, items, cooldowns, or position — not just in totals.",
  whyItMatters: "The team with tempo dictates the next fight and turns small leads into objectives.",
  positiveDecisions: [
    "Recall on a wave crash to hit an item spike first",
    "Be at the objective 45s before it spawns",
    "Shove before roaming so the roam is free",
  ],
  negativeDecisions: [
    "Farm a side wave while an objective is being taken",
    "Recall with the wave in the middle and return behind",
    "Fight with summoners down while the enemy has theirs up",
  ],
  typicalConsequences: [
    "Objective lost uncontested",
    "Enemy hits their spike first and forces the fight",
    "You arrive late and the fight is already 4v5",
  ],
  recoveryMethods: [
    "Trade tempo for tempo — give up one objective to reset yours",
    "Play for the next window instead of forcing the current one",
  ],
  practiceConcepts: [
    "Reset every time you can hit a component spike",
    "Check objective timers every 30 seconds",
  ],
  commonMisconceptions: [
    "Tempo means playing fast. Tempo means being early to the RIGHT moment.",
    "Kills give tempo. A missed wave often costs more than the kill was worth.",
  ],
  skillProgression: {
    bronze: "Plays each moment in isolation.",
    gold: "Reacts to objective timers when the icon pops.",
    diamond: "Sets up the next fight window on purpose.",
    challenger: "Trades one tempo window for a larger one two minutes later.",
  },
  positiveCoachingExamples: [
    "You crashed mid and were at Dragon 45s early — the fight was already yours.",
    "You recalled at 1,300g and came back on your spike — clean tempo play.",
  ],
  decisionChain: {
    decision: "Recall on a wave crash with enough gold for your component spike.",
    immediateResult: "You buy the item before the enemy laner.",
    tempoImpact: "You return to lane with a stat lead they can't match.",
    objectiveImpact: "Your prio wins the next dragon or Herald contest.",
    longTermImpact: "Compounding item timings turn small leads into game-defining ones.",
    practiceRecommendation: "Never recall without either a wave crash OR a component spike ready.",
  },
});

const ECONOMY: CurriculumTopic = T({
  id: "economy",
  label: "Economy",
  fundamental: "economy",
  definition: "How efficiently you convert time into gold and XP compared to your role's benchmark.",
  whyItMatters: "Every item spike, level spike, and fight window depends on economy — falling behind delays every future decision.",
  positiveDecisions: [
    "Clean up a crashed wave before recalling",
    "Take a plate on a shove",
    "Complete the support quest before 14:00",
  ],
  negativeDecisions: [
    "Roam for a kill worth less than the missed waves",
    "Miss plates on a free push",
    "Leave lane with 400g in the tank",
  ],
  typicalConsequences: [
    "Item spike delayed by minutes",
    "Enemy carry out-scales you in the same fight",
  ],
  recoveryMethods: [
    "Prioritize catch-up waves over kills",
    "Take the safest plates and turrets on shove",
  ],
  practiceConcepts: [
    "Track CS every 5 minutes against a role benchmark",
    "Never reset with under 1,300g unless the wave demands it",
  ],
  commonMisconceptions: [
    "Kills matter more than CS. A single wave is often worth more than a kill.",
    "Base gold income is fixed. Plates, kills, and turrets swing your income hard.",
  ],
  skillProgression: {
    bronze: "Watches kills instead of CS.",
    gold: "Tracks CS but ignores plates and turrets.",
    diamond: "Optimizes recall timings around gold thresholds.",
    challenger: "Turns every wave, plate, and camp into planned item timings.",
  },
  positiveCoachingExamples: [
    "You cleaned the wave before recalling — no gold left on the ground.",
    "You took two plates on a shove — that plate gold accelerated your spike by a minute.",
  ],
  decisionChain: {
    decision: "Clean up the wave and grab a plate before recalling.",
    immediateResult: "You bank an extra 300-500g on top of the wave.",
    tempoImpact: "You come back with a stronger buy than the enemy.",
    objectiveImpact: "Your spike lands in time for the next objective.",
    longTermImpact: "Compounding gold advantages force the enemy to play behind all game.",
    practiceRecommendation: "Reset only after cleaning waves and, when safe, chunking a plate.",
  },
});

const VISION: CurriculumTopic = T({
  id: "vision",
  label: "Vision",
  fundamental: "vision",
  definition: "Placing wards and denying enemy wards so the map's information favors your team.",
  whyItMatters: "Vision decides where fights start. The team with vision picks the terms of every engagement.",
  positiveDecisions: [
    "Place a Control Ward in the pit 60s before spawn",
    "Sweep enemy wards before an objective attempt",
    "Ward deep when ahead, defensive when behind",
  ],
  negativeDecisions: [
    "Walk past a Control Ward that's off cooldown",
    "Ward out of habit in a bush that no longer matters",
    "Contest an objective with no vision cleared",
  ],
  typicalConsequences: [
    "Caught out before the fight even starts",
    "Objective stolen or contested blind",
  ],
  recoveryMethods: [
    "Reset for Control Wards before the next objective window",
    "Move as a pair to compensate for missing vision",
  ],
  practiceConcepts: [
    "Buy a Control Ward every reset",
    "Sweep from your side of the pit to the enemy side before objective spawns",
  ],
  commonMisconceptions: [
    "Vision is the support's job alone. Every role owns river vision when they have prio.",
    "More wards = more vision. Wards in the wrong bush are worse than no wards.",
  ],
  skillProgression: {
    bronze: "Places wards on cooldown wherever they stand.",
    gold: "Wards river before objectives but ignores vision denial.",
    diamond: "Wards to enable the next play, not the last one.",
    challenger: "Wins fights by controlling vision + denial before the fight begins.",
  },
  positiveCoachingExamples: [
    "You warded pit 60s early and swept the enemy ward — you owned the fog before the fight.",
  ],
  decisionChain: {
    decision: "Sweep the enemy's pit ward and place a Control Ward before Dragon spawns.",
    immediateResult: "Your team can position around the pit without being seen.",
    tempoImpact: "You start the fight on your terms with information advantage.",
    objectiveImpact: "You take the objective uncontested or on a favorable engage.",
    longTermImpact: "Vision control snowballs into map control and safe scaling.",
    practiceRecommendation: "Every reset buys a Control Ward — no exceptions.",
  },
});

const OBJECTIVE_CONTROL: CurriculumTopic = T({
  id: "objective-control",
  label: "Objective Control",
  fundamental: "objective-control",
  definition: "Winning neutral objectives by setting up early with vision, priority, and cooldowns.",
  whyItMatters: "Objectives compound — dragons scale, Herald and Baron push turrets, Grubs snowball early leads.",
  positiveDecisions: [
    "Shove lanes before objective spawns",
    "Trade dragon for Herald when opposite side",
    "Bait Baron to force a fight on your terms",
  ],
  negativeDecisions: [
    "Start Baron without vision or prio",
    "Contest a soul without summoners",
    "Ignore Grubs to force ganks that don't land",
  ],
  typicalConsequences: [
    "Objective lost plus members caught",
    "Map advantage swings to the enemy side",
  ],
  recoveryMethods: [
    "Trade for the opposite-side objective",
    "Reset priority for the next spawn",
  ],
  practiceConcepts: [
    "Announce objective timers 60s early",
    "Set up vision as a team before touching the pit",
  ],
  commonMisconceptions: [
    "Every objective must be contested. Some objectives should be traded, not fought.",
    "Being close to the pit = ready to fight. Without prio + vision, you're just a target.",
  ],
  skillProgression: {
    bronze: "Reacts once the objective is being taken.",
    gold: "Rotates when the icon appears on the minimap.",
    diamond: "Sets up prio + vision 60s before spawn.",
    challenger: "Chooses which objectives to trade to open the map.",
  },
  positiveCoachingExamples: [
    "You shoved out mid and were the first to arrive at Dragon — that setup won the fight before it started.",
  ],
  decisionChain: {
    decision: "Shove your lane out 60s before Dragon spawns.",
    immediateResult: "You arrive at the pit with prio and full HP.",
    tempoImpact: "Your team dictates the terms of the fight or free-take.",
    objectiveImpact: "You secure the dragon and stack toward soul.",
    longTermImpact: "Consistent objective control snowballs into map + gold leads.",
    practiceRecommendation: "Every objective this session must be preceded by a shove and vision setup.",
  },
});

const TRADING: CurriculumTopic = T({
  id: "trading",
  label: "Trading",
  fundamental: "trading",
  definition: "Winning short lane exchanges by matching cooldowns, range advantages, and wave state.",
  whyItMatters: "Winning trades converts into HP leads, wave control, and eventual kills or dive setups.",
  positiveDecisions: [
    "Trade on your level-up before the enemy",
    "Auto after the enemy uses a key cooldown",
    "Weave autos between minion aggro",
  ],
  negativeDecisions: [
    "Trade into minion aggro",
    "Trade with a bad wave state you can't crash",
    "Trade with your key cooldowns still down",
  ],
  typicalConsequences: [
    "HP disadvantage snowballs into a lost lane",
    "Enemy dives on your low HP",
  ],
  recoveryMethods: [
    "Freeze near tower to reset HP diff",
    "Trade only when jungler is nearby for cover",
  ],
  practiceConcepts: [
    "Only trade when your cooldown is up and theirs is down",
  ],
  commonMisconceptions: [
    "Damage traded = winning. HP after the trade is what matters.",
    "Every trade must be even. Losing a trade to bait a dive is a win.",
  ],
  skillProgression: {
    bronze: "Trades whenever the enemy is in range.",
    gold: "Trades on cooldowns but forgets minion aggro.",
    diamond: "Trades on level-ups and cooldown windows.",
    challenger: "Uses trades to script wave state + dive setups.",
  },
  positiveCoachingExamples: [
    "You waited for their key ability, then all-in'd on your level-up — perfect trade window.",
  ],
  decisionChain: {
    decision: "Trade on your level-2 spike before the enemy hits theirs.",
    immediateResult: "You win the HP exchange and push them off the wave.",
    tempoImpact: "You control the wave and the recall window.",
    objectiveImpact: "You unlock a dive setup or a free plate.",
    longTermImpact: "Winning trades early compounds into lane, then map, control.",
    practiceRecommendation: "Only trade when your cooldown is up and theirs is down.",
  },
});

const SPACING: CurriculumTopic = T({
  id: "spacing",
  label: "Spacing",
  fundamental: "positioning",
  definition: "The distance you keep from enemies relative to their range and cooldowns.",
  whyItMatters: "Spacing decides whether you can walk up for damage or get punished for being greedy.",
  positiveDecisions: [
    "Stay one auto-range outside the enemy's max engage",
    "Reset spacing after every ability trade",
    "Hug the wave when the enemy jungler is unknown",
  ],
  negativeDecisions: [
    "Walk straight at the enemy for one extra auto",
    "Facecheck a bush at an objective",
    "Stand in a lane brush without vision",
  ],
  typicalConsequences: [
    "Chunked by a hooked ability you couldn't see coming",
    "Killed picking up a wave that wasn't worth it",
  ],
  recoveryMethods: [
    "Reset positioning behind your minions after every trade",
    "Buy a defensive component earlier than usual",
  ],
  practiceConcepts: [
    "Every 10 seconds, name the enemy engage ability and its cooldown",
  ],
  commonMisconceptions: [
    "Spacing is only for ADCs. Every role has a range to respect.",
    "Standing far back = safe. Standing in the wrong bush is worse than standing forward with vision.",
  ],
  skillProgression: {
    bronze: "Walks into range without noticing.",
    gold: "Respects range only after being punished.",
    diamond: "Tracks enemy cooldowns and adjusts spacing.",
    challenger: "Uses spacing to bait cooldowns then punishes them.",
  },
  positiveCoachingExamples: [
    "You stayed just outside their hook range and only walked up after they missed — clean spacing.",
  ],
  decisionChain: {
    decision: "Hold spacing outside the enemy's max engage range.",
    immediateResult: "You avoid the free chunk you'd take walking up.",
    tempoImpact: "You stay full HP and keep lane prio.",
    objectiveImpact: "You show up to the next objective on your terms.",
    longTermImpact: "Consistent spacing keeps you alive to hit every spike.",
    practiceRecommendation: "Never walk up unless the enemy's key engage is on cooldown.",
  },
  roleExpressionOverrides: [
    { role: "top", expression: "Space around the enemy's key trade ability.", example: "Stay outside Darius Q range until it's on cooldown." },
    { role: "jungle", expression: "Space around enemy jungler's engage.", example: "Don't stand next to a bush with an unknown enemy jungler." },
    { role: "mid", expression: "Space around burst combos.", example: "Stay outside all-in range at level 6." },
    { role: "adc", expression: "Kite from the peel line, not from the frontline.", example: "One screen behind the frontline in fights." },
    { role: "support", expression: "Hold the peel line next to the ADC.", example: "Never leave the ADC's peel range in a fight." },
  ],
});

const POSITIONING: CurriculumTopic = T({
  id: "positioning",
  label: "Positioning",
  fundamental: "positioning",
  definition: "Where you stand relative to enemy threats, your team, and available vision at any moment.",
  whyItMatters: "Position determines whether you get to deal damage and whether you survive it — most deaths are positional.",
  positiveDecisions: [
    "Stand one screen behind the frontline",
    "Kite back to peel range in a fight",
    "Hold a flank until engage is spent",
  ],
  negativeDecisions: [
    "Stand in fog without vision",
    "Walk into engage range for one auto",
    "Facecheck a bush at an objective",
  ],
  typicalConsequences: [
    "Caught before the fight starts",
    "Team forced to fight 4v5 into a lost objective",
  ],
  recoveryMethods: [
    "Buy Zhonya's / defensive item if repeatedly caught",
    "Reset position after every ability trade",
  ],
  practiceConcepts: [
    "Before every fight, name the enemy engage tool and its cooldown",
  ],
  commonMisconceptions: [
    "You only need to position in teamfights. Every second is positioning.",
    "Standing back = safe. Standing back without vision is just delayed death.",
  ],
  skillProgression: {
    bronze: "Stands next to the tank.",
    gold: "Stays behind the frontline but drifts in for damage.",
    diamond: "Positions around vision + cooldowns.",
    challenger: "Bait engage from a safe angle, then punish it.",
  },
  positiveCoachingExamples: [
    "You held a flank angle until their engage was spent — you cleaned up the fight because of it.",
  ],
  decisionChain: {
    decision: "Hold the peel line behind the frontline in the fight.",
    immediateResult: "You survive the enemy's opening engage.",
    tempoImpact: "You deal full DPS across the fight instead of dying early.",
    objectiveImpact: "Your team wins the objective on your damage.",
    longTermImpact: "You become the team's reliable win condition every fight.",
    practiceRecommendation: "Every fight this session — name the enemy engage before positioning.",
  },
});

const MAP_MOVEMENT: CurriculumTopic = T({
  id: "map-movement",
  label: "Map Movement",
  fundamental: "map-movement",
  definition: "Choosing where to move on the map so you arrive at the fight that matters.",
  whyItMatters: "Map movement multiplies leads — being in the right place is worth more than mechanical outplays.",
  positiveDecisions: [
    "Rotate mid to bot after crashing a wave",
    "TP flank onto a Baron fight",
    "Sidelane split after 3 items",
  ],
  negativeDecisions: [
    "Farm a side wave through an objective",
    "Roam without lane prio",
    "TP into a lost fight",
  ],
  typicalConsequences: [
    "Team fights outnumbered",
    "Map shrinks as objectives fall",
  ],
  recoveryMethods: [
    "Play with the team for one objective window to reset map presence",
  ],
  practiceConcepts: [
    "After every wave, ask: where is the next map decision?",
  ],
  commonMisconceptions: [
    "Roaming is always good. Roaming without prio just gives the enemy a free wave.",
    "Split pushing wins games alone. Split pushing without map awareness feeds.",
  ],
  skillProgression: {
    bronze: "Stays in one lane the entire game.",
    gold: "Rotates when someone pings.",
    diamond: "Rotates on prio + objective timers.",
    challenger: "Chooses the map decision one rotation ahead.",
  },
  positiveCoachingExamples: [
    "You crashed mid, then rotated bot with prio — that 3v2 was inevitable.",
  ],
  decisionChain: {
    decision: "Crash your wave, then rotate to the side of the map with the next decision.",
    immediateResult: "You arrive with numbers advantage.",
    tempoImpact: "The enemy is forced to react to you.",
    objectiveImpact: "You take the objective or force a favorable fight.",
    longTermImpact: "Repeated correct rotations shrink the enemy's map.",
    practiceRecommendation: "Never leave lane without a plan for where you're going next.",
  },
});

const POWER_SPIKES: CurriculumTopic = T({
  id: "power-spikes",
  label: "Power Spikes",
  fundamental: "power-spikes",
  definition: "The moments your champion is strongest relative to the enemy — usually a level or item milestone.",
  whyItMatters: "Playing to your spike wins the game phase. Ignoring it wastes your best window.",
  positiveDecisions: [
    "Fight on level 2 when you have the level advantage",
    "Force a fight on your first-item completion",
    "Group at two items with the ADC",
  ],
  negativeDecisions: [
    "Fight a full item behind",
    "Skip a spike to greed one more wave",
  ],
  typicalConsequences: [
    "Fight snowballs against you",
    "Enemy secures the objective on their spike",
  ],
  recoveryMethods: [
    "Farm safely to the next spike",
    "Disengage until your item finishes",
  ],
  practiceConcepts: [
    "Every reset, say your next spike out loud (level or item)",
  ],
  commonMisconceptions: [
    "Full build is the only spike. Level 2, level 6, and first-item are usually bigger.",
    "You're always ahead if you have more gold. Item completions matter more than raw gold.",
  ],
  skillProgression: {
    bronze: "Ignores spikes entirely.",
    gold: "Knows the big spikes but doesn't play to them.",
    diamond: "Plans fights around their own spike.",
    challenger: "Plans fights around the DIFFERENCE between spikes.",
  },
  positiveCoachingExamples: [
    "You waited to fight until your first item finished — you turned a 40/60 fight into a 70/30.",
  ],
  decisionChain: {
    decision: "Force the fight the moment your first item completes.",
    immediateResult: "You win the exchange on your damage spike.",
    tempoImpact: "You take the follow-up objective on the win.",
    objectiveImpact: "You convert the fight into map pressure.",
    longTermImpact: "Consistent spike-timing wins the mid-game every time.",
    practiceRecommendation: "Say your next spike out loud every reset — then play to it.",
  },
});

const CHAMPION_IDENTITY: CurriculumTopic = T({
  id: "champion-identity",
  label: "Champion Identity",
  fundamental: "champion-identity",
  definition: "Playing your champion's archetype — damage profile, range, role — instead of copying another champion.",
  whyItMatters: "Every champion has a lane it wants to play. Identity is the difference between playing well and playing wrong.",
  positiveDecisions: [
    "Scaling carries farm to their spike",
    "Lane bullies pressure pre-6",
    "Engage tanks look for a pick, not a scaling fight",
  ],
  negativeDecisions: [
    "A scaling carry all-inning level 3",
    "An enchanter engaging without follow-up",
    "A skirmisher waiting to scale into a losing late game",
  ],
  typicalConsequences: [
    "You lose the game phase your champion should win",
  ],
  recoveryMethods: [
    "Re-identify the champion's win condition and play only for that",
  ],
  practiceConcepts: [
    "In champ select, write your identity in one sentence",
  ],
  commonMisconceptions: [
    "Every champion should play the same way. Identity dictates completely different playstyles.",
    "You should copy the highest-winrate player. Their playstyle only works with the right team + matchup.",
  ],
  skillProgression: {
    bronze: "Plays every champion like a fighter.",
    gold: "Knows the archetype but forgets it mid-game.",
    diamond: "Plays to the identity for the entire game.",
    challenger: "Bends the identity to the specific matchup + team need.",
  },
  positiveCoachingExamples: [
    "You farmed safely and waited for two items — you played your scaling identity perfectly.",
  ],
  decisionChain: {
    decision: "Farm to your identity's key spike instead of forcing early fights.",
    immediateResult: "You avoid a losing exchange.",
    tempoImpact: "You reach your spike on time.",
    objectiveImpact: "You show up to fights on the spike your champion needs.",
    longTermImpact: "Playing to identity keeps you carrying every game phase your champion should win.",
    practiceRecommendation: "In champ select, name your identity in one sentence and stick to it.",
  },
});

const WIN_CONDITIONS: CurriculumTopic = T({
  id: "win-conditions",
  label: "Win Conditions",
  fundamental: "win-conditions",
  definition: "The specific path your composition wins through — scaling, tempo, pick, sidelane, or teamfight.",
  whyItMatters: "Every decision should serve the win condition. Ignoring it is why leads slip.",
  positiveDecisions: [
    "End before 25 with an early-game comp",
    "Scale to 3 items with a late-game comp",
    "Play 1-3-1 with a sidelane threat",
  ],
  negativeDecisions: [
    "Scaling comp forcing an early Baron",
    "Early comp waiting for 3 items",
  ],
  typicalConsequences: [
    "Enemy reaches their win condition first",
  ],
  recoveryMethods: [
    "Reset the tempo of the game to your comp's phase",
  ],
  practiceConcepts: [
    "In loading screen, name the composition's win condition in one line",
  ],
  commonMisconceptions: [
    "All comps win the same way. Every comp has a specific window.",
    "Late-game comps should also fight early. Fighting early with a scaling comp loses the game.",
  ],
  skillProgression: {
    bronze: "Plays the same way regardless of composition.",
    gold: "Recognizes comps but forgets during play.",
    diamond: "Plays every decision through the comp lens.",
    challenger: "Forces the enemy off their win condition while enabling their own.",
  },
  positiveCoachingExamples: [
    "You played for scaling and refused early fights — your comp needed exactly that.",
  ],
  decisionChain: {
    decision: "Refuse early skirmishes because your comp wins late.",
    immediateResult: "You avoid a losing fight.",
    tempoImpact: "You reach late-game with items intact.",
    objectiveImpact: "You win the fights your comp is designed to win.",
    longTermImpact: "Playing your win condition every game raises your floor.",
    practiceRecommendation: "Loading screen: write your comp's win condition in one sentence.",
  },
});

const RESOURCE_MANAGEMENT: CurriculumTopic = T({
  id: "resource-management",
  label: "Resource Management",
  fundamental: "resource-management",
  definition: "Spending mana, HP, summoners, and ultimates for value proportional to their cost.",
  whyItMatters: "A saved summoner or ultimate decides the next fight. Every resource is a fight-cooldown.",
  positiveDecisions: [
    "Save Flash for the objective fight",
    "Ult to secure an objective, not to chase",
    "Manage mana for a fight, not the last CS",
  ],
  negativeDecisions: [
    "Flash for a solo kill you didn't need",
    "Ult a minion wave",
    "Go OOM before recall on a shove",
  ],
  typicalConsequences: [
    "Weaker in the next skirmish exactly where it counts",
    "Enemy times fights around your missing cooldowns",
  ],
  recoveryMethods: [
    "Play passive until the summoner is back up",
    "Reset for mana items or wait for objective spawn to time cooldowns",
  ],
  practiceConcepts: [
    "Track enemy summoners on the scoreboard every 60s",
  ],
  commonMisconceptions: [
    "Ults are for kills. Ults are for fights.",
    "Summoners are free. Summoners are the difference between winning and losing the next fight.",
  ],
  skillProgression: {
    bronze: "Uses summoners on cooldown.",
    gold: "Saves summoners but forgets to track enemy timers.",
    diamond: "Times fights around summoner windows.",
    challenger: "Bait summoners, then punish the next window.",
  },
  positiveCoachingExamples: [
    "You held Flash for the objective fight — that peel Flash won the game.",
  ],
  decisionChain: {
    decision: "Save Flash for the objective fight instead of a solo trade.",
    immediateResult: "You survive the enemy's opening engage.",
    tempoImpact: "You come out of the fight with Flash still up.",
    objectiveImpact: "You take the follow-up objective on a tempo advantage.",
    longTermImpact: "Correct summoner discipline compounds across every fight in the game.",
    practiceRecommendation: "Every 60s — check the enemy scoreboard and note summoner timers.",
  },
});

const RECALL_TIMING: CurriculumTopic = T({
  id: "recall-timing",
  label: "Recall Timing",
  fundamental: "tempo",
  definition: "Choosing to reset at the moment that costs the least CS and gains the most gold value.",
  whyItMatters: "Bad recalls bleed CS and hand tempo to the enemy. Great recalls turn even lanes into item leads.",
  positiveDecisions: [
    "Recall immediately after crashing a wave",
    "Recall on a component spike (1,100–1,300g)",
    "Recall before an objective spawns with wave crashed",
  ],
  negativeDecisions: [
    "Recall with the wave stalled in the middle",
    "Recall for one more small item that leaves you weak",
    "Recall during an objective window with prio",
  ],
  typicalConsequences: [
    "Free CS + plate for the enemy",
    "Missed component spike window",
    "Enemy takes the objective while you walk to base",
  ],
  recoveryMethods: [
    "Freeze the next wave to recover CS gap",
    "Wait for the wave to bounce before rejoining lane",
  ],
  practiceConcepts: [
    "Every recall requires a wave crash OR a component spike ready",
    "Never recall in the 60s window before an objective spawns",
  ],
  commonMisconceptions: [
    "Recall means retreating. Recall is an aggressive tempo action.",
    "You should recall when low HP. You should recall on the wave state that costs the least CS.",
  ],
  skillProgression: {
    bronze: "Recalls when HP is low.",
    gold: "Recalls after a kill regardless of wave.",
    diamond: "Recalls on wave + gold thresholds.",
    challenger: "Recalls to script the next 2 minutes of the game.",
  },
  positiveCoachingExamples: [
    "You crashed the wave, then recalled at 1,300g — textbook reset.",
  ],
  decisionChain: {
    decision: "Crash the wave and recall on a component spike.",
    immediateResult: "No CS lost, item purchased.",
    tempoImpact: "You return on your spike, first.",
    objectiveImpact: "You reach the objective with lane prio and items.",
    longTermImpact: "Compounding recalls create an item + level lead the enemy can't close.",
    practiceRecommendation: "Every recall this session — wave crash or spike ready. No exceptions.",
  },
});

const TEAMFIGHTING: CurriculumTopic = T({
  id: "teamfighting",
  label: "Teamfighting",
  fundamental: "positioning",
  definition: "Executing your role in a 5v5 — engage, damage, peel, or catch — around vision and cooldowns.",
  whyItMatters: "Late-game outcomes are decided in teamfights. Your role in the fight matters more than raw damage.",
  positiveDecisions: [
    "Frontliners engage on cooldowns spent by the enemy",
    "Backline focuses reachable targets from safe range",
    "Support peels the primary carry instead of chasing",
  ],
  negativeDecisions: [
    "Engaging without follow-up",
    "Diving the backline as the ADC",
    "Peeling the wrong carry",
  ],
  typicalConsequences: [
    "Ace + objective lost",
    "Team scattered — no follow-up fight possible",
  ],
  recoveryMethods: [
    "Regroup at the closest neutral objective",
    "Reset and buy vision before recontesting",
  ],
  practiceConcepts: [
    "Before every fight — name your job (engage / damage / peel / catch)",
  ],
  commonMisconceptions: [
    "Deal the most damage = win. Damage on the wrong target loses the fight.",
    "Everyone should engage together. Only the right champion should engage.",
  ],
  skillProgression: {
    bronze: "Runs at the closest enemy.",
    gold: "Positions but drifts out for damage.",
    diamond: "Executes their role consistently.",
    challenger: "Adjusts their role mid-fight to the flow of the fight.",
  },
  positiveCoachingExamples: [
    "You peeled the ADC instead of chasing the kill — you turned the fight because of it.",
  ],
  decisionChain: {
    decision: "Peel for the ADC instead of chasing the assassin.",
    immediateResult: "The ADC survives and deals full DPS.",
    tempoImpact: "You win the fight with your win condition intact.",
    objectiveImpact: "You convert the fight into Baron or Elder.",
    longTermImpact: "Correct fight roles close out games instead of throwing leads.",
    practiceRecommendation: "Before every fight this session, name your role in one word.",
  },
});

const CONSISTENCY: CurriculumTopic = T({
  id: "consistency",
  label: "Consistency",
  fundamental: "consistency",
  definition: "Repeating correct habits across every game, not just when you're focused.",
  whyItMatters: "Consistency is the difference between climbing and plateauing. A great game once a week doesn't climb.",
  positiveDecisions: [
    "Same wave discipline every game",
    "Same recall discipline every game",
    "Same vision discipline every game",
  ],
  negativeDecisions: [
    "Playing to peak when winning, tilting when losing",
    "Skipping fundamentals when the game feels lost",
  ],
  typicalConsequences: [
    "Ranked climb stalls",
    "Same mistakes repeat across games",
  ],
  recoveryMethods: [
    "Pick one habit and repeat it across the next 10 games",
    "Review one recurring mistake per session",
  ],
  practiceConcepts: [
    "One focus habit per session — measurable",
    "Post-game — did the focus habit hold across every game?",
  ],
  commonMisconceptions: [
    "Consistency means never dying. Consistency means the same correct decisions across every game.",
    "You need to play a lot to be consistent. You need to REVIEW to be consistent.",
  ],
  skillProgression: {
    bronze: "Plays differently every game.",
    gold: "Executes when focused, tilts when behind.",
    diamond: "Executes the same habits across every game.",
    challenger: "Executes the same habits across every game AND every phase.",
  },
  positiveCoachingExamples: [
    "You held the same wave discipline across 8 of your last 10 games — that's how climbs happen.",
  ],
  decisionChain: {
    decision: "Pick one habit and hold it across every game this session.",
    immediateResult: "You execute the habit even when tilted.",
    tempoImpact: "You avoid the tempo hole that comes from tilt play.",
    objectiveImpact: "You show up to objectives on habit, not vibes.",
    longTermImpact: "Consistency compounds — the climb becomes automatic.",
    practiceRecommendation: "Choose ONE habit per session. Grade yourself after every game.",
  },
});

const DECISION_MAKING: CurriculumTopic = T({
  id: "decision-making",
  label: "Decision Making",
  fundamental: "decision-making",
  definition: "Choosing the correct action given wave, tempo, vision, cooldowns, and map state.",
  whyItMatters: "The League skill ceiling is decisions. Mechanics only convert into wins when the decision is right.",
  positiveDecisions: [
    "Crash then recall before an objective",
    "Disengage when the fight isn't on spike",
    "Rotate to the map decision, not the last kill",
  ],
  negativeDecisions: [
    "Fight without vision",
    "Chase into fog for a kill",
    "Force a fight against a bigger tempo window",
  ],
  typicalConsequences: [
    "Objective lost and members caught",
    "Lead melted by one bad fight",
  ],
  recoveryMethods: [
    "Reset — take one objective as a team to reset tempo",
  ],
  practiceConcepts: [
    "Before each fight, name the decision (fight, disengage, reset)",
  ],
  commonMisconceptions: [
    "Better mechanics fix bad decisions. They don't.",
    "Aggression = skill. Correct decision = skill.",
  ],
  skillProgression: {
    bronze: "Reacts to whatever happens.",
    gold: "Makes decisions but forgets tempo + vision.",
    diamond: "Names the decision before acting.",
    challenger: "Sees the next 2 decisions before the current one plays out.",
  },
  positiveCoachingExamples: [
    "You disengaged instead of forcing — that reset the game state in your favor.",
  ],
  decisionChain: {
    decision: "Disengage when the fight isn't on your spike.",
    immediateResult: "You keep members alive.",
    tempoImpact: "You reset the map to the next objective window.",
    objectiveImpact: "You show up to the fight your team can actually win.",
    longTermImpact: "Correct decisions compound — the game bends toward your comp.",
    practiceRecommendation: "Name the decision in one word before every fight (fight / disengage / reset).",
  },
});

const MENTAL_DECISION_MAKING: CurriculumTopic = T({
  id: "mental-decision-making",
  label: "Mental Decision Making",
  fundamental: "decision-making",
  definition: "Making the same correct decisions under tilt, pressure, and losing conditions.",
  whyItMatters: "Most losses are decision breakdowns caused by mental state, not lack of knowledge.",
  positiveDecisions: [
    "Recognize tilt and stick to the fundamentals",
    "Take a breath before every recall",
    "Play the win condition even when behind",
  ],
  negativeDecisions: [
    "Force a solo play to 'reset' the game",
    "Chase kills to catch up instead of playing safe",
    "Blame the team and stop making decisions",
  ],
  typicalConsequences: [
    "Lead lost in one throw",
    "Game becomes unwinnable from a solo mistake",
  ],
  recoveryMethods: [
    "Take a breath, name the win condition, keep playing fundamentals",
    "Queue a normal after 2 losses to reset mental",
  ],
  practiceConcepts: [
    "Post-game — was the loss a decision failure or a mental failure?",
  ],
  commonMisconceptions: [
    "Tilt only affects mechanics. Tilt destroys decisions first.",
    "Playing more games fixes tilt. Reviewing games fixes tilt.",
  ],
  skillProgression: {
    bronze: "Doesn't recognize tilt.",
    gold: "Recognizes tilt after the loss.",
    diamond: "Recognizes tilt during the game and adjusts.",
    challenger: "Plays the same decisions across tilt and calm.",
  },
  positiveCoachingExamples: [
    "You lost the first fight but stuck to fundamentals — the comeback was inevitable because of it.",
  ],
  decisionChain: {
    decision: "Recognize the tilt and return to fundamentals.",
    immediateResult: "You avoid the throw play.",
    tempoImpact: "You stabilize the tempo instead of accelerating the loss.",
    objectiveImpact: "You reach the objective window your comp needs.",
    longTermImpact: "Mental discipline turns 60% winrate games into actual wins.",
    practiceRecommendation: "After every loss — name whether it was a decision or a mental failure.",
  },
});

// ---------------------------------------------------------------------------
// Registry.
// ---------------------------------------------------------------------------

export const LEAGUE_CURRICULUM: Record<CurriculumTopicId, CurriculumTopic> = {
  "wave-management": WAVE_MANAGEMENT,
  tempo: TEMPO,
  economy: ECONOMY,
  vision: VISION,
  "objective-control": OBJECTIVE_CONTROL,
  trading: TRADING,
  spacing: SPACING,
  positioning: POSITIONING,
  "map-movement": MAP_MOVEMENT,
  "power-spikes": POWER_SPIKES,
  "champion-identity": CHAMPION_IDENTITY,
  "win-conditions": WIN_CONDITIONS,
  "resource-management": RESOURCE_MANAGEMENT,
  "recall-timing": RECALL_TIMING,
  teamfighting: TEAMFIGHTING,
  consistency: CONSISTENCY,
  "decision-making": DECISION_MAKING,
  "mental-decision-making": MENTAL_DECISION_MAKING,
};

export const ALL_CURRICULUM_TOPICS: CurriculumTopic[] = Object.values(LEAGUE_CURRICULUM);

export function getCurriculumTopic(id: CurriculumTopicId): CurriculumTopic | undefined {
  return LEAGUE_CURRICULUM[id];
}

export function curriculumForFundamental(f: LeagueFundamentalId): CurriculumTopic[] {
  return ALL_CURRICULUM_TOPICS.filter((t) => t.fundamental === f);
}

export function curriculumForRole(role: RoleId): CurriculumTopic[] {
  // Every topic applies to every role — but we surface the role-specific
  // expression by filtering topics that have an expression for that role.
  return ALL_CURRICULUM_TOPICS.filter((t) =>
    t.roleExpressions.some((e) => e.role === role),
  );
}

export function roleExpressionForTopic(
  id: CurriculumTopicId,
  role: RoleId,
): CurriculumRoleExpression | undefined {
  return getCurriculumTopic(id)?.roleExpressions.find((e) => e.role === role);
}

export function isCurriculumTopicId(id: string): id is CurriculumTopicId {
  return id in LEAGUE_CURRICULUM;
}