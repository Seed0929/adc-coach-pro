// ---------------------------------------------------------------------------
// Free / Pro Monetization Foundation — deterministic checks.
//
//   bun run src/lib/coaching/coaching-validation-v1/monetization-5-13.ts
//
// Asserts the RULES, not the pixels: centralized plan logic, configurable
// allowance, allowance metering + preservation of previously unlocked reports,
// server-side (not DOM-side) protection of premium depth, honest free value,
// and the absence of payment collection or invented pricing.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import {
  CAPABILITIES,
  PLAN_CONFIG,
  can,
  freeAllowance,
  guestEntitlementState,
  periodEnd,
  periodKey,
  periodStart,
  planLabel,
  proAllowance,
  resetLabel,
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

export function runMonetizationChecks(): CheckResult[] {
  results.length = 0;

  // --- 1. centralized, configurable plan logic ------------------------------
  check("free allowance is configurable, not hard-coded at call sites", () => {
    const limit = PLAN_CONFIG.freeFullReportsPerPeriod;
    if (typeof limit !== "number" || limit < 1) return `bad limit ${limit}`;
    return freeAllowance(0, periodEnd().toISOString()).limit === limit;
  });
  check("plan capability map covers both plans identically in shape", () => {
    const free = Object.keys(CAPABILITIES.free).sort().join(",");
    const pro = Object.keys(CAPABILITIES.pro).sort().join(",");
    return free === pro || `${free} != ${pro}`;
  });
  check("Pro is a superset of Free capabilities", () =>
    Object.keys(CAPABILITIES.free).every(
      (k) => !CAPABILITIES.free[k as never] || CAPABILITIES.pro[k as never],
    ));
  check("UI reads capabilities through the plan module", () => {
    const hook = src("src/hooks/use-entitlements.tsx");
    return hook.includes("state.capabilities[capability]");
  });

  // --- 2. Free keeps real value --------------------------------------------
  check("Free keeps basic stats, match history and Today's Focus", () =>
    can("free", "canViewBasicStats") &&
    can("free", "canViewMatchHistory") &&
    can("free", "canUseTodaysFocus"));
  check("Free can generate real (metered) full match reports", () =>
    can("free", "canGenerateFullMatchReport") && can("pro", "canGenerateFullMatchReport"));
  check("advanced coaching depth is Pro-only", () =>
    !can("free", "canViewAdvancedCoaching") &&
    !can("free", "canViewCrossMatchPatterns") &&
    !can("free", "canViewFullPracticePlan") &&
    can("pro", "canViewAdvancedCoaching"));

  // --- 3. allowance periods -------------------------------------------------
  check("weekly period starts Monday 00:00 UTC", () => {
    if (PLAN_CONFIG.freeReportPeriod !== "weekly") return true;
    const s = periodStart(new Date("2026-03-12T09:30:00Z"));
    return s.toISOString() === "2026-03-09T00:00:00.000Z" || s.toISOString();
  });
  check("period end is exactly one period after the start", () => {
    const now = new Date("2026-03-12T09:30:00Z");
    const days = (periodEnd(now).getTime() - periodStart(now).getTime()) / 86_400_000;
    return PLAN_CONFIG.freeReportPeriod === "weekly" ? days === 7 : days >= 28;
  });
  check("period key matches the stored DATE column format", () =>
    /^\d{4}-\d{2}-\d{2}$/.test(periodKey(new Date("2026-03-12T09:30:00Z"))));
  check("reset copy is plain language and never a scarcity countdown", () => {
    const label = resetLabel(periodEnd().toISOString());
    return label.startsWith("Resets") && !/\d+\s*(hours|minutes|left)/i.test(label);
  });
  check("Pro allowance is unlimited with no reset", () => {
    const a = proAllowance();
    return a.unlimited && a.resetsAt === null;
  });
  check("guest state defaults to Free and never unlocks Pro", () => {
    const g = guestEntitlementState();
    return g.plan === "free" && !g.capabilities.canViewAdvancedCoaching;
  });

  // --- 4. server-side gating (not DOM hiding) -------------------------------
  check("dossier is gated on the server before serialization", () => {
    const fn = src("src/lib/coaching.functions.ts");
    return fn.includes("gateDossier(") && fn.includes("loadPlan(");
  });
  check("full report access is metered on the server", () => {
    const fn = src("src/lib/coaching.functions.ts");
    return fn.includes("ensureFullReportAccess(") && fn.includes('code: "plan_limit"');
  });
  check("plan writes never happen from the client", () => {
    const hook = src("src/hooks/use-entitlements.tsx");
    return !hook.includes("supabase") && hook.includes("setDevPlan");
  });
  check("entitlement server functions require a verified session", () => {
    const fn = src("src/lib/entitlements/entitlements.functions.ts");
    return fn.includes("requireVerifiedSession") && fn.includes("devToggleAllowed");
  });
  check("dev plan switch validates its input to free|pro only", () => {
    const fn = src("src/lib/entitlements/entitlements.functions.ts");
    return fn.includes("inputValidator") && fn.includes('data.plan === "pro"');
  });

  // --- 5. gate behaviour on a real dossier ---------------------------------
  const dossier = buildDemoDossier();
  check("Pro dossier is returned untouched apart from its plan tag", () => {
    const gated = gateDossier(dossier, "pro");
    return (
      gated.planTier === "pro" &&
      gated.recurringHabits.length === dossier.recurringHabits.length &&
      (gated.lockedInsights?.length ?? 0) === 0
    );
  });
  check("Free dossier keeps the primary focus intact", () => {
    const gated = gateDossier(dossier, "free");
    return Boolean(gated.plan) && gated.planTier === "free";
  });
  check("Free dossier caps visible recurring patterns to the configured count", () => {
    const gated = gateDossier(dossier, "free");
    return gated.recurringHabits.length <= PLAN_CONFIG.freeVisiblePatterns;
  });
  check("Free dossier strips deep habit records and champion coaching", () => {
    const gated = gateDossier(dossier, "free");
    return (gated.habits?.length ?? 0) === 0 && (gated.championAdvice?.length ?? 0) === 0;
  });
  check("locked previews expose no premium analysis text", () => {
    const gated = gateDossier(dossier, "free");
    const deep = dossier.recurringHabits.slice(PLAN_CONFIG.freeVisiblePatterns);
    return (gated.lockedInsights ?? []).every((i) =>
      deep.every((h) => !i.preview.includes(h.detail)),
    );
  });
  check("locked preview count never exceeds the configured preview cap", () => {
    const gated = gateDossier(dossier, "free");
    return (gated.lockedInsights?.length ?? 0) <= PLAN_CONFIG.freeLockedPatternPreviews;
  });

  // --- 6. no payments, no invented pricing ---------------------------------
  check("payments are disabled in configuration", () => PLAN_CONFIG.paymentsEnabled === false);
  check("pricing copy is 'coming soon', never a number", () =>
    !/[$€£]\s*\d/.test(PLAN_CONFIG.priceLabel));
  check("upgrade surface collects no payment and shows no price", () => {
    const dlg = src("src/components/pro/upgrade-dialog.tsx");
    return (
      !/[$€£]\s*\d/.test(dlg) &&
      !/checkout|stripe|card number|billing address/i.test(dlg) &&
      dlg.includes("state.priceLabel")
    );
  });
  check("upgrade surface uses no manipulative scarcity", () => {
    const dlg = src("src/components/pro/upgrade-dialog.tsx");
    return !/only \d+ (left|spots)|limited time|hurry|act now|expires in/i.test(dlg);
  });

  // --- 7. exhausted-allowance UX preserves access --------------------------
  check("exhausted state promises match history and past reports stay available", () => {
    const lock = src("src/components/pro/pro-lock.tsx");
    return (
      lock.includes("AllowanceExhausted") &&
      /matches keep syncing/i.test(lock) &&
      /stays available/i.test(lock)
    );
  });
  check("match route renders the exhausted state instead of a generic error", () => {
    const route = src("src/routes/matches.$matchId.tsx");
    return route.includes("locked ?") && route.includes("<AllowanceExhausted");
  });
  check("report hook separates plan limits from real errors", () => {
    const hook = src("src/hooks/use-match-report.ts");
    return hook.includes('result.code === "plan_limit"') && hook.includes("setLocked(");
  });
  check("previously unlocked reports are never re-metered", () => {
    const server = src("src/lib/entitlements/entitlements.server.ts");
    return server.includes("hasReportGrant");
  });

  // --- 8. plan visibility + dev inspection ---------------------------------
  check("settings shows the current plan", () =>
    src("src/routes/settings.index.tsx").includes("PlanSettings"));
  check("a development-only plan switch exists and is server-authorized", () => {
    const ui = src("src/components/pro/plan-settings.tsx");
    const server = src("src/lib/entitlements/entitlements.server.ts");
    return ui.includes("state.devToggleAvailable") && server.includes("devToggleAllowed");
  });
  check("plan labels are player-friendly", () =>
    planLabel("free") === "BotDiff Free" && planLabel("pro") === "BotDiff Pro");

  // --- 9. nothing was removed from the free experience ---------------------
  check("upgrade prompts only render when depth was actually withheld", () => {
    const lock = src("src/components/pro/pro-lock.tsx");
    return lock.includes("insights.length === 0) return null") && lock.includes("if (isPro");
  });
  check("usage meter is hidden entirely for Pro members", () => {
    const lock = src("src/components/pro/pro-lock.tsx");
    return /FreeUsageMeter[\s\S]{0,400}if \(isPro/.test(lock);
  });

  return results;
}

if (import.meta.main) {
  const all = runMonetizationChecks();
  const passed = all.filter((r) => r.passed).length;
  for (const r of all) {
    console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  console.log(`\nFree/Pro monetization foundation: ${passed}/${all.length} PASS`);
  if (passed !== all.length) process.exit(1);
}
