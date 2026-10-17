import { useCallback } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createProCheckout } from "@/lib/billing/billing.functions";
import type { ProPriceId } from "@/lib/billing/billing-status";
import { getStripe, paymentsEnvironment } from "@/lib/stripe";

export function ProCheckoutDialog({
  priceId,
  onOpenChange,
}: {
  priceId: ProPriceId | null;
  onOpenChange: (open: boolean) => void;
}) {
  const start = useServerFn(createProCheckout);
  const env = paymentsEnvironment();

  const fetchClientSecret = useCallback(async () => {
    if (!priceId || !env) throw new Error("Checkout unavailable");
    const r = await start({
      data: {
        priceId,
        environment: env,
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      },
    });
    if (!r.ok) throw new Error(r.error);
    return r.clientSecret;
  }, [priceId, env, start]);

  return (
    <Dialog open={Boolean(priceId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>BotDiff Pro</DialogTitle>
          <DialogDescription>
            {env === "sandbox" ? "Test mode — use card 4242 4242 4242 4242. Nothing is charged." : "Secure checkout"}
          </DialogDescription>
        </DialogHeader>
        {priceId && (
          <EmbeddedCheckoutProvider key={priceId} stripe={getStripe()} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
