import { useMemo, useState } from "react";
import { CalendarDays, FileWarning, Info, ShieldCheck } from "lucide-react";
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
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import {
  buildDashboardSnapshot,
  buildSafetyDashboardSnapshot,
  trendData,
} from "../lib/calculations";
import { AppLink } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";

const periodStateCopy = {
  "open-empty": { status: "no-data" as const, label: "Open · no events entered" },
  "open-provisional": { status: "provisional" as const, label: "Open · provisional" },
  "attested-empty": { status: "within" as const, label: "Attested · final zero" },
  "attested-final": { status: "within" as const, label: "Attested · final values" },
};

export function DashboardPage() {
  const { state } = useDemoStore();
  const periods = useMemo(
    () =>
      [
        ...new Set([
          ...state.plans.map((item) => item.period),
          ...state.safetyAttestations.map((item) => item.period),
          ...state.safetyIncidents.map((item) => item.period),
        ]),
      ].sort((a, b) => b.localeCompare(a)),
    [state],
  );
  const [period, setPeriod] = useState(
    periods.includes("2026-07") ? "2026-07" : periods[0] ?? "2026-07",
  );
  const snapshot = useMemo(() => buildDashboardSnapshot(state, period), [state, period]);
  const safety = useMemo(
    () => buildSafetyDashboardSnapshot(state, period),
    [state, period],
  );
  const trends = useMemo(() => trendData(state), [state]);
  const safetyState = periodStateCopy[safety.periodState];
  const isDirector = state.role === "director";

  return (
    <div>
      <PageHeader
        eyebrow="Executive overview"
        title="QHSE performance"
        description="Operational records produce the dashboard; provenance and incomplete states remain visible."
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
          <span className="summary-label">Monthly return</span>
          <strong>{snapshot.returnRow ? "Received" : "No data"}</strong>
        </div>
        <div>
          <span className="summary-label">Safety register</span>
          <StatusPill status={safetyState.status} compact label={safetyState.label} />
        </div>
        <div className="summary-callout">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>{isDirector ? "Executive summary only" : "Role-controlled operational view"}</span>
        </div>
      </section>

      <section className="decision-callout" aria-label="Reporting-template decision">
        <FileWarning size={20} aria-hidden="true" />
        <div>
          <strong>Five Health and Wellness KPIs are shown instead of the template’s seven</strong>
          <span>
            K6/K7 medical certification tracking was withdrawn through the verbal 31 July 2026
            stakeholder decision. Generic permit and calibration expiry tracking is retained for
            future confirmed units.
          </span>
        </div>
      </section>

      <section aria-labelledby="health-kpi-heading">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Health and Wellness</div>
            <h2 id="health-kpi-heading">Five primary indicators</h2>
          </div>
          <span className="section-meta">Formulas remain labelled where approval is open</span>
        </div>
        <div className="metric-grid">
          {snapshot.metrics.map((item) => (
            <MetricCard key={item.id} metric={item} />
          ))}
        </div>
      </section>

      <section aria-labelledby="safety-kpi-heading" className="dashboard-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Workplace Safety</div>
            <h2 id="safety-kpi-heading">Event-derived safety indicators</h2>
          </div>
          {!isDirector && (
            <AppLink className="text-link" to="/workplace-safety">
              Open privacy-controlled unit view →
            </AppLink>
          )}
        </div>
        {safety.periodState === "open-empty" && (
          <div className="attestation-explainer">
            <Info size={20} aria-hidden="true" />
            <div>
              <strong>No data is intentionally different from zero</strong>
              <span>
                This period is open and has no incidents. Compare it with an attested empty period:
                only the attested period may report a final zero.
              </span>
            </div>
          </div>
        )}
        <div className="metric-grid safety-metric-grid">
          {safety.metrics.map((item) => (
            <MetricCard key={item.id} metric={item} />
          ))}
        </div>
      </section>

      <section className="panel trend-panel dashboard-section" aria-labelledby="trend-heading">
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
              <YAxis yAxisId="left" domain={[0, 0.7]} tick={{ fill: "#667085", fontSize: 11 }} width={34} />
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
    </div>
  );
}

const formatPeriod = (period: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    new Date(`${period}-01T00:00:00`),
  );
