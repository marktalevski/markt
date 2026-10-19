// Carried over from the Claude Design file "Site Editor.dc.html".
// The logic class is the design's own code; View is its template as JSX.
import React from 'react';
import { DCLogic, page, sty, BASE, assetUrl } from '../lib/dc.js';

// the tabs: the dive log's entries, Sound's albums and the Library's books
const ARROWS = { down: 'Freediving', up: 'Sound', right: 'Library' };
// the Sound tab edits Sound's albums (src/data/sound.json), the Library tab the Library's books (site.json under "books")
const ALBUMS = 'up', BOOKS = 'right';
const SOUND_KINDS = [['music', 'Music'], ['voice', 'Voice'], ['field', 'Field recording']];
const KIND_NAME = { bujo: 'Bullet journal', readings: 'Short readings', quotes: 'Quotes', pillow: 'Pillow book', musings: 'Musings' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LAB = "font-family:'JetBrains Mono', monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#4a5b61";
const INP = "height:40px;padding:0 12px;border:1px solid rgba(16,35,44,.2);border-radius:6px;background:#fff";
const TXT = "padding:12px;border:1px solid rgba(16,35,44,.2);border-radius:6px;background:#fff;line-height:1.6;resize:vertical;font-family:'Newsreader', Georgia, serif;font-size:17px";
const BTN = "height:34px;padding:0 12px;border:1px solid rgba(16,35,44,.25);background:#fff;border-radius:6px;cursor:pointer";
const Field = ({ label, value, onChange, type, placeholder, grow }) => (
  <label style={sty(`display:flex;flex-direction:column;gap:6px;flex:${grow || '1 1 200px'}`)}><span style={sty(LAB)}>{label}</span>
    <input type={type || 'text'} value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={sty(INP)} /></label>);
// uploads go through the dev server's editor helper (src/dev/editor-api.mjs) into the project's public/ folder; it answers with the file's
// path in the site
const upload = async (blob, dir, name) => { const r = await fetch(BASE + '__editor/upload/?dir=' + encodeURIComponent(dir) + '&name=' + encodeURIComponent(name), { method: 'POST', body: blob });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.path) throw new Error(j.error || 'Upload failed'); return j.path; };
// photos are scaled down to 1600px on their long side (as JPEG) before they are uploaded, so the site stays quick
const shrink = file => new Promise((res, rej) => { const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => { const s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob(b => b ? res(b) : rej(new Error('Could not read that image')), 'image/jpeg', .85); };
  img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read that image')); }; img.src = url; });
const uploadPhoto = async (file, dir) => upload(await shrink(file), dir, file.name.replace(/\.[^.]+$/, '') + '.jpg');
// a sound file's length in seconds (0 if the browser can't read it)
const durOf = file => file.arrayBuffer().then(b => new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 44100).decodeAudioData(b)).then(buf => Math.round(buf.duration)).catch(() => 0);
// Sound's albums as saved in the project (src/data/sound.json)
const loadAlbums = () => fetch(BASE + '__editor/sound/', { cache: 'no-cache' }).then(r => r.json()).then(d => Array.isArray(d.albums) ? d.albums : []).catch(() => []);
const fmtDur = s => s ? Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0') : '';
// a photo field: a preview, Upload (into dir) and Remove; the photo is stored by its path
class PhotoPick extends React.Component {
  state = { busy: false, err: '' };
  pick = ev => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (!f) return; this.setState({ busy: true, err: '' });
    uploadPhoto(f, this.props.dir).then(p => { this.setState({ busy: false }); this.props.onChange(p); }, e => this.setState({ busy: false, err: e.message })); };
  render() { const v = this.props.value;
    return (<div style={sty('display:flex;flex-direction:column;gap:8px')}><span style={sty(LAB)}>{this.props.label || 'Photo'}</span>
      {v ? <div role="img" style={sty(`width:240px;max-width:100%;aspect-ratio:4 / 3;background:url("${assetUrl(v)}") center / cover;border-radius:6px`)} /> : null}
      <div style={sty('display:flex;gap:8px;align-items:center;flex-wrap:wrap')}>
        <label style={sty(BTN + ';display:flex;align-items:center')}>{this.state.busy ? 'Uploading…' : v ? 'Replace' : 'Upload'}<input type="file" accept="image/*" onChange={this.pick} style={sty('display:none')} /></label>
        {v ? <button onClick={() => this.props.onChange('')} style={sty(BTN + ';border:0;background:none;color:#5b6b70')}>{'Remove'}</button> : null}
        {this.state.err ? <span style={sty('color:#8a3a1c;font-size:13px')}>{this.state.err}</span> : null}</div></div>);
  }
}
// a list of cards (pieces, passages...) that can each be moved up or down, removed, or added to
const CardList = ({ items, onChange, blank, render, addLabel }) => (<div style={sty('display:flex;flex-direction:column;gap:14px')}>
  {items.map((x, i) => (
    <div key={i} style={sty('display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid rgba(16,35,44,.14);border-radius:8px;background:#f7f5ef')}>
      {render(x, p => onChange(items.map((y, j) => j === i ? { ...y, ...p } : y), false), i)}
      <div style={sty('display:flex;gap:8px;justify-content:flex-end')}>
        <button disabled={i === 0} onClick={() => onChange(items.map((y, j) => j === i - 1 ? items[i] : j === i ? items[i - 1] : y), true)} style={sty(BTN)}>{'↑'}</button>
        <button disabled={i === items.length - 1} onClick={() => onChange(items.map((y, j) => j === i + 1 ? items[i] : j === i ? items[i + 1] : y), true)} style={sty(BTN)}>{'↓'}</button>
        <button onClick={() => { if (confirm('Remove this?')) onChange(items.filter((_, j) => j !== i), true); }} style={sty(BTN + ';color:#8a3a1c;border-color:#b5502c')}>{'Remove'}</button>
      </div>
    </div>))}
  <button onClick={() => onChange([...items, blank()], true)} style={sty('height:40px;border:1px dashed rgba(16,35,44,.35);border-radius:6px;background:none;cursor:pointer')}>{addLabel || '+ Add'}</button>
</div>);
const SAVED = "Saved automatically in this browser. Save to site, then push, to publish.";

