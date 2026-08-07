import { ArrowLeft, Check, Download, FileWarning, LockKeyhole, Send, Stethoscope } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { downloadReferralPdf } from "../lib/referralPdf";
import { AppLink, useAppRouter } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";
import type { MedicalReferral, ReferralSignOff, ReferralStatus } from "../types";

const lifecycle: ReferralStatus[] = ["drafted", "authorised", "issued", "returned", "reviewed"];
const labels: Record<ReferralStatus, string> = { drafted: "Drafted", authorised: "Authorised", issued: "Issued", returned: "Returned", reviewed: "Reviewed" };

export function ReferralDetailPage() {
  const { state, currentUser, upsertReferral } = useDemoStore();
  const { search } = useAppRouter();
  const referralId = new URLSearchParams(search).get("referral");
  const referral = state.referrals.find((item) => item.id === referralId);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!referral) {
    return <div><PageHeader eyebrow="Occupational Health" title="Referral not found" description="The requested synthetic referral is unavailable." action={<AppLink className="button button-secondary" to="/referrals"><ArrowLeft size={17} aria-hidden="true" /> Referral register</AppLink>} /></div>;
  }

  const save = (next: MedicalReferral, success: string) => {
    upsertReferral({ ...next, updatedAt: new Date().toISOString() });
    setError("");
    setMessage(success);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Restricted clinical referral"
        title={`${referral.patientSnapshot.name} · ${referral.formNumber}`}
        description={`Destination: ${referral.referredTo}`}
        action={<div className="button-group"><AppLink className="button button-secondary" to="/referrals"><ArrowLeft size={17} aria-hidden="true" /> Referrals</AppLink><button className="button button-primary" type="button" onClick={() => downloadReferralPdf(referral)}><Download size={17} aria-hidden="true" /> Download PDF</button></div>}
      />
      <ReferralLifecycle status={referral.status} />
      {error && <div className="form-error page-message">{error}</div>}
      {message && <div className="form-success page-message">{message}</div>}

      <section className="privacy-callout"><LockKeyhole size={20} aria-hidden="true" /><div><strong>The downloaded clinical PDF is not the management authorisation view</strong><span>It is restricted to the Health and Wellness Officer and receiving facility. Section C records decisions obtained from the separate summary below.</span></div></section>

      <div className="referral-detail-layout">
        <section className="panel clinical-referral-panel">
          <div className="panel-heading"><div><div className="eyebrow">Section A</div><h2>Clinical referral</h2></div><span className="provenance">Health and Wellness Officer only</span></div>
          <DetailGrid rows={[
            ["Patient", `${referral.patientSnapshot.name} · ${referral.patientSnapshot.age} · ${referral.patientSnapshot.sex}`],
            ["Position", referral.patientSnapshot.position],
            ["Organisation", [referral.patientSnapshot.department, referral.patientSnapshot.division, referral.patientSnapshot.unit].join(" · ")],
            ["Supervisor", referral.patientSnapshot.supervisorName],
            ["Referral date", `${referral.referralDate} · ${referral.referralTime}`],
            ["Clinical features", referral.clinicalFeatures],
            ["General examination", [...referral.generalExamination, referral.generalExaminationOther].filter(Boolean).join(", ")],
            ["Past medical history", [...referral.pastMedicalHistory, referral.pastMedicalHistoryOther].filter(Boolean).join(", ")],
            ["Occupational consideration", `${referral.workRelated}${referral.suspectedExposure ? ` · ${referral.suspectedExposure}` : ""}`],
            ["Investigations", referral.investigationsDone || "No data"],
            ["Provisional diagnosis", referral.provisionalDiagnosis],
            ["Treatment given", referral.treatmentGiven || "No data"],
            ["Reason", [...referral.referralReasons, referral.referralReasonOther].filter(Boolean).join(", ")],
          ]} />
          <div className="subsection-title">Clinical findings · visit snapshot</div>
          <div className="vitals-summary referral-vitals">{[["Blood pressure", referral.vitals.bloodPressure, "mmHg"], ["Pulse", referral.vitals.pulse, "bpm"], ["Respiratory rate", referral.vitals.respiratoryRate, "/min"], ["Temperature", referral.vitals.temperature, "°C"], ["Oxygen saturation", referral.vitals.spo2, "%"], ["Pain score", referral.vitals.painScore, "/10"], ["Weight", referral.vitals.weightKg, "kg"], ["Height", referral.vitals.heightCm, "cm"], ["Body mass index", referral.vitals.bodyMassIndex, ""]].map(([label, value, unit]) => <div key={label}><span>{label}</span><strong>{value ?? "No data"} {value !== undefined ? unit : ""}</strong></div>)}</div>
          <div className="subsection-title">Section B · Infirmary clearance</div>
          <DetailGrid rows={[["Officer", referral.clearance.officer], ["Position · printed wording", referral.clearance.printedPosition], ["Contact", referral.clearance.contact], ["Signature", referral.clearance.signatureConfirmed ? "Confirmed" : "Not confirmed"]]} />
          <div className="form-defect-inline"><FileWarning size={16} aria-hidden="true" /><span>“KMC infirmary officer” is retained from the client form; the Health and Wellness Officer naming decision is pending.</span></div>
        </section>

        <aside className="referral-workflow-column">
          {referral.status === "drafted" && <AuthorisationForm referral={referral} officer={`${currentUser?.name ?? "Demo clinician"} · Health and Wellness Officer`} onError={setError} onSave={(next) => save(next, "Minimum-disclosure authorisation recorded. Clinical access was not granted to management.")} />}
          {referral.status === "authorised" && <section className="panel workflow-action-panel"><Send size={24} aria-hidden="true" /><h2>Issue referral</h2><p>Authorisation is recorded. Mark the clinical referral as issued to the receiving facility.</p><button className="button button-primary" type="button" onClick={() => save({ ...referral, status: "issued", issuedAt: new Date().toISOString() }, "Referral marked as issued.")}><Send size={17} aria-hidden="true" /> Mark issued</button></section>}
          {referral.status === "issued" && <ExternalFeedbackForm referral={referral} onError={setError} onSave={(next) => save(next, "External feedback saved. Recommended sick leave now feeds absenteeism.")} />}
          {referral.status === "returned" && <FollowUpForm referral={referral} officer={currentUser?.name ?? "Demo clinician"} onError={setError} onSave={(next) => save(next, "Follow-up review recorded; referral lifecycle complete.")} />}
          {referral.status === "reviewed" && <section className="panel workflow-action-panel complete-workflow"><Check size={24} aria-hidden="true" /><h2>Referral reviewed</h2><p>The returned clinical feedback and KMC follow-up review are complete.</p></section>}
        </aside>
      </div>

      {referral.authorisation && <section className="panel referral-section-panel"><div className="panel-heading"><div><div className="eyebrow">Section C</div><h2>Official authorisation record</h2></div><span className="provenance">Minimum-disclosure source</span></div><DetailGrid rows={[["Cost implication", referral.authorisation.costImplication], ["Head of Division", `${referral.authorisation.headOfDivision.name} · ${referral.authorisation.headOfDivision.date} · ${referral.authorisation.headOfDivision.remarks}`], ["Chief of Staff", `${referral.authorisation.chiefOfStaff.name} · ${referral.authorisation.chiefOfStaff.date} · ${referral.authorisation.chiefOfStaff.remarks}`], ["Recorded by", referral.authorisation.recordedBy]]} /></section>}
      {referral.externalFeedback && <section className="panel referral-section-panel"><div className="panel-heading"><div><div className="eyebrow">Section E · as printed</div><h2>External medical facility feedback</h2></div><span className="form-defect-tag">No Section D in supplied form</span></div><DetailGrid rows={[["Facility / practitioner", `${referral.externalFeedback.facility} · ${referral.externalFeedback.attendingPractitioner}`], ["Diagnosis", referral.externalFeedback.diagnosis], ["Treatment", referral.externalFeedback.treatmentProvided], ["Recommended follow-up", referral.externalFeedback.recommendedFollowUp], ["Recommended sick leave", referral.externalFeedback.sickLeaveDays ? `${referral.externalFeedback.sickLeaveDays} days · ${referral.externalFeedback.sickLeaveFrom} to ${referral.externalFeedback.sickLeaveTo}` : "None recorded"]]} /></section>}
      {referral.followUpReview && <section className="panel referral-section-panel"><div className="panel-heading"><div><div className="eyebrow">Section E · duplicate label retained</div><h2>KMC infirmary follow-up review</h2></div><span className="form-defect-tag">Printed numbering defect</span></div><DetailGrid rows={[["Review comments", referral.followUpReview.comments], ["Reviewed by", `${referral.followUpReview.reviewedBy} · ${referral.followUpReview.position}`], ["Date", referral.followUpReview.date], ["Signature", referral.followUpReview.signatureConfirmed ? "Confirmed" : "Not confirmed"]]} /></section>}
    </div>
  );
}

