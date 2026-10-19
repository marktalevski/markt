// Carried over from the Claude Design file "Site Editor.dc.html".
// The logic class is the design's own code; View is its template as JSX.
import React from 'react';
import { DCLogic, page, sty, BASE } from '../lib/dc.js';

const ARROWS = { down: 'Freediving', up: 'Sound', right: 'Library' };
// the Library tab edits the Library's books (in site.json under "books"), not entries
const BOOKS = 'right';
const KIND_NAME = { bujo: 'Bullet journal', readings: 'Short readings', quotes: 'Quotes', pillow: 'Pillow book', musings: 'Musings' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LAB = "font-family:'JetBrains Mono', monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#4a5b61";
const INP = "height:40px;padding:0 12px;border:1px solid rgba(16,35,44,.2);border-radius:6px;background:#fff";
const TXT = "padding:12px;border:1px solid rgba(16,35,44,.2);border-radius:6px;background:#fff;line-height:1.6;resize:vertical;font-family:'Newsreader', Georgia, serif;font-size:17px";
const BTN = "height:34px;padding:0 12px;border:1px solid rgba(16,35,44,.25);background:#fff;border-radius:6px;cursor:pointer";
const Field = ({ label, value, onChange, type, placeholder, grow }) => (
  <label style={sty(`display:flex;flex-direction:column;gap:6px;flex:${grow || '1 1 200px'}`)}><span style={sty(LAB)}>{label}</span>
    <input type={type || 'text'} value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={sty(INP)} /></label>);
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
    const b = this.props.book, arr = b[key] || [], put = a => { this.setState({ raw: {} }); this.set({ [key]: a }); };
    const at = (i, p) => this.set({ [key]: arr.map((x, j) => j === i ? { ...x, ...p } : x) });
    return (<div style={sty('display:flex;flex-direction:column;gap:14px')}>
      {arr.map((x, i) => (
        <div key={i} style={sty('display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid rgba(16,35,44,.14);border-radius:8px;background:#f7f5ef')}>
          {render(x, p => at(i, p), i)}
          <div style={sty('display:flex;gap:8px;justify-content:flex-end')}>
            <button disabled={i === 0} onClick={() => put(arr.map((y, j) => j === i - 1 ? arr[i] : j === i ? arr[i - 1] : y))} style={sty(BTN)}>{'↑'}</button>
            <button disabled={i === arr.length - 1} onClick={() => put(arr.map((y, j) => j === i + 1 ? arr[i] : j === i ? arr[i + 1] : y))} style={sty(BTN)}>{'↓'}</button>
            <button onClick={() => { if (confirm('Remove this?')) put(arr.filter((_, j) => j !== i)); }} style={sty(BTN + ';color:#8a3a1c;border-color:#b5502c')}>{'Remove'}</button>
          </div>
        </div>))}
      <button onClick={() => put([...arr, blank()])} style={sty('height:40px;border:1px dashed rgba(16,35,44,.35);border-radius:6px;background:none;cursor:pointer')}>{'+ Add'}</button>
    </div>);
  }
  render() {
    const b = this.props.book, k = b.kind;
    const entriesText = m => (m.entries || []).map(e => [e.d, e.sym, e.text].filter(x => x != null && x !== '').join('  ')).join('\n');
    const parseEntries = v => v.split('\n').filter(l => l.trim()).map(l => { const t = l.trim().split(/\s+/); return { d: t[0] || '', sym: t[1] || '', text: t.slice(2).join(' ') }; });
    return (<div style={sty('max-width:720px;display:flex;flex-direction:column;gap:18px')}>
      <div style={sty(LAB)}>{KIND_NAME[k] || k}</div>
      <div style={sty('display:flex;flex-wrap:wrap;gap:14px')}>
        <Field label="Title (on the spine)" value={b.title} onChange={v => this.set({ title: v })} grow="2 1 260px" />
        {k === 'bujo' ? <Field label="Year" type="number" value={b.year} onChange={v => this.set({ year: +v || v })} grow="0 1 120px" /> : null}
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
        <Area label="Text · empty line starts a new paragraph" rows={14} value={x.text} onChange={v => upd({ text: v })} />
      </>)) : null}
      <div style={sty("font-family:'JetBrains Mono', monospace;font-size:11px;color:#4a5b61;padding-top:6px")}>{'Saved automatically in this browser. Export JSON to publish.'}</div>
    </div>);
  }
}
const fmt = iso => { if (!iso) return 'no date'; const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };

class Component extends DCLogic {
  state = { data: null, line: 'down', selId: null, selBook: null, note: '' };

