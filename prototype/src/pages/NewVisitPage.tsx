import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  LockKeyhole,
  Save,
  History,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { SectionStatusLabel } from "../components/StatusPill";
import { AppLink, useAppRouter } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";
import type {
  PatientVisit,
  SectionStatus,
  VisitSection,
  VisitType,
  VitalSigns,
} from "../types";

const sections = [
  ["complaint", "Presenting complaint"],
  ["history", "History of present illness"],
  ["medical", "Past medical history"],
  ["surgical", "Past surgical history"],
  ["medication", "Medication history"],
  ["occupational", "Occupational health history"],
  ["vitals", "Vital signs"],
  ["examination", "General and systemic examination"],
  ["investigations", "Investigations"],
  ["impression", "Impression"],
  ["treatment", "Treatment"],
] as const;

const quickOptions: Record<string, string[]> = {
  complaint: [
    "Headache",
    "Nasal congestion",
    "Cough",
    "Fever",
    "Abdominal pain",
    "Musculoskeletal pain",
    "Minor injury",
  ],
  history: [
    "Started today",
    "Started 1–3 days ago",
    "Sudden onset",
    "Gradual onset",
    "Improving",
    "Worsening",
  ],
  medical: [
    "No known chronic condition",
    "Hypertension",
    "Diabetes",
    "Asthma",
    "Known allergy",
  ],
  surgical: ["No previous surgery or fracture", "Previous surgery", "Previous fracture"],
  medication: ["No current medication", "Regular medication", "Medication taken today"],
  occupational: [
    "No relevant occupational exposure",
    "PPE worn as required",
    "PPE concern",
    "Possible work exposure",
    "Previous work-related injury",
  ],
  examination: [
    "General examination normal",
    "ENT findings",
    "Respiratory findings",
    "Musculoskeletal findings",
    "Skin findings",
  ],
  investigations: [
    "No test required",
    "Rapid test",
    "Laboratory test",
    "Imaging",
    "Other investigation",
  ],
  impression: [
    "Upper respiratory symptoms",
    "Musculoskeletal complaint",
    "Minor injury",
    "Gastrointestinal complaint",
  ],
  treatment: [
    "Medication given",
    "First aid provided",
    "Rest advised",
    "Medical leave recommended",
    "Referred",
    "Follow-up planned",
  ],
};

const createSections = () =>
  Object.fromEntries(
    sections.map(([key]) => [key, { status: "not-recorded", notes: "", selections: [] }]),
  ) as Record<string, VisitSection>;

