// ---------------------------------------------------------------------------
// Minimum functional MFA UI (Sprint 5.7). Uses existing surface styling only —
// no new design language. Status comes from the server; codes are verified by
// the auth provider.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  cancelMfaEnrollment,
  removeMfaFactor,
  readMfaStatus,
  startTotpEnrollment,
  verifyTotpEnrollment,
  type MfaEnrollment,
} from "@/lib/security/mfa";
import {
  getAccountSecurityStatus,
  type AccountSecurityStatus,
} from "@/lib/security/account-security.functions";

export function MfaSettings() {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<AccountSecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setStatus(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Server-derived truth (provider factors + verified token claims).
      setStatus(await getAccountSecurityStatus());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleStart() {
    setBusy(true);
    setFailed(null);
    const { enrollment: next, error } = await startTotpEnrollment();
    setBusy(false);
    if (error || !next) {
      toast.error(error ?? "Couldn't start MFA setup.");
      return;
    }
    setEnrollment(next);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollment || busy) return;
    setBusy(true);
    setFailed(null);
    const { error } = await verifyTotpEnrollment(enrollment.factorId, code.trim());
    setBusy(false);
    if (error) {
      // Failed verification never enables MFA — the factor stays unverified.
      setFailed("That code wasn't accepted. MFA is still off.");
      return;
    }
    setEnrollment(null);
    setCode("");
    toast.success("Two-factor authentication is on.");
    await refresh();
  }

  async function handleCancel() {
    if (enrollment) await cancelMfaEnrollment(enrollment.factorId);
    setEnrollment(null);
    setCode("");
    setFailed(null);
    await refresh();
  }

  async function handleDisable() {
    setBusy(true);
    const factors = await readMfaStatus();
    let lastError: string | null = null;
    for (const factor of factors.verifiedFactors) {
      const { error } = await removeMfaFactor(factor.id);
      if (error) lastError = error;
    }
    setBusy(false);
    if (lastError) {
      toast.error(lastError);
    } else {
      toast.success("Two-factor authentication is off.");
    }
    await refresh();
  }

  if (!isAuthenticated) return null;

  const enabled = Boolean(status?.mfaEnabled);

  return (
    <div className="rounded-2xl bg-white/[0.03] p-5">
      <div className="flex items-center gap-4">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
          {enabled ? <ShieldCheck className="size-5" /> : <ShieldAlert className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium">Two-factor authentication</div>
          <div className="truncate text-sm text-muted-foreground">
            {loading
              ? "Checking your account security…"
              : status === null
                ? "Security status unavailable right now."
                : enabled
                  ? `Enabled — ${status.verifiedFactorCount} authenticator app${status.verifiedFactorCount === 1 ? "" : "s"}.`
                  : "Not enabled. Add an authenticator app for sign-in codes."}
          </div>
        </div>
        {!loading && !enrollment && (
          <button
            type="button"
            disabled={busy}
            onClick={enabled ? handleDisable : handleStart}
            className="rounded-full bg-white/[0.06] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/[0.1] disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : enabled ? "Turn off" : "Turn on"}
          </button>
        )}
      </div>

      {enrollment && (
        <form onSubmit={handleVerify} className="mt-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            Scan this setup key in your authenticator app, then enter the 6-digit code to finish.
          </p>
          {enrollment.secret && (
            <code className="block break-all rounded-xl bg-white/[0.04] px-4 py-3 text-xs">
              {enrollment.secret}
            </code>
          )}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          {failed && <p className="text-sm text-destructive">{failed}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || code.trim().length < 6}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Verifying…" : "Verify and enable"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-full bg-white/[0.06] px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}