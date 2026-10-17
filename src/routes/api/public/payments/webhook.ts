import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

// Public route: security is the Stripe signature check on every request.
// Writes go through the privileged server client only.

function iso(sec: number | null | undefined) {
  return sec ? new Date(sec * 1000).toISOString() : null;
}

async function upsertSubscription(sub: any, env: StripeEnv) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const item = sub.items?.data?.[0];
  const priceId = item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id;
  const row = {
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    product_id: productId ?? "unknown",
    price_id: priceId ?? "unknown",
    status: sub.status,
    current_period_start: iso(item?.current_period_start ?? sub.current_period_start),
    current_period_end: iso(item?.current_period_end ?? sub.current_period_end),
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    environment: env,
  };
  const userId = sub.metadata?.userId;
  if (userId) {
    await supabaseAdmin
      .from("subscriptions")
      .upsert({ ...row, user_id: userId }, { onConflict: "stripe_subscription_id" });
  } else {
    await supabaseAdmin
      .from("subscriptions")
      .update(row)
      .eq("stripe_subscription_id", sub.id)
      .eq("environment", env);
  }
}

async function markCanceled(sub: any, env: StripeEnv) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const item = sub.items?.data?.[0];
  await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "canceled",
      current_period_end: iso(item?.current_period_end ?? sub.current_period_end),
    })
    .eq("stripe_subscription_id", sub.id)
    .eq("environment", env);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case "customer.subscription.created":
            case "customer.subscription.updated":
              await upsertSubscription(event.data.object, env);
              break;
            case "customer.subscription.deleted":
              await markCanceled(event.data.object, env);
              break;
            default:
              console.log("[billing] unhandled event", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("[billing] webhook error", e instanceof Error ? e.message : "unknown");
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
