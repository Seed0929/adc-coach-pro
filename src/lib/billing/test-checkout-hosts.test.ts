import { describe, expect, it } from "vitest";
import { isTestCheckoutOrigin } from "./test-checkout-hosts";
import { trustedReturnUrl } from "./billing-policy";

describe("test checkout host allowlist", () => {
  it("allows the approved hosted preview preview--botdiffgg.lovable.app", () => {
    expect(isTestCheckoutOrigin("https://preview--botdiffgg.lovable.app")).toBe(true);
    expect(isTestCheckoutOrigin("https://id-preview--78e292a8-9045-4850-a622-8e79115188ed.lovable.app")).toBe(true);
  });
  it("never allows production or custom domains", () => {
    for (const o of ["https://botdiff.online", "https://www.botdiff.online", "https://botdiffgg.lovable.app",
      "https://project--78e292a8-9045-4850-a622-8e79115188ed.lovable.app"]) {
      expect(isTestCheckoutOrigin(o)).toBe(false);
    }
  });
  it("rejects look-alike hosts and insecure protocols", () => {
    for (const o of ["https://preview--botdiffgg.lovable.app.evil.com", "https://evil-preview--botdiffgg.lovable.app",
      "http://preview--botdiffgg.lovable.app", "https://preview-2--botdiffgg.lovable.app", "not a url"]) {
      expect(isTestCheckoutOrigin(o)).toBe(false);
    }
  });
  it("requires the return URL to match the real request origin", () => {
    const url = "https://preview--botdiffgg.lovable.app/checkout/return?session_id={CHECKOUT_SESSION_ID}";
    expect(trustedReturnUrl(url, "/checkout/return", "https://preview--botdiffgg.lovable.app")).toBe(url);
    expect(() => trustedReturnUrl(url, "/checkout/return", "https://botdiff.online")).toThrow();
  });
});
