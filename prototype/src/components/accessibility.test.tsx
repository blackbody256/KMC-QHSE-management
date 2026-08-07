import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ComplianceStatus } from "../types";
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
});
