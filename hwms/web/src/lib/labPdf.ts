import { jsPDF } from "jspdf";
import type { LabCatalogue, LabRequisition } from "./api";
import { drawDocumentFooter, drawLetterhead } from "./pdfChrome";

/**
 * Reproduces KMC.DQHSE.05/26-FM008 closely enough that somebody who uses the
 * paper form recognises it: the same heading block, the same four groups in
 * order, Requested Investigations beside Results, and the laboratory block at
 * the foot.
 *
 * Investigations that were not requested are printed with an empty tick box
 * rather than omitted. The printed form lists everything the clinic offers,
 * and a sheet showing only the ticked lines would not be the same document.
 */
export async function downloadLabRequisitionPdf(
  requisition: LabRequisition,
  catalogue: LabCatalogue,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 13;
  const contentWidth = pageWidth - margin * 2;
  const resultsX = margin + contentWidth * 0.58;
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

  const breakIfNeeded = (height: number) => {
    if (y + height <= pageHeight - 20) return;
    doc.addPage();
    y = 16;
  };

  const sectionTitle = (title: string) => {
    breakIfNeeded(12);
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

  y = await drawLetterhead(doc, {
    subtitle: "Occupational Health & Wellness Clinic – Laboratory Requisition Form",
    formNumber: requisition.formNumber,
    margin,
  });

  sectionTitle("Patient Information");
  const rows: [string, string][] = [
    ["Full Name:", requisition.patientSnapshot.fullName],
    ["Staff/ID Number:", requisition.patientSnapshot.staffIdNumber || " "],
    ["Department:", requisition.patientSnapshot.department || " "],
    ["Date:", requisition.requestDate],
    ["Gender:", requisition.patientSnapshot.gender],
    ["Age/DOB:", requisition.patientSnapshot.ageOrDob || " "],
  ];
  rows.forEach(([label, value], index) => {
    const column = index % 2;
    const x = margin + column * (contentWidth / 2);
    if (column === 0 && index > 0) y += 6;
    doc.setFont("helvetica", "bold");
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, x + 30, y);
  });
  y += 10;

  sectionTitle("Requested Investigations");
  doc.setFont("helvetica", "bold");
  doc.text("Investigation", margin, y);
  doc.text("Results", resultsX, y);
  y += 1.5;
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;
  doc.setFont("helvetica", "normal");

  catalogue.groups.forEach((group, groupIndex) => {
    breakIfNeeded(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(`${groupIndex + 1}. ${group}`, margin, y);
    doc.setFont("helvetica", "normal");
    y += 5.5;

    catalogue.tests
      .filter((test) => test.group === group)
      .forEach((test) => {
        const requested = requisition.tests.find((item) => item.code === test.code);
        const lines = doc.splitTextToSize(
          requested?.result || " ",
          contentWidth - (resultsX - margin) - 2,
        ) as string[];
        const rowHeight = Math.max(6, lines.length * 4 + 2);

        breakIfNeeded(rowHeight + 4);
        tick(Boolean(requested), margin + 2, y);
        doc.setFontSize(8);
        doc.text(`${test.shortName} (${test.fullName})`, margin + 7, y);
        if (test.preparationNote) {
          doc.setFontSize(7);
          doc.text(`Note: ${test.preparationNote}`, margin + 7, y + 3.4);
          doc.setFontSize(8);
        }
        doc.text(lines, resultsX, y);
        y += rowHeight + (test.preparationNote ? 2.5 : 0);
        doc.setDrawColor(210, 214, 220);
        doc.line(margin, y - 2.5, margin + contentWidth, y - 2.5);
        doc.setDrawColor(45, 55, 72);
      });
    y += 2;
  });

  y += 2;
  sectionTitle("Clinical Summary / Notes");
  const summary = doc.splitTextToSize(requisition.clinicalSummary || " ", contentWidth) as string[];
  breakIfNeeded(summary.length * 4 + 6);
  doc.text(summary, margin, y);
  y += summary.length * 4 + 8;

  breakIfNeeded(12);
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

  sectionTitle("For Laboratory Use Only");
  doc.setFont("helvetica", "bold");
  doc.text("Specimen Collected:", margin, y);
  doc.setFont("helvetica", "normal");
  let x = margin + 36;
  catalogue.specimenTypes.forEach((option) => {
    tick(requisition.specimenCollected.includes(option), x, y);
    doc.text(option, x + 5, y);
    x += 5 + doc.getTextWidth(option) + 8;
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

  drawDocumentFooter(
    doc,
    margin,
    "CONFIDENTIAL: This clinical document is restricted to the Health and Wellness Officer and the laboratory.",
  );

  // No patient name in the filename: it travels through mail clients and file
  // listings without the confidentiality declaration printed inside.
  doc.save(`lab-requisition-${requisition.formNumber}-${requisition.requestDate}.pdf`);
}
