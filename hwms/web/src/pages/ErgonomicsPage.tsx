import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { StatusIndicator, type Status } from "../components/StatusIndicator";
import {
  ApiError,
  occupationalApi,
  type CorrectiveAction,
  type ErgonomicAssessment,
  type OccupationalOptions,
} from "../lib/api";
import { primaryRole, useSession } from "../lib/session";
import { currentPeriod, today } from "../lib/dates";

/**
 * Ergonomics and wellness.
 *
 * Three outcomes, not a pass and a fail. "Partially compliant" is the common
 * real result of a workstation assessment, and collapsing it into either
 * neighbour throws away the distinction the assessor actually drew.
 *
 * The indicator this feeds is not the outcome but the follow-through:
 * corrective actions closed on or before their due date, over actions due. An
 * assessment that finds a problem and raises nothing has recorded an
 * observation rather than done anything about it.
 */
const outcomeStatus: Record<string, Status> = {
  Compliant: "within",
  "Partially compliant": "approaching",
  "Non-compliant": "breach",
};



export function ErgonomicsPage() {
  const { user } = useSession();
  const readOnly = primaryRole(user) !== "hwms-officer";

  const [period, setPeriod] = useState(currentPeriod);
  const [assessments, setAssessments] = useState<ErgonomicAssessment[]>([]);
  const [options, setOptions] = useState<OccupationalOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const [assessmentBody, optionBody] = await Promise.all([
        occupationalApi.listAssessments(period),
        occupationalApi.options(),
      ]);
      setAssessments(assessmentBody.assessments);
      setOptions(optionBody);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The register could not be read. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const actions = assessments.flatMap((assessment) => assessment.actions);
  const due = actions.filter((action) => action.dueDate.startsWith(period));
  const closedOnTime = due.filter(
    (action) => action.status === "Closed" && action.closedOn && action.closedOn <= action.dueDate,
  ).length;
  const overdue = actions.filter(
    (action) => action.status !== "Closed" && action.dueDate < today(),
  ).length;

  return (
    <>
      <PageHeader
        title="Ergonomics and wellness"
        description="Workstation assessments and the corrective actions raised from them. The indicator is not the outcome but the follow-through."
        actions={
          <>
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              Month
              <input
                type="month"
                className="field w-auto py-1.5 text-sm"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              />
            </label>
            {!readOnly ? (
              <button type="button" className="button-primary" onClick={() => setAdding(true)}>
                <Icon name="add" size={18} />
                Record assessment
              </button>
            ) : null}
          </>
        }
      />

      <section className="panel mb-6">
        <div className="panel-body grid grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-xs text-ink-muted">Assessments</div>
            <div className="data-value text-xl">{assessments.length}</div>
            <p className="mt-1 text-xs text-ink-muted">Recorded for {period}.</p>
          </div>
          <div>
            <div className="text-xs text-ink-muted">Actions closed on time</div>
            <div className="data-value text-xl">
              {due.length === 0 ? (
                <span className="text-ink-faint">—</span>
              ) : (
                `${((closedOnTime / due.length) * 100).toFixed(1)}%`
              )}
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {due.length === 0
                ? "No actions fell due this month, which is not the same as none closed."
                : `${closedOnTime} of ${due.length} actions due this month.`}
            </p>
          </div>
          <div>
            <div className="text-xs text-ink-muted">Overdue and open in {period}</div>
            <div className="data-value text-xl">{overdue}</div>
            <p className="mt-1 text-xs text-ink-muted">
              {/* Says what was counted, which is the assessments loaded for the
                  selected month. It previously claimed to cover every month,
                  which the query does not do. An action raised in June and
                  overdue in August would not appear. */}
              Among the assessments recorded in {period}. An action raised in an earlier month is
              counted under that month.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <div
          className="mb-6 flex items-start gap-3 rounded border px-4 py-3 text-sm"
          style={{ borderColor: "var(--breach)", background: "var(--breach-wash)", color: "var(--breach)" }}
          role="alert"
        >
          <Icon name="error" size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {adding && options ? (
        <NewAssessmentForm
          options={options}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            void reload();
          }}
        />
      ) : null}

      {loading ? (
        <div className="py-12 text-sm text-ink-muted">Reading the register…</div>
      ) : assessments.length === 0 ? (
        <section className="panel">
          <div className="panel-body text-sm text-ink-muted">
            No assessments recorded for {period}.
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          {assessments.map((assessment) => (
            <article key={assessment.id} className="panel">
              <div className="panel-head flex-wrap">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="data-value text-lg font-medium">{assessment.assessedOn}</span>
                  <span className="font-medium">{assessment.workstation}</span>
                  <span className="text-xs text-ink-muted">
                    {assessment.workType} · {assessment.assessor}
                  </span>
                </div>
                <StatusIndicator
                  status={outcomeStatus[assessment.outcome] ?? "informational"}
                  label={assessment.outcome}
                />
              </div>
              <div className="panel-body space-y-3">
                {assessment.findings ? (
                  <p className="text-sm">{assessment.findings}</p>
                ) : (
                  <p className="text-sm text-ink-faint">No findings recorded.</p>
                )}

                {assessment.actions.length > 0 ? (
                  <div className="space-y-2 border-t border-rule pt-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Corrective actions
                    </div>
                    {assessment.actions.map((action) => (
                      <ActionRow
                        key={action.id}
                        action={action}
                        readOnly={readOnly}
                        onChanged={() => void reload()}
                      />
                    ))}
                  </div>
                ) : assessment.outcome !== "Compliant" ? (
                  // Stated rather than left as an empty space. A non-compliant
                  // assessment with nothing raised from it is an observation,
                  // and the gap should be visible to whoever reviews the month.
                  <p className="border-t border-rule pt-3 text-sm" style={{ color: "var(--caution)" }}>
                    No corrective action was raised against this outcome.
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function ActionRow({
  action,
  readOnly,
  onChanged,
}: {
  action: CorrectiveAction;
  readOnly: boolean;
  onChanged: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const [closedOn, setClosedOn] = useState(today);
  const [evidence, setEvidence] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overdue = action.status !== "Closed" && action.dueDate < today();
  const onTime = action.status === "Closed" && action.closedOn && action.closedOn <= action.dueDate;

  return (
    <div className="rounded border px-3 py-2" style={{ borderColor: "var(--rule)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{action.description}</div>
          <div className="text-xs text-ink-muted">
            {action.owner} · due <span className="data-value">{action.dueDate}</span>
            {action.closedOn ? (
              <>
                {" "}
                · closed <span className="data-value">{action.closedOn}</span>
              </>
            ) : null}
          </div>
        </div>
        <StatusIndicator
          status={
            action.status === "Closed"
              ? onTime
                ? "within"
                : "approaching"
              : overdue
                ? "breach"
                : "informational"
          }
          label={
            action.status === "Closed"
              ? onTime
                ? "Closed on time"
                : "Closed late"
              : overdue
                ? "Overdue"
                : action.status
          }
        />
      </div>

      {!readOnly && action.status !== "Closed" ? (
        closing ? (
          <form
            className="mt-3 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);
              setSaving(true);
              try {
                await occupationalApi.updateAction(action.id, {
                  status: "Closed",
                  closedOn,
                  evidence,
                });
                onChanged();
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "That could not be saved.");
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="label">Date closed</span>
                <input
                  type="date"
                  className="field"
                  value={closedOn}
                  onChange={(event) => setClosedOn(event.target.value)}
                  required
                />
              </label>
              <label>
                <span className="label">Evidence</span>
                <input
                  className="field"
                  value={evidence}
                  onChange={(event) => setEvidence(event.target.value)}
                />
              </label>
            </div>
            {closedOn > action.dueDate ? (
              <p className="text-xs" style={{ color: "var(--caution)" }}>
                This closes after the due date, so it will not count towards ergonomic risk control.
                Recorded as it happened.
              </p>
            ) : null}
            {error ? (
              <p className="text-xs" style={{ color: "var(--breach)" }} role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex items-center gap-2">
              <button type="submit" className="button-primary" disabled={saving}>
                {saving ? "Saving…" : "Close action"}
              </button>
              <button type="button" className="button-secondary" onClick={() => setClosing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="button-secondary mt-3"
            onClick={() => setClosing(true)}
          >
            Close this action
          </button>
        )
      ) : null}
    </div>
  );
}

function NewAssessmentForm({
  options,
  onCancel,
  onSaved,
}: {
  options: OccupationalOptions;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [assessedOn, setAssessedOn] = useState(today);
  const [workstation, setWorkstation] = useState("");
  const [workType, setWorkType] = useState(options.workTypes[0] ?? "Office");
  const [assessor, setAssessor] = useState("");
  const [outcome, setOutcome] = useState(options.ergonomicOutcomes[0] ?? "Compliant");
  const [findings, setFindings] = useState("");
  const [actions, setActions] = useState<{ description: string; owner: string; dueDate: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addAction = () =>
    setActions((current) => [...current, { description: "", owner: "", dueDate: "" }]);

  const setAction = (index: number, patch: Partial<(typeof actions)[number]>) =>
    setActions((current) =>
      current.map((action, i) => (i === index ? { ...action, ...patch } : action)),
    );

  return (
    <section className="panel mb-6">
      <div className="panel-head">
        <h2 className="text-lg">Record assessment</h2>
      </div>
      <form
        className="panel-body space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setSaving(true);
          try {
            await occupationalApi.createAssessment({
              assessedOn,
              workstation,
              workType,
              assessor,
              outcome,
              findings,
              actions: actions.filter((action) => action.description.trim() !== ""),
            });
            onSaved();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "That could not be saved. Try again.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="grid grid-cols-4 gap-4">
          <label>
            <span className="label">Date</span>
            <input
              type="date"
              className="field"
              value={assessedOn}
              onChange={(event) => setAssessedOn(event.target.value)}
              required
            />
          </label>
          <label>
            <span className="label">Workstation</span>
            <input
              className="field"
              value={workstation}
              onChange={(event) => setWorkstation(event.target.value)}
              required
            />
          </label>
          <label>
            <span className="label">Work type</span>
            <select
              className="field"
              value={workType}
              onChange={(event) => setWorkType(event.target.value)}
            >
              {options.workTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Assessor</span>
            <input
              className="field"
              value={assessor}
              onChange={(event) => setAssessor(event.target.value)}
              required
            />
          </label>
        </div>

        <fieldset>
          <legend className="label">Outcome</legend>
          <div className="flex gap-2">
            {options.ergonomicOutcomes.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm"
                style={{
                  borderColor: outcome === option ? "var(--focus)" : "var(--rule)",
                  background: outcome === option ? "var(--info-wash)" : "var(--surface)",
                }}
              >
                <input
                  type="radio"
                  name="outcome"
                  checked={outcome === option}
                  onChange={() => setOutcome(option)}
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          <span className="label">Findings</span>
          <textarea
            className="field min-h-[80px]"
            value={findings}
            onChange={(event) => setFindings(event.target.value)}
          />
        </label>

        <fieldset className="space-y-3">
          <legend className="label">Corrective actions</legend>
          {outcome !== "Compliant" && actions.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--caution)" }}>
              This outcome is not compliant. An assessment that finds a problem and raises nothing
              records an observation rather than doing anything about it.
            </p>
          ) : null}

          {actions.map((action, index) => (
            <div key={index} className="grid grid-cols-[2fr_1fr_1fr] gap-3">
              <input
                className="field"
                placeholder="What is to be done"
                value={action.description}
                onChange={(event) => setAction(index, { description: event.target.value })}
              />
              <input
                className="field"
                placeholder="Owner"
                value={action.owner}
                onChange={(event) => setAction(index, { owner: event.target.value })}
              />
              <input
                type="date"
                className="field"
                value={action.dueDate}
                onChange={(event) => setAction(index, { dueDate: event.target.value })}
              />
            </div>
          ))}

          <button type="button" className="button-secondary" onClick={addAction}>
            <Icon name="add" size={16} />
            Add an action
          </button>
        </fieldset>

        {error ? (
          <div
            className="flex items-start gap-3 rounded border px-4 py-3 text-sm"
            style={{ borderColor: "var(--breach)", background: "var(--breach-wash)", color: "var(--breach)" }}
            role="alert"
          >
            <Icon name="error" size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button type="submit" className="button-primary" disabled={saving}>
            {saving ? "Saving…" : "Save assessment"}
          </button>
          <button type="button" className="button-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
