// ---------------------------------------------------------------------------
// MFA settings (Sprint 5.9). Same surface styling as the rest of Settings — no
// new design language. Three clearly-labelled factor choices, one step at a
// time. Status is server-derived; codes are verified by the auth provider.
// A factor is only shown as "On" when the provider holds a VERIFIED factor.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2, Smartphone, MessageSquare, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  cancelMfaEnrollment,
  removeMfaFactor,
  readMfaStatus,
  startPhoneEnrollment,
  startTotpEnrollment,
  verifyPhoneEnrollment,
  verifyTotpEnrollment,
  type MfaEnrollment,
} from "@/lib/security/mfa";
import {
  describeMfaFactors,
  isFactorEnabled,
  type MfaFactorKind,
  type MfaFactorOption,
} from "@/lib/security/mfa-factors";
import {
  getAccountSecurityStatus,
  type AccountSecurityStatus,
} from "@/lib/security/account-security.functions";

const ICONS: Record<MfaFactorKind, LucideIcon> = {
  totp: Smartphone,
  sms: MessageSquare,
  email: Mail,
};

type Setup =
  | { kind: "totp"; step: "code"; factorId: string; secret: string | null }
  | { kind: "sms"; step: "phone" }
  | { kind: "sms"; step: "code"; factorId: string };

