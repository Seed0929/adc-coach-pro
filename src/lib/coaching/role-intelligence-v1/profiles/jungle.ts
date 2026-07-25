import type { RoleProfile } from "../types";

export const JUNGLE_PROFILE: RoleProfile = {
  id: "jungle",
  label: "Jungle",
  primaryResponsibilities: [
    "Set up neutral objectives",
    "Path efficiently around lane states",
    "Track the enemy jungler every clear",
  ],
  secondaryResponsibilities: [
    "Gank winning lanes for tempo",
    "Counter-gank losing lanes",
    "Deep vision when ahead, defensive vision when behind",
  ],
  teamfightResponsibilities: [
    "Peel or engage based on comp",
    "Anchor pit fights with smite",
    "Bring vision into the fight",
  ],
  lateGameResponsibilities: [
    "Baron control and vision",
    "Peel or engage in pit fights",
    "Trade neutrals for tempo",
  ],
  sideLaneResponsibilities: [
    "Support the side-lane pusher with vision",
    "Counter-jungle when the opposite lane is shoved",
  ],
  primaryWinConditions: [
    "Win the objective on your side of the map every spawn",
    "Path to where you have lane priority",
  ],
  secondaryWinConditions: [
    "Convert a successful gank into an objective",
    "Invade with numbers when the enemy jungler is tracked away",
  ],
  primaryResource: "Camp respawns and objective timers",
  secondaryResource: "Lane priority from teammates",
  goldPriority: [
    "Full clears when tempo is even",
    "Scuttle crab priority",
    "Camps near active objectives",
  ],
  experiencePriority: [
    "Reach level 6 without missing camps",
    "Match the enemy jungler's level curve",
  ],
  wavePriority: [
    "Manipulate side lanes through ganks and counter-ganks",
    "Gank a pushed lane to reset wave state",
  ],
  tempoPhilosophy: [
    "Tempo revolves around efficient pathing and objective timing",
    "Reset around objective timers, not personal HP",
  ],
  positioningPhilosophy: [
    "Be on the objective side 45s before spawn",
    "Never fight without vision in the pit",
  ],
  powerSpikePhilosophy: [
    "Item-2 skirmish spike opens fight windows",
    "Level 6 unlocks first serious objective attempts",
  ],
  recallPhilosophy: [
    "Reset before objective spawns",
    "Recall after a successful gank with inventory",
  ],
  roamPhilosophy: [
    "Gank for tempo, not kills",
    "Never gank a losing lane without setup",
  ],
  economyPhilosophy: [
    "Camps are your CS — do not skip camps for a failed gank",
    "Trade a gank for an objective, not a kill for a camp",
  ],
  objectiveResponsibilities: [
    "Scuttle, Grubs, Dragon, Herald, Baron in order of spawn",
    "Vision around every pit 60s early",
  ],
  visionResponsibilities: [
    "Deep vision on lead, defensive vision when behind",
    "Track enemy jungler's start every game",
  ],
  mapResponsibilities: [
    "Path so camps finish near objective spawns",
    "Mirror the enemy jungler's side when even",
  ],
  consistencyPriorities: [
    "Objective participation above role baseline",
    "No missed scuttle spawns you had priority for",
  ],
  recoveryPriorities: [
    "When behind: farm safe camps, trade for objectives",
    "Do not force ganks into losing lanes when behind",
  ],
  practicePriorities: [
    "Objective setup timing",
    "Tracking enemy jungler starts",
    "Pathing to lane priority, not to kills",
  ],
  decisionPriorities: [
    { tier: "high", decision: "Set up objective", fundamental: "objective-control" },
    { tier: "high", decision: "Path with priority", fundamental: "map-movement" },
    { tier: "high", decision: "Track enemy jungler", fundamental: "vision" },
    { tier: "medium", decision: "Gank winning lanes", fundamental: "tempo" },
    { tier: "medium", decision: "Counter-jungle on lead", fundamental: "economy" },
    { tier: "low", decision: "Deep invade for kills", fundamental: "decision-making" },
  ],
  habitLibrary: [
    { kind: "mistake", label: "Ganking losing lanes without setup", fundamental: "map-movement" },
    { kind: "mistake", label: "Ignoring scuttle priority", fundamental: "objective-control" },
    { kind: "mistake", label: "Bad pathing vs enemy", fundamental: "map-movement" },
    { kind: "mistake", label: "Farming through objective timer", fundamental: "objective-control" },
    { kind: "strength", label: "Reset before objectives", fundamental: "tempo" },
    { kind: "strength", label: "Vision on pit 60s early", fundamental: "vision" },
  ],
  practiceLibrary: [
    { label: "Ward pit 60s before objective", fundamental: "vision", measurable: "Every dragon/baron warded before spawn" },
    { label: "Track enemy start every game", fundamental: "vision", measurable: "Ping enemy start within 20s of level 1" },
    { label: "Path to prio, not kills", fundamental: "map-movement", measurable: "80% of ganks land on lanes with priority" },
    { label: "Never miss scuttle you own", fundamental: "objective-control", measurable: "Contested scuttle win rate above 60%" },
  ],
  fundamentalExpression: [
    { fundamental: "tempo", philosophy: "Tempo revolves around efficient pathing and objective timing.", example: "Full-clear and reset 45s before Dragon." },
    { fundamental: "objective-control", philosophy: "Anchor and secure with smite and vision.", example: "Path to Dragon side with vision and smite ready." },
    { fundamental: "vision", philosophy: "Deep vision on lead, defensive vision behind.", example: "Ward enemy blue when ahead." },
    { fundamental: "map-movement", philosophy: "Path where lane priority lives.", example: "Mirror the enemy jungler's side when priority is even." },
    { fundamental: "wave-management", philosophy: "Manipulate side lanes via ganks and counter-ganks.", example: "Gank a pushed lane to reset wave state." },
    { fundamental: "trading", philosophy: "Trade neutrals for tempo instead of raw fights.", example: "Give a losing pit for the objective across the map." },
    { fundamental: "power-spikes", philosophy: "Fight when your skirmish spike is online.", example: "Force objectives after item-2 spike." },
    { fundamental: "positioning", philosophy: "Anchor pit fights and threaten smite.", example: "Stand behind the wall to smite-steal Baron." },
    { fundamental: "economy", philosophy: "Camps are CS — do not skip them for failed ganks.", example: "Take the second camp before pathing to a losing lane." },
    { fundamental: "decision-making", philosophy: "Every decision reads objectives, prio, and enemy jungler.", example: "Skip a gank to secure Herald with prio." },
    { fundamental: "consistency", philosophy: "Reliable objective participation every game.", example: "Objective participation stays stable regardless of team form." },
    { fundamental: "resource-management", philosophy: "Manage HP, smite, and camps as one budget.", example: "Do not fight low HP with smite down." },
    { fundamental: "champion-identity", philosophy: "Play your class's fight — bruiser, farmer, or ganker.", example: "Farm junglers scale; gank junglers snowball early." },
    { fundamental: "win-conditions", philosophy: "Trade neutrals for tempo and vision.", example: "Trade for baron and vision instead of forcing 5v5." },
  ],
  source: "curated",
};
