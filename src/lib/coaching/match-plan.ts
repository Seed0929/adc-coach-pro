// ---------------------------------------------------------------------------
// BotDiff Match Coaching + Build & Matchup Plan (Parts 7 & 8)
//
// Turns ONE match (MatchAnalysisInput) into a complete, human coaching review:
// phase-by-phase breakdown, a mistake timeline, the turning point, the win
// condition, and a full build + game plan grounded in the actual champions in
// that game. Every recommendation cites real data from the match — never
// generic filler.
//
// PURE + client-safe. Consumed by the match report; later fed to OpenAI as-is.
// ---------------------------------------------------------------------------
import type { MatchAnalysisInput } from "../coaching-engine";
import { buildFor, tagsFor, threatProfile, type ThreatProfile } from "./champion-knowledge";

export interface PhaseReview {
  phase: string;
  verdict: "good" | "mixed" | "bad";
  headline: string;
  detail: string;
}

export interface TimelineMistake {
  when: string;
  what: string;
  fix: string;
}

export interface PlanItem {
  label: string;
  value: string;
  why: string;
}

export interface GamePlan {
  matchupSummary: string;
  enemyThreats: string;
  runes: PlanItem;
  startItem: PlanItem;
  coreBuild: PlanItem;
  situational: PlanItem;
  boots: PlanItem;
  summonerSpells: PlanItem;
  laneStrategy: PlanItem;
  tradingPattern: PlanItem;
  waveStrategy: PlanItem;
  recallTiming: PlanItem;
  midGame: PlanItem;
  teamfightRole: PlanItem;
  splitVsGroup: PlanItem;
}

export interface MatchPlan {
  phases: PhaseReview[];
  mistakeTimeline: TimelineMistake[];
  turningPoint: string;
  winCondition: string;
  practiceGoal: string;
  gamePlan: GamePlan;
}

const one = (n: number) => n.toFixed(1);
const pct = (n: number) => `${Math.round(n * 100)}%`;
const objectivesOf = (m: MatchAnalysisInput) =>
  m.dragonTakedowns + m.baronTakedowns + m.riftHeraldTakedowns;

// --- phase reviews ---------------------------------------------------------

function earlyReview(m: MatchAnalysisInput): PhaseReview {
  const ahead = m.earlyGoldExpAdvantage >= 250;
  const behind = m.earlyGoldExpAdvantage <= -250;
  return {
    phase: "Early Game",
    verdict: ahead ? "good" : behind ? "bad" : "mixed",
    headline: ahead
      ? "You won the opening exchanges"
      : behind
        ? "You fell behind in the first minutes"
        : "The early game was roughly even",
    detail: ahead
      ? `You came out of the first minutes ahead by about ${Math.round(m.earlyGoldExpAdvantage)} gold/xp. That early priority is exactly what lets your team contest the first drake — make sure you cashed it in.`
      : behind
        ? `You were down roughly ${Math.abs(Math.round(m.earlyGoldExpAdvantage))} gold/xp early. Falling behind here means every later trade starts from a deficit. Track the enemy jungler and respect level-2/3 all-ins.`
        : `Neither side ran away with the opening. From an even start, the first drake and first recall decide who gets ahead — win those small moments.`,
  };
}

function laneReview(m: MatchAnalysisInput): PhaseReview {
  const csLead = m.maxCsAdvantage;
  const good = csLead >= 8 || m.laneMinions10 >= 75;
  const bad = csLead <= -8 || (m.laneMinions10 > 0 && m.laneMinions10 < 60);
  return {
    phase: "Lane Review",
    verdict: good ? "good" : bad ? "bad" : "mixed",
    headline: good ? "Strong laning phase" : bad ? "Lane was a struggle" : "Serviceable lane",
    detail: `You had ${m.laneMinions10 > 0 ? `${Math.round(m.laneMinions10)} CS at 10 minutes` : "an average CS start"} and a max CS lead of ${Math.round(csLead)} over your opponent. ${
      good
        ? "You out-farmed and out-traded your lane — keep converting that into recall advantages and roams."
        : bad
          ? "You lost the CS race. Prioritise last-hitting under tower and only contest the wave when your trade is guaranteed to win."
          : "It was close. The tiebreaker is who backs on the wave crash with more gold — plan your recalls around wave state."
    }`,
  };
}

