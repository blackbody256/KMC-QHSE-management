export type DemoRole = "health-wellness-officer" | "manager" | "director";

export interface DemoUser {
  id: string;
  name: string;
  title: string;
  identifier: string;
  role: DemoRole;
}

export type PatientCategory = "Employee" | "Intern" | "Other";
export type VisitType =
  | "Walk-in"
  | "Referred by supervisor"
  | "Emergency"
  | "Follow-up";
export type RecordState = "draft" | "signed";
export type SectionStatus =
  | "not-recorded"
  | "partial"
  | "complete"
  | "not-indicated";
export type ComplianceStatus =
  | "within"
  | "approaching"
  | "outside"
  | "no-data"
  | "provisional"
  | "informational"
  | "not-applicable";
export type MetricProvenance =
  | "Derived"
  | "Manual"
  | "Attributed return"
  | "Proposed"
  | "Informational";
export type ErgonomicOutcome =
  | "Compliant"
  | "Partially compliant"
  | "Non-compliant";

export interface Patient {
  id: string;
  fullName: string;
  age: number;
  sex: "Female" | "Male";
  phone?: string;
  category: PatientCategory;
  categoryDetail?: string;
  employeeNumber?: string;
  department?: string;
  division?: string;
  unit?: string;
  jobTitle?: string;
  createdAt: string;
}

export interface VisitSection {
  status: SectionStatus;
  notes: string;
  selections?: string[];
}

export interface VitalSigns {
  bloodPressure?: string;
  pulse?: number;
  respiratoryRate?: number;
  temperature?: number;
  spo2?: number;
  weightKg?: number;
  heightCm?: number;
  painScore?: number;
}

export interface PatientVisit {
  id: string;
  patientId: string;
  visitDate: string;
  timeIn: string;
  visitType: VisitType;
  state: RecordState;
  workRelated: "Yes" | "No" | "Unsure";
  sections: Record<string, VisitSection>;
  vitals: VitalSigns;
  clinician: string;
  signedAt?: string;
  createdAt: string;
}

export interface MonthlyReturn {
  id: string;
  period: string;
  healthRelatedLostDays: number;
  headcount: number;
  surveillanceScheduled: number;
  surveillanceCompleted: number;
  fatalities?: number;
  totalRecordableIncidents?: number;
  totalRecordableInjuries?: number;
  reportableNearMisses?: number;
  healthSourceNote: string;
  safetySourceNote?: string;
  enteredBy: string;
  enteredAt: string;
}

export interface EffectiveDatedRecord {
  id: string;
  effectiveFrom: string;
  effectiveTo?: string;
  sourceNote: string;
  approvalState: "approved" | "proposal" | "confirmation-pending";
}

export type KpiComparison = "gte" | "lt" | "eq";
export type MetricDirection = "higher" | "lower";
export type MetricFormat = "integer" | "decimal-1" | "decimal-2" | "percent-1";

export interface KpiDefinition extends EffectiveDatedRecord {
  metricId:
    | "OH1"
    | "OH2"
    | "OH3"
    | "OH4"
    | "S1"
    | "S2"
    | "S3"
    | "S4"
    | "S5";
  name: string;
  group: "Occupational health" | "Health and safety summary";
  targetLabel: string;
  targetValue: number;
  comparison: KpiComparison;
  direction: MetricDirection;
  approachingBoundary?: number;
  format: MetricFormat;
  provenance: MetricProvenance;
  note: string;
}

export type HygieneParameter = "PM2.5" | "PM10" | "Noise · day" | "Noise · night";

export interface HygieneReferenceLimit extends EffectiveDatedRecord {
  parameter: HygieneParameter;
  limit: number;
  unit: "µg/m³" | "dB(A)";
  averagingPeriod: string;
  context: "occupational-exposure" | "indoor-workplace";
  standardFamily: string;
}

export interface IndustrialHygieneReading {
  id: string;
  eventId: string;
  period: string;
  recordedAt: string;
  location: string;
  instrument: string;
  parameter: HygieneParameter;
  value: number;
  limitReferenceId: string;
  limitApplied: number;
  unit: "µg/m³" | "dB(A)";
  averagingPeriod: string;
  context: "occupational-exposure" | "indoor-workplace";
  standardFamily: string;
  standardVersion: string;
  kpiEligible: boolean;
}

export interface CorrectiveAction {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
  status: "Open" | "Implemented" | "Closed";
  closedAt?: string;
}

export interface ErgonomicAssessment {
  id: string;
  period: string;
  assessedAt: string;
  workstation: string;
  workType: "Office" | "Industrial";
  assessor: string;
  outcome: ErgonomicOutcome;
  findings: string;
  action?: CorrectiveAction;
}

export interface HealthWellnessPlan {
  period: string;
  hygieneEventsPlanned: number;
  ergonomicAssessmentsPlanned: number;
  confirmedOccupationalDiseases: number;
}

/**
 * Laboratory requisition — KMC.DQHSE.05/26-FM008.
 *
 * Modelled on the form the clinic actually uses. The earlier generic panel,
 * with liver function, lipids, audiometry and the rest, was a placeholder and
 * has been removed: none of it appears on the form.
 *
 * Two things the form does that are worth stating, because both differ from
 * what a laboratory module is usually assumed to do:
 *
 * The Results column sits beside the Requested Investigations column, so a
 * result belongs to a requested test on one sheet rather than to a separate
 * analyte record. Results are recorded as written, because the form carries no
 * units and no reference ranges.
 *
 * There is therefore no abnormality flag. Deciding a result is abnormal needs
 * a range the form does not define, and inventing one would put a clinical
 * judgement in the software's mouth. Whether the laboratory wants structured
 * ranges is recorded as an open question rather than answered here.
 */
