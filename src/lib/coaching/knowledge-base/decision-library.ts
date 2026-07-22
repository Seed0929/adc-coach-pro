// ---------------------------------------------------------------------------
// Decision Library — reusable, role-agnostic coaching patterns.
//
// Each entry describes a DECISION (not a stat), the League Fundamental it
// belongs to, its likely cause + effect, and one measurable practice
// recommendation. Roles and champions plug into these patterns; the Coach
// Engine consumes them so no pattern is redefined per-role.
//
// This is a KNOWLEDGE artifact — no player evaluation, no runtime detection.
// Detection engines (habit-engine, decision-chain) reference these ids so
// coaching language stays consistent everywhere.
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