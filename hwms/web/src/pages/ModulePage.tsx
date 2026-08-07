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
  "/health-wellness/occupational-health": {
    phase: "the clinical phase",
    plannedRecords: [
      "Patient registry, with employee number optional so that nobody is turned away for want of an identifier",
      "Patient visits, section by section, following the order of the paper form",
      "Section state: not recorded, partial, complete, or not clinically indicated",
      "Draft and signed states, with correction by appended amendment only",
      "Medical surveillance planning and completed assessments",
      "Occupational disease cases, carrying department and exposure but no patient identity",
      "Fitness for work outcomes, carrying no diagnosis",
    ],
  },
  "/health-wellness/ergonomics": {
    phase: "the ergonomics phase",
    plannedRecords: [
      "Workstation register, with office and industrial types recorded separately",
      "Assessments with a compliant, partially compliant or non-compliant outcome",
      "Free-text findings against each assessment",
      "Corrective actions with owner, due date, evidence and approval",
      "Overdue flagging against the due date",
      "Planned against completed assessments, reported separately from outcomes",
    ],
  },
  "/health-wellness/industrial-hygiene": {
    phase: "the environment phase",
    plannedRecords: [
      "Monitoring plan by location, parameter and period",
      "Monitoring events, including events recorded as not performed with a reason",
      "Readings with monitoring context: occupational exposure or indoor workplace",
      "The standard family and version each reading was evaluated against",
      "Compliance state, written once and never rewritten by a later change to the limit",
      "Instrument identifier against every reading, for calibration traceability",
    ],
  },
  "/workplace-safety": {
    phase: "the safety phase",
    plannedRecords: [
      "Incident register with occurrence and report times, location, activity and description",
      "Event classification following the Occupational Safety and Health Act, 2006",
      "Severity, from fatality through first aid only to no injury",
      "Counts of people affected, kept distinct from the count of events",
      "Recordability as a determination by a named officer, with its basis — never computed from a rule KMC has not approved",
      "Whether an investigation is required, and why",
      "Investigations with method, root causes, and corrective actions",
      "Monthly attestation, so that a reported zero means nothing happened rather than nothing was entered",
    ],
  },
  "/environment": {
    phase: "a later release",
    awaitingConfirmationBy: "the environment function",
    plannedRecords: [
      "Ambient monitoring, sharing one register with industrial hygiene and separated by context",
      "Environmental permits and consents, with renewal tracking",
      "Waste streams, quantities, disposal route and licensed handler",
      "Effluent and water abstraction against consent limits",
      "Emissions to air, by point and by period",
      "Energy consumption and renewable share",
      "Greenhouse gas reporting, if it is an obligation rather than an intention",
      "Environmental incidents and spills, reusing the incident register",
    ],
  },
  "/quality": {
    phase: "a later release",
    awaitingConfirmationBy: "the quality function",
    plannedRecords: [
      "Incoming inspection against supplier and part",
      "In-process inspection at control-plan points",
      "Final inspection and pre-delivery checks",
      "Test requests and results",
      "Non-conformances with disposition: rework, repair, scrap or concession",
      "Corrective and preventive action, reusing the shared action model",
      "Measurement equipment and calibration due dates",
      "Supplier quality, audits and scorecards",
    ],
  },
  "/monthly-returns": {
    phase: "the metrics phase",
    plannedRecords: [
      "Health-related lost days and month-end headcount, from the Human Resource portal",
      "Employees scheduled for surveillance and employees assessed",
      "Hours worked, optional and clearly labelled, pending confirmation that HR can supply it",
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
