/**
 * Metro emits `*.wasm` imports as an asset URL (see `metro.config.js`, which
 * registers `wasm` in `resolver.assetExts`).
 */
declare module '*.wasm' {
  const url: string;
  export default url;
}
