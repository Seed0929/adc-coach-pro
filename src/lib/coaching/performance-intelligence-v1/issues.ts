// ---------------------------------------------------------------------------
// Coaching Issue Identity — the deduplication backbone.
//
// Differently worded advice ("stop dying to dives", "you die too early in
// fights", "positioning") is the SAME underlying coaching problem. Every
// coaching surface therefore resolves its text to a stable issue id, and one
// issue may only have ONE authoritative home at a time.
//
// Practice actions are behavioral only. Item and build advice is prohibited
// product-wide (see `item-policy.ts`), so nothing here may name an item.
// ---------------------------------------------------------------------------

export type CoachingIssueId =
  | "FARMING_CONSISTENCY"
  | "DEATH_REDUCTION"
  | "POSITIONING"
  | "FIGHT_SELECTION"
  | "VISION"
  | "OBJECTIVE_SETUP"
  | "RECALL_TIMING"
  | "TEMPO"
  | "LANE_TRADING"
  | "TEAMFIGHT_IMPACT"
  | "MENTAL_RESET";

export interface CoachingIssueDef {
  id: CoachingIssueId;
  label: string;
  /** Metric keys that belong to this issue (first is the primary). */
  metrics: string[];
  /** Why the issue matters — stated as decision impact, never as causation. */
  whyItMatters: string;
  /** 2-3 concise behavioral practice actions. Never items or builds. */
  practiceActions: string[];
  /** Wording variants used to recognise the same issue in existing text. */
  matchers: RegExp[];
}

export const COACHING_ISSUES: CoachingIssueDef[] = [
  {
    id: "FARMING_CONSISTENCY",
    label: "Farming consistency",
    metrics: ["cs", "gold"],
    whyItMatters:
      "Farm is the income you control alone, so a steadier wave routine makes every later decision cheaper to make.",
    practiceActions: [
      "Before each fight or roam, decide out loud what happens to the wave you are leaving.",
      "Check your CS at 10 and 20 minutes and note which wave you dropped first.",
      "Take the closest side wave immediately after every reset instead of walking to mid.",
    ],
    matchers: [
      /\bcs\b/i,
      /farm(ing)?/i,
      /minion/i,
      /side ?wave/i,
      /wave (management|control)/i,
      /gold ?\/? ?min/i,
    ],
  },
  {
    id: "DEATH_REDUCTION",
    label: "Avoidable deaths",
    metrics: ["deaths", "kda"],
    whyItMatters:
      "Every death hands the enemy free tempo, so cutting the avoidable ones keeps your leads on the map instead of resetting them.",
    practiceActions: [
      "Name the escape route you will use before you step past your wave.",
      "After each death, say in one sentence which decision put you there.",
      "Reset when you have no escape available rather than taking one more trade.",
    ],
    matchers: [/\bdeaths?\b/i, /\bdying\b/i, /\bdied\b/i, /throw(ing)? (the )?lead/i, /\bkda\b/i],
  },
  {
    id: "POSITIONING",
    label: "Positioning",
    metrics: ["deaths"],
    whyItMatters:
      "Where you stand decides which fights you are allowed to take, so spacing changes outcomes before any ability is used.",
    practiceActions: [
      "Hold at the edge of your longest range until the enemy engage tool is used.",
      "Keep one wall or minion line between you and the enemy front line.",
      "Re-check the enemy engage cooldowns before every step forward.",
    ],
    matchers: [/position(ing)?/i, /\bspacing\b/i, /overextend/i, /caught out/i, /stood too/i],
  },
  {
    id: "FIGHT_SELECTION",
    label: "Fight selection",
    metrics: ["kda", "deaths"],
    whyItMatters:
      "Choosing which fights to join decides more games than how you perform inside them.",
    practiceActions: [
      "Count who is present on both teams before committing to a fight.",
      "Skip fights you did not plan for and take the nearest wave or objective instead.",
      "Set one condition you need met before you press engage.",
    ],
    matchers: [/fight selection/i, /chas(e|ing)/i, /forced? (a )?fight/i, /bad fights?/i, /coinflip/i],
  },
  {
    id: "VISION",
    label: "Vision habits",
    metrics: ["vision"],
    whyItMatters:
      "Vision is context dependent: BotDiff tracks how your vision habits line up with the map moves you actually made, without calling a number good or bad.",
    practiceActions: [
      "Place your ward before you walk into a lane, not after.",
      "Clear one enemy ward on the side of the map you intend to play toward.",
      "Ward the entrance you will retreat through before taking a long fight.",
    ],
    matchers: [/vision/i, /\bward(s|ing)?\b/i, /sweeper/i, /control ward/i],
  },
  {
    id: "OBJECTIVE_SETUP",
    label: "Objective setup",
    metrics: ["objective"],
    whyItMatters:
      "Objectives are won in the minute before they spawn, so the setup decisions matter more than the fight itself.",
    practiceActions: [
      "Start moving toward the objective 45 seconds before it spawns.",
      "Push your wave in before rotating so you are not trading the objective for farm.",
      "Decide with your team whether you are taking it or trading it, then commit.",
    ],
    matchers: [/objective/i, /\bdragon\b/i, /\bbaron\b/i, /\bherald\b/i, /grubs?/i, /\btower\b/i],
  },
  {
    id: "RECALL_TIMING",
    label: "Recall timing",
    metrics: ["gold", "cs"],
    whyItMatters:
      "Recalling on the wrong wave state pays for your reset with farm and lane pressure you already earned.",
    practiceActions: [
      "Recall only after the wave is pushing toward the enemy or fully cleared.",
      "Say your reset plan before you press B: what you spend, and where you walk after.",
      "Delay a greedy reset by one wave rather than losing the next two.",
    ],
    matchers: [/recall/i, /\breset(s|ting)?\b/i, /\bback(ing)? (timing|off)/i],
  },
  {
    id: "TEMPO",
    label: "Map tempo",
    metrics: ["gold", "cs"],
    whyItMatters:
      "Tempo is how much of the map you convert per minute; wasted walking is income and pressure you never get back.",
    practiceActions: [
      "After every reset, take the nearest source of gold on your path.",
      "Never stand still in base — decide your next lane while the fountain heals you.",
      "Trade your lane for the objective only when you have already banked the wave.",
    ],
    matchers: [/tempo/i, /\bpacing\b/i, /wasted time/i, /walking/i, /power ?spike timing/i],
  },
  {
    id: "LANE_TRADING",
    label: "Lane trading",
    metrics: ["cs", "kda"],
    whyItMatters:
      "Trades set the lane state, and lane state decides whether your next decision is free or forced.",
    practiceActions: [
      "Only trade when the enemy's main cooldown is down.",
      "Trade toward your own wave so you win the follow-up, not just the first hit.",
      "Step out of range after the trade instead of standing to check the result.",
    ],
    matchers: [/trad(e|es|ing)/i, /\blaning\b/i, /lane phase/i, /matchup pressure/i],
  },
  {
    id: "TEAMFIGHT_IMPACT",
    label: "Teamfight impact",
    metrics: ["damage", "kp"],
    whyItMatters:
      "Damage and participation depend on champion and role, so BotDiff monitors them for context rather than grading them.",
    practiceActions: [
      "Pick your first target before the fight starts, then re-check it once.",
      "Stay attached to the ally who protects you rather than the ally who engages.",
      "Keep attacking whatever is reachable instead of waiting for the ideal target.",
    ],
    matchers: [/teamfight/i, /team fight/i, /damage share/i, /kill participation/i, /\bdps\b/i],
  },
  {
    id: "MENTAL_RESET",
    label: "Mental reset",
    metrics: [],
    whyItMatters:
      "Game-to-game swings show up as decision quality, so a reset routine protects the habits you already built.",
    practiceActions: [
      "After a loss, write the one decision you would change, then close the client for five minutes.",
      "Set a stop point for the session before you queue.",
      "Replay one won game before queueing after two straight losses.",
    ],
    matchers: [/tilt/i, /mental/i, /\bmood\b/i, /consistency between/i, /session/i],
  },
];

