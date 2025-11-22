import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import pluginPrettier from 'eslint-plugin-prettier';

export default [
  {
    files: ['service-worker.js', '**/*.js'], // Lint all JS files
    ignores: ['dist/**', 'node_modules/**'], // Ignore build/output dirs
    languageOptions: {
      ecmaVersion: 'latest', // ES6+ support
      sourceType: 'module', // ES modules
      globals: {
        ...globals.serviceworker,
        ...globals.browser, // Browser globals (e.g., window, document)
        ...globals.es2021, // Modern ES features
      },
    },
    plugins: {
      prettier: pluginPrettier,
    },
    rules: {
      ...js.configs.recommended.rules, // Standard JS rules
      ...prettier.rules, // Prettier integration
      'prettier/prettier': 'error', // Enforce Prettier as errors
      'no-console': 'off', // TODO: Turn on later
      'no-unused-vars': 'off', // Catch unused vars
    },
  },
];
