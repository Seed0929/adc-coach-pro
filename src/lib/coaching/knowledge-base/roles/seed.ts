// ---------------------------------------------------------------------------
// Seed Role Templates. Curated placeholders — Data Dragon / Riot API will
// enrich these later. Keep facts only; no player evaluation.
// ---------------------------------------------------------------------------
import { emptyRoleTemplate, type RoleTemplate } from "../templates/role";
import type { RoleId } from "../templates/champion";

function seed(id: RoleId, label: string, patch: Partial<RoleTemplate>): RoleTemplate {
  return { ...emptyRoleTemplate(id, label), ...patch };
}

export const TOP_ROLE: RoleTemplate = seed("top", "Top", {
  coreResponsibilities: ["Win / stabilize a solo lane", "Create side-lane pressure", "Flank or front-line in fights"],
  resourcePriorities: ["Solo XP", "Wave state", "Teleport timing"],
  objectivePriorities: ["Grubs", "Herald", "Baron"],
  tempoExpectations: ["Freeze when losing", "Slow-push into recall", "Match jungler side"],
  laneResponsibilities: ["Trade in windows", "Manage wave for dive safety"],
  mapResponsibilities: ["Cross-map with Teleport", "Threaten side while team takes objectives"],
  commonHabits: ["Overstaying with low HP", "Wasting Teleport", "Losing wave on recall"],
  commonDecisionCategories: ["wave", "teleport", "trade", "sidelane"],
  successConditions: ["Win side lane", "Convert TP into map advantage", "Front-line fights on cooldown"],
  failureConditions: ["Die pre-6 without trade", "TP down during objective", "Isolated deaths in side"],
  winConditionFramework: ["Convert lane priority into map pressure", "Trade side lane for team objective"],
});

export const JUNGLE_ROLE: RoleTemplate = seed("jungle", "Jungle", {
  coreResponsibilities: ["Path efficiently", "Set up objectives", "Track enemy jungler"],
  resourcePriorities: ["Camp respawn timers", "Scuttle crab", "Objective spawns"],
  objectivePriorities: ["Scuttle", "Grubs", "Dragon", "Herald", "Baron"],
  tempoExpectations: ["Full clear vs skirmish path", "Reset before objectives", "Match enemy path"],
  laneResponsibilities: ["Gank winning lanes", "Counter-gank losing lanes"],
  mapResponsibilities: ["Vision around objectives", "Track and mirror enemy jungler"],
  commonHabits: ["Ganking losing lanes without setup", "Ignoring scuttle", "Bad pathing vs enemy"],
  commonDecisionCategories: ["path", "gank", "objective", "vision"],
  successConditions: ["Secure objectives with prio", "Punish enemy jungler pathing"],
  failureConditions: ["Objective taken uncontested", "Repeated failed ganks"],
  winConditionFramework: ["Trade neutrals for tempo", "Fight only with prio + vision"],
});

export const MID_ROLE: RoleTemplate = seed("mid", "Mid", {
  coreResponsibilities: ["Control mid priority", "Roam or match roams", "Set up objectives"],
  resourcePriorities: ["Solo XP", "Wave push", "Roam windows"],
  objectivePriorities: ["Prio for scuttle/dragon", "Herald/Baron setup"],
  tempoExpectations: ["Shove before roaming", "Match enemy roam", "Reset with wave crashed"],
  laneResponsibilities: ["Wave prio", "Trade windows", "Punish greedy positioning"],
  mapResponsibilities: ["Roam bot on prio", "Ward river approaches"],
  commonHabits: ["Roaming without prio", "Missing waves", "Failing to match roams"],
  commonDecisionCategories: ["prio", "roam", "wave", "vision"],
  successConditions: ["Win prio into objectives", "Impact side lanes with roams"],
  failureConditions: ["Lose prio + objective", "Die roaming into shove"],
  winConditionFramework: ["Convert prio into map presence", "Force fights with tempo"],
});

export const ADC_ROLE: RoleTemplate = seed("adc", "ADC", {
  coreResponsibilities: ["Farm safely", "Deal sustained damage", "Position around peel"],
  resourcePriorities: ["CS", "Item spikes", "Sidelane after items"],
  objectivePriorities: ["Dragon", "Baron", "Sidelane after 3-item"],
  tempoExpectations: ["Recall after wave crash", "Group at 2 items", "Sidelane at 3 items"],
  laneResponsibilities: ["Wave management", "Recall timing with support"],
  mapResponsibilities: ["Vision around dragon", "Rotate with tempo"],
  commonHabits: ["Greedy recalls", "Over-farming while team fights", "Poor positioning at objectives"],
  commonDecisionCategories: ["wave", "recall", "positioning", "objective"],
  successConditions: ["Hit item spikes on time", "Deal team-carrying damage"],
  failureConditions: ["Fall behind two items", "Die before dealing damage"],
  winConditionFramework: ["Scale to items", "Fight only with peel + vision"],
});

export const SUPPORT_ROLE: RoleTemplate = seed("support", "Support", {
  coreResponsibilities: ["Enable the ADC", "Own vision", "Set up objectives"],
  resourcePriorities: ["Support quest", "Control wards", "Roam windows"],
  objectivePriorities: ["Dragon vision", "Herald setup", "Baron vision"],
  tempoExpectations: ["Roam on wave push", "Reset with ADC", "Rotate with tempo"],
  laneResponsibilities: ["Trade windows", "Peel or engage", "Ward on wave state"],
  mapResponsibilities: ["Deep vision on lead", "Deny vision on losing side"],
  commonHabits: ["Weak vision score", "Roaming into shove", "Missing engages"],
  commonDecisionCategories: ["vision", "roam", "engage", "peel"],
  successConditions: ["Vision score keeps team informed", "Engages land on primary target"],
  failureConditions: ["No control wards on objective", "Lane 2v1 without engage"],
  winConditionFramework: ["Convert vision into safe objectives", "Enable ADC to scale"],
});

export const ROLE_TEMPLATES: Record<RoleId, RoleTemplate> = {
  top: TOP_ROLE,
  jungle: JUNGLE_ROLE,
  mid: MID_ROLE,
  adc: ADC_ROLE,
  support: SUPPORT_ROLE,
};