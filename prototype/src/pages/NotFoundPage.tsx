import { PageHeader } from "../components/PageHeader";
import { AppLink } from "../lib/router";

export function NotFoundPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Prototype navigation"
        title="Page not found"
        description="This route is not part of the stakeholder demonstration."
      />
      <AppLink className="button button-primary" to="/">
        Return to dashboard
      </AppLink>
    </div>
  );
}
