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
  ErgonomicAssessment,
  IndustrialHygieneReading,
  LabTestRequest,
  LabTestResult,
  MedicalReferral,
  MonthlyReturn,
  Patient,
  PatientVisit,
} from "../types";

const STORAGE_KEY = "kmc-health-wellness-demo-v3";

interface DemoStoreValue {
  state: DemoState;
  currentUser: DemoUser | null;
  login: (identifier: string, password: string) => string | null;
  logout: () => void;
  reset: () => void;
  addPatient: (patient: Patient) => void;
  upsertVisit: (visit: PatientVisit) => void;
  upsertMonthlyReturn: (entry: MonthlyReturn) => void;
  addIndustrialHygieneReading: (entry: IndustrialHygieneReading) => void;
  addErgonomicAssessment: (entry: ErgonomicAssessment) => void;
  upsertLabRequest: (entry: LabTestRequest) => void;
  addLabResult: (entry: LabTestResult) => void;
  upsertReferral: (entry: MedicalReferral) => void;
}

const DemoStoreContext = createContext<DemoStoreValue | null>(null);

const readInitialState = (): DemoState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as DemoState;
    return parsed.version === 3 ? parsed : createSeedState();
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

  const addIndustrialHygieneReading = useCallback(
    (entry: IndustrialHygieneReading) => {
      if (!canEdit) return;
      setState((current) => ({
        ...current,
        industrialHygieneReadings: [entry, ...current.industrialHygieneReadings],
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

  const upsertLabRequest = useCallback(
    (entry: LabTestRequest) => {
      if (!canEdit) return;
      setState((current) => ({
        ...current,
        labRequests: [
          entry,
          ...current.labRequests.filter((request) => request.id !== entry.id),
        ],
      }));
    },
    [canEdit],
  );

  const addLabResult = useCallback(
    (entry: LabTestResult) => {
      if (!canEdit) return;
      setState((current) => ({
        ...current,
        labResults: [entry, ...current.labResults],
      }));
    },
    [canEdit],
  );

  const upsertReferral = useCallback(
    (entry: MedicalReferral) => {
      if (!canEdit) return;
      setState((current) => ({
        ...current,
        referrals: [entry, ...current.referrals.filter((referral) => referral.id !== entry.id)],
      }));
    },
    [canEdit],
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
      addIndustrialHygieneReading,
      addErgonomicAssessment,
      upsertLabRequest,
      addLabResult,
      upsertReferral,
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
      addIndustrialHygieneReading,
      addErgonomicAssessment,
      upsertLabRequest,
      addLabResult,
      upsertReferral,
    ],
  );

  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}

export const useDemoStore = () => {
  const value = useContext(DemoStoreContext);
  if (!value) throw new Error("useDemoStore must be used inside DemoStoreProvider");
  return value;
};
