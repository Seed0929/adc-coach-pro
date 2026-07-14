import {
  Trophy,
  ShieldAlert,
  Target,
  Flag,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Swords, Clock, Compass, Crown } from "lucide-react";
import { ChevronRight, Zap } from "lucide-react";
import { Pill } from "@/components/app-shell";
import { useRiotAssets } from "@/hooks/use-riot-assets";
import type {
  MatchCoachingReport,
  CoachAssessment,
  TrendItem,
} from "@/lib/coaching-engine";
import type { PhaseReview, PlanItem } from "@/lib/coaching/match-plan";
import type { CoachableEvent, ImpactLevel } from "@/lib/coaching/decision-chain";
import type { PowerSpikeItem, SpikeStatus } from "@/lib/coaching/power-spike";
import { formatSpikeTime } from "@/lib/coaching/power-spike";

function assessmentTone(c: CoachAssessment): "success" | "warning" | "danger" {
  return c === "Reliable read" ? "success" : c === "Solid read" ? "warning" : "danger";
}

function verdictTone(v: PhaseReview["verdict"]): string {
  return v === "good" ? "text-success" : v === "bad" ? "text-destructive" : "text-warning";
}

function spikeTone(s: SpikeStatus): "success" | "warning" | "danger" {
  return s === "ahead" ? "success" : s === "onTrack" ? "warning" : "danger";
}

function spikeStatusLabel(s: SpikeStatus): string {
  return s === "ahead" ? "Ahead of baseline" : s === "onTrack" ? "On baseline" : "Behind baseline";
}

function spikeDiffLabel(i: PowerSpikeItem): string {
  if (i.status === "onTrack") return "on time";
  const mag = Math.abs(i.differenceMinutes).toFixed(1);
  return i.differenceMinutes > 0 ? `${mag} min late` : `${mag} min early`;
}

