// ---------------------------------------------------------------------------
// League Decision Library — the PERMANENT source of truth for every decision
// BotDiff can coach.
//
// A decision is an OBJECT, never a string. Every coaching module (Pipeline,
// Decision Prioritization Engine, Match Reports, Replay Coach, Practice
// Planner, AI Coach, Player Memory) references a LeagueDecisionId and reads
// its definition from here. No module owns decision definitions.
//
// Champion Intelligence references are OPTIONAL — the library is fully usable
// with only League Intelligence, Curriculum and Role Intelligence.
//
// Pure + client-safe. Facts and coaching definitions only, no player state.
// ---------------------------------------------------------------------------
import type { GamePhase, KnowledgeSource } from "./types";
import type { LeagueFundamentalId } from "./fundamentals";
import type { CurriculumTopicId } from "./curriculum";
import type { RoleId } from "./templates/champion";

export type DecisionCategory =
  | "macro"
  | "micro"
  | "economy"
  | "tempo"
  | "vision"
  | "teamfight"
  | "mental";

/** 0–1 normalized weights used by the Decision Prioritization Engine. */
export type DecisionWeight = number;

export interface DecisionChampionReference {
  /** Data Dragon champion key when known (optional by design). */
  championId?: string;
  /** Champion class / archetype hook, used when no champion record exists. */
  archetype?: string;
  note: string;
}

export interface LeagueDecision {
  id: string;
  title: string;
  fundamental: LeagueFundamentalId;
  supportingFundamentals: LeagueFundamentalId[];
  curriculumTopic: CurriculumTopicId;
  phases: GamePhase[];
  /** Empty = universal (applies to every role). */
  roles: RoleId[];
  category: DecisionCategory;
  summary: string;
  positiveExample: string;
  negativeExample: string;
  expectedConsequences: {
    immediate: string;
    later: string;
    gameOutcome: string;
  };
  recoveryAdvice: string;
  practiceRecommendation: string;
  relatedDecisions: string[];
  prerequisiteDecisions: string[];
  /** 0 = trivial, 1 = requires Challenger-level execution. */
  estimatedDifficulty: DecisionWeight;
  /** 0 = cosmetic, 1 = decides games. */
  estimatedImpact: DecisionWeight;
  /** 0 = mostly team/enemy driven, 1 = fully in the player's control. */
  playerAgency: DecisionWeight;
  /** 0 = one-off, 1 = repeats every game and compounds. */
  consistencyWeight: DecisionWeight;
  /** Optional — only present once Champion Intelligence is populated. */
  championReferences?: DecisionChampionReference[];
  source: KnowledgeSource;
}

export type LeagueDecisionId = (typeof LEAGUE_DECISIONS)[number]["id"];

const d = (decision: Omit<LeagueDecision, "source">): LeagueDecision => ({
  ...decision,
  source: "curated",
});

