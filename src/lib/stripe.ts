import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { PLAN_CONFIG } from "@/lib/entitlements/plan";

type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function paymentsEnvironment(): StripeEnv | null {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  return null;
}

/**
 * Checkout is offered only in test mode, or in live mode once launch is
 * explicitly approved (PLAN_CONFIG.paymentsEnabled). The server re-checks.
 */
export function checkoutAvailable(): boolean {
  const env = paymentsEnvironment();
  return env === "sandbox" || (env === "live" && PLAN_CONFIG.paymentsEnabled);
}

let stripePromise: Promise<Stripe | null> | null = null;
export function getStripe(): Promise<Stripe | null> {
  if (!paymentsEnvironment()) throw new Error("Payments are not configured for this build.");
  if (!stripePromise) stripePromise = loadStripe(clientToken as string);
  return stripePromise;
}
