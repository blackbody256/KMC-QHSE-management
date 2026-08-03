import { AppShell } from "./components/AppShell";
import { useDemoStore } from "./store/DemoStore";
import { useAppRouter } from "./lib/router";
import { DashboardPage } from "./pages/DashboardPage";
import { PatientsPage } from "./pages/PatientsPage";
import { NewPatientPage } from "./pages/NewPatientPage";
import { PatientVisitsPage } from "./pages/PatientVisitsPage";
import { NewVisitPage } from "./pages/NewVisitPage";
import { MonthlyReturnsPage } from "./pages/MonthlyReturnsPage";
import { EnvironmentPage } from "./pages/EnvironmentPage";
import { ErgonomicsPage } from "./pages/ErgonomicsPage";
import { LicencesPage } from "./pages/LicencesPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginPage } from "./pages/LoginPage";
import { VisitDetailPage } from "./pages/VisitDetailPage";

export default function App() {
  const { state, currentUser } = useDemoStore();
  const { path } = useAppRouter();

  if (!currentUser) {
    return <LoginPage />;
  }

  const clinicalPath = path.startsWith("/patients") || path.startsWith("/patient-visits");
  const effectivePath = state.role === "management" && clinicalPath ? "/" : path;

  let page: React.ReactNode;
  switch (effectivePath) {
    case "/":
      page = <DashboardPage />;
      break;
    case "/patients":
      page = <PatientsPage />;
      break;
    case "/patients/new":
      page = <NewPatientPage />;
      break;
    case "/patient-visits":
      page = <PatientVisitsPage />;
      break;
    case "/patient-visits/new":
      page = <NewVisitPage />;
      break;
    case "/patient-visits/details":
      page = <VisitDetailPage />;
      break;
    case "/monthly-returns":
      page = <MonthlyReturnsPage />;
      break;
    case "/environment":
      page = <EnvironmentPage />;
      break;
    case "/ergonomics":
      page = <ErgonomicsPage />;
      break;
    case "/licences":
      page = <LicencesPage />;
      break;
    default:
      page = <NotFoundPage />;
  }

  return (
    <AppShell>
      {page}
    </AppShell>
  );
}
