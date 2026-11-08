import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const mocks = vi.hoisted(() => ({ retrieveSub: vi.fn(), retrieveCustomer: vi.fn(), retrievePrice: vi.fn(), rpc: vi.fn(), mapping: vi.fn() }));
vi.mock("@/lib/stripe.server", () => ({ createStripeClient: () => ({
  subscriptions: { retrieve: mocks.retrieveSub }, customers: { retrieve: mocks.retrieveCustomer }, prices: { retrieve: mocks.retrievePrice },
}) }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.mapping }) }) }) }),
} }));
import { syncVerifiedSubscription } from "./subscription-sync.server";

const event = { id: "evt_verified", created: 1800000000 } as Stripe.Event;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.retrieveSub.mockResolvedValue({ id: "sub_real", livemode: false, customer: "cus_real", metadata: { userId: "player" }, status: "active", cancel_at_period_end: false,
    items: { data: [{ quantity: 1, price: { id: "price_real" }, current_period_start: 1800000000, current_period_end: 1802592000 }] } });
  mocks.retrieveCustomer.mockResolvedValue({ id: "cus_real", metadata: { userId: "player" } });
  mocks.mapping.mockResolvedValue({ data: { user_id: "player" }, error: null });
  mocks.retrievePrice.mockResolvedValue({ active: true, lookup_key: "pro_monthly", unit_amount: 999, currency: "usd", recurring: { interval: "month", interval_count: 1 }, product: "prod_real" });
  mocks.rpc.mockResolvedValue({ data: "applied", error: null });
});
describe("authoritative webhook processing", () => {
  it("ignores event snapshot status and retrieves authoritative Stripe state", async () => {
    await syncVerifiedSubscription(event, "sub_real", "sandbox");
    expect(mocks.retrieveSub).toHaveBeenCalledWith("sub_real");
    expect(mocks.rpc).toHaveBeenCalledWith("apply_billing_subscription", expect.objectContaining({
      p_event_id: "evt_verified", p_env: "sandbox", p_row: expect.objectContaining({ status: "active", user_id: "player", price_id: "pro_monthly" }),
    }));
  });
  it("never acknowledges failed persistence as success", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(syncVerifiedSubscription(event, "sub_real", "sandbox")).rejects.toThrow("42501");
  });
  it("replayed event uses the atomic receipt result", async () => {
    mocks.rpc.mockResolvedValue({ data: "duplicate", error: null });
    expect(await syncVerifiedSubscription(event, "sub_real", "sandbox")).toBe("duplicate");
  });
  it("rejects customer/account escalation before any write", async () => {
    mocks.retrieveCustomer.mockResolvedValue({ metadata: { userId: "other-player" } });
    await expect(syncVerifiedSubscription(event, "sub_real", "sandbox")).rejects.toThrow("ownership");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects live state delivered to the test endpoint", async () => {
    const sub = await mocks.retrieveSub();
    mocks.retrieveSub.mockResolvedValue({ ...sub, livemode: true });
    await expect(syncVerifiedSubscription(event, "sub_real", "sandbox")).rejects.toThrow("environment");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(["past_due", "unpaid", "canceled"])("persists authoritative %s lifecycle state", async status => {
    const sub = await mocks.retrieveSub();
    mocks.retrieveSub.mockResolvedValue({ ...sub, status });
    await syncVerifiedSubscription(event, "sub_real", "sandbox");
    expect(mocks.rpc).toHaveBeenCalledWith("apply_billing_subscription", expect.objectContaining({ p_row: expect.objectContaining({ status }) }));
  });
});