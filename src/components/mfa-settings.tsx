// Optional native TOTP only. Secrets are transient enrollment state, never persisted.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cancelMfaEnrollment, disableTotpFactor, startTotpEnrollment, verifyTotpEnrollment, type MfaEnrollment } from "@/lib/security/mfa";
import { getAccountSecurityStatus, type AccountSecurityStatus } from "@/lib/security/account-security.functions";

export function MfaSettings() {
  const { isAuthenticated, refreshMfa, mfa } = useAuth();
  const getStatus = useServerFn(getAccountSecurityStatus);
  const [status, setStatus] = useState<AccountSecurityStatus | null>(null);
  const [setup, setSetup] = useState<MfaEnrollment | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (isAuthenticated) void getStatus().then((value) => { if (active) setStatus(value); }).catch(() => { if (active) setStatus(null); });
    return () => { active = false; };
  }, [getStatus, isAuthenticated, mfa]);
  if (!isAuthenticated) return null;

  async function act(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    try { await operation(); } catch { setError("Couldn't reach account security. Please retry."); }
    finally { setBusy(false); }
  }
  async function begin() {
    await act(async () => {
      const result = await startTotpEnrollment();
      if (result.error || !result.enrollment) { setError(result.error ?? "Couldn't start setup."); return; }
      setCode(""); setSetup(result.enrollment);
    });
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await act(async () => {
      if (!setup && !factorId) return;
      const result = setup ? await verifyTotpEnrollment(setup.factorId, code.trim()) : await disableTotpFactor(factorId ?? "", code.trim());
      setCode("");
      if (result.error) { setError(result.error); return; }
      setNotice(setup ? "Authenticator verified. Two-factor authentication is on." : "Authenticator removed.");
      setSetup(null); setFactorId(null);
      await refreshMfa();
    });
  }
  async function cancel() {
    await act(async () => {
      if (setup) { const result = await cancelMfaEnrollment(setup.factorId); if (result.error) { setError(result.error); return; } }
      setSetup(null); setFactorId(null); setCode(""); await refreshMfa();
    });
  }
  const totp = mfa.verifiedFactors.filter((f) => f.factorType === "totp");
  return (
    <section aria-labelledby="account-security-heading" className="rounded-2xl bg-secondary/40 p-5">
      <div className="flex items-center gap-4">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">{mfa.enabled ? <ShieldCheck className="size-5" /> : <ShieldAlert className="size-5" />}</span>
        <div className="min-w-0 flex-1">
          <h2 id="account-security-heading" className="font-medium">Security</h2>
          <p className="text-sm text-muted-foreground">{!mfa.known ? "Checking account security…" : mfa.enabled ? "Two-factor authentication is on." : "Two-factor authentication is off."}</p>
        </div>
      </div>
      <h3 className="mt-4 text-sm font-medium">Authenticator app</h3>
      {totp.map((factor) => <div key={factor.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"><span>{factor.friendlyName ?? "BotDiff authenticator"} · Verified</span><Button variant="secondary" disabled={busy || Boolean(setup) || Boolean(factorId)} onClick={() => { setFactorId(factor.id); setCode(""); setError(null); setNotice(null); }}>Turn off</Button></div>)}
      {!mfa.enabled && !setup && <Button className="mt-3" disabled={busy || !mfa.known} onClick={() => void begin()}>Set up authenticator</Button>}
      {(setup || factorId) && <form onSubmit={submit} className="mt-4 space-y-3">
        {setup && <>
          <p className="text-sm text-muted-foreground">Scan this QR code or enter the setup key in your authenticator app.</p>
          {setup.qrCode && <img src={setup.qrCode} alt="QR code to add BotDiff to your authenticator app" className="size-44 rounded-lg bg-foreground p-2" />}
          {setup.secret && <code className="block break-all rounded-lg bg-secondary px-3 py-2 text-xs">{setup.secret}</code>}
          <p className="text-sm text-muted-foreground">Setup is not enabled until your code is verified.</p>
        </>}
        <label htmlFor="mfa-code" className="block text-sm">{setup ? "Current 6-digit authenticator code" : "Confirm removal with a current authenticator code"}</label>
        <input id="mfa-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <div className="flex flex-wrap gap-2"><Button type="submit" variant={setup ? "default" : "destructive"} disabled={busy || !/^\d{6}$/.test(code)}>{busy ? "Checking…" : setup ? "Verify and turn on" : "Turn off authenticator"}</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => void cancel()}>Cancel</Button></div>
      </form>}
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="mt-3 text-sm text-success">{notice}</p>}
      <p className="mt-4 text-xs text-muted-foreground">Keep access to your authenticator. Password reset does not remove this protection; BotDiff does not issue recovery codes.</p>
    </section>
  );
}
