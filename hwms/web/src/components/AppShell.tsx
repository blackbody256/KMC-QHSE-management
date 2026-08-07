import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "./Icon";
import { navigationFor, routeFor, isReadOnly } from "../lib/navigation";
import { primaryRole, roleLabels, useSession } from "../lib/session";

/**
 * The application shell.
 *
 * The current role is displayed permanently in the masthead rather than buried
 * in a menu. In a system whose central design decision is role separation, a
 * user must always be able to see which role they are acting in.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useSession();
  const role = primaryRole(user);
  const groups = navigationFor(role);
  const location = useLocation();
  const current = routeFor(location.pathname);
  const readOnly = current ? isReadOnly(current, role) : false;

  return (
    <div className="min-h-screen">
      <header
        className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-6 text-ink-inverse"
        style={{ height: "var(--masthead-height)", background: "var(--kmc-red)" }}
      >
        <div className="flex items-center gap-3">
          <img src="/kmc-logo-mask.png" alt="" aria-hidden="true" className="h-7 w-auto brightness-0 invert" />
          <span className="text-sm font-semibold tracking-tight">
            QHSE Management System
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right leading-tight">
            <div className="text-sm font-semibold">{user?.name}</div>
            <div className="text-xs opacity-90">{role ? roleLabels[role] : "No role assigned"}</div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-2 rounded border border-white/40 px-3 py-1.5 text-sm font-medium hover:bg-white/10"
          >
            <Icon name="logout" size={16} />
            Sign out
          </button>
        </div>
      </header>

      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 overflow-y-auto border-r border-rule bg-surface px-3 py-4"
        style={{ top: "var(--masthead-height)", width: "var(--rail-width)" }}
      >
        {groups.map((group) => (
          <div key={group.label ?? "overview"} className="mb-6">
            {group.label ? (
              <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {group.label}
              </div>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-3 rounded px-3 py-2 text-sm",
                        isActive
                          ? "font-semibold text-ink-inverse"
                          : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                      ].join(" ")
                    }
                    style={({ isActive }) =>
                      // The third and last place KMC red is permitted.
                      isActive ? { background: "var(--kmc-red)" } : undefined
                    }
                  >
                    <Icon name={item.icon} size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <main
        style={{ marginTop: "var(--masthead-height)", marginLeft: "var(--rail-width)" }}
        className="min-h-[calc(100vh-var(--masthead-height))] px-8 py-6"
      >
        {readOnly ? (
          <div
            className="mx-auto mb-6 flex max-w-content items-center gap-3 rounded border px-4 py-3 text-sm"
            style={{ borderColor: "var(--rule)", background: "var(--neutral-wash)", color: "var(--ink-muted)" }}
          >
            <Icon name="visibility" size={18} />
            <span>
              You are viewing this page. The {role ? roleLabels[role] : "current"} role does not enter or
              approve records here.
            </span>
          </div>
        ) : null}
        <div className="mx-auto max-w-content">{children}</div>
      </main>
    </div>
  );
}
