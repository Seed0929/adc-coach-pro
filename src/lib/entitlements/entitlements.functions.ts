import { createServerFn } from "@tanstack/react-start";
import { requireVerifiedSession } from "@/lib/security/require-verified-session";
import { buildEntitlementState, devToggleAllowed, writePlan } from "./entitlements.server";
import type { BillingPlan, EntitlementState } from "./plan";

// ---------------------------------------------------------------------------
// Entitlement server functions. The client never decides the plan — it asks.
// ---------------------------------------------------------------------------

export type EntitlementResult =
  | { ok: true; state: EntitlementState }
  | { ok: false; code: string; message: string };

export const getEntitlements = createServerFn({ method: "GET" })
  .middleware([requireVerifiedSession])
  .handler(async ({ context }): Promise<EntitlementResult> => {
    const { supabase, userId } = context;
    try {
      return { ok: true, state: await buildEntitlementState(supabase, userId) };
    } catch {
      return { ok: false, code: "unknown", message: "Couldn't read your plan right now." };
    }
  });

/**
 * Development-only plan switch so both Free and Pro states can be inspected
 * before billing exists. Rejected outright in production for non-admins.
 */
export const setDevPlan = createServerFn({ method: "POST" })
  .middleware([requireVerifiedSession])
  .inputValidator((data: { plan: BillingPlan }) => ({
    plan: data.plan === "pro" ? ("pro" as const) : ("free" as const),
  }))
  .handler(async ({ data, context }): Promise<EntitlementResult> => {
    const { supabase, userId } = context;
    try {
      if (!(await devToggleAllowed(supabase, userId))) {
        return { ok: false, code: "forbidden", message: "Plan switching isn't available here." };
      }
      await writePlan(userId, data.plan);
      return { ok: true, state: await buildEntitlementState(supabase, userId) };
    } catch {
      return { ok: false, code: "unknown", message: "Couldn't change the plan right now." };
    }
  });
