import { History, Plus, Search, Stethoscope, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { AppLink } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";

export function PatientsPage() {
  const { state } = useDemoStore();
  const [query, setQuery] = useState("");
  const patients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return state.patients;
    return state.patients.filter((patient) =>
      [
        patient.fullName,
        patient.employeeNumber,
        patient.department,
        patient.category,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [query, state.patients]);

  return (
    <div>
      <PageHeader
        eyebrow="Health and Wellness Officer area"
        title="Patients"
        description="Find an existing patient or register someone before recording a visit."
        action={
          <AppLink className="button button-primary" to="/patients/new">
            <Plus size={17} aria-hidden="true" />
            Register patient
          </AppLink>
        }
      />
      <section className="privacy-callout">
        <Stethoscope size={20} aria-hidden="true" />
        <div>
          <strong>Clinical identity is restricted in the proposed design</strong>
          <span>This screen is completely absent from Manager and Director workflows.</span>
        </div>
      </section>
      <section className="panel">
        <div className="toolbar">
          <label className="search-control">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search patients</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, staff number, department…"
            />
          </label>
          <span className="section-meta">{patients.length} synthetic patients</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Category</th>
                <th>Staff number</th>
                <th>Organisation</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <div className="person-cell">
                      <span className="avatar">
                        <UserRound size={17} aria-hidden="true" />
                      </span>
                      <div>
                        <strong>{patient.fullName}</strong>
                        <span>
                          {patient.sex} · {patient.age} years
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="category-chip">{patient.category}</span>
                  </td>
                  <td className="data-cell">{patient.employeeNumber || "—"}</td>
                  <td>
                    <strong className="table-primary">{patient.department || "Not recorded"}</strong>
                    <span className="table-secondary">
                      {[patient.unit, patient.jobTitle].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </td>
                  <td className="table-actions">
                    <div className="button-group table-button-group">
                      <AppLink
                        className="button button-secondary button-small"
                        to={`/patient-visits?patient=${patient.id}`}
                      >
                        <History size={15} aria-hidden="true" />
                        History
                      </AppLink>
                      <AppLink
                        className="button button-primary button-small"
                        to={`/patient-visits/new?patient=${patient.id}`}
                      >
                        Start visit
                      </AppLink>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
