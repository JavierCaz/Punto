import { Platform } from 'react-native';

// Bundled CanvasKit — never a CDN, so the app stays fully offline-first.
import canvaskitWasmUrl from 'canvaskit-wasm/bin/full/canvaskit.wasm';

let skiaWebPromise: Promise<void> | null = null;

/**
 * Initialises CanvasKit for `@shopify/react-native-skia` on web.
 *
 * Skia's web build constructs its API exactly once, at import time, from
 * `global.CanvasKit` (`Skia.web.js`: `JsiSkApi(global.CanvasKit)`). If a module
 * that imports Skia — directly or through `victory-native` — is evaluated
 * before CanvasKit is ready, the API closes over `undefined` and every call
 * throws (`Cannot read properties of undefined (reading 'XYWHRect')`).
 *
 * Anything that pulls in Skia must therefore be dynamically imported only after
 * this promise resolves (see the lazy chart imports in the dashboard). No-op on
 * native, where Skia is a native module.
 */
export function ensureSkiaWeb(): Promise<void> {
  if (Platform.OS !== 'web') {
    return Promise.resolve();
  }
  if (!skiaWebPromise) {
    skiaWebPromise = (async () => {
      const { LoadSkiaWeb } = await import('@shopify/react-native-skia/lib/module/web');
      await LoadSkiaWeb({ locateFile: () => canvaskitWasmUrl });
    })();
  }
  return skiaWebPromise;
}
