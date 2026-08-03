import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { daysBetween } from "../lib/calculations";
import { useDemoStore } from "../store/DemoStore";

export function LicencesPage() {
  const { state } = useDemoStore();
  return (
    <div>
      <PageHeader
        eyebrow="Proposed compliance reminder"
        title="Medical certification register"
        description="Tracks evidence that the infirmary and its health professionals are authorised to provide services."
      />
      <section className="plain-language-callout">
        <ShieldCheck size={22} aria-hidden="true" />
        <div>
          <strong>This does not mean employee driving licences</strong>
          <span>
            It is a proposed reminder for the infirmary's operating approval and each clinician's
            professional practising registration, including renewal dates. If these records are
            managed elsewhere or are not required, stakeholders can remove this module.
          </span>
        </div>
      </section>
      <section className="standards-warning">
        <AlertTriangle size={20} aria-hidden="true" />
        <div>
          <strong>KMC must confirm whether this register is needed</strong>
          <span>
            Before production, the Division must name the required document, issuing authority,
            accountable owner, renewal evidence, and warning period.
          </span>
        </div>
      </section>
      <div className="licence-grid">
        {state.licences.map((licence) => {
          const days = daysBetween("2026-07-30", licence.expiryDate);
          const status = days < 0 ? "outside" : days <= 60 ? "approaching" : "within";
          return (
            <article className="licence-card" key={licence.id}>
              <div className="licence-icon">
                {licence.type === "Infirmary" ? (
                  <Building2 size={22} aria-hidden="true" />
                ) : (
                  <BadgeCheck size={22} aria-hidden="true" />
                )}
              </div>
              <div className="licence-type">
                {licence.type === "Infirmary"
                  ? "Facility authorisation"
                  : "Professional registration"}
              </div>
              <h2>{licence.holder}</h2>
              <p>{licence.credential}</p>
              <dl>
                <div>
                  <dt>Issuing authority</dt>
                  <dd>{licence.authority}</dd>
                </div>
                <div>
                  <dt>Valid from</dt>
                  <dd>{formatDate(licence.issueDate)}</dd>
                </div>
                <div>
                  <dt>Expires</dt>
                  <dd>{formatDate(licence.expiryDate)}</dd>
                </div>
              </dl>
              <div className="licence-footer">
                <StatusPill
                  status={status}
                  label={
                    days < 0
                      ? `Expired ${Math.abs(days)} days ago`
                      : days <= 60
                        ? `Expires in ${days} days`
                        : `Valid · ${days} days remaining`
                  }
                />
              </div>
            </article>
          );
        })}
      </div>
      <section className="panel section-spacing">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">Proposed control</div>
            <h2>Renewal timeline</h2>
          </div>
          <CalendarClock size={20} aria-hidden="true" />
        </div>
        <div className="renewal-steps">
          <div>
            <strong>90 days</strong>
            <span>Begin renewal preparation</span>
          </div>
          <div>
            <strong>60 days</strong>
            <span>Escalate missing application</span>
          </div>
          <div>
            <strong>30 days</strong>
            <span>Prominent dashboard alert</span>
          </div>
          <div>
            <strong>Expiry</strong>
            <span>Show breach until superseded</span>
          </div>
        </div>
      </section>
    </div>
  );
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
