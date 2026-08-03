export type DemoRole = "doctor" | "management";
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
  | "no-data";
export type MetricProvenance =
  | "Derived"
  | "Manual"
  | "Register"
  | "Seeded"
  | "Proposed";
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
  lostDays: number;
  headcount: number;
  surveillanceScheduled: number;
  surveillanceCompleted: number;
  sourceNote: string;
  enteredBy: string;
  enteredAt: string;
}

export type EnvironmentalParameter =
  | "PM2.5"
  | "PM10"
  | "Noise · day"
  | "Noise · night";

export interface EnvironmentalReading {
  id: string;
  eventId: string;
  period: string;
  recordedAt: string;
  location: string;
  instrument: string;
  parameter: EnvironmentalParameter;
  value: number;
  limit: number;
  unit: "µg/m³" | "dB(A)";
  averagingPeriod: string;
  standardFamily: string;
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

export interface LicenceRecord {
  id: string;
  type: "Infirmary" | "Practitioner";
  holder: string;
  credential: string;
  issueDate: string;
  expiryDate: string;
  authority: string;
}

export interface DemoPlan {
  period: string;
  environmentalEventsPlanned: number;
  ergonomicAssessmentsPlanned: number;
  confirmedOccupationalDiseases: number;
}

export interface DemoState {
  version: 1;
  role: DemoRole;
  patients: Patient[];
  visits: PatientVisit[];
  monthlyReturns: MonthlyReturn[];
  environmentalReadings: EnvironmentalReading[];
  ergonomicAssessments: ErgonomicAssessment[];
  licences: LicenceRecord[];
  plans: DemoPlan[];
}

export interface DashboardMetric {
  id: string;
  name: string;
  displayValue: string;
  numericValue?: number;
  target: string;
  status: ComplianceStatus;
  provenance: MetricProvenance;
  note: string;
  proposed?: boolean;
  companion?: {
    label: string;
    displayValue: string;
    status: ComplianceStatus;
  };
}
