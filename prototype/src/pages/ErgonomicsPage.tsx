import { Armchair, CalendarClock, Plus, Save } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { useDemoStore } from "../store/DemoStore";
import type {
  CorrectiveAction,
  ErgonomicAssessment,
  ErgonomicOutcome,
} from "../types";

const outcomeStatus: Record<ErgonomicOutcome, "within" | "approaching" | "outside"> = {
  Compliant: "within",
  "Partially compliant": "approaching",
  "Non-compliant": "outside",
};

export function ErgonomicsPage() {
  const { state, addErgonomicAssessment } = useDemoStore();
  const isOfficer = state.role === "health-wellness-officer";
  const [workstation, setWorkstation] = useState("Office workstation B4");
  const [workType, setWorkType] = useState<"Office" | "Industrial">("Office");
  const [outcome, setOutcome] = useState<ErgonomicOutcome>("Compliant");
  const [assessedAt, setAssessedAt] = useState("2026-07-30T11:00");
  const [findings, setFindings] = useState("");
  const [hasAction, setHasAction] = useState(false);
  const [actionDescription, setActionDescription] = useState("");
  const [owner, setOwner] = useState("Facilities");
  const [dueDate, setDueDate] = useState("2026-08-14");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const recent = useMemo(
    () =>
      [...state.ergonomicAssessments]
        .sort((a, b) => b.assessedAt.localeCompare(a.assessedAt))
        .slice(0, 12),
    [state.ergonomicAssessments],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!findings.trim()) {
      setError("Record the findings that support the selected outcome.");
      return;
    }
    if (hasAction && (!actionDescription.trim() || !owner.trim() || !dueDate)) {
      setError("Complete the proposed corrective action, owner, and due date.");
      return;
    }
    const action: CorrectiveAction | undefined = hasAction
      ? {
          id: crypto.randomUUID(),
          description: actionDescription.trim(),
          owner: owner.trim(),
          dueDate,
          status: "Open",
        }
      : undefined;
    const assessment: ErgonomicAssessment = {
      id: crypto.randomUUID(),
      period: assessedAt.slice(0, 7),
      assessedAt,
      workstation,
      workType,
      assessor: "Health and Wellness Officer · preview",
      outcome,
      findings: findings.trim(),
      action,
    };
    addErgonomicAssessment(assessment);
    setMessage(`${workstation} assessment saved as ${outcome.toLowerCase()}.`);
    setFindings("");
    setActionDescription("");
    setHasAction(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Health and Wellness · Ergonomics and Wellness"
        title="Ergonomic assessments"
        description="Capture confirmed outcome states now; defer detailed criteria until the Division standardises its tool."
        action={isOfficer ? (
          <button className="button button-primary" type="button" onClick={() => document.getElementById("new-assessment")?.scrollIntoView()}>
            <Plus size={17} aria-hidden="true" />
            New assessment
          </button>
        ) : undefined}
      />
      <section className="provenance-callout">
        <Armchair size={21} aria-hidden="true" />
        <div>
          <strong>Outcome-level prototype</strong>
          <span>
            Compliant, partially compliant, and non-compliant are interview-confirmed. Corrective
            action ownership and approval are still proposed.
          </span>
        </div>
      </section>

      {isOfficer && <div className="entry-layout" id="new-assessment">
        <form className="panel form-panel" onSubmit={submit}>
          <div className="form-section-heading">
            <div>
              <span className="section-number">E</span>
              <div>
                <h2>Assess workstation</h2>
                <p>Assessment criteria are deliberately not invented in this prototype.</p>
              </div>
            </div>
          </div>
          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}
          <div className="form-grid two">
            <label className="field">
              <span>Workstation</span>
              <input
                value={workstation}
                onChange={(event) => setWorkstation(event.target.value)}
              />
            </label>
            <fieldset className="choice-fieldset field-span-2">
              <legend>Assessment type</legend>
              <div className="radio-card-grid compact-choice-grid">
                {(["Office", "Industrial"] as const).map((item) => (
                  <label className="radio-card" key={item}>
                    <input type="radio" name="work-type" checked={workType === item} onChange={() => setWorkType(item)} />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="field">
              <span>Date and time</span>
              <input
                type="datetime-local"
                value={assessedAt}
                onChange={(event) => setAssessedAt(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Assessor</span>
              <input value="Health and Wellness Officer · preview" readOnly className="derived-input" />
            </label>
          </div>

          <fieldset className="outcome-fieldset">
            <legend>Overall outcome</legend>
            <div className="outcome-options">
              {(["Compliant", "Partially compliant", "Non-compliant"] as ErgonomicOutcome[]).map(
                (item) => (
                  <label
                    className={`outcome-option outcome-${outcomeStatus[item]}${
                      outcome === item ? " selected" : ""
                    }`}
                    key={item}
                  >
                    <input
                      type="radio"
                      name="outcome"
                      value={item}
                      checked={outcome === item}
                      onChange={() => setOutcome(item)}
                    />
                    <StatusPill status={outcomeStatus[item]} compact label={item} />
                  </label>
                ),
              )}
            </div>
          </fieldset>

          <label className="field">
            <span>Findings</span>
            <textarea
              rows={4}
              value={findings}
              onChange={(event) => setFindings(event.target.value)}
              placeholder="Describe the observed workstation arrangement and task…"
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={hasAction}
              onChange={(event) => setHasAction(event.target.checked)}
            />
            <span>
              <strong>Add a proposed corrective action</strong>
              <small>Workflow and approval still require stakeholder confirmation.</small>
            </span>
          </label>
          {hasAction && (
            <div className="proposed-action">
              <label className="field field-span-2">
                <span>Action description</span>
                <input
                  value={actionDescription}
                  onChange={(event) => setActionDescription(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Proposed owner</span>
                <input value={owner} onChange={(event) => setOwner(event.target.value)} />
              </label>
              <label className="field">
                <span>Due date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </label>
            </div>
          )}

          <div className="form-footer">
            <span>The outcome updates the dashboard distribution immediately.</span>
            <button className="button button-primary" type="submit">
              <Save size={17} aria-hidden="true" />
              Save assessment
            </button>
          </div>
        </form>
        <aside className="side-guidance">
          <CalendarClock size={22} aria-hidden="true" />
          <h2>Next design decision</h2>
          <p>
            OH4 cannot become an approved KPI until action status, evidence, due dates, and closure
            authority are defined.
          </p>
        </aside>
      </div>}

      <section className="panel section-spacing">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">Synthetic assessment register</div>
            <h2>Recent workstation outcomes</h2>
          </div>
          <span className="section-meta">{state.ergonomicAssessments.length} total</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Workstation</th>
                <th>Assessment</th>
                <th>Outcome</th>
                <th>Findings</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((assessment) => (
                <tr key={assessment.id}>
                  <td>
                    <strong className="table-primary">{assessment.workstation}</strong>
                    <span className="table-secondary">{assessment.workType}</span>
                  </td>
                  <td>
                    <strong className="table-primary">
                      {formatDate(assessment.assessedAt.slice(0, 10))}
                    </strong>
                    <span className="table-secondary">{assessment.assessor}</span>
                  </td>
                  <td>
                    <StatusPill
                      status={outcomeStatus[assessment.outcome]}
                      compact
                      label={assessment.outcome}
                    />
                  </td>
                  <td className="findings-cell">{assessment.findings}</td>
                  <td>
                    {assessment.action ? (
                      <>
                        <strong className="table-primary">{assessment.action.status}</strong>
                        <span className="table-secondary">
                          Due {formatDate(assessment.action.dueDate)}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
