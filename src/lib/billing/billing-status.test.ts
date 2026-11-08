import { describe, expect, it } from "vitest";
import { isProPriceId, subscriptionGrantsPro } from "./billing-status";

const now = new Date("2026-10-16T00:00:00Z");
const future = "2026-11-16T00:00:00Z";
const past = "2026-10-01T00:00:00Z";

describe("subscriptionGrantsPro", () => {
  it("active subscription grants Pro", () => {
    expect(subscriptionGrantsPro({ status: "active", current_period_end: future }, now)).toBe(true);
  });
  it("canceled keeps Pro until the paid period ends", () => {
    expect(subscriptionGrantsPro({ status: "canceled", current_period_end: future }, now)).toBe(true);
    expect(subscriptionGrantsPro({ status: "canceled", current_period_end: past }, now)).toBe(false);
  });
  it("past_due keeps Pro while payment is retried", () => {
    expect(subscriptionGrantsPro({ status: "past_due", current_period_end: future }, now)).toBe(true);
  });
  it("unpaid / incomplete never grant Pro", () => {
    expect(subscriptionGrantsPro({ status: "unpaid", current_period_end: future }, now)).toBe(false);
    expect(subscriptionGrantsPro({ status: "incomplete", current_period_end: future }, now)).toBe(false);
  });
});

describe("price ids", () => {
  it("only the monthly and annual Pro prices are sellable", () => {
    expect(isProPriceId("pro_monthly")).toBe(true);
    expect(isProPriceId("pro_yearly")).toBe(true);
    expect(isProPriceId("owner")).toBe(false);
  });
});

describe("subscriptionGrantsPro fails closed", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("denies missing period end for paid statuses", () => {
    expect(subscriptionGrantsPro({ status: "active", current_period_end: null }, now)).toBe(false);
    expect(subscriptionGrantsPro({ status: "trialing", current_period_end: null }, now)).toBe(false);
  });
  it("denies an unparseable period end", () => {
    expect(subscriptionGrantsPro({ status: "active", current_period_end: "not-a-date" }, now)).toBe(false);
  });
  it("denies unknown or non-string statuses", () => {
    const end = "2026-02-01T00:00:00Z";
    expect(subscriptionGrantsPro({ status: "paused", current_period_end: end }, now)).toBe(false);
    expect(subscriptionGrantsPro({ status: "ACTIVE", current_period_end: end }, now)).toBe(false);
    expect(subscriptionGrantsPro({ status: null, current_period_end: end }, now)).toBe(false);
  });
});

describe("renewal and failed-payment lifecycle", () => {
  it("renewal extends access only through the new verified period", () => {
    const now = new Date("2026-12-01T00:00:00Z");
    expect(subscriptionGrantsPro({ status: "active", current_period_end: "2026-11-30T00:00:00Z" }, now)).toBe(false);
    expect(subscriptionGrantsPro({ status: "active", current_period_end: "2026-12-30T00:00:00Z" }, now)).toBe(true);
  });
  it("final payment failure revokes access even with a future period", () => {
    expect(subscriptionGrantsPro({ status: "unpaid", current_period_end: future }, now)).toBe(false);
    expect(subscriptionGrantsPro({ status: "incomplete_expired", current_period_end: future }, now)).toBe(false);
  });
  it("cancellation expires exactly at period end", () => {
    expect(subscriptionGrantsPro({ status: "canceled", current_period_end: now.toISOString() }, now)).toBe(false);
  });
});
