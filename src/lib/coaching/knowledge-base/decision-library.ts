// ---------------------------------------------------------------------------
// Decision Library — reusable, role-agnostic coaching patterns.
//
// Each entry describes a DECISION (not a stat), the League Fundamental it
// belongs to, its likely cause + effect, and one measurable practice
// recommendation. Roles and champions plug into these patterns; the Coach
// Engine consumes them so no pattern is redefined per-role.
//
// This is a KNOWLEDGE artifact — no player evaluation, no runtime detection.
// ---------------------------------------------------------------------------
import type { KnowledgeSource } from "./types";
import type { LeagueFundamentalId } from "./fundamentals";
import type { RoleId } from "./templates/champion";

export type DecisionSeverity = "low" | "medium" | "high";
export type DecisionTone = "mistake" | "strength";

export interface DecisionPattern {
  id: string;
  label: string;
  tone: DecisionTone;
  fundamentals: LeagueFundamentalId[];
  /** Empty = universal (applies to every role). */
  roles: RoleId[];
  severity: DecisionSeverity;
  /** The decision the player made or missed. */
  decision: string;
  /** Immediate consequence in the next 5–15 seconds. */
  immediateConsequence: string;
  /** Later consequence over the next minute / objective. */
  laterConsequence: string;
  /** Exactly one measurable thing to practice next game. */
  practiceRecommendation: string;
  /** How the player can recognize the pattern live. */
  recognizeCue: string;
  /** One-line explanation used in short cards. */
  shortExplanation?: string;
  /** Deep explanation used in long-form coaching. */
  longExplanation?: string;
  /** Most likely outcome if the pattern repeats. */
  likelyOutcome?: string;
  /** Companion decision id (positive ↔ negative pair) when one exists. */
  counterpartId?: string;
  source: KnowledgeSource;
}

const D = (p: Omit<DecisionPattern, "source">): DecisionPattern => ({ ...p, source: "curated" });

