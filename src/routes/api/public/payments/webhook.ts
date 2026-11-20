import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";
import { eventSubscriptionId } from "@/lib/billing/lifecycle";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: { handlers: { POST: async ({ request }) => {
    const env = new URL(request.url).searchParams.get("env");
    if (env !== "sandbox" && env !== "live") return new Response("Invalid environment", { status: 400 });
    const { verifyWebhook } = await import("@/lib/stripe.server");
    let event: Stripe.Event;
    try { event = await verifyWebhook(request, env); }
    catch { return new Response("Invalid signature or event", { status: 400 }); }
    try {
      const subscriptionId = eventSubscriptionId(event);
      if (!subscriptionId && ["invoice.paid", "invoice.payment_failed", "invoice.payment_action_required"].includes(event.type)) {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason?.startsWith("subscription")) throw new Error("Missing invoice subscription reference");
      }
      if (subscriptionId) {
        const { syncVerifiedSubscription } = await import("@/lib/billing/subscription-sync.server");
        await syncVerifiedSubscription(event, subscriptionId, env);
      }
      return Response.json({ received: true });
    } catch (error) {
      console.error("[billing] webhook persistence failed", event.id, error instanceof Error ? error.message : "unknown");
      return new Response("Billing processing failed; retry delivery", { status: 500 });
    }
  } } },
});