function ReferralLifecycle({ status }: { status: ReferralStatus }) {
  const current = lifecycle.indexOf(status);
  return <ol className="referral-lifecycle" aria-label={`Referral status: ${labels[status]}`}>{lifecycle.map((item, index) => <li className={index <= current ? "complete" : "pending"} key={item}><span>{index < current ? <Check size={14} aria-hidden="true" /> : index + 1}</span><strong>{labels[item]}</strong></li>)}</ol>;
}

function AuthorisationForm({ referral, officer, onSave, onError }: { referral: MedicalReferral; officer: string; onSave: (next: MedicalReferral) => void; onError: (message: string) => void }) {
  const blank: ReferralSignOff = { name: "", signatureConfirmed: false, date: referral.referralDate, remarks: "" };
  const [cost, setCost] = useState("");
  const [head, setHead] = useState(blank);
  const [chief, setChief] = useState(blank);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!cost.trim() || !head.name.trim() || !head.signatureConfirmed || !head.date || !chief.name.trim() || !chief.signatureConfirmed || !chief.date) { onError("Complete both authorisation sign-offs and the cost implication from the minimum-disclosure summary."); return; }
    onSave({ ...referral, status: "authorised", authorisation: { costImplication: cost.trim(), headOfDivision: head, chiefOfStaff: chief, recordedBy: officer, recordedAt: new Date().toISOString() } });
  };
  return <form className="panel form-panel authorisation-panel" onSubmit={submit}><div className="form-section-heading"><div><span className="section-number">C</span><div><h2>Minimum-disclosure authorisation</h2><p>Proposed answer · policy confirmation pending</p></div></div></div><div className="minimum-disclosure-summary"><Stethoscope size={18} aria-hidden="true" /><dl><div><dt>Patient</dt><dd>{referral.patientSnapshot.name}</dd></div><div><dt>Destination</dt><dd>{referral.referredTo}</dd></div><div><dt>Reason</dt><dd>{referral.referralReasons.join(", ")}</dd></div></dl></div><label className="field"><span>Cost implication</span><input value={cost} onChange={(event) => setCost(event.target.value)} required /></label><SignOffFields title="Head of Division" value={head} onChange={setHead} /><SignOffFields title="Chief of Staff" value={chief} onChange={setChief} /><button className="button button-primary" type="submit"><Check size={17} aria-hidden="true" /> Record authorisation</button></form>;
}

