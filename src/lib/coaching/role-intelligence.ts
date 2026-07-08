// ---------------------------------------------------------------------------
// BotDiff Role Intelligence Module
//
// The Coach Engine is role-agnostic. It asks THIS module "what habits can a
// player of role X have?" and gets back a list of role-aware habit definitions.
// Universal habits apply to every role; each role then plugs in its own habits.
//
// Architecture:
//   Coach Engine → Universal Coaching → Role Intelligence → ADC / Jungle / ...
//
// Adding a new role later means adding one more definition array below and
// mapping its name in `normalizeRole` — the engine never changes.
//
// PURE + client-safe. No network, no secrets.
// ---------------------------------------------------------------------------
import type { MatchAnalysisInput } from "../coaching-engine";

export type RoleId = "adc" | "jungle" | "top" | "mid" | "support";

export const ROLE_LABELS: Record<RoleId, string> = {
  adc: "ADC",
  jungle: "Jungle",
  top: "Top",
  mid: "Mid",
  support: "Support",
};

/** Map a raw Riot role/position string onto a stable RoleId. */
export function normalizeRole(role: string | null | undefined): RoleId {
  const r = (role ?? "").toLowerCase();
  if (r.includes("jung") || r.includes("jgl")) return "jungle";
  if (r.includes("top")) return "top";
  if (r.includes("mid")) return "mid";
  if (r.includes("support") || r.includes("util") || r.includes("sup")) return "support";
  return "adc"; // default — BotDiff's flagship role
}

export type HabitPhase = "early" | "mid" | "late" | "any";

/**
 * The coaching taxonomy category. Maps to a pillar via `categoryToPillar`.
 * Shared across every role so the engine speaks one vocabulary.
 */
export type HabitCategory =
  | "lane"
  | "wave"
  | "positioning"
  | "decision"
  | "objective"
  | "teamfight"
  | "champion"
  | "farming"
  | "vision";

/**
 * A single coachable habit — the atom of BotDiff's intelligence. The engine
 * runs `test` across a player's recent games; the coaching *language* fields
 * explain it like a Challenger coach would (why it happens, why it loses games,
 * what to practice, how to recognize it next game).
 */
export interface HabitDefinition {
  id: string;
  role: RoleId | "universal";
  kind: "strength" | "weakness";
  category: HabitCategory;
  phase: HabitPhase;
  /** Short structured label, e.g. "Greedy recalls". */
  label: string;
  /** Fires when this game shows the habit. */
  test: (m: MatchAnalysisInput) => boolean;
  /** Why the mistake happens (the underlying decision). */
  cause: string;
  /** Why it loses games. */
  why: string;
  /** Exactly what to practice to fix it. */
  practice: string;
  /** How to recognize it live, next game. */
  recognize: string;
}

const objectivesOf = (m: MatchAnalysisInput) =>
  m.dragonTakedowns + m.baronTakedowns + m.riftHeraldTakedowns;

