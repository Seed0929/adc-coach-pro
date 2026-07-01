import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail, Lock, User as UserIcon, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — BotDiff" },
      {
        name: "description",
        content: "Sign in or create your BotDiff account to get personalized League coaching.",
      },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

function Field({
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: typeof Mail }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 focus-within:bg-white/[0.06]">
      <Icon className="size-[18px] shrink-0 text-muted-foreground" />
      <input
        {...props}
        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { isAuthenticated, loading, signIn, signUp, resetPassword, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dest = search.redirect && search.redirect !== "/auth" ? search.redirect : "/";

  // Already signed in → go to the dashboard (or intended destination).
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate({ to: dest, replace: true });
    }
  }, [loading, isAuthenticated, navigate, dest]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      if (mode === "forgot") {
        const { error } = await resetPassword(email);
        if (error) toast.error(error);
        else toast.success("Password reset link sent. Check your inbox.");
        return;
      }

      if (mode === "signup") {
        const { error } = await signUp({ email, password, username });
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("Account created. Welcome to BotDiff.");
        navigate({ to: dest, replace: true });
        return;
      }

      const { error } = await signIn({ email, password });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Welcome back.");
      navigate({ to: dest, replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  const heading =
    mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset password" : "Welcome back";
  const subtitle =
    mode === "signup"
      ? "Start improving with a coach in your corner."
      : mode === "forgot"
        ? "We'll email you a secure reset link."
        : "Sign in to continue your climb.";
  const cta = mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in";

  async function handleGoogle() {
    const { error } = await signInWithGoogle();
    if (error) toast.error(error);
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 font-sans text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[42rem] rounded-full bg-primary/20 blur-[140px] [animation:float-glow_16s_ease-in-out_infinite]" />
        <div className="absolute -right-52 bottom-1/4 size-[38rem] rounded-full bg-success/10 blur-[150px] [animation:float-glow_22s_ease-in-out_infinite]" />
      </div>

      <div className="rise glass w-full max-w-md rounded-3xl p-8">
        <Link to="/auth" className="mb-8 flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_var(--primary)]">
            <span className="font-display text-lg font-bold">B</span>
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">BotDiff</span>
        </Link>

        <h1 className="font-display text-2xl font-semibold tracking-tight">{heading}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>

        {mode !== "forgot" && (
          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-white/[0.06] px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.1]"
            >
              <svg className="size-[18px]" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/>
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() =>
                toast.info("Discord sign-in is coming soon. Use email or Google for now.")
              }
              className="flex w-full items-center justify-center gap-3 rounded-full bg-white/[0.06] px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.1]"
            >
              <svg className="size-[18px]" viewBox="0 0 24 24" fill="#5865F2" aria-hidden>
                <path d="M20.32 4.37A19.8 19.8 0 0 0 15.4 2.9a.07.07 0 0 0-.08.04c-.21.38-.44.87-.61 1.25a18.3 18.3 0 0 0-5.42 0 12.6 12.6 0 0 0-.62-1.25.08.08 0 0 0-.08-.04c-1.7.29-3.34.8-4.9 1.47a.07.07 0 0 0-.04.03C.53 9.09-.32 13.68.1 18.21a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .09-.03c.46-.63.87-1.29 1.22-1.99a.08.08 0 0 0-.04-.11c-.65-.25-1.27-.55-1.87-.89a.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01c3.92 1.79 8.16 1.79 12.04 0a.07.07 0 0 1 .08 0l.37.3a.08.08 0 0 1-.01.13c-.6.34-1.22.64-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.22 1.99a.08.08 0 0 0 .09.03 19.8 19.8 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.25-.84-9.8-3.53-13.81a.06.06 0 0 0-.03-.03ZM8.02 15.45c-1.18 0-2.15-1.08-2.15-2.41 0-1.33.95-2.42 2.15-2.42 1.2 0 2.17 1.1 2.15 2.42 0 1.33-.95 2.41-2.15 2.41Zm7.96 0c-1.18 0-2.15-1.08-2.15-2.41 0-1.33.95-2.42 2.15-2.42 1.21 0 2.17 1.1 2.15 2.42 0 1.33-.94 2.41-2.15 2.41Z"/>
              </svg>
              Continue with Discord
            </button>
            <div className="flex items-center gap-3 pt-1">
              <div className="h-px flex-1 bg-white/[0.08]" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-white/[0.08]" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7 space-y-3">
          {mode === "signup" && (
            <Field
              icon={UserIcon}
              type="text"
              placeholder="Username"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          )}
          <Field
            icon={Mail}
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode !== "forgot" && (
            <Field
              icon={Lock}
              type="password"
              placeholder="Password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          {mode === "login" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                {cta}
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" && (
            <>
              New to BotDiff?{" "}
              <button
                onClick={() => setMode("signup")}
                className="font-medium text-primary transition-opacity hover:opacity-80"
              >
                Create an account
              </button>
            </>
          )}
          {mode === "signup" && (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
                className="font-medium text-primary transition-opacity hover:opacity-80"
              >
                Sign in
              </button>
            </>
          )}
          {mode === "forgot" && (
            <button
              onClick={() => setMode("login")}
              className="font-medium text-primary transition-opacity hover:opacity-80"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}