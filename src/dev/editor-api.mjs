// The editor's helper on the dev server (only under `npm run dev`, never in the published site): it saves what the editor uploads and
// publishes straight into the project, so publishing is just committing and pushing.
//   POST <base>__editor/upload/?dir=<dir>&name=<file name>  body: the file  ->  { path }  (saved under public/<dir>/, path relative to the site)
//   POST <base>__editor/save/  body: { site, sound }  ->  { ok }  (public/data/site.json and src/data/sound.json)
//   GET  <base>__editor/sound/  ->  src/data/sound.json (the editor reads it here rather than importing it, so saving doesn't reload the editor)
import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const DIRS = ['audio', 'images/sound', 'images/library', 'images/entries'];
// what each folder takes: sound files in audio/, pictures elsewhere (nothing a browser would run, like .svg or .html, gets published)
const EXTS = { audio: ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.oga', '.opus', '.flac'], images: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] };
const MAX = 300 * 1024 * 1024;

const body = req => new Promise((res, rej) => { const parts = []; let n = 0;
  req.on('data', c => { n += c.length; if (n > MAX) { rej(new Error('Too large')); req.destroy(); } else parts.push(c); });
  req.on('end', () => res(Buffer.concat(parts))); req.on('error', rej); });
// an upload goes straight to its file as it arrives (it can be a long piece of music), stopping if it grows past MAX; a failed one is removed
const saveTo = async (req, file, fd) => { let n = 0;
  const cap = new Transform({ transform(c, _, cb) { n += c.length; cb(n > MAX ? new Error('File too large') : null, c); } });
  try { await pipeline(req, cap, fs.createWriteStream(null, { fd })); } catch (e) { fs.rmSync(file, { force: true }); throw e; } };
const send = (res, code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };
// a plain, safe file name, made unique if another file already has it: the file is created here ('wx' fails if the name is taken), so two
// uploads with the same name at once can't both get it. Gives the name and the open file, or null for a kind of file the folder doesn't take
const claimName = (dir, raw, exts) => {
  const ext = path.extname(raw).toLowerCase(), base = path.basename(raw, path.extname(raw)).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
  if (!exts.includes(ext)) return null;
  for (let k = 1; ; k++) { const name = k > 1 ? `${base}-${k}${ext}` : base + ext;
    try { return { name, fd: fs.openSync(path.join(dir, name), 'wx') }; } catch (e) { if (e.code !== 'EEXIST') throw e; } }
};
// only the editor's own page may use the helper: another site open in the browser could otherwise post to localhost and overwrite the
// site's content (browsers send Origin with a POST, and Sec-Fetch-Site says where a request came from)
const fromEditor = req => { const site = req.headers['sec-fetch-site'], origin = req.headers.origin;
  if (site && site !== 'same-origin' && site !== 'none') return false;
  try { return !origin || new URL(origin).host === req.headers.host; } catch (e) { return false; } };

export function editorApi({ root, publicDir }) {
  return async (req, res, next) => {
    const url = new URL(req.url, 'http://x'), m = url.pathname.match(/\/__editor\/(upload|save|sound)\/?$/);
    if (!m) return next();
    if (!fromEditor(req)) return send(res, 403, { error: 'Only the editor can use this' });
    // no sound.json yet is no albums; one that can't be read is an error, so the editor doesn't take it for an empty list and save that
    if (m[1] === 'sound') { try { return send(res, 200, JSON.parse(await fs.promises.readFile(path.join(root, 'src/data/sound.json'), 'utf8'))); } catch (e) { return e.code === 'ENOENT' ? send(res, 200, { albums: [] }) : send(res, 500, { error: 'src/data/sound.json could not be read: ' + e.message }); } }
    if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
    try {
      if (m[1] === 'upload') {
        const dir = url.searchParams.get('dir'); if (!DIRS.includes(dir)) return send(res, 400, { error: 'Unknown folder' });
        const abs = path.join(publicDir, dir); fs.mkdirSync(abs, { recursive: true });
        const got = claimName(abs, url.searchParams.get('name') || 'file', EXTS[dir === 'audio' ? 'audio' : 'images']); if (!got) return send(res, 400, { error: 'That kind of file isn’t taken here' });
        await saveTo(req, path.join(abs, got.name), got.fd);
        return send(res, 200, { path: dir + '/' + got.name });
      }
      const d = JSON.parse((await body(req)).toString('utf8'));
      if (!d.site || !Array.isArray(d.site.entries) || !d.sound || !Array.isArray(d.sound.albums)) return send(res, 400, { error: 'Nothing to save' });
      fs.mkdirSync(path.join(root, 'src/data'), { recursive: true });
      await Promise.all([fs.promises.writeFile(path.join(publicDir, 'data/site.json'), JSON.stringify(d.site, null, 2) + '\n'),
        fs.promises.writeFile(path.join(root, 'src/data/sound.json'), JSON.stringify(d.sound, null, 2) + '\n')]);
      return send(res, 200, { ok: true });
    } catch (e) { return send(res, 500, { error: String(e.message || e) }); }
  };
}
