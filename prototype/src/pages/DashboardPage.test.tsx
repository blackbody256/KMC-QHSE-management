// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppRouterProvider } from "../lib/router";
import { DemoStoreProvider } from "../store/DemoStore";
import { DashboardPage } from "./DashboardPage";

const renderDashboard = () => render(
  <DemoStoreProvider>
    <AppRouterProvider>
      <DashboardPage />
    </AppRouterProvider>
  </DemoStoreProvider>,
);

describe("card-first dashboard", () => {
  afterEach(cleanup);

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("prioritises exceptions and keeps exact values behind a disclosure", () => {
    renderDashboard();
    expect(screen.getByRole("heading", { name: "What needs attention" })).toBeInTheDocument();
    const exactValues = screen.getByText("Definitions, sources and exact values").closest("details");
    expect(exactValues).not.toHaveAttribute("open");
  });

  it("opens an accessible details drawer with the actual formula and closes on Escape", () => {
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: "More information about Surveillance compliance" }));

    const dialog = screen.getByRole("dialog", { name: "Surveillance compliance" });
    expect(within(dialog).getByText("37 completed ÷ 40 scheduled × 100 = 92.5%"))
      .toBeInTheDocument();
    expect(within(dialog).getByText("271 completed ÷ 289 scheduled × 100"))
      .toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("uses a single selectable KPI in the trend explorer", () => {
    renderDashboard();
    const selector = screen.getByRole("combobox", { name: "Metric" });
    expect(selector).toHaveValue("OH1");
    fireEvent.change(selector, { target: { value: "S4" } });
    expect(selector).toHaveValue("S4");
    expect(screen.getByText("214.0", { selector: ".trend-summary-row strong" })).toBeInTheDocument();
  });
});
