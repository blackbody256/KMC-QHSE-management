import { Calculator, CalendarCheck, FileInput, Save } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { absenteeismRate, safePercent } from "../lib/calculations";
import { useDemoStore } from "../store/DemoStore";
import type { MonthlyReturn } from "../types";

export function MonthlyReturnsPage() {
  const { state, currentUser, upsertMonthlyReturn } = useDemoStore();
  const isOfficer = state.role === "health-wellness-officer";
  const latest = [...state.monthlyReturns].sort((a, b) => b.period.localeCompare(a.period))[0];
  const [period, setPeriod] = useState(latest?.period ?? "2026-07");
  const existing = state.monthlyReturns.find((entry) => entry.period === period);
  const [lostDays, setLostDays] = useState(String(existing?.lostDays ?? 0));
  const [headcount, setHeadcount] = useState(String(existing?.headcount ?? 0));
  const [scheduled, setScheduled] = useState(String(existing?.surveillanceScheduled ?? 0));
  const [completed, setCompleted] = useState(String(existing?.surveillanceCompleted ?? 0));
  const [hoursWorked, setHoursWorked] = useState(String(existing?.hoursWorked ?? ""));
  const [sourceNote, setSourceNote] = useState(existing?.sourceNote ?? "Illustrative HR portal monthly extract");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPeriod = (nextPeriod: string) => {
    setPeriod(nextPeriod);
    const row = state.monthlyReturns.find((entry) => entry.period === nextPeriod);
    setLostDays(String(row?.lostDays ?? 0));
    setHeadcount(String(row?.headcount ?? 0));
    setScheduled(String(row?.surveillanceScheduled ?? 0));
    setCompleted(String(row?.surveillanceCompleted ?? 0));
    setHoursWorked(String(row?.hoursWorked ?? ""));
    setSourceNote(row?.sourceNote ?? "Illustrative HR portal monthly extract");
    setMessage("");
    setError("");
  };

  const liveAbsenteeism = useMemo(
    () => absenteeismRate(Number(lostDays), Number(headcount)),
    [lostDays, headcount],
  );
  const liveSurveillance = useMemo(
    () => safePercent(Number(completed), Number(scheduled)),
    [completed, scheduled],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (period > "2026-08") {
      setError("Choose August 2026 or an earlier demonstration period.");
      return;
    }
    if (Number(headcount) <= 0 || Number(scheduled) <= 0) {
      setError("Enter a headcount and surveillance scheduled count greater than zero.");
      return;
    }
    if (Number(completed) > Number(scheduled)) {
      setError("Completed surveillance assessments cannot exceed the scheduled count.");
      return;
    }
    if (hoursWorked && Number(hoursWorked) <= 0) {
      setError("Hours worked must be greater than zero when supplied.");
      return;
    }
    if (!sourceNote.trim()) {
      setError("State where these external figures came from.");
      return;
    }
    const entry: MonthlyReturn = {
      id: existing?.id ?? crypto.randomUUID(),
      period,
      lostDays: Number(lostDays),
      headcount: Number(headcount),
      surveillanceScheduled: Number(scheduled),
      surveillanceCompleted: Number(completed),
      hoursWorked: hoursWorked ? Number(hoursWorked) : undefined,
      sourceNote: sourceNote.trim(),
      enteredBy: `${currentUser?.name ?? "Demo user"} · Health and Wellness Officer`,
      enteredAt: new Date().toISOString(),
    };
    upsertMonthlyReturn(entry);
    setMessage(`${formatPeriod(period)} return saved. The dashboard now uses these values.`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Cross-unit external source capture"
        title="Monthly returns"
        description="Figures still owned by HR remain attributed manual inputs until integration is approved."
      />
      <section className="provenance-callout">
        <FileInput size={20} aria-hidden="true" />
        <div>
          <strong>Manual is not hidden</strong>
          <span>K1 and K3 remain labelled Manual. Hours worked asks HR a question and feeds no v0.3 rate.</span>
        </div>
      </section>

      {!isOfficer ? (
        <section className="panel table-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">Read-only operational view</div><h2>Submitted returns</h2></div>
            <span className="provenance">No entry controls for viewer roles</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Period</th><th>Lost days</th><th>Headcount</th><th>Surveillance</th><th>Hours worked</th><th>Source</th></tr></thead>
              <tbody>
                {[...state.monthlyReturns].sort((a, b) => b.period.localeCompare(a.period)).map((row) => (
                  <tr key={row.id}>
                    <td><strong>{formatPeriod(row.period)}</strong></td>
                    <td>{row.lostDays}</td>
                    <td>{row.headcount}</td>
                    <td>{row.surveillanceCompleted}/{row.surveillanceScheduled}</td>
                    <td>{row.hoursWorked?.toLocaleString() ?? "Not supplied"}</td>
                    <td>{row.sourceNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="entry-layout">
          <form className="panel form-panel" onSubmit={submit}>
            <div className="form-section-heading">
              <div><span className="section-number">M</span><div><h2>Period return</h2><p>KPI definitions remain proposed where the owner has not approved them.</p></div></div>
              <label className="field compact-field period-field">
                <span>Reporting month</span>
                <input type="month" max="2026-08" value={period} onChange={(event) => loadPeriod(event.target.value)} />
              </label>
            </div>

            {error && <div className="form-error">{error}</div>}
            {message && <div className="form-success">{message}</div>}

            <div className="subsection-title">Health-related absenteeism</div>
            <p className="form-help">Monthly health-related working days lost ÷ active employee headcount at month end. HR must approve included leave types.</p>
            <div className="form-grid two">
              <label className="field"><span>Health-related lost days</span><input type="number" min="0" step="0.5" value={lostDays} onChange={(event) => setLostDays(event.target.value)} /></label>
              <label className="field"><span>Month-end employee headcount</span><input type="number" min="1" value={headcount} onChange={(event) => setHeadcount(event.target.value)} /></label>
            </div>

            <div className="subsection-title">Occupational health surveillance</div>
            <div className="form-grid two">
              <label className="field"><span>Employees scheduled</span><input type="number" min="1" value={scheduled} onChange={(event) => setScheduled(event.target.value)} /></label>
              <label className="field"><span>Assessments completed</span><input type="number" min="0" value={completed} onChange={(event) => setCompleted(event.target.value)} /></label>
            </div>

            <div className="subsection-title">Future rate input</div>
            <label className="field">
              <span>Monthly hours worked · optional, HR confirmation required</span>
              <input type="number" min="1" value={hoursWorked} onChange={(event) => setHoursWorked(event.target.value)} placeholder="Not supplied" />
              <small>No TRIR or other rate is calculated in prototype v0.3.</small>
            </label>

            <label className="field"><span>Source note</span><textarea rows={3} value={sourceNote} onChange={(event) => setSourceNote(event.target.value)} placeholder="Name the HR report, date and relevant filtering…" /></label>
            <div className="form-footer"><span>Correction replaces the browser-local value; production will audit revisions.</span><button className="button button-primary" type="submit"><Save size={17} aria-hidden="true" /> Save monthly return</button></div>
          </form>

          <aside className="calculation-panel">
            <div className="calculation-heading"><Calculator size={21} aria-hidden="true" /><div><div className="eyebrow">Live preview</div><h2>Proposed KPI results</h2></div></div>
            <div className="calculation-card"><span>K1 · Surveillance</span><strong>{liveSurveillance === null ? "—" : `${liveSurveillance.toFixed(1)}%`}</strong><small>{Number(completed) || 0} completed ÷ {Number(scheduled) || 0} scheduled</small><StatusPill status={liveSurveillance === null ? "no-data" : liveSurveillance >= 100 ? "within" : liveSurveillance >= 90 ? "approaching" : "outside"} /></div>
            <div className="calculation-card"><span>K3 · Absenteeism</span><strong>{liveAbsenteeism === null ? "—" : liveAbsenteeism.toFixed(2)}</strong><small>{Number(lostDays) || 0} days ÷ {Number(headcount) || 0} employees</small><StatusPill status={liveAbsenteeism === null ? "no-data" : liveAbsenteeism < 0.5 ? "within" : liveAbsenteeism < 0.55 ? "approaching" : "outside"} /></div>
            <div className="calculation-note"><CalendarCheck size={18} aria-hidden="true" /><p>Hours worked: {hoursWorked ? `${Number(hoursWorked).toLocaleString()} supplied, no v0.3 metric` : "Not supplied"}.</p></div>
          </aside>
        </div>
      )}
    </div>
  );
}

const formatPeriod = (period: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(`${period}-01T00:00:00`));
