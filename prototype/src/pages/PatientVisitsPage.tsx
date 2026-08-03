import { ArrowLeft, Eye, FileHeart, LockKeyhole, Plus } from "lucide-react";
import { useMemo } from "react";
import { PageHeader } from "../components/PageHeader";
import { SectionStatusLabel } from "../components/StatusPill";
import { AppLink, useAppRouter } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";

export function PatientVisitsPage() {
  const { state } = useDemoStore();
  const { search } = useAppRouter();
  const patientId = new URLSearchParams(search).get("patient");
  const selectedPatient = state.patients.find((item) => item.id === patientId);
  const visits = useMemo(
    () =>
      state.visits
        .filter((visit) => !patientId || visit.patientId === patientId)
        .sort((a, b) => `${b.visitDate}${b.timeIn}`.localeCompare(`${a.visitDate}${a.timeIn}`)),
    [patientId, state.visits],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Health and Wellness Officer area"
        title={selectedPatient ? `${selectedPatient.fullName}'s visit history` : "Patient visits"}
        description={
          selectedPatient
            ? "Open any previous visit to review its clinical details or begin a follow-up."
            : "Each visit is a separate clinical record attached to a patient."
        }
        action={
          <div className="button-group">
            {selectedPatient && (
              <AppLink className="button button-secondary" to="/patient-visits">
                <ArrowLeft size={17} aria-hidden="true" />
                All visits
              </AppLink>
            )}
            <AppLink
              className="button button-primary"
              to={
                selectedPatient
                  ? `/patient-visits/new?patient=${selectedPatient.id}`
                  : "/patient-visits/new"
              }
            >
              <Plus size={17} aria-hidden="true" />
              {selectedPatient ? "New follow-up" : "Record patient visit"}
            </AppLink>
          </div>
        }
      />
      <section className="panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">Synthetic register</div>
            <h2>Recent visits</h2>
          </div>
          <span className="section-meta">{visits.length} visits</span>
        </div>
        <div className="visit-list">
          {visits.map((visit) => {
            const patient = state.patients.find((item) => item.id === visit.patientId);
            const completed = Object.values(visit.sections).filter(
              (section) => section.status === "complete" || section.status === "not-indicated",
            ).length;
            return (
              <article className="visit-row" key={visit.id}>
                <div className="visit-icon">
                  <FileHeart size={19} aria-hidden="true" />
                </div>
                <div className="visit-person">
                  <strong>{patient?.fullName ?? "Unknown synthetic patient"}</strong>
                  <span>
                    {patient?.category} · {visit.visitType}
                  </span>
                </div>
                <div>
                  <span className="table-secondary">Visit date</span>
                  <strong className="table-primary">{formatDate(visit.visitDate)} · {visit.timeIn}</strong>
                </div>
                <div>
                  <span className="table-secondary">Sections resolved</span>
                  <strong className="table-primary">
                    {completed}/{Object.keys(visit.sections).length}
                  </strong>
                </div>
                <div className="visit-state">
                  {visit.state === "signed" ? (
                    <span className="signed-chip">
                      <LockKeyhole size={14} aria-hidden="true" />
                      Signed
                    </span>
                  ) : (
                    <SectionStatusLabel status="partial" />
                  )}
                </div>
                <AppLink
                  className="button button-secondary button-small"
                  to={`/patient-visits/details?visit=${visit.id}`}
                >
                  <Eye size={15} aria-hidden="true" />
                  View details
                </AppLink>
              </article>
            );
          })}
          {visits.length === 0 && (
            <div className="empty-state">
              <FileHeart size={23} aria-hidden="true" />
              <strong>No visits recorded</strong>
              <span>Start the first visit for this synthetic patient.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
