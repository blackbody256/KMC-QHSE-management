import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { timeNow, today } from "../lib/dates";
import { Icon } from "../components/Icon";
import {
  ApiError,
  clinicalApi,
  referralApi,
  type Patient,
  type ReferralForm,
  type Visit,
} from "../lib/api";

/**
 * Raising a referral, KMC.DQHSE.02/26-FM004.
 *
 * The whole design of this page is that it is raised from a visit. Identity,
 * employer details and the vital signs recorded at that visit are carried
 * across and shown read-only. Re-keying a blood pressure taken ten minutes
 * earlier is how the clinic's record and the letter in the patient's hand come
 * to disagree, and of the two it is the letter an external clinician reads.
 *
 * The option lists come from the service. The interface keeps no copy: two
 * lists of past medical history would eventually disagree, and the one that
 * disagreed silently would be the one a clinician ticked.
 */
export function NewReferralPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const visitId = params.get("visitId") ?? "";

  const [form, setForm] = useState<ReferralForm | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Section A
  const [referredTo, setReferredTo] = useState("");
  const [position, setPosition] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [referralDate, setReferralDate] = useState(today);
  const [referralTime, setReferralTime] = useState(timeNow);
  const [clinicalFeatures, setClinicalFeatures] = useState("");
  const [generalExamination, setGeneralExamination] = useState<string[]>([]);
  const [generalExaminationOther, setGeneralExaminationOther] = useState("");
  const [pastMedicalHistory, setPastMedicalHistory] = useState<string[]>([]);
  const [pastMedicalHistoryOther, setPastMedicalHistoryOther] = useState("");
  const [workRelated, setWorkRelated] = useState("No");
  const [suspectedExposure, setSuspectedExposure] = useState("");
  const [investigationsDone, setInvestigationsDone] = useState("");
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState("");
  const [treatmentGiven, setTreatmentGiven] = useState("");
  const [referralReasons, setReferralReasons] = useState<string[]>([]);
  const [referralReasonOther, setReferralReasonOther] = useState("");

  // Section B
  const [clearanceContact, setClearanceContact] = useState("");
  const [clearanceSignatureConfirmed, setClearanceSignatureConfirmed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const formBody = await referralApi.form();
        setForm(formBody);
        if (visitId) {
          const visitBody = await clinicalApi.getVisit(visitId);
          setVisit(visitBody.visit);
          const patientBody = await clinicalApi.getPatient(visitBody.visit.patientId);
          setPatient(patientBody);
          // Pre-filled, not pre-decided: every one of these stays editable,
          // because the registry holds the person's job and the referral holds
          // the job they were doing when this happened.
          setPosition(patientBody.jobTitle ?? "");
          setContactNumber(patientBody.phone ?? "");
          setReferralDate(visitBody.visit.visitDate);
          // The visit says Unsure where this form says Suspected. Mapped once,
          // here, rather than leaving the officer to translate it.
          setWorkRelated(visitBody.visit.workRelated === "Unsure" ? "Suspected" : visitBody.visit.workRelated);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "The visit could not be read. Try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [visitId]);

  const bmi = useMemo(() => {
    const weight = visit?.vitals.weightKg;
    const height = visit?.vitals.heightCm;
    if (!weight || !height || height <= 0) return null;
    return Math.round((weight / (height / 100) ** 2) * 10) / 10;
  }, [visit]);

  const toggle = (value: string, current: string[], set: (next: string[]) => void) =>
    set(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!visit || !patient) return;
    setError(null);
    setSaving(true);
    try {
      const created = await referralApi.create({
        visitId: visit.id,
        patientId: patient.id,
        referredTo,
        // A snapshot taken now, as the printed form is. A later correction to
        // the registry must not rewrite a letter already with a facility.
        patientSnapshot: {
          name: patient.fullName,
          position,
          age: patient.age,
          sex: patient.sex,
          department: patient.department ?? "",
          division: patient.division ?? "",
          unit: patient.unit ?? "",
          contactNumber,
          supervisorName,
        },
        referralDate,
        referralTime,
        clinicalFeatures,
        vitals: visit.vitals,
        generalExamination,
        generalExaminationOther,
        pastMedicalHistory,
        pastMedicalHistoryOther,
        workRelated,
        suspectedExposure,
        investigationsDone,
        provisionalDiagnosis,
        treatmentGiven,
        referralReasons,
        referralReasonOther,
        clearanceContact,
        clearanceDate: referralDate,
        clearanceTime: referralTime,
        clearanceSignatureConfirmed,
      });
      navigate(`/referrals/details?id=${encodeURIComponent(created.id)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The referral could not be raised. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-sm text-ink-muted">Reading the visit…</div>;
  }

  if (!visitId || !visit || !patient) {
    return (
      <>
        <PageHeader
          title="Medical referral"
          description="A referral is raised from a patient visit, so identity and vital signs are never typed twice."
        />
        <section className="panel">
          <div className="panel-body space-y-4 text-sm text-ink-muted">
            <p>Open a patient visit and raise the referral from there.</p>
            <button type="button" className="button-secondary" onClick={() => navigate("/patient-visits")}>
              <Icon name="arrow_back" size={16} />
              Go to patient visits
            </button>
          </div>
        </section>
      </>
    );
  }

  const sectionA = form?.sections[0];
  const sectionB = form?.sections[1];

  return (
    <>
      <PageHeader
        title="Medical referral"
        description={`${form?.formNumber ?? ""} · Occupational Health & Wellness Clinic`}
      />

      <form className="max-w-form space-y-6" onSubmit={submit}>
        <section className="panel">
          <div className="panel-head">
            <h2 className="text-lg">
              {sectionA ? `${sectionA.label} · ${sectionA.title}` : "Preliminary information"}
            </h2>
            <span className="text-xs text-ink-muted">Identity taken from the visit</span>
          </div>
          <div className="panel-body space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-ink-muted">Name</div>
                <div className="font-medium">{patient.fullName}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">Age / sex</div>
                <div>
                  <span className="data-value">{patient.age}</span> · {patient.sex}
                </div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">Department</div>
                <div>{patient.department || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">Division</div>
                <div>{patient.division || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">Unit</div>
                <div>{patient.unit || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">Visit</div>
                <div className="data-value">{visit.visitDate}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="label">Referred to</span>
                <input
                  className="field"
                  value={referredTo}
                  onChange={(event) => setReferredTo(event.target.value)}
                  placeholder="Name of the receiving facility"
                  required
                />
              </label>
              <label>
                <span className="label">Position</span>
                <input
                  className="field"
                  value={position}
                  onChange={(event) => setPosition(event.target.value)}
                />
              </label>
              <label>
                <span className="label">Contact number</span>
                <input
                  className="field"
                  value={contactNumber}
                  onChange={(event) => setContactNumber(event.target.value)}
                />
              </label>
              <label>
                <span className="label">Supervisor's name</span>
                <input
                  className="field"
                  value={supervisorName}
                  onChange={(event) => setSupervisorName(event.target.value)}
                />
              </label>
              <label>
                <span className="label">Date</span>
                <input
                  type="date"
                  className="field"
                  value={referralDate}
                  onChange={(event) => setReferralDate(event.target.value)}
                  required
                />
              </label>
              <label>
                <span className="label">Time</span>
                <input
                  type="time"
                  className="field"
                  value={referralTime}
                  onChange={(event) => setReferralTime(event.target.value)}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="text-lg">Clinical features and findings</h2>
            <span className="text-xs text-ink-muted">Vital signs copied from the visit</span>
          </div>
          <div className="panel-body space-y-4">
            <label>
              <span className="label">Clinical features</span>
              <textarea
                className="field min-h-[90px]"
                value={clinicalFeatures}
                onChange={(event) => setClinicalFeatures(event.target.value)}
                placeholder="What the patient presented with."
              />
            </label>

            {/* Read-only, and deliberately so. These were measured at the
                visit; a second, editable copy here is a second version of the
                truth. Correct the visit if a reading is wrong. */}
            <div
              className="grid grid-cols-3 gap-3 rounded border px-4 py-3 text-sm"
              style={{ borderColor: "var(--rule)", background: "var(--neutral-wash)" }}
            >
              {[
                ["Blood pressure", visit.vitals.bloodPressure, "mmHg"],
                ["Pulse", visit.vitals.pulse, "bpm"],
                ["Respiratory rate", visit.vitals.respiratoryRate, "/min"],
                ["Temperature", visit.vitals.temperature, "°C"],
                ["SpO₂", visit.vitals.spo2, "%"],
                ["Pain score", visit.vitals.painScore, "/10"],
                ["Weight", visit.vitals.weightKg, "kg"],
                ["Height", visit.vitals.heightCm, "cm"],
                ["Body mass index", bmi, "derived"],
              ].map(([label, value, unit]) => (
                <div key={String(label)}>
                  <div className="text-xs text-ink-muted">{label}</div>
                  <div className="data-value">
                    {value === undefined || value === null || value === "" ? (
                      <span className="text-ink-faint">—</span>
                    ) : (
                      <>
                        {value}{" "}
                        <span className="text-xs font-normal text-ink-muted">{unit}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <fieldset>
              <legend className="label">General examination</legend>
              <div className="flex flex-wrap gap-2">
                {(form?.generalExamination ?? []).map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm"
                    style={{
                      borderColor: generalExamination.includes(option) ? "var(--focus)" : "var(--rule)",
                      background: generalExamination.includes(option) ? "var(--info-wash)" : "var(--surface)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={generalExamination.includes(option)}
                      onChange={() => toggle(option, generalExamination, setGeneralExamination)}
                    />
                    {option}
                  </label>
                ))}
              </div>
              {generalExamination.includes("Other") ? (
                <input
                  className="field mt-2"
                  value={generalExaminationOther}
                  onChange={(event) => setGeneralExaminationOther(event.target.value)}
                  placeholder="Other finding"
                  aria-label="Other general examination finding"
                />
              ) : null}
            </fieldset>

            <fieldset>
              <legend className="label">Past medical history</legend>
              <div className="flex flex-wrap gap-2">
                {(form?.pastMedicalHistory ?? []).map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm"
                    style={{
                      borderColor: pastMedicalHistory.includes(option) ? "var(--focus)" : "var(--rule)",
                      background: pastMedicalHistory.includes(option) ? "var(--info-wash)" : "var(--surface)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={pastMedicalHistory.includes(option)}
                      onChange={() => toggle(option, pastMedicalHistory, setPastMedicalHistory)}
                    />
                    {option}
                  </label>
                ))}
              </div>
              {pastMedicalHistory.includes("Other") ? (
                <input
                  className="field mt-2"
                  value={pastMedicalHistoryOther}
                  onChange={(event) => setPastMedicalHistoryOther(event.target.value)}
                  placeholder="Other condition"
                  aria-label="Other past medical history"
                />
              ) : null}
            </fieldset>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="text-lg">Occupational consideration</h2>
          </div>
          <div className="panel-body space-y-4">
            <fieldset>
              <legend className="label">Work-related</legend>
              <div className="flex gap-2">
                {(form?.workRelatedOptions ?? []).map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm"
                    style={{
                      borderColor: workRelated === option ? "var(--focus)" : "var(--rule)",
                      background: workRelated === option ? "var(--info-wash)" : "var(--surface)",
                    }}
                  >
                    <input
                      type="radio"
                      name="workRelated"
                      checked={workRelated === option}
                      onChange={() => setWorkRelated(option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>

            {workRelated !== "No" ? (
              <label>
                <span className="label">Suspected exposure</span>
                <input
                  className="field"
                  value={suspectedExposure}
                  onChange={(event) => setSuspectedExposure(event.target.value)}
                  placeholder="The agent or process suspected."
                />
              </label>
            ) : null}

            <label>
              <span className="label">Investigations done at the infirmary</span>
              <textarea
                className="field min-h-[70px]"
                value={investigationsDone}
                onChange={(event) => setInvestigationsDone(event.target.value)}
              />
            </label>
            <label>
              <span className="label">Provisional diagnosis</span>
              <textarea
                className="field min-h-[70px]"
                value={provisionalDiagnosis}
                onChange={(event) => setProvisionalDiagnosis(event.target.value)}
              />
            </label>
            <label>
              <span className="label">Treatment given</span>
              <textarea
                className="field min-h-[70px]"
                value={treatmentGiven}
                onChange={(event) => setTreatmentGiven(event.target.value)}
              />
            </label>

            <fieldset>
              <legend className="label">Reason for referral</legend>
              <div className="space-y-2">
                {(form?.referralReasons ?? []).map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-3 rounded border px-3 py-2 text-sm"
                    style={{
                      borderColor: referralReasons.includes(option) ? "var(--focus)" : "var(--rule)",
                      background: referralReasons.includes(option) ? "var(--info-wash)" : "var(--surface)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={referralReasons.includes(option)}
                      onChange={() => toggle(option, referralReasons, setReferralReasons)}
                    />
                    {option}
                  </label>
                ))}
              </div>
              {referralReasons.includes("Other") ? (
                <input
                  className="field mt-2"
                  value={referralReasonOther}
                  onChange={(event) => setReferralReasonOther(event.target.value)}
                  placeholder="Other reason"
                  aria-label="Other reason for referral"
                />
              ) : null}
            </fieldset>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="text-lg">
              {sectionB ? `${sectionB.label} · ${sectionB.title}` : "Infirmary clearance"}
            </h2>
            <span className="text-xs text-ink-muted">{form?.clearancePrintedPosition}</span>
          </div>
          <div className="panel-body space-y-4">
            {/* The printed form names a role KMC has renamed. The wording is
                the client's controlled document, so it stands until the form
                is reissued, and the discrepancy is stated rather than hidden. */}
            {form?.clearancePositionNote ? (
              <div
                className="flex items-start gap-3 rounded border px-4 py-3 text-xs"
                style={{ borderColor: "var(--rule)", background: "var(--neutral-wash)", color: "var(--ink-muted)" }}
              >
                <Icon name="info" size={16} className="mt-0.5 shrink-0" />
                <span>{form.clearancePositionNote}</span>
              </div>
            ) : null}

            <label className="max-w-[280px]">
              <span className="label">Officer contact</span>
              <input
                className="field"
                value={clearanceContact}
                onChange={(event) => setClearanceContact(event.target.value)}
              />
            </label>

            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={clearanceSignatureConfirmed}
                onChange={(event) => setClearanceSignatureConfirmed(event.target.checked)}
              />
              <span>
                <span className="font-medium">Officer signature confirmed</span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  The printed form carries a signature block here. A referral without it is not a
                  completed form.
                </span>
              </span>
            </label>
          </div>
        </section>

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
            <Icon name="forward_to_inbox" size={18} />
            {saving ? "Saving…" : "Save referral"}
          </button>
          <button type="button" className="button-secondary" onClick={() => navigate("/referrals")}>
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
