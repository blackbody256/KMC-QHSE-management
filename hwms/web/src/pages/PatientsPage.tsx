import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { DataValue } from "../components/DataValue";
import { ApiError, clinicalApi, type Patient } from "../lib/api";

export function PatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (search: string) => {
    setLoading(true);
    setError(null);
    try {
      const body = await clinicalApi.listPatients(search);
      setPatients(body.patients);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The registry could not be read. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("");
  }, [load]);

  return (
    <>
      <PageHeader
        title="Patients"
        description="Everyone eligible to attend, whether or not they are an employee. Searching the registry is itself recorded in the access log."
        actions={
          <Link to="/patients/new" className="button-primary">
            <Icon name="person_add" size={18} />
            Register patient
          </Link>
        }
      />

      <section className="panel">
        <div className="panel-head">
          <form
            className="flex w-full max-w-form items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void load(query);
            }}
          >
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
                <Icon name="search" size={18} />
              </span>
              <input
                className="field pl-10"
                placeholder="Name, staff number or department"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search the patient registry"
              />
            </div>
            <button type="submit" className="button-secondary">Search</button>
            {query ? (
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setQuery("");
                  void load("");
                }}
              >
                Clear
              </button>
            ) : null}
          </form>
        </div>

        {loading ? (
          <div className="panel-body text-sm text-ink-muted">Reading the registry…</div>
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
        ) : patients.length === 0 ? (
          <div className="panel-body text-sm text-ink-muted">
            {query
              ? `No patient matches "${query}". Check the spelling, or register the patient.`
              : "No patients registered yet. Register the first one to begin."}
          </div>
        ) : (
          <div className="panel-body pt-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Staff number</th>
                  <th>Department</th>
                  <th>Age</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>
                      <div className="font-medium">{patient.fullName}</div>
                      {patient.jobTitle ? (
                        <div className="text-xs text-ink-muted">{patient.jobTitle}</div>
                      ) : null}
                    </td>
                    <td>
                      {patient.category}
                      {patient.categoryDetail ? (
                        <span className="text-ink-muted"> · {patient.categoryDetail}</span>
                      ) : null}
                    </td>
                    <td>
                      {patient.employeeNumber ? (
                        <span className="data-value">{patient.employeeNumber}</span>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td>{patient.department || <span className="text-ink-faint">—</span>}</td>
                    <td>
                      <DataValue value={patient.age} />
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* Opening the record is the primary action. Reaching
                            for a patient usually means "what happened to this
                            person", and only sometimes "start a new visit". */}
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() =>
                            navigate(`/patients/record?id=${encodeURIComponent(patient.id)}`)
                          }
                        >
                          Open record
                        </button>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() =>
                            navigate(`/patient-visits/new?patientId=${encodeURIComponent(patient.id)}`)
                          }
                        >
                          Start visit
                        </button>
                      </div>
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
