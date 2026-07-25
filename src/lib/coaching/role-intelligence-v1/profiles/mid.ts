import type { RoleProfile } from "../types";

export const MID_PROFILE: RoleProfile = {
  id: "mid",
  label: "Mid",
  primaryResponsibilities: [
    "Own mid priority",
    "Match enemy roams",
    "Set up objective vision from mid",
  ],
  secondaryResponsibilities: [
    "Roam on push windows",
    "Deliver primary damage or catch tool in fights",
    "Ward river approaches before pushing in",
  ],
  teamfightResponsibilities: [
    "Deliver burst on primary target",
    "Follow up on engage",
    "Provide catch tool for picks",
  ],
  lateGameResponsibilities: [
    "Waveclear and prio",
    "Pick threats around vision",
    "Follow-up engage with primary damage",
  ],
  sideLaneResponsibilities: [
    "Rarely — only when a mid tower is down and prio is safe",
  ],
  primaryWinConditions: [
    "Have mid prio at every objective spawn",
    "Convert prio into a roam or vision play",
  ],
  secondaryWinConditions: [
    "Solo-kill mid into a Herald swing",
    "Roam bot on a shove for a 3v2",
  ],
  primaryResource: "Wave priority",
  secondaryResource: "Roam windows",
  goldPriority: [
    "Mid CS with prio",
    "Roam gold from picks",
    "Objective participation gold",
  ],
  experiencePriority: [
    "Solo XP through laning phase",
    "Do not miss two waves for a failed roam",
  ],
  wavePriority: [
    "Shove first, then act on prio",
    "Push mid to bounce, then roam bot",
  ],
  tempoPhilosophy: [
    "Tempo revolves around wave priority and map influence",
    "Reset before roam windows, not after them",
  ],
  positioningPhilosophy: [
    "Damage from a flank angle, not from behind ADC",
    "Stand where your kill threat forces respect",
  ],
  powerSpikePhilosophy: [
    "Level 6 opens roam windows",
    "Item-1 defines skirmish tempo",
  ],
  recallPhilosophy: [
    "Recall before a planned roam",
    "Reset with mid crashed into tower",
  ],
  roamPhilosophy: [
    "Only roam with prio and vision",
    "Every roam should either ward, trade, or take a pick",
  ],
  economyPhilosophy: [
    "Do not miss waves for roams that lose more than they gain",
    "Prio is worth more than a single wave of CS",
  ],
  objectiveResponsibilities: [
    "Prio for scuttle and dragon",
    "Herald and baron setup",
  ],
  visionResponsibilities: [
    "River wards to enable roams",
    "Ward mid river before rotating bot",
  ],
  mapResponsibilities: [
    "Roam bot on prio",
    "Match enemy roams turn for turn",
  ],
  consistencyPriorities: [
    "CS/min above 7 through mid game",
    "Kill participation above 55% every match",
  ],
  recoveryPriorities: [
    "When behind: waveclear, pick around vision, avoid duels",
    "Do not force roams into shoved waves",
  ],
  practicePriorities: [
    "Reading roam timers on wave state",
    "Warding river before pushing in",
    "Matching enemy mid's roam window",
  ],
  decisionPriorities: [
    { tier: "high", decision: "Own mid prio", fundamental: "wave-management" },
    { tier: "high", decision: "Match enemy roams", fundamental: "map-movement" },
    { tier: "high", decision: "Roam on prio", fundamental: "tempo" },
    { tier: "medium", decision: "Set up objective vision", fundamental: "vision" },
    { tier: "medium", decision: "Trade on cooldown windows", fundamental: "trading" },
    { tier: "low", decision: "Sidelane with mid tower down", fundamental: "map-movement" },
  ],
  habitLibrary: [
    { kind: "mistake", label: "Roaming without prio", fundamental: "map-movement" },
    { kind: "mistake", label: "Missing waves", fundamental: "economy" },
    { kind: "mistake", label: "Failing to match roams", fundamental: "map-movement" },
    { kind: "mistake", label: "Die roaming into shove", fundamental: "decision-making" },
    { kind: "strength", label: "Shove before roaming", fundamental: "tempo" },
    { kind: "strength", label: "Match roams turn for turn", fundamental: "map-movement" },
  ],
  practiceLibrary: [
    { label: "Shove before every roam", fundamental: "tempo", measurable: "Zero roams with an unshoved wave" },
    { label: "Ward river before pushing", fundamental: "vision", measurable: "Every deep push preceded by a river ward" },
    { label: "Match every enemy mid roam", fundamental: "map-movement", measurable: "Enemy mid roams answered within 10 seconds" },
    { label: "Keep CS/min above 7", fundamental: "economy", measurable: "CS/min ≥ 7 at 20 minutes" },
  ],
  fundamentalExpression: [
    { fundamental: "tempo", philosophy: "Tempo revolves around wave priority and map influence.", example: "Shove mid, recall, roam bot with prio." },
    { fundamental: "wave-management", philosophy: "Shove first, then act on prio.", example: "Push mid to bounce, then roam bot." },
    { fundamental: "map-movement", philosophy: "Roam on prio, never on hope.", example: "Roam bot only with mid crashed." },
    { fundamental: "vision", philosophy: "River wards to enable roams and match them.", example: "Ward mid river before rotating bot." },
    { fundamental: "objective-control", philosophy: "Bring prio to the objective.", example: "Shove mid then rotate to dragon with prio." },
    { fundamental: "positioning", philosophy: "Damage from a flank angle, respected by kill threat.", example: "Hold a flank on Ahri instead of standing behind ADC." },
    { fundamental: "power-spikes", philosophy: "Level 6 defines your roam windows; item-1 defines your skirmish tempo.", example: "Recall right after hitting 6 to roam bot." },
    { fundamental: "trading", philosophy: "Punish greedy positioning in lane on cooldowns.", example: "Punish an enemy Q-cd with your own combo." },
    { fundamental: "economy", philosophy: "Prio is worth more than a wave; miss CS only when the trade is worth it.", example: "Give a wave to answer a roam." },
    { fundamental: "decision-making", philosophy: "Every decision reads wave, prio, and enemy mid.", example: "Do not roam with an enemy jungler tracked mid-side." },
    { fundamental: "consistency", philosophy: "Reliable prio and kill participation across games.", example: "KP and CS/min stay stable regardless of matchup." },
    { fundamental: "resource-management", philosophy: "Mana funds pressure — do not run out before a shove.", example: "Recall low mana before an objective spawn." },
    { fundamental: "champion-identity", philosophy: "Play your class fight — burst, control, or pick.", example: "Play burst mages as primary damage, controls as catch tool." },
    { fundamental: "win-conditions", philosophy: "Convert prio into map presence and picks.", example: "Force fights with tempo advantage from mid." },
  ],
  source: "curated",
};