function waveReview(m: MatchAnalysisInput): PhaseReview {
  const overstaying = m.csPerMin < 7 && m.deaths >= 4;
  return {
    phase: "Wave Review",
    verdict: overstaying ? "bad" : m.csPerMin >= 8 ? "good" : "mixed",
    headline: overstaying
      ? "Wave management cost you tempo"
      : m.csPerMin >= 8
        ? "Clean wave management"
        : "Wave management was okay",
    detail: overstaying
      ? `Your ${one(m.csPerMin)} CS/min with ${m.deaths} deaths is the classic overstaying pattern — pushing an extra wave instead of recalling on the crash. Crash the wave, then reset; don't hover for one more caster.`
      : m.csPerMin >= 8
        ? `${one(m.csPerMin)} CS/min means you're catching side waves between objectives. That's the habit that keeps your gold curve climbing after 15 minutes.`
        : `${one(m.csPerMin)} CS/min is fine but not the ceiling. Free CS is sitting in side lanes while you group — pick it up between resets.`,
  };
}

function recallReview(m: MatchAnalysisInput): PhaseReview {
  const clean = m.earlyGoldExpAdvantage >= 0 && m.deaths <= 3;
  return {
    phase: "First Recall Review",
    verdict: clean ? "good" : "mixed",
    headline: clean ? "You controlled your first back" : "Your first back timing can improve",
    detail: clean
      ? "Your early numbers suggest you backed with a gold advantage and no death — that's the ideal: crash the wave, recall, come back with an item lead."
      : "Aim to recall on a wave crash with enough gold for a component + control ward, and use your health/mana reset to re-enter lane even or ahead rather than backing on low HP mid-wave.",
  };
}

function buildReviewPhase(m: MatchAnalysisInput): PhaseReview {
  const b = buildFor(m.champion);
  return {
    phase: "Build Review",
    verdict: "mixed",
    headline: `${m.champion} wants a ${b.archetype} build`,
    detail: `On ${m.champion} the reliable path is ${b.startItem} into ${b.core.slice(0, 2).join(" → ")}. ${b.playstyle} Check that your item order matched the game's needs — see the Build & Game Plan below for the matchup-specific tweaks.`,
  };
}

function objectiveReview(m: MatchAnalysisInput): PhaseReview {
  const objs = objectivesOf(m);
  const good = objs >= 3;
  const bad = objs <= 1 && m.durationMin >= 22;
  return {
    phase: "Objective Review",
    verdict: good ? "good" : bad ? "bad" : "mixed",
    headline: good ? "Present for objectives" : bad ? "Missing at objectives" : "Average objective play",
    detail: `You were in on ${objs} major objective${objs === 1 ? "" : "s"} (dragons/barons/herald). ${
      good
        ? "Objective presence is how leads become wins — keep pathing to the pit early."
        : bad
          ? "You were absent for most objectives. Start moving toward the pit 45–60 seconds before it spawns, even if it means giving up a side wave."
          : "Solid, but the games you win are the ones where you're set up before the objective spawns, not arriving as it starts."
    }`,
  };
}

function midReview(m: MatchAnalysisInput): PhaseReview {
  const good = m.killParticipation >= 0.55;
  return {
    phase: "Mid Game Review",
    verdict: good ? "good" : m.killParticipation < 0.45 ? "bad" : "mixed",
    headline: good ? "You were part of the mid-game map" : "You drifted out of the mid game",
    detail: `Your kill participation was ${pct(m.killParticipation)}. ${
      good
        ? "You grouped for the fights and picks that decide the mid game — keep pairing that with side-wave management."
        : "Too much of the mid game happened without you. After you crash a wave, rotate to where the next play is instead of farming a fourth wave alone."
    }`,
  };
}

