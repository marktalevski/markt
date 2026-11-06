// Lint rules: the standard recommended set, for the site's own JavaScript (browser code in src/, Node code for the dev helper and config).
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', '.astro/', 'node_modules/', 'Mark-T-Website/', 'public/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: { 'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'none', varsIgnorePattern: '^(React|[A-Z][A-Za-z]*)$' }], 'no-empty': ['error', { allowEmptyCatch: true }] },
  },
  {
    files: ['src/dev/**/*.mjs', '*.{js,mjs}', 'tools/**/*.mjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: globals.node },
    rules: { 'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'none' }], 'no-empty': ['error', { allowEmptyCatch: true }] },
  },
];
