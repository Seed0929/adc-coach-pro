// ---------------------------------------------------------------------------
// Free / Pro pricing experience — deterministic checks.
//
//   bun run src/lib/coaching/coaching-validation-v1/pricing-5-15.ts
//
// Asserts the pricing RULES: exact displayed prices, mathematically correct
// annual equivalent and savings, display-only CTA (no payments anywhere),
// unchanged entitlement/owner architecture, honest Free value, and no
// fabricated scarcity.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import {
  PLAN_CONFIG,
  PRICING,
  PRICING_FAQ,
  FREE_PLAN_POINTS,
  PRO_PLAN_POINTS,
  annualMonthlyEquivalent,
  annualSavingsPercent,
} from "../../entitlements/plan";

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

export function runPricingChecks(): CheckResult[] {
  results.length = 0;

  // --- 1. exact prices ------------------------------------------------------
  check("free is $0 forever", () => PRICING.free.price === "$0" && /forever/i.test(PRICING.free.cadence));
  check("monthly Pro is $9.99", () => PRICING.monthly.amount === 9.99 && PRICING.monthly.price === "$9.99");
  check("annual Pro is $79.99", () => PRICING.annual.amount === 79.99 && PRICING.annual.price === "$79.99");

  // --- 2. derived figures are calculated, not written -----------------------
  check("annual monthly equivalent is $6.67", () => annualMonthlyEquivalent() === "$6.67");
  check("annual saving is 33%", () => annualSavingsPercent() === 33);
  check("savings math matches the two prices", () => {
    const expected = Math.round((1 - PRICING.annual.amount / (PRICING.monthly.amount * 12)) * 100);
    return annualSavingsPercent() === expected;
  });

  // --- 3. no payments anywhere ---------------------------------------------
  check("payments remain disabled", () => PLAN_CONFIG.paymentsEnabled === false);
  check("pricing UI has no checkout, card fields or payment provider", () => {
    // Strip comments first: the source deliberately DOCUMENTS the absence of these.
    const page = (src("src/components/pricing/pricing-plans.tsx") + src("src/routes/pricing.tsx"))
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    return !/stripe|paddle|checkout|card number|cvc|billing address|<input/i.test(page);
  });
  check("Pro CTA opens an honest coming-soon panel", () => {
    const page = src("src/components/pricing/pricing-plans.tsx");
    return (
      page.includes("Get BotDiff Pro") &&
      page.includes("PRO_COMING_SOON") &&
      page.includes("Continue with Free")
    );
  });
  check("no fabricated scarcity or fake discounts", () => {
    const page = src("src/components/pricing/pricing-plans.tsx");
    return !/only today|limited time|hurry|act now|expires in|was \$|\d+% off/i.test(page);
  });

  // --- 4. Free is presented as a real product ------------------------------
  check("free bullets lead with the weekly report allowance", () =>
    FREE_PLAN_POINTS[0] === `${PLAN_CONFIG.freeFullReportsPerPeriod} personalized coaching reports every week`);
  check("free allowance shown is the configured allowance", () =>
    PLAN_CONFIG.freeFullReportsPerPeriod === 3);
  check("no credit card claim is present on the free card", () =>
    src("src/components/pricing/pricing-plans.tsx").includes("No credit card required"));
  check("FAQ omits cancellation while billing is inactive", () =>
    !PRICING_FAQ.some((f) => /cancel/i.test(f.q)));
  check("FAQ answers the four required questions", () => {
    const qs = PRICING_FAQ.map((f) => f.q.toLowerCase()).join(" | ");
    return (
      qs.includes("actually free") &&
      qs.includes("reports") &&
      qs.includes("pro add") &&
      qs.includes("credit card")
    );
  });

  // --- 5. Pro claims map to implemented capabilities -----------------------
  check("pro bullets advertise no item-build recommendations", () =>
    !PRO_PLAN_POINTS.some((p) => /build|item/i.test(p)));
  check("pro bullets include everything in free", () => PRO_PLAN_POINTS.includes("Everything in Free"));

  // --- 6. entitlement + owner architecture untouched -----------------------
  check("pricing UI cannot change entitlements", () => {
    const page = src("src/components/pricing/pricing-plans.tsx") + src("src/routes/pricing.tsx");
    return !/setDevPlan|switchPlan|writePlan|user_entitlements|user_roles/.test(page);
  });
  check("plan resolution still happens on the server", () => {
    const server = src("src/lib/entitlements/entitlements.server.ts");
    return server.includes("has_role") && /owner/.test(server);
  });
  check("owner still inherits pro capabilities from the pro map", () => {
    const plan = src("src/lib/entitlements/plan.ts");
    return plan.includes("Object.keys(PLAN_CAPABILITIES.pro)");
  });

  // --- 7. discoverable, Riot-safe positioning ------------------------------
  check("homepage links to pricing", () => src("src/components/landing-page.tsx").includes('to="/pricing"'));
  check("pricing page states it is not endorsed by Riot", () =>
    src("src/routes/pricing.tsx").includes("not endorsed by Riot Games"));
  check("pricing copy does not sell Riot data", () =>
    src("src/components/pricing/pricing-plans.tsx").includes("not for Riot's data"));

  return results;
}

if (import.meta.main) {
  const all = runPricingChecks();
  for (const r of all) {
    console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  const passed = all.filter((r) => r.passed).length;
  console.log(`\nFree/Pro pricing experience: ${passed}/${all.length} PASS`);
  if (passed !== all.length) process.exitCode = 1;
}
