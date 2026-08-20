import { Beaker, Eye } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { AppLink } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";
import { labTestByCode } from "../data/labCatalogue";
import type { LabRequisition } from "../types";

const statusPill = (status: LabRequisition["status"]) => {
  switch (status) {
    case "resulted":
      return <StatusPill status="within" compact label="Results recorded" />;
    case "collected":
      return <StatusPill status="provisional" compact label="Specimen collected" />;
    default:
      return <StatusPill status="no-data" compact label="Awaiting specimen" />;
  }
};

export function LaboratoryPage() {
  const { state } = useDemoStore();
  const requisitions = [...state.labRequisitions].sort((a, b) =>
    b.requestDate.localeCompare(a.requestDate),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Occupational Health & Wellness Clinic"
        title="Laboratory"
        description="Requisitions on KMC.DQHSE.05/26-FM008. Results are written against the investigation they were requested for, as the form does."
      />

      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">Synthetic clinical register</div>
            <h2>Requisitions</h2>
          </div>
          <span className="section-meta">Raised from a patient visit</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Staff/ID</th>
                <th>Investigations</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {requisitions.map((requisition) => (
                <tr key={requisition.id}>
                  <td>
                    <strong className="table-primary">{requisition.requestDate}</strong>
                    <span className="table-secondary">{requisition.formNumber}</span>
                  </td>
                  <td>
                    {requisition.patientSnapshot.fullName}
                    <span className="table-secondary">{requisition.patientSnapshot.department || "—"}</span>
                  </td>
                  <td><strong className="data-cell">{requisition.patientSnapshot.staffIdNumber || "—"}</strong></td>
                  <td>
                    {requisition.tests
                      .map((test) => labTestByCode(test.code)?.shortName ?? test.code)
                      .join(", ")}
                  </td>
                  <td>{statusPill(requisition.status)}</td>
                  <td className="table-actions">
                    <AppLink
                      className="button button-secondary button-small"
                      to={`/laboratory/details?request=${requisition.id}`}
                    >
                      <Eye size={15} aria-hidden="true" /> Open
                    </AppLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {requisitions.length === 0 && (
          <div className="empty-state">
            <Beaker size={23} aria-hidden="true" />
            <strong>No requisitions</strong>
            <span>Open a patient visit to raise the first laboratory requisition.</span>
          </div>
        )}
      </section>
    </div>
  );
}
