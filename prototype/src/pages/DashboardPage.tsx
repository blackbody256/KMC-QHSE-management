import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Database, FileWarning, ShieldCheck } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "../components/PageHeader";
import { ProvenanceChip, StatusPill } from "../components/StatusPill";
import { buildDashboardSnapshot, trendData } from "../lib/calculations";
import { useDemoStore } from "../store/DemoStore";

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
  const trends = useMemo(() => trendData(state), [state]);
  const healthMetrics = snapshot.metrics.filter((metric) => metric.id.startsWith("OH"));
  const summaryMetrics = snapshot.metrics.filter((metric) => metric.id.startsWith("S"));

  return (
    <div>
      <PageHeader
        eyebrow="Health and Wellness Dashboard · proposed name"
        title="Health and Wellness performance"
        description="Monthly and year-to-date results for the one division now in scope. Every value keeps its source visible."
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

      <section className="kpi-summary-band" aria-label="KPI summary">
        <div className="summary-score">
          <span className="summary-label">Health and Wellness · {snapshot.periodLabel}</span>
          <strong><span>{snapshot.onTarget}</span> of {snapshot.totalMetrics} KPIs on target</strong>
          <small>{snapshot.noData ? `${snapshot.noData} with no monthly data` : "All monthly values received"}</small>
        </div>
        <div className="summary-source">
          <ShieldCheck size={20} aria-hidden="true" />
          <div>
            <strong>One division in scope</strong>
            <span>Occupational Health · Ergonomics and Wellness · Industrial Hygiene</span>
          </div>
        </div>
      </section>

      <section className="decision-callout" aria-label="Safety data ownership decision">
        <FileWarning size={20} aria-hidden="true" />
        <div>
          <strong>Safety figures are attributed returns; the authoritative owner is not yet confirmed</strong>
          <span>
            Fatalities, incidents, injuries and near misses remain visible, but this system does not maintain a parallel incident register. Benard must confirm whether Workplace Safety supplies monthly returns or an integration.
          </span>
        </div>
      </section>

      <KpiSection
        eyebrow="Client dashboard panel"
        title="Health and safety summary"
        metrics={summaryMetrics}
        periodLabel={snapshot.periodLabel}
      />
      <KpiSection
        eyebrow="Retained indicators"
        title="Occupational health controls"
        metrics={healthMetrics}
        periodLabel={snapshot.periodLabel}
      />

      <section className="panel trend-panel dashboard-section" aria-labelledby="trend-heading">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">Twelve-month view</div>
            <h2 id="trend-heading">Health performance trend</h2>
          </div>
          <span className="provenance">Synthetic attributed returns</span>
        </div>
        <div className="chart-frame">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trends} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e5e8ed" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: "#667085", fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: "#667085", fontSize: 11 }} width={34} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} tick={{ fill: "#667085", fontSize: 11 }} width={44} />
              <Tooltip contentStyle={{ borderRadius: 4, borderColor: "#d0d5dd" }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="absenteeism" name="Absenteeism · days/person" stroke="#1769aa" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="surveillance" name="Surveillance · %" stroke="#087f5b" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <details className="chart-data">
          <summary>View exact trend values</summary>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Period</th><th>Absenteeism</th><th>Surveillance</th></tr></thead>
              <tbody>
                {trends.map((row) => (
                  <tr key={row.periodCode}>
                    <td>{row.period}</td>
                    <td className="data-cell">{row.absenteeism.toFixed(2)} days/person</td>
                    <td className="data-cell">{row.surveillance.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </div>
  );
}

function KpiSection({
  eyebrow,
  title,
  metrics,
  periodLabel,
}: {
  eyebrow: string;
  title: string;
  metrics: ReturnType<typeof buildDashboardSnapshot>["metrics"];
  periodLabel: string;
}) {
  return (
    <section className="panel kpi-table-panel dashboard-section" aria-labelledby={`${title.replaceAll(" ", "-")}-heading`}>
      <div className="panel-heading">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h2 id={`${title.replaceAll(" ", "-")}-heading`}>{title}</h2>
        </div>
        <span className="section-meta">YTD is an average of complete monthly history</span>
      </div>
      <div className="table-scroll">
        <table className="kpi-table">
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Target and direction</th>
              <th>{periodLabel}</th>
              <th>Year-to-date average</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.id}>
                <td>
                  <span className="metric-id">{metric.id}</span>
                  <strong className="kpi-name">{metric.name}</strong>
                  <small>{metric.note}</small>
                </td>
                <td>
                  <strong className="data-cell">{metric.target}</strong>
                  <span className={`direction-label direction-${metric.direction}`}>
                    {metric.direction === "higher" ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />}
                    {metric.direction === "higher" ? "Higher is better" : "Lower is better"}
                  </span>
                </td>
                <MetricValueCell value={metric.month} />
                <MetricValueCell value={metric.yearToDate} />
                <td>
                  <ProvenanceChip provenance={metric.provenance} proposed={metric.proposed} />
                  {metric.provenance === "Attributed return" && (
                    <span className="source-pending"><Database size={13} aria-hidden="true" /> Owner pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MetricValueCell({ value }: { value: ReturnType<typeof buildDashboardSnapshot>["metrics"][number]["month"] }) {
  return (
    <td className="kpi-value-cell">
      <strong className="metric-value">{value.displayValue}</strong>
      {value.note && <small>{value.note}</small>}
      <StatusPill status={value.status} compact />
    </td>
  );
}

const formatPeriod = (period: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    new Date(`${period}-01T00:00:00`),
  );
