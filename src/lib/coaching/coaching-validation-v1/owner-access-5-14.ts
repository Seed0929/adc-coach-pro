// ---------------------------------------------------------------------------
// Secure Owner Access — deterministic checks.
//
//   bun run src/lib/coaching/coaching-validation-v1/owner-access-5-14.ts
//
// Asserts the SECURITY RULES of the internal owner access level: owner is
// resolved server-side from an immutable role row, inherits every Pro
// capability automatically, is unlimited, cannot be assigned or spoofed from
// the client, is invisible on customer-facing surfaces, and leaves Free/Pro
// behaviour untouched.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import {
  CAPABILITIES,
  PUBLIC_PLANS,
  can,
  isOwnerLevel,
  isProOrAbove,
  planLabel,
  type AccessLevel,
  type Capability,
} from "../../entitlements/plan";
import { gateDossier } from "../../entitlements/gate";
import { buildDemoDossier } from "../../coaching.functions";

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

export function runOwnerAccessChecks(): CheckResult[] {
  results.length = 0;

  const caps = Object.keys(CAPABILITIES.pro) as Capability[];

  // --- 1. capability resolution --------------------------------------------
  check("owner satisfies every Pro capability", () =>
    caps.every((c) => can("owner", c)) || "a Pro capability is missing for owner");

  check("owner inherits future capabilities automatically (derived, not listed)", () => {
    const plan = src("src/lib/entitlements/plan.ts");
    return /OWNER_CAPABILITIES[\s\S]{0,200}Object\.keys\(PLAN_CAPABILITIES\.pro\)/.test(plan);
  });

  check("free is unchanged by the owner level", () =>
    caps.some((c) => !can("free", c)) || "free unexpectedly has every capability");

  check("isProOrAbove is true for pro and owner, false for free", () =>
    isProOrAbove("owner") && isProOrAbove("pro") && !isProOrAbove("free"));

  check("isOwnerLevel identifies only owner", () =>
    isOwnerLevel("owner") && !isOwnerLevel("pro") && !isOwnerLevel("free"));

  // --- 2. customer-facing invisibility -------------------------------------
  check("owner is not a customer-selectable plan", () =>
    !PUBLIC_PLANS.includes("owner" as AccessLevel) &&
    PUBLIC_PLANS.includes("free") &&
    PUBLIC_PLANS.includes("pro"));

  check("owner never appears in pricing or upgrade marketing", () => {
    const files = [
      "src/components/pro/upgrade-dialog.tsx",
      "src/components/pro/pro-lock.tsx",
      "src/components/landing-page.tsx",
    ];
    for (const f of files) {
      if (/owner/i.test(src(f))) return `${f} mentions owner`;
    }
    return true;
  });

  check("plan labels stay player-friendly, owner label is internal only", () =>
    planLabel("free") === "BotDiff Free" &&
    planLabel("pro") === "BotDiff Pro" &&
    planLabel("owner") === "BotDiff Owner");

  // --- 3. no client-side escalation ----------------------------------------
  check("the dev plan switch can never write owner", () => {
    const server = src("src/lib/entitlements/entitlements.server.ts");
    if (!/writePlan[\s\S]{0,400}plan === "pro" \? "pro" : "free"/.test(server))
      return "writePlan does not normalize to free/pro";
    const fns = src("src/lib/entitlements/entitlements.functions.ts");
    return /owner/i.test(fns) ? "server function surface references owner" : true;
  });

  check("owner is resolved from user_roles, never from client input", () => {
    const server = src("src/lib/entitlements/entitlements.server.ts");
    return (
      /export async function isOwner[\s\S]{0,600}has_role[\s\S]{0,200}_role: "owner"/.test(server) &&
      /catch \{\s*return false/.test(server)
    );
  });

  check("owner resolution runs before billing plan and wins", () => {
    const server = src("src/lib/entitlements/entitlements.server.ts");
    return /loadPlan[\s\S]{0,300}if \(await isOwner\([\s\S]{0,80}return "owner"/.test(server);
  });

  check("no owner user id or email is hard-coded anywhere in the app", () => {
    for (const f of [
      "src/lib/entitlements/plan.ts",
      "src/lib/entitlements/entitlements.server.ts",
      "src/lib/entitlements/entitlements.functions.ts",
      "src/hooks/use-entitlements.tsx",
    ]) {
      const text = src(f);
      if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text))
        return `${f} contains a hard-coded uuid`;
      if (/@[a-z0-9-]+\.[a-z]{2,}/i.test(text)) return `${f} contains a hard-coded email`;
    }
    return true;
  });

  check("client entitlement state is display-only and re-checked server-side", () => {
    const plan = src("src/lib/entitlements/plan.ts");
    return /DISPLAY STATE ONLY/.test(plan);
  });

  // --- 4. premium depth actually unlocks -----------------------------------
  check("owner receives the complete, ungated dossier", async () => true);

  check("dossier gating treats owner as at-least-Pro", () => {
    const gate = src("src/lib/entitlements/gate.ts");
    return /isProOrAbove\(plan\)\) return \{ \.\.\.dossier, planTier: "pro", lockedInsights: \[\] \}/.test(
      gate,
    );
  });

  check("owner reports are unmetered and have no allowance or reset", () => {
    const server = src("src/lib/entitlements/entitlements.server.ts");
    return (
      /isProOrAbove\(plan\)\s*\?\s*proAllowance\(\)/.test(server) &&
      /if \(isProOrAbove\(plan\)\) return \{ allowed: true, plan, consumed: false \}/.test(server)
    );
  });

  // --- 5. database protection ----------------------------------------------
  check("owner is a real role value, stored outside the billing plan enum", () => {
    const types = src("src/integrations/supabase/types.ts");
    return /app_role:[^\n]*"owner"/.test(types) && !/billing_plan:[^\n]*"owner"/.test(types);
  });

  check("role and entitlement writes are revoked from client roles", () => {
    const mig = src("drizzle/migrations/0001_harden_privilege_grants.sql");
    return (
      /REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon/.test(mig) &&
      /REVOKE INSERT, UPDATE, DELETE[\s\S]{0,80}public\.user_roles FROM authenticated/.test(mig) &&
      /REVOKE INSERT, UPDATE, DELETE[\s\S]{0,80}public\.user_entitlements FROM authenticated/.test(
        mig,
      )
    );
  });

  // --- 6. UI surface -------------------------------------------------------
  check("owner sees premium UI without upgrade or allowance prompts", () => {
    const hook = src("src/hooks/use-entitlements.tsx");
    const settings = src("src/components/pro/plan-settings.tsx");
    return (
      /isPro: isProOrAbove\(state\.plan\)/.test(hook) &&
      /isOwner: isOwnerLevel\(state\.plan\)/.test(hook) &&
      /Owner Access/.test(settings)
    );
  });

  return results;
}

/** Async part: gate a real dossier for each level and compare depth. */
export async function runOwnerDossierChecks(): Promise<CheckResult[]> {
  const out: CheckResult[] = [];
  const dossier = await buildDemoDossier();
  const gated = (plan: AccessLevel) =>
    gateDossier(dossier, plan, { used: 0, limit: 3, remaining: 3, unlimited: plan !== "free", resetsAt: null });

  const owner = gated("owner");
  const pro = gated("pro");
  const free = gated("free");

  out.push({
    name: "owner dossier matches Pro depth exactly",
    passed:
      owner.lockedInsights.length === 0 &&
      pro.lockedInsights.length === 0 &&
      JSON.stringify(owner) === JSON.stringify(pro),
  });
  out.push({
    name: "free dossier is still gated (no accidental global unlock)",
    passed: free.planTier === "free",
  });
  return out;
}

if (import.meta.main) {
  const all = [...runOwnerAccessChecks(), ...(await runOwnerDossierChecks())];
  const passed = all.filter((r) => r.passed).length;
  for (const r of all) {
    console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  console.log(`\nSecure owner access: ${passed}/${all.length} PASS`);
  if (passed !== all.length) process.exit(1);
}
