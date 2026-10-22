// ---------------------------------------------------------------------------
// Sprint 5.9 — MFA FACTOR HONESTY + FEEDBACK SELECTOR CHECKS (deterministic).
//
//   bun run src/lib/coaching/coaching-validation-v1/mfa-feedback-5-9.ts
//
// These checks assert that (a) only factors the provider can actually mint an
// aal2 session for are ever presented as enabled, (b) enforcement stays
// fail-closed, (c) no MFA secret/code is persisted or logged, and (d) the
// feedback dialog keeps every report value with exactly ONE free-text field.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import {
  canEnableFactor,
  describeMfaFactors,
  isFactorEnabled,
  PROVIDER_MFA_FACTOR_TYPES,
} from "../../security/mfa-factors";
import { isSessionPermitted } from "../../security/mfa-policy";
import {
  assertSessionAssurance,
  type ServerMfaState,
} from "../../security/account-security.server";
import {
  COACHING_VERDICTS,
  COACHING_VERDICT_LABELS,
  REPORT_TYPES,
  REPORT_TYPE_LABELS,
} from "../../feedback/feedback-policy";

export interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const results: CheckResult[] = [];
function check(name: string, fn: () => boolean | string) {
  try {
    const outcome = fn();
    if (outcome === true) results.push({ name, passed: true });
    else
      results.push({
        name,
        passed: false,
        detail: typeof outcome === "string" ? outcome : "failed",
      });
  } catch (error) {
    results.push({ name, passed: false, detail: (error as Error).message });
  }
}

