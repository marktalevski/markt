# markt

Mark's personal site: <https://marktalevski.github.io/markt/>

Built with [Astro](https://astro.build). Every push to `main` publishes the site through GitHub Pages (`.github/workflows/deploy.yml`).

## Pages

| Address | Page | Code |
|---|---|---|
| `/markt/` | Home: a brush-painted symbol whose lines lead to the other pages | `src/pages/index.astro`, `src/home/` |
| `/markt/freediving/` | Freediving: the dive log, as a dive down a rope | `src/pages/freediving.astro`, `src/freediving/` |
| `/markt/sound/` | Sound: the albums, played on a painted deck | `src/pages/sound.astro`, `src/sound/` |
| `/markt/library/` | Library: a stack of painted books to read (`/markt/journal/` forwards here) | `src/pages/library.astro`, `src/library/` |

## How the code is laid out

Each page is plain markup, a stylesheet and a handful of small JavaScript modules. The published site uses no framework.

- `src/pages/`: one `.astro` file per page, holding the markup the page starts from.
- `src/home/`, `src/freediving/`, `src/sound/`, `src/library/`: each page's stylesheet and modules. `main.js` is the page's state and what a visitor can do on it; the other files are named for what they work out or paint (`layout.js`, `scene.js` and so on), and each starts with a comment saying what it is for.
- `src/lib/`: what the pages share. The frame loop, which also keeps the frames even on a device that can't keep up (`loop.js`), the menu and the hand-off of its dots from page to page (`menu.js`, `nav.js`), the picture that covers the moment between two pages (`cover.js`), the paper grain (`paper.js`), the deck's layout (`deck-layout.js`), and small helpers.
- `src/layouts/Base.astro`, `src/components/PageMenu.astro`, `src/styles/menu.css`: the shell every page sits in, and the menu.
- `src/data/`: the site's content. `site.json` holds the dive log's entries and the Library's books, `sound.json` the albums. Both are built into the pages.
- `public/`: photos (`images/`) and sound files (`audio/`), published as they are.
- `src/editor/`, `src/dev/`: the editor and the symbol picker (below). They exist only on your own computer and are never published.

## Editing the site

Run `npm run dev` and open the editor at <http://localhost:4321/markt/editor/>. It has three tabs:

- **Freediving**: the dive log's entries.
- **Sound**: the albums, each with a photo and its pieces (title, date, kind, and the sound file).
- **Library**: the five books' titles, subtitles and contents, with an optional photo on each passage or piece.

Changes are kept in that browser as you go. Uploaded songs go into `public/audio/` and photos into `public/images/` straight away. **Save to site** writes the content into the project (`src/data/site.json` and `src/data/sound.json`); then commit and push to publish. **Export backup** downloads everything as one file, and **Import** brings a backup back.

Photos are scaled down to 1600px before they are uploaded. Songs are uploaded as they are; MP3 or M4A keeps them small (GitHub refuses single files over 100 MB).

The editor (`src/editor/`) is the one part written in React. Its helper on the dev server (`src/dev/editor-api.mjs`) is what reads and writes the project's files.

## Tools for working on the site

- **Symbol picker**: under `npm run dev`, Home shows a list of its symbols down the left. Click one to paint it, or step through them with ← and →; H hides the list (`src/dev/symbol-picker.js`).
- **Frame meter**: add `?fps` to the end of any page's address, on the published site too, to see how long each frame takes on that device. It stays on from page to page; `?fps=0` turns it off (`src/lib/fps-meter.js`). If the page has settled at an easier pace for the device, its top right corner says which: `1/2` is a frame for every second frame of the screen, `x0.7` is canvases drawn with 0.7 of the pixels each way.
- `npm run lint` checks the code (ESLint and Prettier), and `npm run format` tidies its formatting.

## Design files

`Mark-T-Website/` holds the original Claude Design prototypes the site grew out of. They are kept for reference; nothing in the site uses them.

## Running it locally

```bash
npm install
npm run dev
```
