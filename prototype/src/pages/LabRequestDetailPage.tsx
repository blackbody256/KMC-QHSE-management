import { ArrowLeft, Download, Info, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { AppLink, useAppRouter } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";
import { labSpecimenTypes, labTestByCode } from "../data/labCatalogue";
import { downloadLabRequisitionPdf } from "../lib/labPdf";
import { roleCanEdit } from "../lib/access";
import type { LabSpecimenType } from "../types";

/**
 * A requisition, and the laboratory's half of the form.
 *
 * The Results column and the "For Laboratory Use Only" block are the
 * laboratory's to complete. Results are recorded as written: the form carries
 * no units and no reference ranges, so the system stores what the laboratory
 * reported and does not decide whether it is abnormal. That judgement needs a
 * range KMC has not defined, and inventing one would put a clinical decision
 * in the software's mouth.
 */
export function LabRequestDetailPage() {
  const { state, upsertLabRequisition } = useDemoStore();
  const { search } = useAppRouter();
  const requestId = new URLSearchParams(search).get("request");
  const requisition = state.labRequisitions.find((item) => item.id === requestId);
  const canEdit = roleCanEdit(state.role);

  const [results, setResults] = useState<Record<string, string>>(
    () => Object.fromEntries((requisition?.tests ?? []).map((test) => [test.code, test.result])),
  );
  const [specimens, setSpecimens] = useState<LabSpecimenType[]>(
    requisition?.specimenCollected ?? [],
  );
  const [collectedBy, setCollectedBy] = useState(requisition?.collectedBy ?? "");
  const [timeOfCollection, setTimeOfCollection] = useState(requisition?.timeOfCollection ?? "");
  const [saved, setSaved] = useState("");

  if (!requisition) {
    return (
      <div>
        <PageHeader
          eyebrow="Occupational Health · laboratory"
          title="Requisition not found"
          description="The requisition may have been reset with the demonstration data."
        />
        <AppLink className="button button-secondary" to="/laboratory">
          <ArrowLeft size={16} aria-hidden="true" /> Back to laboratory
        </AppLink>
      </div>
    );
  }

  const toggleSpecimen = (value: LabSpecimenType) =>
    setSpecimens((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );

  const save = (event: FormEvent) => {
    event.preventDefault();
    const now = new Date().toISOString();
    const tests = requisition.tests.map((test) => {
      const value = (results[test.code] ?? "").trim();
      return {
        code: test.code,
        result: value,
        resultedAt: value ? (test.resultedAt ?? now) : undefined,
      };
    });

    const anyResult = tests.some((test) => test.result !== "");
    const specimenRecorded = specimens.length > 0;

    upsertLabRequisition({
      ...requisition,
      tests,
      specimenCollected: specimenRecorded ? specimens : undefined,
      collectedBy: collectedBy || undefined,
      timeOfCollection: timeOfCollection || undefined,
      status: anyResult ? "resulted" : specimenRecorded ? "collected" : "requested",
      updatedAt: now,
    });
    setSaved(new Date().toTimeString().slice(0, 5));
  };

  return (
    <div>
      <PageHeader
        eyebrow="Occupational Health & Wellness Clinic"
        title="Laboratory requisition"
        description={`${requisition.formNumber} · ${requisition.patientSnapshot.fullName}`}
        action={
          <>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => downloadLabRequisitionPdf(requisition)}
            >
              <Download size={16} aria-hidden="true" /> Download form
            </button>
            <AppLink className="button button-secondary" to="/laboratory">
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </AppLink>
          </>
        }
      />

      <section className="panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">Patient information</div>
            <h2>{requisition.patientSnapshot.fullName}</h2>
          </div>
          {requisition.status === "resulted" ? (
            <StatusPill status="within" compact label="Results recorded" />
          ) : requisition.status === "collected" ? (
            <StatusPill status="provisional" compact label="Specimen collected" />
          ) : (
            <StatusPill status="no-data" compact label="Awaiting specimen" />
          )}
        </div>
        <div className="vitals-summary referral-vitals">
          <div><span>Staff/ID number</span><strong>{requisition.patientSnapshot.staffIdNumber || "—"}</strong></div>
          <div><span>Department</span><strong>{requisition.patientSnapshot.department || "—"}</strong></div>
          <div><span>Date</span><strong>{requisition.requestDate}</strong></div>
          <div><span>Gender</span><strong>{requisition.patientSnapshot.gender}</strong></div>
          <div><span>Age/DOB</span><strong>{requisition.patientSnapshot.ageOrDob}</strong></div>
          <div><span>Authorised by</span><strong>{requisition.authorisedBy}</strong></div>
        </div>
      </section>

      <form className="panel referral-form" onSubmit={save}>
        <section className="form-section">
          <div className="form-section-heading">
            <div>
              <span className="section-number">2</span>
              <div><h2>Requested investigations and results</h2></div>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Investigation</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {requisition.tests.map((test) => {
                  const definition = labTestByCode(test.code);
                  return (
                    <tr key={test.code}>
                      <td>
                        <strong className="table-primary">{definition?.shortName ?? test.code}</strong>
                        <span className="table-secondary">{definition?.fullName}</span>
                        {definition?.preparationNote ? (
                          <span className="table-secondary">
                            <Info size={12} aria-hidden="true" /> {definition.preparationNote}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <label className="field">
                          <span className="table-secondary">As reported by the laboratory</span>
                          <textarea
                            rows={2}
                            disabled={!canEdit}
                            value={results[test.code] ?? ""}
                            onChange={(event) =>
                              setResults((current) => ({ ...current, [test.code]: event.target.value }))
                            }
                          />
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <div>
              <span className="section-number">3</span>
              <div><h2>Clinical summary / notes</h2></div>
            </div>
          </div>
          <p className="table-secondary">{requisition.clinicalSummary || "None recorded."}</p>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <div>
              <span className="section-number">4</span>
              <div><h2>For laboratory use only</h2></div>
            </div>
          </div>
          <fieldset className="choice-fieldset">
            <legend>Specimen collected</legend>
            <div className="radio-card-grid compact-choice-grid">
              {labSpecimenTypes.map((option) => (
                <label className="radio-card" key={option}>
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={specimens.includes(option)}
                    onChange={() => toggleSpecimen(option)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-grid two">
            <label className="field">
              <span>Collected by</span>
              <input
                value={collectedBy}
                disabled={!canEdit}
                onChange={(event) => setCollectedBy(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Time of collection</span>
              <input
                type="time"
                value={timeOfCollection}
                disabled={!canEdit}
                onChange={(event) => setTimeOfCollection(event.target.value)}
              />
            </label>
          </div>
        </section>

        {canEdit ? (
          <div className="form-footer">
            <span>{saved ? `Saved ${saved}` : "Results are recorded as the laboratory reports them."}</span>
            <button className="button button-primary" type="submit">
              <Save size={17} aria-hidden="true" /> Save requisition
            </button>
          </div>
        ) : (
          <div className="form-footer">
            <span>This role can view the requisition but not record results.</span>
          </div>
        )}
      </form>
    </div>
  );
}
