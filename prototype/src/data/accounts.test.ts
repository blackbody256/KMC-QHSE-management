import { describe, expect, it } from "vitest";
import { authenticateDemoAccount } from "./accounts";

describe("demonstration login", () => {
  it("signs in the doctor with the doctor role", () => {
    expect(authenticateDemoAccount("doctor@kmc.demo", "Doctor#2026")?.role).toBe("doctor");
  });

  it("normalises email case and surrounding spaces", () => {
    expect(
      authenticateDemoAccount("  MANAGER@KMC.DEMO ", "Manager#2026")?.role,
    ).toBe("management");
  });

  it("rejects an incorrect password", () => {
    expect(authenticateDemoAccount("doctor@kmc.demo", "incorrect")).toBeNull();
  });
});
