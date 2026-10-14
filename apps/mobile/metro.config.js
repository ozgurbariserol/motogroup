// Monorepo-aware Metro config — Expo + pnpm workspace.
// packages/shared gibi workspace paketlerini ve kök node_modules'ı izler.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Workspace kökünü izle (shared paketi değişikliklerini yakalamak için).
config.watchFolders = [workspaceRoot];

// Hem app'in hem kökün node_modules'ından çözümle.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
