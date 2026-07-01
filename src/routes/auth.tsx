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
  const { isAuthenticated, loading, signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dest = search.redirect ?? "/";

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