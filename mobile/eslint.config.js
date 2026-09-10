const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const globals = require('globals')

const TEST_FILES = ['**/__tests__/**/*.{js,ts,tsx}', '**/*.test.{js,ts,tsx}']
const TEST_SUPPORT_FILES = ['jest.setup.js', 'src/test/**/*.{js,ts}']

module.exports = defineConfig([
  { ignores: ['src/types/database.ts'] },
  ...expoConfig,
  {
    files: TEST_FILES,
    languageOptions: { globals: globals.jest },
    rules: {
      // jest.mock() must precede the import of the mocked module
      'import/first': 'off',
    },
  },
  {
    files: TEST_SUPPORT_FILES,
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
  },
])
