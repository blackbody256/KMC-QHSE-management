import { ArrowLeft, Save, Scale, ShieldPlus } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { PageHeader } from "../components/PageHeader";
import { AppLink, useAppRouter } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";
import type {
  InvestigationStatus,
  Recordability,
  SafetyClassification,
  SafetyIncident,
  SafetySeverity,
} from "../types";

const classifications: SafetyClassification[] = [
  "Occupational accident",
  "Occupational disease",
  "Dangerous occurrence",
  "Incident / near miss",
];

const severities: SafetySeverity[] = [
  "Fatality",
  "Lost-time injury",
  "Restricted work or job transfer",
  "Medical treatment",
  "First aid only",
  "No injury",
];

export function NewSafetyIncidentPage() {
  const { state, currentUser, upsertSafetyIncident } = useDemoStore();
  const { navigate } = useAppRouter();
  const [occurredAt, setOccurredAt] = useState("2026-08-03T09:00");
  const [unit, setUnit] = useState("Vehicle Assembly");
  const [location, setLocation] = useState("");
  const [workArea, setWorkArea] = useState("");
  const [shift, setShift] = useState<SafetyIncident["shift"]>("Day");
  const [activity, setActivity] = useState("");
  const [description, setDescription] = useState("");
  const [personCategory, setPersonCategory] = useState<SafetyIncident["personCategory"]>("Employee");
  const [affectedPersonRef, setAffectedPersonRef] = useState("");
  const [workRelated, setWorkRelated] = useState<SafetyIncident["workRelated"]>("Pending");
  const [classification, setClassification] = useState<SafetyClassification>("Occupational accident");
  const [severity, setSeverity] = useState<SafetySeverity>("First aid only");
  const [potentialSeverity, setPotentialSeverity] = useState<SafetySeverity>("Medical treatment");
  const [fatalityCount, setFatalityCount] = useState("0");
  const [injuryCount, setInjuryCount] = useState("1");
  const [daysAway, setDaysAway] = useState("0");
  const [restrictedDays, setRestrictedDays] = useState("0");
  const [recordability, setRecordability] = useState<Recordability>("Pending");
  const [recordabilityBasis, setRecordabilityBasis] = useState("");
  const [investigationRequired, setInvestigationRequired] = useState(false);
  const [investigationReason, setInvestigationReason] = useState("");
  const [investigationStatus, setInvestigationStatus] = useState<InvestigationStatus>("Not started");
  const [investigationOwner, setInvestigationOwner] = useState("");
  const [treated, setTreated] = useState<"Yes" | "No">("No");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!location.trim() || !workArea.trim() || !activity.trim() || !description.trim()) {
      setError("Enter the location, work area, activity and what happened.");
      return;
    }
    if (recordability !== "Pending" && !recordabilityBasis.trim()) {
      setError("State the basis for a final recordability determination.");
      return;
    }
    if (investigationRequired && !investigationReason.trim()) {
      setError("State why a formal investigation is required.");
      return;
    }
    if (severity === "No injury" && (Number(fatalityCount) > 0 || Number(injuryCount) > 0)) {
      setError("A No injury event cannot contain fatality or non-fatal injury counts.");
      return;
    }
    if (severity === "Fatality" && Number(fatalityCount) < 1) {
      setError("Fatality severity requires at least one affected person in the fatality count.");
      return;
    }
    const nextNumber = String(state.safetyIncidents.length + 1).padStart(3, "0");
    const now = new Date().toISOString();
    const incident: SafetyIncident = {
      id: crypto.randomUUID(),
      caseNumber: `SAFE-2026-${nextNumber}`,
      state: "submitted",
      period: occurredAt.slice(0, 7),
      occurredAt: new Date(occurredAt).toISOString(),
      reportedAt: now,
      unit,
      location: location.trim(),
      workArea: workArea.trim(),
      shift,
      activity: activity.trim(),
      description: description.trim(),
      personCategory,
      affectedPersonRef: affectedPersonRef.trim() || undefined,
      workRelated,
      classification,
      severity,
      potentialSeverity,
      fatalityCount: Number(fatalityCount),
      nonFatalInjuryCount: Number(injuryCount),
      daysAway: Number(daysAway),
      restrictedDays: Number(restrictedDays),
      recordability,
      recordabilityBasis: recordabilityBasis.trim(),
      determinedBy: recordability === "Pending" ? undefined : currentUser?.name,
      determinedAt: recordability === "Pending" ? undefined : now,
      investigationRequired,
      investigationRequiredReason: investigationRequired
        ? investigationReason.trim()
        : "Formal investigation not required by the recording officer.",
      investigationStatus: investigationRequired ? investigationStatus : "Not started",
      investigationOwner: investigationRequired ? investigationOwner.trim() || currentUser?.name : undefined,
      correctiveActions: [],
      clinicalEncounterIdRef: treated === "Yes" ? "synthetic-clinical-reference" : undefined,
      createdBy: currentUser?.name ?? "Health and Wellness Officer",
      createdAt: now,
    };
    upsertSafetyIncident(incident);
    navigate(`/workplace-safety?period=${incident.period}`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Workplace Safety · quick entry"
        title="Record an incident"
        description="Categorical facts use visible choices. A pending decision is allowed, but it prevents period attestation."
        action={
          <AppLink to="/workplace-safety" className="button button-secondary">
            <ArrowLeft size={17} aria-hidden="true" /> Back to safety
          </AppLink>
        }
      />

      <section className="decision-callout">
        <Scale size={20} aria-hidden="true" />
        <div>
          <strong>The system does not decide recordability</strong>
          <span>Record the officer’s determination and basis. A future KMC rule may pre-fill it but remains overridable and attributed.</span>
        </div>
      </section>

      <form className="panel form-panel safety-form" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}

        <FormSection number="A" title="Event" description="When, where and what happened.">
          <div className="form-grid two">
            <label className="field">
              <span>Occurred at</span>
              <input type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} required />
            </label>
            <label className="field">
              <span>QHSE unit / operational unit</span>
              <input value={unit} onChange={(event) => setUnit(event.target.value)} required />
            </label>
            <label className="field">
              <span>Location</span>
              <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Building or broad location" required />
            </label>
            <label className="field">
              <span>Work area</span>
              <input value={workArea} onChange={(event) => setWorkArea(event.target.value)} placeholder="Area or workstation" required />
            </label>
          </div>
          <ChoiceGroup label="Shift" values={["Day", "Night", "Not applicable"]} selected={shift} onChange={(value) => setShift(value as SafetyIncident["shift"])} />
          <label className="field">
            <span>Activity before the event</span>
            <input value={activity} onChange={(event) => setActivity(event.target.value)} required />
          </label>
          <label className="field">
            <span>What happened</span>
            <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} required />
          </label>
        </FormSection>

        <FormSection number="B" title="Classification and affected people" description="Record facts separately from recordability.">
          <ChoiceGroup label="Work-related status" values={["Yes", "No", "Pending"]} selected={workRelated} onChange={(value) => setWorkRelated(value as SafetyIncident["workRelated"])} />
          <ChoiceGroup label="Event classification" values={classifications} selected={classification} onChange={(value) => setClassification(value as SafetyClassification)} />
          <ChoiceGroup label="Highest actual severity" values={severities} selected={severity} onChange={(value) => setSeverity(value as SafetySeverity)} />
          <ChoiceGroup label="Potential severity" values={severities} selected={potentialSeverity} onChange={(value) => setPotentialSeverity(value as SafetySeverity)} />
          <ChoiceGroup label="Person category" values={["Employee", "Contractor", "Intern", "Visitor", "None"]} selected={personCategory} onChange={(value) => setPersonCategory(value as SafetyIncident["personCategory"])} />
          <div className="form-grid two">
            <label className="field">
              <span>Fatalities · people</span>
              <input type="number" min="0" value={fatalityCount} onChange={(event) => setFatalityCount(event.target.value)} />
            </label>
            <label className="field">
              <span>Non-fatal injuries · people</span>
              <input type="number" min="0" value={injuryCount} onChange={(event) => setInjuryCount(event.target.value)} />
            </label>
            <label className="field">
              <span>Days away</span>
              <input type="number" min="0" value={daysAway} onChange={(event) => setDaysAway(event.target.value)} />
            </label>
            <label className="field">
              <span>Restricted-work days</span>
              <input type="number" min="0" value={restrictedDays} onChange={(event) => setRestrictedDays(event.target.value)} />
            </label>
          </div>
          {personCategory !== "None" && (
            <label className="field">
              <span>Affected-person reference · Officer only, optional</span>
              <input value={affectedPersonRef} onChange={(event) => setAffectedPersonRef(event.target.value)} placeholder="Do not enter clinical narrative" />
            </label>
          )}
          <ChoiceGroup label="Treated by Health and Wellness" values={["Yes", "No"]} selected={treated} onChange={(value) => setTreated(value as "Yes" | "No")} />
        </FormSection>

        <FormSection number="C" title="Recordability and investigation" description="These are explicit officer decisions with stated reasons.">
          <ChoiceGroup label="Recordability determination" values={["Pending", "Recordable", "Not recordable"]} selected={recordability} onChange={(value) => setRecordability(value as Recordability)} />
          {recordability !== "Pending" && (
            <label className="field">
              <span>Determination basis</span>
              <textarea rows={2} value={recordabilityBasis} onChange={(event) => setRecordabilityBasis(event.target.value)} required />
            </label>
          )}
          <ChoiceGroup label="Formal investigation required" values={["Yes", "No"]} selected={investigationRequired ? "Yes" : "No"} onChange={(value) => setInvestigationRequired(value === "Yes")} />
          {investigationRequired && (
            <>
              <label className="field">
                <span>Why is investigation required?</span>
                <textarea rows={2} value={investigationReason} onChange={(event) => setInvestigationReason(event.target.value)} required />
              </label>
              <ChoiceGroup label="Investigation status" values={["Not started", "In progress", "Completed"]} selected={investigationStatus} onChange={(value) => setInvestigationStatus(value as InvestigationStatus)} />
              <label className="field">
                <span>Investigation owner · optional</span>
                <input value={investigationOwner} onChange={(event) => setInvestigationOwner(event.target.value)} placeholder="Defaults to recording officer" />
              </label>
            </>
          )}
        </FormSection>

        <div className="form-footer">
          <span><ShieldPlus size={16} aria-hidden="true" /> Safety and clinical records remain separate.</span>
          <button className="button button-primary" type="submit">
            <Save size={17} aria-hidden="true" /> Save submitted incident
          </button>
        </div>
      </form>
    </div>
  );
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: ReactNode }) {
  return (
    <section className="form-section">
      <div className="form-section-heading">
        <div>
          <span className="section-number">{number}</span>
          <div><h2>{title}</h2><p>{description}</p></div>
        </div>
      </div>
      {children}
    </section>
  );
}

function ChoiceGroup({ label, values, selected, onChange }: { label: string; values: readonly string[]; selected: string; onChange: (value: string) => void }) {
  return (
    <fieldset className="choice-fieldset">
      <legend>{label}</legend>
      <div className="radio-card-grid compact-choice-grid">
        {values.map((value) => (
          <label className="radio-card" key={value}>
            <input type="radio" name={label} value={value} checked={selected === value} onChange={() => onChange(value)} />
            <span>{value}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