function lateReview(m: MatchAnalysisInput): PhaseReview {
  const scaled = m.durationMin >= 30;
  return {
    phase: "Late Game Review",
    verdict: m.damageShare >= 0.28 ? "good" : "mixed",
    headline: scaled ? "This went to the late game" : "Game ended before full scaling",
    detail: scaled
      ? `As the ADC you're the primary damage source late — you dealt ${pct(m.damageShare)} of your team's damage. In 5v5s, never take the first fight; let the enemy commit, then clean up from the back.`
      : `The game ended around ${Math.round(m.durationMin)} minutes, so scaling never fully mattered. Your ${pct(m.damageShare)} damage share is what you brought — earlier games reward tempo over scaling.`,
  };
}

function teamfightReview(m: MatchAnalysisInput): PhaseReview {
  const diesEarly = m.deaths >= 6 && m.damageShare < 0.26;
  return {
    phase: "Teamfight Review",
    verdict: diesEarly ? "bad" : m.damageShare >= 0.3 ? "good" : "mixed",
    headline: diesEarly ? "You died before dealing damage" : m.damageShare >= 0.3 ? "You carried fights" : "Fine in fights",
    detail: diesEarly
      ? `${m.deaths} deaths with only ${pct(m.damageShare)} damage share means you were dying before your damage mattered. Stand one screen behind your frontline and only step up once the enemy's engage is used.`
      : m.damageShare >= 0.3
        ? `${pct(m.damageShare)} damage share — you positioned well and kept attacking through the fight. That's carry-level output.`
        : `${pct(m.damageShare)} damage share is okay. The extra damage comes from staying alive longer, not from bigger risks — keep auto-attacking the closest safe target.`,
  };
}

function buildPhases(m: MatchAnalysisInput): PhaseReview[] {
  return [
    earlyReview(m),
    laneReview(m),
    waveReview(m),
    recallReview(m),
    buildReviewPhase(m),
    objectiveReview(m),
    midReview(m),
    lateReview(m),
    teamfightReview(m),
  ];
}

// --- mistake timeline ------------------------------------------------------

function buildTimeline(m: MatchAnalysisInput): TimelineMistake[] {
  const out: TimelineMistake[] = [];
  if (m.earlyGoldExpAdvantage <= -250) {
    out.push({
      when: "Laning phase (0–10 min)",
      what: `Ended the early laning phase down ~${Math.abs(Math.round(m.earlyGoldExpAdvantage))} gold/xp.`,
      fix: "Play the level-1/2 timers safer and only trade when the enemy's key spell is down.",
    });
  }
  if (m.laneMinions10 > 0 && m.laneMinions10 < 60) {
    out.push({
      when: "~10 minutes",
      what: `Only ${Math.round(m.laneMinions10)} CS by 10 minutes.`,
      fix: "Focus on last-hitting mechanics — aim for 8 CS/min (80 by 10 min).",
    });
  }
  if (m.csPerMin < 7 && m.deaths >= 4) {
    out.push({
      when: "Mid game",
      what: "Low CS with repeated deaths — the overstaying-instead-of-recalling pattern.",
      fix: "Recall the moment a wave crashes into tower instead of forcing one more wave.",
    });
  }
  if (m.killParticipation < 0.45) {
    out.push({
      when: "Objective windows",
      what: `Kill participation only ${pct(m.killParticipation)} — the team fought without you.`,
      fix: "Rotate to the next objective after every wave crash rather than farming alone.",
    });
  }
  if (m.deaths >= 6) {
    out.push({
      when: "Teamfights",
      what: `${m.deaths} deaths — too many for a carry role.`,
      fix: "Position behind your frontline and hold your step-up until the enemy engage is spent.",
    });
  }
  if (objectivesOf(m) <= 1 && m.durationMin >= 22) {
    out.push({
      when: "Dragon/Baron spawns",
      what: "Absent for almost every major objective.",
      fix: "Path toward the pit 45–60s before spawn so you arrive with priority.",
    });
  }
  if (out.length === 0) {
    out.push({
      when: "Whole game",
      what: "No single glaring mistake — this was a clean, disciplined game.",
      fix: "Bank this as your template and try to replicate these decisions next game.",
    });
  }
  return out;
}

