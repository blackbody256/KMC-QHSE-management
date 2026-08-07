import { Factory, Plus, Save } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { readingStatus } from "../lib/calculations";
import { useDemoStore } from "../store/DemoStore";
import type { HygieneParameter, IndustrialHygieneReading } from "../types";

export function IndustrialHygienePage() {
  const { state, addIndustrialHygieneReading } = useDemoStore();
  const isOfficer = state.role === "health-wellness-officer";
  const [showForm, setShowForm] = useState(false);
  const [parameter, setParameter] = useState<HygieneParameter>("PM2.5");
  const [location, setLocation] = useState("");
  const [instrument, setInstrument] = useState("");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const rows = useMemo(
    () => [...state.industrialHygieneReadings].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [state.industrialHygieneReadings],
  );
  const activeLimits = state.hygieneReferenceLimits.filter(
    (limit) => limit.effectiveFrom <= "2026-08-03" && (!limit.effectiveTo || limit.effectiveTo >= "2026-08-03"),
  );
  const selectedLimit = activeLimits.find((limit) => limit.parameter === parameter);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!selectedLimit) {
      setError("No effective reference limit is available for this parameter. Save is blocked until reference data is supplied.");
      return;
    }
    if (!location.trim() || !instrument.trim() || !value || Number(value) < 0) {
      setError("Enter a location, instrument and non-negative measured value.");
      return;
    }
    const now = new Date().toISOString();
    const reading: IndustrialHygieneReading = {
      id: crypto.randomUUID(),
      eventId: crypto.randomUUID(),
      period: now.slice(0, 7),
      recordedAt: now,
      location: location.trim(),
      instrument: instrument.trim(),
      parameter,
      value: Number(value),
      limitReferenceId: selectedLimit.id,
      limitApplied: selectedLimit.limit,
      unit: selectedLimit.unit,
      averagingPeriod: selectedLimit.averagingPeriod,
      context: selectedLimit.context,
      standardFamily: selectedLimit.standardFamily,
      standardVersion: `Effective ${selectedLimit.effectiveFrom}`,
      kpiEligible: selectedLimit.context === "occupational-exposure",
    };
    addIndustrialHygieneReading(reading);
    setMessage(`${parameter} reading saved with a snapshot of the effective reference limit.`);
    setLocation("");
    setInstrument("");
    setValue("");
    setShowForm(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Health and Wellness · Industrial Hygiene"
        title="Industrial hygiene monitoring"
        description="Each measured value stores the effective-dated reference limit applied at entry. Later revisions do not rewrite history."
        action={isOfficer ? <button className="button button-primary" type="button" onClick={() => setShowForm((shown) => !shown)}><Plus size={17} aria-hidden="true" /> Record reading</button> : undefined}
      />

      <section className="provenance-callout">
        <Factory size={20} aria-hidden="true" />
        <div><strong>Reference data, not source constants</strong><span>Proposed occupational limits are effective-dated records. A reading snapshots the selected limit and its version.</span></div>
      </section>

      {showForm && isOfficer && (
        <form className="panel form-panel inline-entry-panel" onSubmit={submit}>
          <div className="form-section-heading"><div><span className="section-number">H</span><div><h2>Industrial hygiene reading</h2><p>Synthetic entry against proposed reference data.</p></div></div></div>
          {error && <div className="form-error">{error}</div>}
          <fieldset className="choice-fieldset">
            <legend>Parameter</legend>
            <div className="radio-card-grid compact-choice-grid">
              {activeLimits.map((limit) => <label className="radio-card" key={limit.id}><input type="radio" name="parameter" checked={parameter === limit.parameter} onChange={() => setParameter(limit.parameter)} /><span>{limit.parameter}</span></label>)}
            </div>
          </fieldset>
          <div className="form-grid two">
            <label className="field"><span>Location</span><input value={location} onChange={(event) => setLocation(event.target.value)} required /></label>
            <label className="field"><span>Instrument</span><input value={instrument} onChange={(event) => setInstrument(event.target.value)} required /></label>
            <label className="field"><span>Measured value · {selectedLimit?.unit ?? "No unit"}</span><input type="number" min="0" step="0.1" value={value} onChange={(event) => setValue(event.target.value)} required /></label>
            <label className="field"><span>Reference · effective-dated</span><input value={selectedLimit ? `${selectedLimit.limit} ${selectedLimit.unit} · effective ${selectedLimit.effectiveFrom}` : "No effective reference"} readOnly /></label>
          </div>
          <div className="form-footer"><span>{selectedLimit?.sourceNote}</span><button className="button button-primary" type="submit"><Save size={17} aria-hidden="true" /> Save reading</button></div>
        </form>
      )}
      {message && <div className="form-success page-message">{message}</div>}

      <section className="panel table-panel">
        <div className="panel-heading"><div><div className="eyebrow">Synthetic register</div><h2>Occupational exposure readings</h2></div><span className="section-meta">{rows.length} readings</span></div>
        <div className="table-scroll"><table><thead><tr><th>Recorded</th><th>Location</th><th>Parameter</th><th>Value / applied limit</th><th>Reference version</th><th>Status</th></tr></thead><tbody>
          {rows.map((reading) => {
            const status = readingStatus(reading);
            return <tr key={reading.id}><td>{formatDate(reading.recordedAt)}</td><td>{reading.location}<span className="table-secondary">{reading.instrument}</span></td><td>{reading.parameter}</td><td className="data-cell">{reading.value} / {reading.limitApplied} {reading.unit}</td><td>{reading.standardFamily}<span className="table-secondary">{reading.standardVersion}</span></td><td><StatusPill status={status} compact label={status === "within" ? "Within limit" : "Outside limit"} /></td></tr>;
          })}
        </tbody></table></div>
      </section>
    </div>
  );
}

const formatDate = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
