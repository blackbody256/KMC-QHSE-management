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
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginPage } from "./pages/LoginPage";
import { VisitDetailPage } from "./pages/VisitDetailPage";
import { WorkplaceSafetyPage } from "./pages/WorkplaceSafetyPage";
import { NewSafetyIncidentPage } from "./pages/NewSafetyIncidentPage";
import { QualityResearchPage } from "./pages/QualityResearchPage";
import { AccessDeniedPage } from "./pages/AccessDeniedPage";
import { roleCanAccessPath } from "./lib/access";

export default function App() {
  const { state, currentUser } = useDemoStore();
  const { path } = useAppRouter();

  if (!currentUser) {
    return <LoginPage />;
  }

  const allowed = roleCanAccessPath(state.role, path);

  let page: React.ReactNode;
  if (!allowed) {
    page = <AccessDeniedPage />;
  } else switch (path) {
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
    case "/industrial-hygiene":
      page = <EnvironmentPage mode="industrial" />;
      break;
    case "/ergonomics-wellness":
      page = <ErgonomicsPage />;
      break;
    case "/workplace-safety":
      page = <WorkplaceSafetyPage />;
      break;
    case "/workplace-safety/incidents/new":
      page = <NewSafetyIncidentPage />;
      break;
    case "/environment-sustainability":
      page = <EnvironmentPage mode="environment" />;
      break;
    case "/quality-inspection-testing":
      page = <QualityResearchPage />;
      break;
    case "/access-denied":
      page = <AccessDeniedPage />;
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
