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

## Editing the site

Run `npm run dev` and open the editor at <http://localhost:4321/markt/editor/> (it only exists on your own computer, never on the published site). It has three tabs:

- **Freediving**: the dive log's entries.
- **Sound**: the albums, each with a photo and its pieces (title, date, kind, and the sound file).
- **Library**: the five books' titles, subtitles and contents, with an optional photo on each passage or piece.

Changes save in that browser as you go. Uploaded songs go into `public/audio/` and photos into `public/images/` straight away. **Save to site** writes the content into the project (`public/data/site.json` for the dive log and books, `src/data/sound.json` for the albums); then commit and push to publish. **Export backup** downloads everything as one file, and **Import** brings a backup back.

Photos are scaled down to 1600px before they are uploaded. Songs are uploaded as they are; MP3 or M4A keeps them small (GitHub refuses single files over 100 MB).

## Design files

`Mark-T-Website/` holds the Claude Design handoff the site was built from. When a new design version arrives there, run [`tools/convert-design.mjs`](tools/convert-design.mjs) into a scratch folder (`node tools/convert-design.mjs Mark-T-Website ../scratch-site`) and port only what changed. Never point it at this repo's `src/`: it would overwrite the site's own edits.

## Running it locally

```bash
npm install
npm run dev
```
