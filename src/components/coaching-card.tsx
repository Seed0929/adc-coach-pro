import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ChevronDown, Clock, ArrowRight, type LucideIcon } from "lucide-react";

export type CardTone = "neutral" | "primary" | "success" | "warning" | "danger";

const toneRing: Record<CardTone, string> = {
  neutral: "bg-white/[0.05] text-muted-foreground",
  primary: "bg-primary/12 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
};

/**
 * Progressive coaching card — the standard interaction pattern across BotDiff.
 *
 * Layer 1: always-visible summary (the single highest-value takeaway).
 * Layer 2: "Learn More" expands rich detail inside the card — never a modal,
 *          never a navigation. Stays connected to the parent card.
 * Layer 3: "View Full Analysis" links to a dedicated deep-dive page.
 *
 * An estimated read time helps players decide what to read between games.
 */
export function CoachingCard({
  icon: Icon,
  tone = "primary",
  eyebrow,
  title,
  summary,
  readTime,
  headerRight,
  children,
  learnMoreLabel = "Learn More",
  fullAnalysisTo,
  fullAnalysisParams,
  fullAnalysisLabel = "View Full Analysis",
  defaultOpen = false,
  className = "",
  style,
}: {
  icon?: LucideIcon;
  tone?: CardTone;
  eyebrow?: string;
  title: ReactNode;
  summary?: ReactNode;
  readTime?: string;
  headerRight?: ReactNode;
  /** Layer 2 content, revealed by Learn More. */
  children?: ReactNode;
  learnMoreLabel?: string;
  /** Layer 3 destination route. */
  fullAnalysisTo?: string;
  fullAnalysisParams?: Record<string, string>;
  fullAnalysisLabel?: string;
  defaultOpen?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasMore = Boolean(children);

  return (
    <section className={`glass overflow-hidden rounded-3xl ${className}`} style={style}>
      <div className="p-6">
        {/* Layer 1 — summary */}
        <div className="flex items-start gap-4">
          {Icon && (
            <span className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl ${toneRing[tone]}`}>
              <Icon className="size-[18px]" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {eyebrow && (
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
                  {eyebrow}
                </span>
              )}
              {readTime && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] text-muted-foreground">
                  <Clock className="size-3" /> {readTime}
                </span>
              )}
              {headerRight && <span className="ml-auto">{headerRight}</span>}
            </div>
            <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug tracking-tight md:text-xl">
              {title}
            </h3>
            {summary && (
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{summary}</div>
            )}
          </div>
        </div>

        {/* Layer 2 — expandable detail */}
        {hasMore && (
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
              open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div className="mt-5 space-y-4 border-t border-white/[0.06] pt-5 text-sm">
                {children}
              </div>
            </div>
          </div>
        )}

        {/* Actions row */}
        {(hasMore || fullAnalysisTo) && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {hasMore && (
              <button
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.07]"
              >
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform duration-300 ${
                    open ? "rotate-180" : ""
                  }`}
                />
                {open ? "Show less" : learnMoreLabel}
              </button>
            )}
            {fullAnalysisTo && (
              <Link
                to={fullAnalysisTo as never}
                params={fullAnalysisParams as never}
                className="group inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.08] px-3.5 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
              >
                {fullAnalysisLabel}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** Small labelled field used inside Layer 2 detail blocks. */
export function CardField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}