// ---------------------------------------------------------------------------
// requireVerifiedSession — the server-side gate for protected data.
//
// Sprint 5.7. Extends the generated `requireSupabaseAuth` (which validates the
// bearer token with the provider) with an MFA assurance check. Client route
// guards are UX only; this middleware is the enforcement point, so an MFA-
// enrolled user cannot reach their data with an un-challenged (aal1) session
// through URL manipulation, a second tab, a refresh or a replayed token.
// ---------------------------------------------------------------------------
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assuranceFromClaims, type AssuranceLevel } from "./mfa-policy";

export { assuranceFromClaims };
export type { AssuranceLevel };

export const requireVerifiedSession = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const assuranceLevel = assuranceFromClaims(context.claims);
    if (assuranceLevel !== "aal2") {
      // Fail closed: any error resolving enrollment rejects the request.
      const { assertSessionAssurance } = await import("./account-security.server");
      await assertSessionAssurance(context.userId, assuranceLevel);
    }
    return next({ context: { assuranceLevel } });
  });