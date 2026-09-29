// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { createStatementWatcher } = require("../electron/statementWatcher.cjs");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("statementWatcher", () => {
  let dir: string;
  let watcher: { start: (d: string) => void; stop: () => void };

  const setup = () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "saldo-watch-"));
    const found: string[] = [];
    watcher = createStatementWatcher({ onNewFile: (p: string) => found.push(p), settleMs: 60 });
    return found;
  };

  afterEach(() => {
    watcher?.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("zgłasza nowy plik CSV dokładnie raz i ignoruje inne rozszerzenia", async () => {
    const found = setup();
    fs.writeFileSync(path.join(dir, "stary.csv"), "a;b\n1;2");
    watcher.start(dir);
    fs.writeFileSync(path.join(dir, "wyciag.csv"), "a;b\n1;2");
    fs.writeFileSync(path.join(dir, "notatki.txt"), "nie wyciąg");
    await sleep(500);
    expect(found).toEqual([path.join(dir, "wyciag.csv")]);
  });

  it("nie zgłasza pliku, który nadal rośnie (niedokończone pobieranie)", async () => {
    const found = setup();
    watcher.start(dir);
    const file = path.join(dir, "duzy.pdf");
    fs.writeFileSync(file, "x");
    for (let i = 0; i < 4; i++) {
      await sleep(30);
      fs.appendFileSync(file, "x");
    }
    expect(found).toEqual([]);
    await sleep(400);
    expect(found).toEqual([file]);
  });

  it("po stop() przestaje zgłaszać", async () => {
    const found = setup();
    watcher.start(dir);
    watcher.stop();
    fs.writeFileSync(path.join(dir, "po.csv"), "a;b");
    await sleep(300);
    expect(found).toEqual([]);
  });
});
