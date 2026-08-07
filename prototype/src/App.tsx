import { AppShell } from "./components/AppShell";
import { useDemoStore } from "./store/DemoStore";
import { useAppRouter } from "./lib/router";
import { DashboardPage } from "./pages/DashboardPage";
import { PatientsPage } from "./pages/PatientsPage";
import { NewPatientPage } from "./pages/NewPatientPage";
import { PatientVisitsPage } from "./pages/PatientVisitsPage";
import { NewVisitPage } from "./pages/NewVisitPage";
import { MonthlyReturnsPage } from "./pages/MonthlyReturnsPage";
import { IndustrialHygienePage } from "./pages/IndustrialHygienePage";
import { ErgonomicsPage } from "./pages/ErgonomicsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginPage } from "./pages/LoginPage";
import { VisitDetailPage } from "./pages/VisitDetailPage";
import { AccessDeniedPage } from "./pages/AccessDeniedPage";
import { roleCanAccessPath } from "./lib/access";
import { LaboratoryPage } from "./pages/LaboratoryPage";
import { NewLabRequestPage } from "./pages/NewLabRequestPage";
import { LabRequestDetailPage } from "./pages/LabRequestDetailPage";
import { ReferralsPage } from "./pages/ReferralsPage";
import { NewReferralPage } from "./pages/NewReferralPage";
import { ReferralDetailPage } from "./pages/ReferralDetailPage";

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
      page = <IndustrialHygienePage />;
      break;
    case "/ergonomics-wellness":
      page = <ErgonomicsPage />;
      break;
    case "/laboratory":
      page = <LaboratoryPage />;
      break;
    case "/laboratory/new":
      page = <NewLabRequestPage />;
      break;
    case "/laboratory/details":
      page = <LabRequestDetailPage />;
      break;
    case "/referrals":
      page = <ReferralsPage />;
      break;
    case "/referrals/new":
      page = <NewReferralPage />;
      break;
    case "/referrals/details":
      page = <ReferralDetailPage />;
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