function SignOffFields({ title, value, onChange }: { title: string; value: ReferralSignOff; onChange: (value: ReferralSignOff) => void }) { return <fieldset className="choice-fieldset signoff-fieldset"><legend>{title}</legend><label className="field"><span>Name</span><input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} /></label><label className="field"><span>Date</span><input type="date" value={value.date} onChange={(event) => onChange({ ...value, date: event.target.value })} /></label><label className="field"><span>Remarks</span><textarea rows={2} value={value.remarks} onChange={(event) => onChange({ ...value, remarks: event.target.value })} /></label><label className="checkbox-line"><input type="checkbox" checked={value.signatureConfirmed} onChange={(event) => onChange({ ...value, signatureConfirmed: event.target.checked })} /><span>Signature confirmed on minimum-disclosure summary</span></label></fieldset>; }

function ExternalFeedbackForm({ referral, onSave, onError }: { referral: MedicalReferral; onSave: (next: MedicalReferral) => void; onError: (message: string) => void }) {
  const [facility, setFacility] = useState(referral.referredTo);
  const [practitioner, setPractitioner] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [days, setDays] = useState("0");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [date, setDate] = useState("2026-08-03");
  const submit = (event: FormEvent) => { event.preventDefault(); const dayCount = Number(days); if (!facility.trim() || !practitioner.trim() || !diagnosis.trim() || !treatment.trim() || !followUp.trim() || !confirmed || !date || dayCount < 0 || (dayCount > 0 && (!from || !to))) { onError("Complete the returned facility feedback, signature confirmation, and any sick-leave date range."); return; } onSave({ ...referral, status: "returned", externalFeedback: { facility: facility.trim(), attendingPractitioner: practitioner.trim(), diagnosis: diagnosis.trim(), treatmentProvided: treatment.trim(), recommendedFollowUp: followUp.trim(), sickLeaveDays: dayCount, sickLeaveFrom: dayCount ? from : undefined, sickLeaveTo: dayCount ? to : undefined, signatureAndStampConfirmed: confirmed, date } }); };
  return <form className="panel form-panel" onSubmit={submit}><div className="form-section-heading"><div><span className="section-number">E</span><div><h2>External facility feedback</h2><p>Section E as printed · no Section D</p></div></div></div><label className="field"><span>Facility</span><input value={facility} onChange={(event) => setFacility(event.target.value)} /></label><label className="field"><span>Attending practitioner</span><input value={practitioner} onChange={(event) => setPractitioner(event.target.value)} /></label><label className="field"><span>Diagnosis</span><textarea rows={2} value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} /></label><label className="field"><span>Treatment provided</span><textarea rows={2} value={treatment} onChange={(event) => setTreatment(event.target.value)} /></label><label className="field"><span>Recommended follow-up</span><textarea rows={2} value={followUp} onChange={(event) => setFollowUp(event.target.value)} /></label><div className="form-grid three"><label className="field"><span>Recommended sick leave · days</span><input type="number" min="0" value={days} onChange={(event) => setDays(event.target.value)} /></label><label className="field"><span>From</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} disabled={Number(days) === 0} /></label><label className="field"><span>To</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} disabled={Number(days) === 0} /></label></div><label className="field"><span>Feedback date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="checkbox-line"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Practitioner signature and stamp confirmed</span></label><button className="button button-primary" type="submit">Save returned feedback</button></form>;
}