// ---------------------------------------------------------------------------
// Universal habits — decision-making, objectives, positioning, tempo. These
// apply to every role because they are role-independent macro/mental patterns.
// ---------------------------------------------------------------------------
const UNIVERSAL: HabitDefinition[] = [
  {
    id: "u-overextend-lead",
    role: "universal",
    kind: "weakness",
    category: "positioning",
    phase: "mid",
    label: "Gives leads back by overextending",
    test: (m) => m.earlyGoldExpAdvantage >= 300 && m.deaths >= 6,
    cause: "After getting ahead you keep pressing for more instead of banking the lead.",
    why: "A lead is only useful if you keep it. Dying while ahead hands the enemy shutdown gold and erases your advantage in a single fight.",
    practice: "Once you're ahead, play the next two minutes for objectives and vision from safety — take the free stuff, not the risky fight.",
    recognize: "The moment you think 'I can get one more', that's the overextend — step back to your wave instead.",
  },
  {
    id: "u-low-participation",
    role: "universal",
    kind: "weakness",
    category: "decision",
    phase: "mid",
    label: "Not grouping for fights & objectives",
    test: (m) => m.killParticipation < 0.45,
    cause: "You stay in a side lane or farm while the map's key fight happens without you.",
    why: "Fights and objectives decide games. A team that fights 4v5 loses the objectives that close out the map.",
    practice: "After you crash a wave, immediately ask 'where is the next objective?' and path toward it before it spawns.",
    recognize: "If you can see an objective timer under a minute and you're not moving toward it, you're about to be late.",
  },
  {
    id: "u-weak-objectives",
    role: "universal",
    kind: "weakness",
    category: "objective",
    phase: "mid",
    label: "Weak objective setup",
    test: (m) => objectivesOf(m) <= 1 && m.durationMin >= 22,
    cause: "You react to objectives when they spawn instead of setting up vision and priority before.",
    why: "Objectives — not kills — are how leads become towers and wins. Missing them keeps every game a coinflip.",
    practice: "Start pathing toward the pit and clearing enemy wards 45–60 seconds before the objective spawns.",
    recognize: "If you're still farming when the dragon/baron timer hits 0:45, you set up too late.",
  },
  {
    id: "u-die-before-damage",
    role: "universal",
    kind: "weakness",
    category: "teamfight",
    phase: "late",
    label: "Dies before dealing damage",
    test: (m) => m.deaths >= 6 && m.damageShare < 0.26,
    cause: "You step into range before the enemy's engage or crowd control is used up.",
    why: "A carry that dies early does zero damage — the fight becomes 4v5 and your gold is wasted.",
    practice: "Hold one screen behind your frontline and only step up once the enemy's engage tool is on cooldown.",
    recognize: "If you're the first name in the kill feed most fights, you're stepping up too early.",
  },
  {
    id: "u-disciplined",
    role: "universal",
    kind: "strength",
    category: "positioning",
    phase: "any",
    label: "Disciplined positioning",
    test: (m) => m.deaths <= 3,
    cause: "You respect enemy range and stay alive to keep applying pressure.",
    why: "Staying alive keeps your damage and map presence online — it's the foundation of carrying.",
    practice: "Keep doing it: keep deaths low and let your farm/damage lead do the work.",
    recognize: "You already feel this — the itch to disengage before a risky play is the habit paying off.",
  },
  {
    id: "u-fight-presence",
    role: "universal",
    kind: "strength",
    category: "decision",
    phase: "any",
    label: "Strong fight presence",
    test: (m) => m.killParticipation >= 0.6,
    cause: "You show up for the fights and objectives that decide games.",
    why: "Being present for the map's key moments is how leads convert into wins.",
    practice: "Keep grouping on time — protect this habit while cleaning up your leaks.",
    recognize: "You're already rotating well; keep pairing it with clean positioning.",
  },
  {
    id: "u-objective-control",
    role: "universal",
    kind: "strength",
    category: "objective",
    phase: "any",
    label: "Strong objective control",
    test: (m) => objectivesOf(m) >= 3,
    cause: "You reliably show up for dragons and barons.",
    why: "Objectives are the fastest way to turn a lead into a closed-out game.",
    practice: "Keep setting up early — this is a real climbing strength.",
    recognize: "You already path to objectives on time; keep it up.",
  },
];

