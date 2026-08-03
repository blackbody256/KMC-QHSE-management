import { describe, expect, it } from "vitest";
import { roleCanAccessPath } from "./access";

describe("prototype route capabilities", () => {
  it("allows only the Officer into clinical and entry routes", () => {
    expect(roleCanAccessPath("health-wellness-officer", "/patients")).toBe(true);
    expect(roleCanAccessPath("manager", "/patients")).toBe(false);
    expect(roleCanAccessPath("director", "/workplace-safety/incidents/new")).toBe(false);
  });

  it("allows Manager operational read-only routes and limits Director to dashboard", () => {
    expect(roleCanAccessPath("manager", "/workplace-safety")).toBe(true);
    expect(roleCanAccessPath("manager", "/quality-inspection-testing")).toBe(true);
    expect(roleCanAccessPath("director", "/workplace-safety")).toBe(false);
    expect(roleCanAccessPath("director", "/")).toBe(true);
  });
});
