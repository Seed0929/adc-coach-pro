// Pure, client-safe subscription rules shared by server checks and tests.

const ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * True when a subscription row grants Pro right now.
 * - active / trialing / past_due (Stripe still retrying) → Pro until period end
 * - canceled → Pro only until the paid period ends
 * - anything else (incomplete, unpaid, expired, paused) → no Pro
 */
export function subscriptionGrantsPro(
  row: { status: string; current_period_end: string | null },
  now: Date = new Date(),
): boolean {
  const end = row.current_period_end ? new Date(row.current_period_end) : null;
  const inPeriod = !end || end.getTime() > now.getTime();
  if (ACCESS_STATUSES.has(row.status)) return inPeriod;
  if (row.status === "canceled") return Boolean(end) && inPeriod;
  return false;
}

export const PRO_PRICE_IDS = { monthly: "pro_monthly", annual: "pro_yearly" } as const;
export type ProPriceId = (typeof PRO_PRICE_IDS)[keyof typeof PRO_PRICE_IDS];

export function isProPriceId(v: unknown): v is ProPriceId {
  return v === "pro_monthly" || v === "pro_yearly";
}
