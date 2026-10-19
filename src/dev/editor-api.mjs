// The editor's helper on the dev server (only under `npm run dev`, never in the published site): it saves what the editor uploads and
// publishes straight into the project, so publishing is just committing and pushing.
//   POST <base>__editor/upload/?dir=<dir>&name=<file name>  body: the file  ->  { path }  (saved under public/<dir>/, path relative to the site)
//   POST <base>__editor/save/  body: { site, sound }  ->  { ok }  (public/data/site.json and src/data/sound.json)
//   GET  <base>__editor/sound/  ->  src/data/sound.json (the editor reads it here rather than importing it, so saving doesn't reload the editor)
import fs from 'node:fs';
import path from 'node:path';

const DIRS = ['audio', 'images/sound', 'images/library', 'images/entries'];
const MAX = 300 * 1024 * 1024;

const body = req => new Promise((res, rej) => { const parts = []; let n = 0;
  req.on('data', c => { n += c.length; if (n > MAX) { rej(new Error('File too large')); req.destroy(); } else parts.push(c); });
  req.on('end', () => res(Buffer.concat(parts))); req.on('error', rej); });
const send = (res, code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };
// a plain, safe file name, made unique if another file already has it
const nameFor = (dir, raw) => {
  const ext = path.extname(raw).toLowerCase().replace(/[^.a-z0-9]/g, ''), base = path.basename(raw, path.extname(raw)).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
  let name = base + ext, k = 2; while (fs.existsSync(path.join(dir, name))) name = `${base}-${k++}${ext}`; return name;
};

export function editorApi({ root, publicDir }) {
  return async (req, res, next) => {
    const url = new URL(req.url, 'http://x'), m = url.pathname.match(/\/__editor\/(upload|save|sound)\/?$/);
    if (!m) return next();
    if (m[1] === 'sound') { try { return send(res, 200, JSON.parse(fs.readFileSync(path.join(root, 'src/data/sound.json'), 'utf8'))); } catch (e) { return send(res, 200, { albums: [] }); } }
    if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
    try {
      if (m[1] === 'upload') {
        const dir = url.searchParams.get('dir'); if (!DIRS.includes(dir)) return send(res, 400, { error: 'Unknown folder' });
        const abs = path.join(publicDir, dir); fs.mkdirSync(abs, { recursive: true });
        const name = nameFor(abs, url.searchParams.get('name') || 'file'); fs.writeFileSync(path.join(abs, name), await body(req));
        return send(res, 200, { path: dir + '/' + name });
      }
      const d = JSON.parse((await body(req)).toString('utf8'));
      if (!d.site || !Array.isArray(d.site.entries) || !d.sound || !Array.isArray(d.sound.albums)) return send(res, 400, { error: 'Nothing to save' });
      fs.writeFileSync(path.join(publicDir, 'data/site.json'), JSON.stringify(d.site, null, 2) + '\n');
      fs.mkdirSync(path.join(root, 'src/data'), { recursive: true });
      fs.writeFileSync(path.join(root, 'src/data/sound.json'), JSON.stringify(d.sound, null, 2) + '\n');
      return send(res, 200, { ok: true });
    } catch (e) { return send(res, 500, { error: String(e.message || e) }); }
  };
}
