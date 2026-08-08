// ---------------------------------------------------------------------------
// Sprint 5.7 — ACCOUNT SECURITY + MFA CHECKS (deterministic).
//
//   bun run src/lib/coaching/coaching-validation-v1/account-security-5-7.ts
//
// These checks assert the SECURITY RULES, not the UI: assurance derivation from
// verified token claims, fail-closed authorization, MFA status derivation from
// provider factors, and that protected server functions are gated by the
// assurance-aware middleware rather than by frontend route guards.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import {
  assuranceFromClaims,
  deriveChallengeRequired,
  deriveMfaEnabled,
  isSessionPermitted,
  requiredAssurance,
} from "../../security/mfa-policy";
import { assertSessionAssurance, type ServerMfaState } from "../../security/account-security.server";

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
    else results.push({ name, passed: false, detail: typeof outcome === "string" ? outcome : "failed" });
  } catch (error) {
    results.push({ name, passed: false, detail: (error as Error).message });
  }
}

const src = (path: string) => readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");
const state = (enrolled: boolean): ServerMfaState => ({
  enrolled,
  verifiedFactorCount: enrolled ? 1 : 0,
});
const rejects = async (p: Promise<unknown>) =>
  p.then(
    () => false,
    () => true,
  );

export async function runAccountSecurityChecks(): Promise<CheckResult[]> {
  results.length = 0;

  // --- assurance derivation ---------------------------------------------
  check("aal2 claim is recognised", () => assuranceFromClaims({ aal: "aal2" }) === "aal2");
  check("aal1 claim stays aal1", () => assuranceFromClaims({ aal: "aal1" }) === "aal1");
  check("missing aal claim degrades to aal1", () => assuranceFromClaims({}) === "aal1");
  check("tampered aal value degrades to aal1", () =>
    assuranceFromClaims({ aal: "aal2 " }) === "aal1" && assuranceFromClaims({ aal: true }) === "aal1");
  check("null claims degrade to aal1", () => assuranceFromClaims(null) === "aal1");

  // --- MFA status derivation --------------------------------------------
  check("no factors → MFA disabled", () => deriveMfaEnabled([]) === false);
  check("unverified factor alone does NOT enable MFA", () =>
    deriveMfaEnabled([{ status: "unverified" }]) === false);
  check("verified factor enables MFA", () => deriveMfaEnabled([{ status: "verified" }]) === true);
  check("required assurance follows enrollment", () =>
    requiredAssurance(true) === "aal2" && requiredAssurance(false) === "aal1");
  check("challenge required while session is aal1 and needs aal2", () =>
    deriveChallengeRequired("aal1", "aal2") === true);
  check("challenge cleared once session reaches aal2", () =>
    deriveChallengeRequired("aal2", "aal2") === false);
  check("no challenge for un-enrolled session", () =>
    deriveChallengeRequired("aal1", "aal1") === false);

  // --- authorization rule ------------------------------------------------
  check("un-enrolled aal1 session is permitted", () =>
    isSessionPermitted({ assuranceLevel: "aal1", enrolled: false }) === true);
  check("enrolled aal1 session is rejected (bypass blocked)", () =>
    isSessionPermitted({ assuranceLevel: "aal1", enrolled: true }) === false);
  check("enrolled aal2 session is permitted", () =>
    isSessionPermitted({ assuranceLevel: "aal2", enrolled: true }) === true);
  check("enrolled session with unknown/absent assurance is rejected", () =>
    isSessionPermitted({ assuranceLevel: null, enrolled: true }) === false &&
    isSessionPermitted({ assuranceLevel: "aal3", enrolled: true }) === false);

  // --- server gate behaviour --------------------------------------------
  let ok = true;
  await assertSessionAssurance("u1", "aal1", async () => state(false)).catch(() => {
    ok = false;
  });
  check("gate allows aal1 when the user has no verified factor", () => ok);

  results.push({
    name: "gate rejects aal1 when the user is MFA-enrolled",
    passed: await rejects(assertSessionAssurance("u1", "aal1", async () => state(true))),
  });

  let elevated = true;
  await assertSessionAssurance("u1", "aal2", async () => state(true)).catch(() => {
    elevated = false;
  });
  check("gate allows an MFA-verified aal2 session", () => elevated);

  results.push({
    name: "gate fails closed when enrollment cannot be read",
    passed: await rejects(
      assertSessionAssurance("u1", "aal1", async () => {
        throw new Error("provider unavailable");
      }),
    ),
  });

  // --- enforcement placement (not frontend-only) ------------------------
  const middleware = src("src/lib/security/require-verified-session.ts");
  check("middleware builds on the generated provider auth middleware", () =>
    middleware.includes("requireSupabaseAuth"));
  check("middleware resolves enrollment server-side", () =>
    middleware.includes("assertSessionAssurance"));

  const gated = [
    "src/lib/coaching.functions.ts",
    "src/lib/matches.functions.ts",
    "src/lib/riot.functions.ts",
    "src/lib/dashboard.functions.ts",
    "src/lib/profile.functions.ts",
  ];
  for (const file of gated) {
    const text = src(file);
    check(`${file.split("/").pop()} is gated by requireVerifiedSession`, () => {
      const count = (text.match(/\.middleware\(\[requireVerifiedSession\]\)/g) ?? []).length;
      const legacy = text.includes(".middleware([requireSupabaseAuth])");
      if (legacy) return "still uses the un-elevated middleware";
      return count > 0 ? true : "no protected server function found";
    });
  }

  // --- data isolation (user-scoped queries) -----------------------------
  const coachingServer = src("src/lib/coaching.server.ts");
  check("stored coaching reads are scoped to the authenticated user", () =>
    coachingServer.includes("profile_id") && coachingServer.includes("userId"));
  const matchesServer = src("src/lib/matches.server.ts");
  check("stored match reads are scoped to the authenticated user", () =>
    matchesServer.includes("profile_id") && matchesServer.includes("userId"));
  check("protected functions never accept a caller-supplied user id", () =>
    gated.every((file) => !/data\.(profileId|userId)/.test(src(file))));

  // --- secret hygiene ---------------------------------------------------
  const statusFn = src("src/lib/security/account-security.functions.ts");
  check("MFA status response exposes no secret material", () => {
    const code = statusFn.replace(/\/\/.*$/gm, "");
    return !/\b(secret|totp|qr|otpauth|recoveryCode|recovery_code)\b/i.test(code);
  });
  check("Riot credentials stay server-side", () => {
    const client = src("src/lib/security/mfa.ts");
    return !client.includes("RIOT_API_KEY") && !client.includes("process.env");
  });

  // --- session/recovery behaviour ---------------------------------------
  const authHook = src("src/hooks/use-auth.tsx");
  check("sign-out clears session, profile and MFA state", () =>
    /signOut/.test(authHook) && authHook.includes("MFA_STATUS_UNKNOWN"));
  check("MFA state is re-read from the provider on session change", () =>
    authHook.includes("refreshMfa"));
  const shell = src("src/components/app-shell.tsx");
  check("app shell blocks rendering during an outstanding MFA challenge", () =>
    shell.includes("mfaChallengeRequired") && shell.includes("MfaChallenge"));
  const authRoute = src("src/routes/auth.tsx");
  check("login does not navigate into the app while MFA is outstanding", () =>
    authRoute.includes("!mfaChallengeRequired"));
  const reset = src("src/routes/reset-password.tsx");
  check("password recovery only updates the password (no MFA changes)", () =>
    reset.includes("updateUser") && !/mfa/i.test(reset));

  return results;
}

if (import.meta.main) {
  runAccountSecurityChecks().then((all) => {
    const passed = all.filter((r) => r.passed).length;
    for (const r of all) {
      console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
    }
    console.log(`\nSprint 5.7 account security: ${passed}/${all.length} PASS`);
    if (passed !== all.length) process.exit(1);
  });
}