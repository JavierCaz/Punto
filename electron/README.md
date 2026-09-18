# Punto Desktop (Electron shell)

Wraps the Punto static web export (`npx expo export -p web` → `../dist/`) in an
Electron app and packages it with [electron-builder](https://www.electron.build/).

This is an **isolated sibling package**: it has its own `node_modules` and is not
an npm workspace, so Electron/electron-builder never enter the Expo app's
dependency graph or Metro's resolution.

## How it works (and why not `file://`)

The main process starts a tiny loopback HTTP server for `dist/` and loads
`http://127.0.0.1:<port>/` in a sandboxed renderer.

Serving over HTTP instead of opening `dist/index.html` with `file://` is not a
stylistic choice — it is required:

1. **`session.webRequest` never sees `file://` requests**, so COEP/COOP cannot be
   injected for them ([electron#23485](https://github.com/electron/electron/issues/23485)).
   Without those headers `self.crossOriginIsolated` is `false`, `SharedArrayBuffer`
   is unavailable, and expo-sqlite's wa-sqlite web worker fails.
2. The static export references assets with **absolute paths** (`/_expo/...`),
   which do not resolve from a `file://` document.

In `main.js`:

```js
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Cross-Origin-Embedder-Policy': ['credentialless'],
      'Cross-Origin-Opener-Policy': ['same-origin'],
    },
  });
});
```

`credentialless` matches what `metro.config.js` serves in `expo start --web`.

### The port is part of the origin

Browser storage — including **OPFS, where the web build keeps its SQLite
database** — is scoped to the origin, port included. A random port each launch
would make the app look empty every restart, so the chosen origin (host + port)
is persisted atomically in `<userData>/desktop-shell.json` and reused. If the
port is ever taken, the shell scans `DEFAULT_PORT..DEFAULT_PORT+20`; when the
resulting origin differs from the previous one it shows a warning dialog instead
of silently presenting an empty database.

## Prerequisites

- Node.js 20+
- `npm install` **inside this directory** (`npm --prefix electron install`)
- A fresh web export: `npm run export:web`

## Commands

Run from the repo root or from `electron/`.

| Command | What it does |
|---|---|
| `npm run export:web` | `expo export -p web` with `EAS_BUILD_PROFILE=production` (cross-platform wrapper) |
| `npm start` | Launch against the existing `dist/` (no re-export) |
| `npm run dev` | Export, then launch |
| `npm run pack` | Export, then build an unpacked app (`release/*-unpacked`) |
| `npm run dist` | Export, then build installers for the current OS |
| `npm run dist:win` / `dist:linux` / `dist:mac` | Target a specific OS |

Root convenience scripts: `npm run desktop:install`, `desktop:dev`,
`desktop:pack`, `desktop:dist`.

## Verifying cross-origin isolation

This is the one thing that must be true at runtime. In a dev build, open DevTools
and run:

```js
self.crossOriginIsolated   // true
typeof SharedArrayBuffer   // "function"
```

If `crossOriginIsolated` is `false`, the SQLite worker will fail. Use a recent
Electron: a regression in Electron 41 broke cross-origin isolation for non-`file`
origins and was fixed in [electron#50789](https://github.com/electron/electron/pull/50789)
(tracked in [electron#50242](https://github.com/electron/electron/issues/50242)).
`package.json` pins Electron exactly (`44.4.1`) so a broken minor cannot slip in.

## Packaging output

| OS | Target | Artifact |
|---|---|---|
| Windows | NSIS | `Punto-<version>-setup.exe` |
| Linux | AppImage | `Punto-<version>-<arch>.AppImage` |
| macOS | DMG | `Punto-<version>-<arch>.dmg` |

- The shell (`main.js`, `static-server.js`) is packed into `app.asar`; the web
  export is copied to `resources/dist` via `extraResources`.
- Icons come from `../assets/images/icon.png` (1024×1024, converted per platform).
- electron-builder cannot cross-build every target: build **macOS on macOS**;
  building the Windows NSIS installer on Linux/macOS needs Wine.

## Runtime safeguards

Beyond the headers, `main.js` hardens the runtime on every launch:

- **Cross-origin isolation is asserted** after first paint; if `crossOriginIsolated`
  is false the app shows an explicit error instead of a cryptic worker failure.
- **Persistent storage is requested** (`navigator.storage.persist()`) so the POS
  database is not treated as best-effort storage.
- **Permissions are deny-by-default**, allowing only clipboard read/write (used when
  copying receipts / JSON exports); camera, microphone and geolocation are refused.
- **External navigation is restricted** to `http(s):`/`mailto:` and opened in the OS
  browser; in-app navigation is confined to the export's own origin.

## Notes

- **Data location:** the desktop database lives in the Electron profile
  (`app.getPath('userData')`), in the origin-private file system of
  `http://127.0.0.1:<port>`. Use Punto's JSON export for backups/portability.
- **Security:** the server binds to `127.0.0.1` only, serves `GET`/`HEAD`, rejects
  non-loopback `Host` headers (DNS-rebinding guard), and refuses to escape the web
  root. The renderer runs with `contextIsolation: true`, `nodeIntegration: false`,
  and `sandbox: true`; external links open in the OS browser.
- Re-run `npm run export:web` after any change to the Expo app — the shell loads
  the static bundle, not the Metro dev server.
- **expo-sqlite web is concurrency-sensitive.** Its worker does not guard VFS
  initialization, so two databases must never open at the same time or OPFS
  access-handle setup fails (`NoModificationAllowedError` / `xFileControl` of
  `undefined`) and the UI stays blank. `src/app/_layout.tsx` therefore opens the
  app database before hydrating the `expo-sqlite/kv-store`-backed stores; keep
  that ordering. Unfixed upstream as of expo-sqlite 57.0.3.
  - **Charts (Skia) on web need CanvasKit first.** `@shopify/react-native-skia`
  builds its web API once, at import time, from `global.CanvasKit`; importing
  `victory-native` before CanvasKit is ready makes every chart call throw
  (`XYWHRect` of `undefined`). `src/lib/skia-web.ts` loads the bundled CanvasKit
  wasm and the dashboard lazy-imports its charts through it. Keep chart modules
  out of static imports.
