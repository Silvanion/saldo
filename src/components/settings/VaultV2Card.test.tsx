/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { VaultV2Card } from "./VaultV2Card";
import * as vaultV2 from "../../services/vaultV2";

vi.mock("../../services/vaultV2", () => ({
  vaultExists: vi.fn(),
  isVaultUnlocked: vi.fn(),
  lockVault: vi.fn(),
  createVault: vi.fn(),
  unlockVault: vi.fn(),
  changeVaultPassword: vi.fn(),
  unlockVaultWithRecovery: vi.fn()
}));

describe("VaultV2Card", () => {
  const showToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renderuje stan nieaktywnego skarbca i przycisk aktywacji", async () => {
    vi.mocked(vaultV2.vaultExists).mockResolvedValue(false);
    vi.mocked(vaultV2.isVaultUnlocked).mockReturnValue(false);

    render(<VaultV2Card showToast={showToast} />);

    expect(await screen.findByText(/Skarbiec nie został jeszcze aktywowany/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Aktywuj Skarbiec v2 i Hasło Główne/ })).toBeTruthy();
  });

  it("pokazuje błędy walidacji hasła przy tworzeniu skarbca", async () => {
    vi.mocked(vaultV2.vaultExists).mockResolvedValue(false);
    vi.mocked(vaultV2.isVaultUnlocked).mockReturnValue(false);

    render(<VaultV2Card showToast={showToast} />);

    const activateBtn = await screen.findByRole("button", { name: /Aktywuj Skarbiec v2 i Hasło Główne/ });
    fireEvent.click(activateBtn);

    expect(screen.getByText(/Aktywacja Skarbca v2 • Nowe Hasło Główne/)).toBeTruthy();

    const inputs = screen.getAllByPlaceholderText("••••••••••••");
    const pwdInput = inputs[0];
    const confirmInput = inputs[1];

    // Test za krótkie hasło
    fireEvent.change(pwdInput, { target: { value: "krotkie" } });
    fireEvent.change(confirmInput, { target: { value: "krotkie" } });
    fireEvent.click(screen.getByRole("button", { name: /Utwórz Skarbiec v2/ }));

    // Występuje w opisie i jako komunikat błędu
    expect(screen.getAllByText(/Hasło musi mieć co najmniej 12 znaków\./).length).toBeGreaterThanOrEqual(2);

    // Test niezgodne hasła
    fireEvent.change(pwdInput, { target: { value: "dlogiehaslo12345" } });
    fireEvent.change(confirmInput, { target: { value: "innehaslo123456" } });
    fireEvent.click(screen.getByRole("button", { name: /Utwórz Skarbiec v2/ }));

    expect(screen.getByText(/Hasła nie są identyczne\./)).toBeTruthy();
  });

  it("tworzy skarbiec i wyświetla klucz odzyskiwania oraz pozwala go skopiować", async () => {
    vi.mocked(vaultV2.vaultExists).mockResolvedValue(false);
    vi.mocked(vaultV2.isVaultUnlocked).mockReturnValue(false);
    vi.mocked(vaultV2.createVault).mockResolvedValue({
      recoveryKey: "ABCD-EFGH-JKMN-PQRT-VWXY-12"
    });

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });

    render(<VaultV2Card showToast={showToast} />);

    fireEvent.click(await screen.findByRole("button", { name: /Aktywuj Skarbiec v2 i Hasło Główne/ }));

    const inputs = screen.getAllByPlaceholderText("••••••••••••");
    const pwdInput = inputs[0];
    const confirmInput = inputs[1];

    fireEvent.change(pwdInput, { target: { value: "bezpieczneHaslo123!" } });
    fireEvent.change(confirmInput, { target: { value: "bezpieczneHaslo123!" } });

    fireEvent.click(screen.getByRole("button", { name: /Utwórz Skarbiec v2/ }));

    await waitFor(() => {
      expect(vaultV2.createVault).toHaveBeenCalledWith("bezpieczneHaslo123!");
    });

    expect(await screen.findByText("Twój Jednorazowy Klucz Odzyskiwania")).toBeTruthy();
    expect(screen.getByText("ABCD-EFGH-JKMN-PQRT-VWXY-12")).toBeTruthy();

    // Kopiuj do schowka
    const copyBtn = screen.getByRole("button", { name: /Skopiuj klucz do schowka/ });
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("ABCD-EFGH-JKMN-PQRT-VWXY-12");

    // Przycisk zakończenia jest zablokowany bez zaznaczenia checkboxa
    const finishBtn = screen.getByRole("button", { name: /Dokończ i zamknij/ }) as HTMLButtonElement;
    expect(finishBtn.disabled).toBe(true);

    // Zaznacz checkbox
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(finishBtn.disabled).toBe(false);

    fireEvent.click(finishBtn);
    await waitFor(() => {
      expect(screen.queryByText("Twój Jednorazowy Klucz Odzyskiwania")).toBeNull();
    });
  });

  it("renderuje stan zablokowanego skarbca i pozwala go odblokować", async () => {
    vi.mocked(vaultV2.vaultExists).mockResolvedValue(true);
    vi.mocked(vaultV2.isVaultUnlocked).mockReturnValue(false);
    vi.mocked(vaultV2.unlockVault).mockResolvedValue(undefined);

    render(<VaultV2Card showToast={showToast} />);

    expect(await screen.findByText(/Skarbiec v2 jest aktywny/)).toBeTruthy();
    expect(screen.getByText("Zablokowany")).toBeTruthy();

    const unlockBtn = screen.getByRole("button", { name: /Odblokuj hasłem/ });
    fireEvent.click(unlockBtn);

    expect(screen.getByText("Odblokuj Skarbiec v2")).toBeTruthy();
    const pwdInput = screen.getByPlaceholderText("••••••••••••");
    fireEvent.change(pwdInput, { target: { value: "prawidloweHaslo123" } });

    fireEvent.click(screen.getByRole("button", { name: "Odblokuj" }));

    await waitFor(() => {
      expect(vaultV2.unlockVault).toHaveBeenCalledWith("prawidloweHaslo123");
    });
    expect(showToast).toHaveBeenCalledWith("Skarbiec został odblokowany.", "success");
  });

  it("pozwala zablokować aktywną sesję skarbca", async () => {
    vi.mocked(vaultV2.vaultExists).mockResolvedValue(true);
    vi.mocked(vaultV2.isVaultUnlocked).mockReturnValue(true);

    render(<VaultV2Card showToast={showToast} />);

    expect(await screen.findByText("Odblokowany (klucz w pamięci)")).toBeTruthy();

    const lockBtn = screen.getByRole("button", { name: /Zablokuj sesję/ });
    fireEvent.click(lockBtn);

    expect(vaultV2.lockVault).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      "Skarbiec został zablokowany. Klucz sesji usunięty z pamięci.",
      "info"
    );
  });

  it("obsługuje zmianę hasła głównego", async () => {
    vi.mocked(vaultV2.vaultExists).mockResolvedValue(true);
    vi.mocked(vaultV2.isVaultUnlocked).mockReturnValue(true);
    vi.mocked(vaultV2.changeVaultPassword).mockResolvedValue(undefined);

    render(<VaultV2Card showToast={showToast} />);

    const changeBtn = await screen.findByRole("button", { name: /Zmień hasło/ });
    fireEvent.click(changeBtn);

    expect(screen.getByText("Zmień Hasło Główne Skarbca")).toBeTruthy();

    const inputs = screen.getAllByPlaceholderText("••••••••••••");
    const oldPwdInput = inputs[0];
    const newPwdInput = inputs[1];
    const confirmPwdInput = inputs[2];

    fireEvent.change(oldPwdInput, { target: { value: "stareHaslo12345" } });
    fireEvent.change(newPwdInput, { target: { value: "noweBezpieczneHaslo987" } });
    fireEvent.change(confirmPwdInput, { target: { value: "noweBezpieczneHaslo987" } });

    fireEvent.click(screen.getByRole("button", { name: "Zapisz nowe hasło" }));

    await waitFor(() => {
      expect(vaultV2.changeVaultPassword).toHaveBeenCalledWith(
        "stareHaslo12345",
        "noweBezpieczneHaslo987"
      );
    });
    expect(showToast).toHaveBeenCalledWith(
      "Hasło główne zostało zmienione. Klucz DEK został przepakowany.",
      "success"
    );
  });

  it("obsługuje awaryjne odzyskanie skarbca kluczem odzyskiwania", async () => {
    vi.mocked(vaultV2.vaultExists).mockResolvedValue(true);
    vi.mocked(vaultV2.isVaultUnlocked).mockReturnValue(false);
    vi.mocked(vaultV2.unlockVaultWithRecovery).mockResolvedValue(undefined);

    render(<VaultV2Card showToast={showToast} />);

    const recoverBtn = await screen.findByRole("button", { name: /Odzyskaj kluczem/ });
    fireEvent.click(recoverBtn);

    expect(screen.getByText("Odzyskiwanie Skarbca Kluczem Awaryjnym")).toBeTruthy();

    const keyInput = screen.getByPlaceholderText("XXXX-XXXX-XXXX-XXXX-XXXX-XXXXXX");
    const inputs = screen.getAllByPlaceholderText("••••••••••••");
    const newPwdInput = inputs[0];
    const confirmPwdInput = inputs[1];

    fireEvent.change(keyInput, { target: { value: "ABCD-EFGH-JKMN-PQRT-VWXY-12" } });
    fireEvent.change(newPwdInput, { target: { value: "noweHasloPoOdzykaniu12" } });
    fireEvent.change(confirmPwdInput, { target: { value: "noweHasloPoOdzykaniu12" } });

    fireEvent.click(screen.getByRole("button", { name: "Odzyskaj i ustaw nowe hasło" }));

    await waitFor(() => {
      expect(vaultV2.unlockVaultWithRecovery).toHaveBeenCalledWith(
        "ABCD-EFGH-JKMN-PQRT-VWXY-12",
        "noweHasloPoOdzykaniu12"
      );
    });
    expect(showToast).toHaveBeenCalledWith(
      "Skarbiec został pomyślnie odzyskany nowym hasłem!",
      "success"
    );
  });
});
