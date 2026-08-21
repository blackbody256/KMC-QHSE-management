import { jsPDF } from "jspdf";
import type { Referral, ReferralForm } from "./api";
import { drawDocumentFooter, drawLetterhead } from "./pdfChrome";

/**
 * Reproduces KMC.DQHSE.02/26-FM004 closely enough that somebody who uses the
 * paper form recognises it, per FR-REF-08.
 *
 * Two things this deliberately does not do.
 *
 * It does not renumber the sections. The client's form labels two of them
 * "Section E" and has no Section D. A clinician holding the paper beside this
 * printout must find the same sections in the same places; renumbering here
 * would make the two documents disagree, and the correction is Document
 * Control's to authorise at DEC-025.
 *
 * It does not omit an empty section. A referral that has not come back from the
 * facility still prints its feedback block, blank, because that is what the
 * paper does and because a returning facility writes into it by hand.
 */
export async function downloadReferralPdf(referral: Referral, form: ReferralForm) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 13;
  const contentWidth = pageWidth - margin * 2;
  let y = 12;

  const text = (value?: string | number | null) =>
    value === undefined || value === null || value === "" ? " " : String(value);

  // Spelled out rather than shown as a tick. This sheet is read by someone
  // outside KMC who has no reason to know what an empty box means here.
  const yesNo = (value?: boolean) => (value === undefined ? " " : value ? "Yes" : "No");

  const startPage = async () => {
    y = await drawLetterhead(doc, {
      subtitle: "Occupational Health & Wellness Clinic – Referral Medical Form",
      formNumber: referral.formNumber,
      margin,
    });
  };

  const footer = () =>
    drawDocumentFooter(
      doc,
      margin,
      "CONFIDENTIAL: This clinical document is restricted to the Health and Wellness Officer and the receiving medical facility.",
    );

  // Assigned below, once the referral's state is known. breakIfNeeded is
  // defined before that point and calls it on every page turn.
  let watermark: () => void = () => {};

  const breakIfNeeded = async (height: number) => {
    if (y + height <= pageHeight - 18) return;
    watermark();
    footer();
    doc.addPage();
    await startPage();
  };

  const section = async (label: string, title: string) => {
    await breakIfNeeded(12);
    doc.setFillColor(239, 242, 246);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${label} · ${title.toUpperCase()}`, margin + 2, y + 5.3);
    y += 10;
  };

  const row = async (label: string, value?: string | number | null) => {
    const labelLines = doc.splitTextToSize(label, 44) as string[];
    const lines = doc.splitTextToSize(text(value), contentWidth - 55) as string[];
    const height = Math.max(8, Math.max(lines.length, labelLines.length) * 4 + 3);
    await breakIfNeeded(height);
    doc.setDrawColor(170, 177, 188);
    doc.rect(margin, y, contentWidth, height);
    doc.line(margin + 48, y, margin + 48, y + height);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(labelLines, margin + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(lines, margin + 50, y + 5);
    y += height;
  };

  const pair = async (
    leftLabel: string,
    leftValue: string | number | undefined | null,
    rightLabel: string,
    rightValue: string | number | undefined | null,
  ) => {
    const half = contentWidth / 2;
    await breakIfNeeded(8);
    doc.setDrawColor(170, 177, 188);
    doc.rect(margin, y, contentWidth, 8);
    doc.line(margin + half, y, margin + half, y + 8);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(`${leftLabel}:`, margin + 2, y + 5);
    doc.text(`${rightLabel}:`, margin + half + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(text(leftValue), margin + 32, y + 5, { maxWidth: half - 34 });
    doc.text(text(rightValue), margin + half + 32, y + 5, { maxWidth: half - 34 });
    y += 8;
  };

  const joined = (values: string[], other?: string) =>
    [...values, other].filter(Boolean).join(", ");

  // A referral that has not left the clinic is not the document.
  //
  // Watermarking it is not decoration: once printed, an unissued sheet is
  // indistinguishable from an issued one on a desk, and this one may have no
  // authorisation and no clearance behind it.
  const isDraft = referral.status === "drafted" || referral.status === "authorised";

  watermark = () => {
    if (!isDraft) return;
    doc.saveGraphicsState();
    // GState exists at runtime; jsPDF's published types omit it.
    const withGState = doc as unknown as {
      GState: new (options: { opacity: number }) => unknown;
      setGState: (state: unknown) => void;
    };
    withGState.setGState(new withGState.GState({ opacity: 0.12 }));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(72);
    doc.setTextColor(180, 35, 24);
    doc.text("DRAFT", pageWidth / 2, pageHeight / 2, { align: "center", angle: 32 });
    doc.restoreGraphicsState();
    doc.setTextColor(0, 0, 0);
  };

  await startPage();

  // The section labels come from the service, so the printed defect is stated
  // in one place rather than reproduced independently here.
  const labelFor = (index: number) => form.sections[index]?.label ?? "Section";
  const titleFor = (index: number) => form.sections[index]?.title ?? "";

  // --- Section A -----------------------------------------------------------
  await section(labelFor(0), titleFor(0));
  await pair("Referred to", referral.referredTo, "Name", referral.patientSnapshot.name);
  await pair(
    "Position",
    referral.patientSnapshot.position,
    "Age / sex",
    `${referral.patientSnapshot.age} / ${referral.patientSnapshot.sex}`,
  );
  await pair("Department", referral.patientSnapshot.department, "Division", referral.patientSnapshot.division);
  await pair("Unit", referral.patientSnapshot.unit, "Contact", referral.patientSnapshot.contactNumber);
  await pair(
    "Supervisor",
    referral.patientSnapshot.supervisorName,
    "Date / time",
    `${referral.referralDate} ${referral.referralTime ?? ""}`.trim(),
  );
  await row("Clinical features", referral.clinicalFeatures);

  // Vital signs read as one line, in the order the form prints them, so they
  // can be compared against the clinic's own record at a glance.
  await row(
    "Clinical findings",
    [
      `BP ${text(referral.vitals.bloodPressure)} mmHg`,
      `Pulse ${text(referral.vitals.pulse)} bpm`,
      `RR ${text(referral.vitals.respiratoryRate)} /min`,
      `Temp ${text(referral.vitals.temperature)} °C`,
      `SpO₂ ${text(referral.vitals.spo2)} %`,
      `Pain ${text(referral.vitals.painScore)} /10`,
      `Weight ${text(referral.vitals.weightKg)} kg`,
      `Height ${text(referral.vitals.heightCm)} cm`,
      `BMI ${text(referral.bodyMassIndex)}`,
    ].join("  ·  "),
  );
  await row(
    "General examination",
    joined(referral.generalExamination, referral.generalExaminationOther),
  );
  await row(
    "Past medical history",
    joined(referral.pastMedicalHistory, referral.pastMedicalHistoryOther),
  );
  await pair("Work-related", referral.workRelated, "Suspected exposure", referral.suspectedExposure);
  await row("Investigations done at the infirmary", referral.investigationsDone);
  await row("Provisional diagnosis", referral.provisionalDiagnosis);
  await row("Treatment given", referral.treatmentGiven);
  await row("Reason for referral", joined(referral.referralReasons, referral.referralReasonOther));

  // --- Section B -----------------------------------------------------------
  await section(labelFor(1), titleFor(1));
  await pair("Officer", referral.clearance.officer, "Position", referral.clearance.printedPosition);
  await pair(
    "Contact",
    referral.clearance.contact,
    "Date / time",
    `${referral.clearance.date ?? ""} ${referral.clearance.time ?? ""}`.trim(),
  );
  await row("Signature confirmed", yesNo(referral.clearance.signatureConfirmed));

  // --- Section C -----------------------------------------------------------
  await section(labelFor(2), titleFor(2));
  // Printed on the document itself, not only shown on screen. This sheet may
  // be filed, and the note explains why the signatures below sit on a form the
  // signatories were never shown.
  // The privacy note describes something that happened. It is printed only
  // when it did.
  //
  // Printing it unconditionally put a statement on every sheet that an
  // authorisation had been obtained from a minimum-disclosure summary -
  // including sheets where Section C was still empty. This document leaves the
  // building, and a false assertion about who authorised what is the worst
  // thing it could carry, in the system's own voice.
  if (referral.authorisation) {
    await row(
      "Privacy handling",
      "Authorisation was obtained from a separate summary containing the patient, destination, " +
        "reason and cost implication only. The clinical content of this referral was not disclosed " +
        "to the authorisers. Management access to clinical records remains unresolved (DEC-024).",
    );
  } else {
    await row(
      "Privacy handling",
      "No authorisation has been recorded against this referral. Section C is unsigned.",
    );
  }
  await pair(
    "Head of Division",
    referral.authorisation?.headOfDivision.name,
    "Signature confirmed",
    yesNo(referral.authorisation?.headOfDivision.signatureConfirmed),
  );
  await pair(
    "Date",
    referral.authorisation?.headOfDivision.date,
    "Remarks",
    referral.authorisation?.headOfDivision.remarks,
  );
  await pair(
    "Chief of Staff",
    referral.authorisation?.chiefOfStaff.name,
    "Signature confirmed",
    yesNo(referral.authorisation?.chiefOfStaff.signatureConfirmed),
  );
  await pair(
    "Date",
    referral.authorisation?.chiefOfStaff.date,
    "Remarks",
    referral.authorisation?.chiefOfStaff.remarks,
  );
  await row("Cost implication", referral.authorisation?.costImplication);

  // --- Section E, the first of two -----------------------------------------
  await section(labelFor(3), titleFor(3));
  await pair(
    "Facility",
    referral.externalFeedback?.facility,
    "Practitioner",
    referral.externalFeedback?.practitioner,
  );
  await row("Diagnosis", referral.externalFeedback?.diagnosis);
  await row("Treatment provided", referral.externalFeedback?.treatmentProvided);
  await row("Recommended follow-up", referral.externalFeedback?.recommendedFollowUp);
  await pair(
    "Sick leave days",
    referral.externalFeedback?.sickLeaveDays,
    "Date range",
    referral.externalFeedback?.sickLeaveFrom
      ? `${referral.externalFeedback.sickLeaveFrom} to ${referral.externalFeedback.sickLeaveTo ?? ""}`.trim()
      : "",
  );
  await pair(
    "Signature and stamp confirmed",
    yesNo(referral.externalFeedback?.signatureAndStampConfirmed),
    "Date",
    referral.externalFeedback?.date,
  );

  // --- Section E, the second of two ----------------------------------------
  await section(labelFor(4), titleFor(4));
  await row("Review comments", referral.followUpReview?.comments);
  await pair(
    "Reviewed by",
    referral.followUpReview?.reviewedBy,
    "Position",
    referral.followUpReview?.position,
  );
  await pair(
    "Signature confirmed",
    yesNo(referral.followUpReview?.signatureConfirmed),
    "Date",
    referral.followUpReview?.date,
  );

  // The printed form's numbering defect, stated on the printout rather than
  // only on the screen. Whoever files this should know the duplicate label is
  // the form's and not a printing error.
  const duplicated = form.sections.filter((entry) => entry.defect).length > 0;
  if (duplicated) {
    await breakIfNeeded(12);
    y += 2;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text(
      "Note: the controlled form labels two sections E and contains no Section D. " +
        "Reproduced as printed; a corrected version is with Document Control.",
      margin,
      y + 3,
      { maxWidth: contentWidth },
    );
  }

  if (isDraft) {
    await breakIfNeeded(10);
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(180, 35, 24);
    doc.text(
      "DRAFT. This referral has not been issued. It is not a valid referral document.",
      margin,
      y + 3,
      { maxWidth: contentWidth },
    );
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
  }

  watermark();
  footer();

  // The filename carries no patient name.
  //
  // A downloaded referral is emailed, copied to a shared drive and listed in a
  // file browser, and the filename travels through all of that without the
  // confidentiality declaration printed inside it. The form number and the date
  // identify the document; who it concerns is inside, where the restriction is.
  doc.save(`referral-${referral.formNumber}-${referral.referralDate}.pdf`);
}
