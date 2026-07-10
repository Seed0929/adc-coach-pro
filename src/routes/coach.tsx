import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  Send,
  Sparkles,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Brain,
  Repeat,
  ShieldAlert,
  Gauge,
  Swords,
  HeartPulse,
  ListChecks,
  Flag,
} from "lucide-react";
import { AppShell, DemoModeBadge, Pill } from "@/components/app-shell";
import { useCoachDossier } from "@/hooks/use-coach-dossier";
import { useServerFn } from "@tanstack/react-start";
import { coachAnswer, proactiveCoaching, followUpQuestion, buildPracticeProgram } from "@/lib/coaching";
import { askCoach } from "@/lib/coaching.functions";

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "AI Coach — BotDiff" },
      {
        name: "description",
        content:
          "Your personal BotDiff coaching report: player identity, recurring habits, a rank-up plan, and answers grounded in your own games.",
      },
      { property: "og:title", content: "AI Coach — BotDiff" },
      {
        property: "og:description",
        content: "A Challenger-level AI coach that remembers your habits across every game.",
      },
    ],
  }),
  component: Coach,
});

interface ChatTurn {
  role: "coach" | "you";
  text: string;
}

function Section({
  icon: Icon,
  title,
  children,
  className = "",
}: {
  icon: typeof Sparkles;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass rise rounded-3xl p-6 ${className}`}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
          <Icon className="size-4" />
        </span>
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Coach() {
  const { dossier, loading } = useCoachDossier();
  const askServer = useServerFn(askCoach);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollDown = () =>
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });

  const ask = async (text: string) => {
    const t = text.trim();
    if (!t) return;
    setInput("");
    // Instant deterministic answer (works offline + for demo/guests).
    const local = coachAnswer(dossier, t).answer;
    setMessages((m) => [...m, { role: "you", text: t }, { role: "coach", text: local }]);
    scrollDown();
    // For linked players, upgrade to a live AI answer when a key is configured.
    if (dossier.isDemo) return;
    try {
      const res = await askServer({ data: { question: t } });
      if (res.ok && res.source === "ai" && res.answer !== local) {
        setMessages((m) => {
          const next = [...m];
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === "coach") {
              next[i] = { role: "coach", text: res.answer };
              break;
            }
          }
          return next;
        });
        scrollDown();
      }
    } catch {
      /* keep the deterministic answer */
    }
  };

  const dirIcon = (d: "up" | "down" | "flat", improved: boolean) => {
    if (d === "flat") return <Minus className="size-3.5 text-muted-foreground" />;
    const Cmp = d === "up" ? TrendingUp : TrendingDown;
    return <Cmp className={`size-3.5 ${improved ? "text-success" : "text-destructive"}`} />;
  };

  const consistency = dossier.consistency;
  const trendTone = (n: number) => (n > 0 ? "text-success" : n < 0 ? "text-destructive" : "text-muted-foreground");
  const proactive = useMemo(() => proactiveCoaching(dossier), [dossier]);
  const followUp = useMemo(() => followUpQuestion(dossier), [dossier]);
  const program = useMemo(() => buildPracticeProgram(dossier), [dossier]);

  return (
    <AppShell>
      <div className="rise mb-6 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Sparkles className="size-5" />
        </span>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">AI Coach</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Reading your recent games…"
              : `A full report from your last ${dossier.matchesAnalyzed} games — built on your habits, not generic advice.`}
          </p>
        </div>
        {dossier.isDemo && <DemoModeBadge />}
      </div>

      {/* Overall summary + identity */}
      <Section icon={Brain} title="Overall coaching summary" className="mb-6">
        <p className="text-sm leading-relaxed text-foreground/90">{dossier.overallSummary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {dossier.identityTraits.map((t) => (
            <Pill key={t} tone="primary">
              {t}
            </Pill>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/[0.03] p-4">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Rank assessment</div>
            <p className="text-sm text-foreground/90">{dossier.rankAssessment}</p>
            <p className="mt-2 text-xs font-medium text-primary">{dossier.rankPotential}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.03] p-4">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Record</div>
            <p className="text-2xl font-display font-semibold">
              {dossier.wins}W · {dossier.losses}L
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{dossier.winRate}% win rate</p>
          </div>
        </div>
      </Section>

      {/* Proactive coaching briefing — generated after every Riot sync. */}
      <Section icon={Flag} title="Since your last sync" className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Biggest improvement", value: proactive.biggestImprovement, tone: "text-success" },
            { label: "Next habit to build", value: proactive.biggestRecurringMistake, tone: "text-warning" },
            { label: "Keep doing this", value: proactive.keepDoing, tone: "text-success" },
            { label: "Focus on this next", value: proactive.fixNext, tone: "text-warning" },
          ].map((row) => (
            <div key={row.label} className="rounded-2xl bg-white/[0.03] p-4">
              <div className={`mb-1 text-xs uppercase tracking-wider ${row.tone}`}>{row.label}</div>
              <p className="text-sm text-foreground/90">{row.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
            <Target className="size-3.5" /> Next game challenge
          </div>
          <p className="text-sm text-foreground/90">{proactive.nextGameChallenge}</p>
        </div>
        {followUp && (
          <p className="mt-3 rounded-2xl bg-white/[0.03] p-4 text-sm italic text-muted-foreground">
            "{followUp}"
          </p>
        )}
      </Section>

      {/* Quick Ask */}
      <div className="glass rise mb-6 rounded-3xl">
        <div className="border-b border-white/5 p-6">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </span>
            <h2 className="font-display text-lg font-semibold tracking-tight">Quick Ask</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Tap a question — I'll answer from your actual match data.
          </p>
          <div className="flex flex-wrap gap-2">
            {dossier.quickPrompts.map((p) => (
              <button
                key={p.id}
                onClick={() => ask(p.text)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
              >
                {p.text}
              </button>
            ))}
          </div>
        </div>

        <div ref={scrollRef} className="max-h-[46vh] space-y-4 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Ask a question above or type one below to start.
            </p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "you" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[82%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "you" ? "bg-primary text-primary-foreground" : "bg-white/[0.05] text-foreground"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2 border-t border-white/5 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your coach anything about your games…"
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>

      {/* Strength + Weakness */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Section icon={Trophy} title="Primary strength">
          <h3 className="font-display text-base font-semibold text-success">{dossier.primaryStrength.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{dossier.primaryStrength.detail}</p>
        </Section>
        <Section icon={ShieldAlert} title="Primary growth opportunity">
          <h3 className="font-display text-base font-semibold text-warning">{dossier.primaryWeakness.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{dossier.primaryWeakness.detail}</p>
        </Section>
      </div>

      {/* Coaching priorities — the five things every player should always see. */}
      <Section icon={ListChecks} title={`Coaching priorities · ${dossier.coachingPriority.roleLabel}`} className="mb-6">
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { label: "Biggest strength", item: dossier.coachingPriority.biggestStrength, tone: "text-success" },
            { label: "Biggest growth opportunity", item: dossier.coachingPriority.biggestWeakness, tone: "text-warning" },
            { label: "Most improved habit", item: dossier.coachingPriority.mostImprovedHabit, tone: "text-success" },
            { label: "Highest-impact habit to build", item: dossier.coachingPriority.highestImpactToFix, tone: "text-warning" },
          ].map((row) => (
            <div key={row.label} className="rounded-2xl bg-white/[0.03] p-4">
              <div className={`mb-1 text-xs uppercase tracking-wider ${row.tone}`}>{row.label}</div>
              <p className="text-sm font-medium text-foreground/90">{row.item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.item.why}</p>
              <p className="mt-1.5 text-xs italic text-muted-foreground/80">{row.item.evidence}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
            <Target className="size-3.5" /> Current practice goal
          </div>
          <p className="text-sm text-foreground/90">{dossier.coachingPriority.currentPracticeGoal.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{dossier.coachingPriority.currentPracticeGoal.why}</p>
          <p className="mt-1.5 text-xs italic text-muted-foreground/80">{dossier.coachingPriority.currentPracticeGoal.evidence}</p>
        </div>
      </Section>

      {/* Recurring habits */}
      <Section icon={Repeat} title="Recurring habits" className="mb-6">
        {dossier.habits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No strong recurring habits yet — play more games to let me spot your patterns.
          </p>
        ) : (
          <div className="space-y-3">
            {dossier.habits.map((h) => (
              <div key={h.id} className="flex items-start gap-3 rounded-2xl bg-white/[0.03] p-4">
                <span
                  className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${
                    h.kind === "strength" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                  }`}
                >
                  {h.kind === "strength" ? <Trophy className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{h.label}</span>
                    <Pill tone={h.kind === "strength" ? "success" : "warning"}>
                      {h.evidence.games}/{h.evidence.total} games
                    </Pill>
                    {h.evidence.streak >= 3 && <Pill tone="danger">{h.evidence.streak} in a row</Pill>}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{h.why}</p>
                  <p className="mt-1.5 text-xs italic text-muted-foreground/80">{h.evidence.sentences.join(" ")}</p>
                  {h.kind === "weakness" && (
                    <p className="mt-1.5 text-xs text-primary/90">Practice: {h.practice}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Improvement plan */}
      <Section icon={Target} title="Personalized improvement plan" className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Biggest growth opportunity", value: dossier.improvementPlan.biggestWeakness },
            { label: "Practice goal", value: dossier.improvementPlan.practiceGoal },
            { label: "Expected improvement", value: dossier.improvementPlan.expectedImprovement },
            { label: "Long-term objective", value: dossier.improvementPlan.longTermObjective },
          ].map((row) => (
            <div key={row.label} className="rounded-2xl bg-white/[0.03] p-4">
              <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{row.label}</div>
              <p className="text-sm text-foreground/90">{row.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
            <Gauge className="size-3.5" /> Why it matters
          </div>
          <p className="text-sm text-foreground/90">{dossier.improvementPlan.why}</p>
          <p className="mt-2 text-xs font-medium text-primary">{dossier.improvementPlan.estimatedImpact}</p>
        </div>
      </Section>

      {/* Consistency */}
      <Section icon={Gauge} title="Consistency" className="mb-6">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <div className="font-display text-4xl font-semibold">{consistency.current}</div>
            <div className="text-xs text-muted-foreground">Current (last 5)</div>
          </div>
          <div>
            <div className="font-display text-2xl font-semibold text-muted-foreground">{consistency.previous}</div>
            <div className="text-xs text-muted-foreground">Previous</div>
          </div>
          <div className="flex gap-4">
            <div>
              <div className={`text-sm font-semibold ${trendTone(consistency.weeklyTrend)}`}>
                {consistency.weeklyTrend > 0 ? "+" : ""}
                {consistency.weeklyTrend}
              </div>
              <div className="text-xs text-muted-foreground">Weekly</div>
            </div>
            <div>
              <div className={`text-sm font-semibold ${trendTone(consistency.monthlyTrend)}`}>
                {consistency.monthlyTrend > 0 ? "+" : ""}
                {consistency.monthlyTrend}
              </div>
              <div className="text-xs text-muted-foreground">Monthly</div>
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{consistency.explanation}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {consistency.dimensions.map((d) => (
            <div key={d.label} className="rounded-2xl bg-white/[0.03] p-3">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>{d.label}</span>
                <span>{d.score}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-primary" style={{ width: `${d.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Trends / weekly */}
      {dossier.trends.length > 0 && (
        <Section icon={TrendingUp} title="Weekly improvement summary" className="mb-6">
          <p className="mb-4 text-sm text-muted-foreground">{dossier.weeklySummary}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dossier.trends.map((t) => (
              <div key={t.key} className="rounded-2xl bg-white/[0.03] p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{t.label}</span>
                  {dirIcon(t.direction, t.improved)}
                </div>
                <div className="text-sm font-medium">
                  {t.previous} → {t.current}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Champion advice */}
      {dossier.championAdvice.length > 0 && (
        <Section icon={Swords} title="Champion-specific advice" className="mb-6">
          <div className="grid gap-3 md:grid-cols-2">
            {dossier.championAdvice.map((c) => (
              <div key={c.name} className="rounded-2xl bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-semibold">{c.name}</span>
                  <Pill tone={c.winRate >= 55 ? "success" : c.winRate <= 45 ? "danger" : "neutral"}>
                    {c.winRate}% · {c.games}g
                  </Pill>
                </div>
                <p className="mt-2 text-xs text-success">↑ {c.strength}</p>
                <p className="text-xs text-warning">↓ {c.weakness}</p>
                <p className="mt-2 text-xs text-muted-foreground">{c.note}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Mental + practice + goal */}
      <div className="grid gap-6 md:grid-cols-2">
        <Section icon={HeartPulse} title="Mental & consistency notes">
          <p className="text-sm leading-relaxed text-muted-foreground">{dossier.mentalNotes}</p>
        </Section>
        <Section icon={Flag} title="Future goal">
          <p className="text-sm leading-relaxed text-muted-foreground">{dossier.futureGoal}</p>
        </Section>
      </div>

      <Section icon={ListChecks} title="Your personal practice plan" className="mt-6">
        <div className="mb-4">
          <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Top 3 priorities</div>
          <div className="grid gap-3 md:grid-cols-3">
            {program.priorities.map((p, i) => (
              <div key={i} className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
                <div className="mb-1 text-sm font-medium text-primary">
                  {i + 1}. {p.title}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{p.why}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Practice drills</div>
          <ul className="space-y-2">
            {program.drills.map((p, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-primary/15 text-[10px] font-semibold text-primary">
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Champion goal", value: program.championGoal },
            { label: "Lane goal", value: program.laneGoal },
            { label: "Mid-game goal", value: program.midGameGoal },
            { label: "Teamfight goal", value: program.teamfightGoal },
            { label: "What success looks like", value: program.successLooksLike },
            { label: `Reevaluate after ${program.gamesUntilReevaluate} games`, value: program.timeline },
          ].map((row) => (
            <div key={row.label} className="rounded-2xl bg-white/[0.03] p-4">
              <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{row.label}</div>
              <p className="text-sm text-foreground/90">{row.value}</p>
            </div>
          ))}
        </div>
      </Section>
    </AppShell>
  );
}