  componentDidMount() {
    import('../lib/site-data.js').then(m => { this.m = m; return m.loadDraft(); }).then(data => this.setState({ data }));
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
    const file = ev.target.files && ev.target.files[0]; if (!file) return;
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      this.patch({ image: c.toDataURL('image/jpeg', .82) });
    };
    img.src = url; ev.target.value = '';
  };
  exportJson = () => {
    const blob = new Blob([JSON.stringify(this.state.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'site.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  importJson = ev => {
    const file = ev.target.files && ev.target.files[0]; if (!file) return;
    file.text().then(t => {
      try { const d = JSON.parse(t); if (!Array.isArray(d.entries)) throw 0; this.commit({ profile: d.profile || { name: 'Your Name', intro: '' }, entries: d.entries, books: Array.isArray(d.books) ? d.books : (this.state.data.books || []) }, { selId: null, selBook: null }); }
      catch (e) { this.setState({ note: 'That file is not a valid export.' }); }
    });
    ev.target.value = '';
  };
  resetSample = () => { if (confirm('Throw away your changes and go back to the published entries?')) this.m.seed().then(d => this.commit(d, { selId: null, selBook: null })); };

  renderVals() {
    const d = this.state.data, line = this.state.line;
    const entries = d ? d.entries : [];
    const counts = { up: 0, right: 0, down: 0 };
    entries.forEach(e => { if (counts[e.line] != null) counts[e.line]++; });
    const books = (d && d.books) || [], isBooks = line === BOOKS, book = isBooks && this.state.selBook != null ? books[this.state.selBook] : null; counts[BOOKS] = books.length;
    const list = entries.filter(e => e.line === line).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const raw = entries.find(e => e.id === this.state.selId);
    const sel = raw ? { title: '', date: '', short: '', body: '', link: '', image: '', line: 'up', ...raw, tags: Array.isArray(raw.tags) ? raw.tags.join(', ') : (raw.tags || '') } : null;
    const isData = sel && sel.image.startsWith('data:');
    const profile = (d && d.profile) || { name: '', intro: '' };
    const setProfile = k => e => this.commit({ ...d, profile: { ...profile, [k]: e.target.value } });
    return {
      tabs: ['down', 'up', 'right'].map(L => ({ arrow: ARROWS[L], count: counts[L], bg: L === line ? '#10232c' : '#fff', fg: L === line ? '#f2f0e9' : '#10232c', pick: () => this.setState({ line: L, selId: null, selBook: null }) })),
      lineArrow: ARROWS[line],
      isBooks, notBooks: !isBooks, book, bookKey: this.state.selBook,
      onBook: nb => this.commit({ ...d, books: books.map((x, i) => i === this.state.selBook ? nb : x) }),
      list: isBooks ? books.map((b, i) => ({ title: b.title || 'Untitled', meta: KIND_NAME[b.kind] || b.kind, bg: i === this.state.selBook ? '#dfe9e8' : 'transparent', pick: () => this.setState({ selBook: i }) })) : list.map((e, i) => ({ title: e.title || 'Untitled', meta: `${String(i + 1).padStart(2, '0')}  ·  ${fmt(e.date)}`, bg: e.id === this.state.selId ? '#dfe9e8' : 'transparent', pick: () => this.setState({ selId: e.id }) })),
      hasSel: !isBooks && !!sel, noSel: isBooks ? !book : !sel, sel: sel || {},
      hasImage: !!(sel && sel.image), imageBg: sel && sel.image ? `url("${sel.image}")` : 'none', imageUrl: sel && !isData ? sel.image : '', imagePlaceholder: isData ? 'Uploaded image (paste a URL to replace)' : 'Image URL, or upload',
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
          <button onClick={v.exportJson} style={sty("height:36px;padding:0 14px;border:1px solid rgba(16,35,44,.25);background:#fff;border-radius:6px;cursor:pointer")}>
            {"Export JSON"}
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
          {v.notBooks ? <div style={sty("padding:0 14px 10px")}>
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
                <div style={sty("display:grid;grid-template-columns:minmax(0, 1fr) 170px 150px;gap:14px")}>
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
                  <label style={sty("display:flex;flex-direction:column;gap:6px")}>
                    {"\n              "}
                    <span style={sty("font-family:'JetBrains Mono', monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#4a5b61")}>
                      {"Line"}
                    </span>
                    {"\n              "}
                    <select value={v.sel?.line} onChange={v.on?.line} style={sty("height:40px;padding:0 10px;border:1px solid rgba(16,35,44,.2);border-radius:6px;background:#fff")}>
                      {"\n                "}
                      <option value="down">
                        {"Freediving"}
                      </option>
                      {"\n                "}
                      <option value="up">
                        {"Sound"}
                      </option>
                      {"\n                "}
                      <option value="right">
                        {"Library"}
                      </option>
                      {"\n              "}
                    </select>
                    {"\n            "}
                  </label>
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
                    {"Saved automatically in this browser. Export JSON to publish."}
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
          {v.noSel ? (
            <>
              {"\n        "}
              <div style={sty("color:#4a5b61;padding-top:40px")}>
                {v.isBooks ? "Pick a book on the left to edit what's in it." : "Pick an entry on the left, or add a new one."}
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
