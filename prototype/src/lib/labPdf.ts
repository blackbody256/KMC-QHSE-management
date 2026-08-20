import { jsPDF } from "jspdf";
import { labTestByCode, labTestGroups, labTestsInGroup } from "../data/labCatalogue";
import { labSpecimenTypes } from "../data/labCatalogue";
import type { LabRequisition } from "../types";

/**
 * Reproduces KMC.DQHSE.05/26-FM008 closely enough that somebody who uses the
 * paper form recognises it: the same heading block, the same four groups in
 * the same order, the Requested Investigations and Results columns side by
 * side, and the laboratory block at the foot.
 *
 * Unrequested investigations are printed with an empty tick box rather than
 * omitted. The printed form lists every investigation the clinic offers, and a
 * form that showed only what was ticked would not be the same document.
 */
export const downloadLabRequisitionPdf = (requisition: LabRequisition) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 13;
  const contentWidth = pageWidth - margin * 2;
  const resultsColumnX = margin + contentWidth * 0.58;
  let y = 12;

  const tick = (checked: boolean, x: number, atY: number) => {
    doc.setLineWidth(0.25);
    doc.rect(x, atY - 3, 3.2, 3.2);
    if (checked) {
      doc.setLineWidth(0.5);
      doc.line(x + 0.6, atY - 1.4, x + 1.3, atY - 0.3);
      doc.line(x + 1.3, atY - 0.3, x + 2.7, atY - 2.6);
      doc.setLineWidth(0.25);
    }
  };

  const nextPageIfNeeded = (height: number) => {
    if (y + height <= pageHeight - 20) return;
    doc.addPage();
    y = 16;
  };

  // --- heading -------------------------------------------------------------
  doc.setDrawColor(45, 55, 72);
  doc.setLineWidth(0.35);
  doc.rect(margin, 8, contentWidth, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("DEPARTMENT OF QUALITY HEALTH SAFETY AND ENVIRONMENT MANAGEMENT", pageWidth / 2, 14, {
    align: "center",
  });
  doc.setFontSize(9);
  doc.text("HEALTH AND WELLNESS DIVISION", pageWidth / 2, 19.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Occupational Health & Wellness Clinic – Laboratory Requisition Form", pageWidth / 2, 25, {
    align: "center",
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(requisition.formNumber, pageWidth / 2, 30.5, { align: "center" });
  y = 41;

  const sectionTitle = (title: string) => {
    nextPageIfNeeded(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title, margin, y);
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
  };

  // --- patient information -------------------------------------------------
  sectionTitle("Patient Information");
  const patientRows: [string, string][] = [
    ["Full Name:", requisition.patientSnapshot.fullName],
    ["Staff/ID Number:", requisition.patientSnapshot.staffIdNumber || " "],
    ["Department:", requisition.patientSnapshot.department || " "],
    ["Date:", requisition.requestDate],
    ["Gender:", requisition.patientSnapshot.gender],
    ["Age/DOB:", requisition.patientSnapshot.ageOrDob || " "],
  ];
  patientRows.forEach(([label, value], index) => {
    const column = index % 2;
    const x = margin + column * (contentWidth / 2);
    if (column === 0 && index > 0) y += 6;
    doc.setFont("helvetica", "bold");
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, x + 30, y);
  });
  y += 10;

  // --- investigations and results -----------------------------------------
  sectionTitle("Requested Investigations");
  doc.setFont("helvetica", "bold");
  doc.text("Investigation", margin, y);
  doc.text("Results", resultsColumnX, y);
  y += 1.5;
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;
  doc.setFont("helvetica", "normal");

  labTestGroups.forEach((group, groupIndex) => {
    nextPageIfNeeded(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(`${groupIndex + 1}. ${group}`, margin, y);
    doc.setFont("helvetica", "normal");
    y += 5.5;

    labTestsInGroup(group).forEach((test) => {
      const requested = requisition.tests.find((item) => item.code === test.code);
      const resultText = requested?.result ?? "";
      const resultLines = doc.splitTextToSize(
        resultText || " ",
        contentWidth - (resultsColumnX - margin) - 2,
      ) as string[];
      const rowHeight = Math.max(6, resultLines.length * 4 + 2);

      nextPageIfNeeded(rowHeight + 2);
      tick(Boolean(requested), margin + 2, y);
      doc.setFontSize(8);
      doc.text(`${test.shortName} (${test.fullName})`, margin + 7, y);
      if (test.preparationNote) {
        doc.setFontSize(7);
        doc.text(`Note: ${test.preparationNote}`, margin + 7, y + 3.4);
        doc.setFontSize(8);
      }
      doc.text(resultLines, resultsColumnX, y);
      y += rowHeight + (test.preparationNote ? 2.5 : 0);
      doc.setDrawColor(210, 214, 220);
      doc.line(margin, y - 2.5, margin + contentWidth, y - 2.5);
      doc.setDrawColor(45, 55, 72);
    });
    y += 2;
  });

  // --- clinical summary ----------------------------------------------------
  y += 2;
  sectionTitle("Clinical Summary / Notes");
  const summary = doc.splitTextToSize(requisition.clinicalSummary || " ", contentWidth) as string[];
  nextPageIfNeeded(summary.length * 4 + 6);
  doc.text(summary, margin, y);
  y += summary.length * 4 + 6;

  nextPageIfNeeded(12);
  doc.setFont("helvetica", "bold");
  doc.text("Authorized Health Officer:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(requisition.authorisedBy, margin + 45, y);
  doc.setFont("helvetica", "bold");
  doc.text("Signature:", margin + contentWidth - 45, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    requisition.authorisedSignatureConfirmed ? "Confirmed in system" : " ",
    margin + contentWidth - 28,
    y,
  );
  y += 10;

  // --- laboratory block ----------------------------------------------------
  sectionTitle("For Laboratory Use Only");
  doc.setFont("helvetica", "bold");
  doc.text("Specimen Collected:", margin, y);
  doc.setFont("helvetica", "normal");
  let specimenX = margin + 36;
  labSpecimenTypes.forEach((option) => {
    tick((requisition.specimenCollected ?? []).includes(option), specimenX, y);
    doc.text(option, specimenX + 5, y);
    specimenX += 5 + doc.getTextWidth(option) + 8;
  });
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Collected By:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(requisition.collectedBy || " ", margin + 24, y);
  doc.setFont("helvetica", "bold");
  doc.text("Time of Collection:", margin + contentWidth - 60, y);
  doc.setFont("helvetica", "normal");
  doc.text(requisition.timeOfCollection || " ", margin + contentWidth - 20, y);

  // --- footer --------------------------------------------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(
    "CONFIDENTIAL: This clinical document is restricted to the Health and Wellness Officer and the laboratory.",
    margin,
    pageHeight - 9,
    { maxWidth: contentWidth - 20 },
  );
  doc.setFont("helvetica", "normal");
  doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 9, { align: "right" });

  const safeName = requisition.patientSnapshot.fullName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`lab-requisition-${safeName}-${requisition.requestDate}.pdf`);
};

/** Re-exported so callers do not need two imports to render a requisition. */
export { labTestByCode };
