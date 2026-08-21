import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { StatusIndicator } from "../components/StatusIndicator";
import { ApiError, clinicalApi, type Patient, type Visit } from "../lib/api";

export function PatientVisitsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const patientId = params.get("patientId") ?? "";

  const [visits, setVisits] = useState<Visit[]>([]);
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [visitBody, patientBody] = await Promise.all([
          clinicalApi.listVisits(patientId),
          clinicalApi.listPatients(),
        ]);
        if (cancelled) return;
        setVisits(visitBody.visits);
        setPatients(Object.fromEntries(patientBody.patients.map((p) => [p.id, p])));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Visits could not be read. Try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const patientName = patientId ? patients[patientId]?.fullName : undefined;

  return (
    <>
      <PageHeader
        title={patientName ? `Visits, ${patientName}` : "Patient visits"}
        description="Clinic attendances in the order of the paper form. Signing locks the record; correction is by appended amendment."
        actions={
          <Link
            to={patientId ? `/patient-visits/new?patientId=${encodeURIComponent(patientId)}` : "/patient-visits/new"}
            className="button-primary"
          >
            <Icon name="add" size={18} />
            Record visit
          </Link>
        }
      />

      {patientId ? (
        <div className="mb-4">
          <Link to="/patient-visits" className="button-secondary">
            <Icon name="arrow_back" size={16} />
            All visits
          </Link>
        </div>
      ) : null}

      <section className="panel">
        {loading ? (
          <div className="panel-body text-sm text-ink-muted">Reading visits…</div>
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
        ) : visits.length === 0 ? (
          <div className="panel-body text-sm text-ink-muted">
            No visits recorded{patientName ? ` for ${patientName}` : ""} yet. Record the first one to
            begin.
          </div>
        ) : (
          <div className="panel-body pt-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Type</th>
                  <th>Work related</th>
                  <th>State</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <tr key={visit.id}>
                    <td>
                      <span className="data-value">{visit.visitDate}</span>
                      {visit.timeIn ? (
                        <span className="ml-2 text-xs text-ink-muted data-value">{visit.timeIn}</span>
                      ) : null}
                    </td>
                    <td>{patients[visit.patientId]?.fullName ?? <span className="text-ink-faint">—</span>}</td>
                    <td>{visit.visitType}</td>
                    <td>{visit.workRelated}</td>
                    <td>
                      <StatusIndicator
                        status={visit.state === "signed" ? "within" : "provisional"}
                        label={visit.state === "signed" ? "Signed" : "Draft"}
                      />
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => navigate(`/patient-visits/details?id=${encodeURIComponent(visit.id)}`)}
                      >
                        {visit.state === "signed" ? "Review" : "Continue"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
