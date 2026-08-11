// ---------------------------------------------------------------------------
// Account security — SERVER-ONLY truth about a user's MFA enrollment.
//
// Sprint 5.7. The browser can lie about MFA; this module cannot. Enrolled
// factors are read through the provider's admin API and compared against the
// assurance level carried by the request's verified access token.
// ---------------------------------------------------------------------------

import { isSessionPermitted } from "./mfa-policy";

export interface ServerMfaState {
  /** At least one provider-verified factor exists for this user. */
  enrolled: boolean;
  verifiedFactorCount: number;
  /** Provider factor types that are verified (e.g. "totp", "phone"). */
  verifiedFactorTypes?: string[];
}

/** Reads provider-verified factors for a user. Throws so callers fail closed. */
export async function readServerMfaState(userId: string): Promise<ServerMfaState> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId });
  if (error) throw new Error("Unable to verify account security state");
  const verified = (data?.factors ?? []).filter((f) => f.status === "verified");
  return {
    enrolled: verified.length > 0,
    verifiedFactorCount: verified.length,
    verifiedFactorTypes: verified.map((f) => f.factor_type),
  };
}

/**
 * Reads the provider's own auth configuration (server-side only) so the UI can
 * show the REAL state of SMS support instead of guessing. Failure is reported
 * as "not configured" — never as available.
 */
export async function readProviderAuthCapabilities(): Promise<{
  phoneAuthEnabled: boolean;
  smsProvider: string | null;
}> {
  try {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
    if (!url || !key) return { phoneAuthEnabled: false, smsProvider: null };
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!response.ok) return { phoneAuthEnabled: false, smsProvider: null };
    const settings = (await response.json()) as {
      external?: { phone?: boolean };
      sms_provider?: string | null;
    };
    return {
      phoneAuthEnabled: settings.external?.phone === true,
      smsProvider: settings.sms_provider ? String(settings.sms_provider) : null,
    };
  } catch {
    return { phoneAuthEnabled: false, smsProvider: null };
  }
}

/**
 * Decides whether a request may act as the user.
 *
 * Rule: if the user has any verified factor, the access token MUST carry
 * `aal2` (the provider only mints that after a successful MFA challenge).
 * Anything unknown fails closed.
 */
export async function assertSessionAssurance(
  userId: string,
  assuranceLevel: string,
  readState: (userId: string) => Promise<ServerMfaState> = readServerMfaState,
): Promise<void> {
  if (assuranceLevel === "aal2") return;
  const { enrolled } = await readState(userId);
  if (!isSessionPermitted({ assuranceLevel, enrolled })) {
    throw new Error("Unauthorized: MFA verification required");
  }
}
