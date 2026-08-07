import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { homePathFor } from "../lib/navigation";
import { primaryRole, roleLabels, useSession } from "../lib/session";

/**
 * Shown when a signed-in user opens a route their role cannot see.
 *
 * It explains rather than scolds, and it names who can change the situation.
 * Reaching this page is usually a bookmark or a shared link, not an attempt at
 * anything — the navigation never offers a route the role cannot open.
 */
export function ForbiddenPage() {
  const { user } = useSession();
  const role = primaryRole(user);

  return (
    <div className="mx-auto max-w-form py-12">
      <Icon name="lock" size={32} className="text-ink-faint" />
      <h1 className="mt-4 text-xl">That page is not part of your role</h1>
      <p className="mt-3 text-sm text-ink-muted">
        You are signed in as {user?.name} with the {role ? roleLabels[role] : "unassigned"} role, and
        that role does not open this page. Nothing is wrong with your account.
      </p>
      <p className="mt-3 text-sm text-ink-muted">
        If this page is part of your work, ask the Health and Wellness manager. Role assignment is
        theirs, and changing it is an audited action rather than a favour.
      </p>
      <Link to={homePathFor(role)} className="button-secondary mt-6">
        <Icon name="arrow_back" size={16} />
        Back to your work
      </Link>
    </div>
  );
}
