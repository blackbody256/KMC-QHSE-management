import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusIndicator, type Status } from "../components/StatusIndicator";
import { Icon } from "../components/Icon";
import { LinearMeter, RadialMeter, Sparkline, StatusBar } from "../components/charts";
import {
  ApiError,
  metricsApi,
  type DashboardMetric,
  type DashboardSnapshot,
  type MetricStatus,
} from "../lib/api";
import { primaryRole, useSession } from "../lib/session";
import { currentPeriod } from "../lib/dates";

const statusFor: Record<MetricStatus, Status> = {
  within: "within",
  approaching: "approaching",
  outside: "breach",
  "no-data": "no-data",
};

const statusLabel: Record<MetricStatus, string> = {
  within: "On target",
  approaching: "Approaching",
  outside: "Off target",
  "no-data": "No data",
};

const statusGlyph: Record<MetricStatus, string> = {
  within: "✓",
  approaching: "~",
  outside: "✗",
  "no-data": "—",
};

function markFor(metric: DashboardMetric): "ring" | "track" | "figure" {
  if (metric.format === "percent-1") return "ring";
  if (metric.targetValue === 0) return "figure";
  return "track";
}

/**
 * The dashboard opens with a scan, then an explanation. Four small summary
 * cards answer the questions a manager asks first; the status mix and the
 * exception list follow; individual indicators remain available below with
 * provenance on demand. Missing data never masquerades as poor performance.
 */
