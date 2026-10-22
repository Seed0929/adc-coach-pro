// ---------------------------------------------------------------------------
// MFA — thin, typed wrapper over the auth provider's NATIVE MFA (TOTP).
//
// Sprint 5.7. Nothing here invents authentication: every call below is a
// provider call. No secret, code or "mfa enabled" flag is ever persisted in
// client state or localStorage — status is always re-derived from the provider.
// ---------------------------------------------------------------------------
import { supabase } from "@/integrations/supabase/client";
import { deriveChallengeRequired, deriveMfaEnabled, type AssuranceLevel } from "./mfa-policy";

export type { AssuranceLevel };

export interface MfaFactorSummary {
  id: string;
  friendlyName: string | null;
  factorType: string;
  status: "verified" | "unverified";
}

export interface MfaStatus {
  /** False until both provider factor and assurance reads succeed. */
  known: boolean;
  /** True when at least one factor is fully verified with the provider. */
  enabled: boolean;
  /** Assurance level of the CURRENT session, as reported by the provider. */
  currentLevel: AssuranceLevel | null;
  /** Level this session must reach; "aal2" while a challenge is outstanding. */
  nextLevel: AssuranceLevel | null;
  /** True when the provider says this session still owes an MFA challenge. */
  challengeRequired: boolean;
  verifiedFactors: MfaFactorSummary[];
  unverifiedFactors: MfaFactorSummary[];
}

export const MFA_STATUS_UNKNOWN: MfaStatus = {
  known: false,
  enabled: false,
  currentLevel: null,
  nextLevel: null,
  challengeRequired: false,
  verifiedFactors: [],
  unverifiedFactors: [],
};

function toSummary(factor: {
  id: string;
  friendly_name?: string | null;
  factor_type: string;
  status: string;
}): MfaFactorSummary {
  return {
    id: factor.id,
    friendlyName: factor.friendly_name ?? null,
    factorType: factor.factor_type,
    status: factor.status === "verified" ? "verified" : "unverified",
  };
}

/**
 * Reads MFA status straight from the provider. `challengeRequired` is derived
 * from the provider's assurance levels — never from a local flag — so it stays
 * correct after refresh, in a new tab, or with tampered local storage.
 */
export async function readMfaStatus(): Promise<MfaStatus> {
  const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors();
  const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (factorError || aalError || !factorData || !aalData) return MFA_STATUS_UNKNOWN;
  const all = factorData.all.map(toSummary);
  const enabled = deriveMfaEnabled(all);
  const currentLevel = aalData.currentLevel === "aal2" ? "aal2" : aalData.currentLevel === "aal1" ? "aal1" : null;
  const nextLevel = enabled || aalData.nextLevel === "aal2" ? "aal2" : aalData.nextLevel === "aal1" ? "aal1" : null;
  return {
    known: true,
    enabled,
    currentLevel,
    nextLevel,
    challengeRequired: deriveChallengeRequired(currentLevel, nextLevel),
    verifiedFactors: all.filter((f) => f.status === "verified"),
    unverifiedFactors: all.filter((f) => f.status === "unverified"),
  };
}

export interface MfaEnrollment {
  factorId: string;
  /** otpauth:// URI rendered as a QR by the authenticator app. */
  uri: string | null;
  /** Shown once during setup so the user can type it into their app. */
  secret: string | null;
  /** Provider-generated QR image (SVG data URI) for the otpauth URI. */
  qrCode: string | null;
}

/** Starts provider-side TOTP enrollment. The factor stays UNVERIFIED here. */
export async function startTotpEnrollment(
  friendlyName = "BotDiff authenticator",
): Promise<{ enrollment: MfaEnrollment | null; error: string | null }> {
  try {
    // Only discard abandoned, UNVERIFIED TOTP factors. Never remove protection.
    const status = await readMfaStatus();
    if (!status.known) return { enrollment: null, error: "Couldn't check account security. Retry setup." };
    if (status.enabled) return { enrollment: null, error: "An authenticator is already enabled." };
    for (const factor of status.unverifiedFactors.filter((f) => f.factorType === "totp")) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) return { enrollment: null, error: "Couldn't clear unfinished setup. Try again." };
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName });
    if (error || !data) return { enrollment: null, error: "Couldn't start authenticator setup. Sign out, sign in again with email or Google, then retry." };
    const qr = data.totp.qr_code;
    // The SDK prefixes raw SVG with a data URI but leaves '#' etc. unescaped.
    const prefix = "data:image/svg+xml;utf-8,";
    const qrCode = qr.startsWith(prefix) ? prefix + encodeURIComponent(qr.slice(prefix.length)) : qr;
    return { enrollment: { factorId: data.id, uri: data.totp.uri, secret: data.totp.secret, qrCode }, error: null };
  } catch {
    return { enrollment: null, error: "Couldn't reach account security. Try again." };
  }
}

/**
 * Completes enrollment. The provider verifies the code; a wrong code leaves the
 * factor unverified, so MFA does NOT become enabled.
 */
export async function verifyTotpEnrollment(
  factorId: string,
  code: string,
): Promise<{ error: string | null }> {
  return verifyMfaChallenge(factorId, code);
}

/** Native challenge and verification; invalid/expired codes never elevate a session. */
export async function verifyMfaChallenge(
  factorId: string,
  code: string,
): Promise<{ error: string | null }> {
  if (!/^\d{6}$/.test(code)) return { error: "Enter the current 6-digit authenticator code." };
  try {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    return { error: error ? "That code wasn't accepted or has expired. Try the current code." : null };
  } catch {
    return { error: "Couldn't verify the code. Check your connection and try again." };
  }
}

/** Fresh native verification before removing this exact verified TOTP factor. */
export async function disableTotpFactor(factorId: string, code: string): Promise<{ error: string | null }> {
  try {
    const status = await readMfaStatus();
    if (!status.known || !status.verifiedFactors.some((f) => f.id === factorId && f.factorType === "totp")) {
      return { error: "Couldn't confirm this authenticator. Refresh and try again." };
    }
    const verified = await verifyMfaChallenge(factorId, code);
    if (verified.error) return verified;
    return removeMfaFactor(factorId);
  } catch {
    return { error: "Couldn't turn off this authenticator. It may still be enabled; refresh to check." };
  }
}

/** Provider enforces aal2 for removal of verified factors. */
export async function removeMfaFactor(factorId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) return { error: "Couldn't remove the authenticator. Refresh and try again." };
    // Unenrollment can downgrade assurance; obtain current claims before other calls.
    const { error: refreshError } = await supabase.auth.refreshSession();
    return { error: refreshError ? "Authenticator removed, but session refresh failed. Sign in again." : null };
  } catch {
    return { error: "Couldn't finish removing the authenticator. Refresh to check its status." };
  }
}

/** Cancellation must never remove a VERIFIED factor, even after a racing verification. */
export async function cancelMfaEnrollment(factorId: string): Promise<{ error: string | null }> {
  try {
    const status = await readMfaStatus();
    if (!status.known) return { error: "Couldn't check unfinished setup. Try again." };
    if (!status.unverifiedFactors.some((f) => f.id === factorId && f.factorType === "totp")) {
      return { error: "Setup changed. Refresh to check your authenticator." };
    }
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    return { error: error ? "Couldn't cancel setup. Try again." : null };
  } catch {
    return { error: "Couldn't cancel setup. Check your connection and try again." };
  }
}
