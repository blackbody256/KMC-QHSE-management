import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { DataValue } from "../components/DataValue";
import { StatusIndicator, type Status } from "../components/StatusIndicator";
import {
  ApiError,
  clinicalApi,
  labApi,
  type LabCatalogue,
  type LabRequisition,
  type PatientRecord,
  type Referral,
  type TimelineEntry,
} from "../lib/api";
import { referralStatusPresentation } from "../lib/referralStatus";
import { downloadPatientHistoryPdf } from "../lib/patientHistoryPdf";

/**
 * One patient, everything that has happened to them.
 *
 * The organising idea is that a clinician asks "what has happened to this
 * person", not "list the visits, then list the tests, then join them". So the
 * page is a single chronological stream, and the unit of the stream is the
 * visit, because a laboratory requisition and a referral are raised *from* a
 * visit, and nesting them under it is how the record actually relates.
 *
 * Three things sit above the stream, in the order a clinician needs them:
 *
 *   who this is. Identity, never more than one line of detail
 *   what is outstanding. Shown only when something is
 *   how much history there is. Counts, so the stream's length is expected
 *
 * The attention band appears only when it has something to say. A permanent
 * banner reading "0 outstanding" trains people to stop reading banners, and
 * the one time it matters is the time it will be scrolled past.
 */

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(value?: string) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed);
}

/**
 * The lenses a clinician actually reads this record through.
 *
 * Not a search box. Somebody opening a patient record has one of a small number
 * of questions. What did the lab say, has the occupational history a pattern,
 * what is still unfinished, and each is a filter over the same stream rather
 * than a different screen. The count beside each one means the answer "none" is
 * visible before the filter is applied, so nobody hunts through an empty list.
 */
type Lens = "all" | "work-related" | "laboratory" | "referrals" | "unfinished";

const lenses: { id: Lens; label: string; matches: (entry: TimelineEntry) => boolean }[] = [
  { id: "all", label: "Everything", matches: () => true },
  {
    // Named for what it actually matches. The visit record offers Yes, No and
    // Unsure, and a lens called "Work related" that silently excluded Unsure
    // would answer a narrower question than the one the reader asked.
    id: "work-related",
    label: "Work related",
    matches: (entry) =>
      entry.visit.workRelated === "Yes" ||
      entry.visit.workRelated === "Unsure" ||
      entry.referrals.some((referral) => referral.workRelated !== "No"),
  },
  { id: "laboratory", label: "Laboratory", matches: (entry) => entry.requisitions.length > 0 },
  { id: "referrals", label: "Referrals", matches: (entry) => entry.referrals.length > 0 },
  {
    id: "unfinished",
    label: "Unfinished",
    matches: (entry) =>
      entry.visit.state === "draft" ||
      entry.requisitions.some((requisition) => requisition.status !== "resulted") ||
      entry.referrals.some((referral) => referral.status !== "reviewed"),
  },
];

/** The visits of one year, newest year first. */
interface YearGroup {
  year: string;
  entries: TimelineEntry[];
}

function groupByYear(entries: TimelineEntry[]): YearGroup[] {
  const groups: YearGroup[] = [];
  for (const entry of entries) {
    const year = entry.visit.visitDate.slice(0, 4);
    const last = groups[groups.length - 1];
    if (last && last.year === year) {
      last.entries.push(entry);
    } else {
      groups.push({ year, entries: [entry] });
    }
  }
  return groups;
}

const requisitionStatus = (status: LabRequisition["status"]): { status: Status; label: string } => {
  switch (status) {
    case "resulted":
      return { status: "within", label: "Results recorded" };
    case "collected":
      return { status: "provisional", label: "Specimen collected" };
    default:
      return { status: "no-data", label: "Awaiting specimen" };
  }
};

