// Native TOTP challenge. Unknown provider state stays blocked with retry/sign-out.
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { verifyMfaChallenge } from "@/lib/security/mfa";
import { Button } from "@/components/ui/button";
import { BOTDIFF_CONTACT_HREF } from "@/lib/legal/contact";

export function MfaChallenge() {
  const { mfa, refreshMfa, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const factors = mfa.verifiedFactors.filter((f) => f.factorType === "totp");
  const factor = factors.find((f) => f.id === factorId) ?? factors[0];
  async function run(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(null);
    try { await operation(); } catch { setError("Couldn't reach account security. Please try again."); }
    finally { setBusy(false); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!factor) return;
    await run(async () => {
      const result = await verifyMfaChallenge(factor.id, code.trim());
      setCode("");
      if (result.error) { setError(result.error); return; }
      await refreshMfa();
    });
  }
  return <div className="grid min-h-screen place-items-center bg-background px-4 font-sans text-foreground">
    <div className="glass w-full max-w-sm rounded-3xl p-8">
      <ShieldCheck className="size-6 text-primary" />
      <h1 className="mt-5 font-display text-xl font-semibold">Two-factor verification</h1>
      <p className="mt-2 text-sm text-muted-foreground">{!mfa.known ? "Couldn't check account security. Retry to continue safely." : factor ? "Enter the 6-digit code from your authenticator app to finish signing in." : "No supported authenticator is available. Contact support for account recovery."}</p>
      {factors.length > 1 && <div className="mt-4 flex flex-wrap gap-2">{factors.map((f) => <Button key={f.id} size="sm" variant={f.id === factor?.id ? "default" : "secondary"} disabled={busy} onClick={() => { setFactorId(f.id); setCode(""); setError(null); }}>{f.friendlyName ?? "Authenticator app"}</Button>)}</div>}
      <form onSubmit={submit} className="mt-6 space-y-3">
        {factor && <><label htmlFor="login-mfa-code" className="block text-sm">Authenticator code</label><input id="login-mfa-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm" /><Button type="submit" className="w-full" disabled={busy || !/^\d{6}$/.test(code)}>{busy ? "Verifying…" : "Verify"}</Button></>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="button" variant="secondary" className="w-full" disabled={busy} onClick={() => void run(refreshMfa)}>Retry security check</Button>
        <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={() => void run(signOut)}>Sign out</Button>
        <a href={BOTDIFF_CONTACT_HREF} className="block text-center text-xs text-primary underline">Lost access to your authenticator?</a>
      </form>
    </div>
  </div>;
}
