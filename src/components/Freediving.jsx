// Carried over from the Claude Design file "Freediving v2.dc.html".
// The logic class is the design's own code; View is its template as JSX.
import React from 'react';
import { DCLogic, page, sty, BASE } from '../lib/dc.js';
import { ropeX } from '../lib/rope.js';
import { drawSquid } from '../lib/squid-draw.js';

// the rope down from the buoy, wide enough for its twist to show
const ROPE_W = 3.6;
// the rope is one warm sand colour all the way down, with a thin dark edge so it reads on the pale surface water and the deep blue alike
const ROPE_SAND = '#e9dcbc', ROPE_EDGE = '#141414';
// leaving for Home: how long each colour takes to gather at the centre, circle there with the others and go up into its dot (s)
const SWIRL_DUR = 3.6;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = x => x * x * (3 - 2 * x);
const fmt = iso => { if (!iso) return ''; const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const PAPER = [245, 243, 238], DEEP = [16, 18, 22];
const css = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const WC = [[0, [152, 202, 222]], [8, [82, 150, 198]], [20, [40, 98, 166]], [35, [20, 50, 108]], [52, [8, 16, 46]]];
const scaleAt = f => { f = clamp(f, 0, 52); for (let i = 1; i < WC.length; i++) if (f <= WC[i][0]) { const k = (f - WC[i - 1][0]) / (WC[i][0] - WC[i - 1][0]); return WC[i - 1][1].map((v, j) => v + (WC[i][1][j] - v) * k); } return WC[WC.length - 1][1]; };
const HUES = { r: [126, 196, 220], g: [36, 150, 178], b: [34, 86, 186], y: [150, 222, 255] };
const greyOf = c => { const L = c[0] * .3 + c[1] * .59 + c[2] * .11; return [L, L, L]; };
const mixC = (a, b, u) => a.map((v, j) => v + (b[j] - v) * u);
const hexC = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lum = c => { const l = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * l[0] + .7152 * l[1] + .0722 * l[2]; };
const cr = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);

class Component extends DCLogic {
  state = { data: null, focus: -1, exp: null, introDone: false };
  rootRef = React.createRef(); worldRef = React.createRef(); canvasRef = React.createRef(); depthRef = React.createRef(); chromeRef = React.createRef(); fgRef = React.createRef(); stripRef = React.createRef();
  p = -1; target = -1; sizes = {}; pos = []; els = []; count = 0; t = 0; introT = 0; ink = '#141414'; lineEnd = 0;

  componentDidMount() {
    import('../lib/site-data.js').then(m => { this.store = m; return m.load(); }).then(data => this.setState({ data }));
    this.introT = (this.props.intro ?? true) && (this.props.motion ?? true) ? 0 : 99;
    if (this.introT === 0 && /from=home/.test(location.search)) { this.introT = 1; this.fromHome = true; }
    // from Sound: its menu dots, handed over where its beat pads closed into them
    if (this.introT === 0 && /from=sound/.test(location.search)) try { const nf = JSON.parse(sessionStorage.getItem('nav-from') || 'null'); sessionStorage.removeItem('nav-from'); if (nf && nf.home && nf.freediving) { this.fromSound = nf; this.skipWaves = true; } } catch (e) {}
    // the page comes in in order: the surface lines draw (already there when arriving from Home), the water rises up to them, then the rope goes
    // down as the entries come in, and the squid arrives last
    this.tideIntro = true; this.tide0 = this.fromHome ? 2.0 : this.fromSound ? 3.25 : 2.15; this.tideEnd = this.tide0 + 1.5; this.introEnd = this.tideEnd + 1.15; if (this.fromHome) this.skipWaves = true;
    this.onStorage = e => { if (this.store && e.key === this.store.KEY) this.store.load().then(data => this.setState({ data })); };
    this.onWheel = e => this.wheel(e);
    this.onKey = e => this.key(e);
    this.onPD = () => this.skipIntro();
    this.onTS = e => { const t = e.touches[0]; this.ty = t.clientY; };
    this.onTM = e => {
      const t = e.touches[0]; if (this.ty == null) return;
      if (e.target.closest && e.target.closest('[data-scroll]')) return;
      e.preventDefault(); this.push((this.ty - t.clientY) * 1.2); this.ty = t.clientY;
    };
    addEventListener('storage', this.onStorage); addEventListener('wheel', this.onWheel, { passive: false });
    addEventListener('keydown', this.onKey); addEventListener('pointerdown', this.onPD);
    addEventListener('touchstart', this.onTS, { passive: true }); addEventListener('touchmove', this.onTM, { passive: false });
    const r = rng(11);
    const gc = document.createElement('canvas'); gc.width = gc.height = 220;
    // the same paper grain as Home (seed 5), so the texture doesn't jump when arriving from there; r still steps past it so everything else stays put
    { const g5 = rng(5), x = gc.getContext('2d'), im = x.createImageData(220, 220); for (let i = 0; i < im.data.length; i += 4) { r(); const v = 255 - Math.pow(g5(), 3) * 40; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); }
    this.grainC = gc;
    this.bubbles = Array.from({ length: 10 }, () => ({ x: -22 + r() * 14, y: r(), r: 1.5 + r() * 3, v: .02 + r() * .03, ph: r() * 6.28 }));
    const C = { verm: '#d4452a', gold: '#e2a93b', white: '#f2efe6' };
    this.fish = Array.from({ length: 0 }, (_, i) => ({ m: 1.5 + r() * 9, x: .58 + r() * .26, rg: 50 + r() * 90, sp: .12 + r() * .2, ph: r() * 6.28, c: [C.verm, C.gold, C.verm, C.white, C.gold, C.verm, C.white][i], s: .7 + r() * .4 }));
    this.life = [
      { k: 'turtle', m: 3, x: .74, pf: 1, s: 1.1, rg: 70, sp: .05, name: 'Green sea turtle', note: 'SEAGRASS · 2–4 M' },
      { k: 'sardines', m: 10, x: .76, pf: 1, s: 1, rg: 30, sp: .04, name: 'Sardine run', note: 'REEF DROP-OFF' },
      { k: 'manta', m: 20, x: .5, pf: .7, s: 1, rg: 80, sp: .05, name: 'Manta ray', note: 'SHOAL TOP · ~14 M' },
      { k: 'thresher', m: 30, x: .7, pf: 1, s: 1, rg: 120, sp: .07, name: 'Pelagic thresher shark', note: 'CLEANING STATION · 14–30 M' },
    ].map(c => ({ ...c, ph: r() * 6.28, seen: null }));
    this.sardines = Array.from({ length: 70 }, () => ({ a: r() * 6.28, rr: .45 + r() * .55, v: .5 + r() * .5, z: r() * 6.28 }));
    this.snow = Array.from({ length: 36 }, () => ({ x: r(), y: r(), r: .6 + r() * 1.8, near: r() < .35 }));
    this.kelp = Array.from({ length: 5 }, () => ({ m: 4 + r() * 30, len: 50 + r() * 80, ph: r() * 6.28 }));
    this.fans = Array.from({ length: 6 }, (_, i) => ({ m: 6 + i * 6 + r() * 4, s: .7 + r() * .6, c: [C.verm, '#ee9aa8', C.gold][i % 3], seed: r() * 1000 }));
    this.streaks = Array.from({ length: 3 }, (_, i) => ({ m: .5 + i * .6, ph: r() * 6.28 }));
    this.schools = [].map(q => ({ ...q, ph: r() * 6.28, f: Array.from({ length: 16 }, () => ({ dx: (r() - .5) * 160, dy: (r() - .5) * 50, ph: r() * 6.28 })) }));
    this.fgItems = Array.from({ length: 4 }, (_, i) => ({ m: 4 + i * 12 + r() * 4, x: .9 + r() * .09, kind: 0, s: .8 + r() * .6, ph: r() * 6.28, seed: r() * 1000 }));
    this.fgBubbles = Array.from({ length: 4 }, () => ({ x: .86 + r() * .12, y: r(), r: 5 + r() * 9, v: .03 + r() * .03, ph: r() * 6.28 }));
    this.blooms = Array.from({ length: 24 }, (_, i) => ({ u: i < 8 ? r() * .08 : r() * 1.05, x: r(), r: 50 + r() * 170, s: r() * 6, light: r() < .3 }));
    this.cacheEls(); if (import.meta.env.DEV) window.__dive = this;
    this.raf = requestAnimationFrame(this.tick);
  }
  componentDidUpdate() { this.cacheEls(); }
  componentWillUnmount() {
    cancelAnimationFrame(this.raf);
    removeEventListener('storage', this.onStorage); removeEventListener('wheel', this.onWheel); removeEventListener('keydown', this.onKey);
    removeEventListener('pointerdown', this.onPD); removeEventListener('touchstart', this.onTS); removeEventListener('touchmove', this.onTM);
  }

  // the line that colours the squid: Sound's red where it leaves the dot, turning to the squid's pink (244,138,172) as it arrives
  redToPink(ctx, A, B) { const gr = ctx.createLinearGradient(A[0], A[1], B[0], B[1]); gr.addColorStop(0, 'rgb(232,34,44)'); gr.addColorStop(.35, 'rgb(232,34,44)'); gr.addColorStop(1, 'rgb(244,138,172)'); return gr; }
  // flight stroke (matches Home's travelling lines): fading tail, swelling body, tapered head, head dot
  brushFly(ctx, pts, w, a, col, swell = 1.4, dot = true) {
    const n = pts.length; if (n < 2) return;
    const d = [0]; for (let i = 1; i < n; i++) d[i] = d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const T = d[n - 1] || 1, N = [], W2 = [], A2 = [];
    for (let i = 0; i < n; i++) { const q = pts[Math.min(n - 1, i + 1)], pr = pts[Math.max(0, i - 1)], tx = q[0] - pr[0], ty = q[1] - pr[1], tl = Math.hypot(tx, ty) || 1, u = d[i] / T;
      N.push([-ty / tl, tx / tl]); W2.push(w * (1 + swell * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 1.3)) * (.86 + .14 * Math.sin(d[i] * .045)) * Math.sqrt(clamp((T - d[i]) / (w * 6), .08, 1)) * Math.sqrt(clamp(d[i] / (w * 5), .1, 1))); A2.push(a * (.12 + .88 * Math.pow(u, .7))); }
    ctx.fillStyle = col;
    for (let i = 0; i < n - 1; i++) { const p0 = pts[i], p1 = pts[i + 1], h0 = W2[i] / 2, h1 = W2[i + 1] / 2; ctx.globalAlpha = (A2[i] + A2[i + 1]) / 2; ctx.beginPath();
      ctx.moveTo(p0[0] - N[i][0] * h0, p0[1] - N[i][1] * h0); ctx.lineTo(p1[0] - N[i + 1][0] * h1, p1[1] - N[i + 1][1] * h1); ctx.lineTo(p1[0] + N[i + 1][0] * h1, p1[1] + N[i + 1][1] * h1); ctx.lineTo(p0[0] + N[i][0] * h0, p0[1] + N[i][1] * h0); ctx.closePath(); ctx.fill(); }
    if (dot) { const p = pts[n - 1]; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(3.5, w * 1.1), 0, 6.2832); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  brush(ctx, pts, w, a, d0, tA, tB, col) {
    const n = pts.length; if (n < 2) return;
    const d = [0]; for (let i = 1; i < n; i++) d[i] = d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const T = d[n - 1] || 1, Lp = [], Rp = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[Math.min(n - 1, i + 1)], pr = pts[Math.max(0, i - 1)];
      let tx = q[0] - pr[0], ty = q[1] - pr[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const dd = d[i] + (d0 || 0);
      let ww = w * (.84 + .16 * Math.sin(dd * .045) + .1 * Math.sin(dd * .011 + 2));
      if (tA) ww *= Math.sqrt(clamp(d[i] / (w * 7), .05, 1));
      if (tB) ww *= Math.sqrt(clamp((T - d[i]) / (w * 9), .05, 1));
      Lp.push([p[0] - ty * ww / 2, p[1] + tx * ww / 2]); Rp.push([p[0] + ty * ww / 2, p[1] - tx * ww / 2]);
    }
    ctx.globalAlpha = a; ctx.fillStyle = col || this.ink; ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(Lp[i][0], Lp[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]);
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }

