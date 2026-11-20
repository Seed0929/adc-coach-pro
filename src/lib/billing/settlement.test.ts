import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { initialInvoiceSettled } from "./settlement.server";
import { eventSubscriptionId } from "./lifecycle";

const invoice = { id: "in_initial", billing_reason: "subscription_create", status: "paid", amount_remaining: 0, customer: "cus_player", livemode: false, parent: { subscription_details: { subscription: "sub_player" } } };
const client = (data: unknown[]) => ({ invoices: { list: vi.fn().mockResolvedValue({ data, has_more: false }) } }) as unknown as Stripe;
describe("initial settlement", () => {
  it("only a settled initial invoice establishes paid access", async () => {
    expect(await initialInvoiceSettled(client([invoice]), "sub_player", "cus_player", "sandbox")).toBe(true);
    expect(await initialInvoiceSettled(client([{ ...invoice, status: "open", amount_remaining: 999 }]), "sub_player", "cus_player", "sandbox")).toBe(false);
  });
  it("paid renewal alone cannot establish first settlement", async () => {
    expect(await initialInvoiceSettled(client([{ ...invoice, billing_reason: "subscription_cycle" }]), "sub_player", "cus_player", "sandbox")).toBe(false);
  });
  it("unsettled renewal does not erase verified initial settlement", async () => {
    expect(await initialInvoiceSettled(client([{ ...invoice, billing_reason: "subscription_cycle", status: "open" }, invoice]), "sub_player", "cus_player", "sandbox")).toBe(true);
  });
  it.each([{ livemode: true }, { customer: "cus_other" }, { parent: { subscription_details: { subscription: "sub_other" } } }])("rejects mismatched invoice context %j", async changes => {
    expect(await initialInvoiceSettled(client([{ ...invoice, ...changes }]), "sub_player", "cus_player", "sandbox")).toBe(false);
  });
  it("missing invoices deny access", async () => {
    expect(await initialInvoiceSettled(client([]), "sub_player", "cus_player", "sandbox")).toBe(false);
  });
});
describe("invoice lifecycle routing", () => {
  it.each(["invoice.payment_action_required", "invoice.payment_failed", "invoice.paid"])("routes %s with current and legacy references", type => {
    const event = { type, data: { object: { parent: { subscription_details: { subscription: "sub_player" } } } } } as Stripe.Event;
    expect(eventSubscriptionId(event)).toBe("sub_player");
    expect(eventSubscriptionId({ ...event, data: { object: { subscription: "sub_player" } } } as unknown as Stripe.Event)).toBe("sub_player");
  });
});