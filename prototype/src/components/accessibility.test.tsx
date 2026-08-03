import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ComplianceStatus } from "../types";
import { ResearchCards } from "./ResearchCards";
import { StatusPill } from "./StatusPill";

describe("status and proposal communication", () => {
  it("renders a glyph and text for every status so colour is never the only signal", () => {
    const statuses: ComplianceStatus[] = [
      "within",
      "approaching",
      "outside",
      "no-data",
      "provisional",
      "informational",
      "not-applicable",
    ];
    statuses.forEach((status) => {
      const html = renderToStaticMarkup(<StatusPill status={status} />);
      expect(html).toContain("status-pill");
      expect(html.match(/<span/g)?.length).toBeGreaterThanOrEqual(3);
      expect(html).not.toMatch(/<span[^>]*><\/span>/);
    });
  });

  it("keeps benchmark research cards non-editable and explicitly unapproved", () => {
    const html = renderToStaticMarkup(
      <ResearchCards
        heading="Example scope"
        description="Research only"
        items={[{ title: "Candidate record", records: "Possible fields", question: "Who owns it?", owner: "Unit owner" }]}
      />,
    );
    expect(html).toContain("Benchmark proposal—not approved by KMC");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("<canvas");
  });
});
