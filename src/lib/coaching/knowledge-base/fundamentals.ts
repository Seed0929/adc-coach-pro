// ---------------------------------------------------------------------------
// Universal League Fundamentals — the permanent coaching taxonomy.
//
// Every coaching point BotDiff ever produces (any role, any champion, any
// patch) must belong to at least one Fundamental. Roles and champions are
// LENSES over these fundamentals — they are not separate coaching systems.
//
// Facts only. No player evaluation. Pure + client-safe.
// ---------------------------------------------------------------------------
import type { KnowledgeSource } from "./types";

export type LeagueFundamentalId =
  | "wave-management"
  | "tempo"
  | "economy"
  | "vision"
  | "objective-control"
  | "positioning"
  | "trading"
  | "map-movement"
  | "resource-management"
  | "power-spikes"
  | "champion-identity"
  | "win-conditions"
  | "decision-making"
  | "consistency";

export interface LeagueFundamental {
  id: LeagueFundamentalId;
  label: string;
  summary: string;
  /** Sample coachable behaviors — used by the decision library as anchors. */
  coreConcepts: string[];
  /** Concise definition of the concept. */
  definition: string;
  /** Why this fundamental matters — what it unlocks or protects. */
  purpose: string;
  /** Canonical examples of doing this well. */
  goodDecisionExamples: string[];
  /** Canonical examples of doing this poorly. */
  poorDecisionExamples: string[];
  /** What usually happens when this fundamental is broken. */
  typicalConsequences: string[];
  /** How to recover when this fundamental has already been broken. */
  recoveryMethods: string[];
  /** How to practice this fundamental deliberately. */
  practiceConcepts: string[];
  source: KnowledgeSource;
}

interface FundamentalPatch {
  definition: string;
  purpose: string;
  goodDecisionExamples: string[];
  poorDecisionExamples: string[];
  typicalConsequences: string[];
  recoveryMethods: string[];
  practiceConcepts: string[];
}

const F = (
  id: LeagueFundamentalId,
  label: string,
  summary: string,
  coreConcepts: string[],
  patch: FundamentalPatch,
): LeagueFundamental => ({ id, label, summary, coreConcepts, ...patch, source: "curated" });

