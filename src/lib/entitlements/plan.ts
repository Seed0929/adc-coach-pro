// ---------------------------------------------------------------------------
// BotDiff — Free / Pro plan configuration + capability map.
//
// This module is the SINGLE source of truth for plan logic. Components never
// hard-code "if plan === 'pro'" business rules; they ask `can(plan, cap)`.
// Business decisions (allowance size, period, pricing copy) live in
// PLAN_CONFIG so they can change without touching the application.
//
// Pure + client-safe: no server imports, no Supabase, no side effects.
// ---------------------------------------------------------------------------

/**
 * Access levels, lowest to highest: free < pro < owner.
 *
 * `owner` is NOT a customer subscription. It is an internal, server-authorized
 * access level for BotDiff ownership/development accounts. It satisfies every
 * Pro capability check automatically, never expires, and is completely
 * independent of any future billing state.
 */
export type AccessLevel = "free" | "pro" | "owner";

/** Historic name kept so existing call sites keep compiling. */
export type BillingPlan = AccessLevel;

/** Customer-facing plans only — the two levels users ever see or choose. */
export const PUBLIC_PLANS: readonly AccessLevel[] = ["free", "pro"] as const;

/** Ranking used for "at least Pro" style checks. Owner always wins. */
const LEVEL_RANK: Record<AccessLevel, number> = { free: 0, pro: 1, owner: 2 };

/** True for pro AND owner — the single test for "has premium capabilities". */
export function isProOrAbove(level: AccessLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK.pro;
}

export function isOwnerLevel(level: AccessLevel): boolean {
  return level === "owner";
}

export const PLAN_CONFIG = {
  /** Full AI match coaching reports a Free member may unlock per period. */
  freeFullReportsPerPeriod: 3,
  /** Allowance window. Weekly = resets Monday 00:00 UTC. */
  freeReportPeriod: "weekly" as "weekly" | "monthly",
  /** Recurring cross-match patterns a Free member sees in full. */
  freeVisiblePatterns: 2,
  /** How many locked patterns are previewed (title only) before "+N more". */
  freeLockedPatternPreviews: 4,
  /**
   * How often a Free member may receive one complete Pro-level insight as a
   * "Pro Insight — Free Preview". 0 disables previews entirely. One per
   * allowance period by default; never a countdown, never false scarcity.
   */
  freeProInsightPreviewsPerPeriod: 1,
  /** Real billing is NOT connected yet. Nothing may collect payment. */
  paymentsEnabled: false,
  /** Pricing is undecided — never render an invented price. */
  priceLabel: "Pricing coming soon",
} as const;

// --- capabilities -----------------------------------------------------------

export type Capability =
  | "canViewBasicStats"
  | "canViewMatchHistory"
  | "canUseTodaysFocus"
  | "canGenerateFullMatchReport"
  | "canViewAdvancedCoaching"
  | "canViewCrossMatchPatterns"
  | "canViewFullPracticePlan"
  | "canViewLongTermGoals"
  | "canViewCoachingHistory"
  | "canViewAdvancedAnalytics"
  | "canViewChampionCoaching"
  | "canViewProInsight";

/**
 * `canGenerateFullMatchReport` is true for BOTH plans — Free members get real,
 * complete reports; the difference is the metered allowance, enforced
 * separately by the entitlement server layer.
 */
const PLAN_CAPABILITIES: Record<"free" | "pro", Record<Capability, boolean>> = {
  free: {
    canViewBasicStats: true,
    canViewMatchHistory: true,
    canUseTodaysFocus: true,
    canGenerateFullMatchReport: true,
    canViewAdvancedCoaching: false,
    canViewCrossMatchPatterns: false,
    canViewFullPracticePlan: false,
    canViewLongTermGoals: false,
    canViewCoachingHistory: true,
    canViewAdvancedAnalytics: false,
    canViewChampionCoaching: false,
    canViewProInsight: false,
  },
  pro: {
    canViewBasicStats: true,
    canViewMatchHistory: true,
    canUseTodaysFocus: true,
    canGenerateFullMatchReport: true,
    canViewAdvancedCoaching: true,
    canViewCrossMatchPatterns: true,
    canViewFullPracticePlan: true,
    canViewLongTermGoals: true,
    canViewCoachingHistory: true,
    canViewAdvancedAnalytics: true,
    canViewChampionCoaching: true,
    canViewProInsight: true,
  },
};

/**
 * Owner inherits EVERY capability automatically — it is derived from the Pro
 * map rather than hand-listed, so a future Pro capability unlocks for owner
 * accounts without touching this file or any component.
 */
const OWNER_CAPABILITIES = Object.fromEntries(
  Object.keys(PLAN_CAPABILITIES.pro).map((key) => [key, true]),
) as Record<Capability, boolean>;

export const CAPABILITIES: Record<AccessLevel, Record<Capability, boolean>> = {
  free: PLAN_CAPABILITIES.free,
  pro: PLAN_CAPABILITIES.pro,
  owner: OWNER_CAPABILITIES,
};

export function can(plan: AccessLevel, capability: Capability): boolean {
  return CAPABILITIES[plan][capability];
}

export function planLabel(plan: AccessLevel): string {
  if (plan === "owner") return "BotDiff Owner";
  return plan === "pro" ? "BotDiff Pro" : "BotDiff Free";
}

// --- allowance periods ------------------------------------------------------