export function MfaSettings() {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<AccountSecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!isAuthenticated) return null;

  const options = describeMfaFactors({
    phoneAuthEnabled: Boolean(status?.phoneAuthEnabled),
    smsProvider: status?.smsProviderConfigured ? "configured" : null,
  });
  const verifiedFactorTypes = status?.verifiedFactorTypes ?? [];
  const mfaOn = Boolean(status?.mfaEnabled);

  function resetSetup() {
    setSetup(null);
    setPhone("");
    setCode("");
    setError(null);
  }

  async function beginSetup(option: MfaFactorOption) {
    setError(null);
    if (option.kind === "sms") {
      setSetup({ kind: "sms", step: "phone" });
      return;
    }
    setBusy(true);
    const { enrollment, error: startError } = await startTotpEnrollment();
    setBusy(false);
    if (startError || !enrollment) {
      setError(startError ?? "Couldn't start setup.");
      return;
    }
    const next: MfaEnrollment = enrollment;
    setSetup({ kind: "totp", step: "code", factorId: next.factorId, secret: next.secret });
  }

  async function sendSmsCode(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const { factorId, error: startError } = await startPhoneEnrollment(phone.trim());
    setBusy(false);
    if (startError || !factorId) {
      // Real provider error — SMS is NOT enabled by a failed enrollment.
      setError(startError ?? "Couldn't send a code to that number.");
      return;
    }
    setSetup({ kind: "sms", step: "code", factorId });
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !setup || setup.step !== "code") return;
    setBusy(true);
    setError(null);
    const result =
      setup.kind === "totp"
        ? await verifyTotpEnrollment(setup.factorId, code.trim())
        : await verifyPhoneEnrollment(setup.factorId, code.trim());
    setBusy(false);
    if (result.error) {
      // Failed verification never enables MFA — the factor stays unverified.
      setError("That code wasn't accepted. Two-factor authentication is still off.");
      setCode("");
      return;
    }
    resetSetup();
    toast.success("Two-factor authentication is on.");
    await refresh();
  }

  async function cancelSetup() {
    if (setup?.step === "code") await cancelMfaEnrollment(setup.factorId);
    resetSetup();
    await refresh();
  }

  async function turnOff(kind: MfaFactorKind) {
    const providerType = kind === "sms" ? "phone" : kind;
    setBusy(true);
    setError(null);
    const { verifiedFactors } = await readMfaStatus();
    let lastError: string | null = null;
    for (const factor of verifiedFactors.filter((f) => f.factorType === providerType)) {
      const { error: removeError } = await removeMfaFactor(factor.id);
      if (removeError) lastError = removeError;
    }
    setBusy(false);
    if (lastError) toast.error(lastError);
    else toast.success("Two-factor authentication is off.");
    await refresh();
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] p-5">
      <div className="flex items-center gap-4">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
          {mfaOn ? <ShieldCheck className="size-5" /> : <ShieldAlert className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium">Two-factor authentication</div>
          <div className="text-sm text-muted-foreground">
            {loading
              ? "Checking your account security…"
              : status === null
                ? "Security status unavailable right now."
                : mfaOn
                  ? "On — you'll be asked for a code every time you sign in."
                  : "Off — add a second step so a stolen password isn't enough."}
          </div>
        </div>
        {!loading && (
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              mfaOn ? "bg-success/15 text-success" : "bg-white/[0.06] text-muted-foreground"
            }`}
          >
            {mfaOn ? "Enabled" : "Not enabled"}
          </span>
        )}
      </div>

      {!loading && (
        <div className="mt-4 space-y-2">
          {options.map((option) => {
            const Icon = ICONS[option.kind];
            const enabled = isFactorEnabled({ option, verifiedFactorTypes });
            const setupOpen = setup?.kind === option.kind;
            const canSetUp = option.availability === "available";
            return (
              <div key={option.kind} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {option.label}
                      {enabled && (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
                          On
                        </span>
                      )}
                      {!enabled && option.availability === "needs_config" && (
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-muted-foreground">
                          Not available yet
                        </span>
                      )}
                      {!enabled && option.availability === "unsupported" && (
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-muted-foreground">
                          Not a second factor
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  {canSetUp && !setupOpen && (
                    <button
                      type="button"
                      disabled={busy || Boolean(setup)}
                      onClick={() => (enabled ? turnOff(option.kind) : beginSetup(option))}
                      className="shrink-0 rounded-full bg-white/[0.06] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/[0.1] disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="size-4 animate-spin" /> : enabled ? "Turn off" : "Set up"}
                    </button>
                  )}
                </div>

                {!enabled && option.requirement && (
                  <p className="mt-3 rounded-lg bg-white/[0.03] p-3 text-xs text-muted-foreground">
                    {option.requirement}
                  </p>
                )}

                {setupOpen && setup?.kind === "sms" && setup.step === "phone" && (
                  <form onSubmit={sendSmsCode} className="mt-4 space-y-3">
                    <label htmlFor="mfa-phone" className="block text-xs text-muted-foreground">
                      Step 1 of 2 — your mobile number, including country code.
                    </label>
                    <input
                      id="mfa-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+1 555 010 1234"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/60 placeholder:text-muted-foreground"
                    />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={busy || phone.trim().length < 6}
                        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                      >
                        {busy ? "Sending…" : "Send code"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void cancelSetup()}
                        className="rounded-full bg-white/[0.06] px-4 py-2 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {setupOpen && setup?.step === "code" && (
                  <form onSubmit={verifyCode} className="mt-4 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      {setup.kind === "totp"
                        ? "Step 1 of 2 — add this setup key to your authenticator app."
                        : "Step 2 of 2 — enter the code we just texted you."}
                    </p>
                    {setup.kind === "totp" && setup.secret && (
                      <code className="block break-all rounded-lg bg-white/[0.04] px-3 py-2 text-xs">
                        {setup.secret}
                      </code>
                    )}
                    <label htmlFor="mfa-code" className="block text-xs text-muted-foreground">
                      {setup.kind === "totp"
                        ? "Step 2 of 2 — enter the 6-digit code it shows."
                        : "6-digit code"}
                    </label>
                    <input
                      id="mfa-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/60 placeholder:text-muted-foreground"
                    />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={busy || code.trim().length < 6}
                        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                      >
                        {busy ? "Verifying…" : "Verify and turn on"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void cancelSetup()}
                        className="rounded-full bg-white/[0.06] px-4 py-2 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && !setup && error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}