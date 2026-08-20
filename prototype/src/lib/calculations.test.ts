import { describe, expect, it } from "vitest";
import { createSeedState } from "../data/seed";
import { labTestCatalogue, labTestGroups } from "../data/labCatalogue";
import {
  absenteeismRate,
  buildDashboardSnapshot,
  calculateBmi,
  evaluateMetric,
  metricTrendData,
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
    expect(metric.yearToDate.displayValue).toBe("1425.0");
    expect(metric.yearToDate.targetLabel).toBe("≥ 1,400 YTD");
  });

  it("uses YTD totals for event metrics rather than averaging monthly counts", () => {
    const snapshot = buildDashboardSnapshot(createSeedState(), "2026-07");
    expect(snapshot.metrics.find((item) => item.id === "S2")?.yearToDate.displayValue).toBe("2");
    expect(snapshot.metrics.find((item) => item.id === "S3")?.yearToDate.displayValue).toBe("1");
  });

  it("weights YTD compliance by its underlying denominator", () => {
    const metric = buildDashboardSnapshot(createSeedState(), "2026-07").metrics.find((item) => item.id === "OH1")!;
    expect(metric.yearToDate.displayValue).toBe("93.8%");
    expect(metric.yearToDate.calculation).toBe("271 completed ÷ 289 scheduled × 100");
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

  it("builds one-scale trend data for any selected KPI", () => {
    const trend = metricTrendData(createSeedState(), "S4", "2026-07");
    expect(trend.at(-1)).toMatchObject({
      periodCode: "2026-07",
      displayValue: "214.0",
      status: "within",
    });
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

describe("laboratory requisition", () => {
  it("models the investigations printed on KMC.DQHSE.05/26-FM008 and nothing else", () => {
    // Seven tests in four groups. If this fails, either the form changed or
    // somebody has added an investigation the clinic does not offer.
    expect(labTestCatalogue).toHaveLength(7);
    expect(new Set(labTestCatalogue.map((test) => test.group))).toEqual(new Set(labTestGroups));
    expect(labTestCatalogue.map((test) => test.code)).toEqual([
      "BS", "MRDT", "TYPHOID_AG", "HPYLORI_AG", "CBC", "RBS", "FBS",
    ]);
  });

  it("carries the fasting instruction the form prints against FBS", () => {
    const fbs = labTestCatalogue.find((test) => test.code === "FBS");
    expect(fbs?.preparationNote).toMatch(/8.*12 hours of fasting/);
  });

  it("attaches each result to the investigation it was requested against", () => {
    const state = createSeedState();
    const resulted = state.labRequisitions.find((entry) => entry.status === "resulted");
    expect(resulted).toBeDefined();
    for (const test of resulted!.tests) {
      expect(labTestCatalogue.some((definition) => definition.code === test.code)).toBe(true);
      expect(test.result).not.toBe("");
    }
  });

  it("leaves results empty until the laboratory has written them", () => {
    const state = createSeedState();
    const requested = state.labRequisitions.find((entry) => entry.status === "requested");
    expect(requested!.tests.every((test) => test.result === "")).toBe(true);
    expect(requested!.specimenCollected).toBeUndefined();
  });
});
