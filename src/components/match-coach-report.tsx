import {
  Trophy,
  ThumbsUp,
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
import {
  Swords,
  Clock,
  Compass,
  Wrench,
  MapPin,
  Crown,
} from "lucide-react";
import { Pill } from "@/components/app-shell";
import { useRiotAssets } from "@/hooks/use-riot-assets";
import type {
  MatchCoachingReport,
  CoachAssessment,
  TrendItem,
} from "@/lib/coaching-engine";
import type { PhaseReview, PlanItem } from "@/lib/coaching/match-plan";

function assessmentTone(c: CoachAssessment): "success" | "warning" | "danger" {
  return c === "Reliable read" ? "success" : c === "Solid read" ? "warning" : "danger";
}

function verdictTone(v: PhaseReview["verdict"]): string {
  return v === "good" ? "text-success" : v === "bad" ? "text-destructive" : "text-warning";
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

      {/* Strengths */}
      <Card icon={ThumbsUp} title="3 Biggest Strengths" accent="text-success">
        <div className="space-y-3">
          {report.strengths.map((s, i) => (
            <div key={i} className="rounded-2xl border border-success/20 bg-success/[0.06] p-4">
              <div className="mb-1 text-sm font-medium text-success">{s.title}</div>
              <p className="text-sm text-muted-foreground">{s.why}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Mistakes */}
      <Card icon={ShieldAlert} title="3 Biggest Mistakes" accent="text-destructive">
        <div className="space-y-3">
          {report.mistakes.map((m, i) => (
            <div key={i} className="rounded-2xl border border-destructive/20 bg-destructive/[0.06] p-4">
              <div className="mb-2 text-sm font-medium text-destructive">{m.title}</div>
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
                  <dt className="inline font-medium text-foreground/80">Do differently: </dt>
                  <dd className="inline text-muted-foreground">{m.fix}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Priority improvement */}
        <Card icon={Target} title="Priority Improvement">
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

      {/* Mistake timeline */}
      <Card icon={Clock} title="Mistake Timeline">
        <div className="space-y-3">
          {report.plan.mistakeTimeline.map((t, i) => (
            <div key={i} className="rounded-2xl bg-white/[0.03] p-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">{t.when}</div>
              <div className="text-sm">{t.what}</div>
              <p className="mt-1 text-sm text-muted-foreground">Fix: {t.fix}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Build & Matchup coach */}
      <Card icon={Wrench} title="Recommended Build & Game Plan">
        <div className="mb-4 rounded-2xl bg-primary/[0.07] p-4">
          <p className="text-sm font-medium">{report.plan.gamePlan.matchupSummary}</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.plan.gamePlan.enemyThreats}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <PlanRow item={report.plan.gamePlan.runes} />
          <PlanRow item={report.plan.gamePlan.summonerSpells} />
          <PlanRow item={report.plan.gamePlan.startItem} />
          <PlanRow item={report.plan.gamePlan.boots} />
          <PlanRow item={report.plan.gamePlan.coreBuild} />
          <PlanRow item={report.plan.gamePlan.situational} />
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
