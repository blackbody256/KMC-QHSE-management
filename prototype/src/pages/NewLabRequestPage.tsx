import { FlaskConical, Info } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { AppLink, useAppRouter } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";
import { labTestGroups, labTestsInGroup } from "../data/labCatalogue";
import type { LabRequisition, LabTestCode } from "../types";

/**
 * Laboratory requisition — KMC.DQHSE.05/26-FM008.
 *
 * The officer completes patient information, ticks the investigations, writes
 * the clinical summary and authorises. The Results column and the "For
 * Laboratory Use Only" block belong to the laboratory and are completed on the
 * requisition page afterwards, exactly as the paper form divides the work.
 */
export function NewLabRequestPage() {
  const { state, currentUser, upsertLabRequisition } = useDemoStore();
  const { search, navigate } = useAppRouter();
  const visitId = new URLSearchParams(search).get("visit");
  const visit = state.visits.find((item) => item.id === visitId);
  const patient = state.patients.find((item) => item.id === visit?.patientId);

  const [selected, setSelected] = useState<LabTestCode[]>([]);
  const [clinicalSummary, setClinicalSummary] = useState("");
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [error, setError] = useState("");

  const toggle = (code: LabTestCode) =>
    setSelected((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );

  if (!visit || !patient) {
    return (
      <div>
        <PageHeader
          eyebrow="Occupational Health · laboratory"
          title="Laboratory requisition"
          description="A requisition is raised from a patient visit, so patient information is never typed twice."
        />
        <section className="panel">
          <div className="empty-state">
            <FlaskConical size={23} aria-hidden="true" />
            <strong>Open a visit first</strong>
            <span>Choose a visit from the patient visit register, then raise the requisition from it.</span>
            <AppLink className="button button-secondary button-small" to="/patient-visits">
              Go to patient visits
            </AppLink>
          </div>
        </section>
      </div>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (selected.length === 0) {
      setError("Tick at least one investigation before sending the requisition.");
      return;
    }
    if (!signatureConfirmed) {
      setError("Confirm the authorising officer's signature, as the printed form requires.");
      return;
    }

    const now = new Date().toISOString();
    const requisition: LabRequisition = {
      id: `lab-req-${Date.now()}`,
      formNumber: "KMC.DQHSE.05/26-FM008",
      visitId: visit.id,
      patientId: patient.id,
      status: "requested",
      // A snapshot, as the printed form is. A later correction to the registry
      // must not silently rewrite a requisition already sent to the laboratory.
      patientSnapshot: {
        fullName: patient.fullName,
        staffIdNumber: patient.employeeNumber ?? "",
        department: patient.department ?? "",
        gender: patient.sex,
        ageOrDob: String(patient.age),
      },
      requestDate: visit.visitDate,
      tests: selected.map((code) => ({ code, result: "" })),
      clinicalSummary,
      authorisedBy: currentUser?.title ?? "Health and Wellness Officer",
      authorisedSignatureConfirmed: true,
      createdAt: now,
      updatedAt: now,
    };

    upsertLabRequisition(requisition);
    navigate(`/laboratory/details?request=${requisition.id}`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Occupational Health & Wellness Clinic"
        title="Laboratory requisition"
        description="KMC.DQHSE.05/26-FM008. Complete and authorise the request; the laboratory records the specimen and the results."
        action={
          <AppLink className="button button-secondary" to="/laboratory">
            Back to laboratory
          </AppLink>
        }
      />

      <form className="panel referral-form" onSubmit={submit}>
        <section className="form-section">
          <div className="form-section-heading">
            <div>
              <span className="section-number">1</span>
              <div><h2>Patient information</h2></div>
            </div>
          </div>
          <div className="vitals-summary referral-vitals">
            <div><span>Full name</span><strong>{patient.fullName}</strong></div>
            <div><span>Staff/ID number</span><strong>{patient.employeeNumber || "—"}</strong></div>
            <div><span>Department</span><strong>{patient.department || "—"}</strong></div>
            <div><span>Date</span><strong>{visit.visitDate}</strong></div>
            <div><span>Gender</span><strong>{patient.sex}</strong></div>
            <div><span>Age</span><strong>{patient.age}</strong></div>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <div>
              <span className="section-number">2</span>
              <div><h2>Requested investigations</h2></div>
            </div>
            <span className="table-secondary">{selected.length} selected</span>
          </div>

          {labTestGroups.map((group, index) => (
            <fieldset className="choice-fieldset" key={group}>
              <legend>{index + 1}. {group}</legend>
              <div className="radio-card-grid compact-choice-grid">
                {labTestsInGroup(group).map((test) => (
                  <label className="radio-card" key={test.code}>
                    <input
                      type="checkbox"
                      checked={selected.includes(test.code)}
                      onChange={() => toggle(test.code)}
                    />
                    <span>
                      {test.shortName} ({test.fullName})
                      {test.preparationNote ? (
                        <small className="table-secondary">
                          <Info size={12} aria-hidden="true" /> {test.preparationNote}
                        </small>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <div>
              <span className="section-number">3</span>
              <div><h2>Clinical summary / notes</h2></div>
            </div>
          </div>
          <label className="field">
            <span>Clinical summary</span>
            <textarea
              rows={4}
              value={clinicalSummary}
              onChange={(event) => setClinicalSummary(event.target.value)}
              placeholder="Why these investigations are being requested."
            />
          </label>
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={signatureConfirmed}
              onChange={(event) => setSignatureConfirmed(event.target.checked)}
            />
            <span>
              Authorised health officer signature confirmed — {currentUser?.title ?? "Health and Wellness Officer"}
            </span>
          </label>
        </section>

        {error && <div className="form-error">{error}</div>}

        <div className="form-footer">
          <span>The laboratory completes the specimen block and the results.</span>
          <button className="button button-primary" type="submit">
            <FlaskConical size={17} aria-hidden="true" /> Send requisition
          </button>
        </div>
      </form>
    </div>
  );
}
