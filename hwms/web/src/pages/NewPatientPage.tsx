import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { ApiError, clinicalApi, type PatientCategory } from "../lib/api";

const categories: { value: PatientCategory; label: string; description: string }[] = [
  { value: "Employee", label: "Employee", description: "On the Kiira Motors payroll." },
  { value: "Intern", label: "Intern", description: "On attachment or industrial training." },
  {
    value: "Other",
    label: "Other",
    description: "Contractor, visitor or another category. Describe it below.",
  },
];

/**
 * Registering a patient.
 *
 * Only four things are required: name, age, sex and category. Organisational
 * details are optional and the staff number is optional for every category,
 * per FR-PAT-04. Emergency presentation must never be blocked by data entry —
 * a patient who cannot be registered is a patient treated with no record at
 * all, which is worse than an incomplete one.
 */
export function NewPatientPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    age: "",
    sex: "" as "" | "Female" | "Male",
    phone: "",
    category: "" as "" | PatientCategory,
    categoryDetail: "",
    employeeNumber: "",
    department: "",
    division: "",
    unit: "",
    jobTitle: "",
  });

  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const created = await clinicalApi.createPatient({
        fullName: form.fullName,
        age: Number(form.age),
        sex: form.sex as "Female" | "Male",
        phone: form.phone,
        category: form.category as PatientCategory,
        categoryDetail: form.categoryDetail,
        employeeNumber: form.employeeNumber,
        department: form.department,
        division: form.division,
        unit: form.unit,
        jobTitle: form.jobTitle,
      });
      navigate(`/patient-visits/new?patientId=${encodeURIComponent(created.id)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The patient could not be registered. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Register patient"
        description="Name, age, sex and category are enough to register. Everything else can follow — care is never blocked by data entry."
      />

      <form className="max-w-form space-y-6" onSubmit={submit}>
        <section className="panel">
          <div className="panel-head">
            <h2 className="text-lg">Identity</h2>
          </div>
          <div className="panel-body space-y-4">
            <div>
              <label className="label" htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                className="field"
                value={form.fullName}
                onChange={(e) => set({ fullName: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="age">Age</label>
                <input
                  id="age"
                  type="number"
                  min={0}
                  max={149}
                  className="field data-value"
                  value={form.age}
                  onChange={(e) => set({ age: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="phone">Phone contact</label>
                <input
                  id="phone"
                  className="field"
                  value={form.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                />
              </div>
            </div>

            <fieldset>
              <legend className="label">Sex</legend>
              <div className="flex gap-3">
                {(["Female", "Male"] as const).map((value) => (
                  <label
                    key={value}
                    className="flex flex-1 cursor-pointer items-center gap-2 rounded border px-3 py-2"
                    style={{
                      borderColor: form.sex === value ? "var(--focus)" : "var(--rule)",
                      background: form.sex === value ? "var(--info-wash)" : "var(--surface)",
                    }}
                  >
                    <input
                      type="radio"
                      name="sex"
                      value={value}
                      checked={form.sex === value}
                      onChange={() => set({ sex: value })}
                      required
                    />
                    <span className="text-sm">{value}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="label">Patient category</legend>
              <div className="space-y-2">
                {categories.map((category) => (
                  <label
                    key={category.value}
                    className="flex cursor-pointer gap-3 rounded border p-3"
                    style={{
                      borderColor: form.category === category.value ? "var(--focus)" : "var(--rule)",
                      background: form.category === category.value ? "var(--info-wash)" : "var(--surface)",
                    }}
                  >
                    <input
                      type="radio"
                      name="category"
                      className="mt-1"
                      value={category.value}
                      checked={form.category === category.value}
                      onChange={() => set({ category: category.value })}
                      required
                    />
                    <span>
                      <span className="block text-sm font-medium">{category.label}</span>
                      <span className="mt-0.5 block text-xs text-ink-muted">{category.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {form.category === "Other" ? (
              <div>
                <label className="label" htmlFor="categoryDetail">Describe the category</label>
                <input
                  id="categoryDetail"
                  className="field"
                  placeholder="Contractor, visitor, dependant…"
                  value={form.categoryDetail}
                  onChange={(e) => set({ categoryDetail: e.target.value })}
                />
              </div>
            ) : null}

            {form.category === "Employee" ? (
              <div>
                <label className="label" htmlFor="employeeNumber">Staff number</label>
                <input
                  id="employeeNumber"
                  className="field data-value"
                  value={form.employeeNumber}
                  onChange={(e) => set({ employeeNumber: e.target.value })}
                />
                <p className="mt-1 text-xs text-ink-muted">
                  Optional. Leave it blank if it is not to hand.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="text-lg">Where they work</h2>
            <span className="text-xs text-ink-muted">All optional</span>
          </div>
          <div className="panel-body grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="department">Department</label>
              <input id="department" className="field" value={form.department}
                     onChange={(e) => set({ department: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="division">Division</label>
              <input id="division" className="field" value={form.division}
                     onChange={(e) => set({ division: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="unit">Unit or section</label>
              <input id="unit" className="field" value={form.unit}
                     onChange={(e) => set({ unit: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="jobTitle">Job title</label>
              <input id="jobTitle" className="field" value={form.jobTitle}
                     onChange={(e) => set({ jobTitle: e.target.value })} />
            </div>
          </div>
        </section>

        {error ? (
          <div
            className="flex items-start gap-3 rounded border px-4 py-3 text-sm"
            style={{ borderColor: "var(--breach)", background: "var(--breach-wash)", color: "var(--breach)" }}
            role="alert"
          >
            <Icon name="error" size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button type="submit" className="button-primary" disabled={saving}>
            {saving ? "Registering…" : "Register and start visit"}
          </button>
          <button type="button" className="button-secondary" onClick={() => navigate("/patients")}>
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
