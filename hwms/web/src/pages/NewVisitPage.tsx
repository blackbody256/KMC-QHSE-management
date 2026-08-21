import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { today } from "../lib/dates";
import { Icon } from "../components/Icon";
import { ApiError, clinicalApi, type Patient, type VisitType } from "../lib/api";

const visitTypes: VisitType[] = ["Walk-in", "Referred by supervisor", "Emergency", "Follow-up"];

/**
 * Opening a visit.
 *
 * This screen deliberately asks for very little: who, when, what kind of
 * visit, and vital signs if they were taken. The clinical record itself is
 * built section by section on the visit page that follows.
 *
 * The target is a minimal walk-in recorded in under two minutes, per
 * NFR-USE-02. If this screen grows to the point where that stops being true,
 * the screen is wrong rather than the target.
 */
export function NewVisitPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselected = params.get("patientId") ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const now = new Date();
  const [form, setForm] = useState({
    patientId: preselected,
    // Local, not UTC: at Kampala's UTC+3 an early-morning visit would
    // otherwise be dated to the previous day.
    visitDate: today(),
    timeIn: now.toTimeString().slice(0, 5),
    visitType: "Walk-in" as VisitType,
    workRelated: "Unsure" as "Yes" | "No" | "Unsure",
    bloodPressure: "",
    pulse: "",
    respiratoryRate: "",
    temperature: "",
    spo2: "",
    weightKg: "",
    heightCm: "",
    painScore: "",
  });

  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  useEffect(() => {
    (async () => {
      try {
        const body = await clinicalApi.listPatients();
        setPatients(body.patients);
      } catch {
        setError("The patient registry could not be read. Try again.");
      }
    })();
  }, []);

  /**
   * Out-of-range values warn and never block, per FR-ENC-09.
   *
   * A genuinely abnormal reading is exactly the reading that matters, and a
   * system that refuses to record it is worse than paper. These bounds are
   * plausibility checks for typing errors, not clinical judgements.
   */
  useEffect(() => {
    const next: string[] = [];
    const check = (raw: string, low: number, high: number, label: string, unit: string) => {
      if (raw === "") return;
      const value = Number(raw);
      if (Number.isNaN(value)) return;
      if (value < low || value > high) {
        next.push(`${label} of ${value} ${unit} is outside the usual range of ${low} to ${high}. It will be recorded as entered.`);
      }
    };
    check(form.pulse, 30, 220, "Pulse", "bpm");
    check(form.respiratoryRate, 6, 60, "Respiratory rate", "breaths per minute");
    check(form.temperature, 32, 43, "Temperature", "°C");
    check(form.spo2, 50, 100, "Oxygen saturation", "%");
    setWarnings(next);
  }, [form.pulse, form.respiratoryRate, form.temperature, form.spo2]);

  const numeric = (raw: string) => (raw === "" ? undefined : Number(raw));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const visit = await clinicalApi.createVisit({
        patientId: form.patientId,
        visitDate: form.visitDate,
        timeIn: form.timeIn,
        visitType: form.visitType,
        workRelated: form.workRelated,
        vitals: {
          bloodPressure: form.bloodPressure || undefined,
          pulse: numeric(form.pulse),
          respiratoryRate: numeric(form.respiratoryRate),
          temperature: numeric(form.temperature),
          spo2: numeric(form.spo2),
          weightKg: numeric(form.weightKg),
          heightCm: numeric(form.heightCm),
          painScore: numeric(form.painScore),
        },
        sections: {},
      });
      navigate(`/patient-visits/details?id=${encodeURIComponent(visit.id)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The visit could not be opened. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const bmi = (() => {
    const w = numeric(form.weightKg);
    const h = numeric(form.heightCm);
    if (!w || !h || h <= 0) return null;
    const metres = h / 100;
    return Math.round((w / (metres * metres)) * 10) / 10;
  })();

  return (
    <>
      <PageHeader
        title="Record visit"
        description="Open the visit with who, when and what kind. The clinical record is built section by section on the page that follows."
      />

      <form className="max-w-form space-y-6" onSubmit={submit}>
        <section className="panel">
          <div className="panel-head">
            <h2 className="text-lg">The visit</h2>
          </div>
          <div className="panel-body space-y-4">
            <div>
              <label className="label" htmlFor="patientId">Patient</label>
              <select
                id="patientId"
                className="field"
                value={form.patientId}
                onChange={(e) => set({ patientId: e.target.value })}
                required
              >
                <option value="">Select a patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName}
                    {patient.employeeNumber ? ` · ${patient.employeeNumber}` : ""}
                    {patient.department ? ` · ${patient.department}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="visitDate">Date</label>
                <input id="visitDate" type="date" className="field data-value" value={form.visitDate}
                       onChange={(e) => set({ visitDate: e.target.value })} required />
              </div>
              <div>
                <label className="label" htmlFor="timeIn">Time in</label>
                <input id="timeIn" type="time" className="field data-value" value={form.timeIn}
                       onChange={(e) => set({ timeIn: e.target.value })} />
              </div>
            </div>

            <fieldset>
              <legend className="label">Visit type</legend>
              <div className="grid grid-cols-2 gap-2">
                {visitTypes.map((type) => (
                  <label
                    key={type}
                    className="flex cursor-pointer items-center gap-2 rounded border px-3 py-2"
                    style={{
                      borderColor: form.visitType === type ? "var(--focus)" : "var(--rule)",
                      background: form.visitType === type ? "var(--info-wash)" : "var(--surface)",
                    }}
                  >
                    <input type="radio" name="visitType" checked={form.visitType === type}
                           onChange={() => set({ visitType: type })} />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="label">Is the condition work related?</legend>
              <div className="flex gap-2">
                {(["Yes", "No", "Unsure"] as const).map((value) => (
                  <label
                    key={value}
                    className="flex flex-1 cursor-pointer items-center gap-2 rounded border px-3 py-2"
                    style={{
                      borderColor: form.workRelated === value ? "var(--focus)" : "var(--rule)",
                      background: form.workRelated === value ? "var(--info-wash)" : "var(--surface)",
                    }}
                  >
                    <input type="radio" name="workRelated" checked={form.workRelated === value}
                           onChange={() => set({ workRelated: value })} />
                    <span className="text-sm">{value}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="text-lg">Vital signs</h2>
            <span className="text-xs text-ink-muted">Leave blank where not taken</span>
          </div>
          <div className="panel-body space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className="label" htmlFor="bp">Blood pressure</label>
                <input id="bp" className="field data-value" placeholder="120/80" value={form.bloodPressure}
                       onChange={(e) => set({ bloodPressure: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="pulse">Pulse</label>
                <input id="pulse" type="number" className="field data-value" value={form.pulse}
                       onChange={(e) => set({ pulse: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="rr">Respiratory rate</label>
                <input id="rr" type="number" className="field data-value" value={form.respiratoryRate}
                       onChange={(e) => set({ respiratoryRate: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="temp">Temperature</label>
                <input id="temp" type="number" step="0.1" className="field data-value" value={form.temperature}
                       onChange={(e) => set({ temperature: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="spo2">Oxygen saturation</label>
                <input id="spo2" type="number" className="field data-value" value={form.spo2}
                       onChange={(e) => set({ spo2: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="weight">Weight</label>
                <input id="weight" type="number" step="0.1" className="field data-value" value={form.weightKg}
                       onChange={(e) => set({ weightKg: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="height">Height</label>
                <input id="height" type="number" step="0.1" className="field data-value" value={form.heightCm}
                       onChange={(e) => set({ heightCm: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="pain">Pain score</label>
                <input id="pain" type="number" min={0} max={10} className="field data-value" value={form.painScore}
                       onChange={(e) => set({ painScore: e.target.value })} />
              </div>
              <div>
                <span className="label">Body mass index</span>
                <div className="field flex items-center bg-surface-sunken">
                  <span className="data-value">{bmi ?? "—"}</span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">Derived</p>
              </div>
            </div>

            {warnings.length > 0 ? (
              <div
                className="space-y-1 rounded border px-4 py-3 text-sm"
                style={{ borderColor: "var(--caution)", background: "var(--caution-wash)", color: "var(--caution)" }}
              >
                {warnings.map((warning) => (
                  <div key={warning} className="flex items-start gap-2">
                    <Icon name="error" size={16} className="mt-0.5 shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            ) : null}
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
            {saving ? "Opening…" : "Open visit"}
          </button>
          <button type="button" className="button-secondary" onClick={() => navigate("/patient-visits")}>
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