export const LEAGUE_FUNDAMENTALS: Record<LeagueFundamentalId, LeagueFundamental> = {
  "wave-management": F(
    "wave-management",
    "Wave Management",
    "Controlling minion waves to dictate lane position, recall timing, and dive safety.",
    ["Freeze", "Slow push", "Crash", "Reset with wave crashed", "Bounce"],
    {
      definition: "Deliberately setting the state of the minion wave to control where and when the lane fights.",
      purpose: "Wave state controls tempo, recalls, dive safety, and roam windows — every other lane decision inherits from it.",
      goodDecisionExamples: [
        "Crashing the wave into tower before recall",
        "Freezing near your tower when down in matchup",
        "Slow-pushing a big wave before an objective",
      ],
      poorDecisionExamples: [
        "Auto-attacking a stable wave and pushing it for no reason",
        "Recalling with wave still in the middle",
        "Shoving without a plan while the enemy is missing",
      ],
      typicalConsequences: [
        "Free reset for the enemy",
        "Lost CS while returning to lane",
        "Dive vulnerability at your tower",
      ],
      recoveryMethods: [
        "Freeze the next wave to recover CS safely",
        "Wait for the wave to bounce and reset lane state",
        "Ask jungler for a lane state reset via gank or vision",
      ],
      practiceConcepts: [
        "Never leave lane without either crashing or freezing",
        "Say the wave plan out loud before each auto",
      ],
    },
  ),
  tempo: F(
    "tempo",
    "Tempo",
    "The advantage in time — being ahead on levels, items, or map position when it matters.",
    ["Prio into objective", "Reset windows", "Cooldown timing", "Item spike timing"],
    {
      definition: "Being ahead in the moment that matters — levels, items, cooldowns, or position — not just totals.",
      purpose: "Tempo turns small leads into objectives; the team with tempo dictates the next fight.",
      goodDecisionExamples: [
        "Recalling on a wave crash to hit an item spike before the enemy",
        "Being at the objective 45s before spawn",
        "Shoving before roaming so the roam is free",
      ],
      poorDecisionExamples: [
        "Farming a side wave while an objective is being taken",
        "Recalling with wave in the middle and returning behind",
        "Fighting with summoners down when the enemy has theirs",
      ],
      typicalConsequences: [
        "Objective lost uncontested",
        "Enemy hits an item spike first and forces the fight",
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
    },
  ),
  economy: F(
    "economy",
    "Economy",
    "Gold and XP efficiency: CS, kills, plates, objectives, support quest.",
    ["CS/min", "Gold diff", "Plates", "Support quest", "Shutdown gold"],
    {
      definition: "How efficiently you convert time into gold and XP compared to your role's benchmark.",
      purpose: "Every item spike and level spike depends on economy — falling behind in economy delays every fight window.",
      goodDecisionExamples: [
        "Cleaning up a crashed wave before recalling",
        "Taking a plate on a shove",
        "Completing the support quest before 14:00",
      ],
      poorDecisionExamples: [
        "Roaming for a kill that gives less than the missed waves",
        "Missing plates on a free push",
        "Leaving lane with 400g in the tank",
      ],
      typicalConsequences: [
        "Item spike delayed by minutes",
        "Enemy carry out-scales you in the same fight",
      ],
      recoveryMethods: [
        "Prioritize catch-up waves over kills",
        "Take safe plates and turrets on shove",
      ],
      practiceConcepts: [
        "Track CS every 5 minutes and compare to a benchmark",
        "Reset only with 1300+ gold and wave crashed",
      ],
    },
  ),
  vision: F(
    "vision",
    "Vision",
    "Wards and vision denial that let you fight and rotate on your terms.",
    ["Control wards", "Deep vision on lead", "Deny vision on losing side", "Sweeper"],
    {
      definition: "Placing wards and denying enemy wards so the map's information favors your team.",
      purpose: "Vision decides where fights start; the team with vision picks the terms.",
      goodDecisionExamples: [
        "Placing a Control Ward in the pit 60s before spawn",
        "Sweeping enemy wards before an objective",
        "Warding deep when ahead, warding defensive when behind",
      ],
      poorDecisionExamples: [
        "Walking past a Control Ward that's off cooldown",
        "Warding out of habit in a lost bush",
        "Contesting an objective with no vision cleared",
      ],
      typicalConsequences: [
        "Caught out before fights start",
        "Objective stolen or contested blind",
      ],
      recoveryMethods: [
        "Reset for Control Wards before the next objective window",
        "Move as a pair to compensate for missing vision",
      ],
      practiceConcepts: [
        "Buy a Control Ward every reset",
        "Sweep from your side of the pit to enemy side before objective spawns",
      ],
    },
  ),
  "objective-control": F(
    "objective-control",
    "Objective Control",
    "Setting up and contesting neutral objectives before they spawn.",
    ["Dragon", "Herald", "Baron", "Grubs", "Setup 45–60s early"],
    {
      definition: "Winning neutral objectives by setting up early with vision, prio, and cooldowns.",
      purpose: "Objectives compound: dragons scale, Herald/Baron push turrets, Grubs snowball early.",
      goodDecisionExamples: [
        "Shoving lanes before objective spawns",
        "Trading dragon for Herald when opposite side",
        "Baiting Baron to force a fight on your terms",
      ],
      poorDecisionExamples: [
        "Starting Baron without vision or prio",
        "Contesting a soul with no summoners",
        "Ignoring Grubs to force ganks that don't land",
      ],
      typicalConsequences: [
        "Objective lost + members caught",
        "Map advantage swings to enemy side",
      ],
      recoveryMethods: [
        "Trade for the opposite-side objective",
        "Reset priority for the next spawn",
      ],
      practiceConcepts: [
        "Announce objective timers 60s early",
        "Set up vision as a team before touching the pit",
      ],
    },
  ),
  positioning: F(
    "positioning",
    "Positioning",
    "Where you stand relative to threats, cooldowns, vision, and your team.",
    ["Range respect", "Peel line", "Flank angle", "Frontline distance"],
    {
      definition: "Where you stand relative to enemy threats, your team, and available vision at any moment.",
      purpose: "Position determines survivability and damage output — most deaths are position mistakes, not mechanics.",
      goodDecisionExamples: [
        "Standing one screen behind the frontline",
        "Kiting back to peel range in a fight",
        "Holding a flank until engage is spent",
      ],
      poorDecisionExamples: [
        "Standing in fog without vision",
        "Walking into engage range for one auto",
        "Facechecking a bush at an objective",
      ],
      typicalConsequences: [
        "Caught before the fight starts",
        "Team fights 4v5 into a lost objective",
      ],
      recoveryMethods: [
        "Buy a Zhonya's / defensive item if repeatedly caught",
        "Reset position after every ability trade",
      ],
      practiceConcepts: [
        "Before every fight, name the enemy's engage tool and its cooldown",
      ],
    },
  ),
  trading: F(
    "trading",
    "Trading",
    "Winning short exchanges by matching cooldowns, range, and wave state.",
    ["Cooldown windows", "Auto weave", "Level-up powerspike", "Trade + crash"],
    {
      definition: "Winning short lane exchanges by matching cooldowns, range advantages, and wave state.",
      purpose: "Winning trades pushes HP leads, wave control, and eventual kills or dive setups.",
      goodDecisionExamples: [
        "Trading on your level-up before the enemy",
        "Autoing after an enemy uses a key cooldown",
        "Weaving autos between minion aggro",
      ],
      poorDecisionExamples: [
        "Trading into minion aggro",
        "Trading with a bad wave state you can't crash",
        "Trading with your key cooldowns still down",
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
    },
  ),
  "map-movement": F(
    "map-movement",
    "Map Movement",
    "Rotations, roams, TP usage — moving where the map's decision is happening.",
    ["Rotate on prio", "TP flank", "Match roams", "Sidelane after items"],
    {
      definition: "Choosing where to move on the map so you arrive at the fight that matters.",
      purpose: "Map movement multiplies leads — being in the right place is worth more than mechanics.",
      goodDecisionExamples: [
        "Rotating mid to bot after crashing a wave",
        "TP flanking onto a Baron fight",
        "Sidelane split after 3 items",
      ],
      poorDecisionExamples: [
        "Farming a side wave through an objective",
        "Roaming without lane prio",
        "TPing into a lost fight",
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
    },
  ),
  "resource-management": F(
    "resource-management",
    "Resource Management",
    "Mana, health, summoners, ultimates — spending resources for correct returns.",
    ["Summoner tracking", "Ult windows", "Mana for wave vs skirmish"],
    {
      definition: "Spending mana, HP, summoners, and ultimates for value proportional to their cost.",
      purpose: "A saved summoner or ult decides the next fight — every resource is a fight-cooldown.",
      goodDecisionExamples: [
        "Saving Flash for the objective fight",
        "Ulting to secure objective, not to chase",
        "Managing mana for a fight, not the last CS",
      ],
      poorDecisionExamples: [
        "Flashing for a solo kill you didn't need",
        "Ulting a minion wave",
        "Going OOM before recall on a shove",
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
    },
  ),
  "power-spikes": F(
    "power-spikes",
    "Power Spikes",
    "Recognizing and exploiting the moments your champion is strongest.",
    ["Level 2 / 6", "First component", "Two-item spike", "Full build"],
    {
      definition: "The moments your champion is strongest relative to the enemy — usually level or item milestones.",
      purpose: "Playing to your spike wins the game phase; ignoring it wastes your best window.",
      goodDecisionExamples: [
        "Fighting on level 2 with a level advantage",
        "Forcing a fight on your first item completion",
        "Grouping at two items with the ADC",
      ],
      poorDecisionExamples: [
        "Fighting a full item behind",
        "Skipping a spike to greed one more wave",
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
        "Say your next spike out loud — level or item — every reset",
      ],
    },
  ),
  "champion-identity": F(
    "champion-identity",
    "Champion Identity",
    "Playing to your champion's archetype, damage profile, and role in the team.",
    ["Scaling carry", "Lane bully", "Skirmisher", "Enchanter", "Engage tank"],
    {
      definition: "Playing your champion's archetype — damage profile, range, role — instead of copying another champion.",
      purpose: "Every champion has a lane it wants to play; identity is the difference between playing well and playing wrong.",
      goodDecisionExamples: [
        "Scaling carries farm to their spike",
        "Lane bullies pressure pre-6",
        "Engage tanks look for a pick, not a scaling fight",
      ],
      poorDecisionExamples: [
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
    },
  ),
  "win-conditions": F(
    "win-conditions",
    "Win Conditions",
    "The specific path this composition wins through — and how to enable it.",
    ["Scale to items", "End before 25", "1-3-1 sidelane", "Pick comp"],
    {
      definition: "The specific path your composition wins through — scaling, tempo, pick, sidelane, or teamfight.",
      purpose: "Every decision should serve the win condition; ignoring it is why leads slip.",
      goodDecisionExamples: [
        "Ending before 25 with an early-game comp",
        "Scaling to 3 items with a late-game comp",
        "Playing 1-3-1 with a sidelane threat",
      ],
      poorDecisionExamples: [
        "Scaling comp forcing an early Baron",
        "Early comp waiting for 3 items",
      ],
      typicalConsequences: [
        "Enemy reaches their comp's win condition first",
      ],
      recoveryMethods: [
        "Reset the tempo of the game to your comp's phase",
      ],
      practiceConcepts: [
        "In loading screen, name the composition's win condition in one line",
      ],
    },
  ),
  "decision-making": F(
    "decision-making",
    "Decision Making",
    "Choosing the correct action given wave, tempo, vision, cooldowns, and map state.",
    ["Cause → effect", "Right thing at the right time", "Threat assessment"],
    {
      definition: "Choosing the correct action given wave, tempo, vision, cooldowns, and map state.",
      purpose: "Skill ceiling in League is decision-making — mechanics only turn into wins when the decision was right.",
      goodDecisionExamples: [
        "Crashing then recalling before an objective",
        "Choosing to disengage when a fight is not on spike",
      ],
      poorDecisionExamples: [
        "Chasing a kill through fog",
        "Contesting an objective blind and behind",
      ],
      typicalConsequences: [
        "The wrong decision at the right time still loses the game",
      ],
      recoveryMethods: [
        "Slow down for one wave — ask what the map wants",
      ],
      practiceConcepts: [
        "Before every action, name the cause and the expected effect",
      ],
    },
  ),
  consistency: F(
    "consistency",
    "Consistency",
    "Repeating good decisions across games — the habit layer above mechanics.",
    ["Recall discipline", "Vision every back", "Objective timers", "Deaths under 4"],
    {
      definition: "Repeating correct decisions across many games — the habit layer above raw mechanics.",
      purpose: "Consistency is what turns rank into results; peaks don't matter if the floor is low.",
      goodDecisionExamples: [
        "Recall discipline every crash",
        "Control Ward every reset",
        "Deaths under 4 across every game",
      ],
      poorDecisionExamples: [
        "One perfect game followed by a tilted throw",
      ],
      typicalConsequences: [
        "Rank plateaus at the level of your worst habits",
      ],
      recoveryMethods: [
        "Pick ONE habit to keep every game for a week",
      ],
      practiceConcepts: [
        "End every game naming which habit you protected",
      ],
    },
  ),
};

export const ALL_FUNDAMENTALS: LeagueFundamental[] = Object.values(LEAGUE_FUNDAMENTALS);

export function getFundamental(id: LeagueFundamentalId): LeagueFundamental {
  return LEAGUE_FUNDAMENTALS[id];
}

export function isFundamentalId(id: string): id is LeagueFundamentalId {
  return id in LEAGUE_FUNDAMENTALS;
}