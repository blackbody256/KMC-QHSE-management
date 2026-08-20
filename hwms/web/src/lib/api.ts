/**
 * Calls to the API go through the gateway on the same origin. The browser
 * holds no token — it holds an opaque HttpOnly session cookie, and the gateway
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

// --- Laboratory — KMC.DQHSE.05/26-FM008 -----------------------------------

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
}

export interface RecordSummary {
  visitCount: number;
  firstVisit?: string;
  lastVisit?: string;
  workRelatedCount: number;
  draftVisits: number;
  awaitingResults: number;
}

export interface PatientRecord {
  patient: Patient;
  summary: RecordSummary;
  timeline: TimelineEntry[];
  unlinked: LabRequisition[];
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
