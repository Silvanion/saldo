import { describe, it, expect } from "vitest";
import { buildIssueUrl, ISSUES_NEW_URL } from "./bugReport";

describe("buildIssueUrl", () => {
  it("wskazuje szablon, tytuł z prefiksem, opis i wersję", () => {
    const url = new URL(buildIssueUrl({ type: "bug", title: "Przycisk nie działa", description: "Kroki…", version: "1.6.6" }));
    expect(`${url.origin}${url.pathname}`).toBe(ISSUES_NEW_URL);
    expect(url.searchParams.get("template")).toBe("bug.yml");
    expect(url.searchParams.get("title")).toBe("[Błąd] Przycisk nie działa");
    expect(url.searchParams.get("description")).toBe("Kroki…");
    expect(url.searchParams.get("version")).toBe("1.6.6");
  });

  it("sugestia używa osobnego szablonu", () => {
    const url = new URL(buildIssueUrl({ type: "suggestion", title: "Eksport", description: "x", version: "1" }));
    expect(url.searchParams.get("template")).toBe("suggestion.yml");
    expect(url.searchParams.get("title")).toBe("[Sugestia] Eksport");
  });

  it("przycina bardzo długi opis, by adres nie przekroczył limitów", () => {
    const href = buildIssueUrl({ type: "bug", title: "t", description: "ą".repeat(10000), version: "1" });
    expect(new URL(href).searchParams.get("description")!.endsWith("[…skrócono]")).toBe(true);
    expect(href.length).toBeLessThanOrEqual(7000);
  });

  it("znaki specjalne są kodowane (brak wstrzyknięcia dodatkowych parametrów)", () => {
    const url = new URL(buildIssueUrl({ type: "bug", title: "a&template=x#frag", description: "b&labels=evil", version: "1" }));
    expect(url.searchParams.get("title")).toBe("[Błąd] a&template=x#frag");
    expect(url.searchParams.get("labels")).toBeNull();
    expect(url.searchParams.get("template")).toBe("bug.yml");
  });
});
