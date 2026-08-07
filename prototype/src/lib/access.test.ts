import { describe, expect, it } from "vitest";
import { roleCanAccessPath } from "./access";

describe("prototype route capabilities", () => {
  it("allows only the Officer into clinical and entry routes", () => {
    expect(roleCanAccessPath("health-wellness-officer", "/patients")).toBe(true);
    expect(roleCanAccessPath("manager", "/patients")).toBe(false);
    expect(roleCanAccessPath("manager", "/laboratory")).toBe(false);
    expect(roleCanAccessPath("director", "/referrals/details")).toBe(false);
  });

  it("allows Manager operational read-only routes and limits Director to dashboard", () => {
    expect(roleCanAccessPath("manager", "/industrial-hygiene")).toBe(true);
    expect(roleCanAccessPath("manager", "/monthly-returns")).toBe(true);
    expect(roleCanAccessPath("director", "/industrial-hygiene")).toBe(false);
    expect(roleCanAccessPath("director", "/")).toBe(true);
  });
});
