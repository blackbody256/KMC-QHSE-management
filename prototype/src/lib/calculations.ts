import type {
  ComplianceStatus,
  DashboardMetric,
  DemoState,
  IndustrialHygieneReading,
  KpiDefinition,
  MetricFormat,
  MetricTrendPoint,
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

const hygieneCounts = (state: DemoState, period: string) => {
  const readings = state.industrialHygieneReadings.filter(
    (entry) => entry.period === period && entry.context === "occupational-exposure" && entry.kpiEligible,
  );
  return {
    eligible: readings.length,
    within: readings.filter((entry) => readingStatus(entry) === "within").length,
  };
};

const ergonomicActionCounts = (state: DemoState, period: string) => {
  const actionsDue = state.ergonomicAssessments
    .filter((entry) => entry.period === period)
    .flatMap((entry) => (entry.action ? [entry.action] : []))
    .filter((action) => action.dueDate.startsWith(period));
  return {
    due: actionsDue.length,
    closedOnTime: actionsDue.filter(
      (action) =>
        action.status === "Closed" && Boolean(action.closedAt) && action.closedAt! <= action.dueDate,
    ).length,
  };
};

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
      const counts = hygieneCounts(state, period);
      return safePercent(counts.within, counts.eligible);
    }
    case "OH4": {
      const counts = ergonomicActionCounts(state, period);
      return safePercent(counts.closedOnTime, counts.due);
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

const plural = (value: number, singular: string, pluralValue = `${singular}s`) =>
  `${value} ${value === 1 ? singular : pluralValue}`;

const metricCalculation = (
  state: DemoState,
  metricId: KpiDefinition["metricId"],
  period: string,
): string | undefined => {
  const monthlyReturn = state.monthlyReturns.find((entry) => entry.period === period);
  const value = rawMetricValue(state, metricId, period);
  if (value === null) return undefined;

  switch (metricId) {
    case "OH1":
      return `${monthlyReturn!.surveillanceCompleted} completed ÷ ${monthlyReturn!.surveillanceScheduled} scheduled × 100 = ${value.toFixed(1)}%`;
    case "OH2":
      return plural(value, "confirmed occupational disease case");
    case "OH3": {
      const counts = hygieneCounts(state, period);
      return `${counts.within} readings within limit ÷ ${counts.eligible} eligible readings × 100 = ${value.toFixed(1)}%`;
    }
    case "OH4": {
      const counts = ergonomicActionCounts(state, period);
      return `${counts.closedOnTime} actions closed on time ÷ ${counts.due} actions due × 100 = ${value.toFixed(1)}%`;
    }
    case "S1":
      return `${plural(value, "fatality", "fatalities")} in the attributed monthly return`;
    case "S2":
      return `${plural(value, "recordable incident")} in the attributed monthly return`;
    case "S3":
      return `${plural(value, "recordable injury", "recordable injuries")} in the attributed monthly return`;
    case "S4":
      return `${plural(value, "reportable near miss", "reportable near misses")} in the attributed monthly return`;
    case "S5": {
      const referralDays = referralSickLeaveDaysForPeriod(state, period);
      return `(${monthlyReturn!.healthRelatedLostDays} return days + ${referralDays} linked referral days) ÷ ${monthlyReturn!.headcount} employees = ${value.toFixed(2)} days/person`;
    }
  }
};

const periodsInYearToDate = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  return Array.from({ length: month }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
};

const totalMetricIds = new Set<KpiDefinition["metricId"]>(["OH2", "S1", "S2", "S3", "S4"]);

const ytdTarget = (definition: KpiDefinition, numberOfMonths: number) =>
  definition.metricId === "S4" ? definition.targetValue * numberOfMonths : definition.targetValue;

const ytdTargetLabel = (definition: KpiDefinition, numberOfMonths: number) => {
  if (definition.metricId === "S4") {
    return `≥ ${new Intl.NumberFormat("en-GB").format(ytdTarget(definition, numberOfMonths))} YTD`;
  }
  return totalMetricIds.has(definition.metricId)
    ? `${definition.targetLabel} YTD`
    : definition.targetLabel;
};

interface AggregatedMetric {
  value: number | null;
  calculation?: string;
  completeMonths: number;
  expectedMonths: number;
}

const aggregateYearToDate = (
  state: DemoState,
  metricId: KpiDefinition["metricId"],
  period: string,
): AggregatedMetric => {
  const periods = periodsInYearToDate(period);
  const values = periods.map((item) => rawMetricValue(state, metricId, item));
  const completeMonths = values.filter((value) => value !== null).length;
  const incomplete = completeMonths !== periods.length;
  if (incomplete) {
    return { value: null, completeMonths, expectedMonths: periods.length };
  }

  switch (metricId) {
    case "OH1": {
      const rows = periods.map((item) => state.monthlyReturns.find((entry) => entry.period === item)!);
      const completed = rows.reduce((sum, row) => sum + row.surveillanceCompleted, 0);
      const scheduled = rows.reduce((sum, row) => sum + row.surveillanceScheduled, 0);
      const value = safePercent(completed, scheduled);
      return {
        value,
        calculation: `${completed} completed ÷ ${scheduled} scheduled × 100`,
        completeMonths,
        expectedMonths: periods.length,
      };
    }
    case "OH2":
    case "S1":
    case "S2":
    case "S3":
    case "S4": {
      const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
      return {
        value: total,
        calculation: `${periods.length} complete monthly values summed`,
        completeMonths,
        expectedMonths: periods.length,
      };
    }
    case "OH3": {
      const counts = periods.map((item) => hygieneCounts(state, item));
      const within = counts.reduce((sum, item) => sum + item.within, 0);
      const eligible = counts.reduce((sum, item) => sum + item.eligible, 0);
      return {
        value: safePercent(within, eligible),
        calculation: `${within} readings within limit ÷ ${eligible} eligible readings × 100`,
        completeMonths,
        expectedMonths: periods.length,
      };
    }
    case "OH4": {
      const counts = periods.map((item) => ergonomicActionCounts(state, item));
      const closedOnTime = counts.reduce((sum, item) => sum + item.closedOnTime, 0);
      const due = counts.reduce((sum, item) => sum + item.due, 0);
      return {
        value: safePercent(closedOnTime, due),
        calculation: `${closedOnTime} actions closed on time ÷ ${due} actions due × 100`,
        completeMonths,
        expectedMonths: periods.length,
      };
    }
    case "S5": {
      const rows = periods.map((item) => state.monthlyReturns.find((entry) => entry.period === item)!);
      const lostDays = rows.reduce(
        (sum, row) => sum + row.healthRelatedLostDays + referralSickLeaveDaysForPeriod(state, row.period),
        0,
      );
      const personMonths = rows.reduce((sum, row) => sum + row.headcount, 0);
      return {
        value: absenteeismRate(lostDays, personMonths),
        calculation: `${lostDays} lost days ÷ ${personMonths} employee-months`,
        completeMonths,
        expectedMonths: periods.length,
      };
    }
  }
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
    const aggregated = aggregateYearToDate(state, definition.metricId, period);
    const ytdPeriods = periodsInYearToDate(period);
    const adjustedTarget = ytdTarget(definition, ytdPeriods.length);
    const adjustedApproachingBoundary = definition.metricId === "S4" && definition.approachingBoundary !== undefined
      ? definition.approachingBoundary * ytdPeriods.length
      : definition.approachingBoundary;
    const aggregationLabel = totalMetricIds.has(definition.metricId)
      ? "Year-to-date total"
      : "Year-to-date weighted rate";

    return {
      id: definition.metricId,
      name: definition.name,
      group: definition.group,
      target: definition.targetLabel,
      targetValue: definition.targetValue,
      comparison: definition.comparison,
      format: definition.format,
      direction: definition.direction,
      provenance: definition.provenance,
      sourceNote: definition.sourceNote,
      note: definition.note,
      proposed: definition.approvalState !== "approved",
      aggregationLabel,
      month: {
        displayValue: monthValue === null ? "No data" : formatValue(monthValue, definition.format),
        numericValue: monthValue ?? undefined,
        status: evaluateMetric(monthValue, definition),
        completeness: monthValue === null ? "no-data" : "complete",
        calculation: metricCalculation(state, definition.metricId, period),
        targetLabel: definition.targetLabel,
      },
      yearToDate: aggregated.value !== null
        ? {
            displayValue: formatValue(aggregated.value, definition.format),
            numericValue: aggregated.value,
            status: evaluateMetric(aggregated.value, {
              ...definition,
              targetValue: adjustedTarget,
              approachingBoundary: adjustedApproachingBoundary,
            }),
            completeness: "complete",
            calculation: aggregated.calculation,
            targetLabel: ytdTargetLabel(definition, ytdPeriods.length),
          }
        : {
            displayValue: "Incomplete history",
            status: "no-data",
            completeness: "incomplete",
            note: `${aggregated.completeMonths}/${aggregated.expectedMonths} months available`,
            targetLabel: ytdTargetLabel(definition, ytdPeriods.length),
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

export const metricTrendData = (
  state: DemoState,
  metricId: KpiDefinition["metricId"],
  throughPeriod: string,
): MetricTrendPoint[] => {
  const periods = [...new Set([
    ...state.monthlyReturns.map((entry) => entry.period),
    ...state.plans.map((entry) => entry.period),
    ...state.industrialHygieneReadings.map((entry) => entry.period),
    ...state.ergonomicAssessments.map((entry) => entry.period),
  ])]
    .filter((item) => item <= throughPeriod)
    .sort()
    .slice(-12);
  const definition = activeDefinition(state, metricId, throughPeriod)
    ?? [...state.kpiDefinitions]
      .filter((item) => item.metricId === metricId)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

  return periods.map((item) => {
    const value = rawMetricValue(state, metricId, item);
    return {
      period: periodLabel(item),
      periodCode: item,
      value,
      displayValue: value === null ? "No data" : formatValue(value, definition.format),
      status: evaluateMetric(value, definition),
    };
  });
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