  // the rope's lay: thin slanted darker-sand lines between its strands, so it reads as twisted rope rather than a line.
  // They sit inside the rope's own width (which swells and thins like the brush), and after the drop-in they spread down from the buoy
  ropeTwist(ctx, o, a0, a1, LS) {
    if (this.twistT0 == null) this.twistT0 = this.rt || 0;
    const reach = ((this.rt || 0) - this.twistT0 - .15) * 650, P = 5.5, SL = 1.3; if (reach <= 0) return;
    ctx.lineWidth = .9; ctx.lineCap = 'round';
    for (let y = a0 + ((P - ((a0 - o.y) % P)) % P); y < a1; y += P) {
      const k = smooth(clamp((reach - (y - LS)) / 90, 0, 1)); if (k <= 0) break;
      const wy = y - o.y, hw = ROPE_W * (.84 + .16 * Math.sin(wy * .045) + .1 * Math.sin(wy * .011 + 2)) / 2 - .45, x = o.x + Math.sin(wy * .02) * .7;
      ctx.globalAlpha = .7 * k; ctx.strokeStyle = 'rgb(150,124,84)';
      ctx.beginPath(); ctx.moveTo(x - hw, y + hw * SL); ctx.lineTo(x + hw, y - hw * SL); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'butt';
  }

  cu(k) { const r = { r: [.02, .24], g: [.16, .44], b: [.36, .66], y: [.58, .88] }[k], f = this.cf || 0; return smooth(clamp((f - r[0]) / (r[1] - r[0]), 0, 1)); }
  tint(hex, k) { const c = hexC(hex); return css(mixC(greyOf(c), c, (this.props.gris ?? false) ? this.cu(k) : 1)); }
  thermo() { const mpe = this.props.metersPerEntry ?? 3, n = this.count || 16; return (Math.max(1, Math.round(n * .4)) + .5) * mpe; }
  waterAt(m) {
    const base = scaleAt((this.props.darken ?? true) ? m : Math.min(m, 8));
    if (!(this.props.gris ?? false)) return base;
    const sat = this.cu('g') + (this.cu('b') - this.cu('g')) * smooth(clamp(m / 22, 0, 1));
    return mixC(greyOf(base), base, sat);
  }
  inkFor(m) { const c = lum(this.waterAt(m)); return cr(c, lum([20, 20, 20])) >= cr(c, lum(PAPER)) ? '#141414' : '#f5f3ee'; }
  fillCol(m) {
    const end = Math.max(1, this.yToM(this.lineEnd || 1)), f = clamp(m / end, 0, 1), A = [232, 121, 43], B = [212, 69, 42], C = [242, 128, 96];
    return f < .45 ? mixC(A, B, f / .45) : mixC(B, C, (f - .45) / .55);
  }
  inkAtDepth(m) {
    if (this.flipM == null) this.inkBlend(0);
    if (this.flipM > 60) return '#141414';
    const k = smooth(clamp((m - this.flipM + 3) / 6, 0, 1)), A = [20, 20, 20];
    return css(A.map((v, j) => v + (PAPER[j] - v) * k));
  }
  inkBlend(m) {
    if (this.flipM == null || this.flipDk !== (this.props.darken ?? true) || this.flipTh !== this.thermo()) { this.flipTh = this.thermo(); this.flipDk = this.props.darken ?? true; this.flipM = 999; for (let x = 0; x <= 52; x += .25) if (this.inkFor(x) !== '#141414') { this.flipM = x; break; } }
    if (this.flipM > 60) return '#141414';
    const tgt = this.inkTgt ?? 0; this.inkTgt = m > this.flipM + .8 ? 1 : m < this.flipM - .8 ? 0 : tgt;
    const now = performance.now(), dt = Math.min(.05, (now - (this.inkLast || now)) / 1000); this.inkLast = now;
    this.inkK = (this.inkK ?? this.inkTgt) + (this.inkTgt - (this.inkK ?? this.inkTgt)) * (1 - Math.exp(-dt * 2.2));
    const k = smooth(clamp(this.inkK, 0, 1)), A = [20, 20, 20];
    return css(A.map((v, j) => v + (PAPER[j] - v) * k));
  }
  mToY(m) { const pos = this.pos, n = pos.length, mpe = this.props.metersPerEntry ?? 3; if (!n) return m * 40; const f = m / mpe - 1; if (f <= 0) return (f + 1) * pos[0]; if (f >= n - 1) return pos[n - 1] + (f - n + 1) * (n > 1 ? pos[n - 1] - pos[n - 2] : 100); const i = Math.floor(f); return pos[i] + (pos[i + 1] - pos[i]) * (f - i); }
  yToM(wy) { const pos = this.pos, n = pos.length, mpe = this.props.metersPerEntry ?? 3; if (!n) return Math.max(0, wy / 40); if (wy <= pos[0]) return Math.max(0, wy / pos[0]) * mpe; for (let i = 0; i < n - 1; i++) if (wy <= pos[i + 1]) return (i + 1 + (wy - pos[i]) / (pos[i + 1] - pos[i])) * mpe; return (n + (wy - pos[n - 1]) / (n > 1 ? pos[n - 1] - pos[n - 2] : 100)) * mpe; }
  cacheEls() {
    const w = this.worldRef.current; if (!w) return;
    const els = [];
    w.querySelectorAll('[data-entry]').forEach(r => { els[+r.getAttribute('data-i')] = { root: r, conn: r.querySelector('[data-conn]'), block: r.querySelector('[data-block]'), label: r.querySelector('[data-label]'), dot: r.querySelector('[data-dotc]'), id: r.getAttribute('data-id') }; });
    this.els = els.filter(Boolean);
  }

  skipIntro() { if (!this.state.introDone) this.introT = Math.max(this.introT, this.introEnd); }
  wheel(e) {
    const sc = e.target.closest && e.target.closest('[data-scroll]');
    if (sc) { const dy = e.deltaY; if ((dy > 0 && sc.scrollTop + sc.clientHeight < sc.scrollHeight - 1) || (dy < 0 && sc.scrollTop > 0)) return; }
    e.preventDefault();
    let dy = e.deltaY; if (e.deltaMode === 1) dy *= 32; if (!dy) dy = e.deltaX;
    this.push(dy);
  }
  push(dy) {
    if (!this.state.introDone) { this.skipIntro(); return; }
    if (!this.count) return;
    const pos = this.pos, n = pos.length, f = this.target;
    let sp = pos[0] || 200;
    if (f >= 0 && n > 1) { const i = Math.min(n - 2, Math.floor(f)); sp = pos[i + 1] - pos[i]; }
    this.target = clamp(this.target + dy / sp, -1, this.count - 1);
  }
  key(e) {
    if (!this.state.introDone) { this.skipIntro(); return; }
    const k = e.key;
    if (k === 'Escape') { if (this.state.exp != null) this.setState({ exp: null }); else this.goSurface(); return; }
    if (k === 'Enter') { const i = Math.round(this.target); if (i >= 0) this.go(i); return; }
    let s = 0; if (k === 'ArrowDown' || (k === ' ' && !e.shiftKey)) s = 1; else if (k === 'ArrowUp') s = -1; else return;
    e.preventDefault();
    this.target = clamp(Math.round(this.target) + s, -1, this.count - 1);
  }
  go(i) { this.target = i; }
  navHov = null; waveRef = React.createRef();
  goHome = e => { e.preventDefault(); if (this.leaveT != null) return; const o = {}; try { document.querySelectorAll('[data-navk]').forEach(el => { const d = el.querySelector('[data-navdot]'); if (!d) return; const r = d.getBoundingClientRect(); o[el.getAttribute('data-navk')] = [r.left + r.width / 2, r.top + r.height / 2]; }); o.ink = o.home; sessionStorage.setItem('nav-from', JSON.stringify(o)); } catch (x) {} const far = this.p > -.9; this.goSurface(); this.navPos = o; try { let mb = 0; document.querySelectorAll('nav[aria-label="Pages"] [data-navk]').forEach(el => { const r = el.getBoundingClientRect(); mb = Math.max(mb, r.bottom); }); this.navBot = mb; } catch (x) {} setTimeout(() => { this.leaveT = 0; }, far ? 1300 : 0); };
  goPage = k => e => { if (e) e.preventDefault(); if (this.leaveT != null || this.pgLeave) return; this.pgLeave = { href: k === 'sound' ? BASE + 'sound/?from=page' : BASE + 'library/', t: 0, k }; };
  goSurface = () => { this.target = -1; this.setState({ exp: null }); };

  tick = now => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(.05, (now - (this.last || now)) / 1000); this.last = now; this.lastDT = dt;
    this.rt = (this.rt || 0) + dt;
    if (this.leaveT != null && this.navPos) { const kk = clamp((this.leaveT - 1.75) / 1.4, 0, 1), e2 = kk * kk * kk * (kk * (kk * 6 - 15) + 10), dy = innerHeight * 1.05 * e2, sw = Math.sin(this.leaveT * 2.4) * 6 * (1 - e2);
      this.tideY = dy + sw; if (this.canvasRef.current) this.canvasRef.current.style.transform = 'none'; [this.fgRef, this.chromeRef].forEach(r => { const el = r.current; if (!el) return; el.style.clipPath = 'none'; el.style.filter = 'none'; el.style.opacity = '1'; el.style.transform = 'translateY(' + (dy + sw).toFixed(1) + 'px)'; });
 }
    if (this.tideIntro && this.leaveT == null) { const kk = clamp((this.introT - this.tide0) / 1.5, 0, 1), e2 = kk * kk * kk * (kk * (kk * 6 - 15) + 10), dy = innerHeight * 1.05 * (1 - e2), sw = Math.sin(this.introT * 2.4) * 6 * (1 - e2);
      this.tideY = this.state.introDone ? 0 : dy + sw; if (this.canvasRef.current) this.canvasRef.current.style.transform = 'none'; [this.fgRef, this.chromeRef].forEach(r => { const el = r.current; if (el) el.style.transform = this.tideY ? 'translateY(' + this.tideY.toFixed(1) + 'px)' : 'none'; }); }
    if (this.leaveT != null) { this.leaveT += dt;
      // once the colour is in, each label is drawn up into its dot: rising, narrowing, softening
      document.querySelectorAll('nav[aria-label="Pages"] > [data-navk]').forEach((el, i) => { const lab = el.querySelector(':scope > span:last-child'), dot = el.querySelector('[data-navdot]'); if (!lab) return;
        const k = clamp((this.leaveT - SWIRL_DUR * .85 - i * .1) / .75, 0, 1), e = k * k * (3 - 2 * k); lab.style.transformOrigin = '50% 0'; lab.style.transform = 'translateY(' + (-30 * e).toFixed(1) + 'px) scaleY(' + (1 - .85 * e).toFixed(3) + ') scaleX(' + (1 - .5 * e).toFixed(3) + ')'; lab.style.opacity = (1 - e).toFixed(3); lab.style.filter = e > .02 ? 'blur(' + (2.5 * e).toFixed(2) + 'px)' : '';
        if (dot && k > 0) { const u = clamp((k - .55) / .45, 0, 1); dot.style.transform = 'scale(' + (1 + .18 * Math.sin(Math.PI * u)).toFixed(3) + ')'; } });
      if (this.leaveT > SWIRL_DUR * .85 + 1.25 && !this.left) { this.left = true; (window.__leave || (h => { location.href = h; }))(BASE + '?from=dive'); } }
    if ((this.fromHome || this.fromSound) && !this.navLabDone) { const k = this.state.introDone ? 1 : smooth(clamp((this.introT - (this.fromSound ? 3 : 1.3)) / .9, 0, 1)); if (this.fromSound && k >= 1) document.querySelectorAll('[data-navdot]').forEach(d => { d.style.opacity = '1'; }); document.querySelectorAll('nav[aria-label="Pages"] > [data-navk] > span:last-child').forEach(el => { el.style.opacity = k.toFixed(3); }); if (k >= 1) this.navLabDone = true; }
    if (!this.state.introDone) { this.introT += dt; if (this.introT >= this.introEnd) this.setState({ introDone: true }); }
    this.p += (this.target - this.p) * (1 - Math.exp(-dt * 5.5));
    if (Math.abs(this.target - this.p) < .0002) this.p = this.target;
    if (this.state.exp != null && Math.abs(this.target - this.state.exp) > .6) this.setState({ exp: null });
    const f = this.p > -.5 && this.count ? clamp(Math.round(this.p), 0, this.count - 1) : -1;
    if (f !== this.state.focus) this.setState({ focus: f });
    this.layout(dt);
    if (this.pgLeave) { const L = this.pgLeave; L.t += dt; const k = smooth(clamp(L.t / .45, 0, 1));
      [this.canvasRef, this.waveRef, this.fgRef].forEach(r => { if (r.current) r.current.style.opacity = (1 - k).toFixed(3); }); [this.worldRef, this.chromeRef].forEach(r => { if (r.current) r.current.style.opacity = ((+r.current.style.opacity || 0) * (1 - k)).toFixed(3); });
      const d = document.querySelector('[data-navk="' + L.k + '"] [data-navdot]'); if (d) d.style.transform = 'scale(' + (1 + .6 * Math.sin(Math.PI * clamp(L.t / .55, 0, 1))).toFixed(3) + ')';
      // for Sound: the menu's names fade and only the dots stay; Sound takes them over from exactly where they sit
      if (L.k === 'sound') document.querySelectorAll('nav[aria-label="Pages"] [data-navk] > span:not([data-navdot])').forEach(sp => { sp.style.opacity = (1 - k).toFixed(3); });
      if (L.t > .55 && !this.left) { this.left = true;
        if (L.k === 'sound') try { const o = {}; document.querySelectorAll('[data-navk]').forEach(el => { const d = el.querySelector('[data-navdot]'); if (!d) return; const r = d.getBoundingClientRect(); o[el.getAttribute('data-navk')] = [r.left + r.width / 2, r.top + r.height / 2]; }); o.ink = o.home; sessionStorage.setItem('nav-from', JSON.stringify(o)); } catch (e) {}
        (window.__leave || (h => { location.href = h; }))(L.href); } }
    if (this.state.introDone && this.count) {
      this.unl = this.unl || {}; this.gBlooms = this.gBlooms || [];
      const fNow = clamp((this.p + 1) / this.count, 0, 1);
      this.cf = (this.cf || 0) + (fNow - (this.cf || 0)) * (1 - Math.exp(-dt * 1.5));
      [['r', .12], ['g', .3], ['b', .5], ['y', .72]].forEach(([k, th]) => {
        if (fNow < th - .04) this.unl[k] = null;
        if (this.unl[k] == null && fNow >= th) { this.unl[k] = this.rt; if ((this.props.gris ?? false) && (k === 'g' || k === 'b')) { const W = innerWidth, H = innerHeight, n = 3;
          this.gBlooms.push({ k, t0: this.rt, x: (this.off || {}).x || ropeX(innerWidth), y: this.anchor || H * .3, seed: Math.random() * 6, sc: 1 });
          for (let q = 0; q < n; q++) this.gBlooms.push({ k, t0: this.rt + .25 + q * .35 + Math.random() * .3, x: W * (.25 + Math.random() * .7), y: H * (.1 + Math.random() * .85), seed: Math.random() * 6, sc: .35 + Math.random() * .4 }); } }
      });
    }
    if (this.props.motion ?? true) this.t += dt;
    this.draw(this.t);
    if (!this.readied) { this.readied = true; window.__ready && window.__ready(); }
  };

