import { useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icon";

/**
 * Sign-in.
 *
 * This page collects no credentials. It hands the browser to Keycloak, which
 * owns password policy, lockout, multi-factor and — later — the corporate
 * single sign-on. The application never sees a password, which is both safer
 * and the reason moving to corporate SSO later is a configuration change
 * rather than a release.
 */
const errorMessages: Record<string, string> = {
  denied: "Sign-in was cancelled. Select sign in to try again.",
  state: "The sign-in attempt expired before it completed. Select sign in to start again.",
  exchange: "Sign-in could not be completed. Select sign in to try again, and tell ICT if it recurs.",
  no_id_token: "The sign-in service returned an incomplete response. Tell ICT with the time this happened.",
  invalid_token: "The sign-in service returned a response this system could not verify. Tell ICT with the time this happened.",
  no_role: "This account has no role assigned, so there is nothing it can open. Ask the manager to assign a role.",
};

export function LoginPage() {
  const [params] = useSearchParams();
  const errorKey = params.get("error");
  const message = errorKey ? (errorMessages[errorKey] ?? errorMessages.exchange) : null;

  return (
    <div className="grid min-h-screen lg:grid-cols-[45fr_55fr]">
      {/* Imagery panel. The background colour beneath is not a placeholder to
          be removed — it is the fallback that keeps this screen composed when
          the photograph is absent or still loading. */}
      <div
        className="relative hidden lg:block"
        style={{
          background: "linear-gradient(160deg, var(--kmc-red-ink) 0%, var(--ink) 100%)",
          backgroundImage:
            "linear-gradient(160deg, rgba(109,0,20,0.72) 0%, rgba(22,24,29,0.88) 100%), url('/images/login-panel.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex h-full flex-col justify-between p-12 text-ink-inverse">
          <img
            src="/kmc-logo-mask.png"
            alt="Kiira Motors Corporation"
            className="h-10 w-auto brightness-0 invert"
          />

          <div className="max-w-md">
            <h1 className="text-2xl font-semibold leading-tight">
              Quality, health, safety and environment
            </h1>
            <p className="mt-4 text-sm leading-relaxed opacity-90">
              Operational records are captured once, where the work happens. Every figure reported to
              management is derived from those records and states where it came from.
            </p>
          </div>

          <div className="text-xs opacity-75">
            Kiira Motors Corporation · Kiira Vehicle Plant
          </div>
        </div>
      </div>

      {/* Sign-in panel */}
      <div className="flex items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-sm">
          <img src="/kmc-logo-rgb.png" alt="Kiira Motors Corporation" className="mb-8 h-10 w-auto lg:hidden" />

          <h2 className="text-xl">Sign in</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Use your Kiira Motors account. You will be taken to the corporate sign-in page and
            returned here.
          </p>

          {message ? (
            <div
              className="mt-6 flex items-start gap-3 rounded border px-4 py-3 text-sm"
              style={{
                borderColor: "var(--breach)",
                background: "var(--breach-wash)",
                color: "var(--breach)",
              }}
              role="alert"
            >
              <Icon name="error" size={18} className="mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          ) : null}

          <a href="/auth/login" className="button-primary mt-8 w-full">
            <Icon name="login" size={18} />
            Sign in
          </a>

          <div className="mt-8 border-t border-rule pt-6 text-xs leading-relaxed text-ink-muted">
            <p>
              Accounts are created by the Health and Wellness manager. If you cannot sign in, or your
              account opens nothing, ask the manager rather than ICT — role assignment is theirs.
            </p>
            <p className="mt-3">
              Individual clinical records are accessible to the Health and Wellness Officer only. No
              other role can retrieve them, and every retrieval is logged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
