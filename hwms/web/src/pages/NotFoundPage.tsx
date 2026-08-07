import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { homePathFor } from "../lib/navigation";
import { primaryRole, useSession } from "../lib/session";

export function NotFoundPage() {
  const { user } = useSession();
  const role = primaryRole(user);

  return (
    <div className="mx-auto max-w-form py-12">
      <Icon name="help_center" size={32} className="text-ink-faint" />
      <h1 className="mt-4 text-xl">That address does not exist</h1>
      <p className="mt-3 text-sm text-ink-muted">
        The link may be out of date, or the page may not have been built yet. Use the navigation on
        the left to find what you need.
      </p>
      <Link to={homePathFor(role)} className="button-secondary mt-6">
        <Icon name="arrow_back" size={16} />
        Back to your work
      </Link>
    </div>
  );
}
