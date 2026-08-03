import { ArrowLeft, ShieldX } from "lucide-react";
import { AppLink } from "../lib/router";
import { useDemoStore } from "../store/DemoStore";

export function AccessDeniedPage() {
  const { currentUser } = useDemoStore();
  return (
    <section className="empty-state access-denied" role="alert">
      <ShieldX size={38} aria-hidden="true" />
      <h1>This screen is not part of your workflow</h1>
      <p>
        {currentUser?.title ?? "This account"} can only open the views described on the login
        screen. Viewer roles have no hidden or disabled entry controls.
      </p>
      <AppLink to="/" className="button button-secondary">
        <ArrowLeft size={17} aria-hidden="true" />
        Return to dashboard
      </AppLink>
    </section>
  );
}
