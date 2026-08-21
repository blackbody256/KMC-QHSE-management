import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import {
  ApiError,
  clinicalApi,
  labApi,
  type LabCatalogue,
  type Patient,
  type Visit,
} from "../lib/api";

/**
 * Raising a laboratory requisition, KMC.DQHSE.05/26-FM008.
 *
 * The officer completes patient information, ticks the investigations, writes
 * the clinical summary and authorises. The Results column and the "For
 * Laboratory Use Only" block belong to the laboratory and are completed on the
 * requisition page afterwards, exactly as the paper form divides the work.
 *
 * The investigation list comes from the service. The interface keeps no copy
 * of it: two lists would eventually disagree, and the one that disagreed
 * silently would be the one a clinician ticked.
 */
export function NewLabRequestPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const visitId = params.get("visitId") ?? "";

  const [catalogue, setCatalogue] = useState<LabCatalogue | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [clinicalSummary, setClinicalSummary] = useState("");
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cat = await labApi.catalogue();
        setCatalogue(cat);
        if (visitId) {
          const visitBody = await clinicalApi.getVisit(visitId);
          setVisit(visitBody.visit);
          setPatient(await clinicalApi.getPatient(visitBody.visit.patientId));
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "The visit could not be read. Try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [visitId]);

  const toggle = (code: string) =>
    setSelected((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!visit || !patient) return;
    setError(null);
    setSaving(true);
    try {
      const created = await labApi.create({
        visitId: visit.id,
        patientId: patient.id,
        // A snapshot, as the printed form is. A later correction to the
        // registry must not silently rewrite a form already with the lab.
        patientSnapshot: {
          fullName: patient.fullName,
          staffIdNumber: patient.employeeNumber ?? "",
          department: patient.department ?? "",
          gender: patient.sex,
          ageOrDob: String(patient.age),
        },
        requestDate: visit.visitDate,
        testCodes: selected,
        clinicalSummary,
        authorisedSignatureConfirmed: signatureConfirmed,
      });
      navigate(`/laboratory/details?id=${encodeURIComponent(created.id)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The requisition could not be raised. Try again.");
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
          title="Laboratory requisition"
          description="A requisition is raised from a patient visit, so patient information is never typed twice."
        />
        <section className="panel">
          <div className="panel-body space-y-4 text-sm text-ink-muted">
            <p>Open a patient visit and raise the requisition from there.</p>
            <button type="button" className="button-secondary" onClick={() => navigate("/patient-visits")}>
              <Icon name="arrow_back" size={16} />
              Go to patient visits
            </button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Laboratory requisition"
        description={`${catalogue?.formNumber ?? ""} · Occupational Health & Wellness Clinic`}
      />

      <form className="max-w-form space-y-6" onSubmit={submit}>
        <section className="panel">
          <div className="panel-head">
            <h2 className="text-lg">Patient information</h2>
            <span className="text-xs text-ink-muted">Taken from the visit</span>
          </div>
          <div className="panel-body grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-ink-muted">Full name</div>
              <div className="font-medium">{patient.fullName}</div>
            </div>
            <div>
              <div className="text-xs text-ink-muted">Staff/ID number</div>
              <div className="data-value">{patient.employeeNumber || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-ink-muted">Department</div>
              <div>{patient.department || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-ink-muted">Date</div>
              <div className="data-value">{visit.visitDate}</div>
            </div>
            <div>
              <div className="text-xs text-ink-muted">Gender</div>
              <div>{patient.sex}</div>
            </div>
            <div>
              <div className="text-xs text-ink-muted">Age</div>
              <div className="data-value">{patient.age}</div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="text-lg">Requested investigations</h2>
            <span className="text-xs text-ink-muted">
              <span className="data-value">{selected.length}</span> selected
            </span>
          </div>
          <div className="panel-body space-y-5">
            {catalogue?.groups.map((group, index) => (
              <fieldset key={group}>
                <legend className="label">
                  <span className="data-value">{index + 1}.</span> {group}
                </legend>
                <div className="space-y-2">
                  {catalogue.tests
                    .filter((test) => test.group === group)
                    .map((test) => (
                      <label
                        key={test.code}
                        className="flex cursor-pointer gap-3 rounded border p-3"
                        style={{
                          borderColor: selected.includes(test.code) ? "var(--focus)" : "var(--rule)",
                          background: selected.includes(test.code) ? "var(--info-wash)" : "var(--surface)",
                        }}
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selected.includes(test.code)}
                          onChange={() => toggle(test.code)}
                        />
                        <span>
                          <span className="block text-sm font-medium">{test.shortName}</span>
                          <span className="mt-0.5 block text-xs text-ink-muted">{test.fullName}</span>
                          {test.preparationNote ? (
                            <span
                              className="mt-1 flex items-center gap-1 text-xs font-medium"
                              style={{ color: "var(--caution)" }}
                            >
                              <Icon name="info" size={14} />
                              {test.preparationNote}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))}
                </div>
              </fieldset>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="text-lg">Clinical summary / notes</h2>
          </div>
          <div className="panel-body space-y-4">
            <textarea
              className="field min-h-[110px]"
              value={clinicalSummary}
              onChange={(e) => setClinicalSummary(e.target.value)}
              placeholder="Why these investigations are being requested."
              aria-label="Clinical summary"
            />
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={signatureConfirmed}
                onChange={(e) => setSignatureConfirmed(e.target.checked)}
              />
              <span>
                <span className="font-medium">Authorised health officer signature confirmed</span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  The printed form carries a signature block. A requisition without it is not a
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
            <Icon name="science" size={18} />
            {saving ? "Sending…" : "Send requisition"}
          </button>
          <button type="button" className="button-secondary" onClick={() => navigate("/laboratory")}>
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
