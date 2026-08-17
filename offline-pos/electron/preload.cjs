// Minimal preload bridge. Everything sensitive stays in the main process; the
// renderer only learns it is running in the desktop shell.
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("offlinepos", {
  isElectron: true,
  platform: process.platform,
  versions: {
    app: process.env.npm_package_version || "",
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});
