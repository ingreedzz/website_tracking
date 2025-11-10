// Minimal ESLint flat config to allow ESLint v9 to run while still using
// the project's .eslintrc.json semantics where possible.
module.exports = {
  languageOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: {
    // no-op; keeps ESLint from complaining about no plugins
  },
  settings: {},
  rules: {
    // Mirror a couple of sensible defaults; the .eslintrc.json will still
    // be read by other tools and editors.
    // Ignore intentionally-underscored variables and args (catch params, etc.)
  'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    'no-console': 'off',
  },
};
