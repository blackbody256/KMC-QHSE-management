import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ModulePage } from "./pages/ModulePage";
import { AccountsPage } from "./pages/AccountsPage";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { allRoutes, canOpen, homePathFor } from "./lib/navigation";
import { primaryRole, useSession } from "./lib/session";

/**
 * The route table is generated from the navigation declaration, so that what
 * the rail offers and what the router permits cannot drift apart.
 *
 * Guarding here is a courtesy to the user, not a security boundary. Every
 * service checks the token again at its handler and once more in its service
 * layer; a determined caller bypassing this guard reaches a 403, not data.
 */
function elementFor(path: string) {
  switch (path) {
    case "/dashboard":
      return <DashboardPage />;
    case "/accounts":
      return <AccountsPage />;
    default:
      return <ModulePage />;
  }
}

function Protected({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">
        Checking your session…
      </div>
    );
  }
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export default function App() {
  const { status, user } = useSession();
  const role = primaryRole(user);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          status === "authenticated" ? <Navigate to={homePathFor(role)} replace /> : <LoginPage />
        }
      />

      <Route
        path="/*"
        element={
          <Protected>
            <AppShell>
              <Routes>
                <Route index element={<Navigate to={homePathFor(role)} replace />} />

                {allRoutes.map((item) => (
                  <Route
                    key={item.path}
                    path={item.path.replace(/^\//, "")}
                    element={
                      canOpen(item, role) ? elementFor(item.path) : <Navigate to="/forbidden" replace />
                    }
                  />
                ))}

                <Route path="forbidden" element={<ForbiddenPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </AppShell>
          </Protected>
        }
      />
    </Routes>
  );
}
