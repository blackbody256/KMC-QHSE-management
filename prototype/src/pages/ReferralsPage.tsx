import { Eye, FileHeart, LockKeyhole, Route } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { AppLink } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";
import type { ReferralStatus } from "../types";

const statusLabel: Record<ReferralStatus, string> = {
  drafted: "Drafted",
  authorised: "Authorised",
  issued: "Issued",
  returned: "Returned",
  reviewed: "Reviewed",
};

export function ReferralsPage() {
  const { state } = useDemoStore();
  const referrals = [...state.referrals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <div>
      <PageHeader eyebrow="Occupational Health · restricted clinical workflow" title="Medical referrals" description="Referrals begin at a patient visit, preserve their lifecycle, and keep clinical detail outside management roles." />
      <section className="privacy-callout"><LockKeyhole size={20} aria-hidden="true" /><div><strong>Clinical access remains Health and Wellness Officer only</strong><span>Management authorisation is demonstrated through a separate minimum-disclosure summary; the unresolved policy conflict remains recorded for KMC and the data protection owner.</span></div></section>
      <section className="panel table-panel">
        <div className="panel-heading"><div><div className="eyebrow">Synthetic referral register</div><h2>Referral lifecycle</h2></div><span className="section-meta">Raise a referral from a visit</span></div>
        <div className="table-scroll"><table><thead><tr><th>Form</th><th>Patient</th><th>Destination</th><th>Referral date</th><th>Lifecycle</th><th>Sick leave</th><th aria-label="Actions" /></tr></thead><tbody>
          {referrals.map((referral) => (
            <tr key={referral.id}>
              <td><strong className="data-cell">{referral.formNumber}</strong></td>
              <td>{referral.patientSnapshot.name}<span className="table-secondary">Visit {referral.visitId}</span></td>
              <td>{referral.referredTo}</td>
              <td>{formatDate(referral.referralDate)}</td>
              <td><span className={`lifecycle-chip lifecycle-${referral.status}`}>{statusLabel[referral.status]}</span></td>
              <td className="data-cell">{referral.externalFeedback?.sickLeaveDays ? `${referral.externalFeedback.sickLeaveDays} days` : "No data"}</td>
              <td className="table-actions"><AppLink className="button button-secondary button-small" to={`/referrals/details?referral=${referral.id}`}><Eye size={15} aria-hidden="true" /> Open</AppLink></td>
            </tr>
          ))}
        </tbody></table></div>
        {referrals.length === 0 && <div className="empty-state"><FileHeart size={23} aria-hidden="true" /><strong>No referrals</strong><span>Open a visit and choose “Raise referral”.</span></div>}
      </section>
      <section className="form-defect-callout"><Route size={19} aria-hidden="true" /><div><strong>Printed-form issues are preserved and flagged</strong><span>The supplied form has two Section E labels and no Section D, and says “KMC infirmary officer”. The prototype does not silently correct either client-owned wording issue.</span></div></section>
    </div>
  );
}

const formatDate = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
