// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { backupFileName, writeDailyBackup, listBackups, readBackup, MAX_BACKUP_BYTES } = require("../electron/autoBackup.cjs");

const dirs: string[] = [];
// Katalog roboczy testu; sprzątamy dokładnie ten katalog (NIGDY jego rodzica — to byłby os.tmpdir()).
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "saldo-backup-")); dirs.push(d); return path.join(d, "backups"); };
afterEach(() => {
  while (dirs.length) {
    const d = dirs.pop()!;
    if (path.basename(d).startsWith("saldo-backup-")) fs.rmSync(d, { recursive: true, force: true });
  }
});

const state = (n: number) => JSON.stringify({ profiles: [{ id: "p", name: "x", transactions: Array.from({ length: n }, (_, i) => ({ id: String(i), name: "wpis " + i })) }] });
const day = (d: number) => new Date(2026, 10, d, 12, 0, 0); // listopad 2026, czas lokalny

describe("kopia automatyczna (UX-01)", () => {
  it("nazwa pliku zawiera lokalną datę", () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 59))).toBe("saldo-auto-2026-01-05.json");
  });

  it("zapisuje jeden plik dziennie, kolejny zapis tego dnia go nadpisuje", () => {
    const dir = tmp();
    writeDailyBackup(dir, state(5), day(10));
    writeDailyBackup(dir, state(6), day(10));
    const list = listBackups(dir);
    expect(list.map((b: any) => b.name)).toEqual(["saldo-auto-2026-11-10.json"]);
    expect(JSON.parse(readBackup(dir, list[0].name)).profiles[0].transactions).toHaveLength(6);
  });

  it("trzyma tylko 7 najnowszych dni", () => {
    const dir = tmp();
    for (let d = 1; d <= 10; d++) writeDailyBackup(dir, state(3), day(d));
    const names = listBackups(dir).map((b: any) => b.name);
    expect(names).toHaveLength(7);
    expect(names[0]).toBe("saldo-auto-2026-11-10.json");
    expect(names[6]).toBe("saldo-auto-2026-11-04.json");
  });

  it("nie zastępuje dobrej kopii z tego dnia znacznie mniejszą (np. po resecie)", () => {
    const dir = tmp();
    writeDailyBackup(dir, state(500), day(10));
    const r = writeDailyBackup(dir, state(0), day(10));
    expect(r.skipped).toBe("shrink");
    expect(JSON.parse(readBackup(dir, "saldo-auto-2026-11-10.json")).profiles[0].transactions).toHaveLength(500);
  });

  it("odrzuca dane, które nie są stanem aplikacji (zły JSON, brak profiles, nie-string, za duże)", () => {
    const dir = tmp();
    for (const bad of ["nie json", "{}", JSON.stringify({ profiles: "x" }), 123 as any, null as any]) {
      expect(() => writeDailyBackup(dir, bad, day(10))).toThrow();
    }
    expect(() => writeDailyBackup(dir, "x".repeat(MAX_BACKUP_BYTES + 1), day(10))).toThrow(/za duża/i);
    expect(fs.existsSync(dir) ? listBackups(dir) : []).toEqual([]);
  });

  it("readBackup przepuszcza tylko nazwy plików kopii (ochrona przed path traversal)", () => {
    const dir = tmp();
    writeDailyBackup(dir, state(1), day(10));
    for (const evil of ["../../etc/passwd", "..\\..\\x", "saldo-auto-2026-11-10.json/../../x", "/etc/passwd", "saldo-auto-x.json", "other.json"]) {
      expect(() => readBackup(dir, evil)).toThrow(/nazwa/i);
    }
  });

  it("zapis jest atomowy: po zapisie nie zostają pliki tymczasowe", () => {
    const dir = tmp();
    writeDailyBackup(dir, state(2), day(10));
    expect(fs.readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  it("listBackups dla nieistniejącego katalogu zwraca pustą listę", () => {
    expect(listBackups(path.join(os.tmpdir(), "saldo-no-such-dir-" + Date.now()))).toEqual([]);
  });
});