export const LEAGUE_DECISIONS = [
  d({
    id: "recall-on-crash",
    title: "Recall On The Wave Crash",
    fundamental: "wave-management",
    supportingFundamentals: ["tempo", "economy"],
    curriculumTopic: "recall-timing",
    phases: ["early", "mid"],
    roles: [],
    category: "tempo",
    summary: "Reset the moment the wave crashes into the enemy tower and you have gold to spend.",
    positiveExample: "Wave crashes at 1400 gold, you back, buy a component and walk back to a bouncing wave.",
    negativeExample: "You stay for one more wave, back at low HP and return with the wave already lost.",
    expectedConsequences: {
      immediate: "You return on time, full resources, with an item spike the enemy does not have.",
      later: "You control the next objective window because you arrive first and stronger.",
      gameOutcome: "Repeated clean resets compound into a full item lead by mid game.",
    },
    recoveryAdvice: "If you missed the crash, shove the next wave fully before backing instead of backing mid-wave.",
    practiceRecommendation: "Recall on the crash with 1300+ gold in 5 games — track how many resets cost zero CS.",
    relatedDecisions: ["leave-lane-after-crash", "reset-timing-discipline"],
    prerequisiteDecisions: [],
    estimatedDifficulty: 0.35,
    estimatedImpact: 0.7,
    playerAgency: 0.95,
    consistencyWeight: 0.9,
  }),
  d({
    id: "reset-timing-discipline",
    title: "Avoid The Early / Empty Reset",
    fundamental: "economy",
    supportingFundamentals: ["wave-management", "resource-management"],
    curriculumTopic: "recall-timing",
    phases: ["early", "mid"],
    roles: [],
    category: "economy",
    summary: "Only reset when the wave state allows it AND the gold buys something meaningful.",
    positiveExample: "You hold the back until 1300 gold so the reset actually produces a component.",
    negativeExample: "You back at 700 gold with the wave in the middle of lane and buy nothing that matters.",
    expectedConsequences: {
      immediate: "Wave bounces against you and the shop trip changes nothing.",
      later: "You return level and item even, having lost CS for free.",
      gameOutcome: "Economy never spikes; every skirmish is fought on flat stats.",
    },
    recoveryAdvice: "Bank the gold, hold lane one more crash cycle, and back on a real breakpoint.",
    practiceRecommendation: "Write your next item breakpoint in chat before each back — only back at that number.",
    relatedDecisions: ["recall-on-crash"],
    prerequisiteDecisions: ["recall-on-crash"],
    estimatedDifficulty: 0.3,
    estimatedImpact: 0.5,
    playerAgency: 0.9,
    consistencyWeight: 0.75,
  }),
  d({
    id: "leave-lane-after-crash",
    title: "Only Leave Lane After A Crash Or Freeze",
    fundamental: "wave-management",
    supportingFundamentals: ["tempo", "map-movement"],
    curriculumTopic: "wave-management",
    phases: ["early", "mid"],
    roles: [],
    category: "macro",
    summary: "Set the wave before roaming, backing, or rotating so leaving costs nothing.",
    positiveExample: "You crash three waves, then rotate to the objective with zero CS lost.",
    negativeExample: "You roam mid-wave, the wave bounces, and the enemy gets a free reset plus CS.",
    expectedConsequences: {
      immediate: "Enemy laner eats your minions or resets for free.",
      later: "They hit their spike first and take lane priority for the objective.",
      gameOutcome: "Your roams cost more gold than they generate.",
    },
    recoveryAdvice: "If you already left, do not walk back mid-lane — reset and meet the bounce.",
    practiceRecommendation: "Every rotation this session must start with a crashed or frozen wave.",
    relatedDecisions: ["recall-on-crash", "rotate-to-objective"],
    prerequisiteDecisions: [],
    estimatedDifficulty: 0.4,
    estimatedImpact: 0.6,
    playerAgency: 0.9,
    consistencyWeight: 0.85,
  }),
  d({
    id: "rotate-to-objective",
    title: "Rotate Early To The Next Objective",
    fundamental: "map-movement",
    supportingFundamentals: ["tempo", "objective-control"],
    curriculumTopic: "map-movement",
    phases: ["mid", "late"],
    roles: [],
    category: "macro",
    summary: "Path toward the next objective 45–60 seconds before it spawns.",
    positiveExample: "You crash side lane at 60s on the dragon timer and arrive with the team.",
    negativeExample: "You keep farming side lane while your team contests 4v5.",
    expectedConsequences: {
      immediate: "Your team fights even or up a body instead of down one.",
      later: "Objective banked, map pressure carries into the next window.",
      gameOutcome: "Objective stacking closes games without needing kills.",
    },
    recoveryAdvice: "If you cannot arrive in time, take the opposite-side objective or a tower instead.",
    practiceRecommendation: "Check the objective timer every time you finish a wave — 60s means move.",
    relatedDecisions: ["objective-setup-vision", "cross-map-trade"],
    prerequisiteDecisions: ["leave-lane-after-crash"],
    estimatedDifficulty: 0.5,
    estimatedImpact: 0.75,
    playerAgency: 0.85,
    consistencyWeight: 0.8,
  }),
  d({
    id: "objective-setup-vision",
    title: "Set Up Vision Before The Objective Spawns",
    fundamental: "vision",
    supportingFundamentals: ["objective-control", "tempo"],
    curriculumTopic: "vision",
    phases: ["mid", "late"],
    roles: [],
    category: "vision",
    summary: "Clear enemy wards and place your own 45–60 seconds before spawn.",
    positiveExample: "Control ward in the pit and two flank wards down before the timer hits zero.",
    negativeExample: "You walk into the pit blind and the enemy starts on their terms.",
    expectedConsequences: {
      immediate: "You can start the objective safely and see the collapse coming.",
      later: "You either take it for free or trade cleanly with full information.",
      gameOutcome: "Vision-led objectives convert into towers and map control.",
    },
    recoveryAdvice: "With no vision, do not contest — trade to the other side of the map.",
    practiceRecommendation: "Spend your full ward inventory every objective cycle this session.",
    relatedDecisions: ["rotate-to-objective", "cross-map-trade"],
    prerequisiteDecisions: [],
    estimatedDifficulty: 0.55,
    estimatedImpact: 0.8,
    playerAgency: 0.8,
    consistencyWeight: 0.85,
  }),
  d({
    id: "cross-map-trade",
    title: "Trade Objectives Instead Of Contesting Blind",
    fundamental: "objective-control",
    supportingFundamentals: ["map-movement", "decision-making"],
    curriculumTopic: "objective-control",
    phases: ["mid", "late"],
    roles: [],
    category: "macro",
    summary: "When the objective is unwinnable, immediately cash value on the opposite side.",
    positiveExample: "Enemy starts dragon uncontested — you take Herald and two plates.",
    negativeExample: "You throw four bodies at a lost pit and lose the fight plus the map.",
    expectedConsequences: {
      immediate: "You bank guaranteed value while the enemy commits elsewhere.",
      later: "Map state stays even or better with zero deaths given.",
      gameOutcome: "You never lose games to a single contested objective.",
    },
    recoveryAdvice: "Ping the trade target early so the team commits with you rather than half-contesting.",
    practiceRecommendation: "Each game, make one deliberate objective trade instead of a blind contest.",
    relatedDecisions: ["objective-setup-vision", "rotate-to-objective"],
    prerequisiteDecisions: ["rotate-to-objective"],
    estimatedDifficulty: 0.6,
    estimatedImpact: 0.65,
    playerAgency: 0.6,
    consistencyWeight: 0.6,
  }),
  d({
    id: "hold-safe-angle",
    title: "Hold A Safe Angle Until Engage Is Spent",
    fundamental: "positioning",
    supportingFundamentals: ["decision-making", "consistency"],
    curriculumTopic: "spacing",
    phases: ["mid", "late"],
    roles: [],
    category: "teamfight",
    summary: "Stay outside enemy engage range until their primary engage tool is on cooldown.",
    positiveExample: "You wait behind the frontline, the enemy engage whiffs, then you commit.",
    negativeExample: "You stand in fog inside engage range and get picked before the fight starts.",
    expectedConsequences: {
      immediate: "Enemy burns cooldowns on nothing while your damage stays alive.",
      later: "Your team fights with a cooldown lead and takes the objective.",
      gameOutcome: "Staying alive in fights is the single largest damage multiplier you own.",
    },
    recoveryAdvice: "After a caught death, play the next two fights one screen further back on purpose.",
    practiceRecommendation: "Name the enemy engage tool out loud before each fight and track its cooldown.",
    relatedDecisions: ["avoid-overchase", "fight-on-spike"],
    prerequisiteDecisions: [],
    estimatedDifficulty: 0.65,
    estimatedImpact: 0.85,
    playerAgency: 0.9,
    consistencyWeight: 0.9,
  }),
  d({
    id: "avoid-overchase",
    title: "Stop Chasing At The Vision Line",
    fundamental: "decision-making",
    supportingFundamentals: ["positioning", "resource-management"],
    curriculumTopic: "decision-making",
    phases: ["early", "mid", "late"],
    roles: [],
    category: "micro",
    summary: "Break off a chase the moment the target crosses into fog.",
    positiveExample: "You win the trade, take the wave, and never step past your last ward.",
    negativeExample: "You follow a 10% HP target into the enemy jungle and die to the collapse.",
    expectedConsequences: {
      immediate: "You keep the kill pressure without giving a shutdown.",
      later: "Your team stays five-strong for the next objective.",
      gameOutcome: "Fewer thrown leads; the game stays on your tempo.",
    },
    recoveryAdvice: "After a fight, take the nearest objective or wave instead of hunting the survivor.",
    practiceRecommendation: "Set a personal rule: zero deaths in fog this session.",
    relatedDecisions: ["hold-safe-angle", "convert-fight-to-objective"],
    prerequisiteDecisions: [],
    estimatedDifficulty: 0.45,
    estimatedImpact: 0.8,
    playerAgency: 0.95,
    consistencyWeight: 0.85,
  }),
  d({
    id: "convert-fight-to-objective",
    title: "Convert Every Won Fight Into An Objective",
    fundamental: "tempo",
    supportingFundamentals: ["objective-control", "map-movement"],
    curriculumTopic: "tempo",
    phases: ["mid", "late"],
    roles: [],
    category: "macro",
    summary: "Immediately cash a won fight into dragon, Baron, towers, or a deep reset.",
    positiveExample: "You ace, then take dragon and two towers before enemies respawn.",
    negativeExample: "You ace, then recall and farm — the lead evaporates.",
    expectedConsequences: {
      immediate: "Free objective while the enemy is on death timers.",
      later: "Map control snowballs and the next fight is on better terrain.",
      gameOutcome: "Kills become gold and structures instead of scoreboard decoration.",
    },
    recoveryAdvice: "If timers are short, take the safest structure and reset rather than forcing Baron.",
    practiceRecommendation: "After every won fight, ping an objective within 5 seconds.",
    relatedDecisions: ["rotate-to-objective", "avoid-overchase"],
    prerequisiteDecisions: [],
    estimatedDifficulty: 0.5,
    estimatedImpact: 0.85,
    playerAgency: 0.7,
    consistencyWeight: 0.8,
  }),
  d({
    id: "fight-on-spike",
    title: "Fight On Your Power Spike",
    fundamental: "power-spikes",
    supportingFundamentals: ["decision-making", "champion-identity"],
    curriculumTopic: "power-spikes",
    phases: ["early", "mid", "late"],
    roles: [],
    category: "micro",
    summary: "Force fights when your item or level spike lands, disengage when it has not.",
    positiveExample: "You complete your mythic and immediately group to force a dragon fight.",
    negativeExample: "You commit a full item behind and lose the trade plus the objective.",
    expectedConsequences: {
      immediate: "The damage curve favors you and the fight snowballs your way.",
      later: "The lead converts to an objective before the enemy catches up.",
      gameOutcome: "You win the games where your champion is strongest instead of coin-flipping.",
    },
    recoveryAdvice: "Behind a spike? Farm the safest side wave until the item completes, then group.",
    practiceRecommendation: "Announce your item spike timing to the team the moment it completes.",
    relatedDecisions: ["hold-safe-angle", "convert-fight-to-objective"],
    prerequisiteDecisions: [],
    estimatedDifficulty: 0.55,
    estimatedImpact: 0.8,
    playerAgency: 0.75,
    consistencyWeight: 0.7,
  }),
  d({
    id: "trade-on-cooldowns",
    title: "Trade Only On Enemy Cooldowns",
    fundamental: "trading",
    supportingFundamentals: ["resource-management", "positioning"],
    curriculumTopic: "trading",
    phases: ["early"],
    roles: [],
    category: "micro",
    summary: "Start a trade after the enemy's key spell is used, not before.",
    positiveExample: "Enemy misses their poke ability, you step up and win the trade for free.",
    negativeExample: "You walk up into a fully loaded kit and lose half your HP.",
    expectedConsequences: {
      immediate: "You win the HP exchange without spending resources.",
      later: "HP lead becomes wave control and a better reset.",
      gameOutcome: "Lane pressure without risk, feeding your reset and roam windows.",
    },
    recoveryAdvice: "Lost the trade? Freeze and farm safely until your HP resets rather than re-trading.",
    practiceRecommendation: "Track one enemy cooldown per game and only trade inside that window.",
    relatedDecisions: ["manage-resources", "hold-safe-angle"],
    prerequisiteDecisions: [],
    estimatedDifficulty: 0.6,
    estimatedImpact: 0.6,
    playerAgency: 0.9,
    consistencyWeight: 0.75,
  }),
  d({
    id: "manage-resources",
    title: "Save Summoners And Ultimates For Value",
    fundamental: "resource-management",
    supportingFundamentals: ["trading", "decision-making"],
    curriculumTopic: "resource-management",
    phases: ["early", "mid", "late"],
    roles: [],
    category: "micro",
    summary: "Spend Flash and ultimate on objectives and survival, not on greed.",
    positiveExample: "You hold Flash through lane and use it to survive the dragon collapse.",
    negativeExample: "You burn Flash to chase a kill and die to the gank 30 seconds later.",
    expectedConsequences: {
      immediate: "You keep the tool that decides the next skirmish.",
      later: "Enemy cannot time a fight around your missing cooldowns.",
      gameOutcome: "Fewer free deaths, more contested objectives.",
    },
    recoveryAdvice: "Without summoners, play a full wave further back until they are up.",
    practiceRecommendation: "No Flash for CS or solo-kill greed for a full session.",
    relatedDecisions: ["trade-on-cooldowns", "avoid-overchase"],
    prerequisiteDecisions: [],
    estimatedDifficulty: 0.4,
    estimatedImpact: 0.6,
    playerAgency: 0.95,
    consistencyWeight: 0.8,
  }),
  d({
    id: "respect-jungle-tracking",
    title: "Track The Enemy Jungler Before Committing",
    fundamental: "decision-making",
    supportingFundamentals: ["vision", "map-movement"],
    curriculumTopic: "mental-decision-making",
    phases: ["early", "mid"],
    roles: [],
    category: "macro",
    summary: "Only take greedy actions (plates, deep waves, dives) with the enemy jungler accounted for.",
    positiveExample: "You see the jungler on the opposite side and safely take three plates.",
    negativeExample: "You auto tower with no vision behind you and turn a plate into a shutdown.",
    expectedConsequences: {
      immediate: "Greedy value taken for free instead of a death.",
      later: "Wave and gold lead stay intact for your spike.",
      gameOutcome: "You stop donating shutdowns that fund the enemy carry.",
    },
    recoveryAdvice: "Unknown jungler? Play the wave at your side of lane until you have information.",
    practiceRecommendation: "Say the enemy jungler's likely camp out loud before every greedy action.",
    relatedDecisions: ["objective-setup-vision", "manage-resources"],
    prerequisiteDecisions: [],
    estimatedDifficulty: 0.7,
    estimatedImpact: 0.75,
    playerAgency: 0.8,
    consistencyWeight: 0.8,
  }),
  d({
    id: "play-win-condition",
    title: "Play Your Team's Win Condition",
    fundamental: "win-conditions",
    supportingFundamentals: ["champion-identity", "decision-making"],
    curriculumTopic: "win-conditions",
    phases: ["mid", "late"],
    roles: [],
    category: "macro",
    summary: "Match your risk level to whether your comp wants to scale or force tempo now.",
    positiveExample: "Scaling comp: you play weak side clean, no deaths, and hit your two-item timing.",
    negativeExample: "You force 50/50 fights on a comp that outscales the enemy by minute 25.",
    expectedConsequences: {
      immediate: "Every action serves how the game is actually won.",
      later: "Your comp reaches the state where it is strongest.",
      gameOutcome: "You stop losing winnable games by playing the wrong clock.",
    },
    recoveryAdvice: "Reassess at every objective: is the clock on our side or theirs?",
    practiceRecommendation: "At champ select, write one sentence: how does this team win?",
    relatedDecisions: ["fight-on-spike", "cross-map-trade"],
    prerequisiteDecisions: [],
    estimatedDifficulty: 0.75,
    estimatedImpact: 0.8,
    playerAgency: 0.6,
    consistencyWeight: 0.7,
  }),
  d({
    id: "tilt-reset",
    title: "Reset Mentally After A Mistake",
    fundamental: "consistency",
    supportingFundamentals: ["decision-making"],
    curriculumTopic: "mental-decision-making",
    phases: ["early", "mid", "late"],
    roles: [],
    category: "mental",
    summary: "After a death or lost trade, take the lowest-risk action available for the next 60 seconds.",
    positiveExample: "You die once, then farm safe, hit your item, and rejoin the game even.",
    negativeExample: "You die once, force a 1v2 to 'get it back', and hand over a second shutdown.",
    expectedConsequences: {
      immediate: "One mistake stays one mistake.",
      later: "You return to even instead of compounding the deficit.",
      gameOutcome: "Fewer games lost to the two minutes after a death.",
    },
    recoveryAdvice: "Set a 60-second safe timer after any death before taking a risky action.",
    practiceRecommendation: "Track deaths that happen within 90 seconds of a previous death — target zero.",
    relatedDecisions: ["avoid-overchase", "manage-resources"],
    prerequisiteDecisions: [],
    estimatedDifficulty: 0.5,
    estimatedImpact: 0.7,
    playerAgency: 1,
    consistencyWeight: 0.95,
  }),
] as const satisfies readonly LeagueDecision[];

