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
  source: KnowledgeSource;
}

const F = (
  id: LeagueFundamentalId,
  label: string,
  summary: string,
  coreConcepts: string[],
): LeagueFundamental => ({ id, label, summary, coreConcepts, source: "curated" });

export const LEAGUE_FUNDAMENTALS: Record<LeagueFundamentalId, LeagueFundamental> = {
  "wave-management": F(
    "wave-management",
    "Wave Management",
    "Controlling minion waves to dictate lane position, recall timing, and dive safety.",
    ["Freeze", "Slow push", "Crash", "Reset with wave crashed", "Bounce"],
  ),
  tempo: F(
    "tempo",
    "Tempo",
    "The advantage in time — being ahead on levels, items, or map position when it matters.",
    ["Prio into objective", "Reset windows", "Cooldown timing", "Item spike timing"],
  ),
  economy: F(
    "economy",
    "Economy",
    "Gold and XP efficiency: CS, kills, plates, objectives, support quest.",
    ["CS/min", "Gold diff", "Plates", "Support quest", "Shutdown gold"],
  ),
  vision: F(
    "vision",
    "Vision",
    "Wards and vision denial that let you fight and rotate on your terms.",
    ["Control wards", "Deep vision on lead", "Deny vision on losing side", "Sweeper"],
  ),
  "objective-control": F(
    "objective-control",
    "Objective Control",
    "Setting up and contesting neutral objectives before they spawn.",
    ["Dragon", "Herald", "Baron", "Grubs", "Setup 45–60s early"],
  ),
  positioning: F(
    "positioning",
    "Positioning",
    "Where you stand relative to threats, cooldowns, vision, and your team.",
    ["Range respect", "Peel line", "Flank angle", "Frontline distance"],
  ),
  trading: F(
    "trading",
    "Trading",
    "Winning short exchanges by matching cooldowns, range, and wave state.",
    ["Cooldown windows", "Auto weave", "Level-up powerspike", "Trade + crash"],
  ),
  "map-movement": F(
    "map-movement",
    "Map Movement",
    "Rotations, roams, TP usage — moving where the map's decision is happening.",
    ["Rotate on prio", "TP flank", "Match roams", "Sidelane after items"],
  ),
  "resource-management": F(
    "resource-management",
    "Resource Management",
    "Mana, health, summoners, ultimates — spending resources for correct returns.",
    ["Summoner tracking", "Ult windows", "Mana for wave vs skirmish"],
  ),
  "power-spikes": F(
    "power-spikes",
    "Power Spikes",
    "Recognizing and exploiting the moments your champion is strongest.",
    ["Level 2 / 6", "First component", "Two-item spike", "Full build"],
  ),
  "champion-identity": F(
    "champion-identity",
    "Champion Identity",
    "Playing to your champion's archetype, damage profile, and role in the team.",
    ["Scaling carry", "Lane bully", "Skirmisher", "Enchanter", "Engage tank"],
  ),
  "win-conditions": F(
    "win-conditions",
    "Win Conditions",
    "The specific path this composition wins through — and how to enable it.",
    ["Scale to items", "End before 25", "1-3-1 sidelane", "Pick comp"],
  ),
  "decision-making": F(
    "decision-making",
    "Decision Making",
    "Choosing the correct action given wave, tempo, vision, cooldowns, and map state.",
    ["Cause → effect", "Right thing at the right time", "Threat assessment"],
  ),
  consistency: F(
    "consistency",
    "Consistency",
    "Repeating good decisions across games — the habit layer above mechanics.",
    ["Recall discipline", "Vision every back", "Objective timers", "Deaths under 4"],
  ),
};

export const ALL_FUNDAMENTALS: LeagueFundamental[] = Object.values(LEAGUE_FUNDAMENTALS);

export function getFundamental(id: LeagueFundamentalId): LeagueFundamental {
  return LEAGUE_FUNDAMENTALS[id];
}

export function isFundamentalId(id: string): id is LeagueFundamentalId {
  return id in LEAGUE_FUNDAMENTALS;
}