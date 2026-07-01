import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Home,
  MessageSquareText,
  Swords,
  Sparkles,
  TrendingUp,
  Settings,
  LogOut,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

const nav: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/coach", label: "Coach", icon: MessageSquareText },
  { to: "/matches", label: "Matches", icon: Swords },
  { to: "/champions", label: "Champions", icon: Sparkles },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/settings", label: "Settings", icon: Settings },
];

function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-40 -top-40 size-[42rem] rounded-full bg-primary/20 blur-[140px] [animation:float-glow_16s_ease-in-out_infinite]" />
      <div className="absolute -right-52 top-1/3 size-[38rem] rounded-full bg-success/10 blur-[150px] [animation:float-glow_22s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-16rem] left-1/3 size-[40rem] rounded-full bg-primary/10 blur-[160px] [animation:float-glow_19s_ease-in-out_infinite]" />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { loading, isAuthenticated, profile, user, signOut } = useAuth();

  // Protect every route that renders inside the shell, and gate on onboarding.
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate({ to: "/auth", search: { redirect: pathname }, replace: true });
    } else if (profile && !profile.onboarding_completed) {
      navigate({ to: "/welcome", replace: true });
    }
  }, [loading, isAuthenticated, profile, navigate, pathname]);

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  if (loading || !isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <Ambient />
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = profile?.username ?? user?.email?.split("@")[0] ?? "Player";
  const displayEmail = profile?.email ?? user?.email ?? "";

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/30">
      <Ambient />

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col p-4 lg:flex">
        <div className="glass flex h-full flex-col rounded-3xl p-5">
          <Link to="/" className="mb-8 flex items-center gap-2.5 px-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_var(--primary)]">
              <span className="font-display text-lg font-bold">B</span>
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">BotDiff</span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
                    active
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`size-[18px] transition-colors ${
                      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="size-9 rounded-full object-cover" />
            ) : (
              <div className="size-9 rounded-full bg-gradient-to-br from-primary to-primary-dim" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{displayName}</div>
              <div className="truncate text-xs text-muted-foreground">{displayEmail}</div>
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <LogOut className="size-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-40 mx-4 mt-4 flex items-center justify-between rounded-2xl px-4 py-3 lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground font-display font-bold">
            B
          </span>
          <span className="font-display font-semibold">BotDiff</span>
        </Link>
        <nav className="flex items-center gap-1">
          {nav.map(({ to, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`grid size-9 place-items-center rounded-lg transition-colors ${
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-[18px]" />
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="px-4 pb-16 pt-4 lg:pl-72 lg:pr-8 lg:pt-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}

/** Small reusable pill for status/labels. */
export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-white/[0.05] text-muted-foreground",
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-destructive/15 text-destructive",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Page header block with generous spacing. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="rise mb-8">
      {eyebrow && (
        <div className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-primary">
          {eyebrow}
        </div>
      )}
      <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{title}</h1>
      {subtitle && <p className="mt-3 max-w-xl text-base text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/**
 * Subtle badge signalling that the surface is showing sample data. It doubles
 * as a call-to-action: connecting a Riot account swaps every example for the
 * player's own match history and personalized AI analysis.
 */
export function SampleBadge({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/welcome"
      className={`group inline-flex items-center gap-2 rounded-full border border-warning/25 bg-warning/[0.08] px-3 py-1.5 text-xs font-medium text-warning transition-colors hover:bg-warning/[0.14] ${className}`}
      title="Connect your Riot account to replace this with your own data"
    >
      <FlaskConical className="size-3.5" />
      Sample data
      <span className="hidden text-warning/70 group-hover:inline sm:inline">
        · connect Riot to see yours
      </span>
    </Link>
  );
}

/** Full-width banner variant for the top of data-heavy pages. */
export function SampleBanner() {
  return (
    <Link
      to="/welcome"
      className="rise mb-6 flex items-center gap-3 rounded-2xl border border-warning/20 bg-warning/[0.06] px-4 py-3 text-sm transition-colors hover:bg-warning/[0.1]"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-warning/15 text-warning">
        <FlaskConical className="size-4" />
      </span>
      <span className="text-muted-foreground">
        <span className="font-medium text-foreground">You're exploring with sample data.</span>{" "}
        Connect your Riot account to automatically replace every example with your own match
        history and personalized AI analysis.
      </span>
    </Link>
  );
}