const DECISION_INDEX: Record<string, LeagueDecision> = Object.fromEntries(
  LEAGUE_DECISIONS.map((decision) => [decision.id, decision]),
);

export function getLeagueDecision(id: string): LeagueDecision | undefined {
  return DECISION_INDEX[id];
}

export function isLeagueDecisionId(id: string): id is LeagueDecisionId {
  return id in DECISION_INDEX;
}

export function allLeagueDecisions(): readonly LeagueDecision[] {
  return LEAGUE_DECISIONS;
}

export function leagueDecisionsByFundamental(f: LeagueFundamentalId): LeagueDecision[] {
  return LEAGUE_DECISIONS.filter(
    (x) => x.fundamental === f || x.supportingFundamentals.includes(f),
  );
}

export function leagueDecisionsByCurriculumTopic(topic: CurriculumTopicId): LeagueDecision[] {
  return LEAGUE_DECISIONS.filter((x) => x.curriculumTopic === topic);
}

export function leagueDecisionsForRole(role: RoleId): LeagueDecision[] {
  return LEAGUE_DECISIONS.filter((x) => x.roles.length === 0 || x.roles.includes(role));
}

export function leagueDecisionsByPhase(phase: GamePhase): LeagueDecision[] {
  return LEAGUE_DECISIONS.filter((x) => x.phases.includes(phase));
}

