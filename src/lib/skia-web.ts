/**
 * Native (iOS / Android) build of `ensureSkiaWeb` — a no-op.
 *
 * Skia is a native module on iOS/Android, so there is nothing to initialise.
 * This file intentionally contains **no** reference to
 * `@shopify/react-native-skia/lib/module/web`: that entry pulls in
 * `canvaskit-wasm`, which does `require("fs")`, and Metro bundles the module
 * graph statically — a `Platform.OS !== 'web'` runtime guard would not stop it
 * from resolving `fs` during the native bundle ("Unable to resolve module fs").
 *
 * Web resolves `skia-web.web.ts` (Metro platform extensions), which performs
 * the real CanvasKit setup before any Skia-importing module is evaluated.
 */
export function ensureSkiaWeb(): Promise<void> {
  return Promise.resolve();
}
