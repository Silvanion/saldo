/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";

const setActiveView = vi.fn();
const setIsMobileMenuOpen = vi.fn();
const openModal = vi.fn();

vi.mock("./providers/AppContext", () => ({
  useApp: () => ({
    activeView: "dashboard",
    setActiveView,
    activeProfile: { payments: [{ status: "Oczekuje" }, { status: "Opłacono" }, { status: "Oczekuje" }] },
    isMobileMenuOpen: false,
    setIsMobileMenuOpen,
    openModal
  })
}));

import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it("grupuje pozycje i zachowuje id #nav-<widok> używane przez e2e", () => {
    render(<Sidebar isElectron={false} />);
    for (const group of ["Codzienne", "Planowanie", "Majątek"]) {
      expect(screen.getByRole("group", { name: group })).toBeTruthy();
    }
    for (const view of ["dashboard", "transactions", "payments", "budget", "goals", "debts", "analysis", "help", "settings"]) {
      expect(document.getElementById(`nav-${view}`)).toBeTruthy();
    }
    expect(document.getElementById("nav-dashboard")!.getAttribute("aria-current")).toBe("page");
  });

  it("przełącza widok, a pozycje modalowe otwierają modal bez zmiany widoku", () => {
    render(<Sidebar isElectron={false} />);
    fireEvent.click(document.getElementById("nav-budget")!);
    expect(setActiveView).toHaveBeenCalledWith("budget");

    fireEvent.click(document.getElementById("nav-networth")!);
    expect(setActiveView).toHaveBeenLastCalledWith("netWorth");

    fireEvent.click(document.getElementById("nav-b2b-tax")!);
    expect(openModal).toHaveBeenCalledWith("b2bTax");
    expect(setActiveView).toHaveBeenCalledTimes(2);
  });

  it("pokazuje licznik nieopłaconych płatności", () => {
    render(<Sidebar isElectron={false} />);
    expect(document.getElementById("nav-payments")!.textContent).toContain("2");
  });

  it("zwija menu do ikon i zapamiętuje stan", () => {
    const { unmount } = render(<Sidebar isElectron={false} />);
    const aside = document.getElementById("sidebar-panel")!;
    expect(aside.getAttribute("data-collapsed")).toBe("false");

    fireEvent.click(screen.getByLabelText("Zwiń menu boczne"));
    expect(aside.getAttribute("data-collapsed")).toBe("true");
    expect(localStorage.getItem("saldo.sidebarCollapsed")).toBe("1");
    expect(document.getElementById("nav-budget")!.getAttribute("title")).toBe("Budżet");

    unmount();
    render(<Sidebar isElectron={false} />);
    expect(document.getElementById("sidebar-panel")!.getAttribute("data-collapsed")).toBe("true");
  });
});
