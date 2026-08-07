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

export type LabPriority = "Routine" | "Urgent";
export type SurveillanceContext =
  | "Pre-employment"
  | "Periodic surveillance"
  | "Exit"
  | "Incident";

export interface LabReferenceRange extends EffectiveDatedRecord {
  panel: string;
  analyte: string;
  specimenType: string;
  unit: string;
  displayRange: string;
}

export interface LabTestRequest {
  id: string;
  visitId: string;
  patientId: string;
  requestingOfficer: string;
  requestedAt: string;
  specimenType: string;
  testsRequested: string[];
  clinicalIndication: string;
  priority: LabPriority;
  surveillanceContext: SurveillanceContext;
  proposalNotice: string;
  createdAt: string;
}

export interface LabRangeSnapshot {
  referenceRangeId: string;
  displayRange: string;
  unit: string;
  effectiveFrom: string;
  sourceNote: string;
}

export interface LabTestResult {
  id: string;
  requestId: string;
  analyte: string;
  value: string;
  unit: string;
  rangeApplied: LabRangeSnapshot;
  abnormal: boolean;
  verifyingPractitioner: string;
  resultDate: string;
  createdAt: string;
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
  version: 3;
  role: DemoRole;
  patients: Patient[];
  visits: PatientVisit[];
  monthlyReturns: MonthlyReturn[];
  kpiDefinitions: KpiDefinition[];
  hygieneReferenceLimits: HygieneReferenceLimit[];
  industrialHygieneReadings: IndustrialHygieneReading[];
  ergonomicAssessments: ErgonomicAssessment[];
  plans: HealthWellnessPlan[];
  labReferenceRanges: LabReferenceRange[];
  labRequests: LabTestRequest[];
  labResults: LabTestResult[];
  referrals: MedicalReferral[];
}

export interface MetricValue {
  displayValue: string;
  numericValue?: number;
  status: ComplianceStatus;
  completeness: "complete" | "incomplete" | "no-data";
  note?: string;
}

export interface DashboardMetric {
  id: string;
  name: string;
  target: string;
  direction: MetricDirection;
  provenance: MetricProvenance;
  note: string;
  proposed: boolean;
  month: MetricValue;
  yearToDate: MetricValue;
}
