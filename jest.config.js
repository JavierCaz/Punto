/** Jest configuration — mirror the sibling "anvil" app's transformIgnorePatterns. */

module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-reanimated|react-native-worklets|victory-native|@noble/hashes))',
  ],
  moduleNameMapper: {
    // Force the pure-JS PBKDF2 reference in tests: Jest's React Native haste
    // config resolves `.native.ts` platform files, which would load the native
    // quick-crypto module (and its Nitro runtime) that does not exist under Node.
    '^@/lib/pbkdf2$': '<rootDir>/src/lib/pbkdf2.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Test doubles (e.g. src/db/repositories/__tests__/fakes/*.ts) are helpers,
  // not suites — keep them out of the test runner.
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/fakes/'],
};
