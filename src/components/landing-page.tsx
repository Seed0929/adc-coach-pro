import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Brain,
  Clock,
  Dumbbell,
  Gauge,
  LogIn,
  Repeat,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  TrendingDown,
  Trophy,
  UserPlus,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { Pill } from "@/components/app-shell";
import { CoachingCard, CardField } from "@/components/coaching-card";
import { ChampionBackdrop } from "@/components/champion-backdrop";
import { SAMPLE_PLAYER } from "@/lib/player-data";
import logoLockup from "@/assets/botdiff-logo.png";

const data = SAMPLE_PLAYER;

const VALUE_POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Repeat,
    title: "Find recurring patterns",
    body: "BotDiff reads your imported matches together, not in isolation, and surfaces the decisions that keep repeating.",
  },
  {
    icon: Brain,
    title: "Understand why they happen",
    body: "Every pattern is explained as a decision chain: what you chose, what it cost, and how the game changed.",
  },
  {
    icon: ShieldCheck,
    title: "See real strengths and weaknesses",
    body: "Strengths and growth areas come from your own match data — never generic tier-list advice.",
  },
  {
    icon: Target,
    title: "Get personalized coaching",
    body: "One clear focus at a time, written the way a coach would say it after reviewing your game with you.",
  },
  {
    icon: Dumbbell,
    title: "Build actionable practice goals",
    body: "Each focus comes with a short, measurable drill you can finish before your next queue.",
  },
  {
    icon: TrendingUp,
    title: "Track improvement over time",
    body: "Consistency and skill trends update after every imported match, so progress is visible.",
  },
];

