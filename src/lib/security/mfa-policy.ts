// ---------------------------------------------------------------------------
// MFA policy — pure, dependency-free decision rules (Sprint 5.7).
//
// Kept separate from the provider wrappers so the security rules are testable
// in isolation and so client and server derive MFA state the SAME way.
// ---------------------------------------------------------------------------
export type AssuranceLevel = "aal1" | "aal2";

/** Reads `aal` from VERIFIED token claims. Anything unknown degrades to aal1. */
export function assuranceFromClaims(claims: unknown): AssuranceLevel {
  const value = (claims as { aal?: unknown } | null | undefined)?.aal;
  return value === "aal2" ? "aal2" : "aal1";
}

/** MFA is enabled only when the provider reports a VERIFIED factor. */
export function deriveMfaEnabled(factors: { status: string }[]): boolean {
  return factors.some((f) => f.status === "verified");
}

/** The assurance level a user's sessions must reach. */
export function requiredAssurance(enrolled: boolean): AssuranceLevel {
  return enrolled ? "aal2" : "aal1";
}

/**
 * The single authorization rule: a session may act as the user only when its
 * assurance level meets the level required by their enrollment. Fails closed.
 */
export function isSessionPermitted(input: {
  assuranceLevel: string | null | undefined;
  enrolled: boolean;
}): boolean {
  if (!input.enrolled) return true;
  return input.assuranceLevel === "aal2";
}

/** True while the provider says this session still owes an MFA challenge. */
export function deriveChallengeRequired(
  currentLevel: string | null,
  nextLevel: string | null,
): boolean {
  return nextLevel === "aal2" && currentLevel !== "aal2";
}