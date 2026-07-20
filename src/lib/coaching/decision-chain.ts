// ---------------------------------------------------------------------------
// BotDiff Decision Chain + Replay Coach Foundation (Sprint 1.7, Parts 3–5)
//
// Stops treating coachable events as isolated statistics. Every important
// moment is modelled as a CHAIN:
//
//   Decision → Immediate consequence → Later consequence → Game outcome
//
// Each event also carries everything a FUTURE Replay Coach will need to anchor
// it onto an interactive timeline: an approximate game time, a category, an
// impact level, supporting evidence, a practice takeaway, and a replay anchor.
//
// IMPORTANT: this is architecture preparation only. We do NOT have per-event
// Riot timeline data yet, so timestamps are honest approximations derived from
// game phase, and every replay anchor is marked `anchorReady: false` until the
// Riot match timeline is connected in a later sprint. Nothing here fabricates a
// precise moment it cannot support.
//
// PURE + client-safe. Grounded entirely in real MatchAnalysisInput stats.
// ---------------------------------------------------------------------------
import type { MatchAnalysisInput } from "../coaching-engine";
import { championRoleLabel } from "./champion-intelligence";

export type ImpactLevel = "high" | "medium" | "low";

/** Player-friendly coaching categories (aligned with Sprint 1.7 language). */
export type EventCategory =
  | "Laning"
  | "Wave Management"
  | "Recall Timing"
  | "Vision Setup"
  | "Dragon & Baron Preparation"
  | "Objective Tempo"
  | "Teamfight Positioning";

export type GamePhase = "early" | "mid" | "late";

/**
 * League fundamental this coaching point teaches. Sprint 2.3 — every event is
 * tagged with one fundamental so habit tracking can group across matches.
 */
export type Fundamental =
  | "Wave Management"
  | "Tempo"
  | "Vision"
  | "Trading"
  | "Recall Timing"
  | "Objective Setup"
  | "Positioning"
  | "Power Spikes"
  | "Economy"
  | "Map Movement"
  | "Teamfighting"
  | "Spacing"
  | "Resource Management"
  | "Champion Identity";

/** Sprint 2.3 — a coaching event may celebrate a good decision, not only flag a bad one. */
export type EventTone = "negative" | "positive";

/**
 * Everything a future interactive Replay Coach needs to jump to this moment.
 * `anchorReady` stays false until the Riot match timeline is wired in — the UI
 * can render the moment now and light up "Jump to replay" later without any
 * change to the coaching engine.
 */
export interface ReplayAnchor {
  matchId: string;
  /** Best-effort game time in seconds; null when only a phase is known. */
  approxTimeSeconds: number | null;
  phase: GamePhase;
  /** True only once real timeline data can pinpoint the moment. */
  anchorReady: boolean;
}

/**
 * One coachable moment expressed as a decision chain, ready for the timeline
 * and the future Replay Coach.
 */
export interface CoachableEvent {
  id: string;
  /** Display game time, e.g. "08:20" or "~ Mid game". */
  gameTime: string;
  category: EventCategory;
  /** League fundamental this coaching point teaches (Sprint 2.3). */
  fundamental: Fundamental;
  /** Whether this event teaches a mistake or a good decision (Sprint 2.3). */
  tone: EventTone;
  decision: string;
  /** Why the decision was good/bad — the second of the four coaching questions. */
  why: string;
  /** Decision → immediate → later → outcome, each a short link. */
  chain: string[];
  outcome: string;
  impact: ImpactLevel;
  /** Real stat this moment is grounded in. */
  evidence: string;
  /** Expandable "Learn More" reasoning. */
  explanation: string;
  practiceTakeaway: string;
  replayAnchor: ReplayAnchor;
}

export interface MatchTimeline {
  events: CoachableEvent[];
  /** True while replay anchors are approximate (no Riot timeline yet). */
  anchorsApproximate: boolean;
}

// --- history-aware recurring-habit detection --------------------------------
// Each event has a detector-id. When the same detector fires across the
// player's recent history, the outcome line is rewritten to name it as a
// recurring habit ("This is becoming one of your recurring habits.") instead
// of a one-off mistake. Grounded entirely in real per-match stats.

