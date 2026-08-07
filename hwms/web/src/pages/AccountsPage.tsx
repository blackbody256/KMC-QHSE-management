import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { StatusIndicator } from "../components/StatusIndicator";
import { ApiError, identityApi, type AccountView, type RoleOption } from "../lib/api";
import { useSession } from "../lib/session";

/**
 * Account administration, held by the manager.
 *
 * The manager creates Health and Wellness Officer and Director accounts. The
 * manager cannot grant the manager role: account administration expands only
 * by a decision taken outside this screen, which limits what a single mistaken
 * or compromised manager session can do.
 *
 * Every creation, enabling and disabling is written to the audit log. The
 * manager can create the account that holds the only clinical role in the
 * system; the record of having done so is the control that makes that
 * acceptable.
 */
const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  role: "",
  temporaryPassword: "",
};

export function AccountsPage() {
  const { user } = useSession();
  const [accounts, setAccounts] = useState<AccountView[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [accountsBody, rolesBody] = await Promise.all([
        identityApi.listAccounts(),
        identityApi.listRoles(),
      ]);
      setAccounts(accountsBody.users);
      setRoles(rolesBody.roles);
      setForm((current) => ({ ...current, role: current.role || rolesBody.roles[0]?.value || "" }));
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Accounts could not be read. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setConfirmation(null);
    setSaving(true);
    try {
      const created = await identityApi.createAccount(form);
      setAccounts((current) => [created, ...current]);
      setConfirmation(
        `Account created for ${created.email}. Give them the temporary password directly — it is not sent by email, and they must change it when they first sign in.`,
      );
      setForm({ ...emptyForm, role: form.role });
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "The account could not be created. Try again shortly.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggle(account: AccountView) {
    setFormError(null);
    try {
      await identityApi.setEnabled(account.id, !account.enabled);
      setAccounts((current) =>
        current.map((a) => (a.id === account.id ? { ...a, enabled: !a.enabled } : a)),
      );
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "The account could not be updated. Try again shortly.",
      );
    }
  }

  return (
    <>
      <PageHeader
        title="Accounts"
        description="Create and disable Health and Wellness Officer and Director accounts. Every change here is recorded in the audit log against your name."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="panel">
          <div className="panel-head">
            <h2 className="text-lg">People with access</h2>
            <span className="text-sm text-ink-muted">
              <span className="data-value">{accounts.length}</span>{" "}
              {accounts.length === 1 ? "account" : "accounts"}
            </span>
          </div>

          {loading ? (
            <div className="panel-body text-sm text-ink-muted">Reading accounts…</div>
          ) : loadError ? (
            <div className="panel-body">
              <div
                className="flex items-start gap-3 rounded border px-4 py-3 text-sm"
                style={{ borderColor: "var(--breach)", background: "var(--breach-wash)", color: "var(--breach)" }}
                role="alert"
              >
                <Icon name="error" size={18} className="mt-0.5 shrink-0" />
                <span>{loadError}</span>
              </div>
              <button type="button" className="button-secondary mt-4" onClick={() => void load()}>
                Try again
              </button>
            </div>
          ) : accounts.length === 0 ? (
            <div className="panel-body text-sm text-ink-muted">
              No officer or director accounts yet. Create the first one using the form beside this
              list.
            </div>
          ) : (
            <div className="panel-body pt-0">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id}>
                      <td>
                        <div className="font-medium">{account.name || account.username}</div>
                        <div className="text-xs text-ink-muted">{account.email}</div>
                      </td>
                      <td>{account.roleLabel}</td>
                      <td>
                        <StatusIndicator
                          status={account.enabled ? "within" : "not-applicable"}
                          label={account.enabled ? "Active" : "Disabled"}
                        />
                      </td>
                      <td className="text-right">
                        {account.id === user?.id ? (
                          <span className="text-xs text-ink-faint">This is you</span>
                        ) : (
                          <button
                            type="button"
                            className="button-secondary"
                            onClick={() => void toggle(account)}
                          >
                            {account.enabled ? "Disable" : "Enable"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel self-start">
          <div className="panel-head">
            <h2 className="text-lg">Add an account</h2>
          </div>
          <form className="panel-body space-y-4" onSubmit={handleCreate}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="firstName">First name</label>
                <input
                  id="firstName"
                  className="field"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="lastName">Last name</label>
                <input
                  id="lastName"
                  className="field"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="field"
                placeholder="name@kiiramotors.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <p className="mt-1 text-xs text-ink-muted">This becomes their sign-in name.</p>
            </div>

            <fieldset>
              <legend className="label">Role</legend>
              <div className="space-y-2">
                {roles.map((role) => (
                  <label
                    key={role.value}
                    className="flex cursor-pointer gap-3 rounded border p-3"
                    style={{
                      borderColor: form.role === role.value ? "var(--focus)" : "var(--rule)",
                      background: form.role === role.value ? "var(--info-wash)" : "var(--surface)",
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      className="mt-1"
                      value={role.value}
                      checked={form.role === role.value}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                    />
                    <span>
                      <span className="block text-sm font-medium">{role.label}</span>
                      <span className="mt-0.5 block text-xs text-ink-muted">{role.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label className="label" htmlFor="temporaryPassword">Temporary password</label>
              <input
                id="temporaryPassword"
                type="password"
                className="field"
                autoComplete="new-password"
                value={form.temporaryPassword}
                onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })}
                required
              />
              <p className="mt-1 text-xs text-ink-muted">
                At least 12 characters, including one digit. Give it to the person directly. They must
                change it when they first sign in.
              </p>
            </div>

            {formError ? (
              <div
                className="flex items-start gap-3 rounded border px-3 py-2 text-sm"
                style={{ borderColor: "var(--breach)", background: "var(--breach-wash)", color: "var(--breach)" }}
                role="alert"
              >
                <Icon name="error" size={18} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}

            {confirmation ? (
              <div
                className="flex items-start gap-3 rounded border px-3 py-2 text-sm"
                style={{ borderColor: "var(--ok)", background: "var(--ok-wash)", color: "var(--ok)" }}
                role="status"
              >
                <Icon name="check_circle" size={18} className="mt-0.5 shrink-0" />
                <span>{confirmation}</span>
              </div>
            ) : null}

            <button type="submit" className="button-primary w-full" disabled={saving}>
              {saving ? "Creating account…" : "Create account"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
