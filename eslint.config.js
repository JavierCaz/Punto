// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Build output and the isolated Electron shell package are not linted by
    // the Expo app config (the shell is plain Node/CommonJS).
    ignores: ["dist/**", "electron/**"],
  }
]);
