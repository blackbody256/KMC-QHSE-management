import {
  ArrowLeft,
  BriefcaseMedical,
  Beaker,
  CalendarDays,
  Clock3,
  FileCheck2,
  HeartPulse,
  Plus,
  Send,
  UserRound,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionStatusLabel } from "../components/StatusPill";
import { AppLink, useAppRouter } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";
import type { VitalSigns } from "../types";

const sectionLabels: Record<string, string> = {
  complaint: "Presenting complaint",
  history: "History of present illness",
  medical: "Past medical history",
  surgical: "Past surgical history",
  medication: "Medication history",
  occupational: "Occupational health history",
  vitals: "Vital signs",
  examination: "General and systemic examination",
  investigations: "Investigations",
  impression: "Clinical impression",
  treatment: "Treatment",
};

const sectionOrder = Object.keys(sectionLabels);

export function VisitDetailPage() {
  const { state } = useDemoStore();
  const { search } = useAppRouter();
  const visitId = new URLSearchParams(search).get("visit");
  const visit = state.visits.find((item) => item.id === visitId);
  const patient = state.patients.find((item) => item.id === visit?.patientId);

  if (!visit || !patient) {
    return (
      <div>
        <PageHeader
          eyebrow="Health and Wellness Officer area"
          title="Visit not found"
          description="The requested demonstration visit is not available."
          action={
            <AppLink className="button button-secondary" to="/patient-visits">
              <ArrowLeft size={17} aria-hidden="true" />
              Back to visits
            </AppLink>
          }
        />
      </div>
    );
  }

  const patientVisitCount = state.visits.filter((item) => item.patientId === patient.id).length;

  return (
    <div>
      <PageHeader
        eyebrow="Health and Wellness Officer clinical record"
        title="Visit details"
        description="Review the complete stored record before making a follow-up decision."
        action={
          <div className="button-group">
            <AppLink
              className="button button-secondary"
              to={`/patient-visits?patient=${patient.id}`}
            >
              <ArrowLeft size={17} aria-hidden="true" />
              Patient history
            </AppLink>
            <AppLink
              className="button button-primary"
              to={`/patient-visits/new?patient=${patient.id}`}
            >
              <Plus size={17} aria-hidden="true" />
              New follow-up
            </AppLink>
          </div>
        }
      />

      <section className="patient-history-header">
        <span className="avatar history-avatar">
          <UserRound size={24} aria-hidden="true" />
        </span>
        <div className="patient-history-identity">
          <span>Patient</span>
          <h2>{patient.fullName}</h2>
          <p>
            {patient.sex} · {patient.age} years · {patient.category}
            {patient.employeeNumber ? ` · ${patient.employeeNumber}` : ""}
          </p>
        </div>
        <div className="patient-history-count">
          <strong>{patientVisitCount}</strong>
          <span>{patientVisitCount === 1 ? "recorded visit" : "recorded visits"}</span>
        </div>
      </section>

      <section className="visit-detail-summary">
        <div>
          <CalendarDays size={18} aria-hidden="true" />
          <span>Date</span>
          <strong>{formatDate(visit.visitDate)}</strong>
        </div>
        <div>
          <Clock3 size={18} aria-hidden="true" />
          <span>Time in</span>
          <strong>{visit.timeIn}</strong>
        </div>
        <div>
          <BriefcaseMedical size={18} aria-hidden="true" />
          <span>Visit type</span>
          <strong>{visit.visitType}</strong>
        </div>
        <div>
          <HeartPulse size={18} aria-hidden="true" />
          <span>Work-related</span>
          <strong>{visit.workRelated}</strong>
        </div>
        <div>
          <FileCheck2 size={18} aria-hidden="true" />
          <span>Record state</span>
          <strong>{visit.state === "signed" ? "Signed" : "Draft"}</strong>
        </div>
      </section>

      <section className="visit-linked-actions" aria-label="Actions from this visit">
        <div>
          <strong>Continue this clinical workflow</strong>
          <span>Patient identity and recorded vitals are carried forward from this visit.</span>
        </div>
        <div className="button-group">
          <AppLink className="button button-secondary" to={`/laboratory/new?visit=${visit.id}`}>
            <Beaker size={17} aria-hidden="true" />
            Raise laboratory request
          </AppLink>
          <AppLink className="button button-primary" to={`/referrals/new?visit=${visit.id}`}>
            <Send size={17} aria-hidden="true" />
            Raise medical referral
          </AppLink>
        </div>
      </section>

      <div className="visit-detail-layout">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Clinical documentation</div>
              <h2>Recorded sections</h2>
            </div>
            <span className="section-meta">Read-only history</span>
          </div>
          <div className="clinical-record-sections">
            {sectionOrder.map((key, index) => {
              const section = visit.sections[key] ?? {
                status: "not-recorded" as const,
                notes: "",
              };
              const hasVitals = key === "vitals" && Object.values(visit.vitals).some(Boolean);
              return (
                <article className="clinical-record-section" key={key}>
                  <div className="clinical-record-heading">
                    <span className="section-index">{index + 1}</span>
                    <strong>{sectionLabels[key]}</strong>
                    <SectionStatusLabel status={section.status} />
                  </div>
                  {section.selections && section.selections.length > 0 && (
                    <div className="recorded-choice-list">
                      {section.selections.map((selection) => (
                        <span key={selection}>{selection}</span>
                      ))}
                    </div>
                  )}
                  {key === "vitals" && hasVitals && <VitalsSummary vitals={visit.vitals} />}
                  {section.notes ? (
                    <p>{section.notes}</p>
                  ) : !section.selections?.length && !hasVitals ? (
                    <p className="empty-record">No details recorded in this section.</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="panel record-audit-panel">
          <div className="eyebrow">Record information</div>
          <h2>{visit.state === "signed" ? "Signed clinical record" : "Draft clinical record"}</h2>
          <dl>
            <div>
              <dt>Clinician</dt>
              <dd>{visit.clinician}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDateTime(visit.createdAt)}</dd>
            </div>
            <div>
              <dt>Signed</dt>
              <dd>{visit.signedAt ? formatDateTime(visit.signedAt) : "Not yet signed"}</dd>
            </div>
          </dl>
          <p>
            Signed records are displayed as read-only. Production amendments should be appended
            without overwriting the original record.
          </p>
        </aside>
      </div>
    </div>
  );
}

function VitalsSummary({ vitals }: { vitals: VitalSigns }) {
  const rows = [
    ["Blood pressure", vitals.bloodPressure, "mmHg"],
    ["Pulse", vitals.pulse, "bpm"],
    ["Respiratory rate", vitals.respiratoryRate, "/min"],
    ["Temperature", vitals.temperature, "°C"],
    ["SpO₂", vitals.spo2, "%"],
    ["Weight", vitals.weightKg, "kg"],
    ["Height", vitals.heightCm, "cm"],
    ["Pain score", vitals.painScore, "/10"],
  ].filter(([, value]) => value !== undefined && value !== "");
  return (
    <div className="vitals-summary">
      {rows.map(([label, value, unit]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>
            {value} {unit}
          </strong>
        </div>
      ))}
    </div>
  );
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