// ---------------------------------------------------------------------------
// ADC habits — BotDiff's flagship role, fully populated.
// ---------------------------------------------------------------------------
const ADC: HabitDefinition[] = [
  {
    id: "adc-lose-lane",
    role: "adc",
    kind: "weakness",
    category: "lane",
    phase: "early",
    label: "Losing the laning phase",
    test: (m) => m.earlyGoldExpAdvantage <= -450 || m.maxCsAdvantage <= -10,
    cause: "You take trades you can't win or get caught last-hitting under pressure.",
    why: "Falling behind early makes every trade, recall and skirmish harder — the whole game becomes uphill.",
    practice: "Only trade when the enemy's key spell is down, and freeze the wave when you can't win the trade.",
    recognize: "If you're the one walking up to CS while low, you're about to lose the trade — back off and freeze.",
  },
  {
    id: "adc-greedy-recall",
    role: "adc",
    kind: "weakness",
    category: "wave",
    phase: "early",
    label: "Greedy recalls / staying too long",
    test: (m) => m.csPerMin < 7 && m.deaths >= 4,
    cause: "You stay for 'one more wave' instead of recalling on the crash, and get collapsed on.",
    why: "Late recalls lose CS, delay item spikes, and hand over free kills when the enemy rotates.",
    practice: "Recall the instant a wave crashes into the enemy tower — no extra wave, no greed.",
    recognize: "If your wave just crashed and you're still on the map with no reason, that's the greedy recall.",
  },
  {
    id: "adc-stay-after-trade",
    role: "adc",
    kind: "weakness",
    category: "lane",
    phase: "early",
    label: "Winning trades but not translating them",
    test: (m) => m.earlyGoldExpAdvantage >= 200 && m.csPerMin < 7,
    cause: "You win the trade then keep skirmishing instead of crashing the wave and recalling for an item.",
    why: "A won trade is only worth it if you convert it into CS, a recall, or plates — otherwise you just took chip damage for nothing.",
    practice: "After winning a trade, crash the wave and recall on the crash to spike your item first.",
    recognize: "You're ahead on HP but standing in lane doing nothing — that's a wasted trade window.",
  },
  {
    id: "adc-fight-without-spike",
    role: "adc",
    kind: "weakness",
    category: "teamfight",
    phase: "mid",
    label: "Fighting without item spikes",
    test: (m) => m.damageShare < 0.22 && m.deaths >= 5,
    cause: "You commit to fights before completing the item that makes you a threat.",
    why: "As an ADC you're weak until your first two items — fighting early means you deal little and die fast.",
    practice: "Avoid fights until your first mythic/two-item spike; farm safely to get there faster.",
    recognize: "If a fight breaks out and you're one item down, disengage and keep farming.",
  },
  {
    id: "adc-weak-midgame-farm",
    role: "adc",
    kind: "weakness",
    category: "farming",
    phase: "mid",
    label: "Weak mid-game farming",
    test: (m) => m.csPerMin < 6.8,
    cause: "Your CS flatlines after laning because you stop catching side waves.",
    why: "CS is gold and gold is your damage. A flat gold curve after 15 minutes means you fall out of relevance.",
    practice: "Catch side waves between objectives — never let a wave crash into your tower uncollected.",
    recognize: "If minutes pass with no CS gained and no objective happening, you're missing free gold.",
  },
  {
    id: "adc-low-vision",
    role: "adc",
    kind: "weakness",
    category: "vision",
    phase: "mid",
    label: "Weak vision control",
    test: (m) => m.visionPerMin < 0.5 && m.controlWardsPlaced < 1,
    cause: "You skip control wards and don't clear vision before fights.",
    why: "Without vision, fights start on the enemy's terms and you get caught out of position.",
    practice: "Buy a control ward every recall and drop it near the next objective before you take a fight.",
    recognize: "If you're walking into the river with no ward, you're playing blind.",
  },
  {
    id: "adc-win-lane",
    role: "adc",
    kind: "strength",
    category: "lane",
    phase: "early",
    label: "Excellent lane trading",
    test: (m) => m.earlyGoldExpAdvantage >= 400 || m.maxCsAdvantage >= 12,
    cause: "You pick clean trade windows and punish enemy mistakes.",
    why: "Early leads give you a head start on items and lane priority — the strongest snowball in the game.",
    practice: "Keep it up, and start converting these leads into plates and the first drake.",
    recognize: "You already feel the trade windows; now pair them with faster recalls.",
  },
  {
    id: "adc-carry-damage",
    role: "adc",
    kind: "strength",
    category: "teamfight",
    phase: "late",
    label: "High carry damage",
    test: (m) => m.damageShare >= 0.3,
    cause: "You keep auto-attacking through fights and pick safe targets.",
    why: "Sustained ADC damage is what actually wins teamfights and closes games.",
    practice: "Keep it up — protect this by staying alive longer in each fight.",
    recognize: "You already output damage; the next step is doing it without dying.",
  },
  {
    id: "adc-clean-cs",
    role: "adc",
    kind: "strength",
    category: "farming",
    phase: "any",
    label: "Reliable farming",
    test: (m) => m.csPerMin >= 8,
    cause: "You never let waves go uncollected.",
    why: "Steady CS keeps you ahead on item spikes regardless of how lane goes.",
    practice: "Keep it up — this is a real, rank-agnostic strength.",
    recognize: "You already farm well; now protect it by not dropping CS after 15 minutes.",
  },
];

