import type { RoleProfile } from "../types";

export const SUPPORT_PROFILE: RoleProfile = {
  id: "support",
  label: "Support",
  primaryResponsibilities: [
    "Own the vision map end to end",
    "Enable the ADC's scaling",
    "Set up neutral objectives 60s early",
  ],
  secondaryResponsibilities: [
    "Roam mid on push windows",
    "Sweep enemy vision before every objective",
    "Convert vision denial into picks",
  ],
  teamfightResponsibilities: [
    "Engage or peel based on champion class",
    "Save the primary carry with utility first",
    "Sweep pit before pit fights",
  ],
  lateGameResponsibilities: [
    "Live to place wards",
    "Peel the primary carry every fight",
    "Sweep enemy vision at pits",
  ],
  sideLaneResponsibilities: [
    "Rarely — only to escort a sidelane push with vision",
    "Ward the flank before joining side pressure",
  ],
  primaryWinConditions: [
    "Own the vision map at every objective",
    "Enable the ADC to hit item spikes safely",
  ],
  secondaryWinConditions: [
    "Roam mid on push for a pick",
    "Convert a vision denial into an objective",
  ],
  primaryResource: "Vision (wards + sweeper uptime)",
  secondaryResource: "Support quest and control ward gold",
  goldPriority: [
    "Support quest completion",
    "Control wards every reset",
    "First support item component",
  ],
  experiencePriority: [
    "Share bot lane XP without starving the ADC",
    "Do not soak two waves of XP away from the ADC",
  ],
  wavePriority: [
    "Wave state serves vision, not CS",
    "Slow-push to enable a roam or ward window",
  ],
  tempoPhilosophy: [
    "Tempo revolves around vision setup, lane pressure and roam timing",
    "Reset around ward and control-ward windows",
  ],
  positioningPhilosophy: [
    "Stand where your ability threatens the enemy carry",
    "Never stand where you cannot ward or peel",
  ],
  powerSpikePhilosophy: [
    "Support quest completion is your item-1",
    "Prioritize vision items over combat stats",
  ],
  recallPhilosophy: [
    "Recall when a Control Ward is affordable",
    "Reset with the ADC after a wave crash",
  ],
  roamPhilosophy: [
    "Only roam on a shove with vision on the return path",
    "Every roam should ward or trade tempo, not just search for a kill",
  ],
  economyPhilosophy: [
    "Gold funds vision and utility, not personal damage",
    "Do not compete with the ADC for CS",
  ],
  objectiveResponsibilities: [
    "Own dragon and baron vision windows",
    "Bring the engage or peel tool into the pit",
  ],
  visionResponsibilities: [
    "Full vision on the next objective 60s early",
    "Deep vision on lead, defensive vision behind",
    "Sweep enemy vision before every fight",
  ],
  mapResponsibilities: [
    "Rotate with the ADC every reset",
    "Ward flanks before your team pushes in",
  ],
  consistencyPriorities: [
    "Vision score/min above role baseline every game",
    "Control ward uptime through the match",
  ],
  recoveryPriorities: [
    "When behind: play for vision denial instead of engages",
    "Prioritize surviving to ward over risky trades",
  ],
  practicePriorities: [
    "Ward timings around objective spawns",
    "Engage cooldowns before starting fights",
    "Roam windows tied to wave state",
  ],
  decisionPriorities: [
    { tier: "high", decision: "Control vision", fundamental: "vision" },
    { tier: "high", decision: "Enable carries", fundamental: "win-conditions" },
    { tier: "high", decision: "Roam efficiently", fundamental: "map-movement" },
    { tier: "high", decision: "Protect objectives", fundamental: "objective-control" },
    { tier: "medium", decision: "Engage on cooldowns", fundamental: "trading" },
    { tier: "low", decision: "Sidelane escort", fundamental: "map-movement" },
  ],
  habitLibrary: [
    { kind: "mistake", label: "Late wards", fundamental: "vision" },
    { kind: "mistake", label: "Poor roams", fundamental: "map-movement" },
    { kind: "mistake", label: "Overforcing fights", fundamental: "decision-making" },
    { kind: "mistake", label: "Vision neglect", fundamental: "vision" },
    { kind: "mistake", label: "Objective setup mistakes", fundamental: "objective-control" },
    { kind: "strength", label: "Vision score above baseline", fundamental: "vision" },
    { kind: "strength", label: "Engages that land on primary target", fundamental: "trading" },
  ],
  practiceLibrary: [
    { label: "Ward objective 60s before spawn", fundamental: "vision", measurable: "Every dragon/baron warded before it appears" },
    { label: "Buy a Control Ward every reset", fundamental: "economy", measurable: "Zero resets without a control ward" },
    { label: "Only engage on primary target", fundamental: "trading", measurable: "Engage lands on carry ≥ 80% of the time" },
    { label: "Roam only on shove", fundamental: "map-movement", measurable: "No roams with a slow-pushed enemy wave" },
  ],
  fundamentalExpression: [
    { fundamental: "tempo", philosophy: "Tempo revolves around vision setup, lane pressure and roam timing.", example: "Recall for Control Ward before Dragon spawn." },
    { fundamental: "vision", philosophy: "Owns the vision map end-to-end.", example: "Sweep enemy vision before every objective." },
    { fundamental: "objective-control", philosophy: "Own the vision + engage tool at every pit.", example: "Sweep pit and engage or peel based on champion." },
    { fundamental: "wave-management", philosophy: "Set wave state around vision needs.", example: "Slow-push to leave lane and ward Dragon." },
    { fundamental: "map-movement", philosophy: "Roam on shove windows, never blindly.", example: "Leave lane after a slow-push to ward mid river." },
    { fundamental: "trading", philosophy: "Trade on ADC's cooldowns and your own engage tools.", example: "Engage only when the ADC has a wave and a cooldown." },
    { fundamental: "positioning", philosophy: "Stand where you can ward, peel, or engage — never in dead space.", example: "Hold a flank angle at pit rather than stacking on ADC." },
    { fundamental: "power-spikes", philosophy: "Support item is your spike, not damage components.", example: "Complete support item before combat stats." },
    { fundamental: "economy", philosophy: "Gold funds vision and utility, not personal damage.", example: "Skip a damage component to buy sweeper and control wards." },
    { fundamental: "decision-making", philosophy: "Every decision reads wave, vision, and cooldowns together.", example: "Do not engage without your carry's summoners up." },
    { fundamental: "consistency", philosophy: "Reliable vision and engage timing every game.", example: "Vision score/min stays stable win or lose." },
    { fundamental: "champion-identity", philosophy: "Play the fight your champion class enables.", example: "Play Braum as peel, Leona as engage — not the other way around." },
    { fundamental: "resource-management", philosophy: "Mana and cooldowns are the currency for engages.", example: "Never engage low mana with no follow-up." },
    { fundamental: "win-conditions", philosophy: "Enable the carry, own vision, close through objectives.", example: "Give up a sidelane to secure baron vision." },
  ],
  source: "curated",
};
