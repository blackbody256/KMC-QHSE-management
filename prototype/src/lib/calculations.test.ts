import { describe, expect, it } from "vitest";
import { createSeedState } from "../data/seed";
import {
  absenteeismRate,
  buildDashboardSnapshot,
  calculateBmi,
  effectiveLabRanges,
  evaluateMetric,
  referralSickLeaveDaysForPeriod,
  safePercent,
} from "./calculations";

describe("Health and Wellness dashboard calculations", () => {
  it("returns no value for invalid denominators", () => {
    expect(safePercent(1, 0)).toBeNull();
    expect(absenteeismRate(4, 0)).toBeNull();
  });

  it("renders the five client indicators alongside four retained indicators", () => {
    const snapshot = buildDashboardSnapshot(createSeedState(), "2026-07");
    expect(snapshot.metrics).toHaveLength(9);
    expect(snapshot.metrics.filter((metric) => metric.id.startsWith("S")).map((metric) => metric.name)).toEqual([
      "Fatality",
      "Total Recordable Incidents",
      "Total Recordable Injuries",
      "Reportable Near Misses",
      "Health-Related Absenteeism",
    ]);
  });

  it("treats near-miss reporting as higher-is-better", () => {
    const metric = buildDashboardSnapshot(createSeedState(), "2026-07").metrics.find((item) => item.id === "S4")!;
    expect(metric.direction).toBe("higher");
    expect(metric.target).toBe("≥ 200");
    expect(metric.month.displayValue).toBe("214.0");
    expect(metric.month.status).toBe("within");
    expect(metric.yearToDate.displayValue).toBe("203.6");
  });

  it("does not average incomplete year-to-date histories", () => {
    const snapshot = buildDashboardSnapshot(createSeedState(), "2026-07");
    expect(snapshot.metrics.find((item) => item.id === "OH3")?.yearToDate).toMatchObject({
      displayValue: "Incomplete history",
      status: "no-data",
      completeness: "incomplete",
    });
  });

  it("links returned referral sick leave into absenteeism", () => {
    const state = createSeedState();
    expect(referralSickLeaveDaysForPeriod(state, "2026-07")).toBe(2);
    expect(buildDashboardSnapshot(state, "2026-07").metrics.find((item) => item.id === "S5")?.month.displayValue).toBe("0.39");
  });

  it("shows no data rather than zero for an absent return", () => {
    const metric = buildDashboardSnapshot(createSeedState(), "2026-08").metrics.find((item) => item.id === "S1")!;
    expect(metric.month.displayValue).toBe("No data");
    expect(metric.month.status).toBe("no-data");
  });

  it("reads approaching bands from effective-dated definitions", () => {
    const definition = createSeedState().kpiDefinitions.find((item) => item.metricId === "S4")!;
    expect(evaluateMetric(185, definition)).toBe("approaching");
    expect(evaluateMetric(179, definition)).toBe("outside");
  });

  it("derives BMI only when both visit measurements exist", () => {
    expect(calculateBmi(64, 165)).toBe(23.5);
    expect(calculateBmi(64, undefined)).toBeUndefined();
  });
});

describe("laboratory reference history", () => {
  it("selects only reference ranges effective on the result date", () => {
    const state = createSeedState();
    state.labReferenceRanges[0].effectiveTo = "2026-06-30";
    expect(effectiveLabRanges(state, "2026-07-23").some((range) => range.id === state.labReferenceRanges[0].id)).toBe(false);
  });

  it("keeps the stored range and abnormal flag unchanged after reference data is revised", () => {
    const state = createSeedState();
    const result = state.labResults[0];
    state.labReferenceRanges[0].displayRange = "Revised later";
    expect(result.rangeApplied.displayRange).toBe("12.0–17.5");
    expect(result.abnormal).toBe(true);
  });
});
