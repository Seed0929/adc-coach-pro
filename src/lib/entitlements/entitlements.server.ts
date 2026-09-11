// ---------------------------------------------------------------------------
// BotDiff — server-side entitlement resolution and allowance metering.
//
// Reads run through the caller's RLS-scoped client (members may read their own
// plan and their own unlocked reports). Writes — granting a report against the
// allowance, or flipping the plan in development — run through the privileged
// client so a member can never self-grant Pro from the browser.
// ---------------------------------------------------------------------------
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  freeAllowance,
  isProOrAbove,
  periodEnd,
  periodKey,
  proAllowance,
  CAPABILITIES,
  PLAN_CONFIG,
  type BillingPlan,
  type EntitlementState,
} from "./plan";

type Client = SupabaseClient<any, any, any>;

/**
 * Server-authorized OWNER check.
 *
 * Owner status lives ONLY in public.user_roles (role = 'owner'), which normal
 * users can read for themselves but can never write: the table has no INSERT
 * or UPDATE policy and `authenticated` holds SELECT only. Nothing from the
 * browser — headers, body, storage, profile fields — can influence this.
 */
export async function isOwner(supabase: Client, userId: string): Promise<boolean> {
  try {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "owner" });
    return data === true;
  } catch {
    return false; // fail closed
  }
}

/**
 * Resolves the caller's effective access level: owner > pro > free.
 *
 * Owner is resolved FIRST and independently of billing, so no future payment,
 * cancellation or webhook state can downgrade an owner account.
 */
export async function loadPlan(supabase: Client, userId: string): Promise<BillingPlan> {
  if (await isOwner(supabase, userId)) return "owner";
  const { data } = await supabase
    .from("user_entitlements")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.plan === "pro" ? "pro" : "free";
}

/** Full reports the caller has unlocked inside the current allowance period. */
export async function countReportsUsed(supabase: Client, userId: string): Promise<number> {
  const { count } = await supabase
    .from("coaching_report_grants")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("period_start", periodKey());
  return count ?? 0;
}

/** True when this match's report was already unlocked (any period, forever). */
export async function hasReportGrant(
  supabase: Client,
  userId: string,
  matchId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("coaching_report_grants")
    .select("id")
    .eq("user_id", userId)
    .eq("match_id", matchId)
    .maybeSingle();
  return Boolean(data);
}

/** Development / admin / owner plan switching — never for normal production users. */
export async function devToggleAllowed(supabase: Client, userId: string): Promise<boolean> {
  if (process.env["NODE_ENV"] !== "production") return true;
  if (process.env["BOTDIFF_ALLOW_PLAN_TOGGLE"] === "true") return true;
  try {
    const [admin, owner] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "owner" }),
    ]);
    return admin.data === true || owner.data === true;
  } catch {
    return false;
  }
}

export async function buildEntitlementState(
  supabase: Client,
  userId: string,
): Promise<EntitlementState> {
  const [plan, devToggleAvailable] = await Promise.all([
    loadPlan(supabase, userId),
    devToggleAllowed(supabase, userId),
  ]);
  // Pro AND owner are unlimited: no weekly allowance, no reset, no countdown.
  const fullReports =
    isProOrAbove(plan)
      ? proAllowance()
      : freeAllowance(await countReportsUsed(supabase, userId), periodEnd().toISOString());
  return {
    plan,
    capabilities: CAPABILITIES[plan],
    fullReports,
    paymentsEnabled: PLAN_CONFIG.paymentsEnabled,
    priceLabel: PLAN_CONFIG.priceLabel,
    devToggleAvailable,
  };
}

export type ReportAccess =
  | { allowed: true; plan: BillingPlan; consumed: boolean }
  | { allowed: false; plan: BillingPlan; used: number; limit: number; resetsAt: string };

/**
 * Decides whether the caller may read the FULL coaching report for `matchId`.
 *
 * Pro: always. Free: always when this match was already unlocked (previously
 * generated coaching is never taken away), otherwise it spends one of the
 * period's included reports.
 */
export async function ensureFullReportAccess(
  supabase: Client,
  userId: string,
  matchId: string,
): Promise<ReportAccess> {
  const plan = await loadPlan(supabase, userId);
  // Pro and owner: unmetered, always allowed.
  if (isProOrAbove(plan)) return { allowed: true, plan, consumed: false };

  if (await hasReportGrant(supabase, userId, matchId)) {
    return { allowed: true, plan, consumed: false };
  }

  const used = await countReportsUsed(supabase, userId);
  const limit = PLAN_CONFIG.freeFullReportsPerPeriod;
  if (used >= limit) {
    return { allowed: false, plan, used, limit, resetsAt: periodEnd().toISOString() };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("coaching_report_grants")
    .insert({ user_id: userId, match_id: matchId, period_start: periodKey() });
  // A unique-violation means a parallel request already unlocked it — allow.
  if (error && error.code !== "23505") {
    return { allowed: false, plan, used, limit, resetsAt: periodEnd().toISOString() };
  }
  return { allowed: true, plan, consumed: true };
}

/**
 * Development-only plan switch. Callers MUST have passed `devToggleAllowed`.
 * Only the two customer plans can ever be written here — owner access is a
 * role, not a plan value, and is never writable through the application.
 */
export async function writePlan(userId: string, plan: BillingPlan): Promise<void> {
  const value = plan === "pro" ? "pro" : "free";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("user_entitlements")
    .upsert({ user_id: userId, plan: value, source: "dev-toggle" }, { onConflict: "user_id" });
}
