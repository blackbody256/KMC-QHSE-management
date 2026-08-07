import { Calculator, CalendarCheck, FileInput, Save } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import {
  absenteeismRate,
  evaluateMetric,
  referralSickLeaveDaysForPeriod,
  safePercent,
} from "../lib/calculations";
import { useDemoStore } from "../store/DemoStore";
import type { KpiDefinition, MonthlyReturn } from "../types";

const optionalNumber = (value: string) => value.trim() === "" ? undefined : Number(value);

export function MonthlyReturnsPage() {
  const { state, currentUser, upsertMonthlyReturn } = useDemoStore();
  const isOfficer = state.role === "health-wellness-officer";
  const latest = [...state.monthlyReturns].sort((a, b) => b.period.localeCompare(a.period))[0];
  const [period, setPeriod] = useState(latest?.period ?? "2026-07");
  const existing = state.monthlyReturns.find((entry) => entry.period === period);
  const [lostDays, setLostDays] = useState(String(existing?.healthRelatedLostDays ?? ""));
  const [headcount, setHeadcount] = useState(String(existing?.headcount ?? ""));
  const [scheduled, setScheduled] = useState(String(existing?.surveillanceScheduled ?? ""));
  const [completed, setCompleted] = useState(String(existing?.surveillanceCompleted ?? ""));
  const [fatalities, setFatalities] = useState(String(existing?.fatalities ?? ""));
  const [incidents, setIncidents] = useState(String(existing?.totalRecordableIncidents ?? ""));
  const [injuries, setInjuries] = useState(String(existing?.totalRecordableInjuries ?? ""));
  const [nearMisses, setNearMisses] = useState(String(existing?.reportableNearMisses ?? ""));
  const [healthSourceNote, setHealthSourceNote] = useState(existing?.healthSourceNote ?? "");
  const [safetySourceNote, setSafetySourceNote] = useState(existing?.safetySourceNote ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPeriod = (nextPeriod: string) => {
    setPeriod(nextPeriod);
    const row = state.monthlyReturns.find((entry) => entry.period === nextPeriod);
    setLostDays(String(row?.healthRelatedLostDays ?? ""));
    setHeadcount(String(row?.headcount ?? ""));
    setScheduled(String(row?.surveillanceScheduled ?? ""));
    setCompleted(String(row?.surveillanceCompleted ?? ""));
    setFatalities(String(row?.fatalities ?? ""));
    setIncidents(String(row?.totalRecordableIncidents ?? ""));
    setInjuries(String(row?.totalRecordableInjuries ?? ""));
    setNearMisses(String(row?.reportableNearMisses ?? ""));
    setHealthSourceNote(row?.healthSourceNote ?? "");
    setSafetySourceNote(row?.safetySourceNote ?? "");
    setMessage("");
    setError("");
  };

  const referralDays = referralSickLeaveDaysForPeriod(state, period);
  const liveAbsenteeism = useMemo(
    () => absenteeismRate(Number(lostDays) + referralDays, Number(headcount)),
    [headcount, lostDays, referralDays],
  );
  const liveSurveillance = useMemo(
    () => safePercent(Number(completed), Number(scheduled)),
    [completed, scheduled],
  );
  const definition = (id: KpiDefinition["metricId"]) =>
    state.kpiDefinitions.find((item) => item.metricId === id)!;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (period > "2026-08") {
      setError("Choose August 2026 or an earlier demonstration period.");
      return;
    }
    if (Number(headcount) <= 0 || Number(scheduled) <= 0 || Number(lostDays) < 0) {
      setError("Enter valid health lost days, headcount and surveillance scheduled values.");
      return;
    }
    if (Number(completed) > Number(scheduled) || Number(completed) < 0) {
      setError("Completed surveillance assessments must be between zero and the scheduled count.");
      return;
    }
    const safetyValues = [fatalities, incidents, injuries, nearMisses];
    if (safetyValues.some((value) => value !== "" && Number(value) < 0)) {
      setError("Attributed safety figures cannot be negative.");
      return;
    }
    if (!healthSourceNote.trim()) {
      setError("State the source of the health figures.");
      return;
    }
    if (safetyValues.some((value) => value !== "") && !safetySourceNote.trim()) {
      setError("State the source of any supplied safety figures.");
      return;
    }

    const entry: MonthlyReturn = {
      id: existing?.id ?? crypto.randomUUID(),
      period,
      healthRelatedLostDays: Number(lostDays),
      headcount: Number(headcount),
      surveillanceScheduled: Number(scheduled),
      surveillanceCompleted: Number(completed),
      fatalities: optionalNumber(fatalities),
      totalRecordableIncidents: optionalNumber(incidents),
      totalRecordableInjuries: optionalNumber(injuries),
      reportableNearMisses: optionalNumber(nearMisses),
      healthSourceNote: healthSourceNote.trim(),
      safetySourceNote: safetySourceNote.trim() || undefined,
      enteredBy: `${currentUser?.name ?? "Demo user"} · Health and Wellness Officer`,
      enteredAt: new Date().toISOString(),
    };
    upsertMonthlyReturn(entry);
    setMessage(`${formatPeriod(period)} return saved. The dashboard now uses these values.`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Attributed monthly source capture"
        title="Monthly returns"
        description="Health values and externally owned safety figures keep separate provenance. Blank safety fields remain no data."
      />
      <section className="provenance-callout">
        <FileInput size={20} aria-hidden="true" />
        <div>
          <strong>No parallel safety incident register</strong>
          <span>Until Benard confirms the owner, safety values enter only as attributed monthly returns or through a future integration seam.</span>
        </div>
      </section>

      {!isOfficer ? (
        <ReturnTable rows={state.monthlyReturns} referralDaysFor={(rowPeriod) => referralSickLeaveDaysForPeriod(state, rowPeriod)} />
      ) : (
        <div className="entry-layout">
          <form className="panel form-panel" onSubmit={submit}>
            <div className="form-section-heading">
              <div><span className="section-number">M</span><div><h2>Period return</h2><p>All values are synthetic in this demonstration.</p></div></div>
              <label className="field compact-field period-field">
                <span>Reporting month</span>
                <input type="month" max="2026-08" value={period} onChange={(event) => loadPeriod(event.target.value)} />
              </label>
            </div>
            {error && <div className="form-error">{error}</div>}
            {message && <div className="form-success">{message}</div>}

            <div className="subsection-title">Occupational Health</div>
            <div className="form-grid two">
              <label className="field"><span>Other health-related lost days</span><input type="number" min="0" step="0.5" value={lostDays} onChange={(event) => setLostDays(event.target.value)} /><small>Linked referral leave is added below, not re-keyed here.</small></label>
              <label className="field"><span>Month-end employee headcount</span><input type="number" min="1" value={headcount} onChange={(event) => setHeadcount(event.target.value)} /></label>
              <label className="field"><span>Employees scheduled for surveillance</span><input type="number" min="1" value={scheduled} onChange={(event) => setScheduled(event.target.value)} /></label>
              <label className="field"><span>Surveillance assessments completed</span><input type="number" min="0" value={completed} onChange={(event) => setCompleted(event.target.value)} /></label>
            </div>
            <label className="field"><span>Health source note</span><textarea rows={2} value={healthSourceNote} onChange={(event) => setHealthSourceNote(event.target.value)} /></label>

            <div className="subsection-title">Safety figures · source ownership pending</div>
            <p className="form-help">Leave a field blank when no attributed value was supplied. Blank is “no data”, never zero.</p>
            <div className="form-grid four">
              <label className="field"><span>Fatality</span><input type="number" min="0" value={fatalities} onChange={(event) => setFatalities(event.target.value)} /></label>
              <label className="field"><span>Total Recordable Incidents</span><input type="number" min="0" value={incidents} onChange={(event) => setIncidents(event.target.value)} /></label>
              <label className="field"><span>Total Recordable Injuries</span><input type="number" min="0" value={injuries} onChange={(event) => setInjuries(event.target.value)} /></label>
              <label className="field"><span>Reportable Near Misses</span><input type="number" min="0" value={nearMisses} onChange={(event) => setNearMisses(event.target.value)} /><small>Higher is better · target {definition("S4").targetLabel}</small></label>
            </div>
            <label className="field"><span>Safety source note</span><textarea rows={2} value={safetySourceNote} onChange={(event) => setSafetySourceNote(event.target.value)} placeholder="Supplying system or signed return, reporting owner and date…" /></label>
            <div className="form-footer"><span>Corrections replace browser-local values; production will audit revisions.</span><button className="button button-primary" type="submit"><Save size={17} aria-hidden="true" /> Save monthly return</button></div>
          </form>

          <aside className="calculation-panel">
            <div className="calculation-heading"><Calculator size={21} aria-hidden="true" /><div><div className="eyebrow">Live preview</div><h2>Linked health results</h2></div></div>
            <div className="calculation-card"><span>Surveillance compliance</span><strong>{liveSurveillance === null ? "No data" : `${liveSurveillance.toFixed(1)}%`}</strong><small>{Number(completed) || 0} completed ÷ {Number(scheduled) || 0} scheduled</small><StatusPill status={evaluateMetric(liveSurveillance, definition("OH1"))} /></div>
            <div className="calculation-card"><span>Health-Related Absenteeism</span><strong>{liveAbsenteeism === null ? "No data" : liveAbsenteeism.toFixed(2)}</strong><small>{Number(lostDays) || 0} return days + {referralDays} linked referral days ÷ {Number(headcount) || 0} employees</small><StatusPill status={evaluateMetric(liveAbsenteeism, definition("S5"))} /></div>
            <div className="calculation-note"><CalendarCheck size={18} aria-hidden="true" /><p>{referralDays} sick-leave day{referralDays === 1 ? "" : "s"} linked from returned referrals in {formatPeriod(period)}.</p></div>
          </aside>
        </div>
      )}
    </div>
  );
}

function ReturnTable({ rows, referralDaysFor }: { rows: MonthlyReturn[]; referralDaysFor: (period: string) => number }) {
  return (
    <section className="panel table-panel">
      <div className="panel-heading"><div><div className="eyebrow">Read-only operational view</div><h2>Submitted returns</h2></div><span className="provenance">Synthetic values</span></div>
      <div className="table-scroll"><table><thead><tr><th>Period</th><th>Health lost days</th><th>Headcount</th><th>Surveillance</th><th>Safety figures F / TRI / Inj / NM</th><th>Sources</th></tr></thead><tbody>
        {[...rows].sort((a, b) => b.period.localeCompare(a.period)).map((row) => (
          <tr key={row.id}>
            <td><strong>{formatPeriod(row.period)}</strong></td>
            <td className="data-cell">{row.healthRelatedLostDays} + {referralDaysFor(row.period)} referral</td>
            <td className="data-cell">{row.headcount}</td>
            <td className="data-cell">{row.surveillanceCompleted}/{row.surveillanceScheduled}</td>
            <td className="data-cell">{[row.fatalities, row.totalRecordableIncidents, row.totalRecordableInjuries, row.reportableNearMisses].map((value) => value ?? "No data").join(" / ")}</td>
            <td><span className="table-secondary">Health: {row.healthSourceNote}</span><span className="table-secondary">Safety: {row.safetySourceNote ?? "No data"}</span></td>
          </tr>
        ))}
      </tbody></table></div>
    </section>
  );
}

const formatPeriod = (period: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(`${period}-01T00:00:00`));
