'use strict';

/**
 * Punto desktop shell (Electron main process).
 *
 * It serves the Expo static web export over loopback HTTP and loads it in a
 * sandboxed renderer. Two non-obvious constraints drive this design:
 *
 *   - Cross-origin isolation (COEP/COOP) is mandatory because expo-sqlite's web
 *     engine (wa-sqlite) needs `SharedArrayBuffer`. `session.webRequest` cannot
 *     inject headers into `file://` responses, so the export is served over
 *     HTTP where the hook actually fires.
 *   - The origin must stay stable across launches: OPFS — where the web build
 *     stores its SQLite database — is keyed by origin, port included. The chosen
 *     port is therefore persisted under `userData` and reused.
 */

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, dialog, session, shell } = require('electron');
const { startStaticServer } = require('./static-server');

const LOCAL_HOST = '127.0.0.1';
const DEFAULT_PORT = 4517;
const PORT_SCAN_RANGE = 20;
const STATE_FILE = 'desktop-shell.json';
const EXTERNAL_PROTOCOLS = /^(https?|mailto):/i;
const ALLOWED_PERMISSIONS = new Set(['clipboard-read', 'clipboard-sanitized-write']);
const isDevelopment = !app.isPackaged;

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;
/** @type {import('node:http').Server | null} */
let staticServer = null;
/** @type {string | null} */
let appOrigin = null;

/** Directory holding the Expo static web export (`npx expo export -p web`). */
function resolveWebRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'dist')
    : path.join(__dirname, '..', 'dist');
}

function isAppUrl(url, origin) {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

/** Read the last launch's origin so a port change can be surfaced, not hidden. */
function readPersistedState(statePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return {
      port: Number.isInteger(parsed.port) && parsed.port > 0 ? parsed.port : null,
      origin: typeof parsed.origin === 'string' ? parsed.origin : null,
    };
  } catch {
    return { port: null, origin: null };
  }
}

/** Atomic write: a truncated state file would silently change the data origin. */
function persistState(statePath, state) {
  const tempPath = `${statePath}.tmp`;
  try {
    fs.writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`);
    fs.renameSync(tempPath, statePath);
  } catch (error) {
    console.warn('[punto] Could not persist the desktop origin:', error.message);
  }
}

/**
 * Bind the static server to a stable port, preferring the one used last launch.
 * Falls back to nearby ports (then to an OS-assigned one) if it is taken.
 */
async function startServerWithStablePort(root) {
  const statePath = path.join(app.getPath('userData'), STATE_FILE);
  const previous = readPersistedState(statePath);

  const candidates = [];
  if (previous.port) candidates.push(previous.port);
  for (let offset = 0; offset <= PORT_SCAN_RANGE; offset += 1) {
    candidates.push(DEFAULT_PORT + offset);
  }

  let result = null;
  for (const port of candidates) {
    try {
      result = await startStaticServer({ root, host: LOCAL_HOST, port });
      break;
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
    }
  }
  if (!result) {
    result = await startStaticServer({ root, host: LOCAL_HOST, port: 0 });
  }

  persistState(statePath, { port: result.port, origin: result.origin });
  return { ...result, previousOrigin: previous.origin };
}

/**
 * Make the renderer cross-origin isolated so `SharedArrayBuffer` is available.
 * `webRequest` only observes real network requests, which is why the export is
 * served over loopback HTTP instead of being opened with `file://`.
 */
function installCrossOriginIsolationHeaders(targetSession, origin) {
  targetSession.webRequest.onHeadersReceived((details, callback) => {
    if (!isAppUrl(details.url, origin)) {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Embedder-Policy': ['credentialless'],
        'Cross-Origin-Opener-Policy': ['same-origin'],
      },
    });
  });
}

/** Deny-by-default permissions, keeping only clipboard (receipt/JSON copying). */
function configurePermissions(targetSession) {
  targetSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });
  targetSession.setPermissionCheckHandler((_webContents, permission) =>
    ALLOWED_PERMISSIONS.has(permission),
  );
}

/**
 * Fail loudly if cross-origin isolation did not take effect, and ask for
 * persistent storage so the POS database is not treated as best-effort.
 */
function verifyRendererCapabilities(webContents) {
  webContents.once('did-finish-load', async () => {
    try {
      const capabilities = await webContents.executeJavaScript(
        `({ crossOriginIsolated: self.crossOriginIsolated, sharedArrayBuffer: typeof SharedArrayBuffer })`,
      );
      if (!capabilities.crossOriginIsolated || capabilities.sharedArrayBuffer !== 'function') {
        dialog.showErrorBox(
          'Punto could not enable local database support',
          'Cross-origin isolation is unavailable, so the embedded database cannot start.\n\n' +
            'Please update to the latest Punto build.',
        );
        return;
      }
    } catch (error) {
      console.warn('[punto] Could not verify cross-origin isolation:', error.message);
    }

    try {
      const persisted = await webContents.executeJavaScript(
        'navigator.storage && navigator.storage.persist ? navigator.storage.persist() : false',
      );
      if (!persisted) {
        console.warn(
          '[punto] Storage was not marked persistent; the database may be evicted under storage pressure.',
        );
      }
    } catch (error) {
      console.warn('[punto] Could not request persistent storage:', error.message);
    }
  });
}

function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function openExternal(url) {
  if (EXTERNAL_PROTOCOLS.test(url)) void shell.openExternal(url);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#F8FAFC',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDevelopment,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const { webContents } = mainWindow;

  // Trusted local content may only navigate inside the export; everything else
  // is handed off to the OS browser, and only for known-safe protocols.
  webContents.on('will-navigate', (event, url) => {
    if (appOrigin && isAppUrl(url, appOrigin)) return;
    event.preventDefault();
    openExternal(url);
  });

  webContents.setWindowOpenHandler(({ url }) => {
    if (appOrigin && isAppUrl(url, appOrigin)) {
      void mainWindow?.loadURL(url);
    } else {
      openExternal(url);
    }
    return { action: 'deny' };
  });

  webContents.on('will-attach-webview', (event) => event.preventDefault());

  webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return; // ERR_ABORTED — a superseded in-page navigation.
    dialog.showErrorBox(
      'Punto failed to load',
      `${errorDescription} (${errorCode})\n${validatedURL}`
    );
  });

  verifyRendererCapabilities(webContents);

  void mainWindow.loadURL(`${appOrigin}/`);
}

async function bootstrap() {
  const webRoot = resolveWebRoot();
  if (!fs.existsSync(path.join(webRoot, 'index.html'))) {
    throw new Error(
      `Web export not found at ${webRoot}.\n\n` +
        'Run "npx expo export -p web" in the project root first.',
    );
  }

  const { server, origin, previousOrigin } = await startServerWithStablePort(webRoot);
  staticServer = server;
  appOrigin = origin;

  installCrossOriginIsolationHeaders(session.defaultSession, origin);
  configurePermissions(session.defaultSession);
  createWindow();

  if (previousOrigin && previousOrigin !== origin) {
    await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Punto data origin changed',
      message: `The previous session used ${previousOrigin}, but that port was unavailable.`,
      detail:
        `Punto is now running on ${origin}. Local data is stored per origin, so the ` +
        'database created in the previous session may not be visible here. Close the ' +
        'other application using that port and restart Punto to return to it.',
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', focusMainWindow);

  app
    .whenReady()
    .then(bootstrap)
    .catch((error) => {
      dialog.showErrorBox('Punto could not start', error.message);
      app.quit();
    });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  staticServer?.close();
});