type DetectorId =
  | "lane-cs-10"
  | "lane-early-deficit"
  | "wave-overstay"
  | "wave-side-neglect"
  | "wave-fight-first"
  | "vision-no-control"
  | "objective-absent"
  | "objective-recall-mismatch"
  | "teamfight-positioning"
  | "tempo-absent";

const DETECTORS: Record<DetectorId, (m: MatchAnalysisInput) => boolean> = {
  "lane-cs-10": (m) => m.laneMinions10 > 0 && m.laneMinions10 < 65,
  "lane-early-deficit": (m) => m.earlyGoldExpAdvantage <= -600,
  "wave-overstay": (m) => m.csPerMin < 7 && m.deaths >= 4,
  "wave-side-neglect": (m) => m.csPerMin < 6.5 && m.durationMin >= 22,
  "wave-fight-first": (m) => m.deaths >= 5 && m.csPerMin < 7.5,
  "vision-no-control": (m) => m.controlWardsPlaced < 1,
  "objective-absent": (m) =>
    m.dragonTakedowns + m.baronTakedowns + m.riftHeraldTakedowns <= 1 &&
    m.durationMin >= 22,
  "objective-recall-mismatch": (m) =>
    m.dragonTakedowns <= 1 && m.deaths >= 4 && m.durationMin >= 20,
  "teamfight-positioning": (m) =>
    m.deaths >= 6 || (m.deaths >= 4 && m.damageShare < 0.24),
  "tempo-absent": (m) => m.killParticipation < 0.45,
};

function recurrenceOf(id: DetectorId, history: MatchAnalysisInput[]): number {
  if (!history.length) return 0;
  const fn = DETECTORS[id];
  return history.filter(fn).length;
}

function habitTag(id: DetectorId, history: MatchAnalysisInput[]): string | null {
  const n = recurrenceOf(id, history);
  if (n >= 2) return `This is becoming one of your recurring habits — it also showed up in ${n} of your last ${history.length} games.`;
  if (n === 1) return `It also happened in 1 of your last ${history.length} games — worth watching before it becomes a habit.`;
  return null;
}

function withHabit(ev: CoachableEvent, history: MatchAnalysisInput[]): CoachableEvent {
  const tag = habitTag(ev.id as DetectorId, history);
  if (!tag) return ev;
  return { ...ev, outcome: `${ev.outcome} ${tag}` };
}

// --- helpers ---------------------------------------------------------------

const mmss = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

function phaseFor(seconds: number): GamePhase {
  if (seconds <= 14 * 60) return "early";
  if (seconds <= 25 * 60) return "mid";
  return "late";
}

/**
 * Approximate game time for an event. Real Riot timeline data will replace
 * these estimates; until then we anchor to the phase and label it approximate.
 */
function approxTime(m: MatchAnalysisInput, seconds: number) {
  const capped = Math.min(seconds, Math.max(60, m.durationMin * 60 - 30));
  return {
    seconds: capped,
    label: `~ ${mmss(capped)}`,
  };
}

function anchor(m: MatchAnalysisInput, seconds: number): ReplayAnchor {
  return {
    matchId: m.matchId,
    approxTimeSeconds: seconds,
    phase: phaseFor(seconds),
    anchorReady: false, // flips true once the Riot match timeline is connected
  };
}

// --- event detectors -------------------------------------------------------
// Each detector returns a fully-formed decision chain when its condition fires.

