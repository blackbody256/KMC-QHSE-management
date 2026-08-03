import type {
  DemoPlan,
  DemoState,
  EnvironmentalParameter,
  EnvironmentalReading,
  ErgonomicAssessment,
  MonthlyReturn,
  Patient,
  PatientVisit,
} from "../types";

const uid = (prefix: string, index: number) => `${prefix}-${String(index).padStart(3, "0")}`;

const returnRows: Array<[string, number, number, number, number]> = [
  ["2025-08", 214, 493, 36, 33],
  ["2025-09", 188, 496, 38, 35],
  ["2025-10", 231, 497, 41, 36],
  ["2025-11", 176, 499, 35, 34],
  ["2025-12", 245, 500, 32, 29],
  ["2026-01", 221, 501, 42, 38],
  ["2026-02", 206, 502, 39, 37],
  ["2026-03", 194, 503, 43, 40],
  ["2026-04", 187, 503, 40, 39],
  ["2026-05", 219, 504, 44, 41],
  ["2026-06", 204, 505, 41, 39],
  ["2026-07", 198, 505, 40, 37],
];

const monthlyReturns: MonthlyReturn[] = returnRows.map(
  ([period, lostDays, headcount, scheduled, completed], index) => ({
    id: uid("return", index + 1),
    period,
    lostDays,
    headcount,
    surveillanceScheduled: scheduled,
    surveillanceCompleted: completed,
    sourceNote: "Illustrative HR portal monthly extract",
    enteredBy: "Sarah N. · Division data owner",
    enteredAt: `${period}-28T14:30:00+03:00`,
  }),
);

const patients: Patient[] = [
  {
    id: "patient-001",
    fullName: "Amina N.",
    age: 29,
    sex: "Female",
    phone: "0700 000 101",
    category: "Employee",
    employeeNumber: "KMC-0148",
    department: "Production",
    division: "Vehicle Assembly",
    unit: "Trim line",
    jobTitle: "Assembly technician",
    createdAt: "2026-07-03T08:20:00+03:00",
  },
  {
    id: "patient-002",
    fullName: "Daniel O.",
    age: 23,
    sex: "Male",
    phone: "0700 000 202",
    category: "Intern",
    department: "Technology",
    division: "Digital systems",
    unit: "Software",
    jobTitle: "Engineering intern",
    createdAt: "2026-07-18T10:10:00+03:00",
  },
  {
    id: "patient-003",
    fullName: "Grace K.",
    age: 35,
    sex: "Female",
    category: "Employee",
    employeeNumber: "KMC-0276",
    department: "Finance",
    division: "Corporate services",
    unit: "Accounts",
    jobTitle: "Accounts officer",
    createdAt: "2026-07-22T11:40:00+03:00",
  },
];

const visits: PatientVisit[] = [
  {
    id: "visit-001",
    patientId: "patient-001",
    visitDate: "2026-07-23",
    timeIn: "09:14",
    visitType: "Walk-in",
    state: "signed",
    workRelated: "No",
    sections: {
      complaint: { status: "complete", notes: "Headache and nasal congestion." },
      history: { status: "partial", notes: "Gradual onset this morning." },
      medical: { status: "complete", notes: "No relevant condition recorded." },
      surgical: { status: "not-indicated", notes: "Not clinically indicated for this visit." },
      medication: { status: "partial", notes: "No current medication reported." },
      occupational: { status: "not-indicated", notes: "Not clinically indicated for this visit." },
      examination: { status: "partial", notes: "Stable, no additional findings." },
      investigations: { status: "not-indicated", notes: "No investigation clinically indicated." },
      impression: { status: "complete", notes: "Upper respiratory symptoms." },
      treatment: { status: "complete", notes: "Supportive treatment recorded by clinician." },
    },
    vitals: {},
    clinician: "Dr. Miriam K.",
    signedAt: "2026-07-23T09:31:00+03:00",
    createdAt: "2026-07-23T09:14:00+03:00",
  },
];

const parameters: Array<{
  parameter: EnvironmentalParameter;
  limit: number;
  unit: "µg/m³" | "dB(A)";
  averagingPeriod: string;
}> = [
  { parameter: "PM2.5", limit: 35, unit: "µg/m³", averagingPeriod: "24-hour" },
  { parameter: "PM10", limit: 60, unit: "µg/m³", averagingPeriod: "24-hour" },
  { parameter: "Noise · day", limit: 75, unit: "dB(A)", averagingPeriod: "Day period" },
  { parameter: "Noise · night", limit: 70, unit: "dB(A)", averagingPeriod: "Night period" },
];

