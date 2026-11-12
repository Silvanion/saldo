import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { getConnectSrc } from "./csp";

function firebaseHostingConnectSrc(): string[] {
  const cfg = JSON.parse(readFileSync(path.resolve(__dirname, "../../firebase.json"), "utf-8"));
  const headers = cfg.hosting.headers.flatMap((h: any) => h.headers);
  const csp: string = headers.find((h: any) => h.key === "Content-Security-Policy").value;
  const directive = csp.split(";").map((d) => d.trim()).find((d) => d.startsWith("connect-src"))!;
  return directive.split(/\s+/).slice(1);
}

describe("CSP connect-src", () => {
  it("firebase.json (hosting web) ma tę samą listę co serwer w trybie web", () => {
    expect([...firebaseHostingConnectSrc()].sort()).toEqual([...getConnectSrc(false)].sort());
  });

  it("zawiera hosty dostawców AI i usług używanych z renderera", () => {
    const list = getConnectSrc(false);
    for (const host of ["https://api.anthropic.com", "https://api.nbp.pl", "http://localhost:11434"]) {
      expect(list).toContain(host);
    }
  });

  it("hosty GitHub tylko w aplikacji desktopowej", () => {
    expect(getConnectSrc(false)).not.toContain("https://api.github.com");
    expect(getConnectSrc(true)).toContain("https://api.github.com");
  });
});
