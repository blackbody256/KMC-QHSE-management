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

/**
 * The executive dashboard.
 *
 * Every figure here is derived from a record somebody entered, and every one
 * says where it came from and how it was worked out. That is the whole argument
 * of this system: the department already had figures, and what it did not have
 * was a way to answer "where did that come from" without a week of email.
 *
 * The page leads with what is wrong rather than with all nine indicators laid
 * out evenly. A grid of nine equally-weighted cards asks the reader to find the
 * problem; a dashboard should hand it to them. The exceptions come first,
 * named, and the full set follows for anyone who wants it.
 *
 * The mark on each card is chosen by what the figure *is*, not for variety:
 *
 *   a proportion of a whole   → a ring, with the target on the track
 *   a value against a floor
 *   or ceiling with no cap    → a straight track that can run past its target
 *   a count against zero      → the figure itself; a meter of "0 out of 0"
 *                               would be a shape pretending to be information
 *
 * Every one carries a sparkline of the months so far, because a single figure
 * is not a finding. 92% means little until you can see it was 97% in March.
 *
 * Four rules are visible on this screen and none of them are cosmetic. A
 * missing figure reads "No data" and is never styled as a failure. An
 * incomplete year-to-date is not averaged. The direction of each indicator is
 * printed beside its target, because it is not guessable from the name. And a
 * target its owner has not agreed is labelled proposed.
 */
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

/**
 * Which mark suits an indicator, decided from its own definition rather than
 * from a list of identifiers. A new indicator gets the right mark by virtue of
 * how its target is expressed.
 */
