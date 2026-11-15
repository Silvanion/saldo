const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Ścieżki monorepo
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Obserwuj folder główny repozytorium (w tym packages/core)
config.watchFolders = [monorepoRoot];

// 2. Wyszukiwanie pakietów node_modules w obu poziomach
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;

