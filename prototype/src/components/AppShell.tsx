import {
  Activity,
  BarChart3,
  ClipboardCheck,
  FileHeart,
  Gauge,
  HeartPulse,
  Leaf,
  LogOut,
  RefreshCcw,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { AppLink, useAppRouter } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";

const generalItems = [
  { to: "/", label: "Dashboard", icon: Gauge },
  { to: "/monthly-returns", label: "Monthly returns", icon: ClipboardCheck },
  { to: "/environment", label: "Environment", icon: Leaf },
  { to: "/ergonomics", label: "Ergonomics", icon: Activity },
  { to: "/licences", label: "Medical certifications", icon: ShieldCheck },
];

const clinicalItems = [
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/patient-visits", label: "Patient visits", icon: FileHeart },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { state, currentUser, logout, reset } = useDemoStore();
  const { navigate } = useAppRouter();

  const handleReset = () => {
    if (window.confirm("Reset all browser-local edits and restore the synthetic demonstration data?")) {
      reset();
      navigate("/");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/", true);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup" aria-label="Kiira Motors Corporation">
          <div className="brand-logo-image" aria-hidden="true" />
          <span>Health & Wellness</span>
        </div>
        <nav aria-label="Primary">
          <div className="nav-label">Overview</div>
          {generalItems.slice(0, 1).map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
          {state.role === "doctor" && (
            <>
              <div className="nav-label">Infirmary</div>
              {clinicalItems.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </>
          )}
          <div className="nav-label">Operations</div>
          {generalItems.slice(1).map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="sidebar-note">
          <Stethoscope size={18} aria-hidden="true" />
          <div>
            <strong>Privacy preview</strong>
            <span>Management never sees individual clinical records.</span>
          </div>
        </div>
      </aside>

      <div className="app-body">
        <header className="topbar">
          <div className="topbar-product">
            <HeartPulse size={22} aria-hidden="true" />
            <span>Health & Wellness Management System</span>
            <span className="prototype-tag">Prototype v0.2</span>
          </div>
          <div className="topbar-actions">
            <div className="signed-in-user">
              <span className="avatar">
                <UserRound size={16} aria-hidden="true" />
              </span>
              <span>
                <strong>{currentUser?.name}</strong>
                <small>{currentUser?.title}</small>
              </span>
            </div>
            <button className="icon-button" type="button" onClick={handleReset}>
              <RefreshCcw size={16} aria-hidden="true" />
              Reset demo
            </button>
            <button className="icon-button" type="button" onClick={handleLogout}>
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </header>
        <div className="demo-banner">
          <ShieldCheck size={17} aria-hidden="true" />
          <strong>Demo mode</strong>
          <span>Synthetic data only · Browser-local storage · Not for clinical use</span>
        </div>
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: typeof BarChart3;
}) {
  const { path } = useAppRouter();
  const active = to === "/" ? path === "/" : path.startsWith(to);
  return (
    <AppLink to={to} className={active ? "active" : undefined}>
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      <span>{label}</span>
    </AppLink>
  );
}
