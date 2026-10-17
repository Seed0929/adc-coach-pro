import { createServerFn } from "@tanstack/react-start";
import { requireVerifiedSession } from "@/lib/security/require-verified-session";
import { isProPriceId, subscriptionGrantsPro, type ProPriceId } from "./billing-status";

type StripeEnv = "sandbox" | "live";
type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

function parseEnv(v: unknown): StripeEnv {
  if (v === "sandbox" || v === "live") return v;
  throw new Error("Invalid environment");
}

/** Embedded Checkout for BotDiff Pro. Signed-in only; userId comes from the session. */
export const createProCheckout = createServerFn({ method: "POST" })
  .middleware([requireVerifiedSession])
  .inputValidator((d: { priceId: ProPriceId; environment: StripeEnv; returnUrl: string }) => {
    if (!isProPriceId(d.priceId)) throw new Error("Invalid plan");
    const url = new URL(d.returnUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error("Invalid return URL");
    return { priceId: d.priceId, environment: parseEnv(d.environment), returnUrl: url.toString() };
  })
  .handler(async ({ data, context }): Promise<Result<{ clientSecret: string }>> => {
    const { createStripeClient, getStripeErrorMessage, liveCheckoutAllowed } = await import(
      "@/lib/stripe.server"
    );
    if (data.environment === "live" && !liveCheckoutAllowed()) {
      return { ok: false, error: "BotDiff Pro subscriptions aren't open yet." };
    }
    const { supabase, userId } = context;

    // Don't sell Pro to someone who already has it.
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", userId)
      .eq("environment", data.environment);
    if ((subs ?? []).some((s) => subscriptionGrantsPro(s))) {
      return { ok: false, error: "You already have BotDiff Pro." };
    }

    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      const price = prices.data[0];
      if (!price) return { ok: false, error: "That plan isn't available." };

      const { data: u } = await supabase.auth.getUser();
      const email = u.user?.email ?? undefined;
      const customerId = await resolveOrCreateCustomer(stripe, { userId, email });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        managed_payments: { enabled: true },
        metadata: { userId, managed_payments: "true" },
        subscription_data: { metadata: { userId } },
      } as Parameters<typeof stripe.checkout.sessions.create>[0]);
      return { ok: true, clientSecret: session.client_secret ?? "" };
    } catch (error) {
      console.error("[billing] checkout failed", getStripeErrorMessage(error));
      return { ok: false, error: getStripeErrorMessage(error) };
    }
  });

/** Opens Stripe's hosted billing page (cancel, payment method, invoices). */
export const createBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireVerifiedSession])
  .inputValidator((d: { environment: StripeEnv; returnUrl: string }) => ({
    environment: parseEnv(d.environment),
    returnUrl: new URL(d.returnUrl).toString(),
  }))
  .handler(async ({ data, context }): Promise<Result<{ url: string }>> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_customer_id) return { ok: false, error: "No subscription found." };
    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: data.returnUrl,
      });
      return { ok: true, url: portal.url };
    } catch (error) {
      return { ok: false, error: getStripeErrorMessage(error) };
    }
  });

/** Caller's latest subscription summary for Settings. */
export const getMySubscription = createServerFn({ method: "POST" })
  .middleware([requireVerifiedSession])
  .inputValidator((d: { environment: StripeEnv }) => ({ environment: parseEnv(d.environment) }))
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("status, price_id, current_period_end, cancel_at_period_end")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { subscription: sub ?? null };
  });

async function resolveOrCreateCustomer(
  stripe: import("stripe").default,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}