function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3.5">
        <Link to="/" className="flex items-center">
          <img src={logoLockup} alt="BotDiff" className="h-8 w-auto object-contain object-left" />
        </Link>
        <span className="hidden text-xs text-muted-foreground sm:block">
          Personal League of Legends coaching
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/[0.07]"
          >
            <LogIn className="size-4" /> Sign In
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
          >
            <UserPlus className="size-4" /> Create Account
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const focus = data.todaysFocus;
  return (
    <section className="relative mx-auto max-w-6xl px-5 pt-14 pb-4 md:pt-20">
      <div className="rise max-w-3xl">
        <Pill tone="primary">
          <Sparkles className="size-3.5" /> More than a stats website
        </Pill>
        <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
          Stats tell you what happened.
          <span className="block text-primary">BotDiff tells you what to do differently.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          BotDiff analyzes your games to identify the decisions, habits, and recurring patterns
          holding you back — then turns those findings into personalized coaching and improvement
          goals you can actually practice.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
          >
            Get Started — Create Account
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-white/[0.08]"
          >
            <LogIn className="size-4" /> Sign In
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Link your Riot account after signing up — everything below is an example profile.
        </p>
      </div>

      {/* Headline coaching card — the exact component the real dashboard uses. */}
      <div
        className="glass rise relative mt-12 overflow-hidden rounded-3xl p-7 md:p-9"
        style={{ animationDelay: "80ms" }}
      >
        <div className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm font-medium text-primary">
            <span className="inline-flex items-center gap-2">
              <Target className="size-4" /> Today's Focus
            </span>
            <Pill tone="warning">
              <Sparkles className="size-3.5" /> Example profile
            </Pill>
          </div>
          <h2 className="max-w-2xl font-display text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
            {focus.headline}
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">{focus.detail}</p>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroMetric icon={Gauge} label="Coach Assessment" value="Sure" tone="text-primary" />
            <HeroMetric icon={TrendingUp} label="Est. Impact" value={focus.impact} tone="text-success" />
            <HeroMetric icon={Activity} label="Difficulty" value={focus.difficulty} tone="text-warning" />
            <HeroMetric icon={Clock} label="Practice Time" value={focus.practiceTime} tone="text-muted-foreground" />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className={`mt-1 font-display text-lg font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function ProductPreview() {
  const co = data.coachingOverview;
  const po = data.performanceOverview;
  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <SectionHeading
        eyebrow="Product preview"
        title="The same coaching surfaces you get after signing in"
        body="These are the real BotDiff components, filled with an example profile. Once you link your Riot account, they show your own matches."
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PreviewStat label="Grade" value={po.grade} highlight />
        <PreviewStat label="Rank" value={po.rank} />
        <PreviewStat label="Avg CS" value={po.avgCs} />
        <PreviewStat label="Avg KDA" value={po.avgKda} />
      </div>

      <div className="mt-6 space-y-4">
        <CoachingCard
          icon={ShieldCheck}
          tone="success"
          eyebrow="Today's Coaching Win"
          title={co.primaryStrength}
          summary="Your standout strength from recent games, with the evidence behind it."
          readTime="10 sec"
        >
          <CardField label="Why this is a win">{co.primaryStrength}</CardField>
          <CardField label="Supporting habit">{data.aiInsight.positiveHabit}</CardField>
        </CoachingCard>

        <CoachingCard
          icon={Target}
          tone="warning"
          eyebrow="Next Habit to Build"
          title={co.primaryWeakness}
          summary={data.aiInsight.biggestOpportunity}
          readTime="20 sec"
        >
          <CardField label="Why this matters">{data.todaysFocus.detail}</CardField>
          <CardField label="Practice this next">{data.aiInsight.recommendedPractice}</CardField>
        </CoachingCard>

        <CoachingCard
          icon={TrendingUp}
          tone="primary"
          eyebrow="Progress"
          title={`Improvement trend +${co.improvementTrendPct}% this week`}
          summary={`Consistency ${co.consistencyScore}% — how repeatable your play has been across recent games.`}
          readTime="20 sec"
        >
          <div className="space-y-4">
            {data.skills.map((s) => (
              <div key={s.label}>
                <div className="mb-1.5 flex items-center gap-2 text-sm">
                  <span>{s.label}</span>
                  <span
                    className={`ml-auto inline-flex items-center gap-1 text-xs font-medium ${s.delta >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {s.delta >= 0 ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
                    {s.delta >= 0 ? "+" : ""}
                    {s.delta}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${s.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CoachingCard>

        <CoachingCard
          icon={Activity}
          tone="neutral"
          eyebrow="Match Analysis"
          title="Every match becomes a coaching review"
          summary="Grade, decision evidence, and one thing to change next game — for each imported match."
          readTime="45 sec"
        >
          <div className="space-y-3">
            {data.matches.slice(0, 3).map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <img
                  src={m.img}
                  alt={`${m.champ} champion art`}
                  loading="lazy"
                  className="size-12 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.champ}</span>
                    <Pill tone={m.result === "Victory" ? "success" : "danger"}>{m.result}</Pill>
                    <Pill tone="primary">Grade {m.grade}</Pill>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {m.kda} KDA · {m.cs} CS · {m.gameLength} · {m.when}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{m.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </CoachingCard>
      </div>
    </section>
  );
}

function PreviewStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="glass glass-hover rounded-2xl p-5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={`mt-1 font-display text-2xl font-semibold ${highlight ? "text-primary" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="max-w-2xl">
      <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {eyebrow}
      </span>
      <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h2>
      {body && <p className="mt-3 text-muted-foreground">{body}</p>}
    </div>
  );
}

function ValueSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <SectionHeading
        eyebrow="How BotDiff coaches"
        title="Decisions and habits, not another stat sheet"
      />
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {VALUE_POINTS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="glass glass-hover rounded-3xl p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
              <Icon className="size-5" />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChampionSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <SectionHeading
        eyebrow="Example profile"
        title="Champion-aware coaching"
        body="Coaching adapts to the champions you actually play, using official Riot champion data."
      />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {data.champions.slice(0, 4).map((c) => (
          <div key={c.name} className="glass glass-hover flex items-center gap-4 rounded-2xl p-5">
            <img
              src={c.img}
              alt={`${c.name} champion art`}
              loading="lazy"
              className="size-14 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.games} games</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {c.wr} WR · Grade {c.avgGrade}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{c.note}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 pt-6">
      <div className="glass relative overflow-hidden rounded-3xl p-8 text-center md:p-12">
        <div className="absolute -left-20 -top-24 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <Pill tone="primary">
            <Trophy className="size-3.5" /> Private beta
          </Pill>
          <h2 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Know exactly what to improve next game
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Create an account, link your Riot ID, and BotDiff starts building your coaching profile
            from your own matches.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
            >
              Create Account
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-white/[0.08]"
            >
              <LogIn className="size-4" /> Sign In
            </Link>
          </div>
        </div>
      </div>
      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} BotDiff — personal League of Legends coaching.</span>
        <span>BotDiff is not endorsed by Riot Games.</span>
      </footer>
    </section>
  );
}

export function LandingPage() {
  const sessionChampion = data.matches[0]?.champ;
  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/30">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[42rem] rounded-full bg-primary/20 blur-[140px] [animation:float-glow_16s_ease-in-out_infinite]" />
        <div className="absolute -right-52 top-1/3 size-[38rem] rounded-full bg-primary/10 blur-[150px] [animation:float-glow_22s_ease-in-out_infinite]" />
        {sessionChampion && <ChampionBackdrop champions={sessionChampion} />}
      </div>
      <TopBar />
      <main>
        <Hero />
        <ProductPreview />
        <ValueSection />
        <ChampionSection />
        <FinalCta />
      </main>
    </div>
  );
}
