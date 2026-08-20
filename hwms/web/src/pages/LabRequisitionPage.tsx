import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { StatusIndicator, type Status } from "../components/StatusIndicator";
import { downloadLabRequisitionPdf } from "../lib/labPdf";
import { ApiError, labApi, type LabCatalogue, type LabRequisition } from "../lib/api";

const statusFor = (status: LabRequisition["status"]): { status: Status; label: string } => {
  switch (status) {
    case "resulted":
      return { status: "within", label: "Results recorded" };
    case "collected":
      return { status: "provisional", label: "Specimen collected" };
    default:
      return { status: "no-data", label: "Awaiting specimen" };
  }
};

/**
 * A requisition, and the laboratory's half of the form.
 *
 * Results are recorded as the laboratory reported them. Nothing here decides
 * whether a value is abnormal: the form defines no units and no reference
 * ranges, and inventing one would put a clinical judgement in the software's
 * mouth. Whether the laboratory wants structured ranges is an open question
 * for them, not a gap to be filled in code.
 */
export function LabRequisitionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";

  const [requisition, setRequisition] = useState<LabRequisition | null>(null);
  const [catalogue, setCatalogue] = useState<LabCatalogue | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [specimen, setSpecimen] = useState<string[]>([]);
  const [collectedBy, setCollectedBy] = useState("");
  const [timeOfCollection, setTimeOfCollection] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [record, cat] = await Promise.all([labApi.get(id), labApi.catalogue()]);
      setRequisition(record);
      setCatalogue(cat);
      setResults(Object.fromEntries(record.tests.map((test) => [test.code, test.result])));
      setSpecimen(record.specimenCollected);
      setCollectedBy(record.collectedBy ?? "");
      setTimeOfCollection(record.timeOfCollection ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The requisition could not be read.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) void load();
  }, [id, load]);

  const toggleSpecimen = (value: string) =>
    setSpecimen((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const updated = await labApi.recordResults(id, {
        results,
        specimenCollected: specimen,
        collectedBy,
        timeOfCollection,
      });
      setRequisition(updated);
      setSavedAt(new Date().toTimeString().slice(0, 5));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The requisition could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="py-12 text-sm text-ink-muted">Reading the requisition…</div>;

  if (!requisition || !catalogue) {
    return (
      <div className="max-w-form py-12">
        <div
          className="flex items-start gap-3 rounded border px-4 py-3 text-sm"
          style={{ borderColor: "var(--breach)", background: "var(--breach-wash)", color: "var(--breach)" }}
          role="alert"
        >
          <Icon name="error" size={18} className="mt-0.5 shrink-0" />
          <span>{error ?? "That requisition does not exist."}</span>
        </div>
      </div>
    );
  }

  const state = statusFor(requisition.status);
  const definition = (code: string) => catalogue.tests.find((test) => test.code === code);

  return (
    <>
      <PageHeader
        title="Laboratory requisition"
        description={`${requisition.formNumber} · ${requisition.patientSnapshot.fullName}`}
        actions={
          <>
            <button
              type="button"
              className="button-secondary"
              onClick={() => downloadLabRequisitionPdf(requisition, catalogue)}
            >
              <Icon name="download" size={16} />
              Download form
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => navigate(`/patients/record?id=${encodeURIComponent(requisition.patientId)}`)}
            >
              <Icon name="arrow_back" size={16} />
              Patient record
            </button>
          </>
        }
      />

      <div className="mb-6"><StatusIndicator status={state.status} label={state.label} /></div>

      <section className="panel mb-6">
        <div className="panel-head"><h2 className="text-lg">Patient information</h2></div>
        <div className="panel-body grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-ink-muted">Staff/ID number</div>
            <div className="data-value">{requisition.patientSnapshot.staffIdNumber || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-ink-muted">Department</div>
            <div>{requisition.patientSnapshot.department || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-ink-muted">Date</div>
            <div className="data-value">{requisition.requestDate}</div>
          </div>
          <div>
            <div className="text-xs text-ink-muted">Gender</div>
            <div>{requisition.patientSnapshot.gender}</div>
          </div>
          <div>
            <div className="text-xs text-ink-muted">Age/DOB</div>
            <div className="data-value">{requisition.patientSnapshot.ageOrDob}</div>
          </div>
          <div>
            <div className="text-xs text-ink-muted">Authorised by</div>
            <div>{requisition.authorisedBy}</div>
          </div>
        </div>
      </section>

      <section className="panel mb-6">
        <div className="panel-head">
          <h2 className="text-lg">Requested investigations and results</h2>
          <span className="text-xs text-ink-muted">As reported by the laboratory</span>
        </div>
        <div className="panel-body space-y-4">
          {requisition.tests.map((test) => {
            const meta = definition(test.code);
            return (
              <div key={test.code} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-4 border-b border-rule pb-4 last:border-b-0 last:pb-0">
                <div>
                  <div className="text-sm font-medium">{meta?.shortName ?? test.code}</div>
                  <div className="text-xs text-ink-muted">{meta?.fullName}</div>
                  {meta?.preparationNote ? (
                    <div className="mt-1 flex items-center gap-1 text-xs" style={{ color: "var(--caution)" }}>
                      <Icon name="info" size={14} />
                      {meta.preparationNote}
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="label" htmlFor={`result-${test.code}`}>Result</label>
                  <textarea
                    id={`result-${test.code}`}
                    className="field min-h-[64px]"
                    value={results[test.code] ?? ""}
                    onChange={(e) => setResults((current) => ({ ...current, [test.code]: e.target.value }))}
                    onBlur={() => void save()}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel mb-6">
        <div className="panel-head"><h2 className="text-lg">Clinical summary / notes</h2></div>
        <div className="panel-body text-sm text-ink-muted">
          {requisition.clinicalSummary || "None recorded."}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="text-lg">For laboratory use only</h2>
          {savedAt ? <span className="text-xs text-ink-faint">Saved {savedAt}</span> : null}
        </div>
        <div className="panel-body space-y-4">
          <fieldset>
            <legend className="label">Specimen collected</legend>
            <div className="flex flex-wrap gap-2">
              {catalogue.specimenTypes.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded border px-3 py-2"
                  style={{
                    borderColor: specimen.includes(option) ? "var(--focus)" : "var(--rule)",
                    background: specimen.includes(option) ? "var(--info-wash)" : "var(--surface)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={specimen.includes(option)}
                    onChange={() => toggleSpecimen(option)}
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="collectedBy">Collected by</label>
              <input
                id="collectedBy"
                className="field"
                value={collectedBy}
                onChange={(e) => setCollectedBy(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="timeOfCollection">Time of collection</label>
              <input
                id="timeOfCollection"
                type="time"
                className="field data-value"
                value={timeOfCollection}
                onChange={(e) => setTimeOfCollection(e.target.value)}
              />
            </div>
          </div>

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

          <button type="button" className="button-primary" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save requisition"}
          </button>
        </div>
      </section>
    </>
  );
}