// one album's editor: its title and photo (and how the photo lies on the page), and its pieces, each with a title, date, kind and sound file
class AlbumEditor extends React.Component {
  state = { busy: null, err: '' };
  set(p) { this.props.onChange({ ...this.props.album, ...p }); }
  pickAudio(i, tracks, ev) {
    const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (!f) return; this.setState({ busy: i, err: '' });
    Promise.all([upload(f, 'audio', f.name), durOf(f)]).then(([src, dur]) => { this.setState({ busy: null }); const t = this.props.album.tracks || []; this.set({ tracks: t.map((x, j) => j === i ? { ...x, src, dur: dur || x.dur } : x) }); },
      e => this.setState({ busy: null, err: e.message }));
  }
  render() {
    const a = this.props.album, tracks = a.tracks || [];
    return (<div style={sty('max-width:720px;display:flex;flex-direction:column;gap:18px')}>
      <Field label="Album title" value={a.title} onChange={v => this.set({ title: v })} grow="0 0 auto" />
      <PhotoPick label="Album photo (shown in black and white)" dir="images/sound" value={a.img} onChange={v => this.set({ img: v })} />
      <div style={sty('display:flex;gap:18px;flex-wrap:wrap')}>
        <label style={sty('display:flex;gap:8px;align-items:center')}><input type="checkbox" checked={!!a.imgMirror} onChange={e => this.set({ imgMirror: e.target.checked })} />{'Mirror the photo'}</label>
        <label style={sty('display:flex;gap:8px;align-items:center')}><input type="checkbox" checked={!!a.imgFlip} onChange={e => this.set({ imgFlip: e.target.checked })} />{'Turn it upside down'}</label>
      </div>
      <div style={sty(LAB + ';padding-top:8px')}>{'Pieces'}</div>
      <CardList items={tracks} addLabel="+ Add a piece" onChange={t => this.set({ tracks: t })} blank={() => ({ title: 'New piece', kind: 'music', date: new Date().toISOString().slice(0, 10), dur: 60, src: '' })} render={(t, upd, i) => (<>
        <div style={sty('display:flex;flex-wrap:wrap;gap:14px')}>
          <Field label="Title" value={t.title} onChange={v => upd({ title: v })} grow="2 1 240px" />
          <Field label="Date" type="date" value={t.date} onChange={v => upd({ date: v })} grow="0 1 170px" />
          <label style={sty('display:flex;flex-direction:column;gap:6px;flex:0 1 170px')}><span style={sty(LAB)}>{'Kind'}</span>
            <select value={t.kind || 'music'} onChange={e => upd({ kind: e.target.value })} style={sty(INP)}>{SOUND_KINDS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
        </div>
        <div style={sty('display:flex;gap:10px;align-items:center;flex-wrap:wrap')}>
          <span style={sty(LAB)}>{'Sound file'}</span>
          <span style={sty("font-family:'JetBrains Mono', monospace;font-size:12px;color:#10232c")}>{t.src ? t.src.replace(/^audio\//, '') + (t.dur ? '  ·  ' + fmtDur(t.dur) : '') : 'none yet (plays a stand-in)'}</span>
          <label style={sty(BTN + ';display:flex;align-items:center')}>{this.state.busy === i ? 'Uploading…' : t.src ? 'Replace' : 'Upload'}<input type="file" accept="audio/*" onChange={ev => this.pickAudio(i, tracks, ev)} style={sty('display:none')} /></label>
          {t.src ? <audio controls preload="none" src={assetUrl(t.src)} style={sty('height:32px')} /> : null}
          {t.src ? <button onClick={() => upd({ src: '' })} style={sty(BTN + ';border:0;background:none;color:#5b6b70')}>{'Remove'}</button> : null}
        </div>
      </>)} />
      {this.state.err ? <div style={sty('color:#8a3a1c')}>{this.state.err}</div> : null}
      <div style={sty('display:flex;justify-content:space-between;align-items:center;gap:12px;padding-top:6px;flex-wrap:wrap')}>
        <span style={sty("font-family:'JetBrains Mono', monospace;font-size:11px;color:#4a5b61")}>{SAVED}</span>
        <div style={sty('display:flex;gap:8px')}>
          <button disabled={this.props.first} onClick={() => this.props.onMove(-1)} style={sty(BTN)}>{'Move earlier'}</button>
          <button disabled={this.props.last} onClick={() => this.props.onMove(1)} style={sty(BTN)}>{'Move later'}</button>
          <button onClick={this.props.onDelete} style={sty(BTN + ';color:#8a3a1c;border-color:#b5502c')}>{'Delete album'}</button>
        </div>
      </div>
    </div>);
  }
}

const Area = ({ label, value, onChange, rows, placeholder }) => (
  <label style={sty('display:flex;flex-direction:column;gap:6px')}><span style={sty(LAB)}>{label}</span>
    <textarea value={value ?? ''} rows={rows || 6} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={sty(TXT)} /></label>);

// one book's editor: its title and subtitle, then its content, laid out for its kind. A bullet journal has months of dated entries; the
// others have a list of items (passages, quotes, lists or pieces), each of which can be moved, removed, or added to
class BookEditor extends React.Component {
  // list textareas (a month's entries, a pillow list) keep what you type as you type it; the book stores it parsed
  state = { raw: {} };
  set(p) { this.props.onChange({ ...this.props.book, ...p }); }
  rawOf(key, fallback) { return this.state.raw[key] ?? fallback; }
  setRaw(key, v, apply) { this.setState(s => ({ raw: { ...s.raw, [key]: v } })); apply(v); }
  list(key, blank, render) {
    const arr = this.props.book[key] || [];
    // moving or removing cards resets the typed-as-you-go text, which is keyed by position
    return <CardList items={arr} blank={blank} render={render} onChange={(a2, moved) => { if (moved) this.setState({ raw: {} }); this.set({ [key]: a2 }); }} />;
  }
  render() {
    const b = this.props.book, k = b.kind;
    const entriesText = m => (m.entries || []).map(e => [e.d, e.sym, e.text].filter(x => x != null && x !== '').join('  ')).join('\n');
    // day, then a symbol if the next word is one (a mark like × ○ – ★ •, not a word), then the text
    const parseEntries = v => v.split('\n').filter(l => l.trim()).map(l => { const t = l.trim().split(/\s+/), hasSym = t.length > 2 && /^[^\p{L}\p{N}]{1,2}$/u.test(t[1]); return { d: t[0] || '', sym: hasSym ? t[1] : '', text: t.slice(hasSym ? 2 : 1).join(' ') }; });
    return (<div style={sty('max-width:720px;display:flex;flex-direction:column;gap:18px')}>
      <div style={sty(LAB)}>{KIND_NAME[k] || k}</div>
      <div style={sty('display:flex;flex-wrap:wrap;gap:14px')}>
        <Field label="Title (on the spine)" value={b.title} onChange={v => this.set({ title: v })} grow="2 1 260px" />
        {k === 'bujo' ? <Field label="Year" type="number" value={b.year} onChange={v => { const n = parseInt(v, 10); this.set({ year: isNaN(n) ? '' : n }); }} grow="0 1 120px" /> : null}
      </div>
      <Field label="Subtitle" value={b.subtitle} onChange={v => this.set({ subtitle: v })} grow="0 0 auto" />
      <div style={sty(LAB + ';padding-top:8px')}>{k === 'bujo' ? 'Months' : k === 'quotes' ? 'Quotes' : k === 'pillow' ? 'Lists' : k === 'musings' ? 'Pieces' : 'Passages'}</div>
      {k === 'bujo' ? this.list('months', () => ({ month: new Date().getMonth() + 1, intention: '', entries: [] }), (m, upd, i) => (<>
        <div style={sty('display:flex;flex-wrap:wrap;gap:14px')}>
          <label style={sty('display:flex;flex-direction:column;gap:6px;flex:0 1 180px')}><span style={sty(LAB)}>{'Month'}</span>
            <select value={m.month} onChange={e => upd({ month: +e.target.value })} style={sty(INP)}>{MONTHS.map((n, j) => <option key={j} value={j + 1}>{n}</option>)}</select></label>
          <Field label="Intention" value={m.intention} onChange={v => upd({ intention: v })} grow="2 1 260px" />
        </div>
        <Area label="Entries · one per line: day, symbol, text" rows={8} placeholder={'03  ○  Dinner with M.\n12  ★  Finish course application'}
          value={this.rawOf('m' + i, entriesText(m))} onChange={v => this.setRaw('m' + i, v, v2 => upd({ entries: parseEntries(v2) }))} />
      </>)) : null}
      {k === 'readings' ? this.list('items', () => ({ title: 'New passage', source: '', text: '' }), (x, upd) => (<>
        <div style={sty('display:flex;flex-wrap:wrap;gap:14px')}><Field label="Title" value={x.title} onChange={v => upd({ title: v })} /><Field label="Source · book, author" value={x.source} onChange={v => upd({ source: v })} /></div>
        <PhotoPick label="Photo (optional)" dir="images/library" value={x.image} onChange={v => upd({ image: v })} />
        <Area label="Passage · empty line starts a new paragraph" rows={8} value={x.text} onChange={v => upd({ text: v })} />
      </>)) : null}
      {k === 'quotes' ? this.list('items', () => ({ text: '', who: '' }), (x, upd) => (<>
        <Area label="Quote" rows={3} value={x.text} onChange={v => upd({ text: v })} />
        <Field label="Who said it" value={x.who} onChange={v => upd({ who: v })} />
      </>)) : null}
      {k === 'pillow' ? this.list('items', () => ({ title: 'New list', items: [] }), (x, upd, i) => (<>
        <Field label="Title" value={x.title} onChange={v => upd({ title: v })} />
        <Area label="One thing per line" rows={6} value={this.rawOf('p' + i, (x.items || []).join('\n'))} onChange={v => this.setRaw('p' + i, v, v2 => upd({ items: v2.split('\n').map(l => l.trim()).filter(Boolean) }))} />
      </>)) : null}
      {k === 'musings' ? this.list('items', () => ({ title: 'New piece', date: new Date().toISOString().slice(0, 10), text: '' }), (x, upd) => (<>
        <div style={sty('display:flex;flex-wrap:wrap;gap:14px')}><Field label="Title" value={x.title} onChange={v => upd({ title: v })} grow="2 1 260px" /><Field label="Date" type="date" value={x.date} onChange={v => upd({ date: v })} grow="0 1 170px" /></div>
        <PhotoPick label="Photo (optional)" dir="images/library" value={x.image} onChange={v => upd({ image: v })} />
        <Area label="Text · empty line starts a new paragraph" rows={14} value={x.text} onChange={v => upd({ text: v })} />
      </>)) : null}
      <div style={sty("font-family:'JetBrains Mono', monospace;font-size:11px;color:#4a5b61;padding-top:6px")}>{SAVED}</div>
    </div>);
  }
}
const fmt = iso => { if (!iso) return 'no date'; const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };

class Component extends DCLogic {
  state = { data: null, line: 'down', selId: null, selBook: null, selAlbum: null, note: '' };

  componentDidMount() {
    import('../lib/site-data.js').then(m => { this.m = m; return Promise.all([m.loadDraft(), m.load(), loadAlbums()]); }).then(([data, pub, siteAlbums]) => {
      // a working copy from before Sound's albums were editable gets the site's albums
      if (!Array.isArray(data.albums)) data.albums = siteAlbums;
      // a working copy whose books or albums differ from the site's: either edited here, or older than the site (and saving it would undo
      // the newer ones), so say so
      const diff = [pub && Array.isArray(pub.books) && pub.books.length && JSON.stringify(pub.books) !== JSON.stringify(data.books) ? 'books' : '',
        JSON.stringify(siteAlbums) !== JSON.stringify(data.albums) ? 'albums' : ''].filter(Boolean).join(' and ');
      this.setState({ data, note: diff ? `The ${diff} here differ from the site's. If you did not change them here, use Reset to published first.` : '' }); });
  }

  commit(data, extra) {
    let note = '';
    try { this.m.save(data); } catch (e) { note = 'Storage full: use smaller images or image links.'; }
    this.setState({ data, note, ...(extra || {}) });
  }
  patch(p) {
    const d = this.state.data;
    this.commit({ ...d, entries: d.entries.map(e => e.id === this.state.selId ? { ...e, ...p } : e) }, p.line ? { line: p.line } : null);
  }
  field(k) { return e => this.patch({ [k]: e.target.value }); }

  addEntry = () => {
    const d = this.state.data;
    const e = { id: this.m.newId(), line: this.state.line, title: 'New entry', date: new Date().toISOString().slice(0, 10), short: '', body: '', tags: '', image: '', link: '' };
    this.commit({ ...d, entries: [...d.entries, e] }, { selId: e.id });
  };
  deleteEntry = () => {
    if (!confirm('Delete this entry?')) return;
    const d = this.state.data;
    this.commit({ ...d, entries: d.entries.filter(e => e.id !== this.state.selId) }, { selId: null });
  };
  onImageFile = ev => {
    const file = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (!file) return;
    this.setState({ note: 'Uploading the photo…' });
    uploadPhoto(file, 'images/entries').then(p => { this.patch({ image: p }); }, e => this.setState({ note: e.message }));
  };
  // writes the site's files in the project (site.json and sound.json) through the editor helper; pushing then publishes them
  saveSite = () => {
    const d = this.state.data, site = { profile: d.profile, entries: (d.entries || []).filter(e => e.line === 'down'), books: d.books || [] };
    fetch(BASE + '__editor/save/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ site, sound: { albums: d.albums || [] } }) })
      .then(r => r.json().then(j => { if (!r.ok) throw new Error(j.error || 'Save failed'); this.setState({ note: 'Saved to the site\'s files. Push them to publish.' }); }))
      .catch(e => this.setState({ note: 'Could not save: ' + e.message }));
  };
  exportJson = () => {
    // a backup of everything the editor holds (Import brings it back)
    const d = this.state.data, out = { profile: d.profile, entries: (d.entries || []).filter(e => e.line === 'down'), books: d.books || [], albums: d.albums || [] };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'site-backup.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  importJson = ev => {
    const file = ev.target.files && ev.target.files[0]; if (!file) return;
    file.text().then(t => {
      try { const d = JSON.parse(t); if (!Array.isArray(d.entries)) throw 0; this.commit({ profile: d.profile || { name: 'Your Name', intro: '' }, entries: d.entries, books: Array.isArray(d.books) ? d.books : (this.state.data.books || []), albums: Array.isArray(d.albums) ? d.albums : (this.state.data.albums || []) }, { selId: null, selBook: null, selAlbum: null }); }
      catch (e) { this.setState({ note: 'That file is not a valid export.' }); }
    });
    ev.target.value = '';
  };
  resetSample = () => { if (confirm('Throw away your changes and go back to the published entries?')) Promise.all([this.m.seed(), loadAlbums()]).then(([d, albums]) => this.commit({ ...d, albums }, { selId: null, selBook: null, selAlbum: null, note: '' })); };

  renderVals() {
    const d = this.state.data, line = this.state.line;
    const entries = d ? d.entries : [];
    const counts = { up: 0, right: 0, down: 0 };
    entries.forEach(e => { if (counts[e.line] != null) counts[e.line]++; });
    const books = (d && d.books) || [], isBooks = line === BOOKS, book = isBooks && this.state.selBook != null ? books[this.state.selBook] : null; counts[BOOKS] = books.length;
    const albums = (d && d.albums) || [], isAlbums = line === ALBUMS, sa = this.state.selAlbum, album = isAlbums && sa != null ? albums[sa] : null; counts[ALBUMS] = albums.length;
    const putAlbums = (a2, extra) => this.commit({ ...d, albums: a2 }, extra);
    const list = entries.filter(e => e.line === line).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const raw = entries.find(e => e.id === this.state.selId);
    const sel = raw ? { title: '', date: '', short: '', body: '', link: '', image: '', line: 'up', ...raw, tags: Array.isArray(raw.tags) ? raw.tags.join(', ') : (raw.tags || '') } : null;
    const isData = sel && sel.image.startsWith('data:');
    const profile = (d && d.profile) || { name: '', intro: '' };
    const setProfile = k => e => this.commit({ ...d, profile: { ...profile, [k]: e.target.value } });
    return {
      tabs: ['down', 'up', 'right'].map(L => ({ arrow: ARROWS[L], count: counts[L], bg: L === line ? '#10232c' : '#fff', fg: L === line ? '#f2f0e9' : '#10232c', pick: () => this.setState({ line: L, selId: null, selBook: null, selAlbum: null }) })),
      lineArrow: ARROWS[line],
      isBooks, isAlbums, isEntries: !isBooks && !isAlbums, book, bookKey: this.state.selBook,
      album, albumKey: sa, albumFirst: sa === 0, albumLast: sa === albums.length - 1,
      onAlbum: na => putAlbums(albums.map((x, i) => i === sa ? na : x)),
      moveAlbum: dd => { const j = sa + dd; if (j < 0 || j >= albums.length) return; const a2 = albums.slice(); [a2[sa], a2[j]] = [a2[j], a2[sa]]; putAlbums(a2, { selAlbum: j }); },
      deleteAlbum: () => { if (confirm('Delete this album and its pieces? (Their files stay in the project.)')) putAlbums(albums.filter((_, i) => i !== sa), { selAlbum: null }); },
      addAlbum: () => putAlbums([...albums, { title: 'New album', img: '', imgX: 1, tracks: [] }], { selAlbum: albums.length }),
      saveSite: this.saveSite,
      onBook: nb => this.commit({ ...d, books: books.map((x, i) => i === this.state.selBook ? nb : x) }),
      list: isAlbums ? albums.map((a, i) => ({ title: a.title || 'Untitled', meta: (a.tracks || []).length + ' pieces' + ((a.tracks || []).length ? '' : ' · not shown until it has one'), bg: i === sa ? '#dfe9e8' : 'transparent', pick: () => this.setState({ selAlbum: i }) })) : isBooks ? books.map((b, i) => ({ title: b.title || 'Untitled', meta: KIND_NAME[b.kind] || b.kind, bg: i === this.state.selBook ? '#dfe9e8' : 'transparent', pick: () => this.setState({ selBook: i }) })) : list.map((e, i) => ({ title: e.title || 'Untitled', meta: `${String(i + 1).padStart(2, '0')}  ·  ${fmt(e.date)}`, bg: e.id === this.state.selId ? '#dfe9e8' : 'transparent', pick: () => this.setState({ selId: e.id }) })),
      hasSel: !isBooks && !isAlbums && !!sel, noSel: isAlbums ? !album : isBooks ? !book : !sel, sel: sel || {},
      hasImage: !!(sel && sel.image), imageBg: sel && sel.image ? `url("${assetUrl(sel.image)}")` : 'none', imageUrl: sel && !isData ? sel.image : '', imagePlaceholder: isData ? 'Uploaded image (upload or paste a link to replace)' : 'Upload a photo, or paste an image link',
      on: { title: this.field('title'), date: this.field('date'), line: this.field('line'), short: this.field('short'), body: this.field('body'), link: this.field('link'), tags: this.field('tags'), image: this.field('image') },
      onImageFile: this.onImageFile, clearImage: () => this.patch({ image: '' }),
      addEntry: this.addEntry, deleteEntry: this.deleteEntry,
      profileName: profile.name || '', profileIntro: profile.intro || '', onName: setProfile('name'), onIntro: setProfile('intro'),
      exportJson: this.exportJson, importJson: this.importJson, resetSample: this.resetSample,
      note: this.state.note, hasNote: !!this.state.note
    };
  }
}

function View(v) {
  return (
    <>
    <div style={sty("min-height:100vh;font-family:'Familjen Grotesk', system-ui, sans-serif;font-size:15px;display:flex;flex-direction:column")}>
      {"\n  "}
      <header style={sty("display:flex;flex-wrap:wrap;align-items:center;gap:16px;padding:18px 28px;border-bottom:1px solid rgba(16,35,44,.14)")}>
        {"\n    "}
        <div style={sty("font-family:'Newsreader', Georgia, serif;font-style:italic;font-weight:300;font-size:26px;line-height:1")}>
          {"Editor"}
        </div>
        {"\n    "}
        <a href={BASE + ""} target="_blank" style={sty("font-family:'JetBrains Mono', monospace;font-size:12px;letter-spacing:.04em;text-decoration:none")}>
          {"Open site ↗"}
        </a>
        {"\n    "}
        <div style={sty("flex:1")} />
        {"\n    "}
        {v.hasNote ? (
          <>
            <span style={sty("font-family:'JetBrains Mono', monospace;font-size:12px;color:#8a3a1c")}>
              {v.note}
            </span>
          </>
        ) : null}
        {"\n    "}
        <div style={sty("display:flex;gap:8px")}>
          {"\n      "}
          <button onClick={v.saveSite} style={sty("height:36px;padding:0 16px;border:0;background:#10232c;color:#f2f0e9;border-radius:6px;cursor:pointer")}>
            {"Save to site"}
          </button>
          <button onClick={v.exportJson} style={sty("height:36px;padding:0 14px;border:1px solid rgba(16,35,44,.25);background:#fff;border-radius:6px;cursor:pointer")}>
            {"Export backup"}
          </button>
          {"\n      "}
          <label style={sty("height:36px;padding:0 14px;border:1px solid rgba(16,35,44,.25);background:#fff;border-radius:6px;cursor:pointer;display:flex;align-items:center")}>
            {"Import"}
            <input type="file" accept="application/json,.json" onChange={v.importJson} style={sty("display:none")} />
          </label>
          {"\n      "}
          <button onClick={v.resetSample} style={sty("height:36px;padding:0 14px;border:0;background:none;cursor:pointer;color:#5b6b70")}>
            {"Reset to published"}
          </button>
          {"\n    "}
        </div>
        {"\n  "}
      </header>
      {"\n\n  "}
      <section style={sty("display:flex;flex-wrap:wrap;gap:16px;padding:16px 28px;border-bottom:1px solid rgba(16,35,44,.14);background:#ebe8df")}>
        {"\n    "}
        <label style={sty("display:flex;flex-direction:column;gap:6px;flex:1 1 220px;max-width:360px")}>
          {"\n      "}
          <span style={sty("font-family:'JetBrains Mono', monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#4a5b61")}>
            {"Name"}
          </span>
          {"\n      "}
          <input value={v.profileName} onChange={v.onName} style={sty("height:38px;padding:0 12px;border:1px solid rgba(16,35,44,.2);border-radius:6px;background:#fff")} />
          {"\n    "}
        </label>
        {"\n    "}
        <label style={sty("display:flex;flex-direction:column;gap:6px;flex:2 1 320px;max-width:620px")}>
          {"\n      "}
          <span style={sty("font-family:'JetBrains Mono', monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#4a5b61")}>
            {"Intro line (optional)"}
          </span>
          {"\n      "}
          <input value={v.profileIntro} onChange={v.onIntro} placeholder="Shown under your name on the home screen" style={sty("height:38px;padding:0 12px;border:1px solid rgba(16,35,44,.2);border-radius:6px;background:#fff")} />
          {"\n    "}
        </label>
        {"\n  "}
      </section>
      {"\n\n  "}
      <div style={sty("flex:1;display:grid;grid-template-columns:minmax(260px, 340px) minmax(0, 1fr);min-height:0")}>
        {"\n    "}
        <aside style={sty("border-right:1px solid rgba(16,35,44,.14);display:flex;flex-direction:column;min-height:0")}>
          {"\n      "}
          <div style={sty("display:grid;grid-template-columns:repeat(3, 1fr);gap:4px;padding:14px 14px 10px")}>
            {"\n        "}
            {(v.tabs || []).map((tab, $index) => (
              <React.Fragment key={$index}>
                {"\n          "}
                <button onClick={tab?.pick} style={sty(`height:40px;border:1px solid rgba(16,35,44,.2);border-radius:6px;cursor:pointer;background:${tab?.bg ?? ''};color:${tab?.fg ?? ''};display:flex;align-items:center;justify-content:center;gap:6px`)}>
                  {"\n            "}
                  <span style={sty("font-size:16px")}>
                    {tab?.arrow}
                  </span>
                  <span style={sty("font-family:'JetBrains Mono', monospace;font-size:12px")}>
                    {tab?.count}
                  </span>
                  {"\n          "}
                </button>
                {"\n        "}
              </React.Fragment>
            ))}
            {"\n      "}
          </div>
          {"\n      "}
          {v.isAlbums ? <div style={sty("padding:0 14px 10px")}><button onClick={v.addAlbum} style={sty("width:100%;height:40px;border:1px dashed rgba(16,35,44,.35);border-radius:6px;background:none;cursor:pointer")}>{"+ New album"}</button></div> : null}
          {v.isEntries ? <div style={sty("padding:0 14px 10px")}>
            {"\n        "}
            <button onClick={v.addEntry} style={sty("width:100%;height:40px;border:1px dashed rgba(16,35,44,.35);border-radius:6px;background:none;cursor:pointer")}>
              {"+ New entry on "}
              {v.lineArrow}
            </button>
            {"\n      "}
          </div> : null}
          {"\n      "}
          <div style={sty("flex:1;overflow-y:auto;padding:0 8px 20px;display:flex;flex-direction:column;gap:2px")}>
            {"\n        "}
            {(v.list || []).map((row, $index) => (
              <React.Fragment key={$index}>
                {"\n          "}
                <button onClick={row?.pick} style={sty(`text-align:left;border:0;border-radius:6px;padding:10px 12px;cursor:pointer;background:${row?.bg ?? ''};display:flex;flex-direction:column;gap:3px`)}>
                  {"\n            "}
                  <span style={sty("font-family:'JetBrains Mono', monospace;font-size:11px;letter-spacing:.04em;color:#4a5b61")}>
                    {row?.meta}
                  </span>
                  {"\n            "}
                  <span style={sty("font-size:15px;line-height:1.3")}>
                    {row?.title}
                  </span>
                  {"\n          "}
                </button>
                {"\n        "}
              </React.Fragment>
            ))}
            {"\n      "}
          </div>
          {"\n    "}
        </aside>
        {"\n\n    "}
        <main style={sty("padding:24px 32px 60px;overflow-y:auto")}>
          {"\n      "}
          {v.hasSel ? (
            <>
              {"\n        "}
              <div style={sty("max-width:720px;display:flex;flex-direction:column;gap:18px")}>
                {"\n          "}
                <div style={sty("display:grid;grid-template-columns:minmax(0, 1fr) 170px;gap:14px")}>
                  {"\n            "}
                  <label style={sty("display:flex;flex-direction:column;gap:6px")}>
                    {"\n              "}
                    <span style={sty("font-family:'JetBrains Mono', monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#4a5b61")}>
                      {"Title"}
                    </span>
                    {"\n              "}
                    <input value={v.sel?.title} onChange={v.on?.title} style={sty("height:40px;padding:0 12px;border:1px solid rgba(16,35,44,.2);border-radius:6px;background:#fff;font-size:17px")} />
                    {"\n            "}
                  </label>
                  {"\n            "}
                  <label style={sty("display:flex;flex-direction:column;gap:6px")}>
                    {"\n              "}
                    <span style={sty("font-family:'JetBrains Mono', monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#4a5b61")}>
                      {"Date"}
                    </span>
                    {"\n              "}
                    <input type="date" value={v.sel?.date} onChange={v.on?.date} style={sty("height:40px;padding:0 10px;border:1px solid rgba(16,35,44,.2);border-radius:6px;background:#fff")} />
                    {"\n            "}
                  </label>
                  {"\n            "}

                  {"\n          "}
                </div>
                {"\n          "}
                <label style={sty("display:flex;flex-direction:column;gap:6px")}>
                  {"\n            "}
                  <span style={sty("font-family:'JetBrains Mono', monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#4a5b61")}>
                    {"Short text"}
                  </span>
                  {"\n            "}
                  <input value={v.sel?.short} onChange={v.on?.short} style={sty("height:40px;padding:0 12px;border:1px solid rgba(16,35,44,.2);border-radius:6px;background:#fff")} />
                  {"\n          "}
                </label>
                {"\n          "}
                <div style={sty("display:flex;flex-direction:column;gap:8px")}>
                  {"\n            "}
                  <span style={sty("font-family:'JetBrains Mono', monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#4a5b61")}>
                    {"Image"}
                  </span>
                  {"\n            "}
                  {v.hasImage ? (
                    <>
                      {"\n              "}
                      <div role="img" style={sty(`width:320px;max-width:100%;aspect-ratio:16 / 10;background-image:${v.imageBg ?? ''};background-size:cover;background-position:center;border-radius:6px`)} />
                      {"\n            "}
                    </>
                  ) : null}
                  {"\n            "}
                  <div style={sty("display:flex;flex-wrap:wrap;gap:8px;align-items:center")}>
                    {"\n              "}
                    <input value={v.imageUrl} onChange={v.on?.image} placeholder={v.imagePlaceholder} style={sty("flex:1 1 260px;height:40px;padding:0 12px;border:1px solid rgba(16,35,44,.2);border-radius:6px;background:#fff")} />
                    {"\n              "}
                    <label style={sty("height:40px;padding:0 14px;border:1px solid rgba(16,35,44,.25);background:#fff;border-radius:6px;cursor:pointer;display:flex;align-items:center")}>
                      {"Upload"}
                      <input type="file" accept="image/*" onChange={v.onImageFile} style={sty("display:none")} />
                    </label>
                    {"\n              "}
                    {v.hasImage ? (
                      <>
                        <button onClick={v.clearImage} style={sty("height:40px;padding:0 12px;border:0;background:none;cursor:pointer;color:#5b6b70")}>
                          {"Remove"}
                        </button>
                      </>
                    ) : null}
                    {"\n            "}
                  </div>
                  {"\n          "}
                </div>
                {"\n          "}
                <div style={sty("display:grid;grid-template-columns:minmax(0, 1fr) minmax(0, 1fr);gap:14px")}>
                  {"\n            "}
                  <label style={sty("display:flex;flex-direction:column;gap:6px")}>
                    {"\n              "}
                    <span style={sty("font-family:'JetBrains Mono', monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#4a5b61")}>
                      {"Link"}
                    </span>
                    {"\n              "}
                    <input value={v.sel?.link} onChange={v.on?.link} placeholder="https://" style={sty("height:40px;padding:0 12px;border:1px solid rgba(16,35,44,.2);border-radius:6px;background:#fff")} />
                    {"\n            "}
                  </label>
                  {"\n            "}
                  <label style={sty("display:flex;flex-direction:column;gap:6px")}>
                    {"\n              "}
                    <span style={sty("font-family:'JetBrains Mono', monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#4a5b61")}>
                      {"Tags, comma separated"}
                    </span>
                    {"\n              "}
                    <input value={v.sel?.tags} onChange={v.on?.tags} style={sty("height:40px;padding:0 12px;border:1px solid rgba(16,35,44,.2);border-radius:6px;background:#fff")} />
                    {"\n            "}
                  </label>
                  {"\n          "}
                </div>
                {"\n          "}
                <label style={sty("display:flex;flex-direction:column;gap:6px")}>
                  {"\n            "}
                  <span style={sty("font-family:'JetBrains Mono', monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#4a5b61")}>
                    {"Body · empty line starts a new paragraph"}
                  </span>
                  {"\n            "}
                  <textarea value={v.sel?.body} onChange={v.on?.body} rows="12" style={sty("padding:12px;border:1px solid rgba(16,35,44,.2);border-radius:6px;background:#fff;line-height:1.6;resize:vertical;font-family:'Newsreader', Georgia, serif;font-size:17px")} />
                  {"\n          "}
                </label>
                {"\n          "}
                <div style={sty("display:flex;justify-content:space-between;align-items:center;gap:12px;padding-top:6px")}>
                  {"\n            "}
                  <span style={sty("font-family:'JetBrains Mono', monospace;font-size:11px;color:#4a5b61")}>
                    {SAVED}
                  </span>
                  {"\n            "}
                  <button onClick={v.deleteEntry} style={sty("height:38px;padding:0 14px;border:1px solid #b5502c;color:#8a3a1c;background:none;border-radius:6px;cursor:pointer")}>
                    {"Delete entry"}
                  </button>
                  {"\n          "}
                </div>
                {"\n        "}
              </div>
              {"\n      "}
            </>
          ) : null}
          {"\n      "}
          {v.book ? <BookEditor key={v.bookKey} book={v.book} onChange={v.onBook} /> : null}
          {v.album ? <AlbumEditor key={v.albumKey} album={v.album} onChange={v.onAlbum} onMove={v.moveAlbum} onDelete={v.deleteAlbum} first={v.albumFirst} last={v.albumLast} /> : null}
          {v.noSel ? (
            <>
              {"\n        "}
              <div style={sty("color:#4a5b61;padding-top:40px")}>
                {v.isAlbums ? "Pick an album on the left, or add a new one." : v.isBooks ? "Pick a book on the left to edit what's in it." : "Pick an entry on the left, or add a new one."}
              </div>
              {"\n      "}
            </>
          ) : null}
          {"\n    "}
        </main>
        {"\n  "}
      </div>
    </div>
    </>
  );
}

export default page(Component, View, {});
