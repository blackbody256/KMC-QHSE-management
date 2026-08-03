import { describe, expect, it } from "vitest";
import { authenticateDemoAccount, demoAccounts } from "./accounts";

describe("demonstration login", () => {
  it("provides the three guided workflow accounts", () => {
    expect(demoAccounts.map((account) => account.role)).toEqual([
      "health-wellness-officer",
      "manager",
      "director",
    ]);
  });

  it("signs in the Health and Wellness Officer", () => {
    expect(authenticateDemoAccount("officer@kmc.demo", "Officer#2026")?.role).toBe(
      "health-wellness-officer",
    );
  });

  it("normalises email case and surrounding spaces", () => {
    expect(
      authenticateDemoAccount("  MANAGER@KMC.DEMO ", "Manager#2026")?.role,
    ).toBe("manager");
  });

  it("rejects an incorrect password", () => {
    expect(authenticateDemoAccount("officer@kmc.demo", "incorrect")).toBeNull();
  });
});
