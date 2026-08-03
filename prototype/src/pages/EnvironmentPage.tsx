import { Factory, Leaf, Plus, Save, Split } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { ResearchCards, type ResearchCardItem } from "../components/ResearchCards";
import { StatusPill } from "../components/StatusPill";
import { readingStatus } from "../lib/calculations";
import { useDemoStore } from "../store/DemoStore";
import type { EnvironmentalParameter, EnvironmentalReading, MonitoringContext } from "../types";

const definitions: Record<EnvironmentalParameter, { limit: number; unit: "µg/m³" | "dB(A)"; averagingPeriod: string }> = {
  "PM2.5": { limit: 35, unit: "µg/m³", averagingPeriod: "24-hour" },
  "PM10": { limit: 60, unit: "µg/m³", averagingPeriod: "24-hour" },
  "Noise · day": { limit: 75, unit: "dB(A)", averagingPeriod: "Day period" },
  "Noise · night": { limit: 70, unit: "dB(A)", averagingPeriod: "Night period" },
};

const environmentResearch: ResearchCardItem[] = [
  { title: "Legal register and audits", records: "Candidate obligations, permits, consent conditions, audit findings and renewal ownership.", question: "Which permits and consents does KMC hold and who owns renewal?", owner: "Environment and Sustainability" },
  { title: "Water, effluent and waste", records: "Candidate abstraction, discharge, effluent, waste stream, quantity and disposal evidence.", question: "Which discharge points, waste streams and reporting schedules are controlled today?", owner: "Environment and Sustainability" },
  { title: "Emissions, energy and greenhouse gas", records: "Candidate stack/fugitive emissions, energy sources and future GHG inventory boundaries.", question: "Which measurements are current obligations and which are future intentions?", owner: "Environment and Sustainability" },
  { title: "Biodiversity and environmental incidents", records: "Candidate land/biodiversity controls, spills, releases, response and corrective actions.", question: "What sites and environmental incident thresholds are in scope?", owner: "Environment and Sustainability" },
];

