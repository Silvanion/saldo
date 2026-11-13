// Automatyczna lokalna kopia zapasowa (UX-01): jeden plik na dzień, ostatnie 7 dni, zapis atomowy.
// Treść to stan w takiej postaci, w jakiej leży w bazie lokalnej (profile z PIN-em zaszyfrowane) —
// ta sama ochrona co dane w aplikacji, bez dodatkowego szyfrowania.
const fs = require("fs");
const path = require("path");

const NAME_RE = /^saldo-auto-(\d{4}-\d{2}-\d{2})\.json$/;
const KEEP_DAYS = 7;
const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
// Nowa treść mniejsza niż 20% dzisiejszej kopii wygląda na reset/uszkodzenie — nie nadpisujemy dobrej kopii.
const SHRINK_RATIO = 0.2;

function pad(n) { return String(n).padStart(2, "0"); }

function backupFileName(date = new Date()) {
  return `saldo-auto-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

function assertValidState(json) {
  if (typeof json !== "string") throw new Error("Kopia musi być tekstem JSON.");
  if (Buffer.byteLength(json, "utf8") > MAX_BACKUP_BYTES) throw new Error("Kopia jest za duża.");
  let parsed;
  try { parsed = JSON.parse(json); } catch { throw new Error("Kopia nie jest poprawnym JSON."); }
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.profiles)) {
    throw new Error("Kopia nie wygląda na stan aplikacji (brak listy profili).");
  }
}

function listBackups(dir) {
  let names;
  try { names = fs.readdirSync(dir); } catch { return []; }
  return names
    .filter((n) => NAME_RE.test(n))
    .sort()
    .reverse()
    .map((name) => {
      const stat = fs.statSync(path.join(dir, name));
      return { name, date: NAME_RE.exec(name)[1], size: stat.size, modifiedAt: stat.mtime.toISOString() };
    });
}

function writeDailyBackup(dir, json, now = new Date(), keep = KEEP_DAYS) {
  assertValidState(json);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, backupFileName(now));
  const size = Buffer.byteLength(json, "utf8");

  if (fs.existsSync(file)) {
    const existing = fs.statSync(file).size;
    if (existing > 2048 && size < existing * SHRINK_RATIO) return { file, skipped: "shrink", pruned: [] };
  }

  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, json, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, file);

  const pruned = listBackups(dir).slice(keep).map((b) => b.name);
  for (const name of pruned) fs.rmSync(path.join(dir, name), { force: true });
  return { file, skipped: null, pruned };
}

function readBackup(dir, name) {
  if (typeof name !== "string" || !NAME_RE.test(name)) throw new Error("Nieprawidłowa nazwa pliku kopii.");
  return fs.readFileSync(path.join(dir, name), "utf8");
}

module.exports = { NAME_RE, KEEP_DAYS, MAX_BACKUP_BYTES, backupFileName, writeDailyBackup, listBackups, readBackup };
