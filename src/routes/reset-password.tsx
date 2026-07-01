import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — BotDiff" },
      { name: "description", content: "Set a new password for your BotDiff account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Supabase sets a recovery session from the link's hash before we render.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated. You're all set.");
      navigate({ to: "/", replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 font-sans text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[42rem] rounded-full bg-primary/20 blur-[140px] [animation:float-glow_16s_ease-in-out_infinite]" />
      </div>

      <div className="rise glass w-full max-w-md rounded-3xl p-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {ready
            ? "Choose a strong password you haven't used before."
            : "Open this page from the reset link in your email."}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 focus-within:bg-white/[0.06]">
            <Lock className="size-[18px] shrink-0 text-muted-foreground" />
            <input
              type="password"
              placeholder="New password"
              autoComplete="new-password"
              required
              minLength={6}
              disabled={!ready}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 focus-within:bg-white/[0.06]">
            <Lock className="size-[18px] shrink-0 text-muted-foreground" />
            <input
              type="password"
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
              minLength={6}
              disabled={!ready}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !ready}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                Update password
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}