import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { useEntitlements } from "@/hooks/use-entitlements";
import { planLabel, resetLabel } from "@/lib/entitlements/plan";
import { UpgradeDialog } from "@/components/pro/upgrade-dialog";
import { createBillingPortal, getMySubscription } from "@/lib/billing/billing.functions";
import { paymentsEnvironment } from "@/lib/stripe";

/** Shown only when the player actually has a subscription on record. */
function ManageBillingButton() {
  const getSub = useServerFn(getMySubscription);
  const openPortal = useServerFn(createBillingPortal);
  const [sub, setSub] = useState<{
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const env = typeof window === "undefined" ? null : paymentsEnvironment();

  useEffect(() => {
    if (!env) return;
    getSub({ data: { environment: env } })
      .then((r) => setSub(r.subscription))
      .catch(() => setSub(null));
  }, [env, getSub]);

  if (!env || !sub) return null;
  const ends = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : null;

  return (
    <div className="flex items-center gap-2">
      {sub.cancel_at_period_end && ends && (
        <span className="text-xs text-muted-foreground">Pro ends {ends}</span>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await openPortal({ data: { environment: env, returnUrl: window.location.href } }).catch(
            () => ({ ok: false as const, error: "Couldn't open billing right now." }),
          );
          setBusy(false);
          if (!r.ok) toast.error(r.error);
          else window.open(r.url, "_blank");
        }}
        className="rounded-full border border-white/10 px-4 py-2 text-sm transition-colors hover:bg-white/[0.06] disabled:opacity-60"
      >
        Manage billing
      </button>
    </div>
  );
}

/**
 * Account plan row for Settings. Includes a development-only Free/Pro switch
 * that the server refuses for normal production users.
 */
export function PlanSettings() {
  const { state, isPro, isOwner, switchPlan, loading } = useEntitlements();
  const [busy, setBusy] = useState(false);

  async function change(plan: "free" | "pro") {
    setBusy(true);
    const error = await switchPlan(plan);
    setBusy(false);
    if (error) toast.error(error);
    else toast.success(`Now viewing ${planLabel(plan)}`);
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{isOwner ? "Owner Access" : "Current Plan"}</div>
          <div className="text-sm text-muted-foreground">
            {planLabel(state.plan)}
            {isOwner && " · full access, no allowance"}
            {!isPro && ` · ${state.fullReports.limit} coaching reports/week`}
            {!isPro && state.fullReports.limit > 0 && (
              <>
                {" · "}
                {state.fullReports.remaining} of {state.fullReports.limit} full coaching reports left
                {resetLabel(state.fullReports.resetsAt)
                  ? ` · ${resetLabel(state.fullReports.resetsAt).toLowerCase()}`
                  : ""}
              </>
            )}
          </div>
        </div>
        {!isPro && (
          <Link
            to="/pricing"
            className="rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
        )}
        {!isOwner && <ManageBillingButton />}
        <UpgradeDialog
          trigger={
            <button
              type="button"
              className="rounded-full border border-white/10 px-4 py-2 text-sm transition-colors hover:bg-white/[0.06]"
            >
              {isPro ? "What Pro includes" : "Explore Pro"}
            </button>
          }
        />
      </div>

      {state.devToggleAvailable && (
        <div className="mt-4 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] p-3">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-warning">
            <FlaskConical className="size-3" /> Internal · payments not yet enabled
          </div>
          {isOwner && (
            <p className="mb-2 text-[11px] text-muted-foreground">
              Owner access always applies, so this switch won't restrict your account.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {(["free", "pro"] as const).map((p) => (
              <button
                key={p}
                type="button"
                disabled={busy || loading}
                onClick={() => change(p)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                  state.plan === p
                    ? "bg-primary/15 text-primary"
                    : "border border-white/10 text-muted-foreground hover:bg-white/[0.06]"
                }`}
              >
                View as {planLabel(p)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
