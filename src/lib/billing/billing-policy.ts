import { z } from "zod";
import { PRO_PRICE_IDS } from "./billing-status";
import { isTestCheckoutOrigin } from "./test-checkout-hosts";
import { PRICING, type BillingCycle } from "@/lib/entitlements/plan";

export const checkoutInput = z.object({
  cycle: z.enum(["monthly", "annual"]),
  environment: z.enum(["sandbox", "live"]),
  returnUrl: z.string().max(2048),
}).strict();
export const portalInput = checkoutInput.omit({ cycle: true });


/** Test checkout cannot be enabled from a production origin or client flag. */
export function trustedReturnUrl(value: string, path: "/checkout/return" | "/settings", requestOrigin?: string, env: "sandbox" | "live" = "sandbox"): string {
  const url = new URL(value);
  const allowed = env === "sandbox" ? isTestCheckoutOrigin(url) : isProductionBillingOrigin(url.origin);
  if (!allowed || url.username || url.password || url.hash || url.pathname !== path ||
      (requestOrigin !== undefined && url.origin !== requestOrigin)) {
    throw new Error("Checkout is available only in the BotDiff test preview.");
  }
  if (path === "/checkout/return") {
    if (url.searchParams.get("session_id") !== "{CHECKOUT_SESSION_ID}" || [...url.searchParams].length !== 1) {
      throw new Error("Invalid checkout return URL");
    }
  } else if (url.search) throw new Error("Invalid billing return URL");
  return url.toString();
}

export function isProductionBillingOrigin(origin: string): boolean {
  return ["https://botdiff.online", "https://www.botdiff.online", "https://botdiffgg.lovable.app"].includes(origin);
}

/** Separate server code approval gate; intentionally disabled, regardless of environment variables. */
export const LIVE_BILLING_IMPLEMENTATION_ENABLED = false;
export function billingRequestAllowed(env: "sandbox" | "live", origin: string, liveFlag: boolean): boolean {
  return env === "sandbox" ? isTestCheckoutOrigin(origin) :
    LIVE_BILLING_IMPLEMENTATION_ENABLED && liveFlag && isProductionBillingOrigin(origin);
}

export function verifyProPrice(price: {
  active: boolean; lookup_key: string | null; currency: string; unit_amount: number | null;
  recurring: { interval: string; interval_count: number; usage_type?: string } | null;
}, cycle: BillingCycle): void {
  const expected = cycle === "monthly" ? PRICING.monthly : PRICING.annual;
  if (!price.active || price.lookup_key !== PRO_PRICE_IDS[cycle] || price.currency !== "usd" ||
      price.unit_amount !== Math.round(expected.amount * 100) ||
      price.recurring?.interval !== (cycle === "monthly" ? "month" : "year") ||
      price.recurring?.interval_count !== 1 || price.recurring?.usage_type === "metered") {
    throw new Error("Stripe plan configuration does not match BotDiff pricing.");
  }
}

export function assertCustomerOwner(metadata: Record<string, string>, userId: string): void {
  if (metadata.userId !== userId) throw new Error("Customer ownership mismatch");
}

export function validWebhookTimestamp(timestamp: string, now = Date.now()): boolean {
  return /^\d+$/.test(timestamp) && Number.isSafeInteger(Number(timestamp)) &&
    Math.abs(now / 1000 - Number(timestamp)) <= 300;
}

export function constantTimeSignature(expected: string, signatures: string[]): boolean {
  let match = 0;
  for (const value of signatures) {
    if (!/^[a-f0-9]{64}$/.test(value)) continue;
    let difference = 0;
    for (let i = 0; i < 64; i++) difference |= expected.charCodeAt(i) ^ value.charCodeAt(i);
    match |= Number(difference === 0);
  }
  return match !== 0;
}