  layout(dt) {
    const root = this.rootRef.current, world = this.worldRef.current; if (!root || !world) return;
    const vw = innerWidth, vh = innerHeight, narrow = vw < 720, LX = ropeX(vw);
    this.LX = LX;
    if (this.vwSeen !== vw || this.vhSeen !== vh) {
      this.vwSeen = vw; this.vhSeen = vh;
      const s = (k, v) => root.style.setProperty(k, v), wr = clamp(vw - LX - 30 - 348 - 60, 260, 640);
      s('--colw', clamp(vw - LX - 90, 200, 560) + 'px'); s('--colwr', (narrow ? vw - LX - 30 - 14 : wr) + 'px'); s('--colwx', (wr + 348) + 'px');
      // on a narrow screen an entry's card opens under its title, the width of the screen, instead of off to the right (where it wouldn't fit)
      [['--cardPos', 'relative', 'absolute'], ['--cardL', '0px', '348px'], ['--cardT', '0px', '2px'], ['--cardMT', '14px', '0px'], ['--connD', 'none', 'block']].forEach(([k, n, w]) => s(k, narrow ? n : w));
      s('--cardmaxv', Math.round(vh * .58) + 'px');
    }
    const k2 = 1 - Math.exp(-dt * 9), els = this.els, n = els.length, S = narrow ? 86 : 100;
    const pos = []; let a = narrow ? 64 : 80;
    for (let i = 0; i < n; i++) {
      // an open card under its title (narrow screens) pushes the entries below it down by its height
      const e = els[i], m = narrow && e.root.querySelector('[data-scroll]') && e.block ? Math.max(0, e.block.offsetHeight - 10) : 0, prev = this.sizes[e.id] ?? m, sz = prev + (m - prev) * k2;
      this.sizes[e.id] = sz; pos[i] = a; a += Math.max(S, sz + 30);
    }
    this.pos = pos; this.lineEnd = n ? pos[n - 1] + 160 : vh;
    const pp = this.p;
    for (let i = 0; i < n; i++) {
      const e = els[i], d = Math.abs(i - pp);
      e.root.style.transform = `translate(0,${pos[i]}px)`;
      e.root.style.color = this.inkFor((i + 1) * (this.props.metersPerEntry ?? 3));
      const lab = smooth(clamp(1.7 - d * .6, 0, 1)), labB = (1 - lab) * 4;
      if (e.label) { e.label.style.opacity = lab.toFixed(3); e.label.style.filter = labB > .1 ? `blur(${labB.toFixed(1)}px)` : ''; e.label.style.transform = `translateY(${((1 - lab) * (i > pp ? 6 : -6)).toFixed(1)}px)`; e.label.style.fontWeight = i === this.state.focus ? '500' : ''; }
      if (e.conn && e.label) { const lw = e.label.offsetWidth + 12; e.conn.style.left = lw + 'px'; e.conn.style.width = Math.max(8, 348 - lw) + 'px'; }
      if (e.dot) {
        const sc = d < 1 ? 1.5 - .5 * d : 1;
        e.dot.style.transform = `scale(${sc.toFixed(3)})`;
        e.dot.style.opacity = '1';
        { const filled = i === (this.ropeDot ?? -1); const dc = this.inkFor((i + 1) * (this.props.metersPerEntry ?? 3)); e.dot.style.background = filled ? css(this.fillCol((i + 1) * (this.props.metersPerEntry ?? 3))) : dc; e.dot.style.outlineColor = dc; e.dot.style.transition = filled ? 'background .35s ease' : 'none'; }
        e.dot.style.outlineStyle = i === this.state.focus ? 'solid' : 'none'; e.dot.style.outlineWidth = '1px'; e.dot.style.outlineOffset = '3px';
      }
    }
    let along = 0;
    if (n) { if (pp <= 0) along = (pp + 1) * pos[0]; else { const i0 = Math.min(n - 1, Math.floor(pp)), i1 = Math.min(n - 1, i0 + 1); along = pos[i0] + (pos[i1] - pos[i0]) * (pp - i0); } }
    const b = smooth(clamp(pp + 1, 0, 1)), anchor = Math.max(vh * .26, 190) + (vh * .3 - Math.max(vh * .26, 190)) * b;
    const oy = anchor - along;
    world.style.transform = `translate(${LX}px,${oy.toFixed(2)}px)`;
    this.off = { x: LX, y: oy };
    this.along = along; this.anchor = anchor;
    this.bg = css(PAPER); this.ink = this.inkBlend(Math.max(0, pp + 1) * (this.props.metersPerEntry ?? 3));
    root.style.color = this.ink;
    const ui = this.state.introDone ? 1 : clamp((this.introT - this.tideEnd - .25) / .6, 0, 1);
    world.style.opacity = ui.toFixed(3);
    world.style.top = (this.tideY || 0).toFixed(1) + 'px';
    if (this.chromeRef.current) this.chromeRef.current.style.opacity = ui.toFixed(3);
    if (this.depthRef.current) this.depthRef.current.textContent = (Math.max(0, pp + 1) * (this.props.metersPerEntry ?? 3)).toFixed(1) + ' m';
  }

  waveY(x, k, t) { return k * 16 + Math.sin(x * .011 + t * .6 + k * 1.3) * 7 * (1 - k * .25) + Math.sin(x * .029 - t * .9 + k * 2) * 3; }
  wallX(m, W) { return W - 64 - 14 * Math.sin(m * .35) - 8 * Math.sin(m * 1.1 + 1); }

