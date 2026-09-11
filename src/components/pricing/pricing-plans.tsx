import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Sparkles, ArrowRight, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pill } from "@/components/app-shell";
import { trackBetaEvent, BETA_EVENTS } from "@/lib/analytics/beta-analytics";
import {
  COACHING_LOOP,
  FREE_PLAN_POINTS,
  PRICING,
  PRICING_FAQ,
  PRICING_HEADLINE,
  PRICING_SUBHEAD,
  PRO_COMING_SOON,
  PRO_PLAN_POINTS,
  annualMonthlyEquivalent,
  annualSavingsPercent,
  type BillingCycle,
} from "@/lib/entitlements/plan";

/**
 * Presentation-only pricing. No checkout, no payment fields, no fake purchase:
 * the Pro CTA opens an honest "coming soon" panel. Nothing on this page can
 * change an entitlement — plan access is resolved server-side from the database.
 */

function ProComingSoonDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 bg-background/95 sm:max-w-md">
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/20 blur-[80px]" />
        <DialogHeader className="relative text-left">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            BotDiff Pro
          </div>
          <DialogTitle className="font-display text-2xl font-semibold leading-snug">
            {PRO_COMING_SOON.title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {PRO_COMING_SOON.body}
          </DialogDescription>
        </DialogHeader>
        <div className="relative mt-2 flex flex-wrap gap-2">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Continue with Free <ArrowRight className="size-4" />
          </Link>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-white/[0.06]"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlanPoints({ points, accent }: { points: readonly string[]; accent?: boolean }) {
  return (
    <ul className="mt-5 space-y-2.5 text-sm">
      {points.map((p) => (
        <li key={p} className="flex items-start gap-2.5">
          <Check
            className={`mt-0.5 size-4 shrink-0 ${accent ? "text-primary" : "text-foreground/50"}`}
          />
          <span className={accent ? "" : "text-muted-foreground"}>{p}</span>
        </li>
      ))}
    </ul>
  );
}

function FreeCard({ cta }: { cta: ReactNode }) {
  return (
    <section className="glass flex flex-col rounded-3xl border border-white/[0.08] p-6 md:p-7">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/60">
        BotDiff Free
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="font-display text-4xl font-semibold">{PRICING.free.price}</span>
        <span className="pb-1 text-sm text-muted-foreground">{PRICING.free.cadence}</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Real BotDiff coaching on your own matches, every week.
      </p>
      <PlanPoints points={FREE_PLAN_POINTS} />
      <div className="mt-6 flex-1" />
      {cta}
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        No credit card required.
      </p>
    </section>
  );
}

function ProCard() {
  const [cycle, setCycle] = useState<BillingCycle>("annual");
  const [comingSoon, setComingSoon] = useState(false);
  const annual = cycle === "annual";

  return (
    <section className="glass relative flex flex-col overflow-hidden rounded-3xl border border-primary/30 p-6 md:p-7">
      <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-primary/20 blur-[100px]" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            BotDiff Pro
          </div>
          <Pill tone="primary">
            <Sparkles className="size-3.5" /> Complete coaching
          </Pill>
        </div>

        <div
          role="group"
          aria-label="Billing cycle"
          className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1"
        >
          {(["annual", "monthly"] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={cycle === c}
              onClick={() => setCycle(c)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
                cycle === c ? "bg-primary/15 text-primary" : "text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <span className="font-display text-4xl font-semibold">
            {annual ? PRICING.annual.price : PRICING.monthly.price}
          </span>
          <span className="pb-1 text-sm text-muted-foreground">
            {annual ? PRICING.annual.cadence : PRICING.monthly.cadence}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {annual
            ? `≈ ${annualMonthlyEquivalent()} / month · save about ${annualSavingsPercent()}% with annual billing`
            : `Or ${PRICING.annual.price} / year (≈ ${annualMonthlyEquivalent()} / month)`}
        </p>

        <PlanPoints points={PRO_PLAN_POINTS} accent />

        <div className="mt-6">
          <button
            type="button"
            onClick={() => {
              trackBetaEvent(BETA_EVENTS.proInterestClicked, { surface: "pricing" });
              setComingSoon(true);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
          >
            Get BotDiff Pro <ArrowRight className="size-4" />
          </button>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
            <Lock className="size-3" /> Subscriptions aren't open yet — nothing is charged today.
          </p>
        </div>
      </div>
      <ProComingSoonDialog open={comingSoon} onOpenChange={setComingSoon} />
    </section>
  );
}

/** Headline + both plan cards + FAQ. Reused by the pricing route. */
export function PricingSection({ freeCta }: { freeCta: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 md:py-16">
      <div className="max-w-3xl">
        <Pill tone="primary">
          <Sparkles className="size-3.5" /> BotDiff pricing
        </Pill>
        <h1 className="mt-5 font-display text-3xl font-semibold leading-[1.12] tracking-tight md:text-5xl">
          {PRICING_HEADLINE}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
          {PRICING_SUBHEAD}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/50">
          {COACHING_LOOP.map((step, i) => (
            <span key={step} className="flex items-center gap-2">
              {i > 0 && <span className="text-primary/60">→</span>}
              {step}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <FreeCard cta={freeCta} />
        <ProCard />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Your BotDiff subscription pays for BotDiff's own coaching, analysis and practice system —
        not for Riot's data. BotDiff is not endorsed by Riot Games.
      </p>

      <div className="mt-12">
        <h2 className="font-display text-2xl font-semibold">Questions</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {PRICING_FAQ.map((item) => (
            <div key={item.q} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
              <div className="text-sm font-medium">{item.q}</div>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
