import { describe, expect, it } from "vitest";
import { absenteeismRate, buildDashboardSnapshot, safePercent } from "./calculations";
import { createSeedState } from "../data/seed";

describe("metric calculations", () => {
  it("returns no value for invalid denominators", () => {
    expect(safePercent(1, 0)).toBeNull();
    expect(absenteeismRate(4, 0)).toBeNull();
  });

  it("calculates the July worked example", () => {
    const snapshot = buildDashboardSnapshot(createSeedState(), "2026-07");
    expect(snapshot.metrics.find((metric) => metric.id === "K1")?.displayValue).toBe("92.5%");
    expect(snapshot.metrics.find((metric) => metric.id === "K3")?.displayValue).toBe("0.39");
    expect(snapshot.metrics.find((metric) => metric.id === "K5")?.displayValue).toBe("83.3%");
  });

  it("shows no data when a return is missing", () => {
    const snapshot = buildDashboardSnapshot(createSeedState(), "2027-01");
    expect(snapshot.metrics.find((metric) => metric.id === "K1")?.status).toBe("no-data");
    expect(snapshot.metrics.find((metric) => metric.id === "K3")?.displayValue).toBe("—");
  });
});
