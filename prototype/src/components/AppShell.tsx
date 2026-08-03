import {
  Activity,
  ClipboardCheck,
  Factory,
  FileHeart,
  Gauge,
  HeartPulse,
  Leaf,
  LogOut,
  RefreshCcw,
  ShieldCheck,
  ShieldPlus,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { roleDescription } from "../lib/access";
import { AppLink, useAppRouter } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";

const healthItems = [
  { to: "/patients", label: "Patients", icon: Users, officerOnly: true },
  { to: "/patient-visits", label: "Patient visits", icon: FileHeart, officerOnly: true },
  { to: "/ergonomics-wellness", label: "Ergonomics & wellness", icon: Activity },
  { to: "/industrial-hygiene", label: "Industrial hygiene", icon: Factory },
];

const unitItems = [
  { to: "/workplace-safety", label: "Workplace safety", icon: ShieldPlus },
  { to: "/environment-sustainability", label: "Environment & sustainability", icon: Leaf },
  { to: "/quality-inspection-testing", label: "Quality inspection & testing", icon: ClipboardCheck },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { state, currentUser, logout, reset } = useDemoStore();
  const { navigate } = useAppRouter();
  const isDirector = state.role === "director";
  const isOfficer = state.role === "health-wellness-officer";

  const handleReset = () => {
    if (window.confirm("Reset browser-local edits and restore the v0.3 synthetic data?")) {
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
          <span>QHSE Management System</span>
        </div>
        <nav aria-label="Primary">
          <div className="nav-label">Overview</div>
          <NavItem to="/" label="Dashboard" icon={Gauge} />
          {!isDirector && (
            <NavItem to="/monthly-returns" label="Monthly returns" icon={ClipboardCheck} />
          )}

          {!isDirector && (
            <>
              <div className="nav-label">Health and Wellness</div>
              {healthItems
                .filter((item) => !item.officerOnly || isOfficer)
                .map((item) => (
                  <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} />
                ))}

              <div className="nav-label">QHSE units</div>
              {unitItems.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </>
          )}
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <strong>{roleDescription(state.role)}</strong>
            <span>
              {isOfficer
                ? "Clinical detail stays inside Health and Wellness."
                : isDirector
                  ? "Executive summaries only; no unit or entry screens."
                  : "Unit drilldowns are aggregate and suppress small groups."}
            </span>
          </div>
        </div>
      </aside>

      <div className="app-body">
        <header className="topbar">
          <div className="topbar-product">
            <HeartPulse size={22} aria-hidden="true" />
            <span>QHSE Management System</span>
            <span className="prototype-tag">Prototype v0.3</span>
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
          <strong>Workflow demonstration</strong>
          <span>Synthetic browser-local data · Demo login is not production security</span>
        </div>
        <main className="main-content">{children}</main>
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
  icon: LucideIcon;
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
