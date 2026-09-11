import { Lock, Sparkles } from "lucide-react";
import { Pill } from "@/components/app-shell";
import { UpgradeButton, UpgradeDialog } from "@/components/pro/upgrade-dialog";
import { useEntitlements } from "@/hooks/use-entitlements";
import {
  planLabel,
  resetLabel,
  resetDateLabel,
  resetCountdownLabel,
  PRO_CONTEXT_NOTES,
  type ProContextSurface,
  type LockedInsight,
} from "@/lib/entitlements/plan";

/** Small plan badge — used in Settings and the upgrade surfaces. */
export function PlanBadge() {
  const { state, isPro } = useEntitlements();
  return (
    <Pill tone={isPro ? "primary" : "neutral"}>
      {isPro && <Sparkles className="size-3.5" />}
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
 * The clear weekly-allowance card: real counts and the real calculated reset
 * date, never a fake countdown. Free members only; Pro sees nothing.
 */
export function FreeAllowanceCard({ className = "" }: { className?: string }) {
  const { state, isPro, resolved } = useEntitlements();
  if (isPro || !resolved) return null;
  const { used, remaining, limit, resetsAt } = state.fullReports;
  const empty = remaining === 0;
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <section className={`glass relative overflow-hidden rounded-2xl p-5 ${className}`}>
      <div className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-primary/12 blur-[80px]" />
      <div className="relative flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            Free coaching
          </div>
          <div className="mt-1 font-display text-lg font-semibold">
            {remaining} / {limit} reports remaining this week
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {empty
              ? "Your existing reports remain available, and your matches keep syncing."
              : "A full BotDiff coaching report — the same coaching Pro members read."}
            {resetDateLabel(resetsAt)
              ? ` Reset: ${resetDateLabel(resetsAt)} (${resetCountdownLabel(resetsAt)}).`
              : ""}
          </p>
          <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <UpgradeButton label={empty ? "See what Pro adds" : "What Pro adds"} />
      </div>
    </section>
  );
}

/**
 * One short line explaining what Pro adds on THIS page, at the moment the extra
 * capability is relevant. Hidden for Pro members.
 */
export function ProContextNote({
  surface,
  className = "",
}: {
  surface: ProContextSurface;
  className?: string;
}) {
  const { isPro } = useEntitlements();
  if (isPro) return null;
  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Pro</span>{" "}
      {PRO_CONTEXT_NOTES[surface]}
    </p>
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
          className="glass group relative w-full overflow-hidden rounded-2xl border border-primary/20 p-5 text-left transition-colors hover:bg-primary/[0.05]"
        >
          <div className="pointer-events-none absolute -right-10 -top-14 size-36 rounded-full bg-primary/15 blur-[70px]" />
          <div className="relative">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                Pro · Long-term pattern
              </span>
              <Lock className="size-3 shrink-0 text-primary/80" />
            </div>
            <div className="truncate font-medium">{insight.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{insight.preview}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
              Unlock with BotDiff Pro
            </span>
          </div>
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
