/**
 * Calls to the API go through the gateway on the same origin. The browser
 * holds no token. It holds an opaque HttpOnly session cookie, and the gateway
 * attaches the bearer token on the way out.
 */

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.name = "ApiError";
  }
}

interface ProblemBody {
  status?: number;
  detail?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const problem = (body ?? {}) as ProblemBody;
    // The service states the corrective action. Pass it through rather than
    // replacing it with a generic message.
    throw new ApiError(
      response.status,
      problem.detail ?? "The request could not be completed. Try again.",
    );
  }

  return body as T;
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T,>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
};

// --- Clinical -------------------------------------------------------------

export type PatientCategory = "Employee" | "Intern" | "Other";
export type VisitType = "Walk-in" | "Referred by supervisor" | "Emergency" | "Follow-up";
export type SectionStatus = "not-recorded" | "partial" | "complete" | "not-indicated";

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

export interface VisitSection {
  status: SectionStatus;
  notes: string;
  selections: string[];
}

export interface Visit {
  id: string;
  patientId: string;
  visitDate: string;
  timeIn: string;
  visitType: VisitType;
  state: "draft" | "signed";
  workRelated: "Yes" | "No" | "Unsure";
  vitals: VitalSigns;
  bodyMassIndex?: number;
  sections: Record<string, VisitSection>;
  recordedBy: string;
  signedAt?: string;
  signedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SectionDescriptor {
  code: string;
  label: string;
}

// --- Laboratory, KMC.DQHSE.05/26-FM008 -----------------------------------

export interface LabTestDefinition {
  code: string;
  shortName: string;
  fullName: string;
  group: string;
  preparationNote?: string;
}

export interface LabCatalogue {
  formNumber: string;
  groups: string[];
  tests: LabTestDefinition[];
  specimenTypes: string[];
}

export interface RequestedTest {
  code: string;
  /** As reported by the laboratory. Free text, because the form is free text. */
  result: string;
  resultedAt?: string;
}

export interface LabRequisition {
  id: string;
  formNumber: string;
  visitId: string;
  patientId: string;
  status: "requested" | "collected" | "resulted";
  patientSnapshot: {
    fullName: string;
    staffIdNumber: string;
    department: string;
    gender: "Female" | "Male";
    ageOrDob: string;
  };
  requestDate: string;
  tests: RequestedTest[];
  clinicalSummary: string;
  authorisedBy: string;
  authorisedSignatureConfirmed: boolean;
  specimenCollected: string[];
  collectedBy?: string;
  timeOfCollection?: string;
  createdAt: string;
  updatedAt: string;
}

export const labApi = {
  /** The investigations the form offers. The interface keeps no copy. */
  catalogue: () => api.get<LabCatalogue>("/api/clinical/lab/catalogue"),

  list: (params: { patientId?: string; visitId?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.patientId) query.set("patientId", params.patientId);
    if (params.visitId) query.set("visitId", params.visitId);
    const suffix = query.toString();
    return api.get<{ requisitions: LabRequisition[] }>(
      `/api/clinical/lab/requisitions${suffix ? `?${suffix}` : ""}`,
    );
  },
  get: (id: string) =>
    api.get<LabRequisition>(`/api/clinical/lab/requisitions/${encodeURIComponent(id)}`),
  create: (input: {
    visitId: string;
    patientId: string;
    patientSnapshot: LabRequisition["patientSnapshot"];
    requestDate: string;
    testCodes: string[];
    clinicalSummary: string;
    authorisedSignatureConfirmed: boolean;
  }) => api.post<LabRequisition>("/api/clinical/lab/requisitions", input),
  recordResults: (
    id: string,
    input: {
      results: Record<string, string>;
      specimenCollected: string[];
      collectedBy: string;
      timeOfCollection: string;
    },
  ) =>
    api.put<LabRequisition>(
      `/api/clinical/lab/requisitions/${encodeURIComponent(id)}/results`,
      input,
    ),
};

// --- Medical referral, KMC.DQHSE.02/26-FM004 ------------------------------

export type ReferralStatus = "drafted" | "authorised" | "issued" | "returned" | "reviewed";

/** One labelled section of the printed form, defects included. */
export interface ReferralSection {
  label: string;
  title: string;
  /** Set where the printed label is wrong. Shown, never silently corrected. */
  defect?: string;
}

/**
 * The form's own structure and option lists, published by the service.
 *
 * The interface keeps no copy of these. Two lists of past medical history
 * would eventually disagree, and the one that disagreed silently would be the
 * one a clinician ticked.
 */
export interface ReferralForm {
  formNumber: string;
  sections: ReferralSection[];
  statuses: ReferralStatus[];
  generalExamination: string[];
  pastMedicalHistory: string[];
  referralReasons: string[];
  workRelatedOptions: string[];
  clearancePrintedPosition: string;
  clearancePositionNote: string;
  authorisationDecisionNote: string;
}

export interface ReferralSignOff {
  name: string;
  signatureConfirmed: boolean;
  date?: string;
  remarks: string;
}

export interface ReferralAuthorisation {
  costImplication: string;
  headOfDivision: ReferralSignOff;
  chiefOfStaff: ReferralSignOff;
  recordedBy: string;
  recordedAt: string;
}

export interface ReferralFeedback {
  version: number;
  facility: string;
  practitioner: string;
  diagnosis: string;
  treatmentProvided: string;
  recommendedFollowUp: string;
  sickLeaveDays: number;
  sickLeaveFrom?: string;
  sickLeaveTo?: string;
  signatureAndStampConfirmed: boolean;
  date?: string;
}

export interface ReferralReview {
  comments: string;
  reviewedBy: string;
  position: string;
  signatureConfirmed: boolean;
  date?: string;
}

export interface Referral {
  id: string;
  formNumber: string;
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
  vitals: VitalSigns;
  /** Derived by the service from the copied height and weight. Never entered. */
  bodyMassIndex?: number;
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
    date?: string;
    time?: string;
  };
  authorisation?: ReferralAuthorisation;
  issuedAt?: string;
  externalFeedback?: ReferralFeedback;
  followUpReview?: ReferralReview;
  /** The stages this referral may move to. The service decides, not the page. */
  nextStates: ReferralStatus[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * The whole of what an authoriser is shown.
 *
 * Patient, destination, reason and cost. No diagnosis, no history, no vital
 * signs. Assembled by the service rather than filtered here, so the narrow
 * field set is a property of the system rather than of this page, see DEC-024.
 */
export interface AuthorisationSummary {
  referralId: string;
  formNumber: string;
  patientName: string;
  department: string;
  destination: string;
  referralDate: string;
  referralReasons: string[];
  costImplication: string;
  disclosureNote: string;
}

export interface CreateReferralInput {
  visitId: string;
  patientId: string;
  referredTo: string;
  patientSnapshot: Referral["patientSnapshot"];
  referralDate: string;
  referralTime: string;
  clinicalFeatures: string;
  vitals: VitalSigns;
  generalExamination: string[];
  generalExaminationOther: string;
  pastMedicalHistory: string[];
  pastMedicalHistoryOther: string;
  workRelated: string;
  suspectedExposure: string;
  investigationsDone: string;
  provisionalDiagnosis: string;
  treatmentGiven: string;
  referralReasons: string[];
  referralReasonOther: string;
  clearanceContact: string;
  clearanceDate: string;
  clearanceTime: string;
  clearanceSignatureConfirmed: boolean;
}

const referralPath = (id: string, suffix = "") =>
  `/api/clinical/referrals/${encodeURIComponent(id)}${suffix}`;

export const referralApi = {
  /** The form's structure and options. The interface keeps no copy. */
  form: () => api.get<ReferralForm>("/api/clinical/referrals/form"),

  list: (params: { patientId?: string; visitId?: string; status?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.patientId) query.set("patientId", params.patientId);
    if (params.visitId) query.set("visitId", params.visitId);
    if (params.status) query.set("status", params.status);
    const suffix = query.toString();
    return api.get<{ referrals: Referral[] }>(
      `/api/clinical/referrals${suffix ? `?${suffix}` : ""}`,
    );
  },

  get: (id: string) => api.get<Referral>(referralPath(id)),

  create: (input: CreateReferralInput) => api.post<Referral>("/api/clinical/referrals", input),

  authorisationSummary: (id: string) =>
    api.get<AuthorisationSummary>(referralPath(id, "/authorisation-summary")),

  /**
   * Records an authorisation obtained outside this system. It does not grant
   * one: no management role has a route to a referral while DEC-024 is open.
   */
  recordAuthorisation: (
    id: string,
    input: {
      costImplication: string;
      headOfDivision: ReferralSignOff;
      chiefOfStaff: ReferralSignOff;
    },
  ) => api.post<Referral>(referralPath(id, "/authorisation"), input),

  issue: (id: string) => api.post<Referral>(referralPath(id, "/issue")),

  recordFeedback: (id: string, input: Omit<ReferralFeedback, "version">) =>
    api.put<Referral>(referralPath(id, "/feedback"), input),

  recordReview: (id: string, input: ReferralReview) =>
    api.put<Referral>(referralPath(id, "/review"), input),
};

// --- The consolidated patient record --------------------------------------

export interface VisitSummaryText {
  presentingComplaint?: string;
  impression?: string;
  treatment?: string;
}

export interface TimelineEntry {
  visit: Visit;
  summary: VisitSummaryText;
  completeness: { decided: number; total: number };
  requisitions: LabRequisition[];
  /** Referrals raised from this visit, beside the requisitions it raised. */
  referrals: Referral[];
}

export interface RecordSummary {
  visitCount: number;
  firstVisit?: string;
  lastVisit?: string;
  workRelatedCount: number;
  draftVisits: number;
  awaitingResults: number;
  /** Referrals not yet reviewed: is this patient still out there somewhere. */
  openReferrals: number;
}

export interface PatientRecord {
  patient: Patient;
  summary: RecordSummary;
  timeline: TimelineEntry[];
  unlinked: LabRequisition[];
  unlinkedReferrals: Referral[];
}

export const clinicalApi = {
  /**
   * Everything that has happened to one patient, in one call. Assembled by
   * the service so that the visit, the requisitions raised from it and the
   * referrals stay related, and so that opening a record writes one entry to
   * the access log rather than three.
   */
  getPatientRecord: (id: string) =>
    api.get<PatientRecord>(`/api/clinical/patients/${encodeURIComponent(id)}/record`),

  /** The record's structure comes from the service. The interface does not
   *  carry its own copy of the section list, because two lists would drift. */
  sections: () => api.get<{ sections: SectionDescriptor[] }>("/api/clinical/sections"),

  listPatients: (query = "") =>
    api.get<{ patients: Patient[] }>(
      `/api/clinical/patients${query ? `?q=${encodeURIComponent(query)}` : ""}`,
    ),
  getPatient: (id: string) => api.get<Patient>(`/api/clinical/patients/${encodeURIComponent(id)}`),
  createPatient: (input: Omit<Patient, "id" | "createdAt">) =>
    api.post<Patient>("/api/clinical/patients", input),

  listVisits: (patientId = "") =>
    api.get<{ visits: Visit[] }>(
      `/api/clinical/visits${patientId ? `?patientId=${encodeURIComponent(patientId)}` : ""}`,
    ),
  getVisit: (id: string) =>
    api.get<{ visit: Visit; completeness: { decided: number; total: number } }>(
      `/api/clinical/visits/${encodeURIComponent(id)}`,
    ),
  createVisit: (input: {
    patientId: string;
    visitDate: string;
    timeIn: string;
    visitType: VisitType;
    workRelated: "Yes" | "No" | "Unsure";
    vitals: VitalSigns;
    sections: Record<string, VisitSection>;
  }) => api.post<Visit>("/api/clinical/visits", input),
  saveSection: (visitId: string, code: string, section: VisitSection) =>
    api.put<{ status: string }>(
      `/api/clinical/visits/${encodeURIComponent(visitId)}/sections/${encodeURIComponent(code)}`,
      section,
    ),
  signVisit: (visitId: string) =>
    api.post<{ state: string }>(`/api/clinical/visits/${encodeURIComponent(visitId)}/sign`),
};

export interface AccountView {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  enabled: boolean;
  createdAt: string;
}

export interface RoleOption {
  value: string;
  label: string;
  description: string;
}

export const identityApi = {
  listAccounts: () => api.get<{ users: AccountView[] }>("/api/identity/users"),
  listRoles: () => api.get<{ roles: RoleOption[] }>("/api/identity/roles"),
  createAccount: (input: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    temporaryPassword: string;
  }) => api.post<AccountView>("/api/identity/users", input),
  setEnabled: (id: string, enabled: boolean) =>
    api.post<{ id: string; enabled: boolean }>(
      `/api/identity/users/${encodeURIComponent(id)}/${enabled ? "enable" : "disable"}`,
    ),
};

// --- Reference data, hwms-admin -------------------------------------------

/**
 * Targets and exposure limits, effective-dated.
 *
 * No target or threshold is compiled into this application (NFR-DATA-01).
 * Everything below is read from the service, which holds the value that was in
 * force on a stated date, so a dashboard rendered for June uses June's target
 * rather than today's.
 */
export interface KpiDefinition {
  id: string;
  metricId: string;
  name: string;
  group: string;
  targetLabel: string;
  targetValue: number;
  comparison: "gte" | "lt" | "eq";
  direction: "higher" | "lower";
  approachingBoundary?: number;
  format: string;
  provenance: string;
  note: string;
  effectiveFrom: string;
  effectiveTo?: string;
  sourceNote: string;
  approvalState: "approved" | "proposal" | "confirmation-pending";
}

export interface HygieneLimit {
  id: string;
  parameter: string;
  limit: number;
  unit: string;
  averagingPeriod: string;
  context: "occupational-exposure" | "indoor-workplace" | "ambient";
  standardFamily: string;
  standardVersion: string;
  effectiveFrom: string;
  effectiveTo?: string;
  sourceNote: string;
  approvalState: "approved" | "proposal" | "confirmation-pending";
}

export const adminApi = {
  kpiDefinitions: (on?: string) =>
    api.get<{ on: string; definitions: KpiDefinition[] }>(
      `/api/admin/kpi-definitions${on ? `?on=${encodeURIComponent(on)}` : ""}`,
    ),
  hygieneLimits: (on?: string) =>
    api.get<{ on: string; limits: HygieneLimit[] }>(
      `/api/admin/hygiene-limits${on ? `?on=${encodeURIComponent(on)}` : ""}`,
    ),
};

// --- Ergonomics and industrial hygiene, hwms-occupational -----------------

export type MonitoringContext = "occupational-exposure" | "indoor-workplace" | "ambient";

export interface Reading {
  id: string;
  eventId: string;
  period: string;
  readingDate: string;
  location: string;
  instrument: string;
  parameter: string;
  value: number;
  /** The limit as it stood on the reading date, copied onto the reading. */
  limitReferenceId: string;
  limitApplied: number;
  unit: string;
  averagingPeriod: string;
  context: MonitoringContext;
  standardFamily: string;
  standardVersion: string;
  /** Written once and never recomputed when a limit is later revised. */
  compliance: "within" | "outside";
  kpiEligible: boolean;
  recordedBy: string;
}

export interface MonitoringEvent {
  id: string;
  period: string;
  eventDate: string;
  location: string;
  instrument: string;
  performed: boolean;
  notPerformedReason?: string;
  notes: string;
  recordedBy: string;
  readings: Reading[];
}

export interface CorrectiveAction {
  id: string;
  assessmentId: string;
  description: string;
  owner: string;
  dueDate: string;
  status: "Open" | "Implemented" | "Closed";
  closedOn?: string;
  evidence: string;
}

export interface ErgonomicAssessment {
  id: string;
  period: string;
  assessedOn: string;
  workstation: string;
  workType: "Office" | "Industrial";
  assessor: string;
  outcome: "Compliant" | "Partially compliant" | "Non-compliant";
  findings: string;
  actions: CorrectiveAction[];
  recordedBy: string;
}

export interface OccupationalPlan {
  period: string;
  hygieneEventsPlanned: number;
  ergonomicAssessmentsPlanned: number;
  confirmedOccupationalDiseases: number;
  recordedBy: string;
}

export interface OccupationalPlanRevision {
  period: string;
  previous: Record<string, unknown>;
  reason: string;
  correctedBy: string;
  correctedAt: string;
}

export interface OccupationalOptions {
  ergonomicOutcomes: string[];
  workTypes: string[];
  actionStatuses: string[];
}

export const occupationalApi = {
  options: () => api.get<OccupationalOptions>("/api/occupational/options"),
  /** Only parameters with a limit in force are offered, a reading with
   *  nothing to judge it against cannot be evaluated later without inventing
   *  history. */
  parameters: (on?: string) =>
    api.get<{ on: string; limits: HygieneLimit[] }>(
      `/api/occupational/parameters${on ? `?on=${encodeURIComponent(on)}` : ""}`,
    ),

  listEvents: (period?: string) =>
    api.get<{ events: MonitoringEvent[] }>(
      `/api/occupational/hygiene/events${period ? `?period=${encodeURIComponent(period)}` : ""}`,
    ),
  createEvent: (input: {
    eventDate: string;
    location: string;
    instrument: string;
    performed: boolean;
    notPerformedReason: string;
    notes: string;
  }) => api.post<MonitoringEvent>("/api/occupational/hygiene/events", input),
  createReading: (
    eventId: string,
    input: { parameter: string; value: number; context: string; kpiEligible: boolean },
  ) =>
    api.post<Reading>(
      `/api/occupational/hygiene/events/${encodeURIComponent(eventId)}/readings`,
      input,
    ),

  listAssessments: (period?: string) =>
    api.get<{ assessments: ErgonomicAssessment[] }>(
      `/api/occupational/ergonomics/assessments${period ? `?period=${encodeURIComponent(period)}` : ""}`,
    ),
  createAssessment: (input: {
    assessedOn: string;
    workstation: string;
    workType: string;
    assessor: string;
    outcome: string;
    findings: string;
    actions: { description: string; owner: string; dueDate: string }[];
  }) => api.post<ErgonomicAssessment>("/api/occupational/ergonomics/assessments", input),
  updateAction: (id: string, input: { status: string; closedOn: string; evidence: string }) =>
    api.put<CorrectiveAction>(`/api/occupational/ergonomics/actions/${encodeURIComponent(id)}`, input),

  plan: (period: string) =>
    api.get<{ period: string; plan: OccupationalPlan | null }>(
      `/api/occupational/plan?period=${encodeURIComponent(period)}`,
    ),
  savePlan: (
    period: string,
    input: Omit<OccupationalPlan, "period" | "recordedBy"> & { reason: string },
  ) =>
    api.put<OccupationalPlan>(`/api/occupational/plan/${encodeURIComponent(period)}`, input),
  planRevisions: (period: string) =>
    api.get<{ revisions: OccupationalPlanRevision[] }>(
      `/api/occupational/plan/${encodeURIComponent(period)}/revisions`,
    ),
};

// --- Monthly returns and the dashboard, hwms-metrics ----------------------

export interface MonthlyReturn {
  period: string;
  healthRelatedLostDays: number;
  headcount: number;
  surveillanceScheduled: number;
  surveillanceCompleted: number;
  healthSourceNote: string;
  /** Absent means No data, never zero. A month nobody supplied a near-miss
   *  count for is not a month with no near misses. */
  fatalities?: number;
  totalRecordableIncidents?: number;
  totalRecordableInjuries?: number;
  reportableNearMisses?: number;
  safetySourceNote: string;
  enteredBy: string;
  enteredAt: string;
  updatedAt: string;
}

export interface ReturnRevision {
  period: string;
  previous: Record<string, unknown>;
  reason: string;
  correctedBy: string;
  correctedAt: string;
}

export type MetricStatus = "within" | "approaching" | "outside" | "no-data";

export interface MetricValue {
  displayValue: string;
  numericValue?: number;
  status: MetricStatus;
  completeness: "complete" | "incomplete" | "no-data";
  /** How the figure was worked out, in words. Shown beside it: a number whose
   *  derivation is invisible is a number nobody can challenge. */
  calculation?: string;
  note?: string;
}

export interface DashboardMetric {
  id: string;
  name: string;
  group: string;
  target: string;
  targetValue: number;
  direction: "higher" | "lower";
  format: string;
  provenance: string;
  sourceNote: string;
  note: string;
  /** True where the target has not been agreed by its owner. */
  proposed: boolean;
  aggregationLabel: string;
  month: MetricValue;
  yearToDate: MetricValue;
  /** January through the reporting month, for the sparkline. A month with no
   *  figure has no `value` and is drawn as a gap, never interpolated. */
  trend: { period: string; value?: number; status: MetricStatus }[];
}

export interface DashboardSnapshot {
  period: string;
  periodLabel: string;
  metrics: DashboardMetric[];
  onTarget: number;
  totalMetrics: number;
  noData: number;
  monthsInYearToDate: number;
}

export const metricsApi = {
  dashboard: (period?: string) =>
    api.get<DashboardSnapshot>(
      `/api/metrics/dashboard${period ? `?period=${encodeURIComponent(period)}` : ""}`,
    ),
  listReturns: () => api.get<{ returns: MonthlyReturn[] }>("/api/metrics/returns"),
  getReturn: (period: string) =>
    api.get<{ period: string; return: MonthlyReturn | null; referralLeaveDays?: number }>(
      `/api/metrics/returns/${encodeURIComponent(period)}`,
    ),
  saveReturn: (
    period: string,
    input: {
      healthRelatedLostDays: number;
      headcount: number;
      surveillanceScheduled: number;
      surveillanceCompleted: number;
      healthSourceNote: string;
      fatalities: number | null;
      totalRecordableIncidents: number | null;
      totalRecordableInjuries: number | null;
      reportableNearMisses: number | null;
      safetySourceNote: string;
      reason: string;
    },
  ) => api.put<MonthlyReturn>(`/api/metrics/returns/${encodeURIComponent(period)}`, input),
  revisions: (period: string) =>
    api.get<{ revisions: ReturnRevision[] }>(
      `/api/metrics/returns/${encodeURIComponent(period)}/revisions`,
    ),
};
