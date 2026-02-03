// Jest configuration for the todo-app.
//
// Prerequisites -- run this once before executing tests:
//   npm install --save-dev jest jest-expo @testing-library/react-native
//
// The "jest-expo" preset handles:
//   - Babel transformation for JSX/TS via metro-react-native-babel-preset
//   - Module name mapping for react-native internals
//   - Platform-specific file resolution (.ios.js / .android.js / .web.js)
//
// jest.setup.js stubs out native modules (vector-icons, reanimated, gesture
// handler, haptics, expo-router, AsyncStorage) that have no JS fallback in a
// test runner environment.

module.exports = {
  preset: "jest-expo",

  // Global mock setup -- runs once per worker before any test file
  setupFiles: ["./jest.setup.js"],

  // Map the @/ path alias that tsconfig defines
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },

  // Ignore everything under node_modules except packages that ship
  // un-transpiled ESM or that need the metro transformer to be processed.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-clone-referenced-element|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-router|expo-haptics|@expo/vector-icons)",
  ],

  // Only collect coverage from the source directories we care about
  collectCoverageFrom: [
    "components/**/*.tsx",
    "hooks/**/*.ts",
    "store/**/*.tsx",
    "lib/**/*.ts",
    "!**/__tests__/**",
  ],
};
