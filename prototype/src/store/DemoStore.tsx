import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authenticateDemoAccount } from "../data/accounts";
import { createSeedState } from "../data/seed";
import { canAttestSafetyPeriod } from "../lib/calculations";
import type {
  DemoState,
  DemoUser,
  EnvironmentalReading,
  ErgonomicAssessment,
  MonthlyReturn,
  Patient,
  PatientVisit,
  SafetyIncident,
} from "../types";

const STORAGE_KEY = "kmc-qhse-demo-v2";

interface DemoStoreValue {
  state: DemoState;
  currentUser: DemoUser | null;
  login: (identifier: string, password: string) => string | null;
  logout: () => void;
  reset: () => void;
  addPatient: (patient: Patient) => void;
  upsertVisit: (visit: PatientVisit) => void;
  upsertMonthlyReturn: (entry: MonthlyReturn) => void;
  addEnvironmentalReading: (entry: EnvironmentalReading) => void;
  addErgonomicAssessment: (entry: ErgonomicAssessment) => void;
  upsertSafetyIncident: (entry: SafetyIncident) => void;
  attestSafetyPeriod: (period: string, note: string) => string | null;
}

const DemoStoreContext = createContext<DemoStoreValue | null>(null);

const readInitialState = (): DemoState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as DemoState;
    return parsed.version === 2 ? parsed : createSeedState();
  } catch {
    return createSeedState();
  }
};

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(readInitialState);
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const canEdit = currentUser?.role === "health-wellness-officer";

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const login = useCallback((identifier: string, password: string) => {
    const user = authenticateDemoAccount(identifier, password);
    if (!user) return "The email or password does not match a demonstration account.";
    setCurrentUser(user);
    setState((current) => ({ ...current, role: user.role }));
    return null;
  }, []);

  const logout = useCallback(() => setCurrentUser(null), []);
  const reset = useCallback(
    () =>
      setState({
        ...createSeedState(),
        role: currentUser?.role ?? "manager",
      }),
    [currentUser],
  );

  const addPatient = useCallback(
    (patient: Patient) => {
      if (!canEdit) return;
      setState((current) => ({ ...current, patients: [patient, ...current.patients] }));
    },
    [canEdit],
  );

  const upsertVisit = useCallback(
    (visit: PatientVisit) => {
      if (!canEdit) return;
      setState((current) => ({
        ...current,
        visits: [visit, ...current.visits.filter((item) => item.id !== visit.id)],
      }));
    },
    [canEdit],
  );

  const upsertMonthlyReturn = useCallback(
    (entry: MonthlyReturn) => {
      if (!canEdit) return;
      setState((current) => ({
        ...current,
        monthlyReturns: [
          ...current.monthlyReturns.filter((item) => item.period !== entry.period),
          entry,
        ],
      }));
    },
    [canEdit],
  );

  const addEnvironmentalReading = useCallback(
    (entry: EnvironmentalReading) => {
      if (!canEdit) return;
      setState((current) => ({
        ...current,
        environmentalReadings: [entry, ...current.environmentalReadings],
      }));
    },
    [canEdit],
  );

  const addErgonomicAssessment = useCallback(
    (entry: ErgonomicAssessment) => {
      if (!canEdit) return;
      setState((current) => ({
        ...current,
        ergonomicAssessments: [entry, ...current.ergonomicAssessments],
      }));
    },
    [canEdit],
  );

  const upsertSafetyIncident = useCallback(
    (entry: SafetyIncident) => {
      if (!canEdit) return;
      setState((current) => ({
        ...current,
        safetyIncidents: [
          entry,
          ...current.safetyIncidents.filter((incident) => incident.id !== entry.id),
        ],
      }));
    },
    [canEdit],
  );

  const attestSafetyPeriod = useCallback(
    (period: string, note: string) => {
      if (!canEdit || !currentUser) return "Only the Health and Wellness Officer can attest a period.";
      const check = canAttestSafetyPeriod(state, period);
      if (!check.allowed) return check.reason;
      setState((current) => ({
        ...current,
        safetyAttestations: [
          ...current.safetyAttestations.filter((entry) => entry.period !== period),
          {
            period,
            state: "attested",
            attestedBy: `${currentUser.name} · ${currentUser.title}`,
            attestedAt: new Date().toISOString(),
            note: note.trim() || "All known events for the period have been entered.",
          },
        ],
      }));
      return null;
    },
    [canEdit, currentUser, state],
  );

  const value = useMemo(
    () => ({
      state,
      currentUser,
      login,
      logout,
      reset,
      addPatient,
      upsertVisit,
      upsertMonthlyReturn,
      addEnvironmentalReading,
      addErgonomicAssessment,
      upsertSafetyIncident,
      attestSafetyPeriod,
    }),
    [
      state,
      currentUser,
      login,
      logout,
      reset,
      addPatient,
      upsertVisit,
      upsertMonthlyReturn,
      addEnvironmentalReading,
      addErgonomicAssessment,
      upsertSafetyIncident,
      attestSafetyPeriod,
    ],
  );

  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}

export const useDemoStore = () => {
  const value = useContext(DemoStoreContext);
  if (!value) throw new Error("useDemoStore must be used inside DemoStoreProvider");
  return value;
};
