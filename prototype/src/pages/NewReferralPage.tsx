import { ArrowLeft, FileWarning, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { calculateBmi } from "../lib/calculations";
import { AppLink, useAppRouter } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";
import type { MedicalReferral } from "../types";

const generalOptions = ["Stable", "Sick-looking", "Pale", "Jaundiced", "Dehydrated", "Other"];
const historyOptions = ["Hypertension", "Diabetes", "Asthma", "Epilepsy", "Peptic ulcer disease", "Tuberculosis", "HIV", "Mental health condition", "None", "Other"];
const reasonOptions = ["Further evaluation", "Specialist management", "Diagnostic imaging or laboratory investigations", "Emergency care", "Other"];

export function NewReferralPage() {
  const { state, currentUser, upsertReferral } = useDemoStore();
  const { search, navigate } = useAppRouter();
  const visitId = new URLSearchParams(search).get("visit");
  const visit = state.visits.find((item) => item.id === visitId);
  const patient = state.patients.find((item) => item.id === visit?.patientId);
  const [referredTo, setReferredTo] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [referralDate, setReferralDate] = useState(visit?.visitDate ?? "2026-08-03");
  const [referralTime, setReferralTime] = useState(visit?.timeIn ?? "09:00");
  const [clinicalFeatures, setClinicalFeatures] = useState(visit?.sections.complaint?.notes ?? "");
  const [generalExamination, setGeneralExamination] = useState<string[]>([]);
  const [generalOther, setGeneralOther] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyOther, setHistoryOther] = useState("");
  const [workRelated, setWorkRelated] = useState<MedicalReferral["workRelated"]>(visit?.workRelated === "Unsure" ? "Suspected" : visit?.workRelated ?? "No");
  const [suspectedExposure, setSuspectedExposure] = useState("");
  const [investigationsDone, setInvestigationsDone] = useState(visit?.sections.investigations?.notes ?? "");
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState(visit?.sections.impression?.notes ?? "");
  const [treatmentGiven, setTreatmentGiven] = useState(visit?.sections.treatment?.notes ?? "");
  const [reasons, setReasons] = useState<string[]>([]);
  const [reasonOther, setReasonOther] = useState("");
  const [clearanceContact, setClearanceContact] = useState("");
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [error, setError] = useState("");

  if (!visit || !patient) {
    return <div><PageHeader eyebrow="Occupational Health" title="Choose a visit first" description="A referral must pre-fill from an existing visit so vitals and clinical entries are not re-keyed." action={<AppLink className="button button-secondary" to="/patient-visits"><ArrowLeft size={17} aria-hidden="true" /> Open visits</AppLink>} /><section className="panel"><div className="visit-list">{state.visits.map((item) => { const visitPatient = state.patients.find((candidate) => candidate.id === item.patientId); return <article className="visit-row" key={item.id}><div><strong>{visitPatient?.fullName}</strong><span className="table-secondary">{item.visitDate} · {item.visitType}</span></div><AppLink className="button button-primary button-small" to={`/referrals/new?visit=${item.id}`}>Use visit</AppLink></article>; })}</div></section></div>;
  }

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => setter((current) => {
    if (current.includes(value)) return current.filter((item) => item !== value);
    if (value === "None") return ["None"];
    return [...current.filter((item) => item !== "None"), value];
  });
  const bmi = calculateBmi(visit.vitals.weightKg, visit.vitals.heightCm);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!referredTo.trim() || !supervisorName.trim() || !clinicalFeatures.trim() || generalExamination.length === 0 || history.length === 0 || reasons.length === 0 || !provisionalDiagnosis.trim() || !clearanceContact.trim()) {
      setError("Complete the required referral, examination, history, diagnosis, reason and clearance fields.");
      return;
    }
    if (workRelated === "Suspected" && !suspectedExposure.trim()) {
      setError("Record the suspected occupational exposure.");
      return;
    }
    const now = new Date().toISOString();
    const referral: MedicalReferral = {
      id: crypto.randomUUID(),
      formNumber: "KMC.DQHSE.02/26-FM004",
      visitId: visit.id,
      patientId: patient.id,
      status: "drafted",
      referredTo: referredTo.trim(),
      patientSnapshot: {
        name: patient.fullName,
        position: patient.jobTitle ?? "Not recorded",
        age: patient.age,
        sex: patient.sex,
        department: patient.department ?? "Not recorded",
        division: patient.division ?? "Not recorded",
        unit: patient.unit ?? "Not recorded",
        contactNumber: patient.phone ?? "Not recorded",
        supervisorName: supervisorName.trim(),
      },
      referralDate,
      referralTime,
      clinicalFeatures: clinicalFeatures.trim(),
      vitals: { ...visit.vitals, bodyMassIndex: bmi },
      generalExamination,
      generalExaminationOther: generalOther.trim() || undefined,
      pastMedicalHistory: history,
      pastMedicalHistoryOther: historyOther.trim() || undefined,
      workRelated,
      suspectedExposure: suspectedExposure.trim() || undefined,
      investigationsDone: investigationsDone.trim(),
      provisionalDiagnosis: provisionalDiagnosis.trim(),
      treatmentGiven: treatmentGiven.trim(),
      referralReasons: reasons,
      referralReasonOther: reasonOther.trim() || undefined,
      clearance: {
        officer: currentUser?.name ?? "Demo clinician",
        printedPosition: "KMC infirmary officer",
        signatureConfirmed,
        contact: clearanceContact.trim(),
        date: referralDate,
        time: referralTime,
      },
      createdAt: now,
      updatedAt: now,
    };
    upsertReferral(referral);
    navigate(`/referrals/details?referral=${referral.id}`);
  };

  return (
    <div>
      <PageHeader eyebrow="Restricted clinical record" title="New medical referral" description={`KMC.DQHSE.02/26-FM004 · pre-filled from ${patient.fullName}'s ${visit.visitDate} visit.`} action={<AppLink className="button button-secondary" to={`/patient-visits/details?visit=${visit.id}`}><ArrowLeft size={17} aria-hidden="true" /> Back to visit</AppLink>} />
      <section className="decision-callout"><FileWarning size={20} aria-hidden="true" /><div><strong>Management authorisation over clinical detail is not implemented</strong><span>Save the clinical draft here. The next stage records authorisation from a separate summary containing only patient, destination, reason and cost implication.</span></div></section>
      <form className="panel referral-form" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <FormSection code="A" title="Preliminary information">
          <div className="form-grid two">
            <label className="field"><span>Referred to</span><input value={referredTo} onChange={(event) => setReferredTo(event.target.value)} required /></label>
            <label className="field"><span>Name</span><input value={patient.fullName} readOnly /></label>
            <label className="field"><span>Position</span><input value={patient.jobTitle ?? "Not recorded"} readOnly /></label>
            <label className="field"><span>Age / sex</span><input value={`${patient.age} / ${patient.sex}`} readOnly /></label>
            <label className="field"><span>Department / division / unit</span><input value={[patient.department, patient.division, patient.unit].filter(Boolean).join(" · ") || "Not recorded"} readOnly /></label>
            <label className="field"><span>Contact number</span><input value={patient.phone ?? "Not recorded"} readOnly /></label>
            <label className="field"><span>Supervisor’s name</span><input value={supervisorName} onChange={(event) => setSupervisorName(event.target.value)} required /></label>
            <div className="form-grid two"><label className="field"><span>Date</span><input type="date" value={referralDate} onChange={(event) => setReferralDate(event.target.value)} required /></label><label className="field"><span>Time</span><input type="time" value={referralTime} onChange={(event) => setReferralTime(event.target.value)} required /></label></div>
          </div>
          <label className="field"><span>Clinical features</span><textarea rows={3} value={clinicalFeatures} onChange={(event) => setClinicalFeatures(event.target.value)} required /></label>
          <div className="subsection-title">Clinical findings · copied from visit</div>
          <div className="vitals-summary referral-vitals">{[["Blood pressure", visit.vitals.bloodPressure, "mmHg"], ["Pulse", visit.vitals.pulse, "bpm"], ["Respiratory rate", visit.vitals.respiratoryRate, "/min"], ["Temperature", visit.vitals.temperature, "°C"], ["Oxygen saturation", visit.vitals.spo2, "%"], ["Pain score", visit.vitals.painScore, "/10"], ["Weight", visit.vitals.weightKg, "kg"], ["Height", visit.vitals.heightCm, "cm"], ["Body mass index", bmi, ""]].map(([label, value, unit]) => <div key={label}><span>{label}</span><strong>{value ?? "No data"} {value !== undefined ? unit : ""}</strong></div>)}</div>
          <ChoiceSet legend="General examination" options={generalOptions} selected={generalExamination} onToggle={(value) => toggle(setGeneralExamination, value)} />
          {generalExamination.includes("Other") && <label className="field"><span>Other general examination finding</span><input value={generalOther} onChange={(event) => setGeneralOther(event.target.value)} /></label>}
          <ChoiceSet legend="Past medical history" options={historyOptions} selected={history} onToggle={(value) => toggle(setHistory, value)} />
          {history.includes("Other") && <label className="field"><span>Other medical history</span><input value={historyOther} onChange={(event) => setHistoryOther(event.target.value)} /></label>}
          <div className="form-grid two"><label className="field"><span>Work-related</span><select value={workRelated} onChange={(event) => setWorkRelated(event.target.value as MedicalReferral["workRelated"])}><option>Yes</option><option>No</option><option>Suspected</option></select></label><label className="field"><span>Suspected exposure</span><input value={suspectedExposure} onChange={(event) => setSuspectedExposure(event.target.value)} disabled={workRelated !== "Suspected"} /></label></div>
          <label className="field"><span>Investigations done at the infirmary</span><textarea rows={2} value={investigationsDone} onChange={(event) => setInvestigationsDone(event.target.value)} /></label>
          <label className="field"><span>Provisional diagnosis</span><textarea rows={2} value={provisionalDiagnosis} onChange={(event) => setProvisionalDiagnosis(event.target.value)} required /></label>
          <label className="field"><span>Treatment given</span><textarea rows={2} value={treatmentGiven} onChange={(event) => setTreatmentGiven(event.target.value)} /></label>
          <ChoiceSet legend="Reason for referral" options={reasonOptions} selected={reasons} onToggle={(value) => toggle(setReasons, value)} />
          {reasons.includes("Other") && <label className="field"><span>Other referral reason</span><input value={reasonOther} onChange={(event) => setReasonOther(event.target.value)} /></label>}
        </FormSection>
        <FormSection code="B" title="Infirmary clearance">
          <div className="form-grid two">
            <label className="field"><span>Officer</span><input value={currentUser?.name ?? "Demo clinician"} readOnly /></label>
            <label className="field"><span>Position · printed wording</span><input value="KMC infirmary officer" readOnly /><small>Role-renaming discrepancy is awaiting a client decision.</small></label>
            <label className="field"><span>Contact</span><input value={clearanceContact} onChange={(event) => setClearanceContact(event.target.value)} required /></label>
            <label className="checkbox-line"><input type="checkbox" checked={signatureConfirmed} onChange={(event) => setSignatureConfirmed(event.target.checked)} /><span>Officer signature confirmed</span></label>
          </div>
        </FormSection>
        <div className="form-footer"><span>Section C follows after the draft through the privacy-minimised authorisation summary.</span><button className="button button-primary" type="submit"><Save size={17} aria-hidden="true" /> Save draft referral</button></div>
      </form>
    </div>
  );
}

function FormSection({ code, title, children }: { code: string; title: string; children: React.ReactNode }) { return <section className="form-section"><div className="form-section-heading"><div><span className="section-number">{code}</span><div><h2>Section {code} · {title}</h2></div></div></div>{children}</section>; }
function ChoiceSet({ legend, options, selected, onToggle }: { legend: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) { return <fieldset className="choice-fieldset"><legend>{legend}</legend><div className="radio-card-grid compact-choice-grid">{options.map((option) => <label className="radio-card" key={option}><input type="checkbox" checked={selected.includes(option)} onChange={() => onToggle(option)} /><span>{option}</span></label>)}</div></fieldset>; }
