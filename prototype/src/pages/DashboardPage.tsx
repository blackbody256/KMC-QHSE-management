import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import {
  buildDashboardSnapshot,
  daysBetween,
  readingStatus,
  trendData,
} from "../lib/calculations";
import { useDemoStore } from "../store/DemoStore";
import type { EnvironmentalParameter, ErgonomicOutcome } from "../types";

const OUTCOME_COLORS: Record<ErgonomicOutcome, string> = {
  Compliant: "#0e7c66",
  "Partially compliant": "#b26a00",
  "Non-compliant": "#b42318",
};

export function DashboardPage() {
  const { state } = useDemoStore();
  const periods = useMemo(
    () =>
      [...new Set(state.plans.map((item) => item.period))]
        .sort((a, b) => b.localeCompare(a)),
    [state.plans],
  );
  const [period, setPeriod] = useState(periods[0] ?? "2026-07");
  const snapshot = useMemo(
    () => buildDashboardSnapshot(state, period),
    [state, period],
  );
  const trends = useMemo(() => trendData(state), [state]);

  const latestReadings = useMemo(() => {
    const order: EnvironmentalParameter[] = [
      "PM2.5",
      "PM10",
      "Noise · day",
      "Noise · night",
    ];
    return order
      .map((parameter) =>
        [...snapshot.readings]
          .filter((entry) => entry.parameter === parameter)
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0],
      )
      .filter(Boolean);
  }, [snapshot.readings]);

  const outcomeData = useMemo(() => {
    const outcomes: ErgonomicOutcome[] = [
      "Compliant",
      "Partially compliant",
      "Non-compliant",
    ];
    return outcomes.map((name) => ({
      name,
      value: snapshot.assessments.filter((item) => item.outcome === name).length,
    }));
  }, [snapshot.assessments]);

  const alerts = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      detail: string;
      severity: "warning" | "breach" | "info";
    }> = [];
    state.licences.forEach((licence) => {
      const days = daysBetween("2026-07-30", licence.expiryDate);
      if (days <= 90) {
        items.push({
          id: licence.id,
          title: `${licence.holder} credential`,
          detail: days < 0 ? `Expired ${Math.abs(days)} days ago` : `Expires in ${days} days`,
          severity: days <= 30 ? "breach" : "warning",
        });
      }
    });
    snapshot.readings
      .filter((entry) => readingStatus(entry) === "outside")
      .slice(0, 2)
      .forEach((entry) =>
        items.push({
          id: entry.id,
          title: `${entry.parameter} outside illustrative limit`,
          detail: `${entry.value} ${entry.unit} at ${entry.location}`,
          severity: "breach",
        }),
      );
    snapshot.assessments
      .flatMap((entry) => (entry.action ? [{ ...entry.action, workstation: entry.workstation }] : []))
      .filter((action) => action.status !== "Closed" && action.dueDate <= `${period}-31`)
      .forEach((action) =>
        items.push({
          id: action.id,
          title: "Ergonomic action requires attention",
          detail: `${action.workstation} · due ${formatDate(action.dueDate)}`,
          severity: "warning",
        }),
      );
    return items.slice(0, 5);
  }, [state.licences, snapshot.readings, snapshot.assessments, period]);

  return (
    <div>
      <PageHeader
        eyebrow="Executive overview"
        title="Divisional performance"
        description="Seven primary indicators, with their source and confidence made visible."
        action={
          <label className="period-control">
            <CalendarDays size={17} aria-hidden="true" />
            <span className="sr-only">Reporting period</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              {periods.map((item) => (
                <option key={item} value={item}>
                  {formatPeriod(item)}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <section className="summary-strip" aria-label="Dashboard context">
        <div>
          <span className="summary-label">Reporting period</span>
          <strong>{snapshot.periodLabel}</strong>
        </div>
        <div>
          <span className="summary-label">Data position</span>
          <strong>{snapshot.returnRow ? "Monthly return received" : "Monthly return missing"}</strong>
        </div>
        <div>
          <span className="summary-label">Clinical privacy</span>
          <strong>{state.role === "management" ? "Aggregate view only" : "Doctor view"}</strong>
        </div>
        <div className="summary-callout">
          <Info size={16} aria-hidden="true" />
          <span>Proposed formulas are shown for review, not as approved policy.</span>
        </div>
      </section>

      <section aria-labelledby="kpi-heading">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Requested KPI set</div>
            <h2 id="kpi-heading">Seven executive indicators</h2>
          </div>
          <span className="section-meta">Computed from the current demo state</span>
        </div>
        <div className="metric-grid">
          {snapshot.metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </section>

      <div className="dashboard-two-column">
        <section className="panel trend-panel" aria-labelledby="trend-heading">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Twelve-month view</div>
              <h2 id="trend-heading">Health performance trend</h2>
            </div>
            <span className="provenance">Manual returns</span>
          </div>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trends} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e5e8ed" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tick={{ fill: "#667085", fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  domain={[0, 0.7]}
                  tick={{ fill: "#667085", fontSize: 11 }}
                  width={34}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[70, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fill: "#667085", fontSize: 11 }}
                  width={44}
                />
                <Tooltip contentStyle={{ borderRadius: 4, borderColor: "#d0d5dd" }} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="absenteeism"
                  name="Absenteeism · days/person"
                  stroke="#e51f2b"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="surveillance"
                  name="Surveillance · %"
                  stroke="#1769aa"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <details className="chart-data">
            <summary>View exact trend values</summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Absenteeism</th>
                    <th>Surveillance</th>
                  </tr>
                </thead>
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

        <section className="panel alerts-panel" aria-labelledby="alerts-heading">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Needs attention</div>
              <h2 id="alerts-heading">Current alerts</h2>
            </div>
            <span className="count-badge">{alerts.length}</span>
          </div>
          <div className="alert-list">
            {alerts.length === 0 ? (
              <div className="empty-inline">
                <CheckCircle2 size={20} aria-hidden="true" />
                <span>No current alerts for this demonstration period.</span>
              </div>
            ) : (
              alerts.map((alert) => (
                <div className={`alert-row alert-${alert.severity}`} key={alert.id}>
                  <AlertTriangle size={18} aria-hidden="true" />
                  <div>
                    <strong>{alert.title}</strong>
                    <span>{alert.detail}</span>
                  </div>
                  <ArrowRight size={16} aria-hidden="true" />
                </div>
              ))
            )}
          </div>
          <div className="panel-footnote">
            Alerts use words and symbols as well as colour.
          </div>
        </section>
      </div>

      <div className="dashboard-two-column">
        <section className="panel" aria-labelledby="environment-chart-heading">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Latest values in {snapshot.periodLabel}</div>
              <h2 id="environment-chart-heading">Measured values against limits</h2>
            </div>
            <span className="provenance">Limits pending approval</span>
          </div>
          <div className="limit-bars">
            {latestReadings.length === 0 ? (
              <div className="empty-inline">No environmental readings for this period.</div>
            ) : (
              latestReadings.map((reading) => {
                const width = Math.min(100, (reading.value / (reading.limit * 1.25)) * 100);
                const target = 80;
                const status = readingStatus(reading);
                return (
                  <div className="limit-row" key={reading.id}>
                    <div className="limit-row-heading">
                      <strong>{reading.parameter}</strong>
                      <span>
                        <b>{reading.value}</b> / {reading.limit} {reading.unit}
                      </span>
                    </div>
                    <div
                      className="limit-track"
                      aria-label={`${reading.parameter}: ${reading.value} ${reading.unit}, limit ${reading.limit}`}
                    >
                      <div className={`limit-value limit-${status}`} style={{ width: `${width}%` }} />
                      <div className="limit-marker" style={{ left: `${target}%` }} />
                    </div>
                    <div className="limit-meta">
                      <span>{reading.location}</span>
                      <StatusPill status={status} compact label={status === "within" ? "Within limit" : "Outside limit"} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="ergo-chart-heading">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Workstation assessments</div>
              <h2 id="ergo-chart-heading">Ergonomic outcomes</h2>
            </div>
            <span className="section-meta">{snapshot.assessments.length} assessments</span>
          </div>
          {snapshot.assessments.length === 0 ? (
            <div className="empty-inline">No ergonomic assessments for this period.</div>
          ) : (
            <div className="donut-layout">
              <div className="donut-chart">
                <ResponsiveContainer width="100%" height={245}>
                  <PieChart>
                    <Pie
                      data={outcomeData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {outcomeData.map((entry) => (
                        <Cell key={entry.name} fill={OUTCOME_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong>{snapshot.assessments.length}</strong>
                  <span>Total</span>
                </div>
              </div>
              <div className="donut-legend">
                {outcomeData.map((entry) => (
                  <div key={entry.name}>
                    <span
                      className="legend-swatch"
                      style={{ backgroundColor: OUTCOME_COLORS[entry.name] }}
                    />
                    <span>{entry.name}</span>
                    <strong>{entry.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="panel-footnote">
            Outcome definitions are confirmed; the proposed action-based KPI formula still requires approval.
          </p>
        </section>
      </div>
    </div>
  );
}

const formatPeriod = (period: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    new Date(`${period}-01T00:00:00`),
  );

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
