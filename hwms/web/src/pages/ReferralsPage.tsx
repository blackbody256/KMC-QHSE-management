import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { StatusIndicator } from "../components/StatusIndicator";
import { ApiError, referralApi, type Referral, type ReferralForm } from "../lib/api";
import { referralStatusPresentation } from "../lib/referralStatus";

/**
 * The referral register.
 *
 * Ordered by date rather than grouped by state, because the question an officer
 * arrives with is "what did we send and has it come back", which is a question
 * about time. The state is shown on every row instead.
 */
export function ReferralsPage() {
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [form, setForm] = useState<ReferralForm | null>(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [list, formBody] = await Promise.all([
          referralApi.list(filter ? { status: filter } : {}),
          referralApi.form(),
        ]);
        if (cancelled) return;
        setReferrals(list.referrals);
        setForm(formBody);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Referrals could not be read. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  // Counted from what has come back, not from a stored flag. A referral is
  // outstanding because nobody has reviewed it, and that is the only place
  // that fact lives.
  const outstanding = referrals.filter((referral) => referral.status !== "reviewed").length;

  return (
    <>
      <PageHeader
        title="Referrals"
        description={`Referrals on ${form?.formNumber ?? "KMC.DQHSE.02/26-FM004"}, from drafted through to reviewed. A referral is raised from a patient visit, so identity and vital signs are never typed twice.`}
        actions={
          <Link to="/patient-visits" className="button-secondary">
            <Icon name="assignment" size={18} />
            Raise from a visit
          </Link>
        }
      />

      <section className="panel">
        <div className="panel-head">
          <div className="flex items-center gap-3">
            <h2 className="text-lg">Register</h2>
            {!loading && referrals.length > 0 ? (
              <span className="text-xs text-ink-muted">
                <span className="data-value">{outstanding}</span> of{" "}
                <span className="data-value">{referrals.length}</span> not yet reviewed
              </span>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Stage
            <select
              className="field w-auto py-1.5 text-sm"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="">All stages</option>
              {(form?.statuses ?? []).map((status) => (
                <option key={status} value={status}>
                  {referralStatusPresentation[status].label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="panel-body text-sm text-ink-muted">Reading referrals…</div>
        ) : error ? (
          <div className="panel-body">
            <div
              className="flex items-start gap-3 rounded border px-4 py-3 text-sm"
              style={{ borderColor: "var(--breach)", background: "var(--breach-wash)", color: "var(--breach)" }}
              role="alert"
            >
              <Icon name="error" size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        ) : referrals.length === 0 ? (
          <div className="panel-body text-sm text-ink-muted">
            {filter
              ? `No referral is at the ${referralStatusPresentation[filter as Referral["status"]].label.toLowerCase()} stage.`
              : "No referrals yet. Open a patient visit and raise the first one. Patient details and the vital signs recorded at that visit come across with it."}
          </div>
        ) : (
          <div className="panel-body pt-0">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Referred to</th>
                  <th>Reason</th>
                  <th>Stage</th>
                  <th>Sick leave</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((referral) => {
                  const state = referralStatusPresentation[referral.status];
                  const leave = referral.externalFeedback?.sickLeaveDays;
                  return (
                    <tr key={referral.id}>
                      <td>
                        <span className="data-value">{referral.referralDate}</span>
                      </td>
                      <td>
                        <div className="font-medium">{referral.patientSnapshot.name}</div>
                        <div className="text-xs text-ink-muted">
                          {referral.patientSnapshot.department || "—"}
                        </div>
                      </td>
                      <td>{referral.referredTo}</td>
                      <td className="max-w-[220px] text-xs text-ink-muted">
                        {[...referral.referralReasons, referral.referralReasonOther]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                      <td>
                        <StatusIndicator status={state.status} label={state.label} />
                      </td>
                      <td>
                        {/* Absent and zero are different statements. A facility
                            that recommended no leave has said something; one
                            that has not reported yet has not. */}
                        {leave === undefined ? (
                          <span className="text-ink-faint">—</span>
                        ) : (
                          <span className="data-value">
                            {leave} {leave === 1 ? "day" : "days"}
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() =>
                            navigate(`/referrals/details?id=${encodeURIComponent(referral.id)}`)
                          }
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
