import type {
  ComplianceStatus,
  DashboardMetric,
  DemoState,
  EnvironmentalReading,
  ExpiryTrackedRecord,
  SafetyDashboardSnapshot,
  SafetyIncident,
  SafetySeverity,
} from "../types";

export const MINIMUM_DISCLOSURE_CELL = 5;

export const safePercent = (numerator: number, denominator: number): number | null => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return Math.min(100, Math.max(0, (numerator / denominator) * 100));
};

export const absenteeismRate = (lostDays: number, headcount: number): number | null => {
  if (!Number.isFinite(lostDays) || !Number.isFinite(headcount) || lostDays < 0 || headcount <= 0) {
    return null;
  }
  return lostDays / headcount;
};

export const percentageStatus = (
  value: number | null,
  target: number,
): ComplianceStatus => {
  if (value === null) return "no-data";
  if (value >= target) return "within";
  if (value >= target * 0.9) return "approaching";
  return "outside";
};

export const readingStatus = (reading: Pick<EnvironmentalReading, "value" | "limit">) =>
  reading.value <= reading.limit ? "within" : "outside";

export const daysBetween = (from: string, to: string): number =>
  Math.ceil((new Date(`${to}T23:59:59`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000);

export const expiryStatus = (
  record: ExpiryTrackedRecord,
  onDate: string,
): ComplianceStatus => {
  if (record.validFrom > onDate || record.expiresOn < onDate) return "outside";
  return daysBetween(onDate, record.expiresOn) <= 30 ? "approaching" : "within";
};

export const disclosureCount = (
  value: number,
  minimumCell = MINIMUM_DISCLOSURE_CELL,
): string => {
  if (value === 0) return "0";
  return value < minimumCell ? `<${minimumCell}` : String(value);
};

const periodLabel = (period: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(
    new Date(`${period}-01T00:00:00`),
  );

const metric = (
  id: string,
  name: string,
  displayValue: string,
  numericValue: number | undefined,
  target: string,
  status: ComplianceStatus,
  provenance: DashboardMetric["provenance"],
  note: string,
  proposed = false,
  companion?: DashboardMetric["companion"],
  bands?: DashboardMetric["bands"],
  directionNote?: string,
): DashboardMetric => ({
  id,
  name,
  displayValue,
  numericValue,
  target,
  status,
  provenance,
  note,
  proposed,
  companion,
  bands,
  directionNote,
});

export interface DashboardSnapshot {
  period: string;
  periodLabel: string;
  metrics: DashboardMetric[];
  returnRow: DemoState["monthlyReturns"][number] | undefined;
  readings: EnvironmentalReading[];
  assessments: DemoState["ergonomicAssessments"];
  environmentalCompliance: number | null;
  monitoringCompletion: number | null;
  ergonomicControl: number | null;
  ergonomicCompletion: number | null;
}

export const buildDashboardSnapshot = (
  state: DemoState,
  period: string,
): DashboardSnapshot => {
  const returnRow = state.monthlyReturns.find((entry) => entry.period === period);
  const readings = state.environmentalReadings.filter((entry) => entry.period === period);
  const eligibleReadings = readings.filter(
    (entry) => entry.context === "occupational-exposure" && entry.k4Eligible,
  );
  const assessments = state.ergonomicAssessments.filter((entry) => entry.period === period);
  const plan = state.plans.find((entry) => entry.period === period);

  const surveillance = returnRow
    ? safePercent(returnRow.surveillanceCompleted, returnRow.surveillanceScheduled)
    : null;
  const absenteeism = returnRow
    ? absenteeismRate(returnRow.lostDays, returnRow.headcount)
    : null;

  const compliantReadings = eligibleReadings.filter(
    (entry) => readingStatus(entry) === "within",
  ).length;
  const environmentalCompliance = safePercent(compliantReadings, eligibleReadings.length);
  const performedEvents = new Set(eligibleReadings.map((entry) => entry.eventId)).size;
  const monitoringCompletion = safePercent(
    performedEvents,
    plan?.environmentalEventsPlanned ?? 0,
  );

  const actionsDue = assessments
    .flatMap((entry) => (entry.action ? [entry.action] : []))
    .filter((action) => action.dueDate.startsWith(period));
  const actionsClosedOnTime = actionsDue.filter(
    (action) =>
      action.status === "Closed" &&
      Boolean(action.closedAt) &&
      action.closedAt! <= action.dueDate,
  ).length;
  const ergonomicControl = safePercent(actionsClosedOnTime, actionsDue.length);
  const ergonomicCompletion = safePercent(
    assessments.length,
    plan?.ergonomicAssessmentsPlanned ?? 0,
  );

  const diseaseCount = plan?.confirmedOccupationalDiseases;
  const metrics: DashboardMetric[] = [
    metric(
      "K1",
      "Surveillance compliance",
      surveillance === null ? "—" : `${surveillance.toFixed(1)}%`,
      surveillance ?? undefined,
      "100%",
      percentageStatus(surveillance, 100),
      "Manual",
      "Completed assessments ÷ scheduled employees.",
      true,
    ),
    metric(
      "K2",
      "Occupational disease cases",
      diseaseCount === undefined ? "—" : String(diseaseCount),
      diseaseCount,
      "0 cases",
      diseaseCount === undefined ? "no-data" : diseaseCount === 0 ? "within" : "outside",
      "Seeded",
      "Illustrative count; confirmation workflow is not yet approved.",
      true,
    ),
    metric(
      "K3",
      "Health-related absenteeism",
      absenteeism === null ? "—" : absenteeism.toFixed(2),
      absenteeism ?? undefined,
      "<0.5 days/person/month",
      absenteeism === null
        ? "no-data"
        : absenteeism < 0.5
          ? "within"
          : absenteeism < 0.55
            ? "approaching"
            : "outside",
      "Manual",
      "Monthly lost days ÷ month-end headcount.",
      true,
    ),
    metric(
      "K4",
      "Industrial hygiene compliance",
      environmentalCompliance === null ? "—" : `${environmentalCompliance.toFixed(1)}%`,
      environmentalCompliance ?? undefined,
      "≥95%",
      percentageStatus(environmentalCompliance, 95),
      "Derived",
      "Eligible occupational-exposure readings within limit ÷ eligible readings.",
      true,
      {
        label: "Monitoring completed",
        displayValue: monitoringCompletion === null ? "—" : `${monitoringCompletion.toFixed(1)}%`,
        status: percentageStatus(monitoringCompletion, 100),
      },
    ),
    metric(
      "K5",
      "Ergonomic risk control",
      ergonomicControl === null ? "—" : `${ergonomicControl.toFixed(1)}%`,
      ergonomicControl ?? undefined,
      "≥95%",
      percentageStatus(ergonomicControl, 95),
      "Derived",
      "Actions closed on time ÷ actions due.",
      true,
      {
        label: "Assessments completed",
        displayValue: ergonomicCompletion === null ? "—" : `${ergonomicCompletion.toFixed(1)}%`,
        status: percentageStatus(ergonomicCompletion, 100),
      },
    ),
  ];

  return {
    period,
    periodLabel: periodLabel(period),
    metrics,
    returnRow,
    readings,
    assessments,
    environmentalCompliance,
    monitoringCompletion,
    ergonomicControl,
    ergonomicCompletion,
  };
};

const injuryBandOrder: SafetySeverity[] = [
  "Lost-time injury",
  "Restricted work or job transfer",
  "Medical treatment",
  "First aid only",
];

const safetyMetricStatus = (
  periodState: SafetyDashboardSnapshot["periodState"],
  finalStatus: ComplianceStatus,
) => (periodState === "open-provisional" ? "provisional" : finalStatus);

export const buildSafetyDashboardSnapshot = (
  state: DemoState,
  period: string,
): SafetyDashboardSnapshot => {
  const incidents = state.safetyIncidents.filter(
    (incident) => incident.period === period && incident.state === "submitted",
  );
  const attestation = state.safetyAttestations.find((entry) => entry.period === period);
  const periodState: SafetyDashboardSnapshot["periodState"] =
    attestation?.state === "attested"
      ? incidents.length === 0
        ? "attested-empty"
        : "attested-final"
      : incidents.length === 0
        ? "open-empty"
        : "open-provisional";
  const pendingDecisions = incidents.filter(
    (incident) => incident.workRelated === "Pending" || incident.recordability === "Pending",
  ).length;
  const included = incidents.filter((incident) => incident.workRelated === "Yes");
  const fatalities = included.reduce((sum, incident) => sum + incident.fatalityCount, 0);
  const injuries = included.reduce((sum, incident) => sum + incident.nonFatalInjuryCount, 0);
  const recordables = included.filter(
    (incident) => incident.recordability === "Recordable",
  ).length;
  const requiredInvestigations = included.filter(
    (incident) => incident.investigationRequired,
  );
  const completedInvestigations = requiredInvestigations.filter(
    (incident) => incident.investigationStatus === "Completed",
  ).length;
  const investigationRate = safePercent(
    completedInvestigations,
    requiredInvestigations.length,
  );
  const nearMissReports = included.filter(
    (incident) =>
      incident.classification === "Incident / near miss" ||
      incident.classification === "Dangerous occurrence",
  ).length;
  const bands = injuryBandOrder
    .map((severity) => ({
      label: severity,
      value: included
        .filter((incident) => incident.severity === severity)
        .reduce((sum, incident) => sum + incident.nonFatalInjuryCount, 0),
    }))
    .filter((band) => band.value > 0);

  if (periodState === "open-empty") {
    return {
      period,
      periodState,
      incidents,
      pendingDecisions,
      metrics: [
        metric("S1", "Fatalities", "—", undefined, "0", "no-data", "Derived", "Open period with no reported events."),
        metric("S2", "Workplace injuries", "—", undefined, "0", "no-data", "Derived", "Open period with no reported events."),
        metric("S3", "Recordable incidents", "—", undefined, "No target", "no-data", "Derived", "Recordability register has not been attested."),
        metric("S4", "Investigations completed", "—", undefined, "100%", "no-data", "Derived", "Investigation register has not been attested."),
        metric("S5", "Near-miss and dangerous-occurrence reports", "—", undefined, "Reporting encouraged", "no-data", "Derived", "Open period with no reported events."),
      ],
    };
  }

  const provenance = periodState === "open-provisional" ? "Informational" : "Derived";
  return {
    period,
    periodState,
    incidents,
    pendingDecisions,
    metrics: [
      metric(
        "S1",
        "Fatalities",
        String(fatalities),
        fatalities,
        "0",
        safetyMetricStatus(periodState, fatalities === 0 ? "within" : "outside"),
        provenance,
        "People killed in work-related events; fatalities are separate from non-fatal injuries.",
      ),
      metric(
        "S2",
        "Workplace injuries",
        String(injuries),
        injuries,
        "0",
        safetyMetricStatus(periodState, injuries === 0 ? "within" : "outside"),
        provenance,
        "Non-fatally injured people, including first-aid-only cases.",
        false,
        undefined,
        bands,
      ),
      metric(
        "S3",
        "Recordable incidents",
        String(recordables),
        recordables,
        "No approved target",
        safetyMetricStatus(periodState, "informational"),
        provenance,
        "Events manually determined Recordable by a named officer.",
      ),
      metric(
        "S4",
        "Investigations completed",
        requiredInvestigations.length === 0
          ? "Not applicable"
          : `${completedInvestigations}/${requiredInvestigations.length} · ${investigationRate?.toFixed(1)}%`,
        investigationRate ?? undefined,
        "100% of required",
        requiredInvestigations.length === 0
          ? "not-applicable"
          : safetyMetricStatus(
              periodState,
              completedInvestigations === requiredInvestigations.length ? "within" : "outside",
            ),
        provenance,
        "Denominator is investigations required, not all incidents reported.",
      ),
      metric(
        "S5",
        "Near-miss and dangerous-occurrence reports",
        String(nearMissReports),
        nearMissReports,
        "Reporting encouraged",
        safetyMetricStatus(periodState, "informational"),
        provenance,
        "A reporting-culture indicator, not a claim that operational risk improved.",
        false,
        undefined,
        undefined,
        "More reporting is encouraged; interpret severity and trend alongside the count.",
      ),
    ],
  };
};

export const canAttestSafetyPeriod = (
  state: DemoState,
  period: string,
): { allowed: boolean; reason: string } => {
  const incidents = state.safetyIncidents.filter((incident) => incident.period === period);
  const pending = incidents.filter(
    (incident) => incident.workRelated === "Pending" || incident.recordability === "Pending",
  );
  if (pending.length > 0) {
    return {
      allowed: false,
      reason: `${pending.length} incident${pending.length === 1 ? " has" : "s have"} a pending work-related or recordability decision.`,
    };
  }
  return { allowed: true, reason: "All known incidents have final work-related and recordability decisions." };
};

export const treatedByHealthAndWellness = (
  incident: Pick<SafetyIncident, "clinicalEncounterIdRef">,
) => Boolean(incident.clinicalEncounterIdRef);

export interface ManagerSafetyBreakdownRow {
  unit: string;
  events: number;
  injuries: number;
  investigationsRequired: number;
  investigationsCompleted: number;
}

export const managerSafetyBreakdown = (
  incidents: SafetyIncident[],
): ManagerSafetyBreakdownRow[] => {
  const grouped = new Map<string, ManagerSafetyBreakdownRow>();
  incidents
    .filter((incident) => incident.workRelated === "Yes")
    .forEach((incident) => {
      const current = grouped.get(incident.unit) ?? {
        unit: incident.unit,
        events: 0,
        injuries: 0,
        investigationsRequired: 0,
        investigationsCompleted: 0,
      };
      current.events += 1;
      current.injuries += incident.nonFatalInjuryCount;
      current.investigationsRequired += incident.investigationRequired ? 1 : 0;
      current.investigationsCompleted +=
        incident.investigationRequired && incident.investigationStatus === "Completed" ? 1 : 0;
      grouped.set(incident.unit, current);
    });
  return [...grouped.values()].sort((a, b) => a.unit.localeCompare(b.unit));
};

export const trendData = (state: DemoState) =>
  [...state.monthlyReturns]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((entry) => ({
      period: periodLabel(entry.period),
      periodCode: entry.period,
      absenteeism: Number((entry.lostDays / entry.headcount).toFixed(2)),
      surveillance: Number(
        ((entry.surveillanceCompleted / entry.surveillanceScheduled) * 100).toFixed(1),
      ),
    }));