  // the little squid (drawn by the squid-draw module)
  drawOcto(ctx, x, y, s, t, v, col, rot = 0, happy = 0) { drawSquid(ctx, x, y, s, t, v, col, rot, happy); }
  drawBuoy(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(Math.sin(t * 1.1) * .06);
    ctx.strokeStyle = '#141414'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -46); ctx.stroke();
    { const k = this.flagDrain || 0, c = this.redC || [240, 68, 58], m = (a, b) => Math.round(a + (b - a) * k); ctx.fillStyle = `rgb(${m(c[0], 236)},${m(c[1], 230)},${m(c[2], 218)})`; } ctx.beginPath(); ctx.rect(0, -46, 22, 14); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#f6efe0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(1.8, -44.2); ctx.lineTo(20.2, -33.8); ctx.stroke();
    { const k = this.buoyDrain || 0, m = (a, b) => Math.round(a + (b - a) * k); ctx.fillStyle = `rgb(${m(255, 236)},${m(118, 230)},${m(18, 218)})`; } ctx.strokeStyle = '#141414'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 13, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f6efe0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, 0, 22, 3.5, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(0, 0, 22, 13, 0, 0, 6.2832); ctx.stroke();
    ctx.restore();
  }
  // leaving for Home: each surface line lifts off in turn and dances its own figure up to its menu dot
  // black: one grand calligraphic swoop, bold in the middle · light blue: a single slow, open loop that swells as it turns · deep blue: a weaving ribbon that twists thin-thick
  // leaving for Home, every line is reeled into its menu dot like a thread: it stays where it is while its leading end lifts off and glides up
  // into the dot, and the rest follows along the same path, always forwards, until the tail goes in. src: the line as it lies (ending where it
  // lifts off), D: the dot, g: 0..1 through the move. O: w (width), a (opacity), colA/colB (colour leaving / arriving), lift (how far the end
  // carries on before turning up), sway (px of side-to-side drift on the way), ph (phase of that drift)
  absorb(ctx, src, D, g, O) {
    if (g <= 0 || g >= 1 || src.length < 2) return;
    const S = src[src.length - 1], P0 = src[Math.max(0, src.length - 4)], tl = Math.hypot(S[0] - P0[0], S[1] - P0[1]) || 1, T = [(S[0] - P0[0]) / tl, (S[1] - P0[1]) / tl], lift = O.lift ?? 90;
    const route = [], ringAt = [], bez = (A, B, C, E, n, sway) => { for (let q = 1; q <= n; q++) { const u = q / n, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3, sw = (sway || 0) * Math.sin(Math.PI * u) * Math.sin(2 * Math.PI * u + (O.ph || 0));
      route.push([a * A[0] + b * B[0] + c * C[0] + d * E[0] + sw, a * A[1] + b * B[1] + c * C[1] + d * E[1]]); } };
    if (O.ring) {
      // into the middle of the screen, round it clockwise on its own ring (drawing in a little as it goes, like water down a drain) with
      // the other colours on theirs, and out of the ring at the point where it is already heading for its dot
      const M = [innerWidth / 2, innerHeight * .48], r0 = O.ring, rAt = u => r0 * (1 - .28 * u), TAU = Math.PI * 2;
      const a0 = Math.atan2(S[1] - M[1], S[0] - M[0]) + .5, aOut = Math.atan2(D[1] - M[1], D[0] - M[0]) - Math.PI / 2, sweep = TAU * 1.2 + (((aOut - a0 - TAU * 1.2) % TAU) + TAU) % TAU;
      const on = u => { const a = a0 + sweep * u, r = rAt(u); return [M[0] + Math.cos(a) * r, M[1] + Math.sin(a) * r]; }, tan = u => { const a = a0 + sweep * u; return [-Math.sin(a), Math.cos(a)]; };
      const E = on(0), tE = tan(0), d1 = Math.hypot(E[0] - S[0], E[1] - S[1]);
      bez(S, [S[0] + T[0] * lift, S[1] + T[1] * lift - lift * .5], [E[0] - tE[0] * d1 * .45, E[1] - tE[1] * d1 * .45], E, 40, O.sway);
      ringAt.push(route.length); const N = Math.ceil(sweep / TAU * 64); for (let q = 1; q <= N; q++) route.push(on(q / N)); ringAt.push(route.length);
      const X = on(1), tX = tan(1), d2 = Math.hypot(D[0] - X[0], D[1] - X[1]);
      bez(X, [X[0] + tX[0] * d2 * .4, X[1] + tX[1] * d2 * .4], [D[0] - 30, D[1] + Math.min(d2 * .3, 110)], D, 40, 0);
    } else { // the plain route rises in an arc: up and a little onwards first, then curving over and in to the dot from below-left
      const dist = Math.hypot(D[0] - S[0], D[1] - S[1]); bez(S, [S[0] + T[0] * lift + dist * .12, S[1] + T[1] * lift - Math.min(dist * .42, 190)], [D[0] - dist * .3, D[1] + dist * .18], D, 48, O.sway); }
    const all = src.concat(route), nS = src.length, sl = [0]; for (let q = 1; q < all.length; q++) sl.push(sl[q - 1] + Math.hypot(all[q][0] - all[q - 1][0], all[q][1] - all[q - 1][1]));
    const tot = sl[sl.length - 1], srcL = sl[nS - 1], io = v => v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
    // the head eases off the end of the line and into the dot; the tail sets off a little later and catches it up exactly at the dot
    const ge = io(clamp(g / .82, 0, 1)), Lin = ringAt.length ? sl[nS - 1 + ringAt[0]] : 0, Lout = ringAt.length ? sl[nS - 1 + ringAt[1]] : 0;
    const head = !ringAt.length ? srcL + (tot - srcL) * ge : ge < .3 ? srcL + (Lin - srcL) * ge / .3 : ge < .74 ? Lin + (Lout - Lin) * (ge - .3) / .44 : Lout + (tot - Lout) * (ge - .74) / .26, cut = Math.min(head, tot * io(clamp((g - .1) / .9, 0, 1)));
    const at = q => { if (q <= 0) return all[0]; let k = 1; while (k < all.length - 1 && sl[k] < q) k++; const f = (q - sl[k - 1]) / Math.max(1e-6, sl[k] - sl[k - 1]); return [all[k - 1][0] + (all[k][0] - all[k - 1][0]) * f, all[k - 1][1] + (all[k][1] - all[k - 1][1]) * f]; };
    const P = [at(cut)], L = [cut]; for (let q = 0; q < all.length; q++) if (sl[q] > cut && sl[q] < head) { P.push(all[q]); L.push(sl[q]); } P.push(at(head)); L.push(head);
    const n = P.length; if (n < 2 || head - cut < .5) return;
    for (let q = 0; q < n - 1; q++) { const pr = P[Math.max(0, q - 1)], nx = P[q + 1], n2 = P[Math.min(n - 1, q + 2)], p0 = P[q], t0x = nx[0] - pr[0], t0y = nx[1] - pr[1], l0 = Math.hypot(t0x, t0y) || 1, t1x = n2[0] - p0[0], t1y = n2[1] - p0[1], l1 = Math.hypot(t1x, t1y) || 1;
      const wAt = v => O.w * Math.sqrt(clamp((head - v) / 24, .1, 1)) * Math.sqrt(clamp((v - cut) / 40, .1, 1)), h0 = wAt(L[q]) / 2, h1 = wAt(L[q + 1]) / 2;
      const ur = clamp((L[q] - srcL) / Math.max(1, tot - srcL), 0, 1); ctx.fillStyle = css(mixC(O.colA, O.colB, smooth(ur))); ctx.globalAlpha = O.a ?? .95;
      ctx.beginPath(); ctx.moveTo(p0[0] + t0y / l0 * h0, p0[1] - t0x / l0 * h0); ctx.lineTo(nx[0] + t1y / l1 * h1, nx[1] - t1x / l1 * h1); ctx.lineTo(nx[0] - t1y / l1 * h1, nx[1] + t1x / l1 * h1); ctx.lineTo(p0[0] - t0y / l0 * h0, p0[1] + t0x / l0 * h0); ctx.closePath(); ctx.fill(); }
    // a small bead leads the thread in
    const hp = P[n - 1], ur = clamp((head - srcL) / Math.max(1, tot - srcL), 0, 1); ctx.globalAlpha = 1; ctx.fillStyle = css(mixC(O.colA, O.colB, smooth(ur))); ctx.beginPath(); ctx.arc(hp[0], hp[1], O.w * .55 + 1.6 * smooth(clamp((g - .55) / .3, 0, 1)), 0, 6.2832); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // each surface line, reeled in from its right-hand end
  reelWave(ctx, k, st, sy, o, t, W) {
    const lt = this.leaveT, NP = this.navPos, D = NP[k === 0 ? 'home' : 'freediving'] || [W - 40, 28], T0 = [.3, .42, .54][k], DUR = SWIRL_DUR, g = (lt - T0) / DUR;
    const src = []; for (let x = -20; x <= W - 6; x += 10) src.push([x, sy + this.waveY(x - o.x, k, t)]);
    const col = [[20, 20, 20], [0, 158, 224], [34, 86, 186]][k];
    if (g <= 0) { this.brush(ctx, src, st[0], st[1], k * 200, true, false, css(col)); return; }
    this.absorb(ctx, src, D, g, { w: st[0] * 1.4, a: Math.min(1, st[1] + .35), colA: col, colB: col, lift: 60 + 30 * k, sway: [10, 22, 16][k], ph: k * 1.3, ring: [92, 128, 110][k] });
    this.navPulse(k ? 'freediving' : 'home', g);
  }
  // arriving from Sound: the beads' timings. Each line's bead reaches the left edge, sweeps across (its line drawn behind it), then lifts off
  // the right end and up into its menu dot. k: 0 black (Home's dot), 1 light blue and 2 deep blue (this page's dot, split in two)
  SND = { down: .75, sweep: 1.5, lag: [0, .1, .2], up: .8 };
  sndRev(T, k) { const S = this.SND, u = (T - S.down - S.lag[k]) / S.sweep; return u <= 0 ? 0 : smooth(clamp(u, 0, 1)); }
  sndDots(ctx, T, sy, o, t, W, H) {
    const S = this.SND, nf = this.fromSound, ease = v => v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2, bz = (P0, C1, C2, P1, u) => { const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3; return [a * P0[0] + b * C1[0] + c * C2[0] + d * P1[0], a * P0[1] + b * C1[1] + c * C2[1] + d * P1[1]]; };
    if (!this.sndNav) { this.sndNav = {}; document.querySelectorAll('[data-navk]').forEach(el => { const d = el.querySelector('[data-navdot]'); if (!d) return; const r = d.getBoundingClientRect(); this.sndNav[el.getAttribute('data-navk')] = [r.left + r.width / 2, r.top + r.height / 2]; d.style.opacity = '0'; }); }
    const NV = this.sndNav, land = k => { const d = document.querySelector('[data-navk="' + k + '"] [data-navdot]'); if (d && d.style.opacity !== '1') d.style.opacity = '1'; };
    const bead = (p, col, r) => { ctx.globalAlpha = 1; ctx.fillStyle = css(col); ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 6.2832); ctx.fill(); };
    const COL = [[20, 20, 20], [0, 158, 224], [34, 86, 186]], FD = [24, 88, 224];
    // the three surface beads
    for (let k = 0; k < 3; k++) { const from = k ? nf.freediving : nf.home, L = [-6, sy + this.waveY(-6 - o.x, k, t)], R = [W - 6, sy + this.waveY(W - 6 - o.x, k, t)], D = NV[k ? 'freediving' : 'home'] || [W - 40, 28];
      const g0 = (T - S.lag[k] * .5) / S.down, rv = this.sndRev(T, k), gu = (T - S.down - S.lag[k] - S.sweep) / S.up; let p, col = COL[k], r = 4.5 - k * .6;
      if (g0 < 1) { const u = ease(clamp(g0, 0, 1)); p = bz(from, [from[0], from[1] - 120], [L[0] + 140, L[1] - 60], L, u); if (k) col = mixC(FD, COL[k], u); }
      else if (gu <= 0) { const x = -20 + (W + 40) * rv, xx = Math.min(x, W - 6); p = [xx, sy + this.waveY(xx - o.x, k, t)]; }
      else if (gu < 1) { const u = ease(clamp(gu, 0, 1)); p = bz(R, [R[0] + 30, R[1] - 90], [D[0] - 20, D[1] + 120], D, u); if (k) col = mixC(COL[k], FD, u); r = r + (4.5 - r) * u; }
      else { land(k ? 'freediving' : 'home'); continue; }
      bead(p, col, r); }
    // the other dots fly straight up into their places in the menu
    const RGB = { sound: [232, 34, 44], journal: [255, 196, 0], c4: [255, 118, 18], c5: [22, 168, 82], c6: [138, 64, 214] };
    Object.keys(RGB).forEach((k, i) => { const from = nf[k], D = NV[k]; if (!from || !D) { land(k); return; } const g = (T - .15 - i * .08) / 1.1; if (g >= 1) { land(k); return; }
      const u = ease(clamp(g, 0, 1)), p = bz(from, [from[0] - 60, from[1] - 220], [D[0] - 40, D[1] + 160], D, u); bead(p, RGB[k], 4); });
  }
  // a menu dot breathes once as the tail of its line goes in
  navPulse(key, g) { const d = document.querySelector('[data-navk="' + key + '"] [data-navdot]'); if (!d) return; const u = clamp((g - .88) / .3, 0, 1); d.style.transform = 'scale(' + (1 + .22 * Math.sin(Math.PI * u)).toFixed(3) + ')'; d.style.boxShadow = 'none'; }
  drawFG(W, H, t, intro, an, al, sway) {
    const cv = this.fgRef.current; if (!cv) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (intro) return;
    const PF = 1.7, SY = m => an + (this.mToY(m) - al) * PF, surf = an + (0 - al) * PF;
    ctx.save(); ctx.lineCap = 'round';
    const col = 'rgba(6,18,22,.88)';
    for (const it of this.fgItems) {
      const y = SY(it.m), x = it.x * W, s = it.s * clamp(W / 1100, .6, 1); if (y < surf + 40 || y < -260 || y > H + 260) continue;
      if (it.kind === 0) { for (let k = 0; k < 5; k++) { const pts = [], L = (130 + k * 30) * s; for (let i = 0; i <= 10; i++) { const f = i / 10; pts.push([x + (k - 2) * 9 * s + Math.sin(t * .8 + it.ph + k + f * 3) * 14 * f * sway, y + 120 * s - f * L]); } this.brush(ctx, pts, 11 * s, .9, k * 40, false, true, col); } }
      else if (it.kind === 1) { const rr = rng(it.seed | 0); const grow = (x0, y0, a, len, d) => { const ex = x0 + Math.cos(a) * len, ey = y0 + Math.sin(a) * len; this.brush(ctx, [[x0, y0], [(x0 + ex) / 2 + (rr() - .5) * 8, (y0 + ey) / 2], [ex, ey]], 3 + d * 2.4, .9, 0, false, true, col); if (d > 0) { grow(ex, ey, a - .4 - rr() * .2, len * .74, d - 1); grow(ex, ey, a + .4 + rr() * .2, len * .74, d - 1); } }; grow(x + 30 * s, y + 90 * s, -Math.PI * .6 + Math.sin(t * .6 + it.ph) * .03 * sway, 50 * s, 4); }
      else { ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * 6.2832, rr = 70 * s * (1 + .18 * Math.sin(a * 3 + it.ph) + .08 * Math.sin(a * 7)); const px = x + 40 * s + Math.cos(a) * rr * 1.2, py = y + 40 * s + Math.sin(a) * rr * .8; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.fill(); }
    }
    ctx.strokeStyle = 'rgba(246,239,224,.55)'; ctx.lineWidth = 1.6;
    for (const b of this.fgBubbles) {
      const y = H + 40 - ((b.y + t * b.v) % 1) * (H + 80) - ((al * PF) % (H + 80)) * 0; if (y < surf + 20) continue;
      ctx.beginPath(); ctx.arc(b.x * W + Math.sin(t + b.ph) * 6, y, b.r, 0, 6.2832); ctx.stroke();
    }
    ctx.restore();
  }
  drawFish(ctx, f, wag) {
    const INK = '#141414';
    ctx.fillStyle = f.c; ctx.beginPath(); ctx.ellipse(0, 0, 18, 7, 0, 0, 6.2832); ctx.fill();
    ctx.save(); ctx.translate(-16, 0); ctx.rotate(wag); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, -8); ctx.quadraticCurveTo(-8, 0, -12, 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke(); ctx.restore();
    if (f.c !== '#f2efe6') { ctx.fillStyle = '#f6efe0'; ctx.beginPath(); ctx.ellipse(-2, -2, 6, 3, -.3, 0, 6.2832); ctx.fill(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 18, 7, 0, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(11, -1.5, 1.4, 0, 6.2832); ctx.fill();
  }
  drawTurtle(ctx, t) {
    const INK = '#141414', fl = Math.sin(t * 1.4) * .4;
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.fillStyle = '#93a878';
    [[12, -12, -.9 + fl, -10, 13], [12, 12, .9 - fl, 10, 13], [-16, -9, -.5 - fl * .5, -6, 7], [-16, 9, .5 + fl * .5, 6, 7]].forEach(q => {
      ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(q[2]); ctx.beginPath(); ctx.ellipse(0, q[3] * .6, 5, Math.abs(q[4]), 0, 0, 6.2832); ctx.fill(); ctx.stroke(); ctx.restore();
    });
    ctx.beginPath(); ctx.ellipse(31, 0, 8, 6, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6b7f4f'; ctx.beginPath(); ctx.ellipse(0, 0, 25, 18, 0, 0, 6.2832); ctx.fill();
    ctx.globalAlpha = .55; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, 13, 8, 0, 0, 6.2832); ctx.stroke();
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.2832 + .5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 13, Math.sin(a) * 8); ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 17); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(0, 0, 25, 18, 0, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(35, -2.5, 1.3, 0, 6.2832); ctx.fill();
  }
  drawManta(ctx, t) {
    const f = .75 + .25 * Math.sin(t * 1.1);
    ctx.fillStyle = '#2c475d'; ctx.strokeStyle = '#141414'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(28, -4); ctx.quadraticCurveTo(10, -30 * f, -6, -54 * f); ctx.quadraticCurveTo(-8, -20, -22, -6); ctx.lineTo(-22, 6);
    ctx.quadraticCurveTo(-8, 20, -6, 54 * f); ctx.quadraticCurveTo(10, 30 * f, 28, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(27, -4); ctx.quadraticCurveTo(34, -6, 37, -10); ctx.moveTo(27, 4); ctx.quadraticCurveTo(34, 6, 37, 10); ctx.stroke();
    this.brush(ctx, [[-22, 0], [-40, 1], [-62, Math.sin(t) * 3]], 2.4, 1, 0, false, true, '#141414');
  }
  drawThresher(ctx, t, ghost) {
    const body = ghost ? '#3e5a72' : '#6d8aa0', wag = Math.sin(t * 2.2) * .15;
    ctx.fillStyle = body; ctx.strokeStyle = '#141414'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(4, -9); ctx.lineTo(-6, -24); ctx.lineTo(-11, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 6); ctx.lineTo(0, 21); ctx.lineTo(-3, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(42, 0); ctx.quadraticCurveTo(32, -10, 0, -10); ctx.quadraticCurveTo(-24, -8, -36, -2); ctx.lineTo(-36, 2); ctx.quadraticCurveTo(-20, 8, 0, 9); ctx.quadraticCurveTo(30, 9, 42, 0); ctx.closePath(); ctx.fill();
    if (!ghost) { ctx.fillStyle = '#d9e3e6'; ctx.beginPath(); ctx.moveTo(38, 2); ctx.quadraticCurveTo(28, 9, 0, 9); ctx.quadraticCurveTo(-20, 8, -30, 3); ctx.quadraticCurveTo(0, 4, 38, 2); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(42, 0); ctx.quadraticCurveTo(32, -10, 0, -10); ctx.quadraticCurveTo(-24, -8, -36, -2); ctx.lineTo(-36, 2); ctx.quadraticCurveTo(-20, 8, 0, 9); ctx.quadraticCurveTo(30, 9, 42, 0); ctx.stroke();
    ctx.save(); ctx.translate(-36, 0); ctx.rotate(wag);
    ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(-40, -10, -96, -30); ctx.quadraticCurveTo(-44, -4, 0, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(-12, 11); ctx.lineTo(-6, 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.arc(31, -2, 2.2, 0, 6.2832); ctx.fill();
  }
  drawSardines(ctx, t, R) {
    ctx.lineWidth = .7; ctx.strokeStyle = 'rgba(20,20,20,.7)'; ctx.fillStyle = '#e9eef0';
    for (const f of this.sardines) {
      const a = f.a + t * .45 * f.v, rr = R * f.rr * (1 + .18 * Math.sin(a * 3 + t * .7)), x = Math.cos(a) * rr, y = Math.sin(a) * rr * .55 + Math.sin(f.z + t) * 4;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2 + Math.atan2(.55, 1) * Math.cos(a) * .3);
      ctx.beginPath(); ctx.ellipse(0, 0, 5, 1.6, 0, 0, 6.2832); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }

  draw(t) {
    const cv = this.canvasRef.current; if (!cv) return;
    const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); this.grainP = null; }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const o = this.off || { x: ropeX(W), y: Math.max(H * .26, 190) }, T = this.introT, intro = !this.state.introDone, rt = this.rt || 0;
    const an = this.anchor ?? Math.max(H * .26, 190), al = this.along ?? 0, SY = (m, pf) => an + (this.mToY(m) - al) * pf;
    const mNow = this.yToM(Math.max(0, al)), sway = (this.props.motion ?? true) ? 1 : 0;
    ctx.fillStyle = this.bg || css(PAPER); ctx.fillRect(0, 0, W, H);
    const sy = o.y, labels = [];

    { const ur = this.cu('r'), uy = this.cu('y');
      if ((ur > 0 || uy > 0) && sy > -40) { const g3 = ctx.createLinearGradient(0, sy - 220, 0, sy + 10); const c = mixC(HUES.r, HUES.b, uy * .5);
        g3.addColorStop(0, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},0)`); g3.addColorStop(1, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${.3 * Math.max(ur, uy)})`);
        ctx.fillStyle = g3; ctx.fillRect(0, sy - 220, W, 232); } }
    const wA = intro && !this.tideIntro ? smooth(clamp((T - 1) / 1.6, 0, 1)) : 1;
    if (wA > 0 && sy < H + 40) {
      const wb = intro ? sy + (H - sy + 60) * wA : H + 60;
      ctx.save(); if (this.tideY) ctx.translate(0, this.tideY); ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 12) { const y = sy + this.waveY(x - o.x, 0, t) - 3 + Math.sin(x * .07 + 1) * 2.5; x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      for (let x = W + 20; x >= -20; x -= 16) ctx.lineTo(x, wb + Math.sin(x * .02) * 14 + Math.sin(x * .05 + 2) * 6);
      ctx.closePath();
      const ga = Math.max(sy - 10, -10), gb = H + 10, gr = ctx.createLinearGradient(0, ga, 0, gb);
      for (let k = 0; k <= 10; k++) gr.addColorStop(k / 10, css(this.waterAt(this.yToM(ga + (gb - ga) * k / 10 - o.y))));
      ctx.globalAlpha = wA; ctx.fillStyle = gr; ctx.fill(); ctx.clip();

      // far marine snow
      for (const p of this.snow) if (!p.near) {
        const y = ((p.y * H * 2 - al * .4 - t * 3) % (H * 2) + H * 2) % (H * 2) - H * .5; if (y < sy + 20 || y > H) continue;
        ctx.globalAlpha = .25 * wA; ctx.fillStyle = css(mixC([240, 246, 250], HUES.y, this.cu('y') * .8)); ctx.beginPath(); ctx.arc(p.x * W, y, p.r * .7, 0, 6.2832); ctx.fill();
      }
      // light shafts
      const surf = clamp(1 - mNow / 16, 0, 1) * wA;
      if (surf > .01) {
        if (!this.shaftC) { const c = document.createElement('canvas'); c.width = 160; c.height = 520; const x = c.getContext('2d'); x.filter = 'blur(22px)'; const g = x.createLinearGradient(0, 30, 0, 500); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(55, 30); x.lineTo(105, 30); x.lineTo(130, 500); x.lineTo(30, 500); x.closePath(); x.fill(); this.shaftC = c; }
        const top = SY(0, .55);
        for (let i = 0; i < 5; i++) {
          const x = W * (.08 + i * .2) + Math.sin(t * .09 + i * 1.7) * W * .03, sw = W * (.12 + .05 * Math.sin(i * 2.3)), op = .5 + .5 * Math.sin(t * .25 + i * 2.1);
          ctx.globalAlpha = surf * (.1 + .08 * op) * (1 + .5 * this.cu('y'));
          ctx.save(); ctx.translate(x, top - 20); ctx.transform(1, 0, .18, 1, 0, 0); ctx.drawImage(this.shaftC, -sw / 2, 0, sw, H * .75); ctx.restore();
        }
      }
      ctx.globalAlpha = 1;

      if (!intro) for (const sc of this.schools) {
        const cy = SY(sc.m, .4); if (cy < -80 || cy > H + 80) continue;
        const cx = sc.x * W + Math.sin(t * .04 + sc.ph) * W * .12, dir = Math.cos(t * .04 + sc.ph) >= 0 ? 1 : -1;
        ctx.fillStyle = 'rgba(8,30,40,.3)';
        for (const f of sc.f) { const x = cx + f.dx + Math.sin(t * .8 + f.ph) * 6, y = cy + f.dy + Math.cos(t * .6 + f.ph) * 4; ctx.beginPath(); ctx.ellipse(x, y, 4.5, 1.6, 0, 0, 6.2832); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - dir * 4, y); ctx.lineTo(x - dir * 7, y - 2); ctx.lineTo(x - dir * 7, y + 2); ctx.closePath(); ctx.fill(); }
      }

      // creatures, far to near
      const live = this.life.slice().sort((a, b) => a.pf - b.pf);
      const drawLife = c => {
        const y = SY(c.m, c.pf);
        if (!intro && c.seen == null && y > -40 && y < H * .95) c.seen = rt;
        if (c.seen == null || y < -160 || y > H + 160) return;
        const ap = smooth(clamp((rt - c.seen) / 1.8, 0, 1)), ph = t * c.sp + c.ph;
        const x = c.x * W + Math.sin(ph) * c.rg + (1 - ap) * W * .5, dir = c.k === 'sardines' ? 1 : (Math.cos(ph) >= 0 ? 1 : -1);
        const s = c.s * clamp(W / 1100, .6, 1);
        ctx.save(); ctx.globalAlpha = (c.far ? .55 : 1) * (.3 + .7 * ap); ctx.translate(x, y); ctx.scale(dir * s, s);
        if (c.k === 'turtle') this.drawTurtle(ctx, t); else if (c.k === 'manta') this.drawManta(ctx, t); else if (c.k === 'thresher') this.drawThresher(ctx, t, c.far); else if (c.k === 'sardines') this.drawSardines(ctx, t, 80);
        ctx.restore(); ctx.globalAlpha = 1;
      };

      // reef fish
      for (const f of this.fish) {
        const yy = SY(f.m, 1) + Math.sin(t * .5 + f.ph) * 8; if (yy < -40 || yy > H + 40 || intro) continue;
        const ph = t * f.sp + f.ph, xx = f.x * W + Math.sin(ph) * f.rg, dir = Math.cos(ph) >= 0 ? 1 : -1;
        ctx.save(); ctx.translate(xx, yy); ctx.scale(dir * f.s, f.s); this.drawFish(ctx, f, Math.sin(t * 6 + f.ph) * .25 * sway); ctx.restore();
      }

      // surface streaks
      for (const sk of this.streaks) {
        const yy = SY(sk.m, 1); if (yy < -20 || yy > H + 20) continue;
        const pts = []; for (let x = -20; x < W * .7; x += 24) pts.push([x, yy + Math.sin(x * .009 + t * .5 + sk.ph) * 9]);
        this.brush(ctx, pts, 2.6, .28 * wA, sk.ph * 100, true, true, '#f6efe0');
      }
      // bubbles along the line
      ctx.lineWidth = 1.1; ctx.strokeStyle = '#f6efe0';
      for (const b of this.bubbles) {
        const yy = H - ((b.y + t * b.v) % 1) * (H - Math.max(0, sy)); if (yy < sy + 10) continue;
        ctx.globalAlpha = .5; ctx.beginPath(); ctx.arc(o.x + b.x + Math.sin(t + b.ph) * 3, yy, b.r, 0, 6.2832); ctx.stroke();
      }
      // near marine snow (fastest layer)
      for (const p of this.snow) if (p.near) {
        const y = ((p.y * H * 2 - al * 1.6 - t * 6) % (H * 2) + H * 2) % (H * 2) - H * .5; if (y < sy + 20 || y > H) continue;
        ctx.globalAlpha = .4; ctx.fillStyle = css(mixC([240, 246, 250], HUES.y, this.cu('y') * .8)); ctx.beginPath(); ctx.arc(p.x * W, y, p.r * 1.8, 0, 6.2832); ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }

    // waves
    const wcv = this.waveRef.current, wctx = wcv && wcv.getContext('2d');
    if (wcv) { if (wcv.width !== cv.width || wcv.height !== cv.height) { wcv.width = cv.width; wcv.height = cv.height; } wctx.setTransform(1, 0, 0, 1, 0, 0); wctx.clearRect(0, 0, wcv.width, wcv.height); wctx.setTransform(dpr, 0, 0, dpr, 0, 0); wctx.lineCap = 'round'; wctx.lineJoin = 'round'; }
    const WX = wctx || ctx;
    this.buoyDrain = 0; this.flagDrain = 0;
    if (!this.redC) { const d = document.querySelector('[data-navk="sound"] [data-navdot]'); if (d) { const m = getComputedStyle(d).backgroundColor.match(/\d+/g); if (m) this.redC = m.slice(0, 3).map(Number); } }
    const sm = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
    const stream = (A, B, hk, u0, col, w, up) => { const C1 = up ? [A[0] + 60, A[1] - 110] : [A[0] - 40, A[1] + 90], C2 = up ? [B[0] - 120, B[1] + 90] : [B[0] + 70, B[1] - 120], ap = [];
      for (let q = 0; q <= 48; q++) { const u = q / 48, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3; ap.push([a * A[0] + b * C1[0] + c * C2[0] + d * B[0], a * A[1] + b * C1[1] + c * C2[1] + d * B[1]]); }
      const sl = [0]; for (let q = 1; q < ap.length; q++) sl.push(sl[q - 1] + Math.hypot(ap[q][0] - ap[q - 1][0], ap[q][1] - ap[q - 1][1]));
      const tot = sl[sl.length - 1], pts = ap.filter((p, q) => sl[q] <= tot * hk && sl[q] >= tot * u0); if (pts.length >= 2) { if (up) this.brushFly(WX, pts, w, .95, col, 1.5, hk < 1); else this.brush(WX, pts, w * (1 - .4 * u0), .95, 40, true, hk < 1, col); } };
    const pulseDot = (k, p, col) => { const dot = document.querySelector('[data-navk="' + k + '"] [data-navdot]'); if (dot) { dot.style.transform = 'scale(' + (1 + .8 * p).toFixed(3) + ')'; dot.style.boxShadow = p > .01 ? '0 0 ' + (12 * p).toFixed(1) + 'px ' + (3 * p).toFixed(1) + 'px ' + col : 'none'; } };
    const RED = 'rgb(' + (this.redC || [240, 68, 58]).join(',') + ')', ORG = 'rgb(255,118,18)';
    const flagAt = b => [b[0] + 11 * b[2], b[1] - 39 * b[2]];
    // leaving for Home: each colour lifts off as a soft bead of light and drifts up into its menu dot, which breathes once as it takes it in
    this.sqDrain = 0;
    if (this.leaveT != null && this.navPos && this.navPos.c4 && this.buoyPos) {
      const lt = this.leaveT, B = this.buoyPos, F = flagAt(B), ez = v => v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2, DUR = 1.5;
      const RC = this.redC || [232, 34, 44], tB = .1, tF = .2, tS = .4, BS = B[2] || 1, DU = { b: SWIRL_DUR, f: SWIRL_DUR, s: SWIRL_DUR };
      this.buoyDrain = smooth(clamp((lt - tB) / .7, 0, 1)); this.flagDrain = smooth(clamp((lt - tF) / .7, 0, 1)); this.sqDrain = smooth(clamp((lt - tS) / .7, 0, 1));
      // buoy: off along the top of its float, left to right; flag: along its top edge; squid: up through its body
      const buoySrc = Array.from({ length: 13 }, (_, q) => { const a = Math.PI + q / 12 * Math.PI; return [B[0] + Math.cos(a) * 22 * BS, B[1] + Math.sin(a) * 13 * BS]; });
      const flagSrc = [[B[0], B[1] - 46 * BS], [B[0] + 11 * BS, B[1] - 46.5 * BS], [B[0] + 22 * BS, B[1] - 46 * BS]];
      this.absorb(WX, buoySrc, this.navPos.c4, (lt - tB) / DU.b, { w: 3.4, colA: [255, 118, 18], colB: [255, 118, 18], lift: 40, sway: 18, ph: .4, ring: 74 }); this.navPulse('c4', (lt - tB) / DU.b);
      if (this.navPos.sound) { this.absorb(WX, flagSrc, this.navPos.sound, (lt - tF) / DU.f, { w: 3, colA: RC, colB: RC, lift: 30, sway: 10, ph: 1.9, ring: 56 });
        if (this.sqPos) { const [qx, qy] = this.sqPos; this.absorb(WX, [[qx, qy + 22], [qx, qy + 8], [qx, qy - 8], [qx, qy - 20]], this.navPos.sound, (lt - tS) / DU.s, { w: 3.4, colA: [244, 138, 172], colB: RC, lift: 50, sway: 24, ph: 3.1, ring: 146 }); }
        this.navPulse('sound', Math.max((lt - tF) / DU.f, (lt - tS) / DU.s)); }
    }
    if (sy > -80 && sy < H + 80) {
      [[3.2, .9], [1.8, .55], [1.1, .3]].forEach((st, k) => {
        const rev = intro && this.fromSound ? this.sndRev(T, k) : intro && !this.skipWaves ? smooth(clamp((T - k * .25) / 1.6, 0, 1)) : 1; if (rev <= 0) return;
        const xe = -20 + (W + 40) * rev; let pts = [];
        if (this.leaveT != null && this.navPos) { this.reelWave(WX, k, st, sy, o, t, W); return; }
        for (let x = -20; x <= xe; x += 10) pts.push([x, sy + this.waveY(x - o.x, k, t)]);
        pts.push([xe, sy + this.waveY(xe - o.x, k, t)]);
        this.brush(WX, pts, st[0], st[1], k * 200, true, rev < 1, k === 0 ? '#141414' : k === 1 ? 'rgb(0,158,224)' : 'rgb(34,86,186)');
      });
    }

    if (intro && this.fromSound) this.sndDots(WX, T, sy, o, t, W, H);
    // the line (stays at the surface while the water rises in; sinks with the water on the way out)
    ctx.save(); if (this.tideY && this.leaveT != null) ctx.translate(0, this.tideY);
    const bob = Math.sin(t * 1.3) * 2, BS = clamp(W / 900, .75, 1), BY = sy + this.waveY(0, 0, t) - 2 + bob, LS = BY + 12 * BS;
    if (intro) {
      const d = smooth(clamp((T - this.tideEnd) / 1.0, 0, 1)), drop = this.fromHome ? 1 : smooth(clamp((T - (this.fromSound ? 2.75 : 1.6)) / .4, 0, 1));
      if (d > 0) { const end = LS + (H + 20 - LS) * d, pts = []; for (let y = LS; y <= end; y += 15) pts.push([o.x + Math.sin((y - o.y) * .02) * .7, y]); pts.push([o.x + Math.sin((end - o.y) * .02) * .7, end]); this.brush(ctx, pts, ROPE_W + 1.8, .85, LS - o.y, false, d < 1, ROPE_EDGE); this.brush(ctx, pts, ROPE_W - .2, 1, LS - o.y, false, d < 1, ROPE_SAND); }
      if (drop > 0) { this.buoyPos = [o.x, BY - (1 - drop) * 60, BS * drop]; this.drawBuoy(ctx, o.x, BY - (1 - drop) * 60, BS * drop, t); }
    } else {
      const a0 = Math.max(LS, -20), a1 = Math.min(o.y + this.lineEnd, H + 20);
      // one stroke all the way down (drawn in pieces, every join showed as a band across the rope): its dark edge, then the sand over it
      if (a1 > a0) { const pts = []; for (let y = a0; y < a1; y += 15) pts.push([o.x + Math.sin((y - o.y) * .02) * .7, y]); pts.push([o.x + Math.sin((a1 - o.y) * .02) * .7, a1]);
        this.brush(ctx, pts, ROPE_W + 1.8, .85, a0 - o.y, false, false, ROPE_EDGE); this.brush(ctx, pts, ROPE_W - .2, 1, a0 - o.y, false, false, ROPE_SAND); }
      if (a1 > a0) this.ropeTwist(ctx, o, a0, a1, LS);
      { const pz = this.pos, nowT = performance.now(), dtT = Math.min(.05, (nowT - (this.tailT || nowT)) / 1000); this.tailT = nowT;
        const head = Math.max(0, al), dA = head - (this.prevAl ?? head); this.prevAl = head; const kk = 1 - Math.exp(-dtT * 3.5);
        // the orange line runs down the rope from the surface into the nearest post's dot, so it's clear which entry is selected; when the nearest
        // post changes it glides on to the new one (it never stops between posts)
        const fN = this.p > -.5 && pz.length ? clamp(Math.round(this.p), 0, pz.length - 1) : -1, tgt = fN >= 0 ? pz[fN] : 0;
        this.fillY = this.fillY == null ? tgt : this.fillY + (tgt - this.fillY) * (1 - Math.exp(-dtT * 7)); if (Math.abs(tgt - this.fillY) < .3) this.fillY = tgt;
        const top = 0, bot = this.fillY; this.ropeDot = fN;
        const fy = o.y + bot, f0 = Math.max(o.y + top, LS, -20), f1 = Math.min(fy, H + 20);
        if (f1 > f0) {
          for (let ya = f0; ya < f1; ya += 18) { const yb = Math.min(f1, ya + 19), pts = []; for (let y = ya; y <= yb; y += 6) pts.push([o.x + Math.sin((y - o.y) * .02) * .7, y]); pts.push([o.x + Math.sin((yb - o.y) * .02) * .7, yb]); this.brush(ctx, pts, 3.6, 1, ya - o.y, ya === LS, false, css(this.fillCol(this.yToM((ya + yb) / 2 - o.y)))); }
        }
        // the squid keeps beside the nearest post, gliding over when it changes (on the rope, so it moves with it as the page scrolls)
        { const sqT = fN >= 0 ? pz[fN] : (pz[0] || 0); this.sqHY = this.sqHY == null ? sqT : this.sqHY + (sqT - this.sqHY) * (1 - Math.exp(-dtT * 5));
          const hy = o.y + this.sqHY, vis = this.state.introDone && hy > LS && hy < H + 30; this.octA = (this.octA || 0) + ((vis ? 1 : 0) - (this.octA || 0)) * (1 - Math.exp(-dtT * 5)); if (this.sqI != null && this.sqI < 9) this.octA = Math.max(this.octA, .03);
          if (this.octA > .02) { const vel = dA / Math.max(dtT, .001); this.octV = (this.octV || 0) + (vel - (this.octV || 0)) * (1 - Math.exp(-dtT * 5));
            this.octPh = (this.octPh || 0) + dA * .05 + dtT * (1.1 + 2.5 * clamp(Math.abs(this.octV) / 400, 0, 1));
            const sv = clamp(this.octV / 500, -1, 1), dz = 0, ox = o.x - 26 + Math.sin(this.rt * .9) * 2, oy = hy - 6 - sv * 10 + Math.sin(this.rt * 1.7) * 3;
            // on load, the red (Sound) dot pours into the pale squid: red + white paper = pink
            this.sqT = (this.sqT ?? 99) + (this.octA > .5 ? dtT : 0); const sk = this.sqT, hk = smooth(clamp((sk - .2) / 1.0, 0, 1)), u0 = smooth(clamp((sk - .85) / .7, 0, 1)), fillK = smooth(clamp((sk - .95) / .8, 0, 1));
            if (hk > 0 && u0 < 1) { if (!this.sqSrc) { const d = document.querySelector('[data-navk="sound"] [data-navdot]'), rt0 = this.rootRef.current; if (d && rt0) { const r = d.getBoundingClientRect(), r0 = rt0.getBoundingClientRect(); this.sqSrc = [r.left + r.width / 2 - r0.left, r.top + r.height / 2 - r0.top]; } }
              if (this.sqSrc) { const A = this.sqSrc, B2 = [ox, oy], C1 = [A[0] - 40, A[1] + 170], C2 = [B2[0] + 170, B2[1] - 70], ap = []; for (let q = 0; q <= 48; q++) { const u = q / 48, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3; ap.push([a * A[0] + b * C1[0] + c * C2[0] + d * B2[0], a * A[1] + b * C1[1] + c * C2[1] + d * B2[1]]); }
                const pts = ap.slice(Math.floor(u0 * 48), Math.ceil(hk * 48) + 1); if (pts.length >= 2) this.brushFly(ctx, pts, 3.2, .95, this.redToPink(ctx, A, B2), 1.2, hk < 1); } }
            if (this.sqRot == null) this.sqRot = Math.PI; if (this.sqTo == null) this.sqTo = Math.PI; if (this.octV > 40) this.sqTo = Math.PI; else if (this.octV < -40) this.sqTo = 0; this.sqRot += (this.sqTo - this.sqRot) * (1 - Math.exp(-dtT * 6));
            // arrival: swims in pale from the bottom right, loops, a line from the red Sound dot pours in its pink (it smiles ^^), then it swims over to the line
            if (this.sqI == null && vis && (this.props.motion ?? true)) this.sqI = 0; if (this.sqI != null) this.sqI += dtT;
            const I = this.sqI ?? 99, SW = 1.7, RD0 = SW + .05, RD1 = RD0 + 1.3, LP0 = RD1 + .15, LP1 = LP0 + 2.1, GO0 = LP1, GO1 = GO0 + 1.5, ez = v => v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2, wrapA = a => Math.atan2(Math.sin(a), Math.cos(a)), dirA = (dx, dy) => Math.atan2(dx, -dy), lerpA = (a, b, u) => a + wrapA(b - a) * u;
            const M = [W * .5 + 30, Math.max(H * .5 - 30, (this.anchor || 190) + 60)], bz3 = (A, C1, C2, B, u) => { const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3; return [a * A[0] + b * C1[0] + c * C2[0] + d * B[0], a * A[1] + b * C1[1] + c * C2[1] + d * B[1]]; };
            let dx = ox, dy = oy, dr = this.sqRot, dv = clamp(this.octV / 500, -1, 1), fill = fillK, happy = I > RD0 + 1.0 && I < GO1 + 1.2 ? 1 : 0;
            const travel = (A, C1, C2, B, k, r0, r1) => { const p = bz3(A, C1, C2, B, k), q = bz3(A, C1, C2, B, Math.min(1, k + .02)); dx = p[0]; dy = p[1]; const sa = k > .985 ? r1 : dirA(q[0] - p[0], (q[1] - p[1]) || -.001); dr = lerpA(lerpA(r0, sa, smooth(clamp(k / .15, 0, 1))), r1, smooth(clamp((k - .8) / .2, 0, 1))); dv = .9 * Math.sin(Math.PI * Math.min(1, k * 1.1)); };
            if (I < SW) { travel([W + 40, H + 50], [W * .86, H * .9], [M[0] + 120, M[1] + 120], M, ez(clamp(I / SW, 0, 1)), 0, 0); fill = 0; }
            else if (I < GO0) { dx = M[0]; dy = M[1] + Math.sin(this.rt * 1.7) * 3; dr = 0; dv = 0; fill = smooth(clamp((I - RD0 - .65) / .5, 0, 1));
              if (I >= LP0 && I < LP1) { const k = (I - LP0) / (LP1 - LP0), ph = Math.PI * 2 * Math.pow(k, 1.6), Rl = Math.max(50, Math.min(170, W * .2, (H - M[1] - 70) / 2)), c = [M[0], M[1] + Rl]; dx = c[0] - Rl * Math.sin(ph); dy = c[1] - Rl * Math.cos(ph);
                const ta = dirA(-Math.cos(ph), Math.sin(ph)), bl = smooth(clamp(k / .12, 0, 1)); dr = lerpA(0, ta, bl); dv = .9 * Math.min(1, k * 2.5); }
              if (I >= RD0 && I < RD1) { if (!this.sqSrc) { const d = document.querySelector('[data-navk="sound"] [data-navdot]'), rt0 = this.rootRef.current; if (d && rt0) { const r = d.getBoundingClientRect(), r0 = rt0.getBoundingClientRect(); this.sqSrc = [r.left + r.width / 2 - r0.left, r.top + r.height / 2 - r0.top]; } }
                if (this.sqSrc) { const k = I - RD0, hk = ez(clamp(k / .75, 0, 1)), u0 = ez(clamp((k - .55) / .75, 0, 1)), A = this.sqSrc, B2 = [dx, dy - 6], C1 = [A[0] - 30, A[1] + 140], C2 = [B2[0] + 130, B2[1] - 90], ap = [];
                  for (let q = 0; q <= 48; q++) ap.push(bz3(A, C1, C2, B2, q / 48)); const pts = ap.slice(Math.floor(u0 * 48), Math.ceil(hk * 48) + 1); if (pts.length >= 2) this.brushFly(ctx, pts, 3, .95, this.redToPink(ctx, A, B2), 1.2, hk < 1); } } }
            else if (I < GO1) { // carries straight on out of the loop, heading left, and glides in to the rope
              const Rl = Math.max(50, Math.min(170, W * .2, (H - M[1] - 70) / 2)), D = GO1 - GO0, v = Rl * 2 * Math.PI * 1.6 / (LP1 - LP0), hd = clamp(v * D / 6, 20, Math.abs(M[0] - ox) * .8), A = M, B = [ox, oy], C1 = [M[0] - hd, M[1]], C2 = [B[0] + 90, B[1] + 30];
              const k = clamp((I - GO0) / D, 0, 1), e = 1 - (1 - k) * (1 - k), p = bz3(A, C1, C2, B, e), q = bz3(A, C1, C2, B, Math.min(1, e + .02)); dx = p[0]; dy = p[1];
              const sa = e > .985 ? this.sqRot : dirA(q[0] - p[0], (q[1] - p[1]) || -.001); dr = lerpA(sa, this.sqRot, smooth(clamp((k - .7) / .3, 0, 1))); dv = .9 * (1 - k); fill = 1; }
            else fill = 1;
            const PK = [244, 138, 172], PA = [246, 241, 236], sqCol = 'rgb(' + PK.map((v, i) => Math.round(PA[i] + (v - PA[i]) * fill * (1 - (this.sqDrain || 0)))).join(',') + ')'; this.sqPos = [dx, dy];
            ctx.globalAlpha = I < GO1 ? 1 : this.octA; this.drawOcto(ctx, dx, dy, 1.35, this.rt, dv, sqCol, dr, happy); ctx.globalAlpha = 1; } } }
      const be = o.y + this.lineEnd;
      if (be > -20 && be < H + 40) { ctx.strokeStyle = this.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(o.x, be + 4, 4, 0, 6.2832); ctx.stroke(); ctx.fillStyle = '#141414'; ctx.fillRect(o.x - 14, be + 8, 28, 10); ctx.strokeStyle = '#f6efe0'; ctx.lineWidth = 1; ctx.strokeRect(o.x - 14, be + 8, 28, 10); }
      if (BY > -60 && BY < H + 40) { this.buoyPos = [o.x, BY, BS]; this.drawBuoy(ctx, o.x, BY, BS, t); } else this.buoyPos = null;
    }

    ctx.restore();
    if (this.gBlooms && this.gBlooms.length) {
      this.gBlooms = this.gBlooms.filter(b => rt - b.t0 < 4.5);
      const live = this.gBlooms.filter(b => rt >= b.t0);
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      for (const b of live) {
        const k = clamp((rt - b.t0) / 4.5, 0, 1), e = 1 - Math.pow(1 - k, 2), R = 10 + e * Math.hypot(W, H) * 1.1 * (b.sc || 1), c = HUES[b.k], a = Math.sin(k * Math.PI);
        ctx.beginPath();
        for (let i = 0; i <= 48; i++) { const an2 = i / 48 * 6.2832, rr = R * (1 + .1 * Math.sin(an2 * 3 + b.seed) + .05 * Math.sin(an2 * 7 + b.seed * 2) + .03 * Math.sin(an2 * 13)); const px = b.x + Math.cos(an2) * rr, py = b.y + Math.sin(an2) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.closePath();
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${.1 * a})`; ctx.fill();
        ctx.strokeStyle = `rgba(${c[0] * .7 | 0},${c[1] * .7 | 0},${c[2] * .7 | 0},${.18 * a})`; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.restore();
    }
    if (!this.grainP) this.grainP = ctx.createPattern(this.grainC, 'repeat');
    // arriving from Home, start at Home's grain strength and deepen to this page's as the water rises
    const grainA = this.fromHome && intro ? .35 + .05 * smooth(clamp((T - this.tide0) / 1.8, 0, 1)) : .4;
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = grainA; ctx.fillStyle = this.grainP; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }

  renderVals() {
    const data = this.state.data, mpe = this.props.metersPerEntry ?? 3;
    const list = data ? (data.entries || []).filter(e => e.line === 'down').sort((a, b) => (a.date || '').localeCompare(b.date || '')) : [];
    this.count = list.length;
    const ex = this.state.exp, f = this.state.focus, pad = v => String(v).padStart(2, '0');
    return {
      rootRef: this.rootRef, waveRef: this.waveRef, worldRef: this.worldRef, canvasRef: this.canvasRef, depthRef: this.depthRef, chromeRef: this.chromeRef, fgRef: this.fgRef, stripRef: this.stripRef,
      items: list.map((e, i) => {
        const tags = (Array.isArray(e.tags) ? e.tags : String(e.tags || '').split(',')).map(s => s.trim()).filter(Boolean);
        const paras = String(e.body || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
        let linkLabel = e.link || ''; try { if (e.link) linkLabel = new URL(e.link).hostname.replace(/^www\./, ''); } catch (x) {}
        const isExp = ex === i;
        return {
          id: e.id, i, title: e.title || 'Untitled', meta: `${(i + 1) * mpe} m  ·  ${fmt(e.date)}`,
          short: e.short || '', hasShort: !!e.short, imageBg: e.image ? `url("${String(e.image).replace(/["\\\n\r]/g, c => encodeURIComponent(c))}")` : 'none', hasImage: !!e.image,
          paras, tags, hasTags: tags.length > 0, link: e.link || '', hasLink: !!e.link, linkLabel,
          isExp, notExp: !isExp, isFocus: !isExp && f === i, go: () => this.go(i)
        };
      }),
      counter: f >= 0 ? `${pad(f + 1)} / ${pad(list.length)}` : '',
      goSurface: this.goSurface, goHome: this.goHome,
      navOff: () => this.setState({ navHov: null }),
      nav: Object.fromEntries([['home', '홈', 'Home'], ['freediving', '프리다이빙', 'Freediving'], ['sound', '소리', 'Sound'], ['journal', '서재', 'Library']].map(([k, ko, en]) => { const h = this.state.navHov === k, st = on => ({ a: on ? 1 : 0, y: on ? '0px' : '8px', b: on ? '0px' : '3px' }), E = st(h), K = st(false); return [k, { bp: h ? '28%' : '100%', en: E.a, enY: E.y, enB: E.b, ko: K.a, koY: K.y, koB: K.b, on: () => { if (this.state.navHov !== k) this.setState({ navHov: k }); }, go: this.goPage(k) }]; }))
    };
  }
}

