/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { NewerVersionNotice } from "./NewerVersionNotice";

describe("NewerVersionNotice", () => {
  afterEach(cleanup);

  it("tłumaczy sytuację, zapewnia o nienaruszeniu danych i pozwala wybrać inny profil", () => {
    const onSelect = vi.fn();
    render(<NewerVersionNotice profileName="Rodzina" onSelectOtherProfile={onSelect} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/Rodzina/)).toBeTruthy();
    expect(screen.getByText(/niczego w tym profilu nie zapisze/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Pobierz najnowszą wersję/ }).getAttribute("href")).toContain("github.com/Silvanion/saldo/releases");
    fireEvent.click(screen.getByRole("button", { name: /Wybierz inny profil/ }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
