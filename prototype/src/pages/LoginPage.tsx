import {
  ArrowRight,
  BarChart3,
  BriefcaseMedical,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Building2,
  UserRound,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { demoAccounts } from "../data/accounts";
import { useDemoStore } from "../store/DemoStore";

export function LoginPage() {
  const { login } = useDemoStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const selectAccount = (index: number) => {
    const account = demoAccounts[index];
    setIdentifier(account.identifier);
    setPassword(account.password);
    setError("");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const message = login(identifier, password);
    setError(message ?? "");
  };

  return (
    <main className="login-screen">
      <section className="login-introduction">
        <div className="login-brand" aria-label="Kiira Motors Corporation">
          <div className="brand-logo-image" aria-hidden="true" />
          <span>Health & Wellness Dashboard · proposed name</span>
        </div>
        <div className="login-copy">
          <span className="login-kicker">Stakeholder workflow prototype</span>
          <h1>Sign in to the workspace for your role</h1>
          <p>
            The system shows only the information and tasks permitted for the signed-in user.
            Choose a demonstration account below, then sign in.
          </p>
        </div>
        <div className="login-permission-note">
          <ShieldCheck size={22} aria-hidden="true" />
          <div>
            <strong>Patient privacy is demonstrated by role</strong>
            <span>Viewer accounts cannot open patient names, visits, laboratory results, or clinical referrals.</span>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-form-heading">
          <span className="login-icon">
            <LockKeyhole size={20} aria-hidden="true" />
          </span>
          <div>
            <h2>Sign in</h2>
            <p>Use one of the synthetic accounts provided for this demonstration.</p>
          </div>
        </div>

        <div className="demo-account-options" aria-label="Demonstration accounts">
          {demoAccounts.map((account, index) => (
            <button
              className="demo-account-card"
              type="button"
              key={account.id}
              onClick={() => selectAccount(index)}
            >
              <span className="demo-account-icon">
                {account.role === "health-wellness-officer" ? (
                  <BriefcaseMedical size={19} aria-hidden="true" />
                ) : account.role === "director" ? (
                  <Building2 size={19} aria-hidden="true" />
                ) : (
                  <BarChart3 size={19} aria-hidden="true" />
                )}
              </span>
              <span>
                <strong>{account.title}</strong>
                <small>{account.description}</small>
                <code>{account.identifier}</code>
              </span>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="login-form">
          {error && <div className="form-error login-error">{error}</div>}
          <label className="field">
            <span>Email address</span>
            <div className="login-input">
              <UserRound size={17} aria-hidden="true" />
              <input
                type="email"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="name@kmc.demo"
                autoComplete="username"
                required
              />
            </div>
          </label>
          <label className="field">
            <span>Password</span>
            <div className="login-input">
              <LockKeyhole size={17} aria-hidden="true" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff size={17} aria-hidden="true" />
                ) : (
                  <Eye size={17} aria-hidden="true" />
                )}
              </button>
            </div>
          </label>
          <button className="button button-primary login-submit" type="submit">
            Sign in to Health & Wellness
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </form>

        <p className="login-disclaimer">
          Synthetic data only. This login demonstrates the workflow and is not production
          authentication.
        </p>
      </section>
    </main>
  );
}
