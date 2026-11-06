// The editor's helper on the dev server (only under `npm run dev`, never in the published site). It reads the site's content from
// the project for the editor and saves what the editor publishes and uploads straight back into it, so publishing is just committing
// and pushing.
//   GET  <base>__editor/site/    ->  src/data/site.json (the profile, the dive log's entries, the Library's books)
//   GET  <base>__editor/sound/   ->  src/data/sound.json (Sound's albums)
//   POST <base>__editor/save/    body: { site, sound }  ->  { ok }  (writes both files)
//   POST <base>__editor/upload/?dir=<folder>&name=<file name>    body: the file  ->  { path }  (saved under public/<folder>/; the
//        path is relative to the site)
// The editor reads the content here rather than importing it, so saving doesn't reload the editor.
import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const PROJECT = fileURLToPath(new URL('../../', import.meta.url));

// the folders under public/ an upload may go into, and what each takes: sound files in audio/, pictures elsewhere (nothing a browser
// would run, like .svg or .html, gets published)
const SOUNDS = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.oga', '.opus', '.flac'],
  PICTURES = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const FOLDERS = { audio: SOUNDS, 'images/sound': PICTURES, 'images/library': PICTURES, 'images/entries': PICTURES };
const MAX_BYTES = 300 * 1024 * 1024;

const send = (res, code, answer) => {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(answer));
};

/**
 * Only the editor's own page may use the helper: another site open in the browser could otherwise post to localhost and overwrite the
 * site's content. (Browsers send Origin with a POST, and Sec-Fetch-Site says where a request came from.)
 */
function fromEditor(req) {
  const site = req.headers['sec-fetch-site'],
    origin = req.headers.origin;
  if (site && site !== 'same-origin' && site !== 'none') return false;
  try {
    return !origin || new URL(origin).host === req.headers.host;
  } catch (e) {
    return false;
  }
}

/** A request's whole body (refused once it grows past MAX_BYTES). */
const bodyOf = req =>
  new Promise((resolve, reject) => {
    const parts = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BYTES) {
        reject(new Error('Too large'));
        req.destroy();
      } else parts.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(parts)));
    req.on('error', reject);
  });

/**
 * A plain, safe file name in `dir` for an upload called `raw`, made unique if another file already has it. The file is created here
 * ('wx' fails if the name is taken), so two uploads with the same name at once can't both get it. Gives { name, fd: the open file },
 * or null for a kind of file the folder doesn't take.
 */
function claimName(dir, raw, kinds) {
  const ext = path.extname(raw).toLowerCase(),
    base =
      path
        .basename(raw, path.extname(raw))
        .normalize('NFKD')
        .replace(/\p{M}/gu, '') // (accents come off: é becomes e)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'file';
  if (!kinds.includes(ext)) return null;
  for (let k = 1; ; k++) {
    const name = k > 1 ? `${base}-${k}${ext}` : base + ext;
    try {
      return { name, fd: fs.openSync(path.join(dir, name), 'wx') };
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }
  }
}

/**
 * An upload goes straight to its file as it arrives (it can be a long piece of music), stopping if it grows past MAX_BYTES; a failed
 * one is removed.
 */
async function saveTo(req, file, fd) {
  let size = 0;
  const cap = new Transform({
    transform(chunk, _, done) {
      size += chunk.length;
      done(size > MAX_BYTES ? new Error('File too large') : null, chunk);
    },
  });
  try {
    await pipeline(req, cap, fs.createWriteStream(null, { fd }));
  } catch (e) {
    fs.rmSync(file, { force: true });
    throw e;
  }
}

const readJson = async file => JSON.parse(await fs.promises.readFile(file, 'utf8'));
const writeJson = (file, data) => fs.promises.writeFile(file, JSON.stringify(data, null, 2) + '\n');

/** The helper, as a middleware for the dev server. root: the project's folder. */
export function editorApi(root = PROJECT) {
  const siteFile = path.join(root, 'src/data/site.json'),
    soundFile = path.join(root, 'src/data/sound.json'),
    publicDir = path.join(root, 'public');

  const routes = {
    // (a file that can't be read is an error, never an empty list: the editor would take that for the content and save it back)
    async site(req, res) {
      try {
        send(res, 200, await readJson(siteFile));
      } catch (e) {
        send(res, 500, { error: 'src/data/site.json could not be read: ' + e.message });
      }
    },
    async sound(req, res) {
      try {
        send(res, 200, await readJson(soundFile));
      } catch (e) {
        // (no sound.json yet is simply no albums)
        if (e.code === 'ENOENT') send(res, 200, { albums: [] });
        else send(res, 500, { error: 'src/data/sound.json could not be read: ' + e.message });
      }
    },
    async upload(req, res, url) {
      const folder = url.searchParams.get('dir');
      if (!Object.hasOwn(FOLDERS, folder)) return send(res, 400, { error: 'Unknown folder' });
      const dir = path.join(publicDir, folder);
      fs.mkdirSync(dir, { recursive: true });
      const claimed = claimName(dir, url.searchParams.get('name') || 'file', FOLDERS[folder]);
      if (!claimed) return send(res, 400, { error: 'That kind of file isn’t taken here' });
      await saveTo(req, path.join(dir, claimed.name), claimed.fd);
      send(res, 200, { path: folder + '/' + claimed.name });
    },
    async save(req, res) {
      const { site, sound } = JSON.parse((await bodyOf(req)).toString('utf8'));
      if (!site || !Array.isArray(site.entries) || !sound || !Array.isArray(sound.albums))
        return send(res, 400, { error: 'Nothing to save' });
      fs.mkdirSync(path.dirname(siteFile), { recursive: true });
      await Promise.all([writeJson(siteFile, site), writeJson(soundFile, sound)]);
      send(res, 200, { ok: true });
    },
  };

  return async (req, res, next) => {
    const url = new URL(req.url, 'http://x'),
      route = (url.pathname.match(/\/__editor\/(site|sound|upload|save)\/?$/) || [])[1];
    if (!route) return next();
    if (!fromEditor(req)) return send(res, 403, { error: 'Only the editor can use this' });
    const writes = route === 'upload' || route === 'save';
    if (writes && req.method !== 'POST') return send(res, 405, { error: 'POST only' });
    try {
      await routes[route](req, res, url);
    } catch (e) {
      send(res, 500, { error: String(e.message || e) });
    }
  };
}
