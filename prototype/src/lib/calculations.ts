import type {
  ComplianceStatus,
  DashboardMetric,
  DemoState,
  IndustrialHygieneReading,
  KpiDefinition,
  LabReferenceRange,
  MetricFormat,
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

export const calculateBmi = (weightKg?: number, heightCm?: number): number | undefined => {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return undefined;
  return Number((weightKg / ((heightCm / 100) ** 2)).toFixed(1));
};

export const readingStatus = (
  reading: Pick<IndustrialHygieneReading, "value" | "limitApplied">,
): ComplianceStatus => (reading.value <= reading.limitApplied ? "within" : "outside");

export const evaluateMetric = (
  value: number | null,
  definition: Pick<
    KpiDefinition,
    "comparison" | "targetValue" | "approachingBoundary"
  >,
): ComplianceStatus => {
  if (value === null) return "no-data";
  const { comparison, targetValue, approachingBoundary } = definition;
  if (comparison === "eq") return value === targetValue ? "within" : "outside";
  if (comparison === "gte") {
    if (value >= targetValue) return "within";
    if (approachingBoundary !== undefined && value >= approachingBoundary) return "approaching";
    return "outside";
  }
  if (approachingBoundary !== undefined && value >= approachingBoundary && value < targetValue) {
    return "approaching";
  }
  return value < targetValue ? "within" : "outside";
};

export const referralSickLeaveDaysForPeriod = (state: DemoState, period: string): number =>
  state.referrals
    .filter(
      (referral) =>
        Boolean(referral.externalFeedback?.sickLeaveFrom?.startsWith(period)) &&
        (referral.status === "returned" || referral.status === "reviewed"),
    )
    .reduce((sum, referral) => sum + (referral.externalFeedback?.sickLeaveDays ?? 0), 0);

const activeDefinition = (state: DemoState, metricId: string, period: string) => {
  const onDate = `${period}-01`;
  return [...state.kpiDefinitions]
    .filter(
      (definition) =>
        definition.metricId === metricId &&
        definition.effectiveFrom <= onDate &&
        (!definition.effectiveTo || definition.effectiveTo >= onDate),
    )
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
};

export const effectiveLabRanges = (state: DemoState, onDate: string): LabReferenceRange[] =>
  state.labReferenceRanges.filter(
    (range) => range.effectiveFrom <= onDate && (!range.effectiveTo || range.effectiveTo >= onDate),
  );

const rawMetricValue = (state: DemoState, metricId: KpiDefinition["metricId"], period: string) => {
  const monthlyReturn = state.monthlyReturns.find((entry) => entry.period === period);
  const plan = state.plans.find((entry) => entry.period === period);

  switch (metricId) {
    case "OH1":
      return monthlyReturn
        ? safePercent(monthlyReturn.surveillanceCompleted, monthlyReturn.surveillanceScheduled)
        : null;
    case "OH2":
      return plan?.confirmedOccupationalDiseases ?? null;
    case "OH3": {
      const readings = state.industrialHygieneReadings.filter(
        (entry) => entry.period === period && entry.context === "occupational-exposure" && entry.kpiEligible,
      );
      return safePercent(
        readings.filter((entry) => readingStatus(entry) === "within").length,
        readings.length,
      );
    }
    case "OH4": {
      const assessments = state.ergonomicAssessments.filter((entry) => entry.period === period);
      const actionsDue = assessments
        .flatMap((entry) => (entry.action ? [entry.action] : []))
        .filter((action) => action.dueDate.startsWith(period));
      const actionsClosedOnTime = actionsDue.filter(
        (action) =>
          action.status === "Closed" && Boolean(action.closedAt) && action.closedAt! <= action.dueDate,
      ).length;
      return safePercent(actionsClosedOnTime, actionsDue.length);
    }
    case "S1":
      return monthlyReturn?.fatalities ?? null;
    case "S2":
      return monthlyReturn?.totalRecordableIncidents ?? null;
    case "S3":
      return monthlyReturn?.totalRecordableInjuries ?? null;
    case "S4":
      return monthlyReturn?.reportableNearMisses ?? null;
    case "S5":
      return monthlyReturn
        ? absenteeismRate(
            monthlyReturn.healthRelatedLostDays + referralSickLeaveDaysForPeriod(state, period),
            monthlyReturn.headcount,
          )
        : null;
  }
};

const formatValue = (value: number, format: MetricFormat): string => {
  switch (format) {
    case "integer":
      return Number.isInteger(value) ? String(value) : value.toFixed(1);
    case "decimal-1":
      return value.toFixed(1);
    case "decimal-2":
      return value.toFixed(2);
    case "percent-1":
      return `${value.toFixed(1)}%`;
  }
};

const periodsInYearToDate = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  return Array.from({ length: month }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
};

export interface DashboardSnapshot {
  period: string;
  periodLabel: string;
  metrics: DashboardMetric[];
  onTarget: number;
  totalMetrics: number;
  noData: number;
  returnRow: DemoState["monthlyReturns"][number] | undefined;
  referralLeaveDays: number;
}

export const buildDashboardSnapshot = (state: DemoState, period: string): DashboardSnapshot => {
  const definitions = state.kpiDefinitions
    .filter((definition) => activeDefinition(state, definition.metricId, period)?.id === definition.id)
    .sort((a, b) => {
      const groupOrder = a.group.localeCompare(b.group);
      return groupOrder || a.metricId.localeCompare(b.metricId);
    });

  const metrics = definitions.map((definition): DashboardMetric => {
    const monthValue = rawMetricValue(state, definition.metricId, period);
    const ytdPeriods = periodsInYearToDate(period);
    const ytdValues = ytdPeriods.map((item) => rawMetricValue(state, definition.metricId, item));
    const ytdComplete = ytdValues.every((value) => value !== null);
    const ytdValue = ytdComplete
      ? ytdValues.reduce<number>((sum, value) => sum + (value ?? 0), 0) / ytdValues.length
      : null;

    return {
      id: definition.metricId,
      name: definition.name,
      target: definition.targetLabel,
      direction: definition.direction,
      provenance: definition.provenance,
      note: definition.note,
      proposed: definition.approvalState !== "approved",
      month: {
        displayValue: monthValue === null ? "No data" : formatValue(monthValue, definition.format),
        numericValue: monthValue ?? undefined,
        status: evaluateMetric(monthValue, definition),
        completeness: monthValue === null ? "no-data" : "complete",
      },
      yearToDate: ytdComplete && ytdValue !== null
        ? {
            displayValue: formatValue(ytdValue, definition.format),
            numericValue: ytdValue,
            status: evaluateMetric(ytdValue, definition),
            completeness: "complete",
          }
        : {
            displayValue: "Incomplete history",
            status: "no-data",
            completeness: "incomplete",
            note: `${ytdValues.filter((value) => value !== null).length}/${ytdPeriods.length} months available`,
          },
    };
  });

  return {
    period,
    periodLabel: periodLabel(period),
    metrics,
    onTarget: metrics.filter((item) => item.month.status === "within").length,
    totalMetrics: metrics.length,
    noData: metrics.filter((item) => item.month.status === "no-data").length,
    returnRow: state.monthlyReturns.find((entry) => entry.period === period),
    referralLeaveDays: referralSickLeaveDaysForPeriod(state, period),
  };
};

const periodLabel = (period: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(
    new Date(`${period}-01T00:00:00`),
  );

export const trendData = (state: DemoState) =>
  [...state.monthlyReturns]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((entry) => ({
      period: periodLabel(entry.period),
      periodCode: entry.period,
      absenteeism: Number(
        (
          (entry.healthRelatedLostDays + referralSickLeaveDaysForPeriod(state, entry.period)) /
          entry.headcount
        ).toFixed(2),
      ),
      surveillance: Number(
        ((entry.surveillanceCompleted / entry.surveillanceScheduled) * 100).toFixed(1),
      ),
    }));
