// Pure, client-safe subscription rules shared by server checks and tests.

const PAID_STATUSES = new Set(["active", "trialing", "past_due", "canceled"]);

/**
 * True when a subscription row grants Pro right now. Fails closed:
 * - active / trialing / past_due (Stripe still retrying) / canceled → Pro only
 *   while a valid current_period_end is in the future
 * - missing or unparseable period end → no Pro
 * - any other status (incomplete, unpaid, expired, paused, unknown) → no Pro
 */
export function subscriptionGrantsPro(
  row: { status: unknown; current_period_end: unknown },
  now: Date = new Date(),
): boolean {
  if (typeof row.status !== "string" || !PAID_STATUSES.has(row.status)) return false;
  if (typeof row.current_period_end !== "string" || !row.current_period_end) return false;
  const end = Date.parse(row.current_period_end);
  if (!Number.isFinite(end)) return false;
  return end > now.getTime();
}

export const PRO_PRICE_IDS = { monthly: "pro_monthly", annual: "pro_yearly" } as const;
export type ProPriceId = (typeof PRO_PRICE_IDS)[keyof typeof PRO_PRICE_IDS];

export function isProPriceId(v: unknown): v is ProPriceId {
  return v === "pro_monthly" || v === "pro_yearly";
}
