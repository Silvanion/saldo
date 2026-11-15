import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { updateWindowsManifest, calculateSha512Base64 } from './update-windows-manifest.mjs';

describe('updateWindowsManifest', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('poprawnie aktualizuje latest.yml z nowym rozmiarem i sha512 po podpisaniu', () => {
    const exeName = 'Saldo-Setup-1.6.7.exe';
    const exePath = path.join(tmpDir, exeName);
    const blockmapPath = path.join(tmpDir, `${exeName}.blockmap`);
    
    // Tworzymy plik binarny i blockmap
    fs.writeFileSync(exePath, 'Dummy Signed Executable Content 2026');
    fs.writeFileSync(blockmapPath, 'Old Blockmap Content');

    const originalLatestYml = `version: 1.6.7
files:
  - url: ${exeName}
    sha512: OldHashBase64ValueHere=
    size: 100
path: ${exeName}
sha512: OldHashBase64ValueHere=
releaseDate: '2026-11-15T18:00:00.000Z'
`;
    fs.writeFileSync(path.join(tmpDir, 'latest.yml'), originalLatestYml, 'utf8');

    const result = updateWindowsManifest(tmpDir);
    expect(result).toBe(true);

    // Blockmap powinien zostać usunięty
    expect(fs.existsSync(blockmapPath)).toBe(false);

    // latest.yml powinien zawierać nowy sha512 i rozmiar
    const updatedContent = fs.readFileSync(path.join(tmpDir, 'latest.yml'), 'utf8');
    const expectedSha512 = calculateSha512Base64(exePath);
    const expectedSize = fs.statSync(exePath).size;

    expect(updatedContent).toContain(`sha512: ${expectedSha512}`);
    expect(updatedContent).toContain(`size: ${expectedSize}`);
    expect(updatedContent).not.toContain('OldHashBase64ValueHere=');
  });

  it('zwraca false jeśli latest.yml nie istnieje', () => {
    const result = updateWindowsManifest(tmpDir);
    expect(result).toBe(false);
  });
});