// ---------------------------------------------------------------------------
// Other roles — architecture placeholders so the engine can already reason
// about them. Populated over future sprints; the engine never changes.
// ---------------------------------------------------------------------------
const JUNGLE: HabitDefinition[] = [
  {
    id: "jgl-late-objectives",
    role: "jungle",
    kind: "weakness",
    category: "objective",
    phase: "mid",
    label: "Late objective setups",
    test: (m) => objectivesOf(m) <= 1 && m.durationMin >= 20,
    cause: "You path reactively instead of setting up objectives with vision and lane priority.",
    why: "The jungler's job is tempo around objectives — losing them loses the map.",
    practice: "Path so your camps finish near objective spawns, and ward the pit 45s early.",
    recognize: "If you're farming a camp when the objective spawns, you set up too late.",
  },
];

const TOP: HabitDefinition[] = [
  {
    id: "top-no-map-impact",
    role: "top",
    kind: "weakness",
    category: "decision",
    phase: "mid",
    label: "Wins lane but never influences the map",
    test: (m) => m.earlyGoldExpAdvantage >= 300 && m.killParticipation < 0.45,
    cause: "You keep farming your lead instead of using Teleport or a push to affect other lanes.",
    why: "A lead that never leaves top lane doesn't win the game — impact does.",
    practice: "After crashing your wave, look to TP or rotate to the nearest objective.",
    recognize: "If you're ahead but your team is fighting without you, your lead is stranded.",
  },
];

const MID: HabitDefinition[] = [
  {
    id: "mid-missed-roams",
    role: "mid",
    kind: "weakness",
    category: "decision",
    phase: "mid",
    label: "Missing roam timers",
    test: (m) => m.killParticipation < 0.5,
    cause: "You stay in lane through your push instead of roaming when the wave lets you.",
    why: "Mid's short lane means roams win side lanes and objectives — missing them wastes your position.",
    practice: "When you shove the wave, roam to the nearest fight or ward the objective.",
    recognize: "If your wave is crashing and you're standing in mid, that's a missed roam.",
  },
];

const SUPPORT: HabitDefinition[] = [
  {
    id: "sup-late-roam",
    role: "support",
    kind: "weakness",
    category: "decision",
    phase: "mid",
    label: "Roaming and vision too late",
    test: (m) => m.visionPerMin < 0.8 || m.killParticipation < 0.5,
    cause: "You stay bot lane instead of roaming and prepping vision for the next objective.",
    why: "Support impact comes from map presence and vision — late means the objective is already contested blind.",
    practice: "Leave lane on the recall and set up objective vision 60s before it spawns.",
    recognize: "If the objective is up and you're just arriving, you prepped it too late.",
  },
];

const ROLE_DEFS: Record<RoleId, HabitDefinition[]> = {
  adc: ADC,
  jungle: JUNGLE,
  top: TOP,
  mid: MID,
  support: SUPPORT,
};

/** Universal + role-specific habit definitions for a role. */
export function getHabitDefinitions(role: RoleId): HabitDefinition[] {
  return [...UNIVERSAL, ...ROLE_DEFS[role]];
}

/** The dominant role across a set of games (what to coach for). */
export function dominantRole(inputs: MatchAnalysisInput[]): RoleId {
  const counts = new Map<RoleId, number>();
  for (const m of inputs) {
    const r = normalizeRole(m.role);
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  let best: RoleId = "adc";
  let bestN = -1;
  for (const [r, n] of counts) {
    if (n > bestN) {
      best = r;
      bestN = n;
    }
  }
  return best;
}