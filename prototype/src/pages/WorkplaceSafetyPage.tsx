import { CalendarDays, CheckCircle2, LockKeyhole, Plus, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { ResearchCards, type ResearchCardItem } from "../components/ResearchCards";
import { StatusPill } from "../components/StatusPill";
import {
  MINIMUM_DISCLOSURE_CELL,
  buildSafetyDashboardSnapshot,
  canAttestSafetyPeriod,
  disclosureCount,
  managerSafetyBreakdown,
  treatedByHealthAndWellness,
} from "../lib/calculations";
import { AppLink, useAppRouter } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";

const futureSafetyItems: ResearchCardItem[] = [
  {
    title: "Hazards and risk assessment",
    records: "Candidate hazard, risk, control, owner and review-date register.",
    question: "Which risk method and approval chain does KMC already use?",
    owner: "Workplace Safety",
  },
  {
    title: "Inspections and corrective actions",
    records: "Candidate inspection schedule, findings, action owner, evidence and closure workflow.",
    question: "Which inspections are mandatory and who approves closure?",
    owner: "Workplace Safety",
  },
  {
    title: "PPE, permits and contractor controls",
    records: "Candidate PPE issue/observation, permit-to-work and contractor induction records.",
    question: "Which high-risk tasks and contractor controls belong in the first release?",
    owner: "Workplace Safety",
  },
  {
    title: "Emergency readiness and training",
    records: "Candidate drills, equipment checks, toolbox talks and competence records.",
    question: "Which schedules and evidence are currently maintained?",
    owner: "Workplace Safety",
  },
];

export function WorkplaceSafetyPage() {
  const { state, attestSafetyPeriod } = useDemoStore();
  const { search } = useAppRouter();
  const isOfficer = state.role === "health-wellness-officer";
  const periods = useMemo(
    () =>
      [
        ...new Set([
          ...state.safetyAttestations.map((item) => item.period),
          ...state.safetyIncidents.map((item) => item.period),
        ]),
      ].sort((a, b) => b.localeCompare(a)),
    [state.safetyAttestations, state.safetyIncidents],
  );
  const requestedPeriod = new URLSearchParams(search).get("period");
  const [period, setPeriod] = useState(
    requestedPeriod && periods.includes(requestedPeriod)
      ? requestedPeriod
      : periods.includes("2026-07")
        ? "2026-07"
        : periods[0],
  );
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const snapshot = useMemo(
    () => buildSafetyDashboardSnapshot(state, period),
    [state, period],
  );
  const attestation = state.safetyAttestations.find((entry) => entry.period === period);
  const attestationCheck = canAttestSafetyPeriod(state, period);
  const breakdown = managerSafetyBreakdown(snapshot.incidents);
  const visibleUnitRows = breakdown.filter((row) => row.events >= MINIMUM_DISCLOSURE_CELL);
  const suppressedUnitRows = breakdown.filter((row) => row.events < MINIMUM_DISCLOSURE_CELL);

  const submitAttestation = () => {
    const error = attestSafetyPeriod(period, note);
    setMessage(error ?? `${formatPeriod(period)} is now attested. Empty registers may report a final zero.`);
    if (!error) setNote("");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Workplace Safety"
        title="Incident register and investigations"
        description="Record events once, make recordability explicit, and derive safety indicators from the register."
        action={
          <div className="page-actions">
            <label className="period-control">
              <CalendarDays size={17} aria-hidden="true" />
              <span className="sr-only">Reporting period</span>
              <select value={period} onChange={(event) => setPeriod(event.target.value)}>
                {periods.map((item) => (
                  <option value={item} key={item}>{formatPeriod(item)}</option>
                ))}
              </select>
            </label>
            {isOfficer && (
              <AppLink to="/workplace-safety/incidents/new" className="button button-primary">
                <Plus size={17} aria-hidden="true" />
                Record incident
              </AppLink>
            )}
          </div>
        }
      />

      <section className="metric-grid safety-metric-grid compact-metrics" aria-label="Safety metrics">
        {snapshot.metrics.map((item) => <MetricCard key={item.id} metric={item} />)}
      </section>

      {isOfficer ? (
        <>
          <section className="panel attestation-panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">Period completeness</div>
                <h2>Safety register attestation</h2>
              </div>
              <StatusPill
                status={attestation?.state === "attested" ? "within" : "provisional"}
                label={attestation?.state === "attested" ? "Attested" : "Open"}
              />
            </div>
            {attestation?.state === "attested" ? (
              <div className="attestation-result">
                <CheckCircle2 size={20} aria-hidden="true" />
                <div>
                  <strong>{attestation.attestedBy}</strong>
                  <span>{attestation.attestedAt ? formatDateTime(attestation.attestedAt) : ""} · {attestation.note}</span>
                </div>
              </div>
            ) : (
              <div className="attestation-form">
                <div>
                  <strong>{attestationCheck.allowed ? "Ready to attest" : "Cannot attest yet"}</strong>
                  <span>{attestationCheck.reason}</span>
                </div>
                <label className="field">
                  <span>Attestation note</span>
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="All known events for the period have been entered."
                  />
                </label>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={submitAttestation}
                  disabled={!attestationCheck.allowed}
                >
                  Attest period
                </button>
              </div>
            )}
            {message && <div className={message.startsWith("Cannot") || message.includes("pending") ? "form-error" : "form-success"}>{message}</div>}
          </section>

          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">Officer-only event view</div>
                <h2>Submitted incidents</h2>
              </div>
              <span className="section-meta">{snapshot.incidents.length} synthetic events</span>
            </div>
            <div className="clinical-boundary-note">
              <LockKeyhole size={18} aria-hidden="true" />
              <span>
                A safety record receives only “Treated by Health and Wellness: Yes/No.” The linked
                clinical encounter is never opened from this module.
              </span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Case</th>
                    <th>Occurred</th>
                    <th>Location / activity</th>
                    <th>Classification / severity</th>
                    <th>Recordability</th>
                    <th>Investigation</th>
                    <th>Health and Wellness</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.incidents.map((incident) => (
                    <tr key={incident.id}>
                      <td><strong className="table-primary">{incident.caseNumber}</strong></td>
                      <td>{formatShortDate(incident.occurredAt)}</td>
                      <td>
                        <strong className="table-primary">{incident.location}</strong>
                        <span className="table-secondary">{incident.shift} · {incident.activity}</span>
                      </td>
                      <td>
                        <strong className="table-primary">{incident.classification}</strong>
                        <span className="table-secondary">{incident.severity}</span>
                      </td>
                      <td>
                        <StatusPill
                          status={incident.recordability === "Pending" ? "provisional" : "informational"}
                          compact
                          label={incident.recordability}
                        />
                      </td>
                      <td>{incident.investigationRequired ? incident.investigationStatus : "Not required"}</td>
                      <td>{treatedByHealthAndWellness(incident) ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="panel table-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Manager aggregate drilldown</div>
              <h2>Unit-level safety position</h2>
            </div>
            <span className="provenance">Minimum cell size {MINIMUM_DISCLOSURE_CELL}</span>
          </div>
          <div className="privacy-callout">
            <ShieldAlert size={19} aria-hidden="true" />
            <span>
              Names alone are not the privacy risk. Exact date, shift and location can identify a
              person in a small group, so this view contains no event rows and withholds small units.
            </span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Events</th>
                  <th>People injured</th>
                  <th>Investigations</th>
                </tr>
              </thead>
              <tbody>
                {visibleUnitRows.map((row) => (
                  <tr key={row.unit}>
                    <td>{row.unit}</td>
                    <td>{row.events}</td>
                    <td>{disclosureCount(row.injuries)}</td>
                    <td>{disclosureCount(row.investigationsCompleted)} / {disclosureCount(row.investigationsRequired)}</td>
                  </tr>
                ))}
                {suppressedUnitRows.length > 0 && (
                  <tr>
                    <td><strong>Small-unit groups withheld</strong></td>
                    <td>{suppressedUnitRows.length} unit groups</td>
                    <td>&lt;{MINIMUM_DISCLOSURE_CELL} per group</td>
                    <td>Suppressed</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <ResearchCards
        heading="Future Workplace Safety functions"
        description="The incident register is active in this prototype. These adjacent functions are research prompts only."
        items={futureSafetyItems}
      />
    </div>
  );
}

const formatPeriod = (period: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(`${period}-01T00:00:00`));

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
