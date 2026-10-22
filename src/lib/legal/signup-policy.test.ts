import { describe, expect, it } from "vitest";
import { canSubmitAccountForm } from "./signup-policy";

describe("email signup acknowledgment", () => {
  it("blocks signup with the default unchecked acknowledgment", () => {
    expect(canSubmitAccountForm("signup", false)).toBe(false);
  });
  it("allows signup after explicit acknowledgment", () => {
    expect(canSubmitAccountForm("signup", true)).toBe(true);
  });
  it("does not gate existing sign-in", () => {
    expect(canSubmitAccountForm("login", false)).toBe(true);
  });
  it("does not gate password reset", () => {
    expect(canSubmitAccountForm("forgot", false)).toBe(true);
  });
});