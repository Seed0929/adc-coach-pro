import { describe, expect, it } from "vitest";
import { assertCustomerOwner, checkoutInput, constantTimeSignature, trustedReturnUrl, validWebhookTimestamp, verifyProPrice } from "./billing-policy";
import { PLAN_CONFIG, CAPABILITIES } from "@/lib/entitlements/plan";

describe("security boundaries", () => {
  it("refuses live checkout and client price/user overrides", () => {
    expect(checkoutInput.safeParse({ cycle: "monthly", environment: "live", returnUrl: "https://botdiff.online" }).success).toBe(false);
    expect(checkoutInput.safeParse({ cycle: "monthly", environment: "sandbox", returnUrl: "http://localhost:8080", priceId: "owner", userId: "other" }).success).toBe(false);
  });
  it("rejects external and production return destinations", () => {
    for (const origin of ["https://evil.test", "https://botdiff.online", "https://botdiffgg.lovable.app"]) {
      expect(() => trustedReturnUrl(`${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`, "/checkout/return")).toThrow();
    }
    expect(trustedReturnUrl("http://localhost:8080/settings", "/settings")).toBe("http://localhost:8080/settings");
  });
  it("never reassigns customer metadata between players", () => {
    expect(() => assertCustomerOwner({ userId: "other" }, "caller")).toThrow();
    expect(() => assertCustomerOwner({}, "caller")).toThrow();
    expect(() => assertCustomerOwner({ userId: "caller" }, "caller")).not.toThrow();
  });
  it("retains Free allowance and Owner capabilities without live billing", () => {
    expect(PLAN_CONFIG.freeFullReportsPerPeriod).toBe(3);
    expect(PLAN_CONFIG.paymentsEnabled).toBe(false);
    expect(CAPABILITIES.owner).toEqual(CAPABILITIES.pro);
  });
});

describe("server-selected catalog", () => {
  it.each([["monthly", 999, "month", "pro_monthly"], ["annual", 7999, "year", "pro_yearly"]] as const)("validates exact %s pricing", (cycle, amount, interval, key) => {
    const price = { active: true, lookup_key: key, unit_amount: amount, currency: "usd", recurring: { interval, interval_count: 1 } };
    expect(() => verifyProPrice(price, cycle)).not.toThrow();
    expect(() => verifyProPrice({ ...price, unit_amount: 1 }, cycle)).toThrow();
    expect(() => verifyProPrice({ ...price, currency: "eur" }, cycle)).toThrow();
  });
});

describe("signature rules", () => {
  it("rejects malformed and expired timestamps", () => {
    const now = 1_800_000_000_000;
    expect(validWebhookTimestamp("NaN", now)).toBe(false);
    expect(validWebhookTimestamp("1799999600", now)).toBe(false);
    expect(validWebhookTimestamp("1800000000", now)).toBe(true);
  });
  it("accepts rotated signatures but rejects altered bodies", () => {
    const signature = "a".repeat(64);
    expect(constantTimeSignature(signature, ["b".repeat(64), signature])).toBe(true);
    expect(constantTimeSignature(signature, ["b".repeat(64)])).toBe(false);
  });
});