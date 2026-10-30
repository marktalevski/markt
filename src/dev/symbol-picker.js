// Local-only symbol picker for designing the Home symbols. astro.config.mjs injects it under `npm run dev` only, so the published
// site never has it: there the ink dot keeps picking at random.
// A column of symbol names down the left of Home: click one to brush it in, or press ← / → to step through them.
// The tab at its top (or the H key) hides it, so it stays out of the way of the animations; it remembers that between reloads.
const home = () => window.__home;
let bar = null, want = null, timer = 0, tab = null, open = true;
try { open = localStorage.getItem('symbol-picker-open') !== '0'; } catch (e) {}

function setOpen(v) {
  open = v; bar.style.display = open ? 'flex' : 'none'; tab.textContent = open ? 'Hide ◂' : 'Symbols ▸';
  try { localStorage.setItem('symbol-picker-open', open ? '1' : '0'); } catch (e) {}
}

// the symbol is still being drawn (or a transition is running): keep asking until Home takes it
function show(name) {
  want = name; clearTimeout(timer);
  const tryIt = (n) => { const h = home(); if (want !== name) return; if (h && h.shuffle(name)) { want = null; mark(); return; } if (n < 60) timer = setTimeout(() => tryIt(n + 1), 100); };
  tryIt(0); mark();
}

function mark() {
  const cur = want || (home() && home().shapeName);
  if (bar) for (const b of bar.children) { const on = b.dataset.name === cur; b.style.background = on ? '#141414' : 'transparent'; b.style.color = on ? '#f5f3ee' : '#141414'; }
}

// waits for Home to start (it sets window.__home); on any other page it never does, so it gives up after ten seconds
let tries = 0;
function build() {
  const h = home(); if (!h || !h.shapeName) { if (++tries < 50) setTimeout(build, 200); return; }
  // alphabetical here (← / → follow this order too); Home's own list stays as it is
  const names = [...(h.constructor.SHAPES || [])].sort();
  const box = document.createElement('div');
  box.setAttribute('data-dev', 'symbol-picker');
  box.style.cssText = 'position:fixed;left:10px;top:10px;z-index:50;display:flex;flex-direction:column;align-items:flex-start;gap:4px;max-height:calc(100vh - 20px);font:12px/1 system-ui, sans-serif';
  tab = document.createElement('button');
  tab.style.cssText = 'border:0;border-radius:6px;padding:4px 8px;cursor:pointer;font:inherit;color:#141414;background:rgba(245,243,238,.85);box-shadow:0 1px 6px rgba(0,0,0,.12)';
  tab.onclick = () => setOpen(!open);
  bar = document.createElement('div');
  bar.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;gap:2px;min-height:0;overflow-y:auto;padding:6px;border-radius:10px;background:rgba(245,243,238,.85);backdrop-filter:blur(4px);font:12px/1 system-ui, sans-serif;box-shadow:0 1px 6px rgba(0,0,0,.12)';
  for (const n of names) {
    const b = document.createElement('button'); b.textContent = n[0].toUpperCase() + n.slice(1); b.dataset.name = n;
    b.style.cssText = 'border:1px solid #14141433;border-radius:6px;padding:3px 8px;cursor:pointer;font:inherit;text-align:left';
    b.onclick = () => show(n);
    bar.appendChild(b);
  }
  box.append(tab, bar); document.body.appendChild(box); setOpen(open); mark();
  addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') { setOpen(!open); return; }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const cur = want || home().shapeName, i = names.indexOf(cur), d = e.key === 'ArrowRight' ? 1 : -1;
    show(names[(i + d + names.length) % names.length]);
  });
  // the ink dot's own shuffle still works; keep the highlight in step with it
  setInterval(mark, 500);
}

build();
