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
