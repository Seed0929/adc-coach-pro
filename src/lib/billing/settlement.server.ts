import type Stripe from "stripe";

/** Fail closed until Stripe confirms the subscription's initial invoice settled.
 * Renewals may be past_due without losing the established, bounded grace period.
 * No browser claim, metadata, event snapshot or subscription status proves settlement.
 */
export async function initialInvoiceSettled(
  stripe: Stripe, subscriptionId: string, customerId: string, env: "sandbox" | "live",
): Promise<boolean> {
  let startingAfter: string | undefined;
  for (let page = 0; page < 20; page++) {
    const invoices = await stripe.invoices.list({ subscription: subscriptionId, limit: 100, ...(startingAfter && { starting_after: startingAfter }) });
    for (const invoice of invoices.data) {
      if (invoice.billing_reason !== "subscription_create") continue;
      const customer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const subscription = invoice.parent?.subscription_details?.subscription ??
        (invoice as Stripe.Invoice & { subscription?: string | { id: string } }).subscription;
      const id = typeof subscription === "string" ? subscription : subscription?.id;
      return invoice.livemode === (env === "live") && customer === customerId && id === subscriptionId &&
        invoice.status === "paid" && invoice.amount_remaining === 0;
    }
    if (!invoices.has_more) return false;
    startingAfter = invoices.data.at(-1)?.id;
    if (!startingAfter) return false;
  }
  return false;
}