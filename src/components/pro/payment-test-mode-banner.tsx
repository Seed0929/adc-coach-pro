import { paymentsEnvironment } from "@/lib/stripe";

export function PaymentTestModeBanner() {
  const environment = paymentsEnvironment();
  if (environment === "live") return null;
  return <div role="status" className="w-full border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-sm text-warning">
    {environment === "sandbox" ? "Test payments only — no real money is charged." : "Subscriptions are not configured. No payments are accepted."}
  </div>;
}