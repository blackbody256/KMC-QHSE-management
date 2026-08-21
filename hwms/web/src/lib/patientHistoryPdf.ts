import { jsPDF } from "jspdf";
import type { LabCatalogue, PatientRecord, Referral, LabRequisition } from "./api";
import { drawDocumentFooter, drawLetterhead } from "./pdfChrome";
import { today } from "./dates";

/**
 * The whole of one patient's history, as a document.
 *
 * This is not a form. Unlike the requisition and the referral there is no
 * printed original to reproduce, so it is laid out for the job it is actually
 * for: a clinician who needs the record away from a screen, on a ward round,
 * at a handover, in a meeting with an external physician, or during the power
 * cut that the availability requirement in the SRS exists for.
 *
 * It is ordered newest first, the same order as the screen, and says so on the
 * page. Somebody reading a printed history is almost always asking "what has
 * been happening lately", and leaving the order to be inferred invites the
 * reader to assume the opposite and misread the whole document.
 *
 * It is a summary and is titled as one. The consolidated record API loads three
 * of the twelve visit sections, so this carries the complaint, the impression
 * and the treatment but not the medication, surgical or occupational histories.
 * Calling it a full record would overstate what a receiving physician is
 * holding.
 *
 * Unsigned visits are left out. The interface says a draft is not part of the
 * record until it is signed, and a document that leaves the building must not
 * contradict that. The count of what was withheld is printed, so the omission
 * is visible rather than silent.
 *
 * Everything that leaves this system carries the confidentiality declaration,
 * and the filename carries neither a name nor a patient identifier. A
 * downloaded file travels through mail clients and shared drives where only
 * the filename is visible, and a patient UUID in it is still a reference to
 * that patient.
 */
