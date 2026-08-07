import { ArrowLeft, FlaskConical, Save } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { AppLink, useAppRouter } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";
import type { LabPriority, LabTestRequest, SurveillanceContext } from "../types";

const proposal = <span className="proposal-chip">Proposal</span>;

export function NewLabRequestPage() {
  const { state, currentUser, upsertLabRequest } = useDemoStore();
  const { search, navigate } = useAppRouter();
  const visitId = new URLSearchParams(search).get("visit");
  const visit = state.visits.find((item) => item.id === visitId);
  const patient = state.patients.find((item) => item.id === visit?.patientId);
  const panels = useMemo(() => [...new Set(state.labReferenceRanges.map((range) => range.panel))], [state.labReferenceRanges]);
  const [requestedAt, setRequestedAt] = useState(new Date().toISOString().slice(0, 16));
  const [specimenType, setSpecimenType] = useState("Whole blood");
  const [testsRequested, setTestsRequested] = useState<string[]>([]);
  const [clinicalIndication, setClinicalIndication] = useState("");
  const [priority, setPriority] = useState<LabPriority>("Routine");
  const [surveillanceContext, setSurveillanceContext] = useState<SurveillanceContext>("Periodic surveillance");
  const [error, setError] = useState("");

  if (!visit || !patient) {
    return (
      <div>
        <PageHeader eyebrow="Occupational Health" title="Choose a visit first" description="Laboratory requests are raised from a clinical visit so the patient and surveillance context are linked." action={<AppLink className="button button-secondary" to="/patient-visits"><ArrowLeft size={17} aria-hidden="true" /> Open visits</AppLink>} />
        <section className="panel"><div className="visit-list">{state.visits.map((item) => { const visitPatient = state.patients.find((candidate) => candidate.id === item.patientId); return <article className="visit-row" key={item.id}><div><strong>{visitPatient?.fullName}</strong><span className="table-secondary">{item.visitDate} · {item.visitType}</span></div><AppLink className="button button-primary button-small" to={`/laboratory/new?visit=${item.id}`}>Use visit</AppLink></article>; })}</div></section>
      </div>
    );
  }

  const togglePanel = (panel: string) => setTestsRequested((current) => current.includes(panel) ? current.filter((item) => item !== panel) : [...current, panel]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!requestedAt || !specimenType.trim() || !clinicalIndication.trim() || testsRequested.length === 0) {
      setError("Complete every proposed request field and choose at least one test panel.");
      return;
    }
    const request: LabTestRequest = {
      id: crypto.randomUUID(),
      visitId: visit.id,
      patientId: patient.id,
      requestingOfficer: `${currentUser?.name ?? "Demo clinician"} · Health and Wellness Officer`,
      requestedAt: new Date(requestedAt).toISOString(),
      specimenType: specimenType.trim(),
      testsRequested,
      clinicalIndication: clinicalIndication.trim(),
      priority,
      surveillanceContext,
      proposalNotice: "Proposed field set awaiting the actual KMC laboratory forms.",
      createdAt: new Date().toISOString(),
    };
    upsertLabRequest(request);
    navigate(`/laboratory/details?request=${request.id}`);
  };

  return (
    <div>
      <PageHeader eyebrow="Occupational Health · proposed workflow" title="New laboratory request" description={`Raised from ${patient.fullName}'s ${visit.visitDate} visit.`} action={<AppLink className="button button-secondary" to={`/patient-visits/details?visit=${visit.id}`}><ArrowLeft size={17} aria-hidden="true" /> Back to visit</AppLink>} />
      <section className="proposal-callout"><FlaskConical size={20} aria-hidden="true" /><div><strong>Every field below is a proposal</strong><span>Do not treat this generic panel as the KMC laboratory form. Replace it only after the laboratory staff provide and approve their real forms.</span></div></section>
      <form className="panel form-panel" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid two">
          <label className="field"><span>Requesting officer {proposal}</span><input value={`${currentUser?.name ?? "Demo clinician"} · Health and Wellness Officer`} readOnly /></label>
          <label className="field"><span>Date and time {proposal}</span><input type="datetime-local" value={requestedAt} onChange={(event) => setRequestedAt(event.target.value)} required /></label>
          <label className="field"><span>Patient {proposal}</span><input value={`${patient.fullName} · ${patient.employeeNumber ?? patient.category}`} readOnly /></label>
          <label className="field"><span>Specimen type {proposal}</span><input value={specimenType} onChange={(event) => setSpecimenType(event.target.value)} required /></label>
          <label className="field"><span>Priority {proposal}</span><select value={priority} onChange={(event) => setPriority(event.target.value as LabPriority)}><option>Routine</option><option>Urgent</option></select></label>
          <label className="field"><span>Surveillance / incident link {proposal}</span><select value={surveillanceContext} onChange={(event) => setSurveillanceContext(event.target.value as SurveillanceContext)}><option>Pre-employment</option><option>Periodic surveillance</option><option>Exit</option><option>Incident</option></select></label>
        </div>
        <fieldset className="choice-fieldset"><legend>Tests requested {proposal}</legend><div className="radio-card-grid">{panels.map((panel) => <label className="radio-card" key={panel}><input type="checkbox" checked={testsRequested.includes(panel)} onChange={() => togglePanel(panel)} /><span>{panel}</span></label>)}</div></fieldset>
        <label className="field"><span>Clinical indication {proposal}</span><textarea rows={4} value={clinicalIndication} onChange={(event) => setClinicalIndication(event.target.value)} required /></label>
        <div className="form-footer"><span>Abnormal values warn and never block result entry.</span><button className="button button-primary" type="submit"><Save size={17} aria-hidden="true" /> Save proposed request</button></div>
      </form>
    </div>
  );
}
