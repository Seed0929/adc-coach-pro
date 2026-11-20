import { useEffect, useState } from "react";
import { checkoutAvailable, paymentsEnvironment } from "@/lib/stripe";

export function PaymentTestModeBanner() {
  const environment = paymentsEnvironment();
  // "Test payments" is only claimed on approved preview addresses, where test checkout really works.
  const [testHost, setTestHost] = useState(false);
  useEffect(() => setTestHost(checkoutAvailable()), []);
  if (environment === "live") return null;
  return <div role="status" className="w-full border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-sm text-warning">
    {environment === "sandbox" && testHost ? "Test payments only — no real money is charged." : "Subscriptions are not configured. No payments are accepted."}
  </div>;
}
