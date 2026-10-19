import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';
import { editorApi } from './src/dev/editor-api.mjs';

// The editor and the Home symbol picker are private tools: they exist only under `npm run dev` and are never part of the published site.
// The editor's helper (src/dev/editor-api.mjs) saves its uploads and published data straight into the project.
let paths = null;
const editorLocalOnly = {
  name: 'editor-local-only',
  hooks: {
    'astro:config:setup': ({ command, config, injectRoute, injectScript }) => {
      if (command !== 'dev') return;
      paths = { root: fileURLToPath(config.root), publicDir: fileURLToPath(config.publicDir), base: config.base.replace(/\/?$/, '/') };
      injectRoute({ pattern: '/editor', entrypoint: './src/editor/editor.astro' });
      injectScript('page', `import '/src/dev/symbol-picker.js';`);
    },
    'astro:server:setup': ({ server }) => { if (paths) server.middlewares.use(editorApi(paths)); },
  },
};

// GitHub Pages serves the site at marktalevski.github.io/markt/
export default defineConfig({
  site: 'https://marktalevski.github.io',
  base: '/markt',
  trailingSlash: 'always',
  integrations: [react(), editorLocalOnly],
});
