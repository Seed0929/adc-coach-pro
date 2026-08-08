// ---------------------------------------------------------------------------
// MFA challenge (Sprint 5.7). Rendered whenever the provider reports that the
// current session must still reach aal2. Answering the challenge is a provider
// call; failure leaves the session un-elevated and protected server functions
// keep rejecting it.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { verifyMfaChallenge } from "@/lib/security/mfa";

export function MfaChallenge() {
  const { mfa, refreshMfa, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const factor = mfa.verifiedFactors[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factor || busy) return;
    setBusy(true);
    setError(null);
    const result = await verifyMfaChallenge(factor.id, code.trim());
    setBusy(false);
    if (result.error) {
      setError("That code wasn't accepted. Try the current code from your authenticator app.");
      setCode("");
      return;
    }
    await refreshMfa();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 font-sans text-foreground">
      <div className="glass w-full max-w-sm rounded-3xl p-8">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
          <ShieldCheck className="size-5" />
        </span>
        <h1 className="mt-5 font-display text-xl font-semibold tracking-tight">
          Two-factor verification
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app to finish signing in.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy || code.trim().length < 6 || !factor}
            className="w-full rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Verifying…" : "Verify"}
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full rounded-full bg-white/[0.06] px-4 py-3 text-sm font-medium"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}