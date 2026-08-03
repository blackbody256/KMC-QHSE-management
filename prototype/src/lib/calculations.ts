import type {
  ComplianceStatus,
  DashboardMetric,
  DemoState,
  EnvironmentalReading,
} from "../types";

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

const periodEnd = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month, 0).toISOString().slice(0, 10);
};

const periodLabel = (period: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(
    new Date(`${period}-01T00:00:00`),
  );

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
  const assessments = state.ergonomicAssessments.filter((entry) => entry.period === period);
  const plan = state.plans.find((entry) => entry.period === period);

  const surveillance = returnRow
    ? safePercent(returnRow.surveillanceCompleted, returnRow.surveillanceScheduled)
    : null;
  const absenteeism = returnRow
    ? absenteeismRate(returnRow.lostDays, returnRow.headcount)
    : null;

  const compliantReadings = readings.filter((entry) => readingStatus(entry) === "within").length;
  const environmentalCompliance = safePercent(compliantReadings, readings.length);
  const performedEvents = new Set(readings.map((entry) => entry.eventId)).size;
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

  const endDate = periodEnd(period);
  const infirmaryLicences = state.licences.filter((entry) => entry.type === "Infirmary");
  const validInfirmary = infirmaryLicences.some(
    (entry) => entry.issueDate <= `${period}-01` && entry.expiryDate >= endDate,
  );
  const practitionerLicences = state.licences.filter((entry) => entry.type === "Practitioner");
  const validPractitioners = practitionerLicences.filter(
    (entry) => entry.issueDate <= endDate && entry.expiryDate >= endDate,
  ).length;
  const diseaseCount = plan?.confirmedOccupationalDiseases;

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
  });

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
      "Occupational disease rate",
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
      "Within-limit eligible readings ÷ eligible readings taken.",
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
    metric(
      "K6",
      "Infirmary authorisation",
      infirmaryLicences.length === 0 ? "—" : validInfirmary ? "Valid" : "Not valid",
      validInfirmary ? 100 : 0,
      "Valid",
      infirmaryLicences.length === 0 ? "no-data" : validInfirmary ? "within" : "outside",
      "Register",
      "Illustrative credential details pending confirmation.",
    ),
    metric(
      "K7",
      "Professional registrations",
      practitionerLicences.length === 0
        ? "—"
        : `${validPractitioners}/${practitionerLicences.length}`,
      practitionerLicences.length
        ? safePercent(validPractitioners, practitionerLicences.length) ?? undefined
        : undefined,
      "100% valid",
      practitionerLicences.length === 0
        ? "no-data"
        : validPractitioners === practitionerLicences.length
          ? "within"
          : "outside",
      "Register",
      "Illustrative practitioners and authorities.",
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
