// ---------------------------------------------------------------------------
// Account security server functions (Sprint 5.7).
//
// The UI asks the SERVER for MFA status so what it renders is derived from the
// provider + the verified access token, never from client state. No secret,
// factor secret or recovery material is ever returned.
// ---------------------------------------------------------------------------
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assuranceFromClaims } from "./require-verified-session";

export interface AccountSecurityStatus {
  mfaEnabled: boolean;
  verifiedFactorCount: number;
  assuranceLevel: "aal1" | "aal2";
  /** True when this session still owes a successful MFA challenge. */
  challengeRequired: boolean;
  /** Verified provider factor types ("totp" | "phone"). Never secrets. */
  verifiedFactorTypes: string[];
  /** Real provider configuration, so the UI never fakes SMS availability. */
  phoneAuthEnabled: boolean;
  smsProviderConfigured: boolean;
}

export const getAccountSecurityStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountSecurityStatus> => {
    const assuranceLevel = assuranceFromClaims(context.claims);
    const { readServerMfaState, readProviderAuthCapabilities } =
      await import("./account-security.server");
    const { enrolled, verifiedFactorCount, verifiedFactorTypes } = await readServerMfaState(
      context.userId,
    );
    const caps = await readProviderAuthCapabilities();
    return {
      mfaEnabled: enrolled,
      verifiedFactorCount,
      assuranceLevel,
      challengeRequired: enrolled && assuranceLevel !== "aal2",
      verifiedFactorTypes: verifiedFactorTypes ?? [],
      phoneAuthEnabled: caps.phoneAuthEnabled,
      smsProviderConfigured: !!caps.smsProvider,
    };
  });