function turningPointOf(m: MatchAnalysisInput): string {
  if (m.win) {
    if (m.earlyGoldExpAdvantage >= 250)
      return "You turned an early lane lead into objective control — the win started in the first 10 minutes and you protected it.";
    if (m.damageShare >= 0.3)
      return "The game swung in the mid/late teamfights where your damage output took over. You scaled into the carry and closed it out.";
    return "This was decided by objectives and discipline rather than one big moment — you kept making the safer play and it compounded.";
  }
  if (m.deaths >= 6)
    return "The game slipped away in the fights where you died early. Each of those deaths handed the enemy tempo they used for the next objective.";
  if (m.earlyGoldExpAdvantage <= -250)
    return "The loss traces back to the laning phase — falling behind early meant you were on the back foot for every fight afterward.";
  return "There wasn't one collapse; the enemy just accumulated small objective leads. Winning the neutral objectives is what flips games like this.";
}

function winConditionOf(m: MatchAnalysisInput): string {
  const b = buildFor(m.champion);
  if (b.archetype === "lethality")
    return `As ${m.champion} your win condition is tempo: use your poke/early pressure to take towers and objectives before the enemy scales past you.`;
  if (b.archetype === "onhit")
    return `As ${m.champion} your win condition is the extended fight — get peel, reach two items, and shred the enemy frontline in prolonged 5v5s.`;
  return `As ${m.champion} your win condition is scaling into a positioned crit carry — survive lane, hit your two-item spike, and deal damage from the back of every fight.`;
}

// --- build & matchup plan --------------------------------------------------

function threatSummary(p: ThreatProfile): string {
  if (p.known === 0) return "The enemy champions aren't in my knowledge base for this game, so I'm giving the safe default plan for your champion.";
  const parts: string[] = [];
  if (p.dive >= 2) parts.push(`${p.dive} dive/assassin threats on you`);
  if (p.ap >= 3) parts.push("AP-heavy damage");
  else if (p.ad >= 4) parts.push("mostly AD damage");
  if (p.cc >= 3) parts.push("a lot of hard CC");
  if (p.poke >= 2) parts.push("strong poke");
  if (p.tank >= 2) parts.push(`${p.tank} tanks to shred`);
  if (p.engage >= 2) parts.push("hard engage");
  return parts.length ? `Enemy comp brings ${parts.join(", ")}.` : "The enemy comp is fairly balanced with no single dominant threat.";
}

