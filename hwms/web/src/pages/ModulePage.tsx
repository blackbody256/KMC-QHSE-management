import { useLocation } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { ModuleScaffold } from "../components/ModuleScaffold";
import { routeFor } from "../lib/navigation";

interface ModuleContent {
  plannedRecords: string[];
  phase: string;
  awaitingConfirmationBy?: string;
}

/**
 * What each routed module will hold.
 *
 * These lists are records, never figures. Where a module's scope has not been
 * confirmed by its unit owner, that is stated on the page rather than left for
 * a stakeholder to assume.
 */
const content: Record<string, ModuleContent> = {
  "/laboratory": {
    phase: "the next clinical increment",
    awaitingConfirmationBy: "the laboratory staff, who are supplying the actual forms",
    plannedRecords: [
      "Test requests raised from a visit, with specimen type, tests requested and clinical indication",
      "Whether the request is routine or urgent",
      "Surveillance context: pre-employment, periodic, exit, or incident. Linking a test to the surveillance programme",
      "Results, one row per analyte, with value, unit and verifying practitioner",
      "The reference range applied, held as effective-dated reference data and stored against the result",
      "Abnormality flagged against that range, written once and never recomputed when a range is later revised",
    ],
  },
  "/referrals": {
    phase: "the next clinical increment",
    plannedRecords: [
      "Referral on form KMC.DQHSE.02/26-FM004, pre-filled from the visit rather than re-keyed",
      "Clinical features, findings, general examination and past medical history as the form sets them out",
      "Occupational consideration and the reason for referral",
      "Infirmary clearance, then authorisation, then issue",
      "External facility feedback: diagnosis, treatment, follow-up and recommended sick leave",
      "Infirmary follow-up review closing the loop",
      "Download as a PDF reproducing the printed form",
      "Recommended sick leave feeding health-related absenteeism, so the referral is part of the system rather than a document store",
    ],
  },
  "/industrial-hygiene": {
    phase: "the operations increment",
    plannedRecords: [
      "Monitoring plan by location, parameter and period",
      "Monitoring events, including events recorded as not performed with a reason",
      "Readings with monitoring context: occupational exposure or indoor workplace",
      "The standard family and version each reading was evaluated against",
      "Compliance state, written once and never rewritten by a later change to the limit",
      "Instrument identifier against every reading, for calibration traceability",
    ],
  },
  "/ergonomics-wellness": {
    phase: "the operations increment",
    plannedRecords: [
      "Workstation register, with office and industrial types recorded separately",
      "Assessments with a compliant, partially compliant or non-compliant outcome",
      "Free-text findings against each assessment",
      "Corrective actions with owner, due date, evidence and approval",
      "Overdue flagging against the due date",
      "Planned against completed assessments, reported separately from outcomes",
    ],
  },
  "/monthly-returns": {
    phase: "the metrics increment",
    plannedRecords: [
      "Health-related lost days and month-end headcount, from the Human Resource portal",
      "Employees scheduled for surveillance and employees assessed",
      "Fatalities, recordable incidents, recordable injuries and reportable near misses",
      "The stated source of each figure, the entering user and the entry date",
      "The computed rate shown live during entry, so an implausible figure is visible immediately",
      "Correction of a submitted return, preserving the prior value and the reason",
    ],
  },
};

export function ModulePage() {
  const location = useLocation();
  const route = routeFor(location.pathname);
  const module = content[location.pathname];

  return (
    <>
      <PageHeader title={route?.label ?? "Module"} />
      <ModuleScaffold
        summary={route?.summary}
        plannedRecords={module?.plannedRecords ?? []}
        phase={module?.phase ?? "a later phase"}
        awaitingConfirmationBy={module?.awaitingConfirmationBy}
      />
    </>
  );
}
