// OfflinePOS desktop shell. Loads the Vite build from a privileged custom
// scheme (`app://`) so the renderer keeps a real, secure, persistent origin:
// OPFS (SQLite storage) and Web Serial (USB thermal printer) both require a
// secure context, which a plain `file://` page cannot provide.
const {
  app,
  BrowserWindow,
  net,
  protocol,
  shell,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const DEV_URL = process.env.OFFLINEPOS_DEV_URL || "";
const DIST = path.join(__dirname, "..", "dist");

app.setName("OfflinePOS");

// The scheme must be privileged *before* the app is ready.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function contentType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#0b1220",
    title: "OfflinePOS",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  // USB thermal printers: allow the Web Serial permission, auto-permit serial
  // devices, and auto-select the first port on `navigator.serial.requestPort()`
  // (a cash register has exactly one printer). Everything else stays denied.
  const ses = win.webContents.session;
  ses.setPermissionCheckHandler((_wc, permission) => permission === "serial");
  ses.setPermissionRequestHandler((_wc, permission, callback) =>
    callback(permission === "serial"),
  );
  ses.setDevicePermissionHandler((details) => details.deviceType === "serial");

  win.webContents.on("select-serial-port", (event, portList, callback) => {
    event.preventDefault();
    callback(portList[0] ? portList[0].portId : "");
  });

  // Keep the shell a shell: no renderer navigation, no new windows.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(DEV_URL || "app://")) event.preventDefault();
  });

  const target = DEV_URL || "app://bundle/index.html";
  win
    .loadURL(target)
    .catch((err) => {
      console.error(`[offlinepos] failed to load ${target}:`, err);
      app.exit(1);
    });

  return win;
}

// Serve the built app from the asar-aware fs (reads straight through app.asar).
function serveBundle() {
  protocol.handle("app", (request) => {
    const url = new URL(request.url);
    let rel = decodeURIComponent(url.pathname);
    if (rel === "/") rel = "/index.html";
    const target = path.resolve(DIST, `.${rel}`);
    const inside =
      target === DIST || target.startsWith(`${DIST}${path.sep}`) || target.startsWith(`${DIST}/`);
    if (!inside) return new Response("Not found", { status: 404 });

    return fs.promises
      .readFile(target)
      .then(
        (buffer) =>
          new Response(new Uint8Array(buffer), {
            headers: { "content-type": contentType(target) },
          }),
        () => new Response("Not found", { status: 404 }),
      );
  });
}

// Single instance: a second launch focuses the existing window instead.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    serveBundle();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  // `--smoke-test` boots the app and exits 0 once the page finishes loading,
  // so CI (and local runs) can verify the shell without a human looking at it.
  const smoke = process.argv.includes("--smoke-test");
  if (smoke) {
    app.whenReady().then(() => {
      const win = BrowserWindow.getAllWindows()[0];
      const timer = setTimeout(() => {
        console.error("[offlinepos] smoke test: timed out waiting for load");
        app.exit(1);
      }, 30000);
      win.webContents.once("did-finish-load", () => {
        win.webContents
          .executeJavaScript(
            "({ title: document.title, rendered: document.querySelector('#root')?.children.length > 0, serial: 'serial' in navigator, products: document.querySelectorAll('main button').length, desktop: Boolean(window.offlinepos?.isElectron) })",
          )
          .then((probe) => {
            clearTimeout(timer);
            console.log(`[offlinepos] smoke test: ${JSON.stringify(probe)}`);
            app.exit(probe.rendered ? 0 : 1);
          })
          .catch((err) => {
            clearTimeout(timer);
            console.error("[offlinepos] smoke test: probe failed", err);
            app.exit(1);
          });
      });
      win.webContents.once("did-fail-load", (_e, code, desc) => {
        clearTimeout(timer);
        console.error(`[offlinepos] smoke test: load failed ${code} ${desc}`);
        app.exit(1);
      });
    });
  }
}
