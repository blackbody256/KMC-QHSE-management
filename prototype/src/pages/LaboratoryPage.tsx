import { Beaker, Eye, FilePlus2, FlaskConical } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { AppLink } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";

export function LaboratoryPage() {
  const { state } = useDemoStore();
  const requests = [...state.labRequests].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  return (
    <div>
      <PageHeader
        eyebrow="Occupational Health · proposed laboratory workflow"
        title="Laboratory testing"
        description="Requests and one-row-per-analyte results are separated. The field set remains a proposal until KMC laboratory forms arrive."
      />
      <section className="proposal-callout">
        <FlaskConical size={20} aria-hidden="true" />
        <div><strong>Proposal awaiting the actual laboratory forms</strong><span>Panels, specimen choices, analytes and reference ranges shown here are generic occupational health examples—not approved KMC clinical content.</span></div>
      </section>

      <section className="panel table-panel">
        <div className="panel-heading">
          <div><div className="eyebrow">Synthetic clinical register</div><h2>Test requests</h2></div>
          <span className="section-meta">Raise a request from a patient visit</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Requested</th><th>Patient</th><th>Tests</th><th>Context</th><th>Results</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {requests.map((request) => {
                const patient = state.patients.find((item) => item.id === request.patientId);
                const resultCount = state.labResults.filter((result) => result.requestId === request.id).length;
                const hasAbnormal = state.labResults.some((result) => result.requestId === request.id && result.abnormal);
                return (
                  <tr key={request.id}>
                    <td><strong className="table-primary">{formatDateTime(request.requestedAt)}</strong><span className="table-secondary">{request.priority}</span></td>
                    <td>{patient?.fullName ?? "Unknown synthetic patient"}<span className="table-secondary">Visit {request.visitId}</span></td>
                    <td>{request.testsRequested.join(", ")}</td>
                    <td>{request.surveillanceContext}</td>
                    <td><strong className="data-cell">{resultCount}</strong>{hasAbnormal ? <StatusPill status="outside" compact label="Abnormal recorded" /> : resultCount ? <StatusPill status="within" compact label="No abnormal flag" /> : <StatusPill status="no-data" compact label="No results" />}</td>
                    <td className="table-actions"><AppLink className="button button-secondary button-small" to={`/laboratory/details?request=${request.id}`}><Eye size={15} aria-hidden="true" /> Open</AppLink></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {requests.length === 0 && <div className="empty-state"><Beaker size={23} aria-hidden="true" /><strong>No test requests</strong><span>Open a signed visit to raise the first proposed request.</span></div>}
      </section>

      <section className="panel reference-data-panel">
        <div className="panel-heading"><div><div className="eyebrow">Effective-dated proposal</div><h2>Reference range catalogue</h2></div><span className="provenance">{state.labReferenceRanges.length} proposed analytes</span></div>
        <p className="panel-footnote"><FilePlus2 size={16} aria-hidden="true" /> A saved result snapshots the range applied. Changing this catalogue never changes an old abnormality flag.</p>
      </section>
    </div>
  );
}

const formatDateTime = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
