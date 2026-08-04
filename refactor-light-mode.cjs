const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'components');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (f === 'node_modules' || f.startsWith('.')) return;
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let filesModified = 0;

walkDir(srcDir, (filePath) => {
  if (!filePath.endsWith('.tsx')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Banners
  content = content.replace(/bg-gradient-to-br from-emerald-500\/10 via-slate-800 to-emerald-500\/5\s+border-2 border-emerald-500\/50/g, 'bg-emerald-50 border-emerald-200');
  content = content.replace(/bg-gradient-to-br from-emerald-900\/40 to-slate-900\/80/g, 'bg-emerald-50');
  content = content.replace(/ring-1 ring-emerald-500\/20/g, '');

  // Badges & Buttons (Emerald)
  content = content.replace(/bg-emerald-500\/[0-9]+\/?[0-9]*/g, 'bg-emerald-50');
  content = content.replace(/text-emerald-300/g, 'text-emerald-700');
  content = content.replace(/text-emerald-400/g, 'text-emerald-700');
  content = content.replace(/border-emerald-500\/30/g, 'border-emerald-200');
  content = content.replace(/hover:bg-emerald-500\/[0-9]+\/?[0-9]*/g, 'hover:bg-emerald-100');

  // Badges & Buttons (Rose)
  content = content.replace(/bg-rose-500\/[0-9]+/g, 'bg-rose-50');
  content = content.replace(/text-rose-300/g, 'text-rose-700');
  content = content.replace(/text-rose-400/g, 'text-rose-700');
  content = content.replace(/border-rose-500\/30/g, 'border-rose-200');
  content = content.replace(/border-rose-500\/20/g, 'border-rose-200');
  content = content.replace(/hover:bg-rose-500\/[0-9]+/g, 'hover:bg-rose-100');
  content = content.replace(/hover:text-rose-100/g, 'hover:text-rose-800');

  // Badges & Buttons (Amber)
  content = content.replace(/bg-amber-500\/[0-9]+/g, 'bg-amber-50');
  content = content.replace(/text-amber-300/g, 'text-amber-700');
  content = content.replace(/text-amber-400/g, 'text-amber-700');
  content = content.replace(/border-amber-500\/30/g, 'border-amber-200');
  content = content.replace(/border-amber-500\/20/g, 'border-amber-200');

  // Gray/Slate standardizations for tabs, pills, borders, dividers
  content = content.replace(/bg-slate-700\/[0-9]+/g, 'bg-slate-100');
  content = content.replace(/hover:bg-slate-700\/[0-9]+/g, 'hover:bg-slate-200');
  content = content.replace(/bg-slate-700/g, 'bg-slate-100');
  content = content.replace(/border-slate-700\/[0-9]+/g, 'border-slate-200');
  content = content.replace(/border-slate-600\/[0-9]+/g, 'border-slate-200');
  content = content.replace(/border-slate-600/g, 'border-slate-200');
  content = content.replace(/border-slate-500/g, 'border-slate-300');

  // Misc fixes
  content = content.replace(/bg-black\/55/g, 'bg-black/40'); // Overlay less dark
  
  // SettingsView active profile text fix
  content = content.replace(/AKTYWNY/g, 'Aktywny');
  content = content.replace(/text-text-main text-white/g, 'text-text-main');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    console.log('Modified:', path.basename(filePath));
  }
});

console.log('Done! Files modified:', filesModified);