function markFor(metric: DashboardMetric): "ring" | "track" | "figure" {
  if (metric.format === "percent-1") return "ring";
  // An exact target, such as nought fatalities, is not a proportion and not
  // a distance along a track. The number is the chart.
  if (metric.targetValue === 0) return "figure";
  return "track";
}

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
          metrics: snapshot.metrics.filter((m) => m.group === "Occupational health"),
        },
        {
          label: "Health and safety summary",
          metrics: snapshot.metrics.filter((m) => m.group !== "Occupational health"),
        },
      ].filter((group) => group.metrics.length > 0)
    : [];

  const counted = (status: MetricStatus) =>
    snapshot?.metrics.filter((m) => m.month.status === status).length ?? 0;

  // Off target first, then approaching. No data is counted but not listed as an
  // exception: a month nobody has entered is a task, not a performance problem,
  // and mixing the two makes the list mean less than it should.
  const exceptions = snapshot
    ? [
        ...snapshot.metrics.filter((m) => m.month.status === "outside"),
        ...snapshot.metrics.filter((m) => m.month.status === "approaching"),
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Divisional performance"
        description={
          isDirector
            ? "Headline indicators for the reporting month. Unit-level detail is held by the manager and the officer."
            : "Every figure states where it came from and how it was worked out. Nothing here is entered directly."
        }
        actions={
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Month
            <input
              type="month"
              className="field w-auto py-1.5 text-sm"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            />
          </label>
        }
      />

      {loading ? (
        <div className="py-12 text-sm text-ink-muted">Assembling the dashboard…</div>
      ) : error ? (
        <div
          className="flex items-start gap-3 rounded border px-4 py-3 text-sm"
          style={{ borderColor: "var(--breach)", background: "var(--breach-wash)", color: "var(--breach)" }}
          role="alert"
        >
          <Icon name="error" size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : snapshot ? (
        <>
          {/* --- the shape of the month, then what is wrong with it --------- */}
          <section className="panel mb-6">
            <div className="panel-body grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="data-value text-kpi font-medium">{snapshot.onTarget}</span>
                  <span className="text-sm text-ink-muted">
                    of <span className="data-value">{snapshot.totalMetrics}</span> on target
                  </span>
                </div>
                <p className="mb-4 mt-1 text-xs text-ink-muted">
                  {snapshot.periodLabel} · year to date covers{" "}
                  <span className="data-value">{snapshot.monthsInYearToDate}</span> month
                  {snapshot.monthsInYearToDate === 1 ? "" : "s"} from January
                </p>

                <StatusBar
                  total={snapshot.totalMetrics}
                  counts={(["within", "approaching", "outside", "no-data"] as MetricStatus[]).map(
                    (status) => ({
                      status,
                      glyph: statusGlyph[status],
                      label: statusLabel[status],
                      count: counted(status),
                    }),
                  )}
                />
              </div>

              <div className="lg:border-l lg:border-rule lg:pl-8">
                <h2 className="mb-3 text-sm font-semibold">Needs attention</h2>

                {exceptions.length === 0 ? (
                  <p className="text-sm text-ink-muted">
                    No indicator is off target or approaching its limit in {snapshot.periodLabel}.
                    {counted("no-data") > 0 ? (
                      <>
                        {" "}
                        <span className="data-value">{counted("no-data")}</span> still has no figure
                        for the month, that is entry outstanding, not a result.
                      </>
                    ) : null}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {exceptions.map((metric) => (
                      <li
                        key={metric.id}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule pb-2 last:border-0 last:pb-0"
                      >
                        <span className="flex items-baseline gap-2">
                          <StatusIndicator
                            status={statusFor[metric.month.status]}
                            label={statusLabel[metric.month.status]}
                          />
                          <span className="text-sm font-medium">{metric.name}</span>
                        </span>
                        <span className="text-sm">
                          <span className="data-value font-medium">
                            {metric.month.displayValue}
                          </span>
                          <span className="text-ink-muted"> against {metric.target}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {groups.map((group) => (
            <section key={group.label} className="mb-8">
              <h2 className="mb-3 text-lg">{group.label}</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.metrics.map((metric) => (
                  <MetricCard key={metric.id} metric={metric} />
                ))}
              </div>
            </section>
          ))}
        </>
      ) : null}
    </>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const [open, setOpen] = useState(false);

  const mark = markFor(metric);
  const directionPhrase = metric.direction === "higher" ? "higher is better" : "lower is better";
  const value = metric.month.numericValue ?? null;

  return (
    <article className="panel flex flex-col">
      <div className="flex-1 p-4">
        <div className="flex items-baseline gap-2 text-sm text-ink-muted">
          <span className="data-value font-medium">{metric.id}</span>
          <span>{metric.name}</span>
        </div>

        {mark === "ring" ? (
          <div className="mt-3 flex items-center gap-4">
            <RadialMeter
              value={value}
              target={metric.targetValue}
              status={metric.month.status}
              label={`${metric.name}: ${metric.month.displayValue || "no data"} against a target of ${metric.target}`}
            />
            <div className="min-w-0">
              <div className="text-xs text-ink-muted">
                target {metric.target}
                <br />
                {directionPhrase}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span
                className="data-value text-kpi font-medium"
                style={{ color: value === null ? "var(--ink-faint)" : "var(--ink)" }}
              >
                {metric.month.displayValue === "" ? "—" : metric.month.displayValue}
              </span>
            </div>
            <div className="mt-1 text-xs text-ink-muted">
              target {metric.target} · {directionPhrase}
            </div>

            {mark === "track" ? (
              <div className="mt-3">
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

        <div className="mt-4 border-t border-rule pt-3">
          <Sparkline
            points={metric.trend.map((point) => ({
              period: point.period,
              value: point.value,
              status: point.status,
            }))}
            label={`${metric.name} by month, January to ${metric.trend[metric.trend.length - 1]?.period ?? "the reporting month"}`}
          />
        </div>

        {/* The year-to-date cell. Either a figure, or an explicit statement of
            how much history is missing, never a part-year average. */}
        <div className="mt-3 border-t border-rule pt-3">
          <div className="text-xs text-ink-muted">{metric.aggregationLabel}</div>
          {metric.yearToDate.displayValue !== "" ? (
            <div className="data-value text-lg font-medium">{metric.yearToDate.displayValue}</div>
          ) : (
            <div className="mt-0.5 text-xs text-ink-faint">
              {metric.yearToDate.note ?? "No data"}
            </div>
          )}
        </div>

        {metric.month.note ? (
          <p className="mt-3 text-xs text-ink-muted">{metric.month.note}</p>
        ) : null}

        {/* Provenance on demand rather than always open: it answers a question
            the reader has not asked yet, and nine cards of it at once is a wall. */}
        {open ? (
          <div
            className="mt-3 space-y-2 rounded border p-3 text-xs"
            style={{ borderColor: "var(--rule)", background: "var(--surface-sunken)" }}
          >
            {metric.month.calculation ? (
              <div>
                <div className="text-ink-muted">How this month's figure was worked out</div>
                <div className="data-value mt-0.5">{metric.month.calculation}</div>
              </div>
            ) : null}
            {metric.yearToDate.calculation ? (
              <div>
                <div className="text-ink-muted">Year to date</div>
                <div className="data-value mt-0.5">{metric.yearToDate.calculation}</div>
              </div>
            ) : null}
            {metric.note ? <p className="text-ink-muted">{metric.note}</p> : null}
            <div>
              <div className="text-ink-muted">Target source</div>
              <div className="mt-0.5">{metric.sourceNote}</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-rule px-4 py-2">
        <StatusIndicator
          status={statusFor[metric.month.status]}
          label={statusLabel[metric.month.status]}
        />
        <div className="flex items-center gap-2">
          {metric.proposed ? (
            <span
              className="rounded px-2 py-1 text-xs font-medium"
              style={{ background: "var(--caution-wash)", color: "var(--caution)" }}
              title="The target has not yet been agreed by its owner."
            >
              Target proposed
            </span>
          ) : null}
          <span
            className="rounded px-2 py-1 text-xs text-ink-muted"
            style={{ background: "var(--neutral-wash)" }}
          >
            {metric.provenance}
          </span>
          <button
            type="button"
            className="text-xs text-ink-muted underline"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
          >
            {open ? "Hide" : "Where from"}
          </button>
        </div>
      </div>
    </article>
  );
}
