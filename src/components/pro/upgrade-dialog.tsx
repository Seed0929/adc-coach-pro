import { useState, type ReactNode } from "react";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { trackBetaEvent, BETA_EVENTS } from "@/lib/analytics/beta-analytics";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEntitlements } from "@/hooks/use-entitlements";
import {
  FREE_SUMMARY,
  PRO_FEATURES,
  PRO_SUMMARY,
  PRICING,
  annualMonthlyEquivalent,
  annualSavingsPercent,
  planLabel,
  resetLabel,
} from "@/lib/entitlements/plan";

/**
 * The BotDiff Pro upgrade experience. Real billing is NOT connected: this
 * surface shows no price and never collects payment details.
 */
export function UpgradeDialog({
  trigger,
  open,
  onOpenChange,
}: {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const { state, isPro } = useEntitlements();
  const [internal, setInternal] = useState(false);
  const controlled = open !== undefined;
  const isOpen = controlled ? open : internal;
  const setOpen = controlled ? (onOpenChange ?? (() => {})) : setInternal;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="glass max-h-[90vh] overflow-y-auto border-white/10 bg-background/95 sm:max-w-2xl">
        <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-primary/20 blur-[90px]" />
        <DialogHeader className="relative text-left">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            BotDiff Pro
          </div>
          <DialogTitle className="font-display text-2xl font-semibold leading-snug md:text-3xl">
            Turn BotDiff into your personal coach
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Free shows you what BotDiff can see. Pro follows your improvement across every game.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-sm font-semibold">BotDiff Free</div>
            <p className="mt-1 text-xs text-muted-foreground">{FREE_SUMMARY}</p>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <li>Riot sync, match history and real game statistics</li>
              <li>Today's Focus with the evidence behind it</li>
              <li>
                {state.fullReports.limit} full match coaching reports per week
                {state.fullReports.unlimited
                  ? ""
                  : ` · ${state.fullReports.remaining} left${
                      resetLabel(state.fullReports.resetsAt)
                        ? ` · ${resetLabel(state.fullReports.resetsAt).toLowerCase()}`
                        : ""
                    }`}
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="size-4" /> BotDiff Pro
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{PRO_SUMMARY}</p>
            <ul className="mt-3 space-y-1.5 text-xs">
              {PRO_FEATURES.slice(0, 4).map((f) => (
                <li key={f.title} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span className="font-medium">{f.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative mt-2 grid gap-2 sm:grid-cols-2">
          {PRO_FEATURES.slice(4).map((f) => (
            <div key={f.title} className="rounded-xl bg-white/[0.03] p-3">
              <div className="text-xs font-medium">{f.title}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{f.detail}</div>
            </div>
          ))}
        </div>

        <p className="relative mt-1 text-[11px] text-muted-foreground">
          Pro is BotDiff's own analysis, coaching continuity and practice system — never a charge
          for Riot's own data. Every insight stays evidence-first: if BotDiff can't see it, it says
          so.
        </p>

        <div className="relative mt-2 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg font-semibold">
              {PRICING.annual.price} {PRICING.annual.cadence}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ≈ {annualMonthlyEquivalent()} / month
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Or {PRICING.monthly.price} {PRICING.monthly.cadence} · save about{" "}
              {annualSavingsPercent()}% annually.{" "}
              {isPro
                ? `You're on ${planLabel("pro")}.`
                : "Subscriptions aren't open yet — nothing is charged today."}
            </div>
          </div>
          <Link
            to="/pricing"
            onClick={() => {
              trackBetaEvent(BETA_EVENTS.upgradeClicked, { surface: "upgrade-dialog" });
              setOpen(false);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            See pricing <ArrowRight className="size-4" />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Standard "see what Pro unlocks" button, styled for the existing surfaces. */
export function UpgradeButton({
  label = "See what Pro unlocks",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <UpgradeDialog
      trigger={
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15 ${className}`}
        >
          {label}
          <ArrowRight className="size-3.5" />
        </button>
      }
    />
  );
}
