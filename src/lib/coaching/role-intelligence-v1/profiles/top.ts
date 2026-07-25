import type { RoleProfile } from "../types";

export const TOP_PROFILE: RoleProfile = {
  id: "top",
  label: "Top",
  primaryResponsibilities: [
    "Win or stabilize the solo lane",
    "Use Teleport for map-swinging plays",
    "Create side-lane pressure across the match",
  ],
  secondaryResponsibilities: [
    "Front-line or flank in fights based on champion class",
    "Ward river before pushing in",
    "Trade side for objective side when needed",
  ],
  teamfightResponsibilities: [
    "Front-line for carries",
    "Flank onto the backline with Teleport",
    "Peel a diver off the ADC if class allows",
  ],
  lateGameResponsibilities: [
    "Hold a side lane away from team fights",
    "Teleport flank onto backline or Baron",
    "Absorb pressure to free objectives for the team",
  ],
  sideLaneResponsibilities: [
    "Push waves in when 4 enemies are elsewhere",
    "Recall on wave crash, not on a kill",
    "Never die 1v1 without vision on the river",
  ],
  primaryWinConditions: [
    "Win the side lane every wave you are alone",
    "Save Teleport for a map-swinging play",
  ],
  secondaryWinConditions: [
    "Solo-kill lane once ahead",
    "Push in and free your jungler bot side",
  ],
  primaryResource: "Solo XP and wave state",
  secondaryResource: "Teleport uptime",
  goldPriority: [
    "CS in solo lane",
    "Plates when lane priority is won",
    "Sidelane gold after mid game",
  ],
  experiencePriority: [
    "Solo XP is non-negotiable",
    "Never soak two waves under tower without a plan",
  ],
  wavePriority: [
    "Wave control over CS numbers",
    "Freeze when losing, slow-push into recall when winning",
  ],
  tempoPhilosophy: [
    "Tempo revolves around side-lane pressure and wave manipulation",
    "Reset before side lane pressure returns",
  ],
  positioningPhilosophy: [
    "Play the fight your champion class enables — engage, peel or flank",
    "Never step into 2v1 without vision",
  ],
  powerSpikePhilosophy: [
    "Trade tempo for first-item spike",
    "Delay group timings until side is safe",
  ],
  recallPhilosophy: [
    "Recall on crash, not on kill",
    "Reset with Teleport up if an objective is 60s away",
  ],
  roamPhilosophy: [
    "Teleport, not walk-roams",
    "Save cross-map trades for objective windows",
  ],
  economyPhilosophy: [
    "Every side wave uncollected is a lost item component",
    "Do not fight without your first-item spike",
  ],
  objectiveResponsibilities: [
    "Grubs and Herald in early game",
    "Baron pressure in late game via side lane",
  ],
  visionResponsibilities: [
    "River wards for Teleport and jungle tracking",
    "Ward before pushing in past river",
  ],
  mapResponsibilities: [
    "Cross-map with Teleport",
    "Threaten side while team takes objectives",
  ],
  consistencyPriorities: [
    "CS/min above 7 through mid game",
    "Deaths under 4 in a normal game",
  ],
  recoveryPriorities: [
    "When behind: freeze, farm safely, wait for TP swing",
    "Do not force fights without cross-map value",
  ],
  practicePriorities: [
    "Reading wave state before every trade",
    "Teleport timing on objective windows",
    "Recognizing dive threats before they set up",
  ],
  decisionPriorities: [
    { tier: "high", decision: "Do not die in side lane", fundamental: "positioning" },
    { tier: "high", decision: "Save TP for map impact", fundamental: "map-movement" },
    { tier: "high", decision: "Control the wave", fundamental: "wave-management" },
    { tier: "medium", decision: "Trade side for objective side", fundamental: "objective-control" },
    { tier: "medium", decision: "Complete first item on tempo", fundamental: "power-spikes" },
    { tier: "low", decision: "Solo-kill lane", fundamental: "trading" },
  ],
  habitLibrary: [
    { kind: "mistake", label: "Overstaying with low HP", fundamental: "resource-management" },
    { kind: "mistake", label: "Wasting Teleport", fundamental: "map-movement" },
    { kind: "mistake", label: "Losing wave on recall", fundamental: "wave-management" },
    { kind: "mistake", label: "Grouping too early", fundamental: "map-movement" },
    { kind: "strength", label: "TP saved for objectives", fundamental: "map-movement" },
    { kind: "strength", label: "Crash then recall discipline", fundamental: "tempo" },
  ],
  practiceLibrary: [
    { label: "Recall on wave crash every time", fundamental: "tempo", measurable: "Zero recalls with a bounced wave alive" },
    { label: "Ward river before pushing past it", fundamental: "vision", measurable: "Every deep push preceded by a river ward" },
    { label: "TP into an objective, not a lane", fundamental: "map-movement", measurable: "80% of TPs land on an objective or fight" },
    { label: "Freeze when down 10+ CS", fundamental: "wave-management", measurable: "No pushed waves while behind in CS" },
  ],
  fundamentalExpression: [
    { fundamental: "tempo", philosophy: "Tempo revolves around side lane pressure and wave manipulation.", example: "Crash side, TP back on the next wave." },
    { fundamental: "wave-management", philosophy: "Freeze to survive; slow-push to leverage a dive.", example: "Freeze at tower down 20 CS to reset the matchup." },
    { fundamental: "map-movement", philosophy: "Impact the map with Teleport, not with walk-roams.", example: "TP bot for a 3v2 dragon fight." },
    { fundamental: "objective-control", philosophy: "Trade side for objective side.", example: "Push top on dragon spawn to trade if lost." },
    { fundamental: "positioning", philosophy: "Play the fight your champion class enables.", example: "Ornn front-lines; Camille flanks — not the other way around." },
    { fundamental: "power-spikes", philosophy: "Trade tempo for first-item spike, then look for map impact.", example: "Recall on 1300g to complete a component." },
    { fundamental: "trading", philosophy: "Trade in level and cooldown windows only.", example: "All-in on level 2 with a stacked wave." },
    { fundamental: "vision", philosophy: "River wards for TP routes and jungle tracking.", example: "Ward top river before pushing past it." },
    { fundamental: "economy", philosophy: "Every side wave uncollected is a lost item component.", example: "Push a side wave in before joining the group." },
    { fundamental: "decision-making", philosophy: "Every decision reads wave, TP, and jungler position.", example: "Do not step up unless TP is available." },
    { fundamental: "consistency", philosophy: "Reliable side lane pressure every game.", example: "CS/min stays above 7 whether ahead or behind." },
    { fundamental: "resource-management", philosophy: "HP and TP are your true resources.", example: "Never all-in at 40% HP unless summs are up." },
    { fundamental: "champion-identity", philosophy: "Class dictates fight range and teamfight role.", example: "Play tanks as frontline, bruisers as flank or side threat." },
    { fundamental: "win-conditions", philosophy: "Convert lane priority into map pressure and side pressure.", example: "Push top so team can 5v4 baron." },
  ],
  source: "curated",
};
