import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function calculateSha512Base64(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha512').update(fileBuffer).digest('base64');
}

export function updateWindowsManifest(dir = 'dist-electron') {
  const manifestPath = path.join(dir, 'latest.yml');
  if (!fs.existsSync(manifestPath)) {
    console.warn(`[UpdateManifest] Nie znaleziono ${manifestPath} — pomijam.`);
    return false;
  }

  let content = fs.readFileSync(manifestPath, 'utf8');

  // Znajdź wszystkie pliki .exe wymienione w latest.yml
  const fileRegex = /^\s*(- )?(url|path):\s*([^\r\n]+\.exe)\s*$/gm;
  const referencedFiles = new Set();
  let match;
  while ((match = fileRegex.exec(content)) !== null) {
    referencedFiles.add(match[3].trim());
  }

  let updatedCount = 0;

  for (const filename of referencedFiles) {
    const fullPath = path.join(dir, filename);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[UpdateManifest] Plik ${fullPath} nie istnieje w folderze ${dir}.`);
      continue;
    }

    const stat = fs.statSync(fullPath);
    const newSize = stat.size;
    const newSha512 = calculateSha512Base64(fullPath);

    console.log(`[UpdateManifest] Aktualizacja sum dla ${filename}: rozmiar=${newSize}, sha512=${newSha512.substring(0, 16)}...`);

    // 1. Aktualizacja bloku root path + sha512
    const rootPathPattern = new RegExp(`(path:\\s*${escapeRegExp(filename)}[\\r\\n]+sha512:\\s*)[^\\r\\n]+`, 'g');
    content = content.replace(rootPathPattern, `$1${newSha512}`);

    // 2. Aktualizacja wpisu w tablicy files:
    const fileEntryPattern = new RegExp(
      `(url:\\s*${escapeRegExp(filename)}[\\r\\n]+\\s*sha512:\\s*)[^\\r\\n]+([\\r\\n]+\\s*size:\\s*)\\d+`,
      'g'
    );
    content = content.replace(fileEntryPattern, `$1${newSha512}$2${newSize}`);

    // 3. Usunięcie nieaktualnego pliku .blockmap dla podpisanego instalatora
    const blockmapPath = `${fullPath}.blockmap`;
    if (fs.existsSync(blockmapPath)) {
      try {
        fs.unlinkSync(blockmapPath);
        console.log(`[UpdateManifest] Usunięto nieaktualny plik blockmap: ${blockmapPath}`);
      } catch (err) {
        console.warn(`[UpdateManifest] Nie udało się usunąć ${blockmapPath}:`, err);
      }
    }

    updatedCount++;
  }

  fs.writeFileSync(manifestPath, content, 'utf8');
  console.log(`[UpdateManifest] Pomyślnie zaktualizowano ${manifestPath} dla ${updatedCount} plików.`);
  return true;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('update-windows-manifest.mjs') ||
  process.argv[1].endsWith('update-windows-manifest')
);

if (isMain) {
  const targetDir = process.argv[2] || 'dist-electron';
  updateWindowsManifest(targetDir);
}
