// ---------------------------------------------------------------------------
// Your Personalized Coaching Plan — the ONE authoritative coaching surface.
//
// Priority #1 gets the full treatment (issue, evidence, why, target, baseline,
// practice actions, success measure, evaluation window, progress). #2 and #3 are
// previews only, so the player always knows what they are working on right now.
// Other panels must reference this plan, never restate it.
// ---------------------------------------------------------------------------
import { Flag, ListChecks, Target } from "lucide-react";
import { Pill } from "@/components/app-shell";
import type {
  CoachingPlan,
  CoachingPlanEntry,
  PerformanceConsistency,
} from "@/lib/coaching/performance-intelligence-v1";
import { EVIDENCE_LABEL_COPY } from "@/lib/coaching/performance-intelligence-v1";

const SLOT_LABEL: Record<CoachingPlanEntry["slot"], string> = {
  active: "Priority #1 · Fix now",
  next: "Priority #2 · Next",
  later: "Priority #3 · Later",
};

function ProgressBar({ progress }: { progress: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>Progress toward your target</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ActivePriority({ entry }: { entry: CoachingPlanEntry }) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-primary">{SLOT_LABEL.active}</span>
        <Pill tone="warning">{entry.scopeLabel}</Pill>
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight">{entry.issueLabel}</h3>
      <p className="mt-1 text-sm text-foreground/90">{entry.headline}</p>

      <div className="mt-4">
        <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
          Why it matters
        </div>
        <p className="text-sm text-muted-foreground">{entry.whyItMatters}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-white/[0.03] p-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Your baseline</div>
          <div className="font-display text-lg font-semibold tabular-nums">
            {entry.baseline}
            {entry.unit}
          </div>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Coach target</div>
          {entry.target ? (
            <div className="font-display text-lg font-semibold tabular-nums text-primary">
              {entry.target.value}
              {entry.target.unit}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Not enough games yet for a target you have already proven — BotDiff is still watching.
            </p>
          )}
        </div>
      </div>

      {entry.target && (
        <div className="mt-4 space-y-2">
          <div className="text-sm text-foreground/90">{entry.target.journey}</div>
          <ProgressBar progress={entry.target.progress} />
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground/80">Success looks like:</span>{" "}
            {entry.target.successMeasure}
          </p>
          <p className="text-xs text-muted-foreground">{entry.target.evaluationWindow}</p>
        </div>
      )}

      {entry.evidence.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Evidence</div>
          <ul className="space-y-2">
            {entry.evidence.map((e, i) => (
              <li key={i} className="text-xs leading-relaxed text-muted-foreground">
                <span className="mr-1.5 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-foreground/70">
                  {EVIDENCE_LABEL_COPY[e.label]}
                </span>
                {e.statement}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entry.practiceActions.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <ListChecks className="size-3.5" /> Practice this
          </div>
          <ul className="space-y-2">
            {entry.practiceActions.map((a, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-primary/15 text-[10px] font-semibold text-primary">
                  {i + 1}
                </span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entry.consistency?.available && (
        <p className="mt-4 text-xs text-muted-foreground">
          <span className="text-foreground/80">Performance consistency:</span>{" "}
          {entry.consistency.summary}
        </p>
      )}
    </div>
  );
}

function QueuedPriority({ entry }: { entry: CoachingPlanEntry }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-4">
      <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
        {SLOT_LABEL[entry.slot]}
      </div>
      <div className="text-sm font-medium">{entry.issueLabel}</div>
      <p className="mt-1 text-xs text-muted-foreground">{entry.headline}</p>
      <p className="mt-1.5 text-xs text-muted-foreground/80">
        Waiting its turn — BotDiff coaches one habit at a time.
      </p>
    </div>
  );
}

export function CoachingPlanPanel({ plan }: { plan: CoachingPlan }) {
  const [active, ...queued] = plan.queue;
  return (
    <div className="space-y-4">
      {plan.note && <p className="text-sm text-muted-foreground">{plan.note}</p>}
      {active && <ActivePriority entry={active} />}
      {queued.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {queued.map((e) => (
            <QueuedPriority key={`${e.metric}-${e.scopeId}`} entry={e} />
          ))}
        </div>
      )}
      {plan.history.length > 0 && (
        <div className="rounded-2xl bg-white/[0.03] p-4">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Flag className="size-3.5" /> Completed focuses
          </div>
          <ul className="space-y-1.5">
            {plan.history.slice(0, 5).map((h, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-2 text-xs text-muted-foreground">
                <span className="text-foreground/90">{h.issueLabel}</span>
                <span className="tabular-nums">{h.journey}</span>
                <span className="text-muted-foreground/70">
                  {h.scopeLabel} · {h.sampleSize} games
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Plain-language consistency — no abstract 0-100 scores. */
export function PerformanceConsistencyPanel({
  readings,
}: {
  readings: PerformanceConsistency[];
}) {
  if (readings.length === 0) {
    return <p className="text-sm text-muted-foreground">Not enough games yet.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {readings.map((r) => (
        <div key={r.metric} className="rounded-2xl bg-white/[0.03] p-4">
          <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{r.name}</div>
          {r.available && r.typicalRange ? (
            <>
              <div className="font-display text-lg font-semibold tabular-nums">
                {r.average}
                {r.unit}
              </div>
              <p className="text-xs text-muted-foreground">
                Typically {r.typicalRange.low}
                {r.unit} – {r.typicalRange.high}
                {r.unit}
              </p>
              <p className="mt-1 text-xs text-foreground/80">{r.classification}</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{r.note}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/** One-line pointer other panels use instead of repeating the plan. */
export function ActiveFocusNote({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <Target className="mt-0.5 size-3.5 shrink-0 text-primary" />
      {text}
    </p>
  );
}
