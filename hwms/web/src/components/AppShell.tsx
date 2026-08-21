import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "./Icon";
import { navigationFor, routeFor, isReadOnly } from "../lib/navigation";
import { primaryRole, roleLabels, useSession } from "../lib/session";

/**
 * The application shell.
 *
 * The masthead is two bands. The white brand band carries the KMC lockup in its
 * actual colours; the red action bar beneath it carries the system title, the
 * signed-in role and sign out. Splitting them is what lets the mark appear at
 * full colour. Reversed out of the red it was a silhouette, which is the one
 * form of a logo that carries no brand.
 *
 * The current role is displayed permanently rather than buried in a menu. In a
 * system whose central design decision is role separation, a user must always
 * be able to see which role they are acting in.
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
      <header className="fixed inset-x-0 top-0 z-20">
        {/* Brand band. The lockup on white, as the mark was drawn. */}
        <div
          className="flex items-center justify-between border-b px-6"
          style={{
            height: "var(--brand-band-height)",
            background: "var(--surface)",
            borderColor: "var(--rule)",
          }}
        >
          <img
            src="/kmc-logo-rgb.png"
            alt="Kiira Motors Corporation"
            className="w-auto"
            style={{ height: "calc(var(--brand-band-height) - 16px)" }}
          />
          <span className="text-xs uppercase tracking-[0.08em] text-ink-faint">
            Department of Quality, Health, Safety and Environment
          </span>
        </div>

        {/* Action bar. The first of the three places KMC red is permitted. */}
        <div
          className="flex items-center justify-between px-6 text-ink-inverse"
          style={{ height: "var(--action-bar-height)", background: "var(--kmc-red)" }}
        >
          <span className="text-sm font-semibold tracking-tight">QHSE Management System</span>

          <div className="flex items-center gap-4">
            <div className="text-right leading-tight">
              <div className="text-sm font-semibold">{user?.name}</div>
              <div className="text-xs opacity-90">
                {role ? roleLabels[role] : "No role assigned"}
              </div>
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
        </div>
      </header>

      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 flex flex-col overflow-y-auto border-r border-rule bg-surface px-3 py-4"
        style={{ top: "var(--masthead-height)", width: "var(--rail-width)" }}
      >
        <div className="flex-1">
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
        </div>

        {/* Footer sign-off. Muted, so it reads as the foot of the page rather
            than competing with the brand band at the top. */}
        <div className="mt-6 border-t border-rule px-3 pt-4">
          <img
            src="/kmc-logo-rgb.png"
            alt=""
            aria-hidden="true"
            className="h-5 w-auto opacity-45 grayscale"
          />
          <p className="mt-2 text-xs leading-relaxed text-ink-faint">
            Health and Wellness division
            <br />
            Occupational health
          </p>
        </div>
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
