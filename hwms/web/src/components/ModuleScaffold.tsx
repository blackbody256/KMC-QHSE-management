import { Icon } from "./Icon";
import { StatusIndicator } from "./StatusIndicator";

interface ModuleScaffoldProps {
  summary?: string;
  /** What this module will hold once built. Records, not figures. */
  plannedRecords: string[];
  /**
   * Set when the module's scope is a benchmark proposal rather than a
   * confirmed KMC requirement, and name who confirms it.
   */
  awaitingConfirmationBy?: string;
  phase: string;
}

/**
 * The placeholder shown for a module that is routed but not yet built.
 *
 * It never shows a figure, a chart or a sample record. A stakeholder who sees
 * a number assumes a capability exists behind it, and the credibility cost of
 * correcting that later is higher than the demonstration value of showing it.
 * This is the rule that governs missing metrics applied to a whole module.
 */
export function ModuleScaffold({
  summary,
  plannedRecords,
  awaitingConfirmationBy,
  phase,
}: ModuleScaffoldProps) {
  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="panel-head">
          <h2 className="text-lg">Not yet built</h2>
          <StatusIndicator status="no-data" label={`Scheduled for ${phase}`} />
        </div>
        <div className="panel-body space-y-4">
          {summary ? <p className="max-w-form text-sm text-ink-muted">{summary}</p> : null}
          <p className="max-w-form text-sm text-ink-muted">
            The route, the access rules and the navigation for this module are in place. The records
            and the screens are not. Nothing on this page is sample data, because a figure shown here
            would be read as a capability that exists.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="text-lg">Records this module will hold</h2>
        </div>
        <div className="panel-body">
          <ul className="grid gap-2 sm:grid-cols-2">
            {plannedRecords.map((record) => (
              <li key={record} className="flex items-start gap-2 text-sm text-ink-muted">
                <Icon name="chevron_right" size={18} className="mt-0.5 shrink-0" />
                <span>{record}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {awaitingConfirmationBy ? (
        <section
          className="rounded border px-4 py-3"
          style={{ borderColor: "var(--rule-strong)", background: "var(--caution-wash)" }}
        >
          <div className="flex items-start gap-3">
            <Icon name="help" size={20} className="mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-semibold" style={{ color: "var(--caution)" }}>
                Benchmark proposal — not approved by KMC
              </div>
              <p className="mt-1 text-ink-muted">
                The scope above is drawn from how this function is structured in comparable
                organisations. It is a starting point for {awaitingConfirmationBy} to correct, not a
                statement of what KMC requires.
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
