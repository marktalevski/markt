import { defineConfig } from 'astro/config';
import { editorApi } from './src/dev/editor-api.mjs';

/**
 * The editor is a private tool: it exists only under `npm run dev` and is never part of the published site. This adds its page
 * (/editor/), React (the editor is the one thing written in it, so the site itself is built without it) and the editor's helper on
 * the dev server, which saves what the editor uploads and publishes straight into the project.
 */
const editor = {
  name: 'editor',
  hooks: {
    'astro:config:setup': async ({ command, injectRoute, updateConfig }) => {
      if (command !== 'dev') return;
      const { default: react } = await import('@astrojs/react');
      updateConfig({ integrations: [react()] });
      injectRoute({ pattern: '/editor', entrypoint: './src/editor/editor.astro' });
    },
    // (this one runs only when the dev server starts)
    'astro:server:setup': ({ server }) => {
      server.middlewares.use(editorApi());
    },
  },
};

// GitHub Pages serves the site at marktalevski.github.io/markt/
export default defineConfig({
  site: 'https://marktalevski.github.io',
  base: '/markt',
  trailingSlash: 'always',
  integrations: [editor],
  // CSS is shipped as written: minifiers round colours' transparency (rgba(…, .06) becomes #…0f), which shifts painted textures by a shade
  vite: { build: { cssMinify: false } },
});