function PowerSpikeRow({ i }: { i: PowerSpikeItem }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{i.itemName}</span>
        <Pill tone={spikeTone(i.status)}>{spikeStatusLabel(i.status)}</Pill>
      </div>
      <div className="grid grid-cols-2 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">You (est.)</div>
          <div className="font-display text-sm font-semibold text-foreground tabular-nums">{formatSpikeTime(i.purchaseMinute)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">Same rank</div>
          <div className="font-display text-sm font-semibold tabular-nums">{formatSpikeTime(i.targetMinute)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">High elo</div>
          <div className="font-display text-sm font-semibold tabular-nums">{formatSpikeTime(i.highEloMinute)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">Difference</div>
          <div className={`font-display text-sm font-semibold tabular-nums ${i.status === "ahead" ? "text-success" : i.status === "behind" ? "text-destructive" : "text-warning"}`}>
            {spikeDiffLabel(i)}
          </div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground/70">
        {i.confidence[0].toUpperCase() + i.confidence.slice(1)} confidence · coaching baseline, not a requirement
      </div>
    </div>
  );
}

function impactTone(i: ImpactLevel): "danger" | "warning" | "success" {
  return i === "high" ? "danger" : i === "medium" ? "warning" : "success";
}

function impactLabel(i: ImpactLevel): string {
  return i === "high" ? "High impact" : i === "medium" ? "Medium impact" : "Low impact";
}

// One coachable moment as a decision chain, ready for the future Replay Coach.
function TimelineEvent({ e }: { e: CoachableEvent }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-display text-sm font-semibold text-primary tabular-nums">{e.gameTime}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{e.category}</span>
        <Pill tone={impactTone(e.impact)}>{impactLabel(e.impact)}</Pill>
      </div>
      <div className="mb-2 text-sm font-medium">{e.decision}</div>

      {/* Decision → immediate → later → outcome */}
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {e.chain.map((link, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="rounded-lg bg-white/[0.04] px-2 py-1">{link}</span>
            {i < e.chain.length - 1 && <ChevronRight className="size-3 shrink-0 text-muted-foreground/60" />}
          </span>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground/80">Evidence: </span>
        {e.evidence}
      </p>

      {/* Learn More — detailed reasoning kept collapsed to reduce clutter. */}
      <details className="group mt-2">
        <summary className="cursor-pointer list-none text-xs font-medium text-primary">
          <span className="group-open:hidden">Learn more ▾</span>
          <span className="hidden group-open:inline">Show less ▴</span>
        </summary>
        <p className="mt-2 text-sm text-muted-foreground">{e.explanation}</p>
        <p className="mt-2 text-sm">
          <span className="font-medium text-foreground/80">Practice takeaway: </span>
          <span className="text-muted-foreground">{e.practiceTakeaway}</span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground/70">
          {e.replayAnchor.anchorReady
            ? "Replay anchor ready — jump to this moment."
            : "Replay anchor prepared — interactive replay navigation coming soon."}
        </p>
      </details>
    </div>
  );
}

function PhaseRow({ p }: { p: PhaseReview }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{p.phase}</span>
        <span className={`text-xs font-medium ${verdictTone(p.verdict)}`}>{p.headline}</span>
      </div>
      <p className="text-sm text-muted-foreground">{p.detail}</p>
    </div>
  );
}

function PlanRow({ item }: { item: PlanItem }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</div>
      <div className="text-sm font-medium">{item.value}</div>
      <p className="mt-1 text-sm text-muted-foreground">{item.why}</p>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  accent = "text-primary",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rise rounded-3xl p-6">
      <div className={`mb-4 flex items-center gap-2 text-sm font-semibold ${accent}`}>
        <Icon className="size-4" />
        <span className="uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  );
}

function TrendRow({ t }: { t: TrendItem }) {
  const Icon = t.direction === "up" ? TrendingUp : t.direction === "down" ? TrendingDown : Minus;
  const color = t.direction === "flat"
    ? "text-muted-foreground"
    : t.improved
      ? "text-success"
      : "text-destructive";
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3">
      <span className="text-sm text-muted-foreground">{t.label}</span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">{t.previous} →</span>
        <span className="font-display text-base font-semibold">{t.current}</span>
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
          <Icon className="size-3.5" />
          {t.change}
        </span>
      </div>
    </div>
  );
}

export function MatchCoachReport({ report }: { report: MatchCoachingReport }) {
  const { assets } = useRiotAssets();
  return (
    <div className="space-y-5">
      {/* Match summary */}
      <Card icon={Trophy} title="Match Summary">
        <div className="flex items-start gap-5">
          <img
            src={assets.championSquare(report.champion)}
            alt={report.champion}
            className="size-14 rounded-2xl object-cover ring-1 ring-white/10"
            loading="lazy"
          />
          <div className="text-center">
            <div className="font-display text-5xl font-semibold text-primary leading-none">
              {report.overallGrade}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Grade</div>
          </div>
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-medium">{report.champion}</span>
              <Pill tone={report.win ? "success" : "danger"}>
                {report.win ? "Victory" : "Defeat"}
              </Pill>
              <Pill tone={assessmentTone(report.coachAssessment)}>
                <Gauge className="size-3.5" /> {report.coachAssessment}
              </Pill>
            </div>
            <p className="text-sm text-foreground/90">{report.summary}</p>
            <p className="mt-2 text-xs text-muted-foreground">{report.assessmentReason}</p>
          </div>
        </div>
      </Card>

      {/* Today's Coaching Win — every review opens on something done well. */}
      {report.strengths.length > 0 && (
        <Card icon={Trophy} title="Today's Coaching Win" accent="text-success">
          <div className="rounded-2xl border border-success/25 bg-success/[0.08] p-5">
            <div className="mb-1 text-sm font-semibold text-success">{report.strengths[0].title}</div>
            <p className="text-sm text-muted-foreground">{report.strengths[0].why}</p>
          </div>
          {report.strengths.length > 1 && (
            <div className="mt-3 space-y-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">More you did well</p>
              {report.strengths.slice(1).map((s, i) => (
                <div key={i} className="rounded-2xl border border-success/20 bg-success/[0.06] p-4">
                  <div className="mb-1 text-sm font-medium text-success">{s.title}</div>
                  <p className="text-sm text-muted-foreground">{s.why}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Coachable Moments */}
      <Card icon={ShieldAlert} title="Coachable Moments" accent="text-warning">
        <div className="space-y-3">
          {report.mistakes.map((m, i) => (
            <div key={i} className="rounded-2xl border border-warning/20 bg-warning/[0.06] p-4">
              <div className="mb-2 text-sm font-medium text-warning">{m.title}</div>
              <dl className="space-y-1.5 text-sm">
                <div>
                  <dt className="inline font-medium text-foreground/80">What happened: </dt>
                  <dd className="inline text-muted-foreground">{m.what}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-foreground/80">Why it hurt: </dt>
                  <dd className="inline text-muted-foreground">{m.why}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-foreground/80">Next time: </dt>
                  <dd className="inline text-muted-foreground">{m.fix}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Priority improvement */}
        <Card icon={Target} title="Your Next Habit to Build">
          <div className="rounded-2xl bg-primary/[0.07] p-5">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="size-4" /> {report.priorityImprovement.title}
            </div>
            <p className="text-sm text-muted-foreground">{report.priorityImprovement.why}</p>
          </div>
        </Card>

        {/* Practice goal */}
        <Card icon={Flag} title="Practice Goal">
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-5">
            <ArrowRight className="size-5 shrink-0 text-primary" />
            <p className="text-sm font-medium">{report.practiceGoal}</p>
          </div>
        </Card>
      </div>

      {/* Full phase-by-phase review */}
      <Card icon={Swords} title="Full Match Review">
        <div className="grid gap-3 md:grid-cols-2">
          {report.plan.phases.map((p) => (
            <PhaseRow key={p.phase} p={p} />
          ))}
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Turning point */}
        <Card icon={Crown} title="Biggest Turning Point">
          <p className="text-sm text-muted-foreground">{report.plan.turningPoint}</p>
        </Card>
        {/* Win condition */}
        <Card icon={Compass} title="Win Condition">
          <p className="text-sm text-muted-foreground">{report.plan.winCondition}</p>
        </Card>
      </div>

      {/* Decision Chain timeline — how one decision influences the next. */}
      <Card icon={Clock} title="Match Timeline">
        <p className="mb-4 text-xs text-muted-foreground">
          How one decision led to the next. Times are approximate until interactive replay is connected.
        </p>
        <div className="space-y-3">
          {report.plan.timeline.events.map((e) => (
            <TimelineEvent key={e.id} e={e} />
          ))}
        </div>
      </Card>

      {/* Power Spike Timing — teaches decisions through item spike tempo (Sprint 1.9). */}
      <Card icon={Zap} title="Power Spike Timing" accent="text-primary">
        <p className="mb-3 text-sm font-medium">{report.plan.powerSpike.headline}</p>

        {/* Positive coaching first — celebrate good tempo before growth. */}
        {report.plan.powerSpike.positive && (
          <div className="mb-4 rounded-2xl border border-success/25 bg-success/[0.08] p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-success">
              <Trophy className="size-4" /> Good tempo
            </div>
            <p className="text-sm text-muted-foreground">{report.plan.powerSpike.positive}</p>
          </div>
        )}

        {/* Power spike timeline */}
        {report.plan.powerSpike.items.length > 0 ? (
          <div className="space-y-3">
            {report.plan.powerSpike.items.map((i) => (
              <PowerSpikeRow key={i.slot} i={i} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            The game ended before your first core power spike — the fastest improvement is reaching your first item sooner.
          </p>
        )}

        <p className="mt-3 text-xs text-muted-foreground/70">
          Timings are coaching baselines estimated from your economy — not rigid requirements. Purchase-accurate timing arrives once the match timeline is connected.
        </p>

        {/* Practice goal — exactly one habit at a time. */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-primary/[0.07] p-4">
          <Flag className="size-5 shrink-0 text-primary" />
          <p className="text-sm font-medium">{report.plan.powerSpike.practiceGoal}</p>
        </div>

        {/* Learn More — tempo, decisions and detailed reasoning kept collapsed. */}
        <details className="group mt-3">
          <summary className="cursor-pointer list-none text-xs font-medium text-primary">
            <span className="group-open:hidden">Learn more ▾</span>
            <span className="hidden group-open:inline">Show less ▴</span>
          </summary>

          {report.plan.powerSpike.tempoFactors.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Why your tempo landed here</p>
              <div className="space-y-2">
                {report.plan.powerSpike.tempoFactors.map((f, i) => (
                  <div key={i} className="rounded-2xl bg-white/[0.03] p-3">
                    <div className="text-sm font-medium">{f.cause}</div>
                    <p className="text-sm text-muted-foreground">{f.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">How this decision rippled forward</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {report.plan.powerSpike.decisionChain.map((link, i) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="rounded-lg bg-white/[0.04] px-2 py-1">{link}</span>
                  {i < report.plan.powerSpike.decisionChain.length - 1 && (
                    <ChevronRight className="size-3 shrink-0 text-muted-foreground/60" />
                  )}
                </span>
              ))}
            </div>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="inline font-medium text-foreground/80">Tempo: </dt><dd className="inline text-muted-foreground">{report.plan.powerSpike.learnMore.tempo}</dd></div>
            <div><dt className="inline font-medium text-foreground/80">Economy: </dt><dd className="inline text-muted-foreground">{report.plan.powerSpike.learnMore.economy}</dd></div>
            <div><dt className="inline font-medium text-foreground/80">Wave management: </dt><dd className="inline text-muted-foreground">{report.plan.powerSpike.learnMore.waveManagement}</dd></div>
            <div><dt className="inline font-medium text-foreground/80">Recall timing: </dt><dd className="inline text-muted-foreground">{report.plan.powerSpike.learnMore.recallTiming}</dd></div>
            <div><dt className="inline font-medium text-foreground/80">Objective prep: </dt><dd className="inline text-muted-foreground">{report.plan.powerSpike.learnMore.objectivePrep}</dd></div>
            <div><dt className="inline font-medium text-foreground/80">Decision relationships: </dt><dd className="inline text-muted-foreground">{report.plan.powerSpike.learnMore.decisionRelationships}</dd></div>
            <div><dt className="inline font-medium text-foreground/80">Expected impact: </dt><dd className="inline text-muted-foreground">{report.plan.powerSpike.learnMore.expectedImpact}</dd></div>
          </dl>
        </details>
      </Card>

      {/* Game plan — strategy for the matchup (not a build guide) */}
      <Card icon={Compass} title="Game Plan">
        <div className="mb-4 rounded-2xl bg-primary/[0.07] p-4">
          <p className="text-sm font-medium">{report.plan.gamePlan.matchupSummary}</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.plan.gamePlan.enemyThreats}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <PlanRow item={report.plan.gamePlan.summonerSpells} />
          <PlanRow item={report.plan.gamePlan.laneStrategy} />
          <PlanRow item={report.plan.gamePlan.tradingPattern} />
          <PlanRow item={report.plan.gamePlan.waveStrategy} />
          <PlanRow item={report.plan.gamePlan.recallTiming} />
          <PlanRow item={report.plan.gamePlan.midGame} />
          <PlanRow item={report.plan.gamePlan.teamfightRole} />
          <PlanRow item={report.plan.gamePlan.splitVsGroup} />
        </div>
      </Card>

      {/* Improvement history */}
      <Card icon={TrendingUp} title="Player Improvement History">
        {report.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This is your earliest analyzed match — play another game to unlock match-over-match trends.
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">Compared to your previous game.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {report.history.map((t) => (
                <TrendRow key={t.key} t={t} />
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
