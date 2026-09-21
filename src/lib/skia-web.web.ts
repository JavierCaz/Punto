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
 * this promise resolves (see the lazy chart imports in the dashboard).
 *
 * This is the **web** implementation (Metro resolves `skia-web.web.ts` for
 * `platform=web`). Native resolves the no-op `skia-web.ts`, which must never
 * reference this module: `canvaskit-wasm` does `require("fs")` and would break
 * the native bundle (Metro cannot resolve Node core modules there).
 */
export function ensureSkiaWeb(): Promise<void> {
  if (!skiaWebPromise) {
    skiaWebPromise = (async () => {
      const { LoadSkiaWeb } = await import('@shopify/react-native-skia/lib/module/web');
      await LoadSkiaWeb({ locateFile: () => canvaskitWasmUrl });
    })();
  }
  return skiaWebPromise;
}
