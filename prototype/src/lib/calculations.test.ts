import { describe, expect, it } from "vitest";
import { createSeedState } from "../data/seed";
import {
  absenteeismRate,
  buildDashboardSnapshot,
  buildSafetyDashboardSnapshot,
  canAttestSafetyPeriod,
  disclosureCount,
  expiryStatus,
  managerSafetyBreakdown,
  safePercent,
  treatedByHealthAndWellness,
} from "./calculations";

describe("health and monitoring calculations", () => {
  it("returns no value for invalid denominators", () => {
    expect(safePercent(1, 0)).toBeNull();
    expect(absenteeismRate(4, 0)).toBeNull();
  });

  it("calculates the July Health and Wellness example", () => {
    const snapshot = buildDashboardSnapshot(createSeedState(), "2026-07");
    expect(snapshot.metrics.map((metric) => metric.id)).toEqual(["K1", "K2", "K3", "K4", "K5"]);
    expect(snapshot.metrics.find((metric) => metric.id === "K1")?.displayValue).toBe("92.5%");
    expect(snapshot.metrics.find((metric) => metric.id === "K3")?.displayValue).toBe("0.39");
    expect(snapshot.metrics.find((metric) => metric.id === "K4")?.displayValue).toBe("91.7%");
    expect(snapshot.metrics.find((metric) => metric.id === "K5")?.displayValue).toBe("83.3%");
  });

  it("excludes indoor and ambient readings from K4", () => {
    const state = createSeedState();
    const eligible = state.environmentalReadings.filter((row) => row.k4Eligible);
    expect(eligible).toHaveLength(12);
    expect(eligible.every((row) => row.context === "occupational-exposure")).toBe(true);
  });

  it("shows no data when a return is missing", () => {
    const snapshot = buildDashboardSnapshot(createSeedState(), "2026-08");
    expect(snapshot.metrics.find((metric) => metric.id === "K1")?.status).toBe("no-data");
    expect(snapshot.metrics.find((metric) => metric.id === "K3")?.displayValue).toBe("—");
  });
});

describe("safety calculations and period completeness", () => {
  it("derives the attested July example from six incident records", () => {
    const snapshot = buildSafetyDashboardSnapshot(createSeedState(), "2026-07");
    expect(snapshot.periodState).toBe("attested-final");
    expect(snapshot.incidents).toHaveLength(6);
    expect(snapshot.metrics.find((metric) => metric.id === "S1")?.displayValue).toBe("0");
    expect(snapshot.metrics.find((metric) => metric.id === "S2")?.displayValue).toBe("3");
    expect(snapshot.metrics.find((metric) => metric.id === "S3")?.displayValue).toBe("2");
    expect(snapshot.metrics.find((metric) => metric.id === "S4")?.displayValue).toBe("3/4 · 75.0%");
    expect(snapshot.metrics.find((metric) => metric.id === "S5")?.displayValue).toBe("3");
  });

  it("counts people for injuries and events for recordability", () => {
    const snapshot = buildSafetyDashboardSnapshot(createSeedState(), "2026-07");
    expect(snapshot.metrics.find((metric) => metric.id === "S2")?.numericValue).toBe(3);
    expect(snapshot.metrics.find((metric) => metric.id === "S3")?.numericValue).toBe(2);
    expect(snapshot.metrics.find((metric) => metric.id === "S2")?.bands).toEqual([
      { label: "Lost-time injury", value: 1 },
      { label: "First aid only", value: 2 },
    ]);
  });

  it("does not automatically make first aid recordable", () => {
    const state = createSeedState();
    const firstAid = state.safetyIncidents.filter((incident) => incident.severity === "First aid only");
    expect(firstAid).toHaveLength(2);
    expect(firstAid.every((incident) => incident.recordability === "Not recordable")).toBe(true);
  });

  it("distinguishes open empty No data from an attested empty zero", () => {
    const state = createSeedState();
    const open = buildSafetyDashboardSnapshot(state, "2026-08");
    expect(open.periodState).toBe("open-empty");
    expect(open.metrics[0].status).toBe("no-data");
    state.safetyAttestations = [{ period: "2026-08", state: "attested" }];
    const attested = buildSafetyDashboardSnapshot(state, "2026-08");
    expect(attested.periodState).toBe("attested-empty");
    expect(attested.metrics[0].displayValue).toBe("0");
    expect(attested.metrics[0].status).toBe("within");
  });

  it("blocks attestation while a required decision is pending", () => {
    const state = createSeedState();
    state.safetyIncidents[0] = { ...state.safetyIncidents[0], recordability: "Pending" };
    expect(canAttestSafetyPeriod(state, "2026-07").allowed).toBe(false);
  });

  it("reports Not applicable when no investigation is required", () => {
    const state = createSeedState();
    state.safetyIncidents = state.safetyIncidents.map((incident) => ({
      ...incident,
      investigationRequired: false,
      investigationStatus: "Not started",
    }));
    const snapshot = buildSafetyDashboardSnapshot(state, "2026-07");
    expect(snapshot.metrics.find((metric) => metric.id === "S4")?.status).toBe("not-applicable");
  });

  it("exposes only a treatment boolean from the clinical reference", () => {
    const incident = createSeedState().safetyIncidents[0];
    expect(treatedByHealthAndWellness(incident)).toBe(true);
    expect(treatedByHealthAndWellness({})).toBe(false);
  });
});

describe("privacy and reusable expiry behavior", () => {
  it("suppresses non-zero cells below five", () => {
    expect(disclosureCount(0)).toBe("0");
    expect(disclosureCount(1)).toBe("<5");
    expect(disclosureCount(4)).toBe("<5");
    expect(disclosureCount(5)).toBe("5");
  });

  it("keeps unit breakdowns aggregate", () => {
    const rows = managerSafetyBreakdown(createSeedState().safetyIncidents);
    expect(rows.every((row) => !Object.hasOwn(row, "location"))).toBe(true);
    expect(rows.reduce((sum, row) => sum + row.events, 0)).toBe(6);
  });

  it("retains generic expiry calculation without medical licence data", () => {
    expect(createSeedState().expiryTrackedRecords).toEqual([]);
    expect(
      expiryStatus(
        {
          id: "permit-1",
          domain: "Environment",
          recordType: "Permit",
          owner: "Environment",
          reference: "SYNTHETIC",
          validFrom: "2026-01-01",
          expiresOn: "2026-08-21",
          authority: "To be confirmed",
        },
        "2026-08-03",
      ),
    ).toBe("approaching");
  });
});
