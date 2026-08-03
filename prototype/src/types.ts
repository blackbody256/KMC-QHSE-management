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
  | "Register"
  | "Seeded"
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
  lostDays: number;
  headcount: number;
  surveillanceScheduled: number;
  surveillanceCompleted: number;
  hoursWorked?: number;
  sourceNote: string;
  enteredBy: string;
  enteredAt: string;
}

export type EnvironmentalParameter =
  | "PM2.5"
  | "PM10"
  | "Noise · day"
  | "Noise · night";

export type MonitoringContext =
  | "occupational-exposure"
  | "indoor-workplace"
  | "ambient-environmental";

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
  context: MonitoringContext;
  standardFamily: string;
  standardVersion: string;
  k4Eligible: boolean;
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

export type SafetyClassification =
  | "Occupational accident"
  | "Occupational disease"
  | "Dangerous occurrence"
  | "Incident / near miss";

export type SafetySeverity =
  | "Fatality"
  | "Lost-time injury"
  | "Restricted work or job transfer"
  | "Medical treatment"
  | "First aid only"
  | "No injury";

export type Recordability = "Pending" | "Recordable" | "Not recordable";
export type InvestigationStatus = "Not started" | "In progress" | "Completed";

export interface SafetyIncident {
  id: string;
  caseNumber: string;
  state: "draft" | "submitted";
  period: string;
  occurredAt: string;
  reportedAt: string;
  unit: string;
  location: string;
  workArea: string;
  shift: "Day" | "Night" | "Not applicable";
  activity: string;
  description: string;
  personCategory: "Employee" | "Contractor" | "Intern" | "Visitor" | "None";
  affectedPersonRef?: string;
  workRelated: "Yes" | "No" | "Pending";
  classification: SafetyClassification;
  severity: SafetySeverity;
  potentialSeverity: SafetySeverity;
  fatalityCount: number;
  nonFatalInjuryCount: number;
  daysAway: number;
  restrictedDays: number;
  recordability: Recordability;
  recordabilityBasis: string;
  determinedBy?: string;
  determinedAt?: string;
  investigationRequired: boolean;
  investigationRequiredReason: string;
  investigationStatus: InvestigationStatus;
  investigationOwner?: string;
  investigationDueAt?: string;
  investigationCompletedAt?: string;
  findings?: string;
  rootCauses?: string;
  correctiveActions: CorrectiveAction[];
  clinicalEncounterIdRef?: string;
  createdBy: string;
  createdAt: string;
}

export interface SafetyPeriodAttestation {
  period: string;
  state: "open" | "attested";
  attestedBy?: string;
  attestedAt?: string;
  note?: string;
}

export interface ExpiryTrackedRecord {
  id: string;
  domain: "Environment" | "Quality" | "Industrial hygiene" | "Other";
  recordType: string;
  owner: string;
  reference: string;
  validFrom: string;
  expiresOn: string;
  authority: string;
}

export interface DemoPlan {
  period: string;
  environmentalEventsPlanned: number;
  ergonomicAssessmentsPlanned: number;
  confirmedOccupationalDiseases: number;
}

export interface DemoState {
  version: 2;
  role: DemoRole;
  patients: Patient[];
  visits: PatientVisit[];
  monthlyReturns: MonthlyReturn[];
  environmentalReadings: EnvironmentalReading[];
  ergonomicAssessments: ErgonomicAssessment[];
  safetyIncidents: SafetyIncident[];
  safetyAttestations: SafetyPeriodAttestation[];
  expiryTrackedRecords: ExpiryTrackedRecord[];
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
  bands?: Array<{ label: string; value: number }>;
  directionNote?: string;
}

export interface SafetyDashboardSnapshot {
  period: string;
  periodState: "open-empty" | "open-provisional" | "attested-empty" | "attested-final";
  metrics: DashboardMetric[];
  incidents: SafetyIncident[];
  pendingDecisions: number;
}
