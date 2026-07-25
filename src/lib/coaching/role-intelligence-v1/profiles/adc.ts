import type { RoleProfile } from "../types";

export const ADC_PROFILE: RoleProfile = {
  id: "adc",
  label: "ADC",
  primaryResponsibilities: [
    "Scale safely to item spikes",
    "Deliver sustained damage in every teamfight",
    "Farm every reachable wave",
  ],
  secondaryResponsibilities: [
    "Set up dragon vision with support",
    "Sidelane on 3-item lead to create map pressure",
    "Communicate reset timings with support",
  ],
  teamfightResponsibilities: [
    "Position one screen behind the frontline",
    "Focus the closest reachable target",
    "Save summoners for post-engage",
  ],
  lateGameResponsibilities: [
    "Anchor pit fights from the safest angle",
    "Deal damage every fight without stepping into engage",
    "Sidelane with a vision-setting escort after 3 items",
  ],
  sideLaneResponsibilities: [
    "Push sides only with vision and a peel partner",
    "Recall the instant a fight starts elsewhere",
    "Never die 1v1 in a side lane",
  ],
  primaryWinConditions: [
    "Hit item spikes on time",
    "Deal sustained damage from a safe position",
  ],
  secondaryWinConditions: [
    "Convert 3-item lead into map pressure",
    "Trade dragons for lane pressure when scaling",
  ],
  primaryResource: "Gold from CS and item spikes",
  secondaryResource: "Support's engage / peel windows",
  goldPriority: [
    "CS from bot lane",
    "Plates on won lane windows",
    "Dragon and sidelane gold in mid game",
  ],
  experiencePriority: [
    "Bot lane XP shared with support",
    "Avoid XP starvation from side lane deaths",
  ],
  wavePriority: [
    "CS over trades pre-6",
    "Prio before dragon spawns",
    "Slow-push into recall windows",
  ],
  tempoPhilosophy: [
    "Tempo revolves around item completion and damage uptime",
    "Every recall should bank an item component",
    "Never fight a phase behind on items",
  ],
  positioningPhilosophy: [
    "Stand one screen behind your frontline",
    "Only step up once enemy engage is on cooldown",
    "Kite away from the closest threat, not toward more damage",
  ],
  powerSpikePhilosophy: [
    "Rush the core item that unlocks your damage curve",
    "Group at 2 items, sidelane at 3",
  ],
  recallPhilosophy: [
    "Recall on wave crash, never on greed",
    "Bank enough for a component every reset",
    "Reset with support so lane is never 1v2",
  ],
  roamPhilosophy: [
    "ADCs rarely roam — trade sides instead",
    "Only leave lane if wave is safe and objective is imminent",
  ],
  economyPhilosophy: [
    "Gold-in = damage-out — waves are literal damage",
    "Do not overspend on situational items before your core",
  ],
  objectiveResponsibilities: [
    "Provide damage at dragon and baron",
    "Trade objectives for pressure when unable to contest",
  ],
  visionResponsibilities: [
    "Ward dragon pit with support 60s early",
    "Ward bot river before pushing in",
  ],
  mapResponsibilities: [
    "Rotate with tempo, not with the timer",
    "Sidelane opposite side of team pressure after items",
  ],
  consistencyPriorities: [
    "CS/min above 7 across the match",
    "Never drop damage share below your role average",
    "Deaths under 4 in a normal game",
  ],
  recoveryPriorities: [
    "When behind: farm safely, wait two items, then re-enter fights",
    "Freeze lane and cross-map trade if lane is unwinnable",
  ],
  practicePriorities: [
    "Recall timing with a component in hand",
    "Kiting patterns in teamfights",
    "Reading engage cooldowns before stepping up",
  ],
  decisionPriorities: [
    { tier: "high", decision: "Stay alive", fundamental: "positioning" },
    { tier: "high", decision: "Farm efficiently", fundamental: "economy" },
    { tier: "high", decision: "Fight on item spikes", fundamental: "power-spikes" },
    { tier: "medium", decision: "Position for peel", fundamental: "positioning" },
    { tier: "medium", decision: "Recall for components", fundamental: "tempo" },
    { tier: "low", decision: "Sidelane push after items", fundamental: "map-movement" },
  ],
  habitLibrary: [
    { kind: "mistake", label: "Greedy recalls", fundamental: "tempo" },
    { kind: "mistake", label: "Poor positioning in fights", fundamental: "positioning" },
    { kind: "mistake", label: "Late item spikes", fundamental: "power-spikes" },
    { kind: "mistake", label: "Missed farm mid game", fundamental: "economy" },
    { kind: "mistake", label: "Unsafe side lanes", fundamental: "map-movement" },
    { kind: "strength", label: "Clean CS through mid game", fundamental: "economy" },
    { kind: "strength", label: "Damage share from safety", fundamental: "positioning" },
  ],
  practiceLibrary: [
    { label: "Recall the instant wave crashes", fundamental: "tempo", measurable: "Zero recalls with a wave alive next to you" },
    { label: "One screen back at fight start", fundamental: "positioning", measurable: "Not first name in the kill feed for 5 games" },
    { label: "Never drop below 7 CS/min", fundamental: "economy", measurable: "CS/min ≥ 7 at 20 minutes" },
    { label: "Item component every recall", fundamental: "power-spikes", measurable: "No recall under 1100g after level 6" },
  ],
  fundamentalExpression: [
    { fundamental: "tempo", philosophy: "Tempo revolves around item completion and damage uptime.", example: "Crash bot at 1300g for a component spike." },
    { fundamental: "economy", philosophy: "Every wave is literal damage output.", example: "Cross-map for a side wave when a fight is over." },
    { fundamental: "positioning", philosophy: "Damage from safety — one screen behind the frontline.", example: "Kite away from the diver, not toward the enemy team." },
    { fundamental: "power-spikes", philosophy: "Fight around your item spikes, never before them.", example: "Group only after your first core item." },
    { fundamental: "vision", philosophy: "Vision around dragon and your recall path.", example: "Ward pit 60s before dragon with support." },
    { fundamental: "objective-control", philosophy: "Damage in the pit with peel around you.", example: "Fight dragon behind frontline at 2 items." },
    { fundamental: "map-movement", philosophy: "Move with tempo, not with the timer.", example: "Rotate mid the moment your wave crashes." },
    { fundamental: "wave-management", philosophy: "Match your support's plan every wave.", example: "Freeze while support roams to ward." },
    { fundamental: "decision-making", philosophy: "Every decision protects your scaling.", example: "Skip a risky fight to secure a full wave." },
    { fundamental: "consistency", philosophy: "Reliable damage across every game.", example: "CS/min and damage share stay stable win or lose." },
    { fundamental: "trading", philosophy: "Trade only with a support engage or on cooldowns.", example: "All-in on Leona E only after her Q is down." },
    { fundamental: "resource-management", philosophy: "HP and mana feed CS, not risky trades.", example: "Back off low mana before contesting a wave." },
    { fundamental: "champion-identity", philosophy: "Play your class's fight range, not the flashy one.", example: "Play Jinx as long-range DPS, not a diver." },
    { fundamental: "win-conditions", philosophy: "Scale, then convert.", example: "Force fights only once your core damage curve is online." },
  ],
  source: "curated",
};
