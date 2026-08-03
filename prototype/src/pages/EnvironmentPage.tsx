import { Beaker, Info, Plus, Save, Wind } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { readingStatus } from "../lib/calculations";
import { useDemoStore } from "../store/DemoStore";
import type {
  EnvironmentalParameter,
  EnvironmentalReading,
} from "../types";

const DEFINITIONS: Record<
  EnvironmentalParameter,
  {
    limit: number;
    unit: "µg/m³" | "dB(A)";
    averagingPeriod: string;
    instrument: string;
  }
> = {
  "PM2.5": {
    limit: 35,
    unit: "µg/m³",
    averagingPeriod: "24-hour",
    instrument: "Particulate meter · PM-01",
  },
  PM10: {
    limit: 60,
    unit: "µg/m³",
    averagingPeriod: "24-hour",
    instrument: "Particulate meter · PM-01",
  },
  "Noise · day": {
    limit: 75,
    unit: "dB(A)",
    averagingPeriod: "Day period",
    instrument: "Sound meter · SM-02",
  },
  "Noise · night": {
    limit: 70,
    unit: "dB(A)",
    averagingPeriod: "Night period",
    instrument: "Sound meter · SM-02",
  },
};

export function EnvironmentPage() {
  const { state, addEnvironmentalReading } = useDemoStore();
  const [parameter, setParameter] = useState<EnvironmentalParameter>("PM2.5");
  const [value, setValue] = useState("");
  const [location, setLocation] = useState("Assembly hall");
  const [recordedAt, setRecordedAt] = useState("2026-07-30T10:15");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const definition = DEFINITIONS[parameter];

  const recent = useMemo(
    () =>
      [...state.environmentalReadings]
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
        .slice(0, 14),
    [state.environmentalReadings],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!value || Number(value) < 0) {
      setError("Enter a measured value of zero or greater.");
      return;
    }
    const id = crypto.randomUUID();
    const reading: EnvironmentalReading = {
      id,
      eventId: `monitor-${id}`,
      period: recordedAt.slice(0, 7),
      recordedAt,
      location,
      instrument: definition.instrument,
      parameter,
      value: Number(value),
      limit: definition.limit,
      unit: definition.unit,
      averagingPeriod: definition.averagingPeriod,
      standardFamily: "Illustrative NEMA reference · approval pending",
    };
    addEnvironmentalReading(reading);
    setMessage(
      `${parameter} reading saved as ${
        readingStatus(reading) === "within" ? "within" : "outside"
      } the illustrative limit.`,
    );
    setValue("");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Operational monitoring"
        title="Environment"
        description="Capture the measurement method and standard context, not just a number."
        action={
          <button className="button button-primary" type="button" onClick={() => document.getElementById("new-reading")?.scrollIntoView()}>
            <Plus size={17} aria-hidden="true" />
            Record reading
          </button>
        }
      />
      <section className="standards-warning">
        <Info size={20} aria-hidden="true" />
        <div>
          <strong>Illustrative limits — environmental approval required</strong>
          <span>
            Ambient, indoor, and occupational-exposure standards use different methods. Production
            must store the approved standard family, sampling period, instrument, and calibration.
          </span>
        </div>
      </section>

      <div className="entry-layout" id="new-reading">
        <form className="panel form-panel" onSubmit={submit}>
          <div className="form-section-heading">
            <div>
              <span className="section-number">
                <Wind size={18} aria-hidden="true" />
              </span>
              <div>
                <h2>Record monitoring reading</h2>
                <p>PM2.5 and PM10 reflect the instrument discussed in the interview.</p>
              </div>
            </div>
          </div>
          {error && <div className="form-error">{error}</div>}
          {message && <div className="form-success">{message}</div>}
          <div className="form-grid two">
            <label className="field">
              <span>Parameter</span>
              <select
                value={parameter}
                onChange={(event) => setParameter(event.target.value as EnvironmentalParameter)}
              >
                {Object.keys(DEFINITIONS).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Location</span>
              <select value={location} onChange={(event) => setLocation(event.target.value)}>
                <option>Assembly hall</option>
                <option>Paint shop perimeter</option>
                <option>Administration block</option>
                <option>Stores and logistics</option>
              </select>
            </label>
            <label className="field">
              <span>Date and time</span>
              <input
                type="datetime-local"
                value={recordedAt}
                onChange={(event) => setRecordedAt(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Instrument</span>
              <input value={definition.instrument} readOnly className="derived-input" />
            </label>
            <label className="field">
              <span>Measured value</span>
              <div className="unit-input">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  autoFocus
                />
                <span>{definition.unit}</span>
              </div>
            </label>
            <label className="field">
              <span>Illustrative limit</span>
              <div className="unit-input">
                <input value={definition.limit} readOnly className="derived-input" />
                <span>{definition.unit}</span>
              </div>
              <small>{definition.averagingPeriod} · approval pending</small>
            </label>
          </div>
          <label className="field">
            <span>Standard family</span>
            <input
              value="Illustrative NEMA reference · ambient/workplace classification to confirm"
              readOnly
              className="derived-input"
            />
          </label>
          <div className="form-footer">
            <span>The stored result updates K4 and the dashboard limit view.</span>
            <button className="button button-primary" type="submit">
              <Save size={17} aria-hidden="true" />
              Save reading
            </button>
          </div>
        </form>
        <aside className="side-guidance">
          <Beaker size={22} aria-hidden="true" />
          <h2>Production evidence</h2>
          <p>A defensible reading needs more than value and unit.</p>
          <ul>
            <li>Instrument and calibration</li>
            <li>Sampling duration and method</li>
            <li>Location and operating condition</li>
            <li>Applicable standard version</li>
          </ul>
        </aside>
      </div>

      <section className="panel section-spacing">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">Synthetic monitoring log</div>
            <h2>Recent readings</h2>
          </div>
          <span className="section-meta">{state.environmentalReadings.length} total</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Measured</th>
                <th>Illustrative limit</th>
                <th>Location and instrument</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((reading) => {
                const status = readingStatus(reading);
                return (
                  <tr key={reading.id}>
                    <td>
                      <strong className="table-primary">{reading.parameter}</strong>
                      <span className="table-secondary">{reading.averagingPeriod}</span>
                    </td>
                    <td className="data-cell strong">
                      {reading.value} {reading.unit}
                    </td>
                    <td className="data-cell">
                      {reading.limit} {reading.unit}
                    </td>
                    <td>
                      <strong className="table-primary">{reading.location}</strong>
                      <span className="table-secondary">{reading.instrument}</span>
                    </td>
                    <td>
                      <StatusPill
                        status={status}
                        compact
                        label={status === "within" ? "Within limit" : "Outside limit"}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