export function PatientRecordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const patientId = params.get("id") ?? "";

  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [catalogue, setCatalogue] = useState<LabCatalogue | null>(null);
  const [lens, setLens] = useState<Lens>("all");
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // The catalogue names the investigations. It is fetched alongside rather
      // than after, so the printed record can spell out "Complete Blood Count"
      // instead of "CBC" without a second round trip when the user asks for it.
      const [recordBody, catalogueBody] = await Promise.all([
        clinicalApi.getPatientRecord(patientId),
        labApi.catalogue().catch(() => null),
      ]);
      setRecord(recordBody);
      setCatalogue(catalogueBody);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The record could not be read. Try again.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId) void load();
  }, [patientId, load]);

  if (loading) return <div className="py-12 text-sm text-ink-muted">Reading the record…</div>;

  if (error || !record) {
    return (
      <div className="max-w-form py-12">
        <div
          className="flex items-start gap-3 rounded border px-4 py-3 text-sm"
          style={{ borderColor: "var(--breach)", background: "var(--breach-wash)", color: "var(--breach)" }}
          role="alert"
        >
          <Icon name="error" size={18} className="mt-0.5 shrink-0" />
          <span>{error ?? "That patient does not exist."}</span>
        </div>
      </div>
    );
  }

  const { patient, summary, timeline, unlinked, unlinkedReferrals } = record;

  const active = lenses.find((option) => option.id === lens) ?? lenses[0];
  const visible = timeline.filter(active.matches);
  const grouped = groupByYear(visible);

  const attention: { icon: "draft" | "science" | "forward_to_inbox"; text: string; to?: string }[] = [];
  if (summary.draftVisits > 0) {
    attention.push({
      icon: "draft",
      text: `${summary.draftVisits} visit${summary.draftVisits === 1 ? "" : "s"} still in draft. A draft is not part of the record until it is signed.`,
    });
  }
  if (summary.awaitingResults > 0) {
    attention.push({
      icon: "science",
      text: `${summary.awaitingResults} laboratory requisition${summary.awaitingResults === 1 ? "" : "s"} without results.`,
    });
  }
  // A referral nobody has closed means someone may still be out at a facility.
  // It belongs beside the outstanding results rather than buried in the
  // timeline, because it is the same kind of question.
  if (summary.openReferrals > 0) {
    attention.push({
      icon: "forward_to_inbox",
      text: `${summary.openReferrals} referral${summary.openReferrals === 1 ? "" : "s"} not yet reviewed.`,
    });
  }

  return (
    <>
      <PageHeader
        title={patient.fullName}
        description={[
          patient.category + (patient.categoryDetail ? ` · ${patient.categoryDetail}` : ""),
          patient.employeeNumber || null,
          patient.jobTitle || null,
          patient.department || null,
          `${patient.age} · ${patient.sex}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <button type="button" className="button-secondary" onClick={() => navigate("/patients")}>
              <Icon name="arrow_back" size={16} />
              Registry
            </button>
            <button
              type="button"
              className="button-secondary"
              disabled={downloading}
              onClick={async () => {
                setDownloading(true);
                try {
                  await downloadPatientHistoryPdf(record, catalogue ?? undefined);
                } finally {
                  setDownloading(false);
                }
              }}
            >
              <Icon name="download" size={16} />
              {downloading ? "Preparing…" : "Download record"}
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={() => navigate(`/patient-visits/new?patientId=${encodeURIComponent(patient.id)}`)}
            >
              <Icon name="add" size={18} />
              Start visit
            </button>
          </>
        }
      />

      {attention.length > 0 ? (
        <section
          className="mb-6 rounded border px-4 py-3"
          style={{ borderColor: "var(--caution)", background: "var(--caution-wash)" }}
        >
          <div className="mb-2 text-sm font-semibold" style={{ color: "var(--caution)" }}>
            Needs attention
          </div>
          <ul className="space-y-1.5">
            {attention.map((item) => (
              <li key={item.text} className="flex items-start gap-2 text-sm text-ink">
                <Icon name={item.icon} size={16} className="mt-0.5 shrink-0" />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel mb-6">
        <div className="panel-body grid grid-cols-2 gap-6 sm:grid-cols-4">
          <DataValue value={summary.visitCount} context="Visits recorded" size="lg" />
          <DataValue value={formatDate(summary.lastVisit)} context="Last seen" size="lg" />
          <DataValue value={formatDate(summary.firstVisit)} context="First seen" size="lg" />
          <DataValue
            value={summary.workRelatedCount}
            context="Recorded work related"
            size="lg"
          />
        </div>
      </section>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg">History</h2>

        {timeline.length > 0 ? (
          <div
            className="flex flex-wrap items-center gap-1"
            role="group"
            aria-label="Filter the history"
          >
            {lenses.map((option) => {
              const count = timeline.filter(option.matches).length;
              const active = lens === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  aria-controls="patient-history"
                  // Never disabled, even at a count of zero. A disabled button
                  // leaves the keyboard tab order and cannot say why it is
                  // unavailable, so a keyboard user loses the control and the
                  // explanation at once. Selecting it gives an empty state that
                  // answers the question and offers the way back.
                  onClick={() => setLens(option.id)}
                  className="rounded border px-3 py-1.5 text-xs font-medium"
                  style={{
                    borderColor: active ? "var(--focus)" : "var(--rule)",
                    background: active ? "var(--info-wash)" : "var(--surface)",
                    color: active ? "var(--info)" : "var(--ink-muted)",
                  }}
                >
                  {option.label}{" "}
                  <span className="data-value">{count}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Announced on change, so a screen reader learns the filter did
          something. Visually hidden: the counts are already on the buttons. */}
      <p aria-live="polite" className="sr-only">
        {visible.length} of {timeline.length} visits shown.
      </p>

      <div id="patient-history">
      {timeline.length === 0 ? (
        <section className="panel">
          <div className="panel-body text-sm text-ink-muted">
            No visits recorded for {patient.fullName} yet. Start a visit to open the record.
          </div>
        </section>
      ) : visible.length === 0 ? (
        <section className="panel">
          <div className="panel-body text-sm text-ink-muted">
            No visit in this record matches that filter.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => setLens("all")}
            >
              Show everything
            </button>
            .
          </div>
        </section>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.year} aria-labelledby={`year-${group.year}`}>
              {/* The year is a heading rather than a repeated line on every
                  card. A record spanning four years reads as four chapters,
                  and the eye can skip to the one it wants. */}
              <div className="mb-3 flex items-baseline gap-3">
                <h3 id={`year-${group.year}`} className="data-value text-base font-semibold">
                  {group.year}
                </h3>
                <span className="text-xs text-ink-muted">
                  <span className="data-value">{group.entries.length}</span>{" "}
                  {group.entries.length === 1 ? "visit" : "visits"}
                </span>
                <span className="h-px flex-1" style={{ background: "var(--rule)" }} />
              </div>

              <ol className="relative space-y-4 pl-6">
                {/* The rail. Purely decorative. Every entry states its own
                    date, so the line is never the only thing carrying the
                    chronology. */}
                <span
                  aria-hidden="true"
                  className="absolute bottom-2 left-[7px] top-2 w-px"
                  style={{ background: "var(--rule-strong)" }}
                />
                {group.entries.map((entry) => (
                  <TimelineCard key={entry.visit.id} entry={entry} onOpen={navigate} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
      </div>

      {unlinked.length > 0 || unlinkedReferrals.length > 0 ? (
        <section className="panel mt-6">
          <div className="panel-head">
            <h2 className="text-lg">Not attached to a visit shown above</h2>
          </div>
          <div className="panel-body space-y-2">
            <p className="text-sm text-ink-muted">
              These belong to visits outside the range loaded here. They are listed so that a result
              or a referral is never simply missing.
            </p>
            {unlinked.map((requisition) => (
              <RequisitionRow
                key={requisition.id}
                requisition={requisition}
                onOpen={() =>
                  navigate(`/laboratory/details?id=${encodeURIComponent(requisition.id)}`)
                }
              />
            ))}
            {unlinkedReferrals.map((referral) => (
              <ReferralRow
                key={referral.id}
                referral={referral}
                onOpen={() => navigate(`/referrals/details?id=${encodeURIComponent(referral.id)}`)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function TimelineCard({
  entry,
  onOpen,
}: {
  entry: TimelineEntry;
  onOpen: (to: string) => void;
}) {
  const { visit, summary, completeness, requisitions, referrals } = entry;
  const signed = visit.state === "signed";

  return (
    <li className="relative">
      <span
        aria-hidden="true"
        className="absolute -left-6 top-4 h-3.5 w-3.5 rounded-full border-2"
        style={{
          background: "var(--surface)",
          borderColor: signed ? "var(--ok)" : "var(--caution)",
        }}
      />

      <article className="panel">
        <div className="panel-head flex-wrap">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="data-value text-lg font-medium">{formatDate(visit.visitDate)}</span>
            {visit.timeIn ? <span className="data-value text-sm text-ink-muted">{visit.timeIn}</span> : null}
            <span className="text-sm font-medium">{visit.visitType}</span>
            {visit.workRelated === "Yes" ? (
              <span
                className="rounded px-2 py-0.5 text-xs font-semibold"
                style={{ background: "var(--caution-wash)", color: "var(--caution)" }}
              >
                Work related
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-muted">
              <span className="data-value">{completeness.decided}</span>
              <span className="data-value">/{completeness.total}</span> sections
            </span>
            <StatusIndicator
              status={signed ? "within" : "provisional"}
              label={signed ? "Signed" : "Draft"}
            />
          </div>
        </div>

        <div className="panel-body space-y-3">
          {summary.presentingComplaint || summary.impression || summary.treatment ? (
            <dl className="space-y-2 text-sm">
              {summary.presentingComplaint ? (
                <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
                  <dt className="text-xs text-ink-muted">Complaint</dt>
                  <dd>{summary.presentingComplaint}</dd>
                </div>
              ) : null}
              {summary.impression ? (
                <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
                  <dt className="text-xs text-ink-muted">Impression</dt>
                  <dd>{summary.impression}</dd>
                </div>
              ) : null}
              {summary.treatment ? (
                <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
                  <dt className="text-xs text-ink-muted">Treatment</dt>
                  <dd>{summary.treatment}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="text-sm text-ink-faint">
              No complaint, impression or treatment recorded on this visit.
            </p>
          )}

          {requisitions.length > 0 || referrals.length > 0 ? (
            <div className="space-y-2 border-t border-rule pt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Raised from this visit
              </div>
              {requisitions.map((requisition) => (
                <RequisitionRow
                  key={requisition.id}
                  requisition={requisition}
                  onOpen={() => onOpen(`/laboratory/details?id=${encodeURIComponent(requisition.id)}`)}
                />
              ))}
              {/* Referrals sit beside the requisitions rather than in their own
                  block: both are documents this visit produced, and an officer
                  asking what happened afterwards wants them together. */}
              {referrals.map((referral) => (
                <ReferralRow
                  key={referral.id}
                  referral={referral}
                  onOpen={() => onOpen(`/referrals/details?id=${encodeURIComponent(referral.id)}`)}
                />
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="button-secondary"
              onClick={() => onOpen(`/patient-visits/details?id=${encodeURIComponent(visit.id)}`)}
            >
              {signed ? "Review visit" : "Continue visit"}
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => onOpen(`/laboratory/new?visitId=${encodeURIComponent(visit.id)}`)}
            >
              <Icon name="science" size={16} />
              Request laboratory
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => onOpen(`/referrals/new?visitId=${encodeURIComponent(visit.id)}`)}
            >
              <Icon name="forward_to_inbox" size={16} />
              Refer out
            </button>
          </div>
        </div>
      </article>
    </li>
  );
}

function RequisitionRow({
  requisition,
  onOpen,
}: {
  requisition: LabRequisition;
  onOpen: () => void;
}) {
  const state = requisitionStatus(requisition.status);
  const resulted = requisition.tests.filter((test) => test.result !== "").length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-3 rounded border px-3 py-2 text-left hover:bg-surface-sunken"
      style={{ borderColor: "var(--rule)" }}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Icon name="science" size={18} className="shrink-0 text-ink-muted" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            Laboratory · {requisition.tests.length} investigation
            {requisition.tests.length === 1 ? "" : "s"}
          </span>
          <span className="block text-xs text-ink-muted">
            <span className="data-value">{resulted}</span>
            <span className="data-value">/{requisition.tests.length}</span> resulted ·{" "}
            {requisition.formNumber}
          </span>
        </span>
      </span>
      <StatusIndicator status={state.status} label={state.label} />
    </button>
  );
}

/**
 * A referral in the timeline. Shaped like RequisitionRow because they sit in
 * the same list and a difference in shape would suggest a difference in kind.
 */
function ReferralRow({ referral, onOpen }: { referral: Referral; onOpen: () => void }) {
  const state = referralStatusPresentation[referral.status];
  const leave = referral.externalFeedback?.sickLeaveDays;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-3 rounded border px-3 py-2 text-left hover:bg-surface-sunken"
      style={{ borderColor: "var(--rule)" }}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Icon name="forward_to_inbox" size={18} className="shrink-0 text-ink-muted" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            Referral · {referral.referredTo}
          </span>
          <span className="block text-xs text-ink-muted">
            {leave === undefined
              ? referral.formNumber
              : `${leave} day${leave === 1 ? "" : "s"} sick leave recommended · ${referral.formNumber}`}
          </span>
        </span>
      </span>
      <StatusIndicator status={state.status} label={state.label} />
    </button>
  );
}