function laneEvents(m: MatchAnalysisInput): CoachableEvent[] {
  const out: CoachableEvent[] = [];
  if (m.laneMinions10 > 0 && m.laneMinions10 < 65) {
    const t = approxTime(m, 10 * 60);
    out.push({
      id: "lane-cs-10",
      gameTime: t.label,
      category: "Laning",
      decision: "Dropped last-hits in the opening waves",
      chain: [
        "Missed early last-hits",
        "Behind on first-item gold",
        "Weaker level-6 power spike",
        "Lost lane priority",
      ],
      outcome: "Started the mid game a component behind.",
      impact: m.laneMinions10 < 55 ? "high" : "medium",
      evidence: `Only ${Math.round(m.laneMinions10)} CS at 10 minutes (target ~75+).`,
      explanation:
        "Every missed minion is gold you don't have at your next recall. Over the first ten minutes it compounds into a delayed first item, which is the difference between winning and losing your level-6 trade.",
      practiceTakeaway: "Last-hit the first three waves without using abilities and aim for 75+ CS at 10:00.",
      replayAnchor: anchor(m, t.seconds),
    });
  }
  if (m.earlyGoldExpAdvantage <= -600) {
    const t = approxTime(m, 8 * 60);
    out.push({
      id: "lane-early-deficit",
      gameTime: t.label,
      category: "Laning",
      decision: "Took losing trades in the level 1–3 window",
      chain: [
        "Traded into an unfavourable matchup",
        "Fell behind in gold/xp early",
        "Every later fight started from a deficit",
        "Enemy bot lane snowballed",
      ],
      outcome: `Ended laning down ~${Math.abs(Math.round(m.earlyGoldExpAdvantage))} gold/xp.`,
      impact: "high",
      evidence: `Early gold/xp deficit of ${Math.abs(Math.round(m.earlyGoldExpAdvantage))}.`,
      explanation:
        "Losing the early exchanges hands the enemy lane priority, which lets their jungler path toward you and their bot lane roam first. The deficit rarely stays small — it becomes the reason later objectives were contested on their terms.",
      practiceTakeaway: "Only trade when the enemy's key ability is on cooldown; respect level-2 and level-3 all-ins.",
      replayAnchor: anchor(m, t.seconds),
    });
  }
  return out;
}

function recallAndWaveEvents(m: MatchAnalysisInput): CoachableEvent[] {
  const out: CoachableEvent[] = [];
  if (m.csPerMin < 7 && m.deaths >= 4) {
    const t = approxTime(m, 12 * 60);
    out.push({
      id: "wave-overstay",
      gameTime: t.label,
      category: "Recall Timing",
      decision: "Stayed for one extra wave instead of recalling",
      chain: [
        "Overstayed on the wave",
        "Late recall on low HP",
        "Late item spike and late Dragon setup",
        "Enemy took the objective — lost tempo",
      ],
      outcome: "Repeatedly gave up tempo around objectives.",
      impact: "high",
      evidence: `${m.csPerMin.toFixed(1)} CS/min with ${m.deaths} deaths — the classic overstay pattern.`,
      explanation:
        "Backing on a wave crash lets you return with an item and full resources. Staying for one more caster means you recall late, arrive at the next Dragon late, and hand the enemy a free setup. One recall decision quietly decides a whole objective — that's the Wave → Tempo → Objective chain in action.",
      practiceTakeaway: "Crash the wave, then reset immediately — don't hover for one more minion.",
      replayAnchor: anchor(m, t.seconds),
    });
  }
  // Side-wave neglect — catching side waves too late (Sprint 2.2 wave habit).
  if (DETECTORS["wave-side-neglect"](m) && !DETECTORS["wave-overstay"](m)) {
    const t = approxTime(m, 22 * 60);
    out.push({
      id: "wave-side-neglect",
      gameTime: t.label,
      category: "Wave Management",
      decision: "Grouped without catching a crashing side wave",
      chain: [
        "Left a side wave uncollected",
        "Enemy laner farmed uncontested",
        "You fell one item behind by mid-game",
        "Team fought objectives without a scaling carry",
      ],
      outcome: "Free gold sat in a side lane while your team grouped.",
      impact: "medium",
      evidence: `${m.csPerMin.toFixed(1)} CS/min over ${Math.round(m.durationMin)} minutes — the mid-game side-lane leak.`,
      explanation:
        "After you crash a wave, the next side wave is usually free — but only if you rotate to it before it crashes into your tower. Missing it costs 6–8 CS and a small tempo edge that compounds across the mid game.",
      practiceTakeaway: "Catch one side wave between every objective reset — never leave gold on the map.",
      replayAnchor: anchor(m, t.seconds),
    });
  }
  // Fought without fixing the wave first — a very common tempo mistake.
  if (DETECTORS["wave-fight-first"](m)) {
    const t = approxTime(m, 14 * 60);
    out.push({
      id: "wave-fight-first",
      gameTime: t.label,
      category: "Wave Management",
      decision: "Rotated to a fight before resetting your wave",
      chain: [
        "Left a bouncing wave behind you",
        "Fought without lane priority",
        "Enemy answered with a fresh wave/plate",
        "Fight won or lost, you still gave up tempo",
      ],
      outcome: "Every skirmish cost you a wave you hadn't fixed first.",
      impact: "medium",
      evidence: `${m.deaths} deaths at only ${m.csPerMin.toFixed(1)} CS/min — fights are pulling you off the wave.`,
      explanation:
        "Fighting without first fixing the wave means you win the fight and still lose gold, or lose the fight and lose both. Slow-push or crash before you rotate so the wave works for you while you're gone.",
      practiceTakeaway: "Before rotating to a fight, ask: is this wave crashing, freezing, or bouncing to them? Fix it first.",
      replayAnchor: anchor(m, t.seconds),
    });
  }
  if (m.controlWardsPlaced < 1) {
    const t = approxTime(m, 9 * 60);
    out.push({
      id: "vision-no-control",
      gameTime: t.label,
      category: "Vision Setup",
      decision: "Skipped a control ward on your recall",
      chain: [
        "Backed without a control ward",
        "No vision around the river/objective",
        "Fights started blind on the enemy's terms",
        "Harder to contest the next objective",
      ],
      outcome: "Played the mid game with a vision deficit.",
      impact: "medium",
      evidence: `${m.controlWardsPlaced} control ward(s) placed all game.`,
      explanation:
        "A single control ward near the next objective turns a coin-flip fight into one you can see coming. Skipping it saves 75 gold but costs you the information that decides where and when fights happen.",
      practiceTakeaway: "Buy a control ward every back and drop it near the next objective 60–90s early.",
      replayAnchor: anchor(m, t.seconds),
    });
  }
  return out;
}

