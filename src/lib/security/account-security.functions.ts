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
}

export const getAccountSecurityStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountSecurityStatus> => {
    const assuranceLevel = assuranceFromClaims(context.claims);
    const { readServerMfaState } = await import("./account-security.server");
    const { enrolled, verifiedFactorCount } = await readServerMfaState(context.userId);
    return {
      mfaEnabled: enrolled,
      verifiedFactorCount,
      assuranceLevel,
      challengeRequired: enrolled && assuranceLevel !== "aal2",
    };
  });