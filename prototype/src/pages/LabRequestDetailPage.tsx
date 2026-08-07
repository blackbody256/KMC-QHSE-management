import { AlertTriangle, ArrowLeft, Beaker, Save } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { effectiveLabRanges } from "../lib/calculations";
import { AppLink, useAppRouter } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";
import type { LabTestResult } from "../types";

const proposal = <span className="proposal-chip">Proposal</span>;

export function LabRequestDetailPage() {
  const { state, currentUser, addLabResult } = useDemoStore();
  const { search } = useAppRouter();
  const requestId = new URLSearchParams(search).get("request");
  const request = state.labRequests.find((item) => item.id === requestId);
  const patient = state.patients.find((item) => item.id === request?.patientId);
  const results = useMemo(
    () => state.labResults.filter((result) => result.requestId === requestId).sort((a, b) => b.resultDate.localeCompare(a.resultDate)),
    [requestId, state.labResults],
  );
  const [resultDate, setResultDate] = useState("2026-08-03");
  const eligibleRanges = request
    ? effectiveLabRanges(state, resultDate).filter((range) => request.testsRequested.includes(range.panel))
    : [];
  const [rangeId, setRangeId] = useState(eligibleRanges[0]?.id ?? "");
  const selectedRange = eligibleRanges.find((range) => range.id === rangeId) ?? eligibleRanges[0];
  const [value, setValue] = useState("");
  const [abnormal, setAbnormal] = useState("No");
  const [verifyingPractitioner, setVerifyingPractitioner] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!request || !patient) {
    return <div><PageHeader eyebrow="Occupational Health" title="Laboratory request not found" description="The requested synthetic record is unavailable." action={<AppLink className="button button-secondary" to="/laboratory"><ArrowLeft size={17} aria-hidden="true" /> Laboratory register</AppLink>} /></div>;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!selectedRange || !value.trim() || !verifyingPractitioner.trim() || !resultDate) {
      setError("Complete each proposed result field and choose an effective reference range.");
      return;
    }
    const result: LabTestResult = {
      id: crypto.randomUUID(),
      requestId: request.id,
      analyte: selectedRange.analyte,
      value: value.trim(),
      unit: selectedRange.unit,
      rangeApplied: {
        referenceRangeId: selectedRange.id,
        displayRange: selectedRange.displayRange,
        unit: selectedRange.unit,
        effectiveFrom: selectedRange.effectiveFrom,
        sourceNote: selectedRange.sourceNote,
      },
      abnormal: abnormal === "Yes",
      verifyingPractitioner: verifyingPractitioner.trim(),
      resultDate,
      createdAt: new Date().toISOString(),
    };
    addLabResult(result);
    setMessage(`${selectedRange.analyte} result saved. Its applied range and abnormality decision are now historical snapshots.`);
    setValue("");
    setAbnormal("No");
  };

  return (
    <div>
      <PageHeader eyebrow="Occupational Health · proposed laboratory workflow" title={`${patient.fullName} · laboratory request`} description={`${request.priority} ${request.surveillanceContext.toLowerCase()} request from visit ${request.visitId}.`} action={<AppLink className="button button-secondary" to="/laboratory"><ArrowLeft size={17} aria-hidden="true" /> Laboratory register</AppLink>} />

      <section className="lab-request-summary">
        <div><span>Requested</span><strong>{formatDateTime(request.requestedAt)}</strong></div>
        <div><span>Specimen</span><strong>{request.specimenType}</strong></div>
        <div><span>Panels</span><strong>{request.testsRequested.join(", ")}</strong></div>
        <div><span>Requesting officer</span><strong>{request.requestingOfficer}</strong></div>
      </section>
      <section className="proposal-callout"><Beaker size={20} aria-hidden="true" /><div><strong>Generic proposal awaiting KMC laboratory forms</strong><span>{request.clinicalIndication}</span></div></section>

      <div className="entry-layout">
        <section className="panel table-panel">
          <div className="panel-heading"><div><div className="eyebrow">One row per analyte</div><h2>Recorded results</h2></div><span className="section-meta">{results.length} results</span></div>
          <div className="table-scroll"><table><thead><tr><th>Analyte</th><th>Value</th><th>Range applied</th><th>Verified</th><th>Flag</th></tr></thead><tbody>
            {results.map((result) => <tr key={result.id}><td><strong>{result.analyte}</strong></td><td className="data-cell">{result.value} {result.unit}</td><td className="data-cell">{result.rangeApplied.displayRange} {result.rangeApplied.unit}<span className="table-secondary">Effective {result.rangeApplied.effectiveFrom}</span></td><td>{result.verifyingPractitioner}<span className="table-secondary">{formatDate(result.resultDate)}</span></td><td><StatusPill status={result.abnormal ? "outside" : "within"} compact label={result.abnormal ? "Abnormal" : "Not flagged abnormal"} /></td></tr>)}
          </tbody></table></div>
          {results.length === 0 && <div className="empty-state"><Beaker size={23} aria-hidden="true" /><strong>No results entered</strong><span>An empty request is no data, not a normal result.</span></div>}
        </section>

        <form className="panel form-panel compact-result-form" onSubmit={submit}>
          <div className="form-section-heading"><div><span className="section-number">R</span><div><h2>Add analyte result</h2><p>Every field is a proposal.</p></div></div></div>
          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}
          <label className="field"><span>Result date {proposal}</span><input type="date" value={resultDate} onChange={(event) => { setResultDate(event.target.value); setRangeId(""); }} required /></label>
          <label className="field"><span>Analyte and effective range {proposal}</span><select value={selectedRange?.id ?? ""} onChange={(event) => setRangeId(event.target.value)} required>{eligibleRanges.map((range) => <option key={range.id} value={range.id}>{range.analyte} · {range.displayRange} {range.unit}</option>)}</select><small>{selectedRange?.sourceNote ?? "No effective range is available."}</small></label>
          <label className="field"><span>Measured value {proposal}</span><input value={value} onChange={(event) => setValue(event.target.value)} required /></label>
          <label className="field"><span>Unit {proposal}</span><input value={selectedRange?.unit || "Not applicable"} readOnly /></label>
          <label className="field"><span>Practitioner abnormality decision {proposal}</span><select value={abnormal} onChange={(event) => setAbnormal(event.target.value)}><option>No</option><option>Yes</option></select><small>The system records the practitioner’s flag; it does not diagnose.</small></label>
          {abnormal === "Yes" && <div className="abnormal-warning"><AlertTriangle size={17} aria-hidden="true" /><span>Abnormal result selected. This warning does not block saving.</span></div>}
          <label className="field"><span>Verifying practitioner {proposal}</span><input value={verifyingPractitioner} onChange={(event) => setVerifyingPractitioner(event.target.value)} required /></label>
          <button className="button button-primary" type="submit" disabled={!selectedRange}><Save size={17} aria-hidden="true" /> Save result</button>
        </form>
      </div>
    </div>
  );
}

const formatDate = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
const formatDateTime = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
