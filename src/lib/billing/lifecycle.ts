import type Stripe from "stripe";

export function eventSubscriptionId(event: Stripe.Event): string | undefined {
  if (event.type.startsWith("customer.subscription.")) return (event.data.object as Stripe.Subscription).id;
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed"].includes(event.type)) {
    const sub = (event.data.object as Stripe.Checkout.Session).subscription;
    return typeof sub === "string" ? sub : sub?.id;
  }
  if (["invoice.paid", "invoice.payment_failed", "invoice.payment_action_required"].includes(event.type)) {
    const invoice = event.data.object as Stripe.Invoice;
    // Live endpoints may use Basil; tolerate legacy invoice subscription field too.
    const sub = invoice.parent?.subscription_details?.subscription ??
      (invoice as Stripe.Invoice & { subscription?: string | { id: string } }).subscription;
    return typeof sub === "string" ? sub : sub?.id;
  }
  return undefined;
}