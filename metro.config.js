// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add wasm asset support — required by expo-sqlite web (wa-sqlite engine).
// See https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/#web-setup
config.resolver.assetExts.push('wasm');

// Add COEP and COOP headers to support SharedArrayBuffer (wa-sqlite web worker).
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