function objectiveEvents(m: MatchAnalysisInput): CoachableEvent[] {
  const out: CoachableEvent[] = [];
  const objectives = m.dragonTakedowns + m.baronTakedowns + m.riftHeraldTakedowns;
  if (objectives <= 1 && m.durationMin >= 22) {
    const t = approxTime(m, 20 * 60);
    out.push({
      id: "objective-absent",
      gameTime: t.label,
      category: "Dragon & Baron Preparation",
      decision: "Arrived at the objective without a setup",
      chain: [
        "No lane priority before spawn",
        "No control ward around the pit",
        "Team walked in without vision",
        "Enemy secured Dragon/Baron uncontested",
      ],
      outcome: `Present for only ${objectives} major objective all game.`,
      impact: "high",
      evidence: `${objectives} dragon/baron/herald takedown(s) over ${Math.round(m.durationMin)} minutes.`,
      explanation:
        "Objectives are decided in the 60 seconds BEFORE they spawn, not at the pit. Priority (from a shoved lane), vision (control ward + sweeper), a completed recall, and a grouped team have to line up. Missing any one of these is why you arrived and it was already lost.",
      practiceTakeaway: "Start moving toward the pit 45–60s before spawn, even if it costs a side wave.",
      replayAnchor: anchor(m, t.seconds),
    });
  }
  // Recall/objective mismatch — bad recall right before an objective spawn.
  if (
    DETECTORS["objective-recall-mismatch"](m) &&
    !DETECTORS["objective-absent"](m)
  ) {
    const t = approxTime(m, 19 * 60);
    out.push({
      id: "objective-recall-mismatch",
      gameTime: t.label,
      category: "Recall Timing",
      decision: "Recalled inside the objective window",
      chain: [
        "Recalled with < 60s to spawn",
        "Rejoined the map after the fight started",
        "Team engaged 4v5 or gave up the pit",
        "Enemy converted the objective into a lead",
      ],
      outcome: `Only ${m.dragonTakedowns} dragon takedown(s) with ${m.deaths} deaths — a recall-timing tell.`,
      impact: "medium",
      evidence: `${m.deaths} deaths and ${m.dragonTakedowns} dragon takedown(s) over ${Math.round(m.durationMin)} minutes.`,
      explanation:
        "Recalling in the last minute before an objective is the same as not being there. Either back much earlier and rotate with vision, or hold the recall and defend the wave — never split the difference.",
      practiceTakeaway: "Recall with 2:00+ to spawn, or hold until after the objective — no recalls inside the last minute.",
      replayAnchor: anchor(m, t.seconds),
    });
  }
  return out;
}

