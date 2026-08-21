import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { StatusIndicator } from "../components/StatusIndicator";
import {
  ApiError,
  referralApi,
  type AuthorisationSummary,
  type Referral,
  type ReferralForm,
} from "../lib/api";
import { referralStatusPresentation } from "../lib/referralStatus";
import { downloadReferralPdf } from "../lib/referralPdf";
import { today } from "../lib/dates";

/**
 * One referral, through its lifecycle.
 *
 * Only the stage the referral may actually move to next is offered, and the
 * service decides which that is. The page reads `nextStates` rather than
 * deriving the rule a second time. Two copies of a lifecycle drift, and the
 * copy that drifts is the one a user acts on.
 */
export function ReferralDetailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";

  const [referral, setReferral] = useState<Referral | null>(null);
  const [form, setForm] = useState<ReferralForm | null>(null);
  const [summary, setSummary] = useState<AuthorisationSummary | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<null | "authorise" | "feedback" | "review">(null);

  useEffect(() => {
    (async () => {
      try {
        const [referralBody, formBody] = await Promise.all([
          referralApi.get(id),
          referralApi.form(),
        ]);
        setReferral(referralBody);
        setForm(formBody);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "The referral could not be read.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function run(action: () => Promise<Referral>) {
    setError(null);
    setBusy(true);
    try {
      setReferral(await action());
      setStage(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That could not be recorded. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function openSummary() {
    setError(null);
    try {
      setSummary(await referralApi.authorisationSummary(id));
      setShowSummary(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The summary could not be read.");
    }
  }

  if (loading) return <div className="py-12 text-sm text-ink-muted">Reading the referral…</div>;

  if (!referral || !form) {
    return (
      <>
        <PageHeader title="Referral" />
        <section className="panel">
          <div className="panel-body space-y-4 text-sm text-ink-muted">
            <p>{error ?? "That referral does not exist, or it has been removed."}</p>
            <button type="button" className="button-secondary" onClick={() => navigate("/referrals")}>
              <Icon name="arrow_back" size={16} />
              Back to referrals
            </button>
          </div>
        </section>
      </>
    );
  }

  const state = referralStatusPresentation[referral.status];
  const next = referral.nextStates[0];

  return (
    <>
      <PageHeader
        title="Referral"
        description={`${referral.formNumber} · ${referral.patientSnapshot.name} · ${referral.referredTo}`}
        actions={
          <>
            <button
              type="button"
              className="button-secondary"
              onClick={() => void downloadReferralPdf(referral, form)}
            >
              <Icon name="download" size={16} />
              Download form
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() =>
                navigate(`/patients/record?id=${encodeURIComponent(referral.patientId)}`)
              }
            >
              Patient record
            </button>
          </>
        }
      />

      {/* --- lifecycle ------------------------------------------------------ */}
      <section className="panel mb-6">
        <div className="panel-head">
          <h2 className="text-lg">Stage</h2>
          <StatusIndicator status={state.status} label={state.label} />
        </div>
        <div className="panel-body space-y-4">
          <ol className="flex flex-wrap items-center gap-2 text-xs">
            {form.statuses.map((status, index) => {
              const reached = form.statuses.indexOf(referral.status) >= index;
              return (
                <li key={status} className="flex items-center gap-2">
                  <span
                    className="rounded px-2 py-1 font-medium"
                    style={{
                      // Reached stages are stated in ink; the ones still to
                      // come are faint. Colour is not doing the work here -
                      // the word is.
                      color: reached ? "var(--ink)" : "var(--ink-faint)",
                      background: reached ? "var(--neutral-wash)" : "transparent",
                      border: `1px solid ${reached ? "var(--rule-strong)" : "var(--rule)"}`,
                    }}
                  >
                    {referralStatusPresentation[status].label}
                  </span>
                  {index < form.statuses.length - 1 ? (
                    <Icon name="chevron_right" size={14} className="text-ink-faint" />
                  ) : null}
                </li>
              );
            })}
          </ol>

          <p className="text-sm text-ink-muted">{state.description}</p>

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

          <div className="flex flex-wrap items-center gap-3">
            {next === "authorised" ? (
              <>
                <button type="button" className="button-secondary" onClick={() => void openSummary()}>
                  <Icon name="visibility" size={16} />
                  Open authorisation summary
                </button>
                <button type="button" className="button-primary" onClick={() => setStage("authorise")}>
                  Record authorisation
                </button>
              </>
            ) : null}
            {next === "issued" ? (
              <button
                type="button"
                className="button-primary"
                disabled={busy}
                onClick={() => void run(() => referralApi.issue(referral.id))}
              >
                <Icon name="forward_to_inbox" size={16} />
                {busy ? "Recording…" : "Mark as issued"}
              </button>
            ) : null}
            {next === "returned" ? (
              <button type="button" className="button-primary" onClick={() => setStage("feedback")}>
                Record facility feedback
              </button>
            ) : null}
            {next === "reviewed" ? (
              <button type="button" className="button-primary" onClick={() => setStage("review")}>
                Record follow-up review
              </button>
            ) : null}

            {/* An amended letter from the facility arrives after the clinic has
                closed its review more often than anyone would like. The
                correction supersedes the earlier figure rather than adding to
                it, so absenteeism is not counted twice. */}
            {referral.externalFeedback && stage !== "feedback" ? (
              <button type="button" className="button-secondary" onClick={() => setStage("feedback")}>
                Correct the facility feedback
              </button>
            ) : null}

            {referral.nextStates.length === 0 && !referral.externalFeedback ? (
              <span className="text-sm text-ink-muted">Nothing further is outstanding.</span>
            ) : null}
          </div>
        </div>
      </section>

      {/* --- the minimum-disclosure summary --------------------------------- */}
      {showSummary && summary ? (
        <section className="panel mb-6">
          <div className="panel-head">
            <h2 className="text-lg">Authorisation summary</h2>
            <button
              type="button"
              className="text-xs text-ink-muted underline"
              onClick={() => setShowSummary(false)}
            >
              Close
            </button>
          </div>
          <div className="panel-body space-y-4">
            <div
              className="flex items-start gap-3 rounded border px-4 py-3 text-xs"
              style={{ borderColor: "var(--info)", background: "var(--info-wash)", color: "var(--info)" }}
            >
              <Icon name="lock" size={16} className="mt-0.5 shrink-0" />
              <span>{summary.disclosureNote}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Patient" value={summary.patientName} />
              <Field label="Department" value={summary.department} />
              <Field label="Destination facility" value={summary.destination} />
              <Field label="Date" value={summary.referralDate} mono />
              <Field label="Reason for referral" value={summary.referralReasons.join(", ")} />
              <Field label="Cost implication" value={summary.costImplication} />
            </div>
          </div>
        </section>
      ) : null}

      {/* --- stage forms ---------------------------------------------------- */}
      {stage === "authorise" ? (
        <AuthorisationForm
          busy={busy}
          note={form.authorisationDecisionNote}
          onCancel={() => setStage(null)}
          onSubmit={(input) => void run(() => referralApi.recordAuthorisation(referral.id, input))}
        />
      ) : null}

      {stage === "feedback" ? (
        <FeedbackForm
          busy={busy}
          existing={referral.externalFeedback}
          onCancel={() => setStage(null)}
          onSubmit={(input) => void run(() => referralApi.recordFeedback(referral.id, input))}
        />
      ) : null}

      {stage === "review" ? (
        <ReviewForm
          busy={busy}
          onCancel={() => setStage(null)}
          onSubmit={(input) => void run(() => referralApi.recordReview(referral.id, input))}
        />
      ) : null}

      {/* --- the record ----------------------------------------------------- */}
      <RecordedSections referral={referral} form={form} />
    </>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | number; mono?: boolean }) {
  const absent = value === undefined || value === null || value === "";
  return (
    <div>
      <div className="text-xs text-ink-muted">{label}</div>
      <div className={mono ? "data-value" : ""}>
        {absent ? <span className="text-ink-faint">—</span> : value}
      </div>
    </div>
  );
}

function AuthorisationForm({
  busy,
  note,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  note: string;
  onCancel: () => void;
  onSubmit: (input: {
    costImplication: string;
    headOfDivision: { name: string; signatureConfirmed: boolean; date: string; remarks: string };
    chiefOfStaff: { name: string; signatureConfirmed: boolean; date: string; remarks: string };
  }) => void;
}) {
  const todayDate = today();
  const [costImplication, setCostImplication] = useState("");
  const [head, setHead] = useState({ name: "", signatureConfirmed: false, date: todayDate, remarks: "" });
  const [chief, setChief] = useState({ name: "", signatureConfirmed: false, date: todayDate, remarks: "" });

  return (
    <section className="panel mb-6">
      <div className="panel-head">
        <h2 className="text-lg">Record authorisation</h2>
        <span className="text-xs text-ink-muted">Section C</span>
      </div>
      <form
        className="panel-body space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ costImplication, headOfDivision: head, chiefOfStaff: chief });
        }}
      >
        {/* Stated on the screen where the action happens, not buried in a
            document. The person recording this needs to know they are
            recording a decision taken elsewhere, not granting one here. */}
        <div
          className="flex items-start gap-3 rounded border px-4 py-3 text-xs"
          style={{ borderColor: "var(--caution)", background: "var(--caution-wash)", color: "var(--caution)" }}
        >
          <Icon name="lock" size={16} className="mt-0.5 shrink-0" />
          <span>{note}</span>
        </div>

        <label>
          <span className="label">Cost implication</span>
          <input
            className="field"
            value={costImplication}
            onChange={(event) => setCostImplication(event.target.value)}
            placeholder="As put to the authorisers."
          />
        </label>

        {(
          [
            ["Head of Division", head, setHead],
            ["Chief of Staff", chief, setChief],
          ] as const
        ).map(([label, value, set]) => (
          <fieldset key={label} className="rounded border p-4" style={{ borderColor: "var(--rule)" }}>
            <legend className="label px-1">{label}</legend>
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="label">Name</span>
                <input
                  className="field"
                  value={value.name}
                  onChange={(event) => set({ ...value, name: event.target.value })}
                  required
                />
              </label>
              <label>
                <span className="label">Date</span>
                <input
                  type="date"
                  className="field"
                  value={value.date}
                  onChange={(event) => set({ ...value, date: event.target.value })}
                />
              </label>
              <label className="col-span-2">
                <span className="label">Remarks</span>
                <input
                  className="field"
                  value={value.remarks}
                  onChange={(event) => set({ ...value, remarks: event.target.value })}
                />
              </label>
              <label className="col-span-2 flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={value.signatureConfirmed}
                  onChange={(event) => set({ ...value, signatureConfirmed: event.target.checked })}
                />
                <span>
                  Signature confirmed
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    Tick only once the authorisation has actually been given.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>
        ))}

        <div className="flex items-center gap-3">
          <button type="submit" className="button-primary" disabled={busy}>
            {busy ? "Recording…" : "Record authorisation"}
          </button>
          <button type="button" className="button-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function FeedbackForm({
  busy,
  existing,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  existing?: Referral["externalFeedback"];
  onCancel: () => void;
  onSubmit: (input: {
    facility: string;
    practitioner: string;
    diagnosis: string;
    treatmentProvided: string;
    recommendedFollowUp: string;
    sickLeaveDays: number;
    sickLeaveFrom: string;
    sickLeaveTo: string;
    signatureAndStampConfirmed: boolean;
    date: string;
  }) => void;
}) {
  const [facility, setFacility] = useState(existing?.facility ?? "");
  const [practitioner, setPractitioner] = useState(existing?.practitioner ?? "");
  const [diagnosis, setDiagnosis] = useState(existing?.diagnosis ?? "");
  const [treatmentProvided, setTreatmentProvided] = useState(existing?.treatmentProvided ?? "");
  const [recommendedFollowUp, setRecommendedFollowUp] = useState(existing?.recommendedFollowUp ?? "");
  const [sickLeaveDays, setSickLeaveDays] = useState(String(existing?.sickLeaveDays ?? 0));
  const [sickLeaveFrom, setSickLeaveFrom] = useState(existing?.sickLeaveFrom ?? "");
  const [sickLeaveTo, setSickLeaveTo] = useState(existing?.sickLeaveTo ?? "");
  const [confirmed, setConfirmed] = useState(existing?.signatureAndStampConfirmed ?? false);
  const [date, setDate] = useState(existing?.date ?? today());

  const days = Number(sickLeaveDays);
  // The reporting month the leave will be attributed to, shown while it is
  // being entered. Leave that straddles a month end belongs whole to the month
  // it began in, and that is easier to accept when it is visible up front than
  // to explain afterwards.
  const period = (sickLeaveFrom || date).slice(0, 7);

  return (
    <section className="panel mb-6">
      <div className="panel-head">
        <h2 className="text-lg">{existing ? "Correct the facility feedback" : "Facility feedback"}</h2>
        <span className="text-xs text-ink-muted">
          {existing ? `Version ${existing.version} recorded` : "As reported by the facility"}
        </span>
      </div>
      <form
        className="panel-body space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            facility,
            practitioner,
            diagnosis,
            treatmentProvided,
            recommendedFollowUp,
            sickLeaveDays: Number.isFinite(days) ? days : 0,
            sickLeaveFrom,
            sickLeaveTo,
            signatureAndStampConfirmed: confirmed,
            date,
          });
        }}
      >
        {existing ? (
          <div
            className="flex items-start gap-3 rounded border px-4 py-3 text-xs"
            style={{ borderColor: "var(--rule)", background: "var(--neutral-wash)", color: "var(--ink-muted)" }}
          >
            <Icon name="info" size={16} className="mt-0.5 shrink-0" />
            <span>
              This replaces what was recorded before. The earlier sick-leave figure is superseded
              rather than added to, so absenteeism is not counted twice.
            </span>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className="label">Facility</span>
            <input
              className="field"
              value={facility}
              onChange={(event) => setFacility(event.target.value)}
              required
            />
          </label>
          <label>
            <span className="label">Attending practitioner</span>
            <input
              className="field"
              value={practitioner}
              onChange={(event) => setPractitioner(event.target.value)}
            />
          </label>
        </div>

        <label>
          <span className="label">Diagnosis</span>
          <textarea
            className="field min-h-[70px]"
            value={diagnosis}
            onChange={(event) => setDiagnosis(event.target.value)}
          />
        </label>
        <label>
          <span className="label">Treatment provided</span>
          <textarea
            className="field min-h-[70px]"
            value={treatmentProvided}
            onChange={(event) => setTreatmentProvided(event.target.value)}
          />
        </label>
        <label>
          <span className="label">Recommended follow-up</span>
          <textarea
            className="field min-h-[70px]"
            value={recommendedFollowUp}
            onChange={(event) => setRecommendedFollowUp(event.target.value)}
          />
        </label>

        <fieldset className="rounded border p-4" style={{ borderColor: "var(--rule)" }}>
          <legend className="label px-1">Recommended sick leave</legend>
          <div className="grid grid-cols-3 gap-4">
            <label>
              <span className="label">Days</span>
              <input
                type="number"
                min="0"
                step="0.5"
                className="field data-value"
                value={sickLeaveDays}
                onChange={(event) => setSickLeaveDays(event.target.value)}
              />
            </label>
            <label>
              <span className="label">From</span>
              <input
                type="date"
                className="field"
                value={sickLeaveFrom}
                onChange={(event) => setSickLeaveFrom(event.target.value)}
              />
            </label>
            <label>
              <span className="label">To</span>
              <input
                type="date"
                className="field"
                value={sickLeaveTo}
                onChange={(event) => setSickLeaveTo(event.target.value)}
              />
            </label>
          </div>
          {days > 0 ? (
            <p className="mt-3 text-xs text-ink-muted">
              <span className="data-value">{days}</span> {days === 1 ? "day" : "days"} will
              contribute to health-related absenteeism for{" "}
              <span className="data-value">{period}</span>. Leave is attributed whole to the month it
              began in.
            </p>
          ) : null}
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className="label">Date of feedback</span>
            <input
              type="date"
              className="field"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>Practitioner signature and facility stamp confirmed on the returned form</span>
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" className="button-primary" disabled={busy}>
            {busy ? "Recording…" : "Record feedback"}
          </button>
          <button type="button" className="button-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function ReviewForm({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    comments: string;
    reviewedBy: string;
    position: string;
    signatureConfirmed: boolean;
    date: string;
  }) => void;
}) {
  const [comments, setComments] = useState("");
  const [reviewedBy, setReviewedBy] = useState("");
  const [position, setPosition] = useState("");
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [date, setDate] = useState(today());

  return (
    <section className="panel mb-6">
      <div className="panel-head">
        <h2 className="text-lg">Follow-up review</h2>
        <span className="text-xs text-ink-muted">Closes the referral</span>
      </div>
      <form
        className="panel-body space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ comments, reviewedBy, position, signatureConfirmed, date });
        }}
      >
        <label>
          <span className="label">Review comments</span>
          <textarea
            className="field min-h-[90px]"
            value={comments}
            onChange={(event) => setComments(event.target.value)}
          />
        </label>
        <div className="grid grid-cols-3 gap-4">
          <label>
            <span className="label">Reviewed by</span>
            <input
              className="field"
              value={reviewedBy}
              onChange={(event) => setReviewedBy(event.target.value)}
              required
            />
          </label>
          <label>
            <span className="label">Position</span>
            <input
              className="field"
              value={position}
              onChange={(event) => setPosition(event.target.value)}
            />
          </label>
          <label>
            <span className="label">Date</span>
            <input
              type="date"
              className="field"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={signatureConfirmed}
            onChange={(event) => setSignatureConfirmed(event.target.checked)}
          />
          Signature confirmed
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className="button-primary" disabled={busy}>
            {busy ? "Recording…" : "Record review"}
          </button>
          <button type="button" className="button-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