export function leagueDecisionsByCategory(category: DecisionCategory): LeagueDecision[] {
  return LEAGUE_DECISIONS.filter((x) => x.category === category);
}

export function relatedLeagueDecisions(id: string): LeagueDecision[] {
  const decision = getLeagueDecision(id);
  if (!decision) return [];
  return decision.relatedDecisions
    .map(getLeagueDecision)
    .filter((x): x is LeagueDecision => Boolean(x));
}

export function prerequisiteLeagueDecisions(id: string): LeagueDecision[] {
  const decision = getLeagueDecision(id);
  if (!decision) return [];
  return decision.prerequisiteDecisions
    .map(getLeagueDecision)
    .filter((x): x is LeagueDecision => Boolean(x));
}

/**
 * Deterministic priority score used by the Decision Prioritization Engine so
 * every surface ranks decisions identically.
 */
export function leagueDecisionPriorityScore(id: string): number {
  const x = getLeagueDecision(id);
  if (!x) return 0;
  const score =
    x.estimatedImpact * 0.4 +
    x.consistencyWeight * 0.25 +
    x.playerAgency * 0.2 +
    (1 - x.estimatedDifficulty) * 0.15;
  return Math.round(score * 1000) / 1000;
}

export function rankLeagueDecisions(ids: string[]): LeagueDecision[] {
  return ids
    .map(getLeagueDecision)
    .filter((x): x is LeagueDecision => Boolean(x))
    .sort(
      (a, b) =>
        leagueDecisionPriorityScore(b.id) - leagueDecisionPriorityScore(a.id) ||
        a.id.localeCompare(b.id),
    );
}

/** Champion Intelligence is optional — returns [] when nothing is registered. */
export function championReferencesFor(id: string): DecisionChampionReference[] {
  return getLeagueDecision(id)?.championReferences ?? [];
}