export function NewVisitPage() {
  const { state, upsertVisit } = useDemoStore();
  const { search } = useAppRouter();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const initialPatient =
    state.patients.find((patient) => patient.id === params.get("patient"))?.id ??
    state.patients[0]?.id ??
    "";
  const [patientId, setPatientId] = useState(initialPatient);
  const [visitDate, setVisitDate] = useState("2026-07-30");
  const [timeIn, setTimeIn] = useState("09:30");
  const [visitType, setVisitType] = useState<VisitType>("Walk-in");
  const [workRelated, setWorkRelated] = useState<PatientVisit["workRelated"]>("Unsure");
  const [sectionValues, setSectionValues] = useState(createSections);
  const [vitals, setVitals] = useState<VitalSigns>({});
  const [openSection, setOpenSection] = useState("complaint");
  const [error, setError] = useState("");
  const [savedVisit, setSavedVisit] = useState<PatientVisit | null>(null);

  const patient = state.patients.find((item) => item.id === patientId);
  const pastVisits = useMemo(
    () =>
      state.visits
        .filter((visit) => visit.patientId === patientId)
        .sort((a, b) => `${b.visitDate}${b.timeIn}`.localeCompare(`${a.visitDate}${a.timeIn}`)),
    [patientId, state.visits],
  );
  const resolved = useMemo(
    () =>
      Object.values(sectionValues).filter(
        (section) => section.status === "complete" || section.status === "not-indicated",
      ).length,
    [sectionValues],
  );
  const bmi =
    vitals.weightKg && vitals.heightCm
      ? vitals.weightKg / Math.pow(vitals.heightCm / 100, 2)
      : null;

  const updateSection = (
    key: string,
    change: Partial<VisitSection>,
  ) => {
    if (savedVisit?.state === "signed") return;
    setSectionValues((current) => ({
      ...current,
      [key]: { ...current[key], ...change },
    }));
  };

  const updateNotes = (key: string, notes: string) => {
    const status =
      notes.trim() && sectionValues[key].status === "not-recorded"
        ? "partial"
        : sectionValues[key].status;
    updateSection(key, { notes, status });
  };

  const toggleSelection = (key: string, option: string) => {
    const selected = sectionValues[key].selections ?? [];
    const selections = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    const hasContent = selections.length > 0 || sectionValues[key].notes.trim();
    const currentStatus = sectionValues[key].status;
    updateSection(key, {
      selections,
      status:
        hasContent && currentStatus === "not-recorded"
          ? "partial"
          : !hasContent && currentStatus === "partial"
            ? "not-recorded"
            : currentStatus,
    });
  };

  const hasSectionContent = (key: string) =>
    sectionValues[key].notes.trim() || (sectionValues[key].selections?.length ?? 0) > 0;

  const save = (stateValue: "draft" | "signed") => {
    setError("");
    if (!patientId) {
      setError("Select a patient before saving this visit.");
      return;
    }
    if (
      stateValue === "signed" &&
      (!hasSectionContent("complaint") ||
        !hasSectionContent("impression") ||
        !hasSectionContent("treatment"))
    ) {
      setError(
        "Before signing, record the presenting complaint, impression, and treatment. Other sections may remain not recorded.",
      );
      return;
    }
    const visit: PatientVisit = {
      id: savedVisit?.id ?? crypto.randomUUID(),
      patientId,
      visitDate,
      timeIn,
      visitType,
      state: stateValue,
      workRelated,
      sections: sectionValues,
      vitals,
      clinician: "Miriam K. · Health and Wellness Officer",
      signedAt: stateValue === "signed" ? new Date().toISOString() : undefined,
      createdAt: savedVisit?.createdAt ?? new Date().toISOString(),
    };
    upsertVisit(visit);
    setSavedVisit(visit);
  };

  const locked = savedVisit?.state === "signed";

  return (
    <div>
      <PageHeader
        eyebrow="Health and Wellness Officer area"
        title={locked ? "Patient visit signed" : "Record patient visit"}
        description="Complete only the sections that are clinically relevant for this visit."
        action={
          <AppLink className="button button-secondary" to="/patient-visits">
            View visit register
          </AppLink>
        }
      />

      {locked && (
        <section className="success-banner">
          <LockKeyhole size={20} aria-hidden="true" />
          <div>
            <strong>Signed by Miriam K. · Health and Wellness Officer</strong>
            <span>
              This demonstration record is locked. “Add amendment” is intentionally deferred.
            </span>
          </div>
          <button className="button button-disabled" type="button" disabled>
            Add amendment · future
          </button>
        </section>
      )}

      <div className="visit-layout">
        <section className="panel visit-form-panel">
          <div className="visit-summary">
            <div className="patient-picker">
              <span className="avatar large">
                <UserRound size={22} aria-hidden="true" />
              </span>
              <label>
                <span>Patient</span>
                <select
                  value={patientId}
                  onChange={(event) => setPatientId(event.target.value)}
                  disabled={locked}
                >
                  {state.patients.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.fullName} · {item.category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="visit-completeness">
              <span>Sections resolved</span>
              <strong>
                {resolved}/{sections.length}
              </strong>
              <div className="mini-progress">
                <span style={{ width: `${(resolved / sections.length) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="form-grid two visit-meta">
            <label className="field">
              <span>Date of visit</span>
              <input
                type="date"
                value={visitDate}
                onChange={(event) => setVisitDate(event.target.value)}
                disabled={locked}
              />
            </label>
            <label className="field">
              <span>Time in</span>
              <input
                type="time"
                value={timeIn}
                onChange={(event) => setTimeIn(event.target.value)}
                disabled={locked}
              />
            </label>
            <fieldset className="quick-fieldset field-span-2">
              <legend>Visit type</legend>
              <div className="choice-row">
                {(
                  ["Walk-in", "Referred by supervisor", "Emergency", "Follow-up"] as VisitType[]
                ).map((value) => (
                  <label
                    className={`choice-pill${visitType === value ? " selected" : ""}`}
                    key={value}
                  >
                    <input
                      type="radio"
                      name="visit-type"
                      checked={visitType === value}
                      onChange={() => setVisitType(value)}
                      disabled={locked}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="quick-fieldset field-span-2">
              <legend>Is this visit work-related?</legend>
              <div className="choice-row">
                {(["No", "Yes", "Unsure"] as PatientVisit["workRelated"][]).map((value) => (
                  <label
                    className={`choice-pill${workRelated === value ? " selected" : ""}`}
                    key={value}
                  >
                    <input
                      type="radio"
                      name="work-related"
                      checked={workRelated === value}
                      onChange={() => setWorkRelated(value)}
                      disabled={locked}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {error && (
            <div className="form-error">
              <AlertCircle size={18} aria-hidden="true" />
              {error}
            </div>
          )}

          <div className="section-accordion">
            {sections.map(([key, label], index) => {
              const isOpen = openSection === key;
              const item = sectionValues[key];
              return (
                <article className={`visit-section${isOpen ? " open" : ""}`} key={key}>
                  <button
                    className="visit-section-trigger"
                    type="button"
                    onClick={() => setOpenSection(isOpen ? "" : key)}
                    aria-expanded={isOpen}
                  >
                    <span className="section-index">{index + 1}</span>
                    {isOpen ? (
                      <ChevronDown size={17} aria-hidden="true" />
                    ) : (
                      <ChevronRight size={17} aria-hidden="true" />
                    )}
                    <strong>{label}</strong>
                    <SectionStatusLabel status={item.status} />
                  </button>
                  {isOpen && (
                    <div className="visit-section-content">
                      {key === "vitals" ? (
                        <VitalsFields
                          value={vitals}
                          bmi={bmi}
                          disabled={locked}
                          onChange={setVitals}
                        />
                      ) : (
                        <>
                          <fieldset className="quick-fieldset clinical-quick-fieldset">
                            <legend>{quickOptionsLabel(key)}</legend>
                            <div className="check-choice-grid">
                              {(quickOptions[key] ?? []).map((option) => (
                                <label
                                  className={`check-choice${
                                    item.selections?.includes(option) ? " selected" : ""
                                  }`}
                                  key={option}
                                >
                                  <input
                                    type="checkbox"
                                    checked={item.selections?.includes(option) ?? false}
                                    onChange={() => toggleSelection(key, option)}
                                    disabled={locked || item.status === "not-indicated"}
                                  />
                                  <span>{option}</span>
                                </label>
                              ))}
                            </div>
                          </fieldset>
                          <label className="field additional-notes">
                            <span>{sectionPrompt(key)}</span>
                            <textarea
                              rows={key === "complaint" || key === "treatment" ? 4 : 3}
                              value={item.notes}
                              onChange={(event) => updateNotes(key, event.target.value)}
                              disabled={locked || item.status === "not-indicated"}
                              placeholder={sectionPlaceholder(key)}
                            />
                          </label>
                        </>
                      )}
                      <div className="section-controls">
                        <fieldset className="quick-fieldset status-fieldset">
                          <legend>Section state</legend>
                          <div className="choice-row">
                            {(
                              [
                                ["not-recorded", "Not recorded"],
                                ["partial", "Partial"],
                                ["complete", "Complete"],
                                ["not-indicated", "Not clinically indicated"],
                              ] as Array<[SectionStatus, string]>
                            ).map(([value, label]) => (
                              <label
                                className={`choice-pill${item.status === value ? " selected" : ""}`}
                                key={value}
                              >
                                <input
                                  type="radio"
                                  name={`section-state-${key}`}
                                  checked={item.status === value}
                                  onChange={() => updateSection(key, { status: value })}
                                  disabled={locked}
                                />
                                <span>{label}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                        {item.status === "not-indicated" && !item.notes && (
                          <span className="section-hint">
                            The section state records that omission was deliberate.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {!locked && (
            <div className="form-footer sticky-footer">
              <span>
                {patient
                  ? `Recording for ${patient.fullName} · synthetic data`
                  : "Select a patient"}
              </span>
              <div className="button-group">
                <button className="button button-secondary" type="button" onClick={() => save("draft")}>
                  <Save size={17} aria-hidden="true" />
                  Save draft
                </button>
                <button className="button button-primary" type="button" onClick={() => save("signed")}>
                  <FileCheck2 size={17} aria-hidden="true" />
                  Sign visit
                </button>
              </div>
            </div>
          )}
        </section>
        <aside className="side-guidance visit-guide">
          <div className="past-visit-guide">
            <div className="past-visit-heading">
              <History size={18} aria-hidden="true" />
              <div>
                <h2>Past visits</h2>
                <span>{patient?.fullName ?? "Selected patient"}</span>
              </div>
            </div>
            {pastVisits.length ? (
              <div className="past-visit-links">
                {pastVisits.slice(0, 3).map((visit) => (
                  <AppLink key={visit.id} to={`/patient-visits/details?visit=${visit.id}`}>
                    <strong>{formatVisitDate(visit.visitDate)}</strong>
                    <span>{visit.visitType} · {visit.state === "signed" ? "Signed" : "Draft"}</span>
                  </AppLink>
                ))}
                <AppLink className="all-history-link" to={`/patient-visits?patient=${patientId}`}>
                  View complete history
                </AppLink>
              </div>
            ) : (
              <p>No previous visits recorded for this patient.</p>
            )}
          </div>
          <div className="guide-divider" />
          <h2>Fast path</h2>
          <ol>
            <li>Confirm the patient and visit type.</li>
            <li>Record the presenting complaint.</li>
            <li>Record impression and treatment.</li>
            <li>Sign when the clinical record is complete.</li>
          </ol>
          <div className="guide-divider" />
          <strong>Optional means clinically guided</strong>
          <p>
            Vital signs, PPE compliance, examination, and investigations do not block a minor
            visit when they were not indicated.
          </p>
        </aside>
      </div>
    </div>
  );
}

function VitalsFields({
  value,
  bmi,
  disabled,
  onChange,
}: {
  value: VitalSigns;
  bmi: number | null;
  disabled: boolean;
  onChange: (value: VitalSigns) => void;
}) {
  const update = (key: keyof VitalSigns, input: string) =>
    onChange({
      ...value,
      [key]: key === "bloodPressure" ? input : input === "" ? undefined : Number(input),
    });
  return (
    <div className="form-grid four">
      <label className="field">
        <span>Blood pressure</span>
        <div className="unit-input">
          <input
            value={value.bloodPressure ?? ""}
            onChange={(event) => update("bloodPressure", event.target.value)}
            placeholder="120/80"
            disabled={disabled}
          />
          <span>mmHg</span>
        </div>
      </label>
      <NumberUnit label="Pulse rate" unit="bpm" value={value.pulse} onChange={(v) => update("pulse", v)} disabled={disabled} />
      <NumberUnit label="Respiratory rate" unit="/min" value={value.respiratoryRate} onChange={(v) => update("respiratoryRate", v)} disabled={disabled} />
      <NumberUnit label="Temperature" unit="°C" value={value.temperature} step="0.1" onChange={(v) => update("temperature", v)} disabled={disabled} />
      <NumberUnit label="SpO₂" unit="%" value={value.spo2} onChange={(v) => update("spo2", v)} disabled={disabled} />
      <NumberUnit label="Weight" unit="kg" value={value.weightKg} step="0.1" onChange={(v) => update("weightKg", v)} disabled={disabled} />
      <NumberUnit label="Height" unit="cm" value={value.heightCm} step="0.1" onChange={(v) => update("heightCm", v)} disabled={disabled} />
      <label className="field">
        <span>Body mass index</span>
        <input className="derived-input" value={bmi ? bmi.toFixed(1) : "—"} readOnly />
        <small>Calculated from height and weight</small>
      </label>
      <NumberUnit label="Pain score" unit="/10" value={value.painScore} min="0" max="10" onChange={(v) => update("painScore", v)} disabled={disabled} />
    </div>
  );
}

function NumberUnit({
  label,
  unit,
  value,
  step,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  unit: string;
  value?: number;
  step?: string;
  min?: string;
  max?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="unit-input">
        <input
          type="number"
          value={value ?? ""}
          step={step}
          min={min}
          max={max}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
        <span>{unit}</span>
      </div>
    </label>
  );
}

const sectionPrompt = (key: string) =>
  ({
    complaint: "Other complaint or additional information",
    history: "Additional history of the present illness",
    medical: "Other conditions, allergies, or relevant history",
    surgical: "Other surgery or fracture details",
    medication: "Medication name, dose, or additional information",
    occupational: "Additional work, PPE, exposure, or injury information",
    examination: "Additional examination findings",
    investigations: "Investigation result or additional information",
    impression: "Other or more specific clinical impression",
    treatment: "Other treatment or additional instructions",
  })[key] ?? "Clinical notes";

const sectionPlaceholder = (key: string) =>
  ({
    complaint: "Describe the reason for today's visit…",
    history: "Record sudden or gradual onset and relevant detail…",
    medical: "Hypertension, diabetes, asthma, allergies, or other history…",
    surgical: "Previous surgery, fractures, or relevant history…",
    medication: "Current and recent medication…",
    occupational: "Nature of work and relevant exposure or injury history…",
    examination: "General, cardiovascular, respiratory, abdominal, musculoskeletal, neurological, skin, or ENT findings…",
    investigations: "Tests performed and their results…",
    impression: "Record the clinician's impression…",
    treatment: "Record treatment given or advised…",
  })[key] ?? "Record notes…";

const quickOptionsLabel = (key: string) =>
  key === "complaint"
    ? "Common complaints — select all that apply *"
    : key === "impression"
      ? "Common impressions — select all that apply *"
      : key === "treatment"
        ? "Actions taken — select all that apply *"
        : "Quick entry — select all that apply";

const formatVisitDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
