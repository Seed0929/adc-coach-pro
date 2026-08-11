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
  emailFactorAvailability,
  isFactorEnabled,
  smsFactorAvailability,
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

const CONFIGURED = { phoneAuthEnabled: true, smsProvider: "twilio" };
const UNCONFIGURED = { phoneAuthEnabled: false, smsProvider: null };

export async function runMfaFeedbackChecks(): Promise<CheckResult[]> {
  results.length = 0;

  const mfaUi = src("src/components/mfa-settings.tsx");
  const mfaLib = src("src/lib/security/mfa.ts");
  const factors = src("src/lib/security/mfa-factors.ts");
  const guard = src("src/lib/security/require-verified-session.ts");
  const dialog = src("src/components/feedback-dialog.tsx");
  const serverFns = src("src/lib/feedback/feedback.functions.ts");

  // --- factor catalog honesty -------------------------------------------
  check(
    "only provider-native factor types are claimed",
    () => PROVIDER_MFA_FACTOR_TYPES.join(",") === "totp,phone",
  );
  check("three factor choices are presented", () => describeMfaFactors(UNCONFIGURED).length === 3);
  check("authenticator app is always available", () => {
    const totp = describeMfaFactors(UNCONFIGURED).find((f) => f.kind === "totp");
    return totp?.availability === "available";
  });
  check("email is never a second factor", () => emailFactorAvailability() === "unsupported");
  check("email option cannot be enabled", () => {
    const email = describeMfaFactors(CONFIGURED).find((f) => f.kind === "email")!;
    return (
      !canEnableFactor(email) && !isFactorEnabled({ option: email, verifiedFactorTypes: ["email"] })
    );
  });
  check("email option explains why it is not MFA", () => {
    const email = describeMfaFactors(CONFIGURED).find((f) => f.kind === "email")!;
    return typeof email.requirement === "string" && email.requirement.length > 0;
  });
  check(
    "SMS needs a configured provider",
    () => smsFactorAvailability(UNCONFIGURED) === "needs_config",
  );
  check(
    "SMS is available only with phone auth AND a gateway",
    () =>
      smsFactorAvailability({ phoneAuthEnabled: true, smsProvider: null }) === "needs_config" &&
      smsFactorAvailability({ phoneAuthEnabled: false, smsProvider: "twilio" }) ===
        "needs_config" &&
      smsFactorAvailability(CONFIGURED) === "available",
  );
  check("unconfigured SMS can never read as enabled", () => {
    const sms = describeMfaFactors(UNCONFIGURED).find((f) => f.kind === "sms")!;
    return !isFactorEnabled({ option: sms, verifiedFactorTypes: ["phone"] });
  });
  check("configured SMS reads enabled only with a verified phone factor", () => {
    const sms = describeMfaFactors(CONFIGURED).find((f) => f.kind === "sms")!;
    return (
      isFactorEnabled({ option: sms, verifiedFactorTypes: ["phone"] }) &&
      !isFactorEnabled({ option: sms, verifiedFactorTypes: [] }) &&
      !isFactorEnabled({ option: sms, verifiedFactorTypes: ["totp"] })
    );
  });
  check("TOTP reads enabled only with a verified totp factor", () => {
    const totp = describeMfaFactors(CONFIGURED).find((f) => f.kind === "totp")!;
    return (
      isFactorEnabled({ option: totp, verifiedFactorTypes: ["totp"] }) &&
      !isFactorEnabled({ option: totp, verifiedFactorTypes: ["phone"] })
    );
  });
  check(
    "the UI derives availability from the shared policy",
    () => mfaUi.includes("describeMfaFactors") && mfaUi.includes("isFactorEnabled"),
  );
  check(
    "the UI reads its state from the server function",
    () => mfaUi.includes("getAccountSecurityStatus") && !mfaUi.includes("localStorage"),
  );

  // --- TOTP flow preserved ----------------------------------------------
  check(
    "TOTP enrollment still uses the provider",
    () => mfaLib.includes('factorType: "totp"') && mfaLib.includes("supabase.auth.mfa.enroll"),
  );
  check("verification is delegated to the provider", () => mfaLib.includes("challengeAndVerify"));
  check("SMS enrollment uses the provider's phone factor", () =>
    mfaLib.includes('factorType: "phone"'),
  );
  check(
    "setup can be cancelled and the factor discarded",
    () => mfaLib.includes("cancelMfaEnrollment") && mfaUi.includes("cancelMfaEnrollment"),
  );
  check(
    "a failed verification never reports MFA as on",
    () => /still off/i.test(mfaUi) && mfaUi.includes("if (result.error)"),
  );
  check(
    "turning a factor off unenrolls it with the provider",
    () => mfaUi.includes("removeMfaFactor") && mfaLib.includes("unenroll"),
  );

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
    mfaUi.includes('setup.kind === "totp" && setup.secret'),
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
