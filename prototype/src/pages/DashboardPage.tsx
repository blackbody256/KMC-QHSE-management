import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileWarning,
  Info,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "../components/PageHeader";
import { ProvenanceChip, StatusPill } from "../components/StatusPill";
import { AppLink } from "../lib/router";
import { buildDashboardSnapshot, metricTrendData } from "../lib/calculations";
import { useDemoStore } from "../store/DemoStore";
import type {
  DashboardMetric,
  DemoRole,
  KpiDefinition,
  MetricFormat,
  MetricTrendPoint,
} from "../types";

const progressMetricIds = new Set(["OH1", "OH3", "OH4", "S4", "S5"]);

const metricMeaning: Record<string, string> = {
  OH1: "Shows how many employees completed the occupational-health surveillance scheduled for them.",
  OH2: "Counts occupational disease cases confirmed for the reporting period.",
  OH3: "Shows the share of eligible occupational-exposure readings that were within the applied limit.",
  OH4: "Shows the share of ergonomic corrective actions that were closed by their due date.",
  S1: "Counts work-related fatalities supplied through the attributed monthly return.",
  S2: "Counts events classified as recordable incidents in the attributed monthly return.",
  S3: "Counts people recorded with recordable injuries in the attributed monthly return.",
  S4: "Tracks reporting culture. More qualifying near-miss reports are encouraged, so higher is better.",
  S5: "Shows health-related days lost for each employee-month, including linked referral sick leave.",
};

const sourcePath: Record<string, string> = {
  OH1: "/monthly-returns",
  OH2: "/monthly-returns",
  OH3: "/industrial-hygiene",
  OH4: "/ergonomics-wellness",
  S1: "/monthly-returns",
  S2: "/monthly-returns",
  S3: "/monthly-returns",
  S4: "/monthly-returns",
  S5: "/monthly-returns",
};

