/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DataAuditorModal } from "./DataAuditorModal";
import { Profile } from "../../types";

describe("DataAuditorModal", () => {
  const cleanProfile: Profile = {
    id: "p1",
    name: "Jan Kowalski",
    currency: "PLN",
    kind: "personal",
    payments: [],
    goals: [],
    investments: [],
    budgets: {},
    accounts: [
      {
        id: "acc1",
        name: "Konto Główne",
        bankName: "mBank",
        hasCreditLimit: false,
        creditLimit: 0
      }
    ],
    transactions: [
      {
        id: "t1",
        name: "Pensja",
        amount: 5000,
        type: "income",
        category: "Wynagrodzenie",
        isoDate: "2026-09-01",
        account: "Konto Główne",
        currency: "PLN"
      }
    ],
    recurringRules: []
  };

  const messyProfile: Profile = {
    ...cleanProfile,
    transactions: [
      ...cleanProfile.transactions,
      {
        id: "t-dup",
        name: "Pensja",
        amount: 5000,
        type: "income",
        category: "Wynagrodzenie",
        isoDate: "2026-09-01",
        account: "Konto Główne",
        currency: "PLN"
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <DataAuditorModal
        isOpen={false}
        onClose={vi.fn()}
        profile={cleanProfile}
        onApplyRepair={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders clean state with 100% health score when there are no issues", () => {
    render(
      <DataAuditorModal
        isOpen={true}
        onClose={vi.fn()}
        profile={cleanProfile}
        onApplyRepair={vi.fn()}
      />
    );

    expect(screen.getByText("Doktor Saldo")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText("Baza danych w 100% spójna!")).toBeTruthy();
  });

  it("displays issues and allows repairing all when issues exist", () => {
    const onApplyRepairMock = vi.fn();
    render(
      <DataAuditorModal
        isOpen={true}
        onClose={vi.fn()}
        profile={messyProfile}
        onApplyRepair={onApplyRepairMock}
      />
    );

    expect(screen.getByText(/Prawdopodobny duplikat/i)).toBeTruthy();
    const healAllBtn = screen.getByRole("button", { name: /Napraw wszystko/i });
    expect(healAllBtn).toBeTruthy();

    fireEvent.click(healAllBtn);
    expect(onApplyRepairMock).toHaveBeenCalledTimes(1);
  });

  it("allows single issue repair", () => {
    const onApplyRepairMock = vi.fn();
    render(
      <DataAuditorModal
        isOpen={true}
        onClose={vi.fn()}
        profile={messyProfile}
        onApplyRepair={onApplyRepairMock}
      />
    );

    const singleRepairBtn = screen.getByRole("button", { name: "Usuń duplikat" });
    fireEvent.click(singleRepairBtn);
    expect(onApplyRepairMock).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking close button", () => {
    const onCloseMock = vi.fn();
    render(
      <DataAuditorModal
        isOpen={true}
        onClose={onCloseMock}
        profile={cleanProfile}
        onApplyRepair={vi.fn()}
      />
    );

    const closeBtn = screen.getByLabelText("Zamknij modal audytora");
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
