import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { StatusIndicator, type Status } from "../components/StatusIndicator";
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

export function LaboratoryPage() {
  const navigate = useNavigate();
  const [requisitions, setRequisitions] = useState<LabRequisition[]>([]);
  const [catalogue, setCatalogue] = useState<LabCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [list, cat] = await Promise.all([labApi.list(), labApi.catalogue()]);
        setRequisitions(list.requisitions);
        setCatalogue(cat);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Requisitions could not be read. Try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const shortName = (code: string) =>
    catalogue?.tests.find((test) => test.code === code)?.shortName ?? code;

  return (
    <>
      <PageHeader
        title="Laboratory"
        description={`Requisitions on ${catalogue?.formNumber ?? "KMC.DQHSE.05/26-FM008"}. Results are written against the investigation they were requested for, as the form does.`}
        actions={
          <Link to="/patient-visits" className="button-secondary">
            <Icon name="assignment" size={18} />
            Raise from a visit
          </Link>
        }
      />

      <section className="panel">
        {loading ? (
          <div className="panel-body text-sm text-ink-muted">Reading requisitions…</div>
        ) : error ? (
          <div className="panel-body">
            <div
              className="flex items-start gap-3 rounded border px-4 py-3 text-sm"
              style={{ borderColor: "var(--breach)", background: "var(--breach-wash)", color: "var(--breach)" }}
              role="alert"
            >
              <Icon name="error" size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        ) : requisitions.length === 0 ? (
          <div className="panel-body text-sm text-ink-muted">
            No requisitions yet. Open a patient visit and raise the first one, patient information
            comes from the visit, so it is never typed twice.
          </div>
        ) : (
          <div className="panel-body pt-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Staff/ID</th>
                  <th>Investigations</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.map((requisition) => {
                  const state = statusFor(requisition.status);
                  return (
                    <tr key={requisition.id}>
                      <td><span className="data-value">{requisition.requestDate}</span></td>
                      <td>
                        <div className="font-medium">{requisition.patientSnapshot.fullName}</div>
                        <div className="text-xs text-ink-muted">
                          {requisition.patientSnapshot.department || "—"}
                        </div>
                      </td>
                      <td>
                        {requisition.patientSnapshot.staffIdNumber ? (
                          <span className="data-value">{requisition.patientSnapshot.staffIdNumber}</span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td>{requisition.tests.map((test) => shortName(test.code)).join(", ")}</td>
                      <td><StatusIndicator status={state.status} label={state.label} /></td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => navigate(`/laboratory/details?id=${encodeURIComponent(requisition.id)}`)}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
