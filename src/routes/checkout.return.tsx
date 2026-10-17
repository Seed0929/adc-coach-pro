import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { useEntitlements } from "@/hooks/use-entitlements";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Welcome to BotDiff Pro" },
      { name: "description", content: "Your BotDiff Pro subscription is being activated." },
      { property: "og:title", content: "Welcome to BotDiff Pro" },
      { property: "og:description", content: "Your BotDiff Pro subscription is being activated." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { refresh, isPro } = useEntitlements();
  useEffect(() => {
    // Pro is granted by the payment confirmation, which can lag a few seconds.
    const t = [1500, 4000, 8000].map((ms) => setTimeout(() => void refresh(), ms));
    return () => t.forEach(clearTimeout);
  }, [refresh]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <div className="glass max-w-md rounded-3xl p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-semibold">
          {isPro ? "BotDiff Pro is active" : "Payment received"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isPro
            ? "Unlimited coaching reports and every Pro feature are unlocked."
            : "We're confirming your subscription — Pro unlocks within a few seconds."}
        </p>
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
