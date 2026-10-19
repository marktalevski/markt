# markt

Mark's personal site: <https://marktalevski.github.io/markt/>

Built with [Astro](https://astro.build). Every push to `main` publishes the site through GitHub Pages (`.github/workflows/deploy.yml`).

## Pages

| Address | File |
|---|---|
| `/markt/` | Home, the brush-painted symbol (`src/components/Home.jsx`) |
| `/markt/freediving/` | Dive log (`src/components/Freediving.jsx`) |
| `/markt/sound/` | Sound: album photos, waveform and mixer panel (`src/components/Sound.jsx`, photos in `public/images/`) |
| `/markt/library/` | Library: a stack of painted books to read (`src/components/Library.jsx`; the books are in `public/data/site.json`, edited in the editor's Library tab); `/markt/journal/` forwards here |

The editor (`src/components/Editor.jsx`, page `src/editor/editor.astro`) is private: it only exists on your own computer while `npm run dev` is running, at <http://localhost:4321/markt/editor/>. It is never published.

Each component is the Claude Design prototype's own logic class, unchanged except for page links, plus its template rewritten as JSX. `src/lib/dc.js` supplies the small base class they expect.

## Dive log entries and Library books

The published entries (the Freediving tab) and the Library's books (the Library tab: each book's title, subtitle and contents) are in `public/data/site.json`; pages fetch it when they need it. To change them, run `npm run dev`, open the editor at <http://localhost:4321/markt/editor/>, edit (changes save in that browser only), click **Export JSON**, and save the downloaded `site.json` over `public/data/site.json`.

Photos uploaded in the editor are stored inside `site.json`, which makes it slower to load. For anything more than a few photos, put the image files in `public/images/` and paste their address (for example `/markt/images/dive-1.jpg`) into the entry's image field instead.

## Design files

`Mark-T-Website/` holds the Claude Design handoff the site was built from. When a new design version arrives there, run [`tools/convert-design.mjs`](tools/convert-design.mjs) into a scratch folder (`node tools/convert-design.mjs Mark-T-Website ../scratch-site`) and port only what changed. Never point it at this repo's `src/`: it would overwrite the site's own edits.

## Running it locally

```bash
npm install
npm run dev
```
