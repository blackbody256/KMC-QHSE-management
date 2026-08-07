import { jsPDF } from "jspdf";
import type { MedicalReferral } from "../types";

const textOrBlank = (value?: string | number) => value === undefined || value === "" ? " " : String(value);
const yesNo = (value: boolean | undefined) => value === undefined ? " " : value ? "Yes" : "No";

export const downloadReferralPdf = (referral: MedicalReferral) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 13;
  const contentWidth = pageWidth - margin * 2;
  let y = 12;

  const header = () => {
    doc.setDrawColor(45, 55, 72);
    doc.setLineWidth(0.35);
    doc.rect(margin, 8, contentWidth, 25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("KIIRA MOTORS CORPORATION", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text("REFERRAL MEDICAL FORM", pageWidth / 2, 21, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(referral.formNumber, pageWidth / 2, 27, { align: "center" });
    y = 38;
  };

  const footer = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const declaration = "CONFIDENTIAL: This clinical document is restricted to the Health and Wellness Officer and the receiving medical facility.";
    doc.text(declaration, margin, pageHeight - 9, { maxWidth: contentWidth - 20 });
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 9, { align: "right" });
  };

  const nextPageIfNeeded = (height: number) => {
    if (y + height <= pageHeight - 18) return;
    footer();
    doc.addPage();
    header();
  };

  const section = (code: string, title: string) => {
    nextPageIfNeeded(11);
    doc.setFillColor(239, 242, 246);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${code} · ${title}`, margin + 2, y + 5.3);
    y += 10;
  };

  const row = (label: string, value?: string | number) => {
    const labelLines = doc.splitTextToSize(label, 44) as string[];
    const lines = doc.splitTextToSize(textOrBlank(value), contentWidth - 55) as string[];
    const height = Math.max(8, Math.max(lines.length, labelLines.length) * 4 + 3);
    nextPageIfNeeded(height);
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

  const pair = (leftLabel: string, leftValue: string | number | undefined, rightLabel: string, rightValue: string | number | undefined) => {
    const half = contentWidth / 2;
    nextPageIfNeeded(8);
    doc.setDrawColor(170, 177, 188);
    doc.rect(margin, y, contentWidth, 8);
    doc.line(margin + half, y, margin + half, y + 8);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(`${leftLabel}:`, margin + 2, y + 5);
    doc.text(`${rightLabel}:`, margin + half + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(textOrBlank(leftValue), margin + 30, y + 5, { maxWidth: half - 32 });
    doc.text(textOrBlank(rightValue), margin + half + 30, y + 5, { maxWidth: half - 32 });
    y += 8;
  };

  header();
  section("SECTION A", "PRELIMINARY INFORMATION");
  pair("Referred to", referral.referredTo, "Name", referral.patientSnapshot.name);
  pair("Position", referral.patientSnapshot.position, "Age / sex", `${referral.patientSnapshot.age} / ${referral.patientSnapshot.sex}`);
  pair("Department", referral.patientSnapshot.department, "Division", referral.patientSnapshot.division);
  pair("Unit", referral.patientSnapshot.unit, "Contact", referral.patientSnapshot.contactNumber);
  pair("Supervisor", referral.patientSnapshot.supervisorName, "Date / time", `${referral.referralDate} ${referral.referralTime}`);
  row("Clinical features", referral.clinicalFeatures);
  row("Clinical findings", [
    `BP ${textOrBlank(referral.vitals.bloodPressure)} mmHg`,
    `Pulse ${textOrBlank(referral.vitals.pulse)} bpm`,
    `RR ${textOrBlank(referral.vitals.respiratoryRate)} /min`,
    `Temp ${textOrBlank(referral.vitals.temperature)} °C`,
    `SpO2 ${textOrBlank(referral.vitals.spo2)}%`,
    `Pain ${textOrBlank(referral.vitals.painScore)}/10`,
    `Weight ${textOrBlank(referral.vitals.weightKg)} kg`,
    `Height ${textOrBlank(referral.vitals.heightCm)} cm`,
    `BMI ${textOrBlank(referral.vitals.bodyMassIndex)}`,
  ].join(" · "));
  row("General examination", [...referral.generalExamination, referral.generalExaminationOther].filter(Boolean).join(", "));
  row("Past medical history", [...referral.pastMedicalHistory, referral.pastMedicalHistoryOther].filter(Boolean).join(", "));
  pair("Work-related", referral.workRelated, "Suspected exposure", referral.suspectedExposure);
  row("Investigations done at the infirmary", referral.investigationsDone);
  row("Provisional diagnosis", referral.provisionalDiagnosis);
  row("Treatment given", referral.treatmentGiven);
  row("Reason for referral", [...referral.referralReasons, referral.referralReasonOther].filter(Boolean).join(", "));

  section("SECTION B", "INFIRMARY CLEARANCE");
  pair("Officer", referral.clearance.officer, "Position", referral.clearance.printedPosition);
  pair("Contact", referral.clearance.contact, "Date / time", `${referral.clearance.date} ${referral.clearance.time}`);
  row("Signature confirmed", yesNo(referral.clearance.signatureConfirmed));

  section("SECTION C", "OFFICIAL AUTHORISATION");
  row("Privacy handling", "Authorisation was recorded from a separate minimum-disclosure summary. Management clinical access remains unresolved and is not granted by this prototype.");
  pair("Head of Division", referral.authorisation?.headOfDivision.name, "Signature confirmed", yesNo(referral.authorisation?.headOfDivision.signatureConfirmed));
  pair("Date", referral.authorisation?.headOfDivision.date, "Remarks", referral.authorisation?.headOfDivision.remarks);
  pair("Chief of Staff", referral.authorisation?.chiefOfStaff.name, "Signature confirmed", yesNo(referral.authorisation?.chiefOfStaff.signatureConfirmed));
  pair("Date", referral.authorisation?.chiefOfStaff.date, "Remarks", referral.authorisation?.chiefOfStaff.remarks);

  // The two Section E labels intentionally reproduce the numbering defect in the supplied form.
  section("SECTION E", "EXTERNAL MEDICAL FACILITY FEEDBACK");
  pair("Facility", referral.externalFeedback?.facility, "Practitioner", referral.externalFeedback?.attendingPractitioner);
  row("Diagnosis", referral.externalFeedback?.diagnosis);
  row("Treatment provided", referral.externalFeedback?.treatmentProvided);
  row("Recommended follow-up", referral.externalFeedback?.recommendedFollowUp);
  pair("Sick leave days", referral.externalFeedback?.sickLeaveDays, "Date range", referral.externalFeedback?.sickLeaveFrom ? `${referral.externalFeedback.sickLeaveFrom} to ${referral.externalFeedback.sickLeaveTo}` : "");
  pair("Signature/stamp confirmed", yesNo(referral.externalFeedback?.signatureAndStampConfirmed), "Date", referral.externalFeedback?.date);

  section("SECTION E", "KMC INFIRMARY FOLLOW-UP REVIEW");
  row("Review comments", referral.followUpReview?.comments);
  pair("Reviewed by", referral.followUpReview?.reviewedBy, "Position", referral.followUpReview?.position);
  pair("Signature confirmed", yesNo(referral.followUpReview?.signatureConfirmed), "Date", referral.followUpReview?.date);

  footer();
  doc.save(`${referral.formNumber}-${referral.patientSnapshot.name.replaceAll(" ", "-")}.pdf`);
};
