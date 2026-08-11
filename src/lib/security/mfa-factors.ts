// ---------------------------------------------------------------------------
// MFA factor catalog + support policy (Sprint 5.9) — PURE, no I/O.
//
// BotDiff offers three second-factor choices in the UI. Only factors the auth
// provider can actually mint an aal2 session for may ever be presented as real
// MFA. This module is the single place that decides that, so the UI cannot
// claim "enabled" for a mechanism that gives no second-factor assurance.
// ---------------------------------------------------------------------------

export const MFA_FACTOR_KINDS = ["totp", "sms", "email"] as const;
export type MfaFactorKind = (typeof MFA_FACTOR_KINDS)[number];

/**
 * - `available`   — enrollable right now; yields aal2 after a challenge.
 * - `needs_config` — provider supports it, but external configuration is
 *                    missing (e.g. no SMS provider). NOT enabled, not fake.
 * - `unsupported` — the provider has no such second factor at all.
 */
export type MfaFactorAvailability = "available" | "needs_config" | "unsupported";

export interface MfaFactorOption {
  kind: MfaFactorKind;
  label: string;
  description: string;
  availability: MfaFactorAvailability;
  /** Shown when availability is not `available`. Never a fake success. */
  requirement?: string;
}

/** What the provider reports about its own configuration. */
export interface ProviderAuthCapabilities {
  /** GoTrue `external.phone` — phone/SMS auth enabled for this project. */
  phoneAuthEnabled: boolean;
  /** GoTrue `sms_provider` — the configured SMS gateway, if any. */
  smsProvider: string | null;
}

export const PROVIDER_CAPABILITIES_UNKNOWN: ProviderAuthCapabilities = {
  phoneAuthEnabled: false,
  smsProvider: null,
};

/** Supabase Auth native MFA factor types. Email is deliberately absent. */
export const PROVIDER_MFA_FACTOR_TYPES = ["totp", "phone"] as const;

/** SMS MFA needs phone auth enabled AND an SMS gateway configured. */
export function smsFactorAvailability(caps: ProviderAuthCapabilities): MfaFactorAvailability {
  return caps.phoneAuthEnabled && !!caps.smsProvider ? "available" : "needs_config";
}

/**
 * Email is NOT a Supabase MFA factor type. An email magic link / OTP is a
 * primary sign-in verification and produces an aal1 session, so representing
 * it as MFA would be a lie. It stays `unsupported`.
 */
export function emailFactorAvailability(): MfaFactorAvailability {
  return "unsupported";
}

export function describeMfaFactors(caps: ProviderAuthCapabilities): MfaFactorOption[] {
  const sms = smsFactorAvailability(caps);
  return [
    {
      kind: "totp",
      label: "Authenticator app",
      description: "Codes from Google Authenticator, 1Password, Authy or similar.",
      availability: "available",
    },
    {
      kind: "sms",
      label: "Text message (SMS)",
      description: "A code texted to your phone each time you sign in.",
      availability: sms,
      ...(sms === "available"
        ? {}
        : {
            requirement:
              "Needs an SMS provider connected to BotDiff's account security settings. Until then SMS cannot protect your account.",
          }),
    },
    {
      kind: "email",
      label: "Email",
      description: "Email codes verify sign-in, but are not a second factor.",
      availability: emailFactorAvailability(),
      requirement:
        "BotDiff's sign-in provider does not offer email as a true second factor, so it can't be turned on here.",
    },
  ];
}

/** A factor may only be reported as protecting the account when enrollable. */
export function canEnableFactor(option: MfaFactorOption): boolean {
  return option.availability === "available";
}

/**
 * MFA is "on" only when the provider holds a verified factor. An availability
 * state is never enough — this is what stops "enabled" claims for SMS/email.
 */
export function isFactorEnabled(input: {
  option: MfaFactorOption;
  verifiedFactorTypes: string[];
}): boolean {
  if (!canEnableFactor(input.option)) return false;
  const providerType = input.option.kind === "sms" ? "phone" : input.option.kind;
  return input.verifiedFactorTypes.includes(providerType);
}