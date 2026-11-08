import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2 } from "lucide-react";
import { useEntitlements } from "@/hooks/use-entitlements";
import { useAuth } from "@/hooks/use-auth";
import { getCheckoutStatus } from "@/lib/billing/billing.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" && /^cs_test_[a-zA-Z0-9]{1,240}$/.test(s.session_id) ? s.session_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Subscription verification — BotDiff" },
      { name: "description", content: "Verify your BotDiff test subscription status securely." },
      { property: "og:title", content: "Subscription verification — BotDiff" },
      { property: "og:description", content: "Verify your BotDiff test subscription status securely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id: sessionId } = Route.useSearch();
  const { refresh } = useEntitlements();
  const { isAuthenticated, mfaChallengeRequired } = useAuth();
  const check = useServerFn(getCheckoutStatus);
  const [state, setState] = useState("Waiting for subscription confirmation");
  const [activated, setActivated] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!sessionId || !isAuthenticated || mfaChallengeRequired) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const verify = async () => {
      try {
        const result = await check({ data: { sessionId } });
        if (stopped) return;
        if (!result.ok) { setState(result.error); return; }
        if (result.activated) { setActivated(true); await refresh(); return; }
        setState(result.status === "expired" ? "Checkout expired; no subscription activated." :
          result.status === "open" ? "Checkout is not complete." :
          result.paymentStatus === "unpaid" ? "Payment is pending. Pro is not active yet." :
          "Payment confirmed by Stripe; waiting for the secure subscription notification.");
        if (++attempts < 12 && result.status === "complete") timer = setTimeout(() => void verify(), 2500);
      } catch { if (!stopped) setState("Couldn't verify this purchase. Try again."); }
    };
    void verify();
    return () => { stopped = true; clearTimeout(timer); };
  }, [sessionId, isAuthenticated, mfaChallengeRequired, retry, check, refresh]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <div className="glass max-w-md rounded-3xl p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-semibold">
          {activated ? "BotDiff Pro is active" : "Verify your subscription"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {activated
            ? "Unlimited coaching reports and every Pro feature are unlocked."
            : !sessionId ? "No valid test checkout was supplied. This page cannot activate Pro." :
              !isAuthenticated || mfaChallengeRequired ? "Sign in and complete any authenticator challenge to verify your purchase." : state}
        </p>
        {!activated && isAuthenticated && sessionId && <Button variant="outline" className="mt-4" onClick={() => setRetry(v => v + 1)}>Check again</Button>}
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
