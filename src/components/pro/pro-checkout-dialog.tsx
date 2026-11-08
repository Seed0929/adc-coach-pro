import { useCallback, useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createProCheckout } from "@/lib/billing/billing.functions";
import type { BillingCycle } from "@/lib/entitlements/plan";
import { getStripe, paymentsEnvironment } from "@/lib/stripe";

export function ProCheckoutDialog({
  cycle,
  onOpenChange,
}: {
  cycle: BillingCycle | null;
  onOpenChange: (open: boolean) => void;
}) {
  const start = useServerFn(createProCheckout);
  const env = paymentsEnvironment();
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    if (!cycle || env !== "sandbox") throw new Error("Test checkout unavailable");
    setError(null);
    try {
    const r = await start({
      data: {
        cycle,
        environment: env,
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      },
    });
    if (!r.ok) throw new Error(r.error);
    if (!r.clientSecret) throw new Error("Stripe did not return a checkout form.");
    return r.clientSecret;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout unavailable");
      throw e;
    }
  }, [cycle, env, start]);

  return (
    <Dialog open={Boolean(cycle)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>BotDiff Pro</DialogTitle>
          <DialogDescription>
            {env === "sandbox" ? "Test mode — use card 4242 4242 4242 4242. Nothing is charged." : "Secure checkout"}
          </DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {cycle && env === "sandbox" && (
          <EmbeddedCheckoutProvider key={cycle} stripe={getStripe()} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
