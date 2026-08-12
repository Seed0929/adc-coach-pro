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
  const { data: factorData, error } = await supabase.auth.mfa.listFactors();
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const currentLevel = (aalData?.currentLevel as AssuranceLevel | null) ?? null;
  const nextLevel = (aalData?.nextLevel as AssuranceLevel | null) ?? null;

  if (error) {
    return { ...MFA_STATUS_UNKNOWN, currentLevel, nextLevel };
  }

  const all = (factorData?.all ?? []).map(toSummary);
  const verifiedFactors = all.filter((f) => f.status === "verified");

  return {
    enabled: deriveMfaEnabled(all),
    currentLevel,
    nextLevel,
    // Fail closed: a session that must reach aal2 but hasn't is NOT complete.
    challengeRequired: deriveChallengeRequired(currentLevel, nextLevel),
    verifiedFactors,
    unverifiedFactors: all.filter((f) => f.status === "unverified"),
  };
}

export interface MfaEnrollment {
  factorId: string;
  /** otpauth:// URI rendered as a QR by the authenticator app. */
  uri: string | null;
  /** Shown once during setup so the user can type it into their app. */
  secret: string | null;
}

/** Starts provider-side TOTP enrollment. The factor stays UNVERIFIED here. */
export async function startTotpEnrollment(
  friendlyName = `BotDiff ${new Date().toISOString().slice(0, 10)}`,
): Promise<{ enrollment: MfaEnrollment | null; error: string | null }> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  });
  if (error || !data)
    return { enrollment: null, error: error?.message ?? "Couldn't start MFA setup." };
  return {
    enrollment: {
      factorId: data.id,
      uri: data.totp?.uri ?? null,
      secret: data.totp?.secret ?? null,
    },
    error: null,
  };
}

/**
 * Completes enrollment. The provider verifies the code; a wrong code leaves the
 * factor unverified, so MFA does NOT become enabled.
 */
export async function verifyTotpEnrollment(
  factorId: string,
  code: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  return { error: error?.message ?? null };
}

/** Answers the login-time challenge for an already-verified factor. */
export async function verifyMfaChallenge(
  factorId: string,
  code: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  return { error: error?.message ?? null };
}

/**
 * Asks the provider to issue a challenge for a verified factor. Needed for
 * phone factors, where the challenge is what actually sends the SMS. TOTP
 * factors don't need this — the app already shows a current code.
 */
export async function sendMfaChallenge(
  factorId: string,
): Promise<{ challengeId: string | null; error: string | null }> {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error || !data) return { challengeId: null, error: error?.message ?? "Couldn't send a code." };
  return { challengeId: data.id, error: null };
}

/** Verifies a code against an already-issued challenge. */
export async function verifyMfaChallengeCode(
  factorId: string,
  challengeId: string,
  code: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
  return { error: error?.message ?? null };
}

/** Removes a factor. The provider requires an aal2 session to allow this. */
export async function removeMfaFactor(factorId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  return { error: error?.message ?? null };
}

/** Discards an in-progress, never-verified enrollment. */
export async function cancelMfaEnrollment(factorId: string): Promise<void> {
  await supabase.auth.mfa.unenroll({ factorId }).catch(() => undefined);
}

/**
 * Starts provider-side PHONE (SMS) enrollment. This is the provider's native
 * `phone` MFA factor — it only works when phone auth and an SMS gateway are
 * configured for the project; otherwise the provider's error is surfaced as-is
 * and nothing is marked enabled.
 */
export async function startPhoneEnrollment(
  phone: string,
  friendlyName = `BotDiff SMS ${new Date().toISOString().slice(0, 10)}`,
): Promise<{ factorId: string | null; error: string | null }> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "phone",
    phone,
    friendlyName,
  });
  if (error || !data) {
    return { factorId: null, error: error?.message ?? "Couldn't start SMS setup." };
  }
  return { factorId: data.id, error: null };
}

/** Verifies an SMS enrollment code. A wrong code leaves the factor unverified. */
export async function verifyPhoneEnrollment(
  factorId: string,
  code: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  return { error: error?.message ?? null };
}
