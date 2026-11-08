import { afterEach, describe, expect, it } from "vitest";
import { verifyWebhook } from "@/lib/stripe.server";

const original = process.env["PAYMENTS_SANDBOX_WEBHOOK_SECRET"];
afterEach(() => { if (original === undefined) delete process.env["PAYMENTS_SANDBOX_WEBHOOK_SECRET"]; else process.env["PAYMENTS_SANDBOX_WEBHOOK_SECRET"] = original; });
describe("webhook authentication", () => {
  it("validates a real HMAC and rejects changed payload", async () => {
    const secret = "unit-test-only-not-a-credential";
    process.env["PAYMENTS_SANDBOX_WEBHOOK_SECRET"] = secret;
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({ id: "evt_test", created: Number(timestamp), type: "invoice.paid", livemode: false, data: { object: {} } });
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
    const signature = Buffer.from(signed).toString("hex");
    const request = (payload: string) => new Request("https://example.test", { method: "POST", headers: { "stripe-signature": `t=${timestamp},v1=${signature}` }, body: payload });
    expect((await verifyWebhook(request(body), "sandbox")).id).toBe("evt_test");
    await expect(verifyWebhook(request(body + " "), "sandbox")).rejects.toThrow("signature");
  });
});