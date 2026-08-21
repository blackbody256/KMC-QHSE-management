import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { DataValue } from "../components/DataValue";
import {
  ApiError,
  metricsApi,
  occupationalApi,
  type MonthlyReturn,
  type OccupationalPlan,
  type OccupationalPlanRevision,
  type ReturnRevision,
} from "../lib/api";
import { primaryRole, useSession } from "../lib/session";
import { currentPeriod, recentPeriods } from "../lib/dates";

/**
 * Monthly returns. Figures sourced outside this system.
 *
 * Three things on this page are load-bearing.
 *
 * The occupational plan is kept apart from the Human Resource return because
 * its planned work and confirmed disease judgement are owned by Health and
 * Wellness. A correction keeps its former values and the reason it changed.
 *
 * The rate is computed live while the figures are being typed. An implausible
 * absenteeism rate is obvious the moment the headcount is wrong, which is the
 * only moment anybody is in a position to check it against the payroll report
 * still open on their desk.
 *
 * A blank safety figure is left blank and reaches the dashboard as No data. It
 * is not zero. A month nobody supplied a near-miss count for is not a month
 * with no near misses, and the two produce opposite management responses.
 */

/** Blank means No data. Zero means zero. They are never merged. */
const numberOrNull = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
};

export function MonthlyReturnsPage() {
  const { user } = useSession();
  const readOnly = primaryRole(user) !== "hwms-officer";

  const [period, setPeriod] = useState(currentPeriod);
  const [existing, setExisting] = useState<MonthlyReturn | null>(null);
  const [existingPlan, setExistingPlan] = useState<OccupationalPlan | null>(null);
  const [referralLeaveDays, setReferralLeaveDays] = useState(0);
  const [revisions, setRevisions] = useState<ReturnRevision[]>([]);
  const [planRevisions, setPlanRevisions] = useState<OccupationalPlanRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planSaved, setPlanSaved] = useState<string | null>(null);

  const [hygienePlanned, setHygienePlanned] = useState("");
  const [ergonomicsPlanned, setErgonomicsPlanned] = useState("");
  const [confirmedDiseases, setConfirmedDiseases] = useState("");
  const [planReason, setPlanReason] = useState("");

  const [lostDays, setLostDays] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [completed, setCompleted] = useState("");
  const [healthSource, setHealthSource] = useState("");
  const [fatalities, setFatalities] = useState("");
  const [incidents, setIncidents] = useState("");
  const [injuries, setInjuries] = useState("");
  const [nearMisses, setNearMisses] = useState("");
  const [safetySource, setSafetySource] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setSaved(null);
      setPlanSaved(null);
      try {
        const [body, revisionBody, planBody, planRevisionBody] = await Promise.all([
          metricsApi.getReturn(period),
          metricsApi.revisions(period),
          occupationalApi.plan(period),
          occupationalApi.planRevisions(period),
        ]);
        if (cancelled) return;

        setExisting(body.return);
        setReferralLeaveDays(body.referralLeaveDays ?? 0);
        setRevisions(revisionBody.revisions);
        setExistingPlan(planBody.plan);
        setPlanRevisions(planRevisionBody.revisions);

        const plan = planBody.plan;
        setHygienePlanned(plan ? String(plan.hygieneEventsPlanned) : "");
        setErgonomicsPlanned(plan ? String(plan.ergonomicAssessmentsPlanned) : "");
        setConfirmedDiseases(plan ? String(plan.confirmedOccupationalDiseases) : "");
        setPlanReason("");

        const r = body.return;
        setLostDays(r ? String(r.healthRelatedLostDays) : "");
        setHeadcount(r ? String(r.headcount) : "");
        setScheduled(r ? String(r.surveillanceScheduled) : "");
        setCompleted(r ? String(r.surveillanceCompleted) : "");
        setHealthSource(r?.healthSourceNote ?? "");
        setFatalities(r?.fatalities === undefined ? "" : String(r.fatalities));
        setIncidents(r?.totalRecordableIncidents === undefined ? "" : String(r.totalRecordableIncidents));
        setInjuries(r?.totalRecordableInjuries === undefined ? "" : String(r.totalRecordableInjuries));
        setNearMisses(r?.reportableNearMisses === undefined ? "" : String(r.reportableNearMisses));
        setSafetySource(r?.safetySourceNote ?? "");
        setReason("");
        setError(null);
        setPlanError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "The month could not be read. Try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period]);

  async function submitPlan(event: React.FormEvent) {
    event.preventDefault();
    setPlanError(null);
    setPlanSaved(null);
    setPlanSaving(true);
    try {
      const savedPlan = await occupationalApi.savePlan(period, {
        hygieneEventsPlanned: Number(hygienePlanned),
        ergonomicAssessmentsPlanned: Number(ergonomicsPlanned),
        confirmedOccupationalDiseases: Number(confirmedDiseases),
        reason: planReason,
      });
      const revisionBody = await occupationalApi.planRevisions(period);
      setExistingPlan(savedPlan);
      setPlanRevisions(revisionBody.revisions);
      setPlanReason("");
      setPlanSaved(`${period} occupational plan saved.`);
    } catch (err) {
      setPlanError(err instanceof ApiError ? err.message : "The occupational plan could not be saved. Try again.");
    } finally {
      setPlanSaving(false);
    }
  }

  // The live figures. Computed here only so the officer can see them while
  // typing. The dashboard derives its own from the stored return rather than
  // trusting anything sent from this page.
  const live = useMemo(() => {
    const days = Number(lostDays);
    const people = Number(headcount);
    const sched = Number(scheduled);
    const done = Number(completed);

    const totalDays = (Number.isFinite(days) ? days : 0) + referralLeaveDays;
    const absenteeism =
      Number.isFinite(people) && people > 0 && lostDays.trim() !== "" ? totalDays / people : null;
    const surveillance =
      Number.isFinite(sched) && sched > 0 && completed.trim() !== "" ? (done / sched) * 100 : null;

    return { absenteeism, surveillance, totalDays, overCompleted: done > sched && scheduled !== "" };
  }, [lostDays, headcount, scheduled, completed, referralLeaveDays]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await metricsApi.saveReturn(period, {
        healthRelatedLostDays: Number(lostDays),
        headcount: Number(headcount),
        surveillanceScheduled: Number(scheduled || 0),
        surveillanceCompleted: Number(completed || 0),
        healthSourceNote: healthSource,
        fatalities: numberOrNull(fatalities),
        totalRecordableIncidents: numberOrNull(incidents),
        totalRecordableInjuries: numberOrNull(injuries),
        reportableNearMisses: numberOrNull(nearMisses),
        safetySourceNote: safetySource,
        reason,
      });
      const [body, revisionBody] = await Promise.all([
        metricsApi.getReturn(period),
        metricsApi.revisions(period),
      ]);
      setExisting(body.return);
      setRevisions(revisionBody.revisions);
      setReason("");
      setSaved(`${period} saved.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The return could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Monthly returns"
        description="Figures this system does not hold itself, entered once a month with the source they came from. Every dashboard figure derived from them states where it came from."
        actions={
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Month
            <select
              className="field w-auto py-1.5 text-sm"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              {recentPeriods().map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        }
      />

      {loading ? (
        <div className="py-12 text-sm text-ink-muted">Reading the month…</div>
      ) : (
        <div className="max-w-form space-y-6">
          <form onSubmit={submitPlan}>
            <section className="panel">
              <div className="panel-head">
                <h2 className="text-lg">Monthly occupational plan</h2>
                <span className="text-xs text-ink-muted">
                  {existingPlan ? `Recorded by ${existingPlan.recordedBy}` : "No plan recorded"}
                </span>
              </div>
              <div className="panel-body space-y-5">
                <p className="text-sm text-ink-muted">
                  Record what Health and Wellness planned for {period}, plus the confirmed case
                  count. These figures are owned here and are separate from the Human Resource
                  figures below.
                </p>

                <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <fieldset>
                    <legend className="mb-3 text-xs font-semibold text-ink-muted">
                      Planned work
                    </legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label>
                        <span className="label">Industrial hygiene events planned</span>
                        <input
                          type="number"
                          min="0"
                          className="field data-value"
                          value={hygienePlanned}
                          onChange={(event) => setHygienePlanned(event.target.value)}
                          disabled={readOnly}
                          required
                        />
                      </label>
                      <label>
                        <span className="label">Ergonomic assessments planned</span>
                        <input
                          type="number"
                          min="0"
                          className="field data-value"
                          value={ergonomicsPlanned}
                          onChange={(event) => setErgonomicsPlanned(event.target.value)}
                          disabled={readOnly}
                          required
                        />
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="border-t border-rule pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                    <legend className="mb-3 text-xs font-semibold text-ink-muted">
                      Confirmed outcome
                    </legend>
                    <label>
                      <span className="label">Confirmed occupational disease cases</span>
                      <input
                        type="number"
                        min="0"
                        className="field data-value"
                        value={confirmedDiseases}
                        onChange={(event) => setConfirmedDiseases(event.target.value)}
                        disabled={readOnly}
                        required
                      />
                    </label>
                    <p className="mt-2 flex items-start gap-2 text-xs text-ink-muted">
                      <Icon name="info" size={15} className="mt-0.5 shrink-0" />
                      <span>
                        This count is a clinical and legal judgement. A correction keeps the
                        previous value and the reason it changed.
                      </span>
                    </p>
                  </fieldset>
                </div>

                {existingPlan && !readOnly ? (
                  <label>
                    <span className="label">Reason for the plan correction</span>
                    <input
                      className="field"
                      value={planReason}
                      onChange={(event) => setPlanReason(event.target.value)}
                      placeholder="What changed, and why."
                      required
                    />
                  </label>
                ) : null}

                {planError ? (
                  <div
                    className="flex items-start gap-3 rounded border px-4 py-3 text-sm"
                    style={{ borderColor: "var(--breach)", background: "var(--breach-wash)", color: "var(--breach)" }}
                    role="alert"
                  >
                    <Icon name="error" size={18} className="mt-0.5 shrink-0" />
                    <span>{planError}</span>
                  </div>
                ) : null}

                {planSaved ? (
                  <div
                    className="flex items-start gap-3 rounded border px-4 py-3 text-sm"
                    style={{ borderColor: "var(--ok)", background: "var(--ok-wash)", color: "var(--ok)" }}
                    role="status"
                  >
                    <Icon name="check_circle" size={18} className="mt-0.5 shrink-0" />
                    <span>{planSaved}</span>
                  </div>
                ) : null}

                {!readOnly ? (
                  <button type="submit" className="button-primary" disabled={planSaving}>
                    <Icon name="calendar_month" size={18} />
                    {planSaving ? "Saving…" : existingPlan ? "Save plan correction" : "Save plan"}
                  </button>
                ) : null}

                {planRevisions.length > 0 ? (
                  <div className="border-t border-rule pt-4">
                    <h3 className="text-sm">Plan corrections for this month</h3>
                    <div className="mt-3 space-y-3 text-sm">
                      {planRevisions.map((revision, index) => (
                        <div key={index} className="border-b border-rule pb-3 last:border-0 last:pb-0">
                          <div className="text-xs text-ink-muted">
                            <span className="data-value">{revision.correctedAt.slice(0, 10)}</span> ·{" "}
                            {revision.correctedBy}
                          </div>
                          <div className="mt-1">{revision.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </form>

          <form className="space-y-6" onSubmit={submit}>
          {existing ? (
            <div
              className="flex items-start gap-3 rounded border px-4 py-3 text-sm"
              style={{ borderColor: "var(--rule-strong)", background: "var(--neutral-wash)", color: "var(--ink-muted)" }}
            >
              <Icon name="info" size={18} className="mt-0.5 shrink-0" />
              <span>
                {period} was entered by {existing.enteredBy}. Changing it is a correction: the
                previous figures are kept with the reason, so a dashboard figure that moves can
                always be explained.
              </span>
            </div>
          ) : null}

          {/* --- health ---------------------------------------------------- */}
          <section className="panel">
            <div className="panel-head">
              <h2 className="text-lg">Health</h2>
              <span className="text-xs text-ink-muted">From the Human Resource portal</span>
            </div>
            <div className="panel-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label>
                  <span className="label">Health-related lost days</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="field data-value"
                    value={lostDays}
                    onChange={(event) => setLostDays(event.target.value)}
                    disabled={readOnly}
                    required
                  />
                </label>
                <label>
                  <span className="label">Month-end headcount</span>
                  <input
                    type="number"
                    min="1"
                    className="field data-value"
                    value={headcount}
                    onChange={(event) => setHeadcount(event.target.value)}
                    disabled={readOnly}
                    required
                  />
                </label>
                <label>
                  <span className="label">Employees scheduled for surveillance</span>
                  <input
                    type="number"
                    min="0"
                    className="field data-value"
                    value={scheduled}
                    onChange={(event) => setScheduled(event.target.value)}
                    disabled={readOnly}
                  />
                </label>
                <label>
                  <span className="label">Employees assessed</span>
                  <input
                    type="number"
                    min="0"
                    className="field data-value"
                    value={completed}
                    onChange={(event) => setCompleted(event.target.value)}
                    disabled={readOnly}
                  />
                </label>
              </div>

              {live.overCompleted ? (
                <div
                  className="flex items-start gap-3 rounded border px-4 py-3 text-sm"
                  style={{ borderColor: "var(--caution)", background: "var(--caution-wash)", color: "var(--caution)" }}
                  role="alert"
                >
                  <Icon name="error" size={18} className="mt-0.5 shrink-0" />
                  <span>
                    More people were assessed than were scheduled. Surveillance compliance would
                    read above 100%, check both figures.
                  </span>
                </div>
              ) : null}

              <label>
                <span className="label">Where these figures came from</span>
                <input
                  className="field"
                  value={healthSource}
                  onChange={(event) => setHealthSource(event.target.value)}
                  placeholder="For example: HR monthly absence report, 5 August 2026."
                  disabled={readOnly}
                  required
                />
              </label>
            </div>
          </section>

          {/* --- the live rate --------------------------------------------- */}
          <section className="panel">
            <div className="panel-head">
              <h2 className="text-lg">What these figures produce</h2>
              <span className="text-xs text-ink-muted">Computed as you type</span>
            </div>
            <div className="panel-body grid grid-cols-2 gap-6">
              <div>
                <DataValue
                  value={live.absenteeism === null ? null : live.absenteeism.toFixed(2)}
                  size="lg"
                  context="days per person · target under 0.5"
                />
                <p className="mt-2 text-xs text-ink-muted">
                  Health-related absenteeism.{" "}
                  {referralLeaveDays > 0 ? (
                    <>
                      Includes <span className="data-value">{referralLeaveDays}</span> day
                      {referralLeaveDays === 1 ? "" : "s"} of sick leave recommended on referrals
                      returned this month. That leave comes across from the referral record, do not
                      add it to the lost days above.
                    </>
                  ) : (
                    "No referral sick leave was recorded for this month."
                  )}
                </p>
              </div>
              <div>
                <DataValue
                  value={live.surveillance === null ? null : `${live.surveillance.toFixed(1)}%`}
                  size="lg"
                  context="assessed ÷ scheduled · target 100%"
                />
                <p className="mt-2 text-xs text-ink-muted">Surveillance compliance.</p>
              </div>
            </div>
          </section>

          {/* --- safety ---------------------------------------------------- */}
          <section className="panel">
            <div className="panel-head">
              <h2 className="text-lg">Workplace safety</h2>
              <span className="text-xs text-ink-muted">Attributed · optional</span>
            </div>
            <div className="panel-body space-y-4">
              {/* Stated where the figures are entered, because the temptation
                  to type a zero is strongest at exactly this point. */}
              <div
                className="flex items-start gap-3 rounded border px-4 py-3 text-xs"
                style={{ borderColor: "var(--rule)", background: "var(--neutral-wash)", color: "var(--ink-muted)" }}
              >
                <Icon name="info" size={16} className="mt-0.5 shrink-0" />
                <span>
                  These four belong to Workplace Safety, which is a separate division. Leave a box
                  blank if nobody has supplied the figure. Blank reaches the dashboard as{" "}
                  <strong>No data</strong>. Do not enter zero to mean "not supplied": zero is a
                  figure, and for near misses it is the worst one there is.
                </span>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {(
                  [
                    ["Fatalities", fatalities, setFatalities],
                    ["Recordable incidents", incidents, setIncidents],
                    ["Recordable injuries", injuries, setInjuries],
                    ["Reportable near misses", nearMisses, setNearMisses],
                  ] as const
                ).map(([label, value, set]) => (
                  <label key={label}>
                    <span className="label">{label}</span>
                    <input
                      type="number"
                      min="0"
                      className="field data-value"
                      value={value}
                      onChange={(event) => set(event.target.value)}
                      placeholder="—"
                      disabled={readOnly}
                    />
                  </label>
                ))}
              </div>

              {nearMisses.trim() !== "" && Number(nearMisses) < 200 ? (
                <p className="text-xs" style={{ color: "var(--caution)" }}>
                  Near misses are <strong>higher is better</strong>: the target is at least 200.
                  Fewer reports usually mean people have stopped reporting, not that the factory
                  became safer.
                </p>
              ) : null}

              <label>
                <span className="label">Who supplied the safety figures</span>
                <input
                  className="field"
                  value={safetySource}
                  onChange={(event) => setSafetySource(event.target.value)}
                  placeholder="Required if any of the four above is entered."
                  disabled={readOnly}
                />
              </label>
            </div>
          </section>

          {existing && !readOnly ? (
            <label>
              <span className="label">Reason for the correction</span>
              <input
                className="field"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="What changed, and why."
                required
              />
            </label>
          ) : null}

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

          {saved ? (
            <div
              className="flex items-start gap-3 rounded border px-4 py-3 text-sm"
              style={{ borderColor: "var(--ok)", background: "var(--ok-wash)", color: "var(--ok)" }}
              role="status"
            >
              <Icon name="check_circle" size={18} className="mt-0.5 shrink-0" />
              <span>{saved}</span>
            </div>
          ) : null}

          {!readOnly ? (
            <button type="submit" className="button-primary" disabled={saving}>
              <Icon name="calendar_month" size={18} />
              {saving ? "Saving…" : existing ? "Save correction" : "Save return"}
            </button>
          ) : null}

          {revisions.length > 0 ? (
            <section className="panel">
              <div className="panel-head">
                <h2 className="text-lg">Corrections to this month</h2>
              </div>
              <div className="panel-body space-y-3 text-sm">
                {revisions.map((revision, index) => (
                  <div key={index} className="border-b border-rule pb-3 last:border-0 last:pb-0">
                    <div className="text-xs text-ink-muted">
                      <span className="data-value">{revision.correctedAt.slice(0, 10)}</span> ·{" "}
                      {revision.correctedBy}
                    </div>
                    <div className="mt-1">{revision.reason}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          </form>
        </div>
      )}
    </>
  );
}