/**
 * The referral as recorded, section by section, in the order the form prints
 * them. Duplicate Section E label included, because that is what the paper
 * says and a clinician comparing the two must find them corresponding.
 */
function RecordedSections({ referral, form }: { referral: Referral; form: ReferralForm }) {
  const joined = (values: string[], other?: string) =>
    [...values, other].filter(Boolean).join(", ");

  const heading = (index: number) => {
    const section = form.sections[index];
    return section ? `${section.label} · ${section.title}` : "";
  };
  const defect = (index: number) => form.sections[index]?.defect;

  return (
    <div className="space-y-6">
      <RecordPanel title={heading(0)}>
        <Field label="Referred to" value={referral.referredTo} />
        <Field label="Name" value={referral.patientSnapshot.name} />
        <Field label="Position" value={referral.patientSnapshot.position} />
        <Field
          label="Age / sex"
          value={`${referral.patientSnapshot.age} · ${referral.patientSnapshot.sex}`}
        />
        <Field label="Department" value={referral.patientSnapshot.department} />
        <Field label="Division" value={referral.patientSnapshot.division} />
        <Field label="Unit" value={referral.patientSnapshot.unit} />
        <Field label="Contact" value={referral.patientSnapshot.contactNumber} />
        <Field label="Supervisor" value={referral.patientSnapshot.supervisorName} />
        <Field label="Date / time" value={`${referral.referralDate} ${referral.referralTime}`} mono />
        <Field label="Clinical features" value={referral.clinicalFeatures} />
        <Field
          label="Clinical findings"
          value={[
            referral.vitals.bloodPressure ? `BP ${referral.vitals.bloodPressure}` : "",
            referral.vitals.pulse ? `Pulse ${referral.vitals.pulse}` : "",
            referral.vitals.temperature ? `Temp ${referral.vitals.temperature}` : "",
            referral.vitals.spo2 ? `SpO₂ ${referral.vitals.spo2}%` : "",
            referral.bodyMassIndex ? `BMI ${referral.bodyMassIndex}` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <Field
          label="General examination"
          value={joined(referral.generalExamination, referral.generalExaminationOther)}
        />
        <Field
          label="Past medical history"
          value={joined(referral.pastMedicalHistory, referral.pastMedicalHistoryOther)}
        />
        <Field label="Work-related" value={referral.workRelated} />
        <Field label="Suspected exposure" value={referral.suspectedExposure} />
        <Field label="Investigations done" value={referral.investigationsDone} />
        <Field label="Provisional diagnosis" value={referral.provisionalDiagnosis} />
        <Field label="Treatment given" value={referral.treatmentGiven} />
        <Field
          label="Reason for referral"
          value={joined(referral.referralReasons, referral.referralReasonOther)}
        />
      </RecordPanel>

      <RecordPanel title={heading(1)}>
        <Field label="Officer" value={referral.clearance.officer} />
        <Field label="Position" value={referral.clearance.printedPosition} />
        <Field label="Contact" value={referral.clearance.contact} />
        <Field
          label="Date / time"
          value={`${referral.clearance.date ?? ""} ${referral.clearance.time ?? ""}`.trim()}
          mono
        />
        <Field
          label="Signature confirmed"
          value={referral.clearance.signatureConfirmed ? "Yes" : "No"}
        />
      </RecordPanel>

      <RecordPanel title={heading(2)}>
        {referral.authorisation ? (
          <>
            <Field label="Head of Division" value={referral.authorisation.headOfDivision.name} />
            <Field label="Date" value={referral.authorisation.headOfDivision.date} mono />
            <Field label="Remarks" value={referral.authorisation.headOfDivision.remarks} />
            <Field label="Chief of Staff" value={referral.authorisation.chiefOfStaff.name} />
            <Field label="Date" value={referral.authorisation.chiefOfStaff.date} mono />
            <Field label="Remarks" value={referral.authorisation.chiefOfStaff.remarks} />
            <Field label="Cost implication" value={referral.authorisation.costImplication} />
            <Field label="Recorded by" value={referral.authorisation.recordedBy} />
          </>
        ) : (
          <p className="col-span-2 text-sm text-ink-muted">Not yet recorded.</p>
        )}
      </RecordPanel>

      <RecordPanel title={heading(3)} defect={defect(3)}>
        {referral.externalFeedback ? (
          <>
            <Field label="Facility" value={referral.externalFeedback.facility} />
            <Field label="Practitioner" value={referral.externalFeedback.practitioner} />
            <Field label="Diagnosis" value={referral.externalFeedback.diagnosis} />
            <Field label="Treatment provided" value={referral.externalFeedback.treatmentProvided} />
            <Field label="Recommended follow-up" value={referral.externalFeedback.recommendedFollowUp} />
            <Field label="Sick leave days" value={referral.externalFeedback.sickLeaveDays} mono />
            <Field
              label="Leave dates"
              value={
                referral.externalFeedback.sickLeaveFrom
                  ? `${referral.externalFeedback.sickLeaveFrom} to ${referral.externalFeedback.sickLeaveTo ?? ""}`.trim()
                  : ""
              }
              mono
            />
            <Field
              label="Signature and stamp"
              value={referral.externalFeedback.signatureAndStampConfirmed ? "Confirmed" : "Not confirmed"}
            />
          </>
        ) : (
          <p className="col-span-2 text-sm text-ink-muted">
            The facility has not reported back yet.
          </p>
        )}
      </RecordPanel>

      <RecordPanel title={heading(4)} defect={defect(4)}>
        {referral.followUpReview ? (
          <>
            <Field label="Comments" value={referral.followUpReview.comments} />
            <Field label="Reviewed by" value={referral.followUpReview.reviewedBy} />
            <Field label="Position" value={referral.followUpReview.position} />
            <Field label="Date" value={referral.followUpReview.date} mono />
          </>
        ) : (
          <p className="col-span-2 text-sm text-ink-muted">Not yet reviewed.</p>
        )}
      </RecordPanel>
    </div>
  );
}

function RecordPanel({
  title,
  defect,
  children,
}: {
  title: string;
  defect?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="text-lg">{title}</h2>
      </div>
      <div className="panel-body space-y-4">
        {/* The form's own numbering defect, shown rather than corrected. A
            clinician holding the paper must find the same labels here. */}
        {defect ? (
          <div
            className="flex items-start gap-3 rounded border px-4 py-3 text-xs"
            style={{ borderColor: "var(--caution)", background: "var(--caution-wash)", color: "var(--caution)" }}
          >
            <Icon name="info" size={16} className="mt-0.5 shrink-0" />
            <span>{defect}</span>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-4 text-sm">{children}</div>
      </div>
    </section>
  );
}
