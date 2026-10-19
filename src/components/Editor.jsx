// Carried over from the Claude Design file "Site Editor.dc.html".
// The logic class is the design's own code; View is its template as JSX.
import React from 'react';
import { DCLogic, page, sty, BASE } from '../lib/dc.js';

const ARROWS = { down: 'Freediving', up: 'Sound', right: 'Library' };
const fmt = iso => { if (!iso) return 'no date'; const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };

class Component extends DCLogic {
  state = { data: null, line: 'down', selId: null, note: '' };

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
      try { const d = JSON.parse(t); if (!Array.isArray(d.entries)) throw 0; this.commit({ profile: d.profile || { name: 'Your Name', intro: '' }, entries: d.entries }, { selId: null }); }
      catch (e) { this.setState({ note: 'That file is not a valid export.' }); }
    });
    ev.target.value = '';
  };
  resetSample = () => { if (confirm('Throw away your changes and go back to the published entries?')) this.m.seed().then(d => this.commit(d, { selId: null })); };

  renderVals() {
    const d = this.state.data, line = this.state.line;
    const entries = d ? d.entries : [];
    const counts = { up: 0, right: 0, down: 0 };
    entries.forEach(e => { if (counts[e.line] != null) counts[e.line]++; });
    const list = entries.filter(e => e.line === line).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const raw = entries.find(e => e.id === this.state.selId);
    const sel = raw ? { title: '', date: '', short: '', body: '', link: '', image: '', line: 'up', ...raw, tags: Array.isArray(raw.tags) ? raw.tags.join(', ') : (raw.tags || '') } : null;
    const isData = sel && sel.image.startsWith('data:');
    const profile = (d && d.profile) || { name: '', intro: '' };
    const setProfile = k => e => this.commit({ ...d, profile: { ...profile, [k]: e.target.value } });
    return {
      tabs: ['down', 'up', 'right'].map(L => ({ arrow: ARROWS[L], count: counts[L], bg: L === line ? '#10232c' : '#fff', fg: L === line ? '#f2f0e9' : '#10232c', pick: () => this.setState({ line: L, selId: null }) })),
      lineArrow: ARROWS[line],
      list: list.map((e, i) => ({ title: e.title || 'Untitled', meta: `${String(i + 1).padStart(2, '0')}  ·  ${fmt(e.date)}`, bg: e.id === this.state.selId ? '#dfe9e8' : 'transparent', pick: () => this.setState({ selId: e.id }) })),
      hasSel: !!sel, noSel: !sel, sel: sel || {},
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
          <div style={sty("padding:0 14px 10px")}>
            {"\n        "}
            <button onClick={v.addEntry} style={sty("width:100%;height:40px;border:1px dashed rgba(16,35,44,.35);border-radius:6px;background:none;cursor:pointer")}>
              {"+ New entry on "}
              {v.lineArrow}
            </button>
            {"\n      "}
          </div>
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
          {v.noSel ? (
            <>
              {"\n        "}
              <div style={sty("color:#4a5b61;padding-top:40px")}>
                {"Pick an entry on the left, or add a new one."}
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
