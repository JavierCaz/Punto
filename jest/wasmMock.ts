/**
 * Jest stand-in for `*.wasm` asset imports. Metro emits a URL at build time
 * (see `src/types/assets.d.ts`); tests never actually load CanvasKit.
 */
const wasmAssetUrl = 'wasm-asset';
export default wasmAssetUrl;
