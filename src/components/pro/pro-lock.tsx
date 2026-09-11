import { Lock, Sparkles } from "lucide-react";
import { Pill } from "@/components/app-shell";
import { UpgradeButton, UpgradeDialog } from "@/components/pro/upgrade-dialog";
import { useEntitlements } from "@/hooks/use-entitlements";
import { planLabel, resetLabel, type LockedInsight } from "@/lib/entitlements/plan";

/** Small plan badge — used in Settings and the upgrade surfaces. */
export function PlanBadge() {
  const { state } = useEntitlements();
  return (
    <Pill tone={state.plan === "pro" ? "primary" : "neutral"}>
      {state.plan === "pro" && <Sparkles className="size-3.5" />}
      {planLabel(state.plan)}
    </Pill>
  );
}

/**
 * Subtle free-allowance indicator. Deliberately quiet: one line, no counters
 * repeated across the app, and nothing at all for Pro members.
 */
export function FreeUsageMeter({ className = "" }: { className?: string }) {
  const { state, isPro, resolved } = useEntitlements();
  if (isPro || !resolved) return null;
  const { remaining, limit, resetsAt } = state.fullReports;
  return (
    <div className={`text-[11px] text-muted-foreground ${className}`}>
      <span className="font-mono uppercase tracking-[0.15em] text-foreground/60">Free coaching</span>{" "}
      · {remaining} of {limit} full reports remaining this week
      {resetLabel(resetsAt) ? ` · ${resetLabel(resetsAt).toLowerCase()}` : ""}
    </div>
  );
}

/**
 * Locked cross-match pattern. The full analysis is withheld on the server —
 * only the area and the player's own observed game count reach the browser.
 */
export function LockedInsightCard({ insight }: { insight: LockedInsight }) {
  return (
    <UpgradeDialog
      trigger={
        <button
          type="button"
          className="glass w-full rounded-2xl p-5 text-left transition-colors hover:bg-white/[0.05]"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="min-w-0 truncate font-medium">{insight.title}</span>
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary">
              <Lock className="size-3" /> Pro
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{insight.preview}</p>
          <p className="mt-2 text-[11px] text-primary">Unlock the full pattern analysis with Pro</p>
        </button>
      }
    />
  );
}

/**
 * The "BotDiff detected N additional recurring patterns" block. Renders only
 * when the server actually withheld something, so Free members are not shown
 * upgrade prompts on pages where there is nothing more to see.
 */
export function LockedInsights({
  insights,
  total,
}: {
  insights: LockedInsight[] | undefined;
  total: number | undefined;
}) {
  const { isPro } = useEntitlements();
  if (isPro || !insights || insights.length === 0) return null;
  const count = total ?? insights.length;
  const extra = count - insights.length;

  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            Cross-match intelligence
          </div>
          <h3 className="font-display text-lg font-semibold">
            BotDiff detected {count} additional recurring {count === 1 ? "pattern" : "patterns"}{" "}
            across your recent games
          </h3>
        </div>
        <UpgradeButton label="Unlock my coaching plan" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((i) => (
          <LockedInsightCard key={i.id} insight={i} />
        ))}
      </div>
      {extra > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          +{extra} more detected {extra === 1 ? "pattern" : "patterns"} in your Pro coaching plan.
        </p>
      )}
    </section>
  );
}

/**
 * Shown in place of a match coaching report when a Free member has used their
 * included reports. Their match data and previous reports are untouched.
 */
export function AllowanceExhausted({
  resetsAt,
  limit,
}: {
  resetsAt: string | null;
  limit: number;
}) {
  return (
    <div className="glass relative overflow-hidden rounded-3xl p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/20 blur-[90px]" />
      <div className="relative">
        <Pill tone="primary">
          <Lock className="size-3.5" /> Free coaching used
        </Pill>
        <h2 className="mt-3 font-display text-2xl font-semibold leading-snug">
          You've used your {limit} full coaching reports this week
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Your matches keep syncing and everything BotDiff already wrote for you stays available.
          Your next free coaching reports unlock when your allowance resets
          {resetLabel(resetsAt) ? ` — ${resetLabel(resetsAt).toLowerCase()}` : ""}.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Want BotDiff coaching after every game?</p>
        <div className="mt-4">
          <UpgradeButton label="Explore BotDiff Pro" />
        </div>
      </div>
    </div>
  );
}