function FollowUpForm({ referral, officer, onSave, onError }: { referral: MedicalReferral; officer: string; onSave: (next: MedicalReferral) => void; onError: (message: string) => void }) {
  const [comments, setComments] = useState("");
  const [position, setPosition] = useState("Health and Wellness Officer");
  const [date, setDate] = useState("2026-08-03");
  const [confirmed, setConfirmed] = useState(false);
  const submit = (event: FormEvent) => { event.preventDefault(); if (!comments.trim() || !position.trim() || !date || !confirmed) { onError("Complete and sign the follow-up review."); return; } onSave({ ...referral, status: "reviewed", followUpReview: { comments: comments.trim(), reviewedBy: officer, position: position.trim(), signatureConfirmed: confirmed, date } }); };
  return <form className="panel form-panel" onSubmit={submit}><div className="form-section-heading"><div><span className="section-number">E</span><div><h2>KMC infirmary follow-up</h2><p>Duplicate Section E label retained</p></div></div></div><label className="field"><span>Review comments</span><textarea rows={4} value={comments} onChange={(event) => setComments(event.target.value)} /></label><label className="field"><span>Reviewed by</span><input value={officer} readOnly /></label><label className="field"><span>Position</span><input value={position} onChange={(event) => setPosition(event.target.value)} /></label><label className="field"><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="checkbox-line"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Reviewer signature confirmed</span></label><button className="button button-primary" type="submit"><Check size={17} aria-hidden="true" /> Complete review</button></form>;
}

function DetailGrid({ rows }: { rows: Array<[string, string | number]> }) { return <dl className="detail-grid">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>; }
