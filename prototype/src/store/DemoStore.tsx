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
import type {
  DemoState,
  DemoUser,
  EnvironmentalReading,
  ErgonomicAssessment,
  MonthlyReturn,
  Patient,
  PatientVisit,
} from "../types";

const STORAGE_KEY = "kmc-hwms-demo-v1";

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
}

const DemoStoreContext = createContext<DemoStoreValue | null>(null);

const readInitialState = (): DemoState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as DemoState;
    return parsed.version === 1 ? parsed : createSeedState();
  } catch {
    return createSeedState();
  }
};

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(readInitialState);
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const login = useCallback((identifier: string, password: string) => {
    const user = authenticateDemoAccount(identifier, password);
    if (!user) {
      return "The email or password does not match a demonstration account.";
    }
    setCurrentUser(user);
    setState((current) => ({ ...current, role: user.role }));
    return null;
  }, []);
  const logout = useCallback(() => setCurrentUser(null), []);
  const reset = useCallback(
    () =>
      setState({
        ...createSeedState(),
        role: currentUser?.role ?? "management",
      }),
    [currentUser],
  );
  const addPatient = useCallback(
    (patient: Patient) =>
      setState((current) => ({ ...current, patients: [patient, ...current.patients] })),
    [],
  );
  const upsertVisit = useCallback(
    (visit: PatientVisit) =>
      setState((current) => ({
        ...current,
        visits: [visit, ...current.visits.filter((item) => item.id !== visit.id)],
      })),
    [],
  );
  const upsertMonthlyReturn = useCallback(
    (entry: MonthlyReturn) =>
      setState((current) => ({
        ...current,
        monthlyReturns: [
          ...current.monthlyReturns.filter((item) => item.period !== entry.period),
          entry,
        ],
      })),
    [],
  );
  const addEnvironmentalReading = useCallback(
    (entry: EnvironmentalReading) =>
      setState((current) => ({
        ...current,
        environmentalReadings: [entry, ...current.environmentalReadings],
      })),
    [],
  );
  const addErgonomicAssessment = useCallback(
    (entry: ErgonomicAssessment) =>
      setState((current) => ({
        ...current,
        ergonomicAssessments: [entry, ...current.ergonomicAssessments],
      })),
    [],
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
    ],
  );

  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}

export const useDemoStore = () => {
  const value = useContext(DemoStoreContext);
  if (!value) throw new Error("useDemoStore must be used within DemoStoreProvider");
  return value;
};
