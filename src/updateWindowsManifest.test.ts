import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { updateWindowsManifest, calculateSha512Base64 } from '../scripts/update-windows-manifest.mjs';

describe('updateWindowsManifest', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('poprawnie oblicza sumę SHA-512 zakodowaną w Base64', () => {
    const testFile = path.join(tmpDir, 'test.bin');
    fs.writeFileSync(testFile, 'Saldo Windows Binary Content');

    const expectedSha512 = crypto
      .createHash('sha512')
      .update(Buffer.from('Saldo Windows Binary Content'))
      .digest('base64');

    expect(calculateSha512Base64(testFile)).toBe(expectedSha512);
  });

  it('aktualizuje rozmiar i sha512 w latest.yml oraz usuwa powiązany .blockmap', () => {
    const installerName = 'Saldo-Setup-1.6.7.exe';
    const installerPath = path.join(tmpDir, installerName);
    const blockmapPath = `${installerPath}.blockmap`;

    // Symulacja podpisanego pliku instalatora o nowej zawartości
    fs.writeFileSync(installerPath, 'Newly Signed Authenticode Content for Saldo Windows Installer');
    fs.writeFileSync(blockmapPath, 'stale-blockmap-data');

    const initialManifest = `version: 1.6.7
files:
  - url: ${installerName}
    sha512: oldHashBase64==
    size: 100
path: ${installerName}
sha512: oldHashBase64==
releaseDate: '2026-11-15T15:00:00.000Z'
`;
    fs.writeFileSync(path.join(tmpDir, 'latest.yml'), initialManifest, 'utf8');

    const result = updateWindowsManifest(tmpDir);
    expect(result).toBe(true);

    const updatedContent = fs.readFileSync(path.join(tmpDir, 'latest.yml'), 'utf8');
    const expectedSha512 = calculateSha512Base64(installerPath);
    const expectedSize = fs.statSync(installerPath).size;

    expect(updatedContent).toContain(`sha512: ${expectedSha512}`);
    expect(updatedContent).toContain(`size: ${expectedSize}`);
    expect(updatedContent).not.toContain('oldHashBase64==');
    expect(updatedContent).not.toContain('size: 100');

    // Weryfikacja usunięcia nieaktualnego pliku blockmap
    expect(fs.existsSync(blockmapPath)).toBe(false);
  });

  it('zwraca false i nie rzuca błędu, jeśli latest.yml nie istnieje', () => {
    const result = updateWindowsManifest(tmpDir);
    expect(result).toBe(false);
  });
});
