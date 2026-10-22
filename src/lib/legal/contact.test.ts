import { describe, expect, it } from "vitest";
import { BOTDIFF_CONTACT_EMAIL, BOTDIFF_CONTACT_HREF } from "./contact";

describe("owner-specified public contact", () => {
  it("uses the regular BotDiff Gmail exactly", () => {
    expect(BOTDIFF_CONTACT_EMAIL).toBe("botdiffgg@gmail.com");
  });
  it("addresses requests to that same mailbox", () => {
    expect(BOTDIFF_CONTACT_HREF).toBe("mailto:botdiffgg@gmail.com");
  });
});