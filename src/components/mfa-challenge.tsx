// ---------------------------------------------------------------------------
// MFA challenge (Sprint 5.7). Rendered whenever the provider reports that the
// current session must still reach aal2. Answering the challenge is a provider
// call; failure leaves the session un-elevated and protected server functions
// keep rejecting it.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  sendMfaChallenge,
  verifyMfaChallenge,
  verifyMfaChallengeCode,
} from "@/lib/security/mfa";

export function MfaChallenge() {
  const { mfa, refreshMfa, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  const factors = mfa.verifiedFactors;
  const factor = factors.find((f) => f.id === factorId) ?? factors[0];
  // Phone factors only deliver a code once the provider issues a challenge.
  const needsSend = factor?.factorType === "phone" && !challengeId;

  async function handleSend() {
    if (!factor || busy) return;
    setBusy(true);
    setError(null);
    const { challengeId: id, error: sendError } = await sendMfaChallenge(factor.id);
    setBusy(false);
    if (sendError || !id) {
      setError(sendError ?? "Couldn't send a code.");
      return;
    }
    setChallengeId(id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factor || busy) return;
    setBusy(true);
    setError(null);
    const result = challengeId
      ? await verifyMfaChallengeCode(factor.id, challengeId, code.trim())
      : await verifyMfaChallenge(factor.id, code.trim());
    setBusy(false);
    if (result.error) {
      setError(
        factor.factorType === "phone"
          ? "That code wasn't accepted. Request a new code and try again."
          : "That code wasn't accepted. Try the current code from your authenticator app.",
      );
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
          {factor?.factorType === "phone"
            ? "Enter the 6-digit code we text you to finish signing in."
            : "Enter the 6-digit code from your authenticator app to finish signing in."}
        </p>
        {factors.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {factors.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFactorId(f.id);
                  setChallengeId(null);
                  setCode("");
                  setError(null);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  f.id === factor?.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1]"
                }`}
              >
                {f.factorType === "phone" ? "Text message" : "Authenticator app"}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          {needsSend && (
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={busy}
              className="w-full rounded-full bg-white/[0.06] px-4 py-3 text-sm font-medium disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          )}
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
            disabled={busy || code.trim().length < 6 || !factor || needsSend}
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