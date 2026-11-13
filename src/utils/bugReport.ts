export type BugReportType = "bug" | "suggestion";

export const ISSUES_NEW_URL = "https://github.com/Silvanion/saldo/issues/new";

// Adres URL ma praktyczny limit długości (GitHub/przeglądarki ok. 8 kB) — liczony po zakodowaniu,
// gdzie polskie znaki zajmują 6 znaków każdy. Za długi opis jest przycinany.
const MAX_URL_LENGTH = 7000;

/**
 * Buduje adres formularza nowego zgłoszenia na GitHubie (szablony w .github/ISSUE_TEMPLATE).
 * Pola formularza są wstępnie wypełniane po id (`description`, `version`). Nic nie jest wysyłane
 * z aplikacji — użytkownik sam zatwierdza zgłoszenie na GitHubie.
 */
export function buildIssueUrl(report: { type: BugReportType; title: string; description: string; version: string }): string {
  const prefix = report.type === "bug" ? "[Błąd] " : "[Sugestia] ";
  const build = (description: string) => `${ISSUES_NEW_URL}?${new URLSearchParams({
    template: report.type === "bug" ? "bug.yml" : "suggestion.yml",
    title: prefix + report.title,
    description,
    version: report.version
  }).toString()}`;

  let description = report.description;
  let href = build(description);
  while (href.length > MAX_URL_LENGTH && description.length > 0) {
    description = description.slice(0, Math.floor(description.length * 0.9));
    href = build(description + "\n\n[…skrócono]");
  }
  return href;
}