export function findIssue(id: CoachingIssueId): CoachingIssueDef | undefined {
  return COACHING_ISSUES.find((i) => i.id === id);
}

/** The authoritative issue for a metric key. */
export function issueForMetric(metric: string): CoachingIssueDef | undefined {
  return COACHING_ISSUES.find((i) => i.metrics[0] === metric) ??
    COACHING_ISSUES.find((i) => i.metrics.includes(metric));
}

/**
 * Resolve free-form coaching text to a stable issue identity so two panels
 * cannot present the same problem as two separate recommendations.
 * Returns null when the text does not map to a known issue.
 */
export function identifyIssue(text: string): CoachingIssueId | null {
  if (!text) return null;
  let best: { id: CoachingIssueId; hits: number } | null = null;
  for (const issue of COACHING_ISSUES) {
    const hits = issue.matchers.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
    if (hits > 0 && (!best || hits > best.hits)) best = { id: issue.id, hits };
  }
  return best?.id ?? null;
}

export interface DedupeResult<T> {
  /** One item per issue identity, original order preserved. */
  kept: T[];
  /** Items suppressed because their issue already had a home. */
  duplicates: { item: T; issueId: CoachingIssueId; ownerIndex: number }[];
}

/**
 * Keep one item per underlying issue. Items whose text maps to no known issue
 * are always kept — BotDiff never drops information it cannot classify.
 */
export function dedupeByIssue<T>(items: T[], getText: (item: T) => string): DedupeResult<T> {
  const owners = new Map<CoachingIssueId, number>();
  const kept: T[] = [];
  const duplicates: DedupeResult<T>["duplicates"] = [];
  items.forEach((item) => {
    const id = identifyIssue(getText(item));
    if (!id) {
      kept.push(item);
      return;
    }
    const ownerIndex = owners.get(id);
    if (ownerIndex == null) {
      owners.set(id, kept.length);
      kept.push(item);
    } else {
      duplicates.push({ item, issueId: id, ownerIndex });
    }
  });
  return { kept, duplicates };
}

/**
 * A short cross-reference another panel may show INSTEAD of repeating the whole
 * recommendation ("One coaching issue = one authoritative home").
 */
export function issueCrossReference(id: CoachingIssueId, home = "Your Personalized Coaching Plan"): string {
  const issue = findIssue(id);
  return issue
    ? `${issue.label} is your current coaching focus — the full plan lives in ${home}.`
    : `This is already covered in ${home}.`;
}
