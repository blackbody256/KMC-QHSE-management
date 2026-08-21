import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { DataValue } from "../components/DataValue";
import { StatusIndicator, type Status } from "../components/StatusIndicator";
import {
  ApiError,
  clinicalApi,
  type SectionDescriptor,
  type SectionStatus,
  type Visit,
  type VisitSection,
} from "../lib/api";

const statusChoices: { value: SectionStatus; label: string }[] = [
  { value: "not-recorded", label: "Not recorded" },
  { value: "partial", label: "Partial" },
  { value: "complete", label: "Complete" },
  { value: "not-indicated", label: "Not clinically indicated" },
];

const statusIndicator: Record<SectionStatus, Status> = {
  "not-recorded": "no-data",
  partial: "provisional",
  complete: "within",
  "not-indicated": "not-applicable",
};

const emptySection: VisitSection = { status: "not-recorded", notes: "", selections: [] };

/**
 * The visit record.
 *
 * Sections open one at a time and their state is visible on the collapsed
 * header, per UI-03. That visible state is the mechanism that makes partial
 * completion auditable rather than merely tolerated: a blank field cannot
 * distinguish "not clinically indicated" from "forgotten", and recording that
 * distinction is the whole point.
 *
 * Signing locks the record. After that the only honest action is an appended
 * amendment that preserves the original.
 */
