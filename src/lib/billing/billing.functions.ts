import { createServerFn } from "@tanstack/react-start";
import { requireVerifiedSession } from "@/lib/security/require-verified-session";
import { PRO_PRICE_IDS, subscriptionGrantsPro } from "./billing-status";
import { checkoutInput, portalInput, trustedReturnUrl, verifyProPrice, assertCustomerOwner } from "./billing-policy";
import { z } from "zod";

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };
const environmentInput = z.object({ environment: z.enum(["sandbox", "live"]) }).strict();

export const createProCheckout = createServerFn({ method: "POST" })
  .middleware([requireVerifiedSession])
  .inputValidator((input: z.input<typeof checkoutInput>) => checkoutInput.parse(input))
  .handler(async ({ data, context }): Promise<Result<{ clientSecret: string }>> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    try {
      const returnUrl = trustedReturnUrl(data.returnUrl, "/checkout/return");
      const { loadPlan } = await import("@/lib/entitlements/entitlements.server");
      if ((await loadPlan(context.supabase, context.userId)) !== "free") {
        return { ok: false, error: "Your account already has Pro access." };
      }
      const { data: subs, error: subError } = await context.supabase.from("subscriptions")
        .select("status,current_period_end").eq("user_id", context.userId).eq("environment", "sandbox");
      if (subError) throw new Error("Couldn't check your current subscription.");
      if ((subs ?? []).some(s => subscriptionGrantsPro(s))) throw new Error("You already have BotDiff Pro.");
      const stripe = createStripeClient("sandbox");
      const prices = await stripe.prices.list({ lookup_keys: [PRO_PRICE_IDS[data.cycle]], active: true });
      const price = prices.data[0];
      if (!price || prices.data.length !== 1) throw new Error("That plan isn't available.");
      verifyProPrice(price, data.cycle);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: reservation, error } = await supabaseAdmin.rpc("reserve_billing_checkout", {
        p_user: context.userId, p_env: "sandbox", p_cycle: data.cycle,
      });
      if (error || !reservation) throw new Error(error?.message ?? "Couldn't reserve checkout.");
      let customerId = reservation.stripe_customer_id;
      if (!customerId) {
        // Stable per-account idempotency; email never reassigns someone else's customer.
        const customer = await stripe.customers.create({ metadata: { userId: context.userId } }, {
          idempotencyKey: `botdiff-customer-sandbox-${context.userId}`,
        });
        customerId = customer.id;
        const { error: saveError } = await supabaseAdmin.from("billing_customers")
          .update({ stripe_customer_id: customerId }).eq("user_id", context.userId).eq("environment", "sandbox");
        if (saveError) throw new Error("Couldn't save customer mapping.");
      }
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) throw new Error("Billing customer is unavailable.");
      assertCustomerOwner(customer.metadata, context.userId);
      const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
      if (subscriptions.data.some(s => !["canceled", "incomplete_expired"].includes(s.status))) {
        throw new Error("A subscription already exists. Use Manage billing or wait for its confirmation.");
      }
      if (reservation.checkout_session_id) {
        const existing = await stripe.checkout.sessions.retrieve(reservation.checkout_session_id);
        if (existing.status !== "open" || !existing.client_secret) throw new Error("Checkout completed or expired. Refresh your plan.");
        return { ok: true, clientSecret: existing.client_secret };
      }
      const expiresAt = Math.floor(new Date(reservation.checkout_expires_at ?? "").getTime() / 1000);
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }], mode: "subscription", ui_mode: "embedded_page",
        return_url: returnUrl, customer: customerId, expires_at: expiresAt,
        managed_payments: { enabled: true }, metadata: { userId: context.userId, managed_payments: "true" },
        subscription_data: { metadata: { userId: context.userId } },
      } as Parameters<typeof stripe.checkout.sessions.create>[0], { idempotencyKey: `botdiff-checkout-${reservation.checkout_key}` });
      const { error: sessionError } = await supabaseAdmin.from("billing_customers").update({
        checkout_session_id: session.id, checkout_expires_at: new Date(session.expires_at * 1000).toISOString(),
      }).eq("user_id", context.userId).eq("environment", "sandbox").eq("checkout_key", reservation.checkout_key);
      if (sessionError || !session.client_secret) throw new Error("Couldn't persist checkout.");
      return { ok: true, clientSecret: session.client_secret };
    } catch (error) { return { ok: false, error: getStripeErrorMessage(error) }; }
  });

export const createBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireVerifiedSession])
  .inputValidator((input: z.input<typeof portalInput>) => portalInput.parse(input))
  .handler(async ({ data, context }): Promise<Result<{ url: string }>> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    try {
      const returnUrl = trustedReturnUrl(data.returnUrl, "/settings");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: mapping, error } = await supabaseAdmin.from("billing_customers").select("stripe_customer_id")
        .eq("user_id", context.userId).eq("environment", "sandbox").maybeSingle();
      if (error || !mapping?.stripe_customer_id) throw new Error("No billing customer found.");
      const stripe = createStripeClient("sandbox");
      const customer = await stripe.customers.retrieve(mapping.stripe_customer_id);
      if (customer.deleted) throw new Error("Billing customer unavailable.");
      assertCustomerOwner(customer.metadata, context.userId);
      const portal = await stripe.billingPortal.sessions.create({ customer: customer.id, return_url: returnUrl });
      return { ok: true, url: portal.url };
    } catch (error) { return { ok: false, error: getStripeErrorMessage(error) }; }
  });

export const getMySubscription = createServerFn({ method: "POST" })
  .middleware([requireVerifiedSession])
  .inputValidator((input: z.input<typeof environmentInput>) => environmentInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("subscriptions")
      .select("status,price_id,current_period_end,cancel_at_period_end")
      .eq("user_id", context.userId).eq("environment", data.environment).order("created_at", { ascending: false });
    if (error) throw new Error("Couldn't read subscription status.");
    return { subscription: rows?.find(s => subscriptionGrantsPro(s)) ?? rows?.[0] ?? null };
  });

export const getCheckoutStatus = createServerFn({ method: "POST" })
  .middleware([requireVerifiedSession])
  .inputValidator((input: { sessionId: string }) => z.object({ sessionId: z.string().regex(/^cs_test_[a-zA-Z0-9]+$/).max(256) }).strict().parse(input))
  .handler(async ({ data, context }): Promise<Result<{ status: string; paymentStatus: string; activated: boolean }>> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    try {
      const stripe = createStripeClient("sandbox");
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: mapping, error } = await supabaseAdmin.from("billing_customers").select("stripe_customer_id")
        .eq("user_id", context.userId).eq("environment", "sandbox").maybeSingle();
      if (error || !mapping || session.customer !== mapping.stripe_customer_id || session.livemode || session.metadata?.userId !== context.userId) {
        throw new Error("Checkout does not belong to this account.");
      }
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const { data: sub, error: subError } = await context.supabase.from("subscriptions")
        .select("status,current_period_end,price_id").eq("stripe_subscription_id", subId ?? "")
        .eq("user_id", context.userId).eq("environment", "sandbox").maybeSingle();
      if (subError) throw new Error("Couldn't verify activation.");
      return { ok: true, status: session.status ?? "unknown", paymentStatus: session.payment_status,
        activated: Boolean(sub && ["pro_monthly", "pro_yearly"].includes(sub.price_id) && subscriptionGrantsPro(sub)) };
    } catch (error) { return { ok: false, error: getStripeErrorMessage(error) }; }
  });
