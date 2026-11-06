// Lint rules: the standard recommended set, for the site's own JavaScript.
import js from '@eslint/js';
import globals from 'globals';

const unusedVars = (options = {}) => ['error', { args: 'after-used', caughtErrors: 'none', ...options }];

export default [
  { ignores: ['dist/', '.astro/', 'node_modules/', 'Mark-T-Website/', 'public/'] },
  js.configs.recommended,
  { rules: { 'no-unused-vars': unusedVars(), 'no-empty': ['error', { allowEmptyCatch: true }] } },
  // the site: code that runs in the browser
  { files: ['src/**/*.{js,jsx}'], languageOptions: { globals: globals.browser } },
  // the editor is written in JSX, where using a component (<Field />) doesn't count as using its name: capitalised names are let off
  {
    files: ['src/**/*.jsx'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: { 'no-unused-vars': unusedVars({ varsIgnorePattern: '^[A-Z]' }) },
  },
  // code that runs in Node: the editor's helper on the dev server, and the config files
  { files: ['src/dev/**/*.mjs', '*.{js,mjs}'], languageOptions: { globals: globals.node } },
];