function buildGamePlan(m: MatchAnalysisInput): GamePlan {
  const b = buildFor(m.champion);
  const enemies = m.enemies ?? [];
  const allies = m.allies ?? [];
  const threat = threatProfile(enemies);
  const opp = m.laneOpponent ?? null;
  const oppTags = opp ? tagsFor(opp) : [];

  const apHeavy = threat.ap >= 3;
  const diveHeavy = threat.dive >= 2;
  const ccHeavy = threat.cc >= 3;
  const tankHeavy = threat.tank >= 2;
  const pokeLane = oppTags.includes("poke") || oppTags.includes("ad") === false && oppTags.includes("ap");

  // Boots
  const boots: PlanItem = apHeavy || ccHeavy
    ? { label: "Boots", value: "Mercury's Treads", why: `The enemy has ${apHeavy ? "heavy AP" : ""}${apHeavy && ccHeavy ? " and " : ""}${ccHeavy ? "a lot of CC" : ""} — tenacity + magic resist keeps you out of chain-CC.` }
    : { label: "Boots", value: "Berserker's Greaves", why: "No dominant AP/CC threat, so attack speed is the highest-value boot for your damage." };

  // Situational defensive items
  const situationalBits: string[] = [];
  if (apHeavy) situationalBits.push("Maw of Malmortius (AP shield + MR)");
  if (diveHeavy) situationalBits.push("Guardian Angel (survive the first dive)");
  if (tankHeavy) situationalBits.push("Lord Dominik's Regards (% armor pen vs tanks)");
  if (!apHeavy && !diveHeavy && !tankHeavy) situationalBits.push("Bloodthirster (lifesteal + shield for sustained fights)");
  const situational: PlanItem = {
    label: "Situational Items",
    value: situationalBits.join(", "),
    why: diveHeavy
      ? "They can reach you — a survivability item buys the seconds you need to keep attacking."
      : tankHeavy
        ? "Armor stacking on their side means raw crit isn't enough; you need penetration."
        : "Round the build out for the damage profile you're actually facing.",
  };

  // Summoner spells
  const spells: PlanItem = diveHeavy || ccHeavy
    ? { label: "Summoner Spells", value: "Flash + Heal (consider Cleanse vs point-and-click CC)", why: "Against dive and heavy CC, a defensive summoner can be the difference between escaping and dying — Cleanse if they have suppress/stun-lock." }
    : { label: "Summoner Spells", value: "Flash + Heal", why: "Standard bot-lane pairing; Heal is the strongest 2v2 and teamfight tempo tool." };

  // Lane strategy vs opponent
  const laneStrategy: PlanItem = opp
    ? {
        label: "Lane Strategy (levels 1–3)",
        value: oppTags.includes("poke") || pokeLane
          ? "Respect the poke: soak XP from range, dodge skillshots, and look for the trade only after they miss."
          : oppTags.includes("dive") || oppTags.includes("assassin")
            ? "Play for level 2 first, but hold summoners — they want an all-in, so bait it and punish the cooldowns."
            : "Contest CS evenly and look to win short trades when their key ability is down.",
        why: `Your lane opponent is ${opp}${oppTags.length ? ` (${oppTags.join(", ")})` : ""}, so this is the safest way to come out of lane even or ahead.`,
      }
    : {
        label: "Lane Strategy (levels 1–3)",
        value: "Hit level 2 first if you can, trade on your spike, and set up a wave crash for your first recall.",
        why: "No lane-opponent data for this game — this is the fundamentals-first plan for your champion.",
      };

  const tradingPattern: PlanItem = {
    label: "Trading Pattern",
    value: b.archetype === "crit" || b.archetype === "onhit"
      ? "Auto-attack windows: step up, land 2–3 autos when their engage/poke is on cooldown, then reset spacing."
      : "Poke-and-retreat: chunk with your ability, then back out before they can answer.",
    why: `${m.champion} deals its damage through ${b.archetype === "crit" || b.archetype === "onhit" ? "sustained autos, so you want short auto-trades" : "ability windows, so trade in bursts and disengage"}.`,
  };

  const waveStrategy: PlanItem = {
    label: "Wave Strategy",
    value: opp && (oppTags.includes("dive") || oppTags.includes("assassin"))
      ? "Freeze near your tower when even — deny the all-in and make them overextend to you."
      : "Push for the level-2/6 spike and recall on the crash; slow-push before you want to roam or take an objective.",
    why: opp && (oppTags.includes("dive") || oppTags.includes("assassin"))
      ? "Against a diving lane, controlling the wave near tower removes their kill pressure."
      : "Matching wave state to your power spikes turns CS into recall and objective advantages.",
  };

  const recallTiming: PlanItem = {
    label: "Recall Timing",
    value: "Back on a wave crash with enough for a component + control ward, not on low HP mid-wave.",
    why: m.deaths >= 4
      ? `You died ${m.deaths} times this game — a chunk of that is backing at bad times. Recall on the crash so you don't lose CS or get caught walking back.`
      : "Timing backs to wave state keeps your item spikes ahead and denies the enemy free plates.",
  };

  const midGame: PlanItem = {
    label: "Mid-Game Plan",
    value: threat.poke >= 2
      ? "Play around vision and picks — a poke comp wants to siege, so don't face-check; catch someone out first."
      : "Group with your support after the first drake, take mid tower, and use the lane priority to set up objectives.",
    why: threat.poke >= 2
      ? "Poke comps beat you in a straight siege, so you need a pick or a flank angle to start fights."
      : "Once laning ends, your ADC value is grouping for objectives with vision, not farming a solo side lane.",
  };

  const frontlineAllies = allies.filter((a) => tagsFor(a).includes("tank") || tagsFor(a).includes("engage")).length;
  const teamfightRole: PlanItem = {
    label: "Teamfight Role",
    value: frontlineAllies >= 1
      ? "Stay behind your frontline, attack the closest safe target, and let your engage go in first."
      : "No hard frontline — play very reactive: never step up first, kite backward, and only commit once the enemy over-extends.",
    why: frontlineAllies >= 1
      ? `You have ${frontlineAllies} engage/tank ally to peel and create space, so your job is uninterrupted damage from the back.`
      : "Without a frontline you can't take aggressive angles — patience and spacing are your only protection.",
  };

  const splitVsGroup: PlanItem = {
    label: "Split vs Group",
    value: "Group",
    why: `As an immobile-ish carry ${m.champion} wants to teamfight with the team; only take a safe side wave when the map allows, then rotate back before objectives.`,
  };

  return {
    matchupSummary: opp
      ? `You played ${m.champion} into ${opp}${enemies.length ? ` on an enemy team of ${enemies.join(", ")}` : ""}.`
      : `You played ${m.champion}${enemies.length ? ` against ${enemies.join(", ")}` : ""}.`,
    enemyThreats: threatSummary(threat),
    runes: {
      label: "Rune Page",
      value: `${b.keystone} (${b.primaryTree}) + ${b.secondaryTree}`,
      why: `${b.keystone} is the reliable keystone for ${m.champion}'s ${b.archetype} pattern${apHeavy ? "; take Resolve/Second Wind secondary if the AP poke is brutal" : ""}.`,
    },
    startItem: {
      label: "Starting Item",
      value: b.startItem,
      why: opp && oppTags.includes("poke")
        ? "Against poke, Doran's Blade's sustain keeps you healthy through the early harass."
        : "Standard strong 2v2 start that gives damage, HP and sustain.",
    },
    coreBuild: {
      label: "Core Build Order",
      value: b.core.join(" → "),
      why: `${b.playstyle} Build toward your two-item spike, then adapt with the situational items below.`,
    },
    situational,
    boots,
    summonerSpells: spells,
    laneStrategy,
    tradingPattern,
    waveStrategy,
    recallTiming,
    midGame,
    teamfightRole,
    splitVsGroup,
  };
}

function practiceGoalOf(m: MatchAnalysisInput): string {
  if (m.deaths >= 6) return "Next game: keep your deaths under 5 and never be the first one to die in a fight.";
  if (m.csPerMin < 7) return `Next game: beat ${one(m.csPerMin + 1)} CS/min by catching side waves between objectives.`;
  if (m.killParticipation < 0.5) return "Next game: hold kill participation above 60% by rotating to objectives after wave crashes.";
  if (objectivesOf(m) <= 1) return "Next game: be alive and in position for the first two dragons.";
  return `Next game: replicate this game's discipline and push your damage share past ${pct(Math.min(0.35, m.damageShare + 0.03))}.`;
}

export function buildMatchPlan(m: MatchAnalysisInput): MatchPlan {
  return {
    phases: buildPhases(m),
    mistakeTimeline: buildTimeline(m),
    turningPoint: turningPointOf(m),
    winCondition: winConditionOf(m),
    practiceGoal: practiceGoalOf(m),
    gamePlan: buildGamePlan(m),
  };
}