function View(v) {
  return (
    <>
    <div ref={v.rootRef} style={sty("position:fixed;inset:0;overflow:hidden;color:#141414;background:#f5f3ee;font-family:'Newsreader', Georgia, serif;-webkit-font-smoothing:antialiased;touch-action:none;user-select:none")}>
      {"\n  "}
      <canvas ref={v.canvasRef} style={sty("position:absolute;inset:0;width:100%;height:100%;pointer-events:none")} />
      {"\n  "}
      <canvas ref={v.waveRef} style={sty("position:absolute;inset:0;width:100%;height:100%;pointer-events:none")} />
      {"\n\n  "}
      <div ref={v.worldRef} style={sty("position:absolute;left:0;top:0;width:0;height:0;opacity:0;will-change:transform")}>
        {"\n    "}
        {(v.items || []).map((item, $index) => (
          <React.Fragment key={$index}>
            {"\n      "}
            <div data-entry="1" data-i={item?.i} data-id={item?.id} style={sty("position:absolute;left:0;top:0")}>
              {"\n        "}
              <div data-dot="1" onClick={item?.go} style={sty("position:absolute;left:-14px;top:-14px;width:28px;height:28px;display:grid;place-items:center;cursor:pointer")}>
                {"\n          "}
                <div data-dotc="1" style={sty("width:9px;height:9px;border-radius:50%;background:currentColor")} />
                {"\n        "}
              </div>
              {"\n        "}
              <div data-block="1" style={sty("position:absolute;left:30px;top:-15px;width:300px")}>
                {"\n          "}
                <div data-label="1" onClick={item?.go} style={sty("cursor:pointer;display:flex;flex-direction:column;gap:6px;width:max-content;max-width:300px")}>
                  {"\n            "}
                  <div style={sty("font-size:24px;line-height:1.2;letter-spacing:-0.01em;text-wrap:pretty")}>
                    {item?.title}
                  </div>
                  {"\n            "}
                  <div style={sty("font-family:'JetBrains Mono', monospace;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase")}>
                    {item?.meta}
                  </div>
                  {"\n          "}
                </div>
                {"\n          "}
                {item?.isFocus ? (
                  <>
                    {"\n            "}
                    <div data-conn="1" style={sty("position:absolute;top:14px;left:300px;width:48px;height:1px;background:currentColor;transform-origin:left center;animation:tlFade .4s both;display:var(--connD, block)")} />
                    {"\n            "}
                    <div data-scroll="1" style={sty("position:var(--cardPos, absolute);left:var(--cardL, 348px);top:var(--cardT, 2px);margin-top:var(--cardMT, 0px);width:var(--colwr, 600px);display:flex;flex-direction:column;gap:18px;max-height:var(--cardmaxv, 62vh);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding:0 12px 0 28px;border-left:1px solid currentColor;box-sizing:border-box;user-select:text;animation:tlR .5s cubic-bezier(.2,.7,.2,1) both")}>
                      {"\n              "}
                      {item?.hasImage ? (
                        <>
                          <div role="img" aria-label={item?.title} style={sty(`width:100%;aspect-ratio:3 / 2;max-height:440px;background-image:${item?.imageBg ?? ''};background-size:cover;background-position:center;filter:grayscale(1)`)} />
                        </>
                      ) : null}
                      {"\n              "}
                      {item?.hasShort ? (
                        <>
                          <p style={sty("margin:0;font-size:22px;line-height:1.4;text-wrap:pretty;max-width:40ch")}>
                            {item?.short}
                          </p>
                        </>
                      ) : null}
                      {"\n              "}
                      {(item?.paras || []).map((para, $index) => (
                        <React.Fragment key={$index}>
                          <p style={sty("margin:0;font-size:17.5px;line-height:1.65;text-wrap:pretty;max-width:62ch")}>
                            {para}
                          </p>
                        </React.Fragment>
                      ))}
                      {"\n              "}
                      {item?.hasTags ? (
                        <>
                          {"\n                "}
                          <div style={sty("display:flex;flex-wrap:wrap;gap:6px")}>
                            {"\n                  "}
                            {(item?.tags || []).map((tag, $index) => (
                              <React.Fragment key={$index}>
                                <span style={sty("font-family:'JetBrains Mono', monospace;font-size:11px;letter-spacing:.05em;padding:3px 9px;border:1px solid currentColor;border-radius:999px")}>
                                  {tag}
                                </span>
                              </React.Fragment>
                            ))}
                            {"\n                "}
                          </div>
                          {"\n              "}
                        </>
                      ) : null}
                      {"\n              "}
                      {item?.hasLink ? (
                        <>
                          <a href={item?.link} target="_blank" rel="noopener" style={sty("align-self:flex-start;font-family:'JetBrains Mono', monospace;font-size:12px;letter-spacing:.04em;text-decoration:none;border-bottom:1px solid currentColor;padding-bottom:2px")}>
                            {item?.linkLabel}
                            {" ↗"}
                          </a>
                        </>
                      ) : null}
                      {"\n            "}
                    </div>
                    {"\n          "}
                  </>
                ) : null}
                {"\n        "}
              </div>
              {"\n      "}
            </div>
            {"\n    "}
          </React.Fragment>
        ))}
        {"\n  "}
      </div>
      {"\n\n  "}
      <canvas ref={v.fgRef} style={sty("position:absolute;inset:0;width:100%;height:100%;pointer-events:none")} />
      {"\n\n  "}
      <nav aria-label="Pages" style={sty("position:absolute;right:12px;top:12px;display:flex;flex-direction:row;align-items:flex-start;z-index:5")}>
        {"\n    "}
        <a href={BASE + "?from=dive"} onClick={v.goHome} aria-label="Home" data-navk="home" onMouseEnter={v.nav?.home?.on} onMouseLeave={v.navOff} onFocus={v.nav?.home?.on} onBlur={v.navOff} style={sty("display:flex;flex-direction:column;align-items:center;gap:8px;width:24px;height:156px;padding:8px 0 0;box-sizing:border-box;border:0;background:none;color:inherit;text-decoration:none;cursor:pointer;font-family:'Newsreader', Georgia, serif;font-size:13px;line-height:1")}>
          <span data-navdot="1" style={sty("width:16px;height:16px;border-radius:50%;background:rgb(20,20,20);flex:none")} />
          <span style={sty("position:relative;display:block;width:100%;height:116px")}>
            <span lang="en" data-lab="nav" aria-hidden="true" style={sty(`position:absolute;left:50%;top:0;writing-mode:vertical-rl;text-orientation:sideways;white-space:nowrap;font-family:Papyrus, 'Papyrus-Regular', 'Newsreader', Georgia, serif;font-weight:400;font-size:19px;letter-spacing:.02em;background-image:linear-gradient(to bottom, rgb(20,20,20) 0%, rgb(20,20,20) 20%, currentColor 60%, currentColor 100%);background-size:100% 300%;background-repeat:no-repeat;background-position:0 ${v.nav?.home?.bp ?? ''};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;transition:opacity .55s ease, transform .7s cubic-bezier(.2,.7,.2,1), filter .55s ease, background-position 1.1s cubic-bezier(.3,.6,.2,1);opacity:${v.nav?.home?.en ?? ''};transform:translateX(-50%) translateY(${v.nav?.home?.enY ?? ''});filter:blur(${v.nav?.home?.enB ?? ''})`)}>
              {"Home"}
            </span>
            <span lang="ko" aria-hidden="true" style={sty(`position:absolute;left:50%;top:0;writing-mode:vertical-rl;text-orientation:upright;white-space:nowrap;font-family:'Noto Serif KR', serif;font-weight:600;font-size:19px;letter-spacing:.08em;background-image:linear-gradient(to bottom, rgb(20,20,20) 0%, rgb(20,20,20) 20%, currentColor 60%, currentColor 100%);background-size:100% 300%;background-repeat:no-repeat;background-position:0 ${v.nav?.home?.bp ?? ''};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;transition:opacity .55s ease, transform .7s cubic-bezier(.2,.7,.2,1), filter .55s ease, background-position 1.1s cubic-bezier(.3,.6,.2,1);opacity:${v.nav?.home?.ko ?? ''};transform:translateX(-50%) translateY(${v.nav?.home?.koY ?? ''});filter:blur(${v.nav?.home?.koB ?? ''})`)}>
              {"홈"}
            </span>
          </span>
        </a>
        {"\n    "}
        <button type="button" onClick={v.goSurface} aria-current="page" aria-label="Freediving, current page, back to the surface" data-navk="freediving" onMouseEnter={v.nav?.freediving?.on} onMouseLeave={v.navOff} onFocus={v.nav?.freediving?.on} onBlur={v.navOff} style={sty("display:flex;flex-direction:column;align-items:center;gap:8px;width:24px;height:156px;padding:8px 0 0;box-sizing:border-box;border:0;background:none;color:inherit;text-decoration:none;cursor:pointer;font-family:'Newsreader', Georgia, serif;font-size:13px;line-height:1")}>
          <span data-navdot="1" style={sty("width:16px;height:16px;border-radius:50%;background:rgb(24,88,224);flex:none")} />
          <span style={sty("position:relative;display:block;width:100%;height:116px")}>
            <span lang="en" data-lab="nav" aria-hidden="true" style={sty(`position:absolute;left:50%;top:0;writing-mode:vertical-rl;text-orientation:sideways;white-space:nowrap;font-family:Papyrus, 'Papyrus-Regular', 'Newsreader', Georgia, serif;font-weight:400;font-size:19px;letter-spacing:.02em;background-image:linear-gradient(to bottom, rgb(24,88,224) 0%, rgb(24,88,224) 20%, currentColor 60%, currentColor 100%);background-size:100% 300%;background-repeat:no-repeat;background-position:0 ${v.nav?.freediving?.bp ?? ''};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;transition:opacity .55s ease, transform .7s cubic-bezier(.2,.7,.2,1), filter .55s ease, background-position 1.1s cubic-bezier(.3,.6,.2,1);opacity:${v.nav?.freediving?.en ?? ''};transform:translateX(-50%) translateY(${v.nav?.freediving?.enY ?? ''});filter:blur(${v.nav?.freediving?.enB ?? ''})`)}>
              {"Freediving"}
            </span>
            <span lang="ko" aria-hidden="true" style={sty(`position:absolute;left:50%;top:0;writing-mode:vertical-rl;text-orientation:upright;white-space:nowrap;font-family:'Noto Serif KR', serif;font-weight:600;font-size:19px;letter-spacing:.08em;background-image:linear-gradient(to bottom, rgb(24,88,224) 0%, rgb(24,88,224) 20%, currentColor 60%, currentColor 100%);background-size:100% 300%;background-repeat:no-repeat;background-position:0 ${v.nav?.freediving?.bp ?? ''};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;transition:opacity .55s ease, transform .7s cubic-bezier(.2,.7,.2,1), filter .55s ease, background-position 1.1s cubic-bezier(.3,.6,.2,1);opacity:${v.nav?.freediving?.ko ?? ''};transform:translateX(-50%) translateY(${v.nav?.freediving?.koY ?? ''});filter:blur(${v.nav?.freediving?.koB ?? ''})`)}>
              {"프리다이빙"}
            </span>
          </span>
        </button>
        {"\n    "}
        <a href={BASE + "sound/"} onClick={v.nav?.sound?.go} aria-label="Sound" data-navk="sound" onMouseEnter={v.nav?.sound?.on} onMouseLeave={v.navOff} onFocus={v.nav?.sound?.on} onBlur={v.navOff} style={sty("display:flex;flex-direction:column;align-items:center;gap:8px;width:24px;height:156px;padding:8px 0 0;box-sizing:border-box;border:0;background:none;color:inherit;text-decoration:none;cursor:pointer;font-family:'Newsreader', Georgia, serif;font-size:13px;line-height:1")}>
          <span data-navdot="1" style={sty("width:16px;height:16px;border-radius:50%;background:rgb(232,34,44);flex:none")} />
          <span style={sty("position:relative;display:block;width:100%;height:116px")}>
            <span lang="en" data-lab="nav" aria-hidden="true" style={sty(`position:absolute;left:50%;top:0;writing-mode:vertical-rl;text-orientation:sideways;white-space:nowrap;font-family:Papyrus, 'Papyrus-Regular', 'Newsreader', Georgia, serif;font-weight:400;font-size:19px;letter-spacing:.02em;background-image:linear-gradient(to bottom, rgb(232,34,44) 0%, rgb(232,34,44) 20%, currentColor 60%, currentColor 100%);background-size:100% 300%;background-repeat:no-repeat;background-position:0 ${v.nav?.sound?.bp ?? ''};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;transition:opacity .55s ease, transform .7s cubic-bezier(.2,.7,.2,1), filter .55s ease, background-position 1.1s cubic-bezier(.3,.6,.2,1);opacity:${v.nav?.sound?.en ?? ''};transform:translateX(-50%) translateY(${v.nav?.sound?.enY ?? ''});filter:blur(${v.nav?.sound?.enB ?? ''})`)}>
              {"Sound"}
            </span>
            <span lang="ko" aria-hidden="true" style={sty(`position:absolute;left:50%;top:0;writing-mode:vertical-rl;text-orientation:upright;white-space:nowrap;font-family:'Noto Serif KR', serif;font-weight:600;font-size:19px;letter-spacing:.08em;background-image:linear-gradient(to bottom, rgb(232,34,44) 0%, rgb(232,34,44) 20%, currentColor 60%, currentColor 100%);background-size:100% 300%;background-repeat:no-repeat;background-position:0 ${v.nav?.sound?.bp ?? ''};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;transition:opacity .55s ease, transform .7s cubic-bezier(.2,.7,.2,1), filter .55s ease, background-position 1.1s cubic-bezier(.3,.6,.2,1);opacity:${v.nav?.sound?.ko ?? ''};transform:translateX(-50%) translateY(${v.nav?.sound?.koY ?? ''});filter:blur(${v.nav?.sound?.koB ?? ''})`)}>
              {"소리"}
            </span>
          </span>
        </a>
        {"\n    "}
        <a href={BASE + "library/"} onClick={v.nav?.journal?.go} aria-label="Library" data-navk="journal" onMouseEnter={v.nav?.journal?.on} onMouseLeave={v.navOff} onFocus={v.nav?.journal?.on} onBlur={v.navOff} style={sty("display:flex;flex-direction:column;align-items:center;gap:8px;width:24px;height:156px;padding:8px 0 0;box-sizing:border-box;border:0;background:none;color:inherit;text-decoration:none;cursor:pointer;font-family:'Newsreader', Georgia, serif;font-size:13px;line-height:1")}>
          <span data-navdot="1" style={sty("width:16px;height:16px;border-radius:50%;background:rgb(255,196,0);flex:none")} />
          <span style={sty("position:relative;display:block;width:100%;height:116px")}>
            <span lang="en" data-lab="nav" aria-hidden="true" style={sty(`position:absolute;left:50%;top:0;writing-mode:vertical-rl;text-orientation:sideways;white-space:nowrap;font-family:Papyrus, 'Papyrus-Regular', 'Newsreader', Georgia, serif;font-weight:400;font-size:19px;letter-spacing:.02em;background-image:linear-gradient(to bottom, rgb(255,196,0) 0%, rgb(255,196,0) 20%, currentColor 60%, currentColor 100%);background-size:100% 300%;background-repeat:no-repeat;background-position:0 ${v.nav?.journal?.bp ?? ''};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;transition:opacity .55s ease, transform .7s cubic-bezier(.2,.7,.2,1), filter .55s ease, background-position 1.1s cubic-bezier(.3,.6,.2,1);opacity:${v.nav?.journal?.en ?? ''};transform:translateX(-50%) translateY(${v.nav?.journal?.enY ?? ''});filter:blur(${v.nav?.journal?.enB ?? ''})`)}>
              {"Library"}
            </span>
            <span lang="ko" aria-hidden="true" style={sty(`position:absolute;left:50%;top:0;writing-mode:vertical-rl;text-orientation:upright;white-space:nowrap;font-family:'Noto Serif KR', serif;font-weight:600;font-size:19px;letter-spacing:.08em;background-image:linear-gradient(to bottom, rgb(255,196,0) 0%, rgb(255,196,0) 20%, currentColor 60%, currentColor 100%);background-size:100% 300%;background-repeat:no-repeat;background-position:0 ${v.nav?.journal?.bp ?? ''};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;transition:opacity .55s ease, transform .7s cubic-bezier(.2,.7,.2,1), filter .55s ease, background-position 1.1s cubic-bezier(.3,.6,.2,1);opacity:${v.nav?.journal?.ko ?? ''};transform:translateX(-50%) translateY(${v.nav?.journal?.koY ?? ''});filter:blur(${v.nav?.journal?.koB ?? ''})`)}>
              {"서재"}
            </span>
          </span>
        </a>
        {"\n    "}
        <span aria-hidden="true" style={sty("display:flex;flex-direction:row;align-items:flex-start")}>
          {"\n      "}
          <span data-navk="c4" style={sty("width:16px;height:32px;display:grid;place-items:center")}>
            <span data-navdot="1" style={sty("width:11px;height:11px;border-radius:50%;background:rgb(255,118,18)")} />
          </span>
          {"\n      "}
          <span data-navk="c5" style={sty("width:16px;height:32px;display:grid;place-items:center")}>
            <span data-navdot="1" style={sty("width:11px;height:11px;border-radius:50%;background:rgb(22,168,82)")} />
          </span>
          {"\n      "}
          <span data-navk="c6" style={sty("width:16px;height:32px;display:grid;place-items:center")}>
            <span data-navdot="1" style={sty("width:11px;height:11px;border-radius:50%;background:rgb(138,64,214)")} />
          </span>
          {"\n    "}
        </span>
        {"\n  "}
      </nav>
      {"\n  "}
      <div ref={v.chromeRef} style={sty("position:absolute;inset:0;pointer-events:none;opacity:0")}>
        {"\n    "}
        <div style={sty("position:absolute;right:120px;bottom:22px;display:flex;flex-direction:column;align-items:flex-end;gap:6px;font-family:'JetBrains Mono', monospace")}>
          {"\n      "}
          <div ref={v.depthRef} style={sty("font-size:28px;font-weight:300;letter-spacing:-0.02em;font-variant-numeric:tabular-nums")}>
            {"0.0 m"}
          </div>
          {"\n      "}
          <div style={sty("font-size:12px;letter-spacing:.08em")}>
            {v.counter}
          </div>
          {"\n    "}
        </div>
        {"\n  "}
      </div>
    </div>
    </>
  );
}

export default page(Component, View, {"gris":false,"intro":true,"darken":true,"motion":true,"metersPerEntry":3});