export function DashboardPage() {
  const { user } = useSession();
  const isDirector = primaryRole(user) === "hwms-director";

  const [period, setPeriod] = useState(currentPeriod);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const body = await metricsApi.dashboard(period);
        if (!cancelled) {
          setSnapshot(body);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSnapshot(null);
          setError(
            err instanceof ApiError ? err.message : "The dashboard could not be read. Try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const groups = snapshot
    ? [
        {
          label: "Occupational health",
          metrics: snapshot.metrics.filter((metric) => metric.group === "Occupational health"),
        },
        {
          label: "Health and safety summary",
          metrics: snapshot.metrics.filter((metric) => metric.group !== "Occupational health"),
        },
      ].filter((group) => group.metrics.length > 0)
    : [];

  const counted = (status: MetricStatus) =>
    snapshot?.metrics.filter((metric) => metric.month.status === status).length ?? 0;

  const exceptions = snapshot
    ? [
        ...snapshot.metrics.filter((metric) => metric.month.status === "outside"),
        ...snapshot.metrics.filter((metric) => metric.month.status === "approaching"),
      ]
    : [];

  const attentionCount = counted("outside") + counted("approaching");
  const reportedCount = snapshot ? snapshot.totalMetrics - snapshot.noData : 0;

  return (
    <>
      <PageHeader
        eyebrow="Reporting dashboard"
        title="Health and wellness overview"
        description={
          isDirector
            ? "A concise view of the reporting month. Unit-level clinical detail remains with the manager and officer."
            : "See the month at a glance, then open an indicator only when you need its calculation or source."
        }
        actions={
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
            Reporting month
            <input
              type="month"
              className="field w-auto text-sm"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            />
          </label>
        }
      />

      {loading ? (
        <div className="panel">
          <div className="panel-body flex items-center gap-3 text-sm text-ink-muted">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-clinical" />
            Assembling the reporting picture…
          </div>
        </div>
      ) : error ? (
        <div
          className="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: "var(--breach)", background: "var(--breach-wash)", color: "var(--breach)" }}
          role="alert"
        >
          <Icon name="error" size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : snapshot ? (
        <div className="dashboard-content">
          <section className="dashboard-stat-grid" aria-label={`${snapshot.periodLabel} summary`}>
            <article className="dashboard-stat">
              <span className="dashboard-stat-label">Indicators on target</span>
              <strong className="dashboard-stat-value">
                {snapshot.onTarget}/{snapshot.totalMetrics}
              </strong>
              <span className="dashboard-stat-note">Meeting the agreed threshold</span>
            </article>

            <article className="dashboard-stat" data-tone="attention">
              <span className="dashboard-stat-label">Need attention</span>
              <strong className="dashboard-stat-value">{attentionCount}</strong>
              <span className="dashboard-stat-note">
                {counted("outside")} off target · {counted("approaching")} approaching
              </span>
            </article>

            <article className="dashboard-stat" data-tone="missing">
              <span className="dashboard-stat-label">Reporting coverage</span>
              <strong className="dashboard-stat-value">
                {reportedCount}/{snapshot.totalMetrics}
              </strong>
              <span className="dashboard-stat-note">
                {snapshot.noData === 0 ? "All figures received" : `${snapshot.noData} still awaiting data`}
              </span>
            </article>

            <article className="dashboard-stat" data-tone="period">
              <span className="dashboard-stat-label">Year-to-date window</span>
              <strong className="dashboard-stat-value">{snapshot.monthsInYearToDate} mo.</strong>
              <span className="dashboard-stat-note">January through {snapshot.periodLabel}</span>
            </article>
          </section>

          <section className="dashboard-overview" aria-labelledby="monthly-picture-heading">
            <div className="overview-grid">
              <div className="overview-summary">
                <span className="section-kicker">Monthly picture</span>
                <h2 id="monthly-picture-heading" className="overview-heading">
                  Performance distribution
                </h2>
                <div className="overview-score">
                  <strong>{snapshot.onTarget}</strong>
                  <span>of {snapshot.totalMetrics} indicators on target</span>
                </div>
                <p className="overview-note">
                  {snapshot.periodLabel} · year to date includes {snapshot.monthsInYearToDate} month
                  {snapshot.monthsInYearToDate === 1 ? "" : "s"}
                </p>
                <StatusBar
                  total={snapshot.totalMetrics}
                  counts={( ["within", "approaching", "outside", "no-data"] as MetricStatus[]).map(
                    (status) => ({
                      status,
                      glyph: statusGlyph[status],
                      label: statusLabel[status],
                      count: counted(status),
                    }),
                  )}
                />
              </div>

              <div className="overview-attention">
                <div className="attention-head">
                  <div>
                    <span className="section-kicker">Review queue</span>
                    <h2 className="overview-heading">Needs attention</h2>
                  </div>
                  <span className="attention-count" aria-label={`${exceptions.length} indicators need attention`}>
                    {exceptions.length}
                  </span>
                </div>

                {exceptions.length === 0 ? (
                  <p className="text-sm leading-relaxed text-ink-muted">
                    No indicator is off target or approaching its limit in {snapshot.periodLabel}.
                    {counted("no-data") > 0
                      ? ` ${counted("no-data")} still has no monthly figure; that is reporting work outstanding, not a performance result.`
                      : " All expected figures have been received."}
                  </p>
                ) : (
                  <ul className="attention-list">
                    {exceptions.map((metric) => (
                      <li key={metric.id} className="attention-item">
                        <div className="attention-name">
                          <StatusIndicator
                            status={statusFor[metric.month.status]}
                            label={statusLabel[metric.month.status]}
                          />
                          <strong title={metric.name}>{metric.name}</strong>
                        </div>
                        <div className="attention-value">
                          <strong>{metric.month.displayValue}</strong>
                          target {metric.target}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {groups.map((group) => (
            <section key={group.label} className="metric-section">
              <div className="metric-section-head">
                <h2>{group.label}</h2>
                <span>{group.metrics.length} indicators</span>
              </div>
              <div className="metric-grid">
                {group.metrics.map((metric) => (
                  <MetricCard key={metric.id} metric={metric} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const [open, setOpen] = useState(false);
  const mark = markFor(metric);
  const directionPhrase = metric.direction === "higher" ? "Higher is better" : "Lower is better";
  const value = metric.month.numericValue ?? null;

  return (
    <article className="panel metric-card" data-status={metric.month.status}>
      <div className="metric-card-head">
        <div className="metric-title-wrap">
          <span className="metric-code">{metric.id}</span>
          <h3 className="metric-title">{metric.name}</h3>
        </div>
        <StatusIndicator
          status={statusFor[metric.month.status]}
          label={statusLabel[metric.month.status]}
        />
      </div>

      <div className="metric-card-body">
        {mark === "ring" ? (
          <div className="metric-visual">
            <RadialMeter
              value={value}
              target={metric.targetValue}
              status={metric.month.status}
              label={`${metric.name}: ${metric.month.displayValue || "no data"} against a target of ${metric.target}`}
            />
            <div className="metric-target">
              <strong className="block text-ink">Target {metric.target}</strong>
              {directionPhrase}
              {metric.proposed ? (
                <span className="mt-2 block font-semibold text-caution">Target proposed</span>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="metric-visual block pt-3">
            <div
              className="metric-figure"
              style={{ color: value === null ? "var(--ink-faint)" : "var(--ink)" }}
            >
              {metric.month.displayValue === "" ? "—" : metric.month.displayValue}
            </div>
            <div className="metric-target mt-2">
              Target {metric.target} · {directionPhrase}
              {metric.proposed ? <span className="ml-2 font-semibold text-caution">Proposed</span> : null}
            </div>
            {mark === "track" ? (
              <div className="mt-4">
                <LinearMeter
                  value={value}
                  target={metric.targetValue}
                  status={metric.month.status}
                  higherIsBetter={metric.direction === "higher"}
                  label={`${metric.name}: ${metric.month.displayValue || "no data"} against a target of ${metric.target}`}
                />
              </div>
            ) : null}
          </div>
        )}

        {metric.month.note ? <p className="mb-3 mt-0 text-xs text-ink-muted">{metric.month.note}</p> : null}

        <div className="metric-compact-row">
          <div>
            <div className="metric-mini-label">Trend this year</div>
            <Sparkline
              points={metric.trend.map((point) => ({
                period: point.period,
                value: point.value,
                status: point.status,
              }))}
              label={`${metric.name} by month, January to ${metric.trend[metric.trend.length - 1]?.period ?? "the reporting month"}`}
            />
          </div>
          <div>
            <div className="metric-mini-label">{metric.aggregationLabel}</div>
            {metric.yearToDate.displayValue !== "" ? (
              <div className="metric-ytd">{metric.yearToDate.displayValue}</div>
            ) : (
              <div className="metric-ytd-note">{metric.yearToDate.note ?? "No data"}</div>
            )}
          </div>
        </div>

        {open ? (
          <div className="metric-detail">
            {metric.month.calculation ? (
              <div>
                <strong>Monthly calculation</strong>
                <span className="data-value">{metric.month.calculation}</span>
              </div>
            ) : null}
            {metric.yearToDate.calculation ? (
              <div>
                <strong>Year-to-date calculation</strong>
                <span className="data-value">{metric.yearToDate.calculation}</span>
              </div>
            ) : null}
            {metric.note ? <p className="m-0">{metric.note}</p> : null}
            <div>
              <strong>Target source</strong>
              <span>{metric.sourceNote}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="metric-card-foot">
        <span className="metric-provenance" title={metric.provenance}>
          {metric.provenance}
        </span>
        <button
          type="button"
          className="metric-detail-button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
        >
          {open ? "Hide source" : "View source"}
        </button>
      </div>
    </article>
  );
}
