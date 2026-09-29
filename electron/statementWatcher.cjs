const fs = require('fs');
const path = require('path');

const IMPORT_EXTENSIONS = ['.csv', '.pdf'];

// Watches a single folder (non-recursive) for NEW bank statement files.
// A browser writes a download in pieces, so a file is reported only after
// its size stayed unchanged for one check — never half-written. Files that
// were already in the folder when watching started are never reported
// (fs.watch only emits events for changes), and each path+mtime+size is
// reported at most once.
function createStatementWatcher({ onNewFile, settleMs = 1000, maxSettleChecks = 30 }) {
  let watcher = null;
  let dir = null;
  const pending = new Set();
  const reported = new Set();
  const timers = new Set();

  function schedule(fn, ms) {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  }

  function checkSettled(fullPath, lastSize, attempt) {
    fs.stat(fullPath, (err, stat) => {
      if (err || !stat.isFile()) {
        pending.delete(fullPath);
        return;
      }
      if (stat.size > 0 && stat.size === lastSize) {
        pending.delete(fullPath);
        const key = `${fullPath}:${stat.mtimeMs}:${stat.size}`;
        if (!reported.has(key)) {
          reported.add(key);
          onNewFile(fullPath);
        }
        return;
      }
      if (attempt >= maxSettleChecks) {
        pending.delete(fullPath);
        return;
      }
      schedule(() => checkSettled(fullPath, stat.size, attempt + 1), settleMs);
    });
  }

  function handleEvent(filename) {
    if (!filename) return;
    const name = filename.toString();
    if (!IMPORT_EXTENSIONS.includes(path.extname(name).toLowerCase())) return;
    const fullPath = path.join(dir, name);
    if (pending.has(fullPath)) return;
    pending.add(fullPath);
    schedule(() => checkSettled(fullPath, -1, 0), settleMs);
  }

  function stop() {
    if (watcher) {
      watcher.close();
      watcher = null;
    }
    timers.forEach(clearTimeout);
    timers.clear();
    pending.clear();
    dir = null;
  }

  function start(folder) {
    stop();
    dir = folder;
    watcher = fs.watch(folder, { persistent: false }, (_event, filename) => handleEvent(filename));
    watcher.on('error', () => stop());
  }

  return { start, stop, isWatching: () => watcher !== null };
}

module.exports = { createStatementWatcher };
