import { PageHeader } from "../components/PageHeader";
import { DataValue } from "../components/DataValue";
import { StatusIndicator, type Status } from "../components/StatusIndicator";
import { Icon } from "../components/Icon";
import { primaryRole, useSession } from "../lib/session";

/**
 * The executive dashboard.
 *
 * Every card here reads "No data" and shows no value, because the metrics
 * service is not built. That is the correct state, not a gap to be filled with
 * something plausible: a computed figure that no record stands behind is the
 * exact failure this system was commissioned to remove.
 *
 * Cards are grouped by unit rather than laid out as one grid of ten. Ten tiles
 * in a row of three reads as a wall, and the structure of the dashboard should
 * mirror the structure of the department it reports on.
 */
type Provenance = "Derived" | "Manual" | "Register" | "Proposed";

interface MetricSlot {
  id: string;
  name: string;
  target: string;
  provenance: Provenance;
  status: Status;
  note?: string;
}

const healthAndWellness: MetricSlot[] = [
  { id: "K1", name: "Surveillance compliance", target: "100%", provenance: "Manual", status: "no-data" },
  { id: "K2", name: "Occupational disease rate", target: "0 cases", provenance: "Derived", status: "no-data" },
  { id: "K3", name: "Health-related absenteeism", target: "under 0.5 days per person", provenance: "Manual", status: "no-data" },
  { id: "K4", name: "Industrial hygiene compliance", target: "at least 95%", provenance: "Derived", status: "no-data" },
  { id: "K5", name: "Ergonomic risk control", target: "at least 95%", provenance: "Derived", status: "no-data" },
];

const workplaceSafety: MetricSlot[] = [
  { id: "S1", name: "Fatalities", target: "0", provenance: "Derived", status: "no-data", note: "Counts people." },
  { id: "S2", name: "Workplace injuries", target: "0", provenance: "Derived", status: "no-data", note: "Counts people, banded by severity." },
  {
    id: "S3",
    name: "Recordable incidents",
    target: "no target set",
    provenance: "Derived",
    status: "no-data",
    note: "Counts events determined recordable by an officer.",
  },
  { id: "S4", name: "Investigations completed", target: "100% of those required", provenance: "Derived", status: "no-data" },
  {
    id: "S5",
    name: "Near-miss reports",
    target: "higher is better",
    provenance: "Derived",
    status: "no-data",
    note: "More reports can mean a stronger reporting culture, not worse safety.",
  },
];

function MetricCard({ slot }: { slot: MetricSlot }) {
  return (
    <article className="panel flex flex-col">
      <div className="flex-1 p-4">
        <div className="flex items-baseline gap-2 text-sm text-ink-muted">
          <span className="data-value font-medium">{slot.id}</span>
          <span>{slot.name}</span>
        </div>
        <div className="mt-3">
          <DataValue value={null} size="kpi" context={`target ${slot.target}`} />
        </div>
        {slot.note ? <p className="mt-3 text-xs text-ink-muted">{slot.note}</p> : null}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-rule px-4 py-2">
        <StatusIndicator status={slot.status} />
        <span
          className="rounded px-2 py-1 text-xs text-ink-muted"
          style={{ background: "var(--neutral-wash)" }}
        >
          {slot.provenance}
        </span>
      </div>
    </article>
  );
}

export function DashboardPage() {
  const { user } = useSession();
  const role = primaryRole(user);
  const isDirector = role === "hwms-director";

  return (
    <>
      <PageHeader
        title="Divisional performance"
        description={
          isDirector
            ? "Headline indicators for the reporting period. Unit-level breakdowns are held by the manager and the officer."
            : "Every figure states where it came from: derived from records in this system, entered from a named external source, or evaluated from a register."
        }
      />

      <div
        className="mb-6 flex items-start gap-3 rounded border px-4 py-3 text-sm"
        style={{ borderColor: "var(--rule-strong)", background: "var(--neutral-wash)", color: "var(--ink-muted)" }}
      >
        <Icon name="info" size={18} className="mt-0.5 shrink-0" />
        <p className="max-w-form">
          The metrics service is not built, so every indicator reads no data. Nothing here is a
          placeholder number — a figure with no record behind it is the problem this system exists to
          remove, and the dashboard will not show one at any stage of the build.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg">Health and wellness</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {healthAndWellness.map((slot) => (
            <MetricCard key={slot.id} slot={slot} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg">Workplace safety</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workplaceSafety.map((slot) => (
            <MetricCard key={slot.id} slot={slot} />
          ))}
        </div>
      </section>
    </>
  );
}