const readingValues = [31.4, 68.2, 72, 66, 28, 51, 34, 58, 30, 56, 36.2, 62, 29, 54, 71, 67, 32, 57, 33, 59, 73, 68];

const environmentalReadings: EnvironmentalReading[] = readingValues.map((value, index) => {
  const definition = parameters[index % parameters.length];
  const event = Math.floor(index / 2) + 1;
  return {
    id: uid("reading", index + 1),
    eventId: uid("monitor", event),
    period: "2026-07",
    recordedAt: `2026-07-${String(2 + event * 2).padStart(2, "0")}T${index % 4 === 3 ? "22:20" : "10:15"}:00+03:00`,
    location: event % 3 === 0 ? "Paint shop perimeter" : event % 2 === 0 ? "Assembly hall" : "Administration block",
    instrument: definition.parameter.startsWith("Noise") ? "Sound meter · SM-02" : "Particulate meter · PM-01",
    parameter: definition.parameter,
    value,
    limit: definition.limit,
    unit: definition.unit,
    averagingPeriod: definition.averagingPeriod,
    standardFamily: "Illustrative NEMA reference · approval pending",
  };
});

const outcomes = [
  "Compliant",
  "Partially compliant",
  "Compliant",
  "Compliant",
  "Non-compliant",
  "Partially compliant",
  "Compliant",
  "Partially compliant",
  "Compliant",
] as const;

const ergonomicAssessments: ErgonomicAssessment[] = outcomes.map((outcome, index) => {
  const actionIndex = index < 6 ? index + 1 : null;
  const dueDate = actionIndex ? `2026-07-${String(10 + actionIndex * 3).padStart(2, "0")}` : "";
  const closed = actionIndex !== null && actionIndex <= 5;
  return {
    id: uid("erg", index + 1),
    period: "2026-07",
    assessedAt: `2026-07-${String(2 + index * 3).padStart(2, "0")}T11:00:00+03:00`,
    workstation: index < 4 ? `Office workstation A${index + 1}` : `Assembly station T${index - 3}`,
    workType: index < 4 ? "Office" : "Industrial",
    assessor: "OHS Officer",
    outcome,
    findings:
      outcome === "Compliant"
        ? "Workstation arrangement supports the observed task."
        : outcome === "Partially compliant"
          ? "Adjustment to seat or working height is recommended."
          : "Observed posture and reach distance require corrective action.",
    action: actionIndex
      ? {
          id: uid("action", actionIndex),
          description: actionIndex % 2 === 0 ? "Adjust work surface height" : "Provide suitable adjustable chair",
          owner: "Facilities",
          dueDate,
          status: closed ? "Closed" : "Open",
          closedAt: closed ? dueDate : undefined,
        }
      : undefined,
  };
});

const plans: DemoPlan[] = monthlyReturns.map((entry) => ({
  period: entry.period,
  environmentalEventsPlanned: entry.period === "2026-07" ? 12 : 10,
  ergonomicAssessmentsPlanned: entry.period === "2026-07" ? 9 : 8,
  confirmedOccupationalDiseases: entry.period === "2026-07" ? 1 : 0,
}));

export const createSeedState = (): DemoState => ({
  version: 1,
  role: "management",
  patients,
  visits,
  monthlyReturns,
  environmentalReadings,
  ergonomicAssessments,
  licences: [
    {
      id: "licence-001",
      type: "Infirmary",
      holder: "KVP Infirmary",
      credential: "Facility operating authorisation · illustrative",
      issueDate: "2026-01-01",
      expiryDate: "2026-12-31",
      authority: "Issuing authority to be confirmed",
    },
    {
      id: "licence-002",
      type: "Practitioner",
      holder: "Dr. Miriam K.",
      credential: "Professional practising registration · illustrative",
      issueDate: "2026-01-01",
      expiryDate: "2026-08-21",
      authority: "Issuing authority to be confirmed",
    },
    {
      id: "licence-003",
      type: "Practitioner",
      holder: "Dr. Peter A.",
      credential: "Professional practising registration · illustrative",
      issueDate: "2026-02-01",
      expiryDate: "2027-01-31",
      authority: "Issuing authority to be confirmed",
    },
  ],
  plans,
});
