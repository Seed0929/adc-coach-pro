import type Stripe from "stripe";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";
import { assertCustomerOwner, verifyProPrice } from "./billing-policy";

/** Re-fetch Stripe rather than trust an old event snapshot or browser metadata. */
export async function syncVerifiedSubscription(event: Stripe.Event, subscriptionId: string, env: StripeEnv) {
  const stripe = createStripeClient(env);
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  if (sub.livemode !== (env === "live")) throw new Error("Subscription environment mismatch");
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) throw new Error("Customer deleted");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: mapping, error: mappingError } = await supabaseAdmin.from("billing_customers")
    .select("user_id").eq("stripe_customer_id", customerId).eq("environment", env).maybeSingle();
  if (mappingError || !mapping) throw new Error("Trusted customer mapping missing");
  assertCustomerOwner(customer.metadata, mapping.user_id);
  if (sub.metadata.userId !== mapping.user_id) throw new Error("Subscription ownership mismatch");
  if (sub.items.data.length !== 1) throw new Error("Unexpected subscription items");
  const item = sub.items.data[0];
  if (!item || item.quantity !== 1) throw new Error("Unexpected subscription quantity");
  const price = await stripe.prices.retrieve(item.price.id);
  const cycle = price.lookup_key === "pro_monthly" ? "monthly" : "annual";
  verifyProPrice(price, cycle);
  const productId = typeof price.product === "string" ? price.product : price.product.id;
  const iso = (sec: number) => Number.isFinite(sec) && sec > 0 ? new Date(sec * 1000).toISOString() : null;
  const { data: result, error } = await supabaseAdmin.rpc("apply_billing_subscription", {
    p_env: env, p_event_id: event.id, p_created: event.created,
    p_row: {
      user_id: mapping.user_id, stripe_subscription_id: sub.id, stripe_customer_id: customerId,
      product_id: productId, price_id: price.lookup_key, status: sub.status,
      current_period_start: iso(item.current_period_start), current_period_end: iso(item.current_period_end),
      cancel_at_period_end: sub.cancel_at_period_end,
    },
  });
  if (error) throw new Error(`Billing persistence failed (${error.code})`);
  return result;
}