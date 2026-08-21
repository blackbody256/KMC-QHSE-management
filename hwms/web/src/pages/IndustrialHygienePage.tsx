import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { StatusIndicator } from "../components/StatusIndicator";
import {
  ApiError,
  occupationalApi,
  type HygieneLimit,
  type MonitoringEvent,
} from "../lib/api";
import { primaryRole, useSession } from "../lib/session";
import { currentPeriod, today } from "../lib/dates";

/**
 * The industrial hygiene monitoring register.
 *
 * Two properties of this screen are the whole point of the module.
 *
 * A reading is judged against the limit in force on the day it was taken, and
 * that limit is copied onto the reading and frozen. Revising a limit next year
 * cannot change what a reading meant this year, so a compliance report run
 * twice a year apart gives the same answer about the same day.
 *
 * The monitoring context is required. The same parameter carries a different
 * limit for occupational exposure, for indoor workplace air and for ambient
 * air. 85 dB(A) over a shift against 55 dB(A) at night. A reading judged
 * against the wrong one is worse than a reading nobody judged.
 */
const contextLabels: Record<string, string> = {
  "occupational-exposure": "Occupational exposure",
  "indoor-workplace": "Indoor workplace",
  ambient: "Ambient",
};


export function IndustrialHygienePage() {
  const { user } = useSession();
  const readOnly = primaryRole(user) !== "hwms-officer";

  const [period, setPeriod] = useState(currentPeriod);
  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  const [limits, setLimits] = useState<HygieneLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingEvent, setAddingEvent] = useState(false);
  const [readingFor, setReadingFor] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      // The limits are resolved for the selected month, not for today.
      //
      // The server judges a reading against the limit in force on the date of
      // its monitoring event. Previewing against today's limit would show the
      // officer one verdict and store another whenever a limit had been
      // revised since, and the stored one is the one that is frozen.
      const [eventBody, limitBody] = await Promise.all([
        occupationalApi.listEvents(period),
        occupationalApi.parameters(`${period}-01`),
      ]);
      setEvents(eventBody.events);
      setLimits(limitBody.limits);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The register could not be read. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const performed = events.filter((event) => event.performed).length;
  const readings = events.flatMap((event) => event.readings);
  const eligible = readings.filter((reading) => reading.kpiEligible);
  const within = eligible.filter((reading) => reading.compliance === "within").length;

  return (
    <>
      <PageHeader
        title="Industrial hygiene"
        description="Occupational exposure, indoor workplace and ambient readings, each evaluated against the limit in force on the day it was taken."
        actions={
          <>
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              Month
              <input
                type="month"
                className="field w-auto py-1.5 text-sm"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              />
            </label>
            {!readOnly ? (
              <button type="button" className="button-primary" onClick={() => setAddingEvent(true)}>
                <Icon name="add" size={18} />
                Record monitoring
              </button>
            ) : null}
          </>
        }
      />

      <section className="panel mb-6">
        <div className="panel-body grid grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-xs text-ink-muted">Monitoring performed</div>
            <div className="data-value text-xl">{performed}</div>
            <p className="mt-1 text-xs text-ink-muted">
              Occasions recorded this month, including those recorded as not performed.
            </p>
          </div>
          <div>
            <div className="text-xs text-ink-muted">Readings taken</div>
            <div className="data-value text-xl">{readings.length}</div>
            <p className="mt-1 text-xs text-ink-muted">
              <span className="data-value">{eligible.length}</span> count towards compliance.
              Ad-hoc readings stay in the register and out of the percentage.
            </p>
          </div>
          <div>
            <div className="text-xs text-ink-muted">Within limit</div>
            <div className="data-value text-xl">
              {eligible.length === 0 ? (
                <span className="text-ink-faint">—</span>
              ) : (
                `${((within / eligible.length) * 100).toFixed(1)}%`
              )}
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {eligible.length === 0
                ? "No eligible readings this month, which is not the same as none within limit."
                : `${within} of ${eligible.length} eligible readings.`}
            </p>
          </div>
        </div>
      </section>

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

      {addingEvent ? (
        <NewEventForm
          onCancel={() => setAddingEvent(false)}
          onSaved={() => {
            setAddingEvent(false);
            void reload();
          }}
        />
      ) : null}

      {loading ? (
        <div className="py-12 text-sm text-ink-muted">Reading the register…</div>
      ) : events.length === 0 ? (
        <section className="panel">
          <div className="panel-body text-sm text-ink-muted">
            No monitoring recorded for {period}. A month with nothing recorded is not a month that
            passed. Record the occasions that happened, and record the ones that did not with the
            reason.
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <article key={event.id} className="panel">
              <div className="panel-head flex-wrap">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="data-value text-lg font-medium">{event.eventDate}</span>
                  <span className="font-medium">{event.location}</span>
                  {event.instrument ? (
                    <span className="text-xs text-ink-muted">Instrument {event.instrument}</span>
                  ) : null}
                </div>
                <StatusIndicator
                  status={event.performed ? "within" : "informational"}
                  label={event.performed ? "Performed" : "Not performed"}
                />
              </div>

              <div className="panel-body space-y-3">
                {!event.performed ? (
                  <p className="text-sm text-ink-muted">
                    Not performed: {event.notPerformedReason}
                  </p>
                ) : null}
                {event.notes ? <p className="text-sm text-ink-muted">{event.notes}</p> : null}

                {event.readings.length > 0 ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        <th>Value</th>
                        <th>Limit applied</th>
                        <th>Context</th>
                        <th>Standard</th>
                        <th>Evaluation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {event.readings.map((reading) => (
                        <tr key={reading.id}>
                          <td>{reading.parameter}</td>
                          <td>
                            <span className="data-value">{reading.value}</span>{" "}
                            <span className="text-xs text-ink-muted">{reading.unit}</span>
                          </td>
                          <td>
                            <span className="data-value">{reading.limitApplied}</span>{" "}
                            <span className="text-xs text-ink-muted">
                              {reading.unit} · {reading.averagingPeriod}
                            </span>
                          </td>
                          <td className="text-xs">{contextLabels[reading.context] ?? reading.context}</td>
                          <td className="text-xs text-ink-muted">
                            {reading.standardFamily}
                            {reading.standardVersion ? ` · ${reading.standardVersion}` : ""}
                          </td>
                          <td>
                            <div className="flex flex-col items-start gap-1">
                              <StatusIndicator
                                status={reading.compliance === "within" ? "within" : "breach"}
                                label={reading.compliance === "within" ? "Within limit" : "Over limit"}
                              />
                              {!reading.kpiEligible ? (
                                <span className="text-xs text-ink-faint">Not counted in compliance</span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : event.performed ? (
                  <p className="text-sm text-ink-faint">No readings recorded against this occasion yet.</p>
                ) : null}

                {!readOnly && event.performed ? (
                  readingFor === event.id ? (
                    <NewReadingForm
                      eventId={event.id}
                      limits={limits}
                      onCancel={() => setReadingFor(null)}
                      onSaved={() => {
                        setReadingFor(null);
                        void reload();
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => setReadingFor(event.id)}
                    >
                      <Icon name="add" size={16} />
                      Add a reading
                    </button>
                  )
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function NewEventForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const [eventDate, setEventDate] = useState(today);
  const [location, setLocation] = useState("");
  const [instrument, setInstrument] = useState("");
  const [performed, setPerformed] = useState(true);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="panel mb-6">
      <div className="panel-head">
        <h2 className="text-lg">Record monitoring</h2>
      </div>
      <form
        className="panel-body space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setSaving(true);
          try {
            await occupationalApi.createEvent({
              eventDate,
              location,
              instrument,
              performed,
              notPerformedReason: reason,
              notes,
            });
            onSaved();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "That could not be saved. Try again.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="grid grid-cols-3 gap-4">
          <label>
            <span className="label">Date</span>
            <input
              type="date"
              className="field"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              required
            />
          </label>
          <label>
            <span className="label">Location</span>
            <input
              className="field"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              required
            />
          </label>
          <label>
            <span className="label">Instrument</span>
            <input
              className="field"
              value={instrument}
              onChange={(event) => setInstrument(event.target.value)}
              placeholder="For calibration traceability"
            />
          </label>
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={!performed}
            onChange={(event) => setPerformed(!event.target.checked)}
          />
          <span>
            <span className="font-medium">This monitoring was not performed</span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              A skipped round is still a record. Without it, a month with no readings cannot be told
              apart from a month where nothing was scheduled.
            </span>
          </span>
        </label>

        {!performed ? (
          <label>
            <span className="label">Why it was not performed</span>
            <input
              className="field"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
            />
          </label>
        ) : null}

        <label>
          <span className="label">Notes</span>
          <textarea
            className="field min-h-[70px]"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

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
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" className="button-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function NewReadingForm({
  eventId,
  limits,
  onCancel,
  onSaved,
}: {
  eventId: string;
  limits: HygieneLimit[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState(limits[0]?.id ?? "");
  const [value, setValue] = useState("");
  const [eligible, setEligible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limit = limits.find((item) => item.id === selected);
  const numeric = Number(value);
  // Shown before the reading is saved, so the officer sees the evaluation the
  // system is about to freeze rather than discovering it afterwards.
  const willBe =
    limit && value.trim() !== "" && Number.isFinite(numeric)
      ? numeric <= limit.limit
        ? "within"
        : "outside"
      : null;

  if (limits.length === 0) {
    return (
      <div
        className="flex items-start gap-3 rounded border px-4 py-3 text-sm"
        style={{ borderColor: "var(--caution)", background: "var(--caution-wash)", color: "var(--caution)" }}
      >
        <Icon name="info" size={18} className="mt-0.5 shrink-0" />
        <span>
          No exposure limits are in force, so no reading can be evaluated. Add them in reference
          data first. A reading with nothing to judge it against cannot be evaluated later without
          inventing history.
        </span>
      </div>
    );
  }

  return (
    <form
      className="space-y-4 rounded border p-4"
      style={{ borderColor: "var(--rule)", background: "var(--surface-sunken)" }}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!limit) return;
        setError(null);
        setSaving(true);
        try {
          await occupationalApi.createReading(eventId, {
            parameter: limit.parameter,
            value: numeric,
            context: limit.context,
            kpiEligible: eligible,
          });
          onSaved();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "The reading could not be saved.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid grid-cols-3 gap-4">
        <label className="col-span-2">
          <span className="label">Parameter and context</span>
          <select
            className="field"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {limits.map((item) => (
              <option key={item.id} value={item.id}>
                {item.parameter} · {contextLabels[item.context] ?? item.context} · limit {item.limit}{" "}
                {item.unit} over {item.averagingPeriod}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Value {limit ? `(${limit.unit})` : ""}</span>
          <input
            type="number"
            step="0.01"
            className="field data-value"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            required
          />
        </label>
      </div>

      {willBe ? (
        <div className="flex items-center gap-3 text-sm">
          <StatusIndicator
            status={willBe === "within" ? "within" : "breach"}
            label={willBe === "within" ? "Within limit" : "Over limit"}
          />
          <span className="text-xs text-ink-muted">
            Judged against {limit?.limit} {limit?.unit} over {limit?.averagingPeriod}, in force from{" "}
            <span className="data-value">{limit?.effectiveFrom}</span>. The saved evaluation uses the
            limit in force on the date of this monitoring, and is not recomputed if the limit is
            later revised.
          </span>
        </div>
      ) : null}

      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={!eligible}
          onChange={(event) => setEligible(!event.target.checked)}
        />
        <span>
          <span className="font-medium">Taken outside the monitoring plan</span>
          <span className="mt-0.5 block text-xs text-ink-muted">
            It stays in the register but does not count towards the compliance percentage. An ad-hoc
            reading is usually taken because somebody already suspects a problem.
          </span>
        </span>
      </label>

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
          {saving ? "Saving…" : "Save reading"}
        </button>
        <button type="button" className="button-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