export function VisitDetailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const visitId = params.get("id") ?? "";

  const [visit, setVisit] = useState<Visit | null>(null);
  const [sections, setSections] = useState<SectionDescriptor[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, VisitSection>>({});
  const [savedAt, setSavedAt] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [visitBody, sectionBody] = await Promise.all([
        clinicalApi.getVisit(visitId),
        clinicalApi.sections(),
      ]);
      setVisit(visitBody.visit);
      setSections(sectionBody.sections);
      setDrafts(visitBody.visit.sections ?? {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The visit could not be read. Try again.");
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => {
    if (visitId) void load();
  }, [visitId, load]);

  const locked = visit?.state === "signed";

  const sectionOf = (code: string): VisitSection => drafts[code] ?? emptySection;

  // Saved on blur rather than by a save button, so that navigating between
  // sections never loses what was typed, per NFR-USE-04. The confirmation is a
  // quiet timestamp, not a toast.
  async function persist(code: string) {
    if (locked) return;
    try {
      await clinicalApi.saveSection(visitId, code, sectionOf(code));
      setSavedAt((current) => ({
        ...current,
        [code]: new Date().toTimeString().slice(0, 5),
      }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That section could not be saved.");
    }
  }

  async function sign() {
    if (!visit) return;
    const confirmed = window.confirm(
      "Signing locks this visit. After signing it cannot be edited. A correction has to be added as an amendment that keeps the original intact.\n\nSign this visit?",
    );
    if (!confirmed) return;

    setSigning(true);
    setError(null);
    try {
      await clinicalApi.signVisit(visitId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The visit could not be signed. Try again.");
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-sm text-ink-muted">Reading the visit…</div>;
  }

  if (error && !visit) {
    return (
      <div className="max-w-form py-12">
        <div
          className="flex items-start gap-3 rounded border px-4 py-3 text-sm"
          style={{ borderColor: "var(--breach)", background: "var(--breach-wash)", color: "var(--breach)" }}
          role="alert"
        >
          <Icon name="error" size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!visit) return null;

  const decided = sections.filter((s) => {
    const status = sectionOf(s.code).status;
    return status === "complete" || status === "not-indicated";
  }).length;

  return (
    <>
      <PageHeader
        title={`Visit · ${visit.visitType}`}
        description={`${visit.visitDate}${visit.timeIn ? ` at ${visit.timeIn}` : ""} · recorded by ${visit.recordedBy}`}
        actions={
          <>
            <button
              type="button"
              className="button-secondary"
              onClick={() => navigate(`/patients/record?id=${encodeURIComponent(visit.patientId)}`)}
            >
              <Icon name="arrow_back" size={16} />
              Patient record
            </button>
            {/* Raised from the visit so that patient information is carried
                across rather than typed a second time. */}
            <button
              type="button"
              className="button-secondary"
              onClick={() => navigate(`/laboratory/new?visitId=${encodeURIComponent(visitId)}`)}
            >
              <Icon name="science" size={16} />
              Request laboratory
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => navigate(`/referrals/new?visitId=${encodeURIComponent(visitId)}`)}
            >
              <Icon name="forward_to_inbox" size={16} />
              Refer out
            </button>
            {!locked ? (
              <button type="button" className="button-primary" onClick={() => void sign()} disabled={signing}>
                <Icon name="verified" size={18} />
                {signing ? "Signing…" : "Sign visit"}
              </button>
            ) : null}
          </>
        }
      />

      {locked ? (
        <div
          className="mb-6 flex items-start gap-3 rounded border px-4 py-3 text-sm"
          style={{ borderColor: "var(--rule-strong)", background: "var(--neutral-wash)", color: "var(--ink-muted)" }}
        >
          <Icon name="lock" size={18} className="mt-0.5 shrink-0" />
          <span>
            Signed by {visit.signedBy} and locked. A correction is added as an amendment that keeps
            this record intact. The amendment workflow is not yet built.
          </span>
        </div>
      ) : null}

      {error ? (
        <div
          className="mb-6 flex items-start gap-3 rounded border px-4 py-3 text-sm"
          style={{ borderColor: "var(--breach)", background: "var(--breach-wash)", color: "var(--breach)" }}
          role="alert"
        >
          <Icon name="error" size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="panel">
          <div className="panel-head">
            <h2 className="text-lg">Clinical record</h2>
            <span className="text-sm text-ink-muted">
              <span className="data-value">{decided}</span>
              <span className="data-value">/{sections.length}</span> sections decided
            </span>
          </div>

          <div>
            {sections.map((descriptor) => {
              const section = sectionOf(descriptor.code);
              const isOpen = open === descriptor.code;
              return (
                <div key={descriptor.code} className="border-b border-rule last:border-b-0">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-6 py-3 text-left hover:bg-surface-sunken"
                    onClick={() => setOpen(isOpen ? null : descriptor.code)}
                    aria-expanded={isOpen}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Icon name={isOpen ? "arrow_back" : "chevron_right"} size={16} className="text-ink-faint" />
                      {descriptor.label}
                    </span>
                    <span className="flex items-center gap-3">
                      {savedAt[descriptor.code] ? (
                        <span className="text-xs text-ink-faint">Saved {savedAt[descriptor.code]}</span>
                      ) : null}
                      <StatusIndicator
                        status={statusIndicator[section.status]}
                        label={statusChoices.find((c) => c.value === section.status)?.label}
                      />
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="space-y-4 px-6 pb-6">
                      <fieldset>
                        <legend className="label">Section state</legend>
                        <div className="grid grid-cols-2 gap-2">
                          {statusChoices.map((choice) => (
                            <label
                              key={choice.value}
                              className="flex cursor-pointer items-center gap-2 rounded border px-3 py-2"
                              style={{
                                borderColor: section.status === choice.value ? "var(--focus)" : "var(--rule)",
                                background: section.status === choice.value ? "var(--info-wash)" : "var(--surface)",
                                opacity: locked ? 0.6 : 1,
                              }}
                            >
                              <input
                                type="radio"
                                name={`status-${descriptor.code}`}
                                checked={section.status === choice.value}
                                disabled={locked}
                                onChange={() =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [descriptor.code]: { ...sectionOf(descriptor.code), status: choice.value },
                                  }))
                                }
                                onBlur={() => void persist(descriptor.code)}
                              />
                              <span className="text-sm">{choice.label}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      <div>
                        <label className="label" htmlFor={`notes-${descriptor.code}`}>Notes</label>
                        <textarea
                          id={`notes-${descriptor.code}`}
                          className="field min-h-[120px]"
                          value={section.notes}
                          disabled={locked}
                          onChange={(e) =>
                            setDrafts((current) => ({
                              ...current,
                              [descriptor.code]: { ...sectionOf(descriptor.code), notes: e.target.value },
                            }))
                          }
                          onBlur={() => void persist(descriptor.code)}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-y-6">
          <section className="panel self-start">
            <div className="panel-head">
              <h2 className="text-lg">Vital signs</h2>
            </div>
            <div className="panel-body grid grid-cols-2 gap-4">
              <DataValue value={visit.vitals.bloodPressure ?? null} context="Blood pressure" unit="mmHg" />
              <DataValue value={visit.vitals.pulse ?? null} context="Pulse" unit="bpm" />
              <DataValue value={visit.vitals.respiratoryRate ?? null} context="Respiratory rate" />
              <DataValue value={visit.vitals.temperature ?? null} context="Temperature" unit="°C" />
              <DataValue value={visit.vitals.spo2 ?? null} context="Oxygen saturation" unit="%" />
              <DataValue value={visit.vitals.painScore ?? null} context="Pain score" />
              <DataValue value={visit.vitals.weightKg ?? null} context="Weight" unit="kg" />
              <DataValue value={visit.vitals.heightCm ?? null} context="Height" unit="cm" />
              <DataValue value={visit.bodyMassIndex ?? null} context="Body mass index · derived" />
            </div>
          </section>

          <section className="panel self-start">
            <div className="panel-head">
              <h2 className="text-lg">This visit</h2>
            </div>
            <div className="panel-body space-y-3 text-sm">
              <div>
                <div className="text-xs text-ink-muted">Work related</div>
                <div>{visit.workRelated}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">State</div>
                <StatusIndicator
                  status={locked ? "within" : "provisional"}
                  label={locked ? "Signed" : "Draft"}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