export const DECISION_LIBRARY: DecisionPattern[] = [
  D({
    id: "late-recall",
    label: "Late Recall",
    tone: "mistake",
    fundamentals: ["wave-management", "tempo", "economy"],
    roles: [],
    severity: "high",
    decision: "Stayed for one extra wave instead of recalling on the crash.",
    immediateConsequence: "Return with less gold and no item spike — enemy resets first.",
    laterConsequence: "Miss the next objective's tempo window; enemy has priority and items.",
    practiceRecommendation: "Recall the instant a wave crashes into the enemy tower — no exceptions.",
    recognizeCue: "Wave just crashed, HP/mana low, nothing on the map — that's the recall.",
    shortExplanation: "One extra wave costs the reset window.",
    longExplanation:
      "Every crashed wave is a free reset. Staying for one more wave usually costs 300–500g of item timing and the tempo for the next objective — the enemy resets on the same window with more gold and shows up first.",
    likelyOutcome: "Enemy hits item spike first, forces fight on their tempo, and takes the next objective.",
    counterpartId: "safe-reset",
  }),
  D({
    id: "safe-reset",
    label: "Safe Reset",
    tone: "strength",
    fundamentals: ["wave-management", "tempo", "economy"],
    roles: [],
    severity: "medium",
    decision: "Recalled the moment the wave crashed with enough gold to spike.",
    immediateConsequence: "Return on tempo, on time, and on item.",
    laterConsequence: "Compound reset lead into the next objective.",
    practiceRecommendation: "Keep resetting on every crashed wave with 1300+ gold.",
    recognizeCue: "Wave crashed + gold in the bank + nothing pressuring your team.",
    shortExplanation: "Reset discipline compounds into item timings.",
    longExplanation:
      "Resetting on the crash converts wave state into gold spikes with zero CS lost. Repeated over a game it produces a full item advantage without any risk taken.",
    likelyOutcome: "Hit spikes before the enemy laner and control the next objective phase.",
    counterpartId: "late-recall",
  }),
  D({
    id: "early-recall",
    label: "Early Recall",
    tone: "mistake",
    fundamentals: ["wave-management", "economy"],
    roles: [],
    severity: "medium",
    decision: "Recalled before crashing the wave or reaching a component spike.",
    immediateConsequence: "Wave bounces back and CS is lost on the return path.",
    laterConsequence: "Return without a spike, still on the same relative level as before.",
    practiceRecommendation: "Only reset with (a) wave crashing or frozen AND (b) gold for a component.",
    recognizeCue: "You're recalling with the wave sitting in the middle and 700 gold.",
    shortExplanation: "Recalling too early wastes tempo AND economy.",
    longExplanation:
      "An early reset costs both — the wave state resets against you and the reset buys nothing meaningful. It usually happens on tilt or after a bad trade.",
    likelyOutcome: "You return behind on CS with no spike gained.",
    counterpartId: "safe-reset",
  }),
  D({
    id: "wave-crash",
    label: "Wave Crash",
    tone: "strength",
    fundamentals: ["wave-management", "tempo"],
    roles: [],
    severity: "medium",
    decision: "Crashed the wave into tower before leaving lane.",
    immediateConsequence: "Enemy loses CS to tower and can't reset without missing minions.",
    laterConsequence: "You reset on your terms; wave bounces back to you.",
    practiceRecommendation: "Never leave lane without a crash or freeze plan.",
    recognizeCue: "You're about to recall and the wave is on top of the enemy tower.",
    counterpartId: "missed-wave-crash",
  }),
  D({
    id: "missed-wave-crash",
    label: "Missed Wave Crash",
    tone: "mistake",
    fundamentals: ["wave-management", "economy"],
    roles: [],
    severity: "medium",
    decision: "Left lane without crashing the wave into tower.",
    immediateConsequence: "Wave bounces back — you lose CS and the enemy gets a free reset.",
    laterConsequence: "Enemy hits an item spike before you and controls the next lane state.",
    practiceRecommendation: "Before leaving lane, always crash the wave first — or freeze it.",
    recognizeCue: "You're about to recall/roam with the wave still in the middle of lane.",
    shortExplanation: "Leaving without crashing gives the enemy a free reset.",
    longExplanation:
      "The wave becomes the enemy's free CS while you're absent. On the return you lose both CS and the reset window, and the enemy has more gold on the same time.",
    likelyOutcome: "Enemy resets first with more gold and returns spike-up.",
    counterpartId: "wave-crash",
  }),
  D({
    id: "poor-objective-setup",
    label: "Poor Objective Setup",
    tone: "mistake",
    fundamentals: ["objective-control", "vision", "tempo"],
    roles: [],
    severity: "high",
    decision: "Arrived at the objective with no vision and no lane priority.",
    immediateConsequence: "Enemy starts the objective on their terms; you can't contest safely.",
    laterConsequence: "Objective lost or team dies contesting blind — map advantage flips.",
    practiceRecommendation: "Clear enemy wards and place vision 45–60 seconds before the objective spawns.",
    recognizeCue: "Objective timer under 1:00 and you're still farming — you're already late.",
    shortExplanation: "Objectives are won before they spawn, not after.",
    longExplanation:
      "Setup means vision cleared and lane prio pushed 45–60s early. Without both, you arrive as guests to a fight the enemy already scripted — either give it up or die contesting.",
    likelyOutcome: "Lose the objective or fight 4v5.",
    counterpartId: "strong-objective-setup",
  }),
  D({
    id: "strong-objective-setup",
    label: "Strong Objective Setup",
    tone: "strength",
    fundamentals: ["objective-control", "vision", "tempo"],
    roles: [],
    severity: "medium",
    decision: "Arrived at objectives with vision cleared and lane priority.",
    immediateConsequence: "You start the objective on your terms — enemy has to respect you.",
    laterConsequence: "Compound objective leads into towers and map control.",
    practiceRecommendation: "Keep prepping 45–60s early — pair it with control wards.",
    recognizeCue: "You already path to objectives on time; keep it up.",
    counterpartId: "poor-objective-setup",
  }),
  D({
    id: "unsafe-positioning",
    label: "Unsafe Positioning",
    tone: "mistake",
    fundamentals: ["positioning", "decision-making"],
    roles: [],
    severity: "high",
    decision: "Stood inside enemy engage range with no vision or peel.",
    immediateConsequence: "Caught before the fight starts — your team fights 4v5.",
    laterConsequence: "Lose the objective and shutdown gold funds the enemy carry.",
    practiceRecommendation: "Stay one screen behind your frontline until the enemy's engage tool is on cooldown.",
    recognizeCue: "You can see the enemy engage champion but don't see any of your teammates near you.",
    shortExplanation: "Getting caught costs the objective before the fight starts.",
    longExplanation:
      "Position mistakes cost more than mechanical ones — one caught death funds the enemy carry AND deletes the fight tool your team needed for the objective.",
    likelyOutcome: "Fight 4v5 into a lost objective and a shutdown for the enemy.",
    counterpartId: "good-positioning",
  }),
  D({
    id: "good-positioning",
    label: "Good Positioning",
    tone: "strength",
    fundamentals: ["positioning", "decision-making"],
    roles: [],
    severity: "medium",
    decision: "Held a safe angle until enemy engage was spent.",
    immediateConsequence: "Enemy burned key cooldowns on nothing.",
    laterConsequence: "Your team enters the fight with a cooldown lead.",
    practiceRecommendation: "Hold your angle until the enemy engage tool is on cooldown.",
    recognizeCue: "Your instinct to push forward, replaced by patience.",
    counterpartId: "unsafe-positioning",
  }),
  D({
    id: "disciplined-positioning",
    label: "Disciplined Positioning",
    tone: "strength",
    fundamentals: ["positioning", "consistency"],
    roles: [],
    severity: "medium",
    decision: "Respected enemy range and stayed alive through skirmishes.",
    immediateConsequence: "You keep applying pressure while the enemy uses cooldowns for nothing.",
    laterConsequence: "Consistent damage across the game turns leads into wins.",
    practiceRecommendation: "Keep it up — protect this by not chasing kills once fights end.",
    recognizeCue: "The urge to disengage before a risky play — that's the habit paying off.",
  }),
  D({
    id: "fighting-without-spike",
    label: "Fighting Without Spike",
    tone: "mistake",
    fundamentals: ["power-spikes", "decision-making", "champion-identity"],
    roles: [],
    severity: "high",
    decision: "Committed to a fight before hitting your key item / level spike.",
    immediateConsequence: "You deal less damage than the enemy; the fight snowballs against you.",
    laterConsequence: "Fall further behind on items; the game slips into a losing pattern.",
    practiceRecommendation: "Disengage until you finish your next spike — farm safely to get there faster.",
    recognizeCue: "A fight breaks out and you're one full item behind — that's the disengage cue.",
    shortExplanation: "Fighting behind an item is losing math.",
    longExplanation:
      "One full item is 20–40% damage or effective HP. Fighting a phase behind that guarantees you lose the trade and delays your spike further via death timer + missed farm.",
    likelyOutcome: "Fight snowballs against you; enemy carry powerspikes on your shutdown.",
    counterpartId: "fight-on-spike",
  }),
  D({
    id: "fight-on-spike",
    label: "Fight On Spike",
    tone: "strength",
    fundamentals: ["power-spikes", "decision-making"],
    roles: [],
    severity: "medium",
    decision: "Forced a fight the moment your key item / level came online.",
    immediateConsequence: "Damage curve favors you; the fight snowballs your way.",
    laterConsequence: "Convert the fight into an objective and a lead phase.",
    practiceRecommendation: "Ping your spike the second it completes and group for a fight.",
    recognizeCue: "You just finished an item and the enemy hasn't.",
    counterpartId: "fighting-without-spike",
  }),
  D({
    id: "weak-rotation",
    label: "Weak Rotation",
    tone: "mistake",
    fundamentals: ["map-movement", "tempo", "decision-making"],
    roles: [],
    severity: "medium",
    decision: "Stayed in a side lane while the map's key fight happened elsewhere.",
    immediateConsequence: "Team fights 4v5 and loses the objective / picks.",
    laterConsequence: "Enemy converts the fight into towers and map control.",
    practiceRecommendation: "After crashing a wave, immediately path toward the next objective.",
    recognizeCue: "You see an objective timer under 45s and you're moving away from it.",
    counterpartId: "early-rotation",
  }),
  D({
    id: "early-rotation",
    label: "Early Rotation",
    tone: "strength",
    fundamentals: ["map-movement", "tempo"],
    roles: [],
    severity: "medium",
    decision: "Left the side lane on tempo to arrive at the next objective early.",
    immediateConsequence: "Team fights 5v4 or 5v5 with your presence secured.",
    laterConsequence: "Objective secured; map presence carries into the next window.",
    practiceRecommendation: "After every crashed wave, path immediately to the next objective.",
    recognizeCue: "You're recalling with 60s+ before objective spawn.",
    counterpartId: "weak-rotation",
  }),
  D({
    id: "delayed-reset",
    label: "Delayed Reset",
    tone: "mistake",
    fundamentals: ["resource-management", "tempo", "economy"],
    roles: [],
    severity: "medium",
    decision: "Skipped a reset with full inventory / low HP.",
    immediateConsequence: "Fight or farm with worse stats than you should have.",
    laterConsequence: "Miss a component spike and get out-traded next skirmish.",
    practiceRecommendation: "Reset when you have 1300+ gold and your wave lets you leave.",
    recognizeCue: "Inventory full, wave crashing, and you're still on the map with no reason.",
    counterpartId: "disciplined-reset",
  }),
  D({
    id: "disciplined-reset",
    label: "Disciplined Reset",
    tone: "strength",
    fundamentals: ["resource-management", "tempo", "economy"],
    roles: [],
    severity: "medium",
    decision: "Recalled the moment inventory + wave state lined up.",
    immediateConsequence: "Return with a component spike and full HP/mana.",
    laterConsequence: "Compound resets into a full item lead by mid-game.",
    practiceRecommendation: "Reset on every crash with 1300+ gold — no exceptions.",
    recognizeCue: "Full inventory + crashed wave + no map pressure.",
    counterpartId: "delayed-reset",
  }),
  D({
    id: "poor-resource-usage",
    label: "Poor Resource Usage",
    tone: "mistake",
    fundamentals: ["resource-management", "trading"],
    roles: [],
    severity: "low",
    decision: "Burned summoners / ultimate on a low-value play.",
    immediateConsequence: "You're weaker in the next skirmish where those cooldowns mattered.",
    laterConsequence: "Enemy times the next fight around your missing cooldowns.",
    practiceRecommendation: "Save Flash and ultimate for objective fights unless it saves a life.",
    recognizeCue: "About to blow a summoner for CS or a solo kill — reconsider.",
  }),
  D({
    id: "greedy-plate",
    label: "Greedy Plate",
    tone: "mistake",
    fundamentals: ["economy", "decision-making", "positioning"],
    roles: [],
    severity: "medium",
    decision: "Stayed for a plate with the enemy jungler unaccounted for.",
    immediateConsequence: "Ganked at tower — plate turns into a shutdown for the enemy.",
    laterConsequence: "Wave bounces, you lose CS on top of the death.",
    practiceRecommendation: "Only take plates when the enemy jungler is warded on the opposite side.",
    recognizeCue: "You're auto-ing tower with no vision behind you.",
  }),
  D({
    id: "overchasing",
    label: "Overchasing",
    tone: "mistake",
    fundamentals: ["decision-making", "positioning", "resource-management"],
    roles: [],
    severity: "high",
    decision: "Chased a low-HP enemy past vision or into a collapse.",
    immediateConsequence: "Killed by the collapse; your team is short a member for the next fight.",
    laterConsequence: "Enemy converts your death into an objective.",
    practiceRecommendation: "Stop chasing once the enemy crosses into fog.",
    recognizeCue: "You're following a kill target past the last ward you can see.",
  }),
  D({
    id: "objective-trade",
    label: "Objective Trade",
    tone: "strength",
    fundamentals: ["objective-control", "map-movement", "tempo"],
    roles: [],
    severity: "medium",
    decision: "Took the opposite-side objective instead of contesting a lost one.",
    immediateConsequence: "You bank an uncontested objective while the enemy commits.",
    laterConsequence: "Trade produces even map state or a lead depending on value.",
    practiceRecommendation: "When you can't contest, pivot to the opposite side objective immediately.",
    recognizeCue: "Enemy is starting the pit and you're on the far side with prio.",
  }),
  D({
    id: "weak-side-discipline",
    label: "Weak Side Discipline",
    tone: "strength",
    fundamentals: ["wave-management", "champion-identity", "decision-making"],
    roles: [],
    severity: "low",
    decision: "Played weak side cleanly — no deaths, safe CS, no map cost.",
    immediateConsequence: "Jungler frees the opposite side.",
    laterConsequence: "Comp scales into its win condition.",
    practiceRecommendation: "On weak side, prioritize no-death > CS > kills.",
    recognizeCue: "You're the scaling comp and lane is even — don't force.",
  }),
  D({
    id: "strong-side-pressure",
    label: "Strong Side Pressure",
    tone: "strength",
    fundamentals: ["tempo", "map-movement", "objective-control"],
    roles: [],
    severity: "medium",
    decision: "Converted a strong side lead into map pressure or objective setup.",
    immediateConsequence: "Enemy jungler must commit to your side, freeing the map.",
    laterConsequence: "Objective secured or plates cashed in.",
    practiceRecommendation: "When ahead, shove and back off with vision — force enemy jungler attention.",
    recognizeCue: "You have a two-wave shove and the enemy laner is behind.",
  }),
];

export function getDecisionPattern(id: string): DecisionPattern | undefined {
  return DECISION_LIBRARY.find((d) => d.id === id);
}

export function decisionsByFundamental(f: LeagueFundamentalId): DecisionPattern[] {
  return DECISION_LIBRARY.filter((d) => d.fundamentals.includes(f));
}

export function decisionsForRole(role: RoleId): DecisionPattern[] {
  return DECISION_LIBRARY.filter((d) => d.roles.length === 0 || d.roles.includes(role));
}

export function decisionsByTone(tone: DecisionTone): DecisionPattern[] {
  return DECISION_LIBRARY.filter((d) => d.tone === tone);
}

export function decisionCounterpart(id: string): DecisionPattern | undefined {
  const d = getDecisionPattern(id);
  return d?.counterpartId ? getDecisionPattern(d.counterpartId) : undefined;
}