export function EnvironmentPage({ mode }: { mode: "industrial" | "environment" }) {
  const { state, addEnvironmentalReading } = useDemoStore();
  const isOfficer = state.role === "health-wellness-officer";
  const allowedContexts: MonitoringContext[] = mode === "industrial"
    ? ["occupational-exposure", "indoor-workplace"]
    : ["ambient-environmental"];
  const [showForm, setShowForm] = useState(false);
  const [context, setContext] = useState<MonitoringContext>(allowedContexts[0]);
  const [parameter, setParameter] = useState<EnvironmentalParameter>("PM2.5");
  const [location, setLocation] = useState("");
  const [instrument, setInstrument] = useState("");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const rows = useMemo(
    () => state.environmentalReadings.filter((reading) => allowedContexts.includes(reading.context)),
    [state.environmentalReadings, mode],
  );

  const standardFamily = context === "ambient-environmental"
    ? "Ambient environmental reference · approval pending"
    : "Occupational exposure reference · approval pending";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!allowedContexts.includes(context)) {
      setError("This context does not belong to the current unit view.");
      return;
    }
    if (!location.trim() || !instrument.trim() || !value || Number(value) < 0) {
      setError("Enter a location, instrument and non-negative measured value.");
      return;
    }
    const definition = definitions[parameter];
    const now = new Date().toISOString();
    const reading: EnvironmentalReading = {
      id: crypto.randomUUID(),
      eventId: crypto.randomUUID(),
      period: now.slice(0, 7),
      recordedAt: now,
      location: location.trim(),
      instrument: instrument.trim(),
      parameter,
      value: Number(value),
      limit: definition.limit,
      unit: definition.unit,
      averagingPeriod: definition.averagingPeriod,
      context,
      standardFamily,
      standardVersion: "Illustrative v2026-07",
      k4Eligible: context === "occupational-exposure",
    };
    addEnvironmentalReading(reading);
    setMessage(`${parameter} reading saved to the shared register with ${contextLabel(context)} context.`);
    setLocation("");
    setInstrument("");
    setValue("");
    setShowForm(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow={mode === "industrial" ? "Health and Wellness · Industrial Hygiene" : "Environment and Sustainability"}
        title={mode === "industrial" ? "Industrial hygiene monitoring" : "Ambient monitoring and unit research"}
        description="One shared register, separated by required measurement context and the matching standard family."
        action={isOfficer ? <button className="button button-primary" type="button" onClick={() => setShowForm((value) => !value)}><Plus size={17} aria-hidden="true" /> Record reading</button> : undefined}
      />

      <section className="provenance-callout">
        <Split size={20} aria-hidden="true" />
        <div>
          <strong>Shared parameter does not mean shared limit</strong>
          <span>Occupational exposure asks what a worker encounters; ambient monitoring asks what the facility releases. Context selects the standard family before evaluation.</span>
        </div>
      </section>

      {showForm && isOfficer && (
        <form className="panel form-panel inline-entry-panel" onSubmit={submit}>
          <div className="form-section-heading"><div><span className="section-number">R</span><div><h2>Shared monitoring reading</h2><p>The standard family is fixed by context and cannot be mixed manually.</p></div></div></div>
          {error && <div className="form-error">{error}</div>}
          <fieldset className="choice-fieldset">
            <legend>Monitoring context</legend>
            <div className="radio-card-grid compact-choice-grid">
              {allowedContexts.map((item) => <label className="radio-card" key={item}><input type="radio" name="monitoring-context" checked={context === item} onChange={() => setContext(item)} /><span>{contextLabel(item)}</span></label>)}
            </div>
          </fieldset>
          <fieldset className="choice-fieldset">
            <legend>Parameter</legend>
            <div className="radio-card-grid compact-choice-grid">
              {(Object.keys(definitions) as EnvironmentalParameter[]).map((item) => <label className="radio-card" key={item}><input type="radio" name="parameter" checked={parameter === item} onChange={() => setParameter(item)} /><span>{item}</span></label>)}
            </div>
          </fieldset>
          <div className="form-grid two">
            <label className="field"><span>Location</span><input value={location} onChange={(event) => setLocation(event.target.value)} required /></label>
            <label className="field"><span>Instrument</span><input value={instrument} onChange={(event) => setInstrument(event.target.value)} required /></label>
            <label className="field"><span>Measured value · {definitions[parameter].unit}</span><input type="number" min="0" step="0.1" value={value} onChange={(event) => setValue(event.target.value)} required /></label>
            <label className="field"><span>Standard family · set from context</span><input value={standardFamily} readOnly /></label>
          </div>
          <div className="form-footer"><span>{context === "occupational-exposure" ? "Eligible for proposed K4." : "Displayed in its unit view and excluded from K4."}</span><button className="button button-primary" type="submit"><Save size={17} aria-hidden="true" /> Save reading</button></div>
        </form>
      )}
      {message && <div className="form-success page-message">{message}</div>}

      <section className="panel table-panel">
        <div className="panel-heading">
          <div><div className="eyebrow">Contextual view of one register</div><h2>{mode === "industrial" ? "Occupational and indoor readings" : "Ambient/environmental readings"}</h2></div>
          <span className="section-meta">{rows.length} synthetic readings</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Context</th><th>Recorded</th><th>Location</th><th>Parameter</th><th>Value / limit</th><th>Standard family</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((reading) => {
                const status = readingStatus(reading);
                return <tr key={reading.id}><td><strong className="table-primary">{contextLabel(reading.context)}</strong>{reading.k4Eligible && <span className="table-secondary">K4 eligible</span>}</td><td>{formatDate(reading.recordedAt)}</td><td>{reading.location}</td><td>{reading.parameter}</td><td>{reading.value} / {reading.limit} {reading.unit}</td><td>{reading.standardFamily}<span className="table-secondary">{reading.standardVersion}</span></td><td><StatusPill status={status} compact label={status === "within" ? "Within limit" : "Outside limit"} /></td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      {mode === "environment" && <ResearchCards heading="Environment and Sustainability scope" description="Ambient monitoring is a contextual view over the shared register. All other functions below await the unit owner." items={environmentResearch} />}
    </div>
  );
}

const contextLabel = (context: MonitoringContext) => ({
  "occupational-exposure": "Occupational exposure",
  "indoor-workplace": "Indoor workplace",
  "ambient-environmental": "Ambient / environmental",
})[context];

const formatDate = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