export function DashboardPage() {
  const { state } = useDemoStore();
  const periods = useMemo(
    () =>
      [...new Set([...state.monthlyReturns.map((item) => item.period), ...state.plans.map((item) => item.period)])]
        .sort((a, b) => b.localeCompare(a)),
    [state.monthlyReturns, state.plans],
  );
  const [period, setPeriod] = useState(
    periods.includes("2026-07") ? "2026-07" : periods[0] ?? "2026-07",
  );
  const snapshot = useMemo(() => buildDashboardSnapshot(state, period), [state, period]);
  const [trendMetricId, setTrendMetricId] = useState<KpiDefinition["metricId"]>("OH1");
  const [selectedMetric, setSelectedMetric] = useState<DashboardMetric | null>(null);
  const healthMetrics = snapshot.metrics.filter((metric) => metric.id.startsWith("OH"));
  const summaryMetrics = snapshot.metrics.filter((metric) => metric.id.startsWith("S"));
  const attentionMetrics = [...snapshot.metrics]
    .filter((metric) => ["outside", "approaching", "no-data"].includes(metric.month.status))
    .sort((a, b) => statusPriority(a.month.status) - statusPriority(b.month.status));
  const trendMetric = snapshot.metrics.find((metric) => metric.id === trendMetricId) ?? snapshot.metrics[0];
  const selectedTrend = useMemo(
    () => metricTrendData(state, trendMetric.id as KpiDefinition["metricId"], period),
    [period, state, trendMetric.id],
  );
  const dataAvailable = snapshot.totalMetrics - snapshot.noData;

  const showMetricTrend = (metricId: string) => {
    setTrendMetricId(metricId as KpiDefinition["metricId"]);
    setSelectedMetric(null);
    window.requestAnimationFrame(() => {
      document.getElementById("trend-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Health and Wellness Dashboard · proposed name"
        title="Health and Wellness performance"
        description="Start with exceptions, understand the target, then open the calculation or source only when needed."
        action={
          <label className="period-control">
            <CalendarDays size={17} aria-hidden="true" />
            <span className="sr-only">Reporting period</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              {periods.map((item) => (
                <option key={item} value={item}>{formatPeriod(item)}</option>
              ))}
            </select>
          </label>
        }
      />

      <section className="dashboard-overview" aria-label="Reporting overview">
        <OverviewItem label="Reporting period" value={snapshot.periodLabel} note="Monthly view" />
        <OverviewItem
          label="Data availability"
          value={`${dataAvailable}/${snapshot.totalMetrics}`}
          note={snapshot.noData ? `${snapshot.noData} awaiting data` : "All monthly values received"}
          tone={snapshot.noData ? "warning" : "positive"}
        />
        <OverviewItem
          label="Within target"
          value={`${snapshot.onTarget}`}
          note={`of ${snapshot.totalMetrics} indicators`}
          tone="positive"
        />
        <OverviewItem
          label="Needs attention"
          value={`${attentionMetrics.length}`}
          note={attentionMetrics.length ? "Open the highlighted indicators" : "No current exceptions"}
          tone={attentionMetrics.length ? "danger" : "positive"}
        />
      </section>

      <section className="attention-panel" aria-labelledby="attention-heading">
        <div className="attention-heading">
          <div>
            <span className="eyebrow">Exception first</span>
            <h2 id="attention-heading">What needs attention</h2>
          </div>
          <span className="attention-count">{attentionMetrics.length} indicators</span>
        </div>
        {attentionMetrics.length ? (
          <div className="attention-list">
            {attentionMetrics.map((metric) => (
              <button
                key={metric.id}
                type="button"
                className={`attention-item attention-${metric.month.status}`}
                onClick={() => setSelectedMetric(metric)}
                aria-label={`Open details for ${metric.name}`}
              >
                <span className="metric-id">{metric.id}</span>
                <span className="attention-copy">
                  <strong>{metric.name}</strong>
                  <small>{metric.month.displayValue} · Target {metric.target}</small>
                </span>
                <StatusPill status={metric.month.status} compact />
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <div className="attention-clear">
            <CheckCircle2 size={19} aria-hidden="true" />
            <span>All available indicators are currently within their defined targets.</span>
          </div>
        )}
      </section>

      <details className="dashboard-context">
        <summary>
          <FileWarning size={18} aria-hidden="true" />
          Safety data ownership remains to be confirmed
          <span>Why this matters</span>
        </summary>
        <p>
          Fatalities, incidents, injuries and near misses are attributed monthly returns. This prototype does not
          maintain a parallel safety incident register; Benard must confirm the authoritative owner or integration.
        </p>
      </details>

      <KpiCardSection
        eyebrow="Health and Wellness"
        title="Occupational health controls"
        description="Compliance, confirmed disease and control effectiveness for the selected month."
        metrics={healthMetrics}
        period={period}
        state={state}
        onOpen={setSelectedMetric}
      />
      <KpiCardSection
        eyebrow="Client dashboard panel"
        title="Health and safety summary"
        description="Attributed safety returns remain clearly separated from derived Health and Wellness measures."
        metrics={summaryMetrics}
        period={period}
        state={state}
        onOpen={setSelectedMetric}
      />

      <TrendExplorer
        metric={trendMetric}
        metrics={snapshot.metrics}
        data={selectedTrend}
        onMetricChange={(metricId) => setTrendMetricId(metricId)}
      />

      <ExactValues metrics={snapshot.metrics} periodLabel={snapshot.periodLabel} />

      {selectedMetric && (
        <MetricDetailsDrawer
          metric={selectedMetric}
          periodLabel={snapshot.periodLabel}
          role={state.role}
          onClose={() => setSelectedMetric(null)}
          onViewTrend={() => showMetricTrend(selectedMetric.id)}
        />
      )}
    </div>
  );
}

function OverviewItem({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "neutral" | "positive" | "warning" | "danger";
}) {
  return (
    <div className={`overview-item overview-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function KpiCardSection({
  eyebrow,
  title,
  description,
  metrics,
  period,
  state,
  onOpen,
}: {
  eyebrow: string;
  title: string;
  description: string;
  metrics: DashboardMetric[];
  period: string;
  state: ReturnType<typeof useDemoStore>["state"];
  onOpen: (metric: DashboardMetric) => void;
}) {
  return (
    <section className="dashboard-metric-section" aria-labelledby={`${title.replaceAll(" ", "-")}-heading`}>
      <div className="metric-section-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 id={`${title.replaceAll(" ", "-")}-heading`}>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="section-meta">Select any card for its formula and source</span>
      </div>
      <div className="dashboard-card-grid">
        {metrics.map((metric) => (
          <KpiCard
            key={metric.id}
            metric={metric}
            trend={metricTrendData(state, metric.id as KpiDefinition["metricId"], period)}
            onOpen={() => onOpen(metric)}
          />
        ))}
      </div>
    </section>
  );
}

function KpiCard({
  metric,
  trend,
  onOpen,
}: {
  metric: DashboardMetric;
  trend: MetricTrendPoint[];
  onOpen: () => void;
}) {
  return (
    <article className={`dashboard-kpi-card card-${metric.month.status}`}>
      <div className="kpi-card-topline">
        <span className="metric-id">{metric.id}</span>
        <ProvenanceChip provenance={metric.provenance} proposed={metric.proposed} />
        <button
          type="button"
          className="metric-info-button"
          onClick={onOpen}
          aria-label={`More information about ${metric.name}`}
          aria-haspopup="dialog"
        >
          <Info size={17} aria-hidden="true" />
        </button>
      </div>
      <h3>{metric.name}</h3>
      <div className="kpi-current-value">
        <strong>{metric.month.displayValue}</strong>
        <span>Current month</span>
      </div>

      {progressMetricIds.has(metric.id) ? (
        <TargetBar metric={metric} />
      ) : (
        <MiniTrend trend={trend} metricName={metric.name} />
      )}

      <div className="kpi-status-row">
        <StatusPill status={metric.month.status} compact />
        <span>Target {metric.target}</span>
      </div>
      <div className="kpi-card-footer">
        <div>
          <span>{metric.aggregationLabel}</span>
          <strong>{metric.yearToDate.displayValue}</strong>
        </div>
        <button type="button" className="card-details-button" onClick={onOpen}>
          Details <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function TargetBar({ metric }: { metric: DashboardMetric }) {
  const value = metric.month.numericValue;
  if (value === undefined) {
    return (
      <div className="target-bar-empty">
        <span>—</span>
        Awaiting a complete monthly value
      </div>
    );
  }

  const max = metric.format === "percent-1"
    ? 100
    : Math.max(metric.targetValue * 1.25, value * 1.08, metric.targetValue || 1);
  const progress = Math.max(0, Math.min(100, (value / max) * 100));
  const target = Math.max(0, Math.min(100, (metric.targetValue / max) * 100));
  const style = {
    "--metric-progress": `${progress}%`,
    "--metric-target": `${target}%`,
  } as CSSProperties;

  return (
    <div className="target-visual" style={style}>
      <div className={`target-track target-${metric.month.status}`} aria-hidden="true">
        <span className="target-fill" />
        <span className="target-marker" />
      </div>
      <div className="target-scale">
        <span>0</span>
        <span>Target {metric.target}</span>
      </div>
    </div>
  );
}

function MiniTrend({ trend, metricName }: { trend: MetricTrendPoint[]; metricName: string }) {
  const points = trend
    .map((item, index) => ({ value: item.value, index }))
    .filter((item): item is { value: number; index: number } => item.value !== null);
  if (points.length < 2) {
    return <div className="mini-trend-empty">Not enough monthly history for a trend</div>;
  }
  const width = 180;
  const height = 42;
  const values = points.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const polyline = points
    .map((item) => {
      const x = trend.length === 1 ? width / 2 : (item.index / (trend.length - 1)) * width;
      const y = max === min ? height / 2 : height - 5 - ((item.value - min) / range) * (height - 10);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="mini-trend">
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
        <line x1="0" x2={width} y1={height - 2} y2={height - 2} />
        <polyline points={polyline} />
      </svg>
      <span>12-month direction</span>
      <span className="sr-only">Monthly trend for {metricName}</span>
    </div>
  );
}

function TrendExplorer({
  metric,
  metrics,
  data,
  onMetricChange,
}: {
  metric: DashboardMetric;
  metrics: DashboardMetric[];
  data: MetricTrendPoint[];
  onMetricChange: (metricId: KpiDefinition["metricId"]) => void;
}) {
  const latest = [...data].reverse().find((item) => item.value !== null);
  return (
    <section className="panel trend-explorer dashboard-section" aria-labelledby="trend-heading">
      <div className="trend-explorer-heading">
        <div>
          <span className="eyebrow">Performance over time</span>
          <h2 id="trend-heading">Explore one metric clearly</h2>
          <p>One scale at a time keeps unrelated measures from distorting each other.</p>
        </div>
        <label className="trend-selector">
          <span>Metric</span>
          <select
            value={metric.id}
            onChange={(event) => onMetricChange(event.target.value as KpiDefinition["metricId"])}
          >
            {metrics.map((item) => (
              <option key={item.id} value={item.id}>{item.id} · {item.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="trend-summary-row">
        <div>
          <span>Latest available</span>
          <strong>{latest?.displayValue ?? "No data"}</strong>
        </div>
        <div>
          <span>Monthly target</span>
          <strong>{metric.target}</strong>
        </div>
        {latest && <StatusPill status={latest.status} compact />}
      </div>
      <div className="chart-frame dashboard-trend-chart">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 14, right: 20, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="#e5e8ed" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="period" tick={{ fill: "#667085", fontSize: 11 }} />
            <YAxis
              tick={{ fill: "#667085", fontSize: 11 }}
              width={52}
              tickFormatter={(value) => formatAxisValue(value, metric.format)}
              domain={axisDomain(metric, data)}
            />
            <Tooltip
              labelStyle={{ color: "#101828", fontWeight: 600 }}
              contentStyle={{ borderRadius: 6, borderColor: "#d0d5dd" }}
              formatter={(_value, _name, item) => [item.payload.displayValue, metric.name]}
            />
            <ReferenceLine
              y={metric.targetValue}
              stroke="#a15c00"
              strokeDasharray="5 4"
              label={{ value: `Target ${metric.target}`, position: "insideTopRight", fill: "#805000", fontSize: 11 }}
            />
            <Line
              type="linear"
              dataKey="value"
              name={metric.name}
              stroke="#1769aa"
              strokeWidth={2.75}
              dot={{ r: 3.5, fill: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-text-alternative">
        Line chart showing {metric.name} by month. Latest available value is {latest?.displayValue ?? "not available"};
        the monthly target is {metric.target}.
      </p>
      <details className="chart-data">
        <summary>View exact monthly values</summary>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Period</th><th>Value</th><th>Status</th></tr></thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.periodCode}>
                  <td>{row.period}</td>
                  <td className="data-cell">{row.displayValue}</td>
                  <td><StatusPill status={row.status} compact /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function ExactValues({ metrics, periodLabel }: { metrics: DashboardMetric[]; periodLabel: string }) {
  return (
    <details className="panel exact-values-panel">
      <summary>
        <span>
          <strong>Definitions, sources and exact values</strong>
          <small>Accessible detail table for audit, comparison and export preparation</small>
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </summary>
      <div className="table-scroll">
        <table className="exact-values-table">
          <thead>
            <tr>
              <th>Indicator</th>
              <th>{periodLabel}</th>
              <th>YTD result</th>
              <th>Target</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.id}>
                <td><span className="metric-id">{metric.id}</span><strong>{metric.name}</strong></td>
                <td><strong className="data-cell">{metric.month.displayValue}</strong><StatusPill status={metric.month.status} compact /></td>
                <td><strong className="data-cell">{metric.yearToDate.displayValue}</strong><small>{metric.aggregationLabel}</small></td>
                <td>{metric.target}</td>
                <td><ProvenanceChip provenance={metric.provenance} proposed={metric.proposed} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function MetricDetailsDrawer({
  metric,
  periodLabel,
  role,
  onClose,
  onViewTrend,
}: {
  metric: DashboardMetric;
  periodLabel: string;
  role: DemoRole;
  onClose: () => void;
  onViewTrend: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className="metric-drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="metric-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="metric-drawer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="metric-drawer-header">
          <div>
            <span className="metric-id">{metric.id}</span>
            <h2 id="metric-drawer-title">{metric.name}</h2>
          </div>
          <button ref={closeButton} type="button" className="drawer-close" onClick={onClose} aria-label="Close metric details">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="drawer-current-summary">
          <div>
            <span>{periodLabel}</span>
            <strong>{metric.month.displayValue}</strong>
          </div>
          <StatusPill status={metric.month.status} />
        </div>

        <section className="drawer-section">
          <h3>What it means</h3>
          <p>{metricMeaning[metric.id]}</p>
        </section>

        <section className="drawer-section drawer-calculation">
          <h3>How this month was calculated</h3>
          <code>{metric.month.calculation ?? "A complete monthly value has not been supplied."}</code>
          <dl>
            <div><dt>Target</dt><dd>{metric.target}</dd></div>
            <div><dt>Direction</dt><dd>{metric.direction === "higher" ? "Higher is better" : "Lower is better"}</dd></div>
          </dl>
        </section>

        <section className="drawer-section">
          <h3>{metric.aggregationLabel}</h3>
          <div className="drawer-ytd-value">
            <strong>{metric.yearToDate.displayValue}</strong>
            <StatusPill status={metric.yearToDate.status} compact />
          </div>
          <p>{metric.yearToDate.calculation ?? metric.yearToDate.note ?? "No complete YTD calculation is available."}</p>
          <small>YTD target: {metric.yearToDate.targetLabel}</small>
        </section>

        <section className="drawer-section drawer-data-info">
          <h3>Data information</h3>
          <dl>
            <div><dt>Period</dt><dd>{periodLabel}</dd></div>
            <div><dt>Source</dt><dd>{metric.provenance}</dd></div>
            <div><dt>Data state</dt><dd>{metric.month.completeness === "complete" ? "Complete monthly value" : "Monthly value unavailable"}</dd></div>
            <div><dt>Formula status</dt><dd>{metric.proposed ? "Proposed—awaiting approval" : "Approved definition"}</dd></div>
          </dl>
          <p>{metric.sourceNote}</p>
        </section>

        <div className="drawer-privacy-note">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>
            {role === "director"
              ? "Executive view: only aggregate definitions, values and trends are available."
              : role === "manager"
                ? "Manager view: source navigation remains aggregate and excludes individual clinical records."
                : "Officer view: source navigation follows the existing clinical and operational permissions."}
          </span>
        </div>

        <div className="metric-drawer-actions">
          <button type="button" className="button button-secondary" onClick={onViewTrend}>
            View monthly trend <ArrowRight size={15} aria-hidden="true" />
          </button>
          {role !== "director" && (
            <AppLink to={sourcePath[metric.id]} className="button button-primary">
              View source records <ExternalLink size={15} aria-hidden="true" />
            </AppLink>
          )}
        </div>
      </aside>
    </div>
  );
}

const statusPriority = (status: DashboardMetric["month"]["status"]) => {
  if (status === "outside") return 0;
  if (status === "approaching") return 1;
  if (status === "no-data") return 2;
  return 3;
};

const axisDomain = (metric: DashboardMetric, data: MetricTrendPoint[]): [number, number] => {
  if (metric.format === "percent-1") return [0, 100];
  const values = data.flatMap((item) => item.value === null ? [] : [item.value]);
  const maximum = Math.max(metric.targetValue, ...values, 1);
  return [0, Math.ceil(maximum * 1.15 * 10) / 10];
};

const formatAxisValue = (value: number, format: MetricFormat) => {
  if (format === "percent-1") return `${value}%`;
  if (format === "decimal-2") return value.toFixed(2);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const formatPeriod = (period: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    new Date(`${period}-01T00:00:00`),
  );
