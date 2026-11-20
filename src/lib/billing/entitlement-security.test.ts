import { describe, expect, it, vi, beforeEach } from "vitest";
const settled = vi.hoisted(() => vi.fn());
vi.mock("@/lib/billing/settlement.server", () => ({ initialInvoiceSettled: settled }));
vi.mock("@/lib/stripe.server", () => ({ serverBillingEnv: () => "sandbox", createStripeClient: () => ({}) }));
beforeEach(() => settled.mockResolvedValue(true));
import { loadPlan, devToggleAllowed } from "@/lib/entitlements/entitlements.server";

function client(roles: string[], subscription: unknown[] = [], internalPlan = "pro") {
  return {
    rpc: async (_name: string, args: { _role: string }) => ({ data: roles.includes(args._role) }),
    from: (table: string) => ({
      select: () => ({ eq: () => ({
        eq: async () => ({ data: subscription }),
        maybeSingle: async () => ({ data: { plan: internalPlan } }),
      }) }),
    }),
  } as unknown as Parameters<typeof loadPlan>[0];
}
describe("server entitlement escalation protection", () => {
  it("old active database rows do not bypass unsettled initial invoices", async () => {
    settled.mockResolvedValue(false);
    expect(await loadPlan(client([], [{ status: "active", current_period_end: "2099-01-01", price_id: "pro_monthly" }]), "player")).toBe("free");
  });
  it("ordinary players cannot use internal Pro grants", async () => {
    const player = client([]);
    expect(await devToggleAllowed(player, "player")).toBe(false);
    expect(await loadPlan(player, "player")).toBe("free");
  });
  it("Owner remains independent of failed or canceled billing", async () => {
    expect(await loadPlan(client(["owner"], [{ status: "unpaid" }]), "owner")).toBe("owner");
  });
  it("unsupported price cannot unlock Pro", async () => {
    expect(await loadPlan(client([], [{ status: "active", current_period_end: "2099-01-01", price_id: "owner" }]), "player")).toBe("free");
  });
  it("confirmed supported subscription unlocks Pro", async () => {
    expect(await loadPlan(client([], [{ status: "active", current_period_end: "2099-01-01", price_id: "pro_monthly" }]), "player")).toBe("pro");
  });
});