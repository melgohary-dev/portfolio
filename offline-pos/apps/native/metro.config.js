const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration for the npm-workspace monorepo.
 *
 * The shared engine lives in packages/core and is consumed as TS source
 * (`@offlinepos/core` → packages/core/src). Metro must watch the workspace
 * root, resolve node_modules from both the app and the root, and ignore the
 * web app's source so the POS client only sees the platform-neutral core.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = {
  projectRoot,
  watchFolders: [
    workspaceRoot,
    path.resolve(workspaceRoot, 'packages/core/src'),
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    blockList: [
      new RegExp(`^${path.resolve(workspaceRoot, 'src')}/.*`),
      new RegExp(`^${path.resolve(workspaceRoot, 'dist')}/.*`),
      new RegExp(`^${path.resolve(workspaceRoot, 'electron')}/.*`),
      new RegExp(`^${path.resolve(workspaceRoot, 'release')}/.*`),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