/** Start of the current allowance period (UTC). Weekly periods start Monday. */
export function periodStart(now: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  if (PLAN_CONFIG.freeReportPeriod === "monthly") {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }
  const dow = d.getUTCDay(); // 0 = Sunday
  const back = (dow + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - back);
  return d;
}

/** First instant of the next allowance period (when the allowance resets). */
export function periodEnd(now: Date = new Date()): Date {
  const start = periodStart(now);
  if (PLAN_CONFIG.freeReportPeriod === "monthly") {
    return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  }
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return end;
}

/** `YYYY-MM-DD` key for the current period (matches the stored DATE column). */
export function periodKey(now: Date = new Date()): string {
  return periodStart(now).toISOString().slice(0, 10);
}

/** Plain-language reset line, e.g. "Resets Monday". */
export function resetLabel(resetsAt: string | null): string {
  if (!resetsAt) return "";
  const d = new Date(resetsAt);
  if (Number.isNaN(d.getTime())) return "";
  if (PLAN_CONFIG.freeReportPeriod === "monthly") {
    return `Resets ${d.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`;
  }
  return `Resets ${d.toLocaleDateString(undefined, { weekday: "long" })}`;
}

/** The real calculated reset date, e.g. "Monday, 14 September". Never invented. */
export function resetDateLabel(resetsAt: string | null): string {
  if (!resetsAt) return "";
  const d = new Date(resetsAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

/**
 * Plain-language countdown derived from the actual reset timestamp:
 * "resets tomorrow", "resets in 2 days". Empty when unknown.
 */
export function resetCountdownLabel(resetsAt: string | null, now: Date = new Date()): string {
  if (!resetsAt) return "";
  const d = new Date(resetsAt);
  if (Number.isNaN(d.getTime())) return "";
  const ms = d.getTime() - now.getTime();
  if (ms <= 0) return "resets now";
  const hours = Math.ceil(ms / 3_600_000);
  if (hours <= 1) return "resets within the hour";
  if (hours < 24) return `resets in ${hours} hours`;
  const days = Math.round(hours / 24);
  return days <= 1 ? "resets tomorrow" : `resets in ${days} days`;
}

/**
 * Short, contextual "what Pro adds here" lines. One sentence per surface, shown
 * only where the extra capability is genuinely relevant.
 */
export const PRO_CONTEXT_NOTES = {
  analytics:
    "Free shows your recent performance. Pro connects those matches into longer-term patterns.",
  coaching:
    "Free gives you complete individual coaching reports. Pro follows your priorities across matches.",
  goals: "Pro continuously adjusts personalized goals as your performance changes.",
  champion: "Pro can identify champion-specific patterns across your match history.",
} as const;

export type ProContextSurface = keyof typeof PRO_CONTEXT_NOTES;


export interface LockedInsight {
  id: string;
  /** Coaching area, e.g. "Farming" — enough to establish value, not the analysis. */
  title: string;
  /** Observed-only teaser built from the player's own game count. */
  preview: string;
}

// --- shared state shape -----------------------------------------------------

export interface ReportAllowance {
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
  /** ISO timestamp of the next reset, or null for unlimited plans. */
  resetsAt: string | null;
}

export interface EntitlementState {
  plan: BillingPlan;
  capabilities: Record<Capability, boolean>;
  fullReports: ReportAllowance;
  paymentsEnabled: boolean;
  priceLabel: string;
  /** True only in non-production environments / for admins. */
  devToggleAvailable: boolean;
}

export function proAllowance(): ReportAllowance {
  return { used: 0, limit: 0, remaining: 0, unlimited: true, resetsAt: null };
}

export function freeAllowance(used: number, resetsAt: string): ReportAllowance {
  const limit = PLAN_CONFIG.freeFullReportsPerPeriod;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    unlimited: false,
    resetsAt,
  };
}

/** Default state used for guests, demo mode, and while loading. */
export function guestEntitlementState(): EntitlementState {
  return {
    plan: "free",
    capabilities: CAPABILITIES.free,
    fullReports: freeAllowance(0, periodEnd().toISOString()),
    paymentsEnabled: PLAN_CONFIG.paymentsEnabled,
    priceLabel: PLAN_CONFIG.priceLabel,
    devToggleAvailable: false,
  };
}

// --- upgrade-surface copy ---------------------------------------------------

export const PRO_FEATURES: { title: string; detail: string }[] = [
  {
    title: "Full Match Coaching",
    detail: "A complete coaching report for every supported match, not a weekly allowance.",
  },
  {
    title: "Cross-Match Intelligence",
    detail: "Patterns BotDiff can only see by comparing your games against each other.",
  },
  {
    title: "Adaptive Today's Focus",
    detail: "Your focus keeps updating as your own evidence changes.",
  },
  {
    title: "Personalized Practice Plans",
    detail: "Practice built from the habits BotDiff actually observed in your games.",
  },
  {
    title: "Long-Term Improvement Tracking",
    detail: "Your goals, streaks and progression tracked against your own past play.",
  },
  {
    title: "Coaching History",
    detail: "Every focus change and coaching session kept in one timeline.",
  },
  {
    title: "Champion-Specific Coaching",
    detail: "Coaching tuned to how you play each champion, not champions in general.",
  },
  {
    title: "Advanced Pattern Detection",
    detail: "Deeper recurring-pattern analysis with the evidence behind each one.",
  },
];

export const FREE_SUMMARY = "Learn what BotDiff can do.";
export const PRO_SUMMARY = "Build a coach that learns how YOU play.";