export type LabTestCode =
  | "BS"
  | "MRDT"
  | "TYPHOID_AG"
  | "HPYLORI_AG"
  | "CBC"
  | "RBS"
  | "FBS";

export type LabTestGroup =
  | "Malaria & Parasitology"
  | "Gastrointestinal & Serology"
  | "Hematology"
  | "Blood Glucose Monitoring";

export type LabSpecimenType = "Whole Blood" | "Serum/Plasma" | "Stool";

/**
 * requested  — the officer has completed and authorised the top of the form
 * collected  — the laboratory has recorded the specimen and who took it
 * resulted   — results have been written against the requested tests
 */
export type LabRequisitionStatus = "requested" | "collected" | "resulted";

/** One requested investigation and the result written against it. */
export interface LabRequestedTest {
  code: LabTestCode;
  /** As written by the laboratory. Free text, because the form is free text. */
  result: string;
  resultedAt?: string;
}

export interface LabRequisition {
  id: string;
  formNumber: "KMC.DQHSE.05/26-FM008";
  visitId: string;
  patientId: string;
  status: LabRequisitionStatus;
  /** Taken at the time of the request, as the printed form is. */
  patientSnapshot: {
    fullName: string;
    staffIdNumber: string;
    department: string;
    gender: "Female" | "Male";
    ageOrDob: string;
  };
  requestDate: string;
  tests: LabRequestedTest[];
  clinicalSummary: string;
  authorisedBy: string;
  authorisedSignatureConfirmed: boolean;
  /** For Laboratory Use Only. */
  specimenCollected?: LabSpecimenType[];
  collectedBy?: string;
  timeOfCollection?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReferralStatus = "drafted" | "authorised" | "issued" | "returned" | "reviewed";

export interface ReferralSignOff {
  name: string;
  signatureConfirmed: boolean;
  date: string;
  remarks: string;
}

export interface MedicalReferral {
  id: string;
  formNumber: "KMC.DQHSE.02/26-FM004";
  visitId: string;
  patientId: string;
  status: ReferralStatus;
  referredTo: string;
  patientSnapshot: {
    name: string;
    position: string;
    age: number;
    sex: "Female" | "Male";
    department: string;
    division: string;
    unit: string;
    contactNumber: string;
    supervisorName: string;
  };
  referralDate: string;
  referralTime: string;
  clinicalFeatures: string;
  vitals: VitalSigns & { bodyMassIndex?: number };
  generalExamination: string[];
  generalExaminationOther?: string;
  pastMedicalHistory: string[];
  pastMedicalHistoryOther?: string;
  workRelated: "Yes" | "No" | "Suspected";
  suspectedExposure?: string;
  investigationsDone: string;
  provisionalDiagnosis: string;
  treatmentGiven: string;
  referralReasons: string[];
  referralReasonOther?: string;
  clearance: {
    officer: string;
    printedPosition: string;
    signatureConfirmed: boolean;
    contact: string;
    date: string;
    time: string;
  };
  authorisation?: {
    costImplication: string;
    headOfDivision: ReferralSignOff;
    chiefOfStaff: ReferralSignOff;
    recordedBy: string;
    recordedAt: string;
  };
  issuedAt?: string;
  externalFeedback?: {
    facility: string;
    attendingPractitioner: string;
    diagnosis: string;
    treatmentProvided: string;
    recommendedFollowUp: string;
    sickLeaveDays: number;
    sickLeaveFrom?: string;
    sickLeaveTo?: string;
    signatureAndStampConfirmed: boolean;
    date: string;
  };
  followUpReview?: {
    comments: string;
    reviewedBy: string;
    position: string;
    signatureConfirmed: boolean;
    date: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DemoState {
  version: 4;
  role: DemoRole;
  patients: Patient[];
  visits: PatientVisit[];
  monthlyReturns: MonthlyReturn[];
  kpiDefinitions: KpiDefinition[];
  hygieneReferenceLimits: HygieneReferenceLimit[];
  industrialHygieneReadings: IndustrialHygieneReading[];
  ergonomicAssessments: ErgonomicAssessment[];
  plans: HealthWellnessPlan[];
  labRequisitions: LabRequisition[];
  referrals: MedicalReferral[];
}

export interface MetricValue {
  displayValue: string;
  numericValue?: number;
  status: ComplianceStatus;
  completeness: "complete" | "incomplete" | "no-data";
  note?: string;
  calculation?: string;
  targetLabel?: string;
}

export interface DashboardMetric {
  id: string;
  name: string;
  group: KpiDefinition["group"];
  target: string;
  targetValue: number;
  comparison: KpiComparison;
  format: MetricFormat;
  direction: MetricDirection;
  provenance: MetricProvenance;
  sourceNote: string;
  note: string;
  proposed: boolean;
  aggregationLabel: "Year-to-date total" | "Year-to-date weighted rate";
  month: MetricValue;
  yearToDate: MetricValue;
}

export interface MetricTrendPoint {
  period: string;
  periodCode: string;
  value: number | null;
  displayValue: string;
  status: ComplianceStatus;
}