function teamfightEvents(m: MatchAnalysisInput): CoachableEvent[] {
  const out: CoachableEvent[] = [];
  if (m.deaths >= 6 || (m.deaths >= 4 && m.damageShare < 0.24)) {
    const t = approxTime(m, 24 * 60);
    out.push({
      id: "teamfight-positioning",
      gameTime: t.label,
      category: "Teamfight Positioning",
      decision: "Stepped up before the enemy engage was used",
      chain: [
        "Positioned too far forward",
        "Caught by the enemy's engage",
        "Died before dealing damage",
        "Team fought the rest of the fight a carry down",
      ],
      outcome: `${m.deaths} deaths with ${pct(m.damageShare)} damage share.`,
      impact: m.deaths >= 7 ? "high" : "medium",
      evidence: `${m.deaths} deaths and only ${pct(m.damageShare)} of team damage.`,
      explanation:
        `${championRoleLabel(m.champion)} your damage only matters if you're alive when the fight peaks. Standing a screen behind your frontline lets the enemy waste their engage first — then you walk up and deal uninterrupted damage instead of dying on contact.`,
      practiceTakeaway: "Hold your step-up until the enemy's engage is spent, then attack the closest safe target.",
      replayAnchor: anchor(m, t.seconds),
    });
  }
  if (m.killParticipation < 0.45) {
    const t = approxTime(m, 18 * 60);
    out.push({
      id: "tempo-absent",
      gameTime: t.label,
      category: "Objective Tempo",
      decision: "Kept farming while your team grouped",
      chain: [
        "Stayed in a solo side lane",
        "Team fought without you",
        "Picks and objectives happened 4v5",
        "Lost map control",
      ],
      outcome: `Only ${pct(m.killParticipation)} kill participation.`,
      impact: "medium",
      evidence: `Kill participation of ${pct(m.killParticipation)} — below the ~55% you want.`,
      explanation:
        "After you crash a wave, the next play is usually a group or an objective, not a fourth wave alone. Being absent means your team takes fights a member down, which quietly loses the mid game.",
      practiceTakeaway: "Rotate to the next play after every wave crash — keep kill participation above 55%.",
      replayAnchor: anchor(m, t.seconds),
    });
  }
  return out;
}

const IMPACT_RANK: Record<ImpactLevel, number> = { high: 3, medium: 2, low: 1 };

/**
 * Build the full decision-chain timeline for one match, ordered by game time.
 * When nothing significant fired, returns a single positive "clean game" note
 * so the timeline is never blamefully empty.
 */
export function buildMatchTimeline(m: MatchAnalysisInput): MatchTimeline {
  return buildMatchTimelineWithHistory(m, []);
}

/**
 * Same as `buildMatchTimeline`, but enriches each event with recurring-habit
 * language when the same detector fires across the player's recent history.
 * History = older matches (chronologically previous to `m`), most-recent first.
 */
export function buildMatchTimelineWithHistory(
  m: MatchAnalysisInput,
  history: MatchAnalysisInput[],
): MatchTimeline {
  const window = history.slice(0, 9); // last 9 previous games (10-game view w/ current)
  const events = [
    ...laneEvents(m),
    ...recallAndWaveEvents(m),
    ...objectiveEvents(m),
    ...teamfightEvents(m),
  ]
    .map((ev) => withHabit(ev, window))
    .sort((a, b) => {
    const ta = a.replayAnchor.approxTimeSeconds ?? 0;
    const tb = b.replayAnchor.approxTimeSeconds ?? 0;
    if (ta !== tb) return ta - tb;
    return IMPACT_RANK[b.impact] - IMPACT_RANK[a.impact];
  });

  if (events.length === 0) {
    const t = approxTime(m, Math.round(m.durationMin * 60 * 0.5));
    events.push({
      id: "clean-game",
      gameTime: t.label,
      category: "Objective Tempo",
      decision: "Made disciplined decisions throughout",
      chain: [
        "Steady, low-risk decisions",
        "No tempo given away",
        "Consistent objective presence",
        "Clean, controlled game",
      ],
      outcome: "No single decision cost you this game.",
      impact: "low",
      evidence: `${m.csPerMin.toFixed(1)} CS/min, ${m.deaths} deaths, ${pct(m.killParticipation)} kill participation.`,
      explanation:
        "There was no obvious decision leak this game — the coaching goal now is repeatability. Bank this as your template and try to make the same reads next game.",
      practiceTakeaway: "Replicate this game's decision-making next game — consistency is the next level.",
      replayAnchor: anchor(m, t.seconds),
    });
  }

  return { events, anchorsApproximate: true };
}