export async function downloadPatientHistoryPdf(record: PatientRecord, catalogue?: LabCatalogue) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 13;
  const contentWidth = pageWidth - margin * 2;
  let y = 12;

  const { patient, summary, timeline, unlinked, unlinkedReferrals } = record;

  const text = (value?: string | number | null) =>
    value === undefined || value === null || value === "" ? "—" : String(value);

  const startPage = async () => {
    y = await drawLetterhead(doc, {
      subtitle: "Occupational Health & Wellness Clinic – Patient History Summary",
      formNumber: `Summary extract · ${today()} · newest first`,
      margin,
    });
  };

  const footer = () =>
    drawDocumentFooter(
      doc,
      margin,
      "CONFIDENTIAL: This is an individual clinical record. It is restricted to the Health and Wellness Officer and any clinician to whom it is expressly released.",
    );

  const breakIfNeeded = async (height: number) => {
    if (y + height <= pageHeight - 18) return;
    footer();
    doc.addPage();
    await startPage();
  };

  const heading = async (title: string) => {
    await breakIfNeeded(13);
    doc.setFillColor(239, 242, 246);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title.toUpperCase(), margin + 2, y + 5.3);
    y += 11;
  };

  const field = async (label: string, value?: string | number | null, indent = 0) => {
    const lines = doc.splitTextToSize(text(value), contentWidth - 48 - indent) as string[];
    const height = Math.max(5, lines.length * 4);
    await breakIfNeeded(height + 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label, margin + indent, y);
    doc.setFont("helvetica", "normal");
    doc.text(lines, margin + indent + 44, y);
    y += height + 1.5;
  };

  const rule = () => {
    doc.setDrawColor(220, 224, 230);
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + contentWidth, y);
    y += 3;
  };

  await startPage();

  // --- who this is ---------------------------------------------------------
  await heading("Patient");
  await field("Name", patient.fullName);
  await field("Age and sex", `${patient.age} · ${patient.sex}`);
  await field("Category", patient.category + (patient.categoryDetail ? ` (${patient.categoryDetail})` : ""));
  await field("Employee number", patient.employeeNumber);
  await field("Job title", patient.jobTitle);
  await field("Department", patient.department);
  await field("Division", patient.division);
  await field("Unit", patient.unit);
  y += 3;

  // --- the shape of the history -------------------------------------------
  await heading("Summary");
  await field("Visits recorded", summary.visitCount);
  await field("First seen", summary.firstVisit);
  await field("Last seen", summary.lastVisit);
  await field("Recorded work related", summary.workRelatedCount);
  await field("Visits still in draft", summary.draftVisits);
  await field("Requisitions without results", summary.awaitingResults);
  await field("Referrals not yet reviewed", summary.openReferrals);
  y += 3;

  // --- the history itself, newest first ------------------------------------
  await heading("History");

  if (timeline.length === 0) {
    await field("", "No visits have been recorded for this patient.");
  }

  const signed = timeline.filter((entry) => entry.visit.state === "signed");
  const withheld = timeline.length - signed.length;

  if (withheld > 0) {
    await field(
      "Withheld",
      `${withheld} unsigned visit${withheld === 1 ? "" : "s"} ${withheld === 1 ? "is" : "are"} not included. A visit is not part of the record until it is signed.`,
    );
    y += 2;
  }

  for (const entry of signed) {
    const { visit, summary: visitSummary, completeness, requisitions, referrals } = entry;

    // A visit and its first few lines are kept together. A date heading
    // stranded at the foot of a page reads as though the visit had nothing
    // recorded against it.
    await breakIfNeeded(34);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(`${visit.visitDate}${visit.timeIn ? `  ${visit.timeIn}` : ""}`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      [
        visit.visitType,
        visit.signedBy ? `Signed by ${visit.signedBy}` : "Signed",
        visit.workRelated === "Yes" ? "Work related" : null,
        `${completeness.decided}/${completeness.total} sections decided`,
      ]
        .filter(Boolean)
        .join("  ·  "),
      margin + 42,
      y,
    );
    y += 5;
    rule();

    await field("Presenting complaint", visitSummary.presentingComplaint, 3);
    await field("Impression", visitSummary.impression, 3);
    await field("Treatment", visitSummary.treatment, 3);

    const vitals = [
      visit.vitals.bloodPressure ? `BP ${visit.vitals.bloodPressure} mmHg` : null,
      visit.vitals.pulse ? `Pulse ${visit.vitals.pulse}` : null,
      visit.vitals.respiratoryRate ? `RR ${visit.vitals.respiratoryRate}` : null,
      visit.vitals.temperature ? `Temp ${visit.vitals.temperature} °C` : null,
      visit.vitals.spo2 ? `SpO₂ ${visit.vitals.spo2}%` : null,
      visit.vitals.painScore != null ? `Pain ${visit.vitals.painScore}/10` : null,
      visit.vitals.weightKg ? `Weight ${visit.vitals.weightKg} kg` : null,
      visit.vitals.heightCm ? `Height ${visit.vitals.heightCm} cm` : null,
      visit.bodyMassIndex ? `BMI ${visit.bodyMassIndex}` : null,
    ].filter(Boolean);
    if (vitals.length > 0) {
      await field("Vital signs", vitals.join("  ·  "), 3);
    }

    for (const requisition of requisitions) {
      await writeRequisition(requisition);
    }
    for (const referral of referrals) {
      await writeReferral(referral);
    }

    y += 4;
  }

  // --- anything whose visit is outside the window --------------------------
  if (unlinked.length > 0 || unlinkedReferrals.length > 0) {
    await heading("Not attached to a visit listed above");
    // Printed rather than dropped, for the same reason the screen shows them:
    // a result nobody can find is worse than an untidy document.
    for (const requisition of unlinked) {
      await writeRequisition(requisition);
    }
    for (const referral of unlinkedReferrals) {
      await writeReferral(referral);
    }
  }

  footer();
  doc.save(`patient-history-summary-${today()}.pdf`);

  async function writeRequisition(requisition: LabRequisition) {
    const named = (code: string) =>
      catalogue?.tests.find((entry) => entry.code === code)?.shortName ?? code;

    await field("Laboratory", `${requisition.formNumber} · ${requisition.status}`, 3);
    for (const test of requisition.tests) {
      // Results are printed as the laboratory wrote them. The form defines no
      // reference ranges, so nothing here is marked abnormal.
      await field(
        `  ${named(test.code)}`,
        test.result
          ? test.result + (test.resultedAt ? `  (${test.resultedAt.slice(0, 10)})` : "")
          : "awaiting result",
        6,
      );
    }
    if (requisition.clinicalSummary) {
      await field("  Indication", requisition.clinicalSummary, 6);
    }
  }

  async function writeReferral(referral: Referral) {
    await field("Referral", `${referral.referredTo} · ${referral.status}`, 3);
    await field("  Reason", [...referral.referralReasons, referral.referralReasonOther].filter(Boolean).join(", "), 6);
    await field("  Provisional diagnosis", referral.provisionalDiagnosis, 6);
    if (referral.externalFeedback) {
      await field("  Facility diagnosis", referral.externalFeedback.diagnosis, 6);
      await field("  Treatment provided", referral.externalFeedback.treatmentProvided, 6);
      await field("  Recommended follow-up", referral.externalFeedback.recommendedFollowUp, 6);
      await field(
        "  Sick leave",
        referral.externalFeedback.sickLeaveDays > 0
          ? `${referral.externalFeedback.sickLeaveDays} day${referral.externalFeedback.sickLeaveDays === 1 ? "" : "s"}` +
              (referral.externalFeedback.sickLeaveFrom
                ? `, ${referral.externalFeedback.sickLeaveFrom} to ${referral.externalFeedback.sickLeaveTo ?? ""}`.trimEnd()
                : "")
          : "None recommended",
        6,
      );
    }
    if (referral.followUpReview) {
      await field("  Follow-up review", referral.followUpReview.comments, 6);
    }
  }
}