const src = (path: string) => readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");
/** Comments explain the rules; the checks below assert the CODE. */
const code = (path: string) =>
  src(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const rejects = async (p: Promise<unknown>) =>
  p.then(
    () => false,
    () => true,
  );

export async function runMfaFeedbackChecks(): Promise<CheckResult[]> {
  results.length = 0;

  const mfaUi = src("src/components/mfa-settings.tsx");
  const mfaLib = src("src/lib/security/mfa.ts");
  const factors = src("src/lib/security/mfa-factors.ts");
  const guard = src("src/lib/security/require-verified-session.ts");
  const dialog = src("src/components/feedback-dialog.tsx");
  const serverFns = src("src/lib/feedback/feedback.functions.ts");

  // --- factor catalog honesty -------------------------------------------
  check("only native TOTP is supported", () => PROVIDER_MFA_FACTOR_TYPES.join(",") === "totp");
  check("one native factor is offered", () => describeMfaFactors().length === 1);
  const option = describeMfaFactors()[0];
  check("TOTP requires a verified native factor", () => Boolean(option && canEnableFactor(option) && isFactorEnabled({option, verifiedFactorTypes:["totp"]}) && !isFactorEnabled({option, verifiedFactorTypes:["phone"]})));
  check("enrollment and verification use native APIs", () => mfaLib.includes('factorType: "totp"') && mfaLib.includes("challengeAndVerify"));
  check("no SMS enrollment path exists", () => !mfaLib.includes('factorType: "phone"'));
  check("removal requires fresh native verification", () => mfaUi.includes("disableTotpFactor") && mfaLib.includes("verifyMfaChallenge(factorId, code)"));
  check("cancellation guards unverified factors", () => mfaLib.includes("status.unverifiedFactors.some"));

  // --- no secret / code leakage -----------------------------------------
  check(
    "no MFA secret or code is logged",
    () =>
      !/console\.(log|info|warn|error)/.test(mfaUi) &&
      !/console\.(log|info|warn|error)/.test(mfaLib),
  );
  check(
    "no MFA secret or code is persisted",
    () =>
      !code("src/components/mfa-settings.tsx").includes("localStorage") &&
      !code("src/lib/security/mfa.ts").includes("localStorage") &&
      !code("src/lib/security/mfa.ts").includes(".from(") &&
      !code("src/components/mfa-settings.tsx").includes(".from("),
  );
  check("the setup key is only shown during enrollment", () =>
    mfaUi.includes('setup.secret') && mfaUi.includes('setup &&'),
  );
  check("server status never returns factor secrets", () => {
    const fns = code("src/lib/security/account-security.functions.ts");
    return !/secret/i.test(fns) && !/\buri\b/i.test(fns);
  });

  // --- enforcement stays fail-closed ------------------------------------
  check(
    "enrolled users with aal1 are rejected",
    () => isSessionPermitted({ assuranceLevel: "aal1", enrolled: true }) === false,
  );
  check(
    "unknown assurance is rejected for enrolled users",
    () =>
      isSessionPermitted({ assuranceLevel: null, enrolled: true }) === false &&
      isSessionPermitted({ assuranceLevel: undefined, enrolled: true }) === false,
  );
  results.push({
    name: "an unreadable enrollment state rejects the request",
    passed: await rejects(
      assertSessionAssurance("user-1", "aal1", () => Promise.reject(new Error("provider down"))),
    ),
  });
  results.push({
    name: "an enrolled user with an un-challenged session is rejected server-side",
    passed: await rejects(
      assertSessionAssurance("user-1", "aal1", () =>
        Promise.resolve({ enrolled: true, verifiedFactorCount: 1 } as ServerMfaState),
      ),
    ),
  });
  check(
    "the assurance gate is still layered on verified auth",
    () => guard.includes("requireSupabaseAuth") && guard.includes("assertSessionAssurance"),
  );
  check(
    "MFA state changes require an authenticated provider session",
    () => !factors.includes("supabase") && mfaUi.includes("isAuthenticated"),
  );

  // --- feedback selectors -----------------------------------------------
  check(
    "report-type selector uses the styled Select primitive",
    () =>
      dialog.includes("@/components/ui/select") &&
      !/<select[\s>]/.test(code("src/components/feedback-dialog.tsx")),
  );
  check(
    "no OS-painted <option> elements remain",
    () => !/<option[\s>]/.test(code("src/components/feedback-dialog.tsx")),
  );
  check(
    "every report type is still offered",
    () =>
      REPORT_TYPES.every((t) => REPORT_TYPE_LABELS[t].length > 0) &&
      dialog.includes("REPORT_TYPES.map"),
  );
  check(
    "every coaching verdict is still offered",
    () =>
      COACHING_VERDICTS.every((v) => COACHING_VERDICT_LABELS[v].length > 0) &&
      dialog.includes("COACHING_VERDICTS.map"),
  );
  check(
    "an unspecified verdict still submits as null",
    () => dialog.includes("unspecified") && dialog.includes("verdict || null"),
  );
  check(
    "selected and hover states are themed, not inherited",
    () => dialog.includes("data-[state=checked]") && dialog.includes("focus:bg-primary/20"),
  );
  check("keyboard focus is visible on the trigger", () => dialog.includes("focus:ring-2"));

  // --- exactly one free-text field --------------------------------------
  check("exactly one textarea exists", () => (dialog.match(/<Textarea/g) ?? []).length === 1);
  check(
    "no summary/title input is present",
    () => !/<Input/.test(dialog) && !/Short summary/i.test(dialog),
  );
  check("the stored title is derived from the description", () =>
    dialog.includes("deriveTitle(description)"),
  );

  // --- feedback security unchanged --------------------------------------
  check(
    "submission still runs through a verified session",
    () => serverFns.includes("requireVerifiedSession") || serverFns.includes("requireSupabaseAuth"),
  );
  check("the client never sends a report status", () => !/status:/.test(dialog));
  check(
    "report ownership is not client-supplied",
    () => !dialog.includes("profile_id") && !dialog.includes("user_id"),
  );

  return results;
}

if (import.meta.main) {
  const all = await runMfaFeedbackChecks();
  for (const r of all)
    console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  const passed = all.filter((r) => r.passed).length;
  console.log(
    `\nSprint 5.9 MFA + feedback: ${passed}/${all.length} ${passed === all.length ? "PASS" : "FAIL"}`,
  );
  if (passed !== all.length) process.exit(1);
}
