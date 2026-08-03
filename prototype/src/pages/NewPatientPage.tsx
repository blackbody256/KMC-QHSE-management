import { ArrowLeft, Save, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { AppLink, useAppRouter } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";
import type { Patient, PatientCategory } from "../types";

const initialForm = {
  fullName: "",
  age: "",
  sex: "Female" as Patient["sex"],
  phone: "",
  category: "Employee" as PatientCategory,
  categoryDetail: "",
  employeeNumber: "",
  department: "",
  division: "",
  unit: "",
  jobTitle: "",
};

export function NewPatientPage() {
  const { addPatient } = useDemoStore();
  const { navigate } = useAppRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.fullName.trim() || !form.age || Number(form.age) <= 0) {
      setError("Enter the patient's name and an age greater than zero.");
      return;
    }
    const patient: Patient = {
      id: crypto.randomUUID(),
      fullName: form.fullName.trim(),
      age: Number(form.age),
      sex: form.sex,
      phone: form.phone.trim() || undefined,
      category: form.category,
      categoryDetail:
        form.category === "Other" && form.categoryDetail.trim()
          ? form.categoryDetail.trim()
          : undefined,
      employeeNumber:
        form.category === "Employee" && form.employeeNumber.trim()
          ? form.employeeNumber.trim()
          : undefined,
      department: form.department.trim() || undefined,
      division: form.division.trim() || undefined,
      unit: form.unit.trim() || undefined,
      jobTitle: form.jobTitle.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    addPatient(patient);
    navigate(`/patient-visits/new?patient=${patient.id}`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Doctor-only area"
        title="Register patient"
        description="Only the minimum identity and organisational information needed for this demonstration."
        action={
          <AppLink className="button button-secondary" to="/patients">
            <ArrowLeft size={17} aria-hidden="true" />
            Back to patients
          </AppLink>
        }
      />
      <div className="form-layout">
        <form className="panel form-panel" onSubmit={submit}>
          <div className="form-section-heading">
            <div>
              <span className="section-number">1</span>
              <div>
                <h2>Biodata</h2>
                <p>Fields follow the supplied KVP Infirmary form.</p>
              </div>
            </div>
            <span className="required-note">* Required</span>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="form-grid two">
            <label className="field field-span-2">
              <span>Full name *</span>
              <input
                value={form.fullName}
                onChange={(event) => update("fullName", event.target.value)}
                autoFocus
              />
            </label>
            <label className="field">
              <span>Age in years *</span>
              <input
                type="number"
                min="1"
                max="120"
                value={form.age}
                onChange={(event) => update("age", event.target.value)}
              />
            </label>
            <fieldset className="quick-fieldset">
              <legend>Sex *</legend>
              <div className="choice-row">
                {(["Female", "Male"] as const).map((value) => (
                  <label className={`choice-pill${form.sex === value ? " selected" : ""}`} key={value}>
                    <input
                      type="radio"
                      name="patient-sex"
                      value={value}
                      checked={form.sex === value}
                      onChange={() => update("sex", value)}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="quick-fieldset">
              <legend>Patient category *</legend>
              <div className="choice-row">
                {(["Employee", "Intern", "Other"] as const).map((value) => (
                  <label
                    className={`choice-pill${form.category === value ? " selected" : ""}`}
                    key={value}
                  >
                    <input
                      type="radio"
                      name="patient-category"
                      value={value}
                      checked={form.category === value}
                      onChange={() => update("category", value)}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {form.category === "Other" && (
              <label className="field field-span-2 conditional-field">
                <span>Specify patient category</span>
                <input
                  value={form.categoryDetail}
                  onChange={(event) => update("categoryDetail", event.target.value)}
                  placeholder="Contractor, visitor, service provider…"
                />
                <small>Additional treated populations require stakeholder confirmation.</small>
              </label>
            )}
            <label className="field">
              <span>Phone contact</span>
              <input value={form.phone} onChange={(event) => update("phone", event.target.value)} />
            </label>
            {form.category === "Employee" && (
              <label className="field field-span-2">
                <span>Staff number</span>
                <input
                  value={form.employeeNumber}
                  onChange={(event) => update("employeeNumber", event.target.value)}
                  placeholder="Optional in this prototype"
                />
              </label>
            )}
          </div>
          <div className="subsection-title">Organisation</div>
          <div className="form-grid two">
            <label className="field">
              <span>Department</span>
              <input
                value={form.department}
                onChange={(event) => update("department", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Division</span>
              <input
                value={form.division}
                onChange={(event) => update("division", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Unit / section</span>
              <input value={form.unit} onChange={(event) => update("unit", event.target.value)} />
            </label>
            <label className="field">
              <span>Job title</span>
              <input
                value={form.jobTitle}
                onChange={(event) => update("jobTitle", event.target.value)}
              />
            </label>
          </div>
          <div className="form-footer">
            <span>Saving continues directly to a new patient visit.</span>
            <button className="button button-primary" type="submit">
              <Save size={17} aria-hidden="true" />
              Save and start visit
            </button>
          </div>
        </form>
        <aside className="side-guidance">
          <ShieldCheck size={22} aria-hidden="true" />
          <h2>Prototype privacy note</h2>
          <p>
            This browser stores synthetic names locally. A production registry requires approved
            identity rules, privacy notices, retention, access controls, and audit.
          </p>
        </aside>
      </div>
    </div>
  );
}
