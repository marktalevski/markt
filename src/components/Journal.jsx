// Carried over from the Claude Design file "Journal.dc.html": a reading room. Five books (BuJo 2026, Short Readings, Quotes, Pillow Book,
// Musings) lie in a painted stack in the bottom-right corner, a mug on the top one; the book you pick fills a wide reading column on the
// left. A line in the book's colour runs down beside the text and shows where you are in it, with a ring at each section to jump to.
// The logic class is the design's own code; View is its template as JSX.
import React from 'react';
import { DCLogic, page, sty, BASE } from '../lib/dc.js';
import { load } from '../lib/journal-data.js';
import { navAt } from '../lib/nav.js';

const PAGE = 'journal';
const HOME = BASE + '?from=dive';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// each kind of book's paint: its cover, then its accent
const GOUACHE = { bujo: ['#3f5fae', '#e9b949'], readings: ['#d4573f', '#f2d3b0'], quotes: ['#7f63ad', '#f0c94a'], pillow: ['#e39440', '#3f5fae'], musings: ['#5d9a63', '#f4ecdc'] };
// how tall each kind's spine is, against the stack's base height, and the shape of its corners
const SPINE_H = { bujo: 1.08, readings: .94, quotes: .86, pillow: 1, musings: 1.14 };
const SPINE_R = { bujo: '2px 4px 4px 2px', readings: '6px 3px 5px 4px / 4px 6px 3px 5px', quotes: '1px', pillow: '10px 4px 4px 10px', musings: '3px 9px 4px 8px / 6px 3px 7px 4px' };
// each book is one of the menu's dots: it arrives as that dot and opens out into the book, and leaves by folding back into it
const BOOK_DOT = { bujo: 'freediving', readings: 'sound', quotes: 'c6', pillow: 'c4', musings: 'c5' };
const DOT_COL = { home: 'rgb(20,20,20)', freediving: 'rgb(24,88,224)', sound: 'rgb(232,34,44)', journal: 'rgb(255,196,0)', c4: 'rgb(255,118,18)', c5: 'rgb(22,168,82)', c6: 'rgb(138,64,214)' };
const DOT_R = k => /^c\d/.test(k) ? 5.5 : 8;
// a dot's flight from A to B along a curve (control points C1, C2), as keyframes for its translate (and its colour, from cols[0] to cols[1]);
// ease shapes its pace, and shown keeps it visible the whole way (and while it waits to set off)
const flight = (A, C1, C2, B, r, ease, cols, shown) => { const out = []; for (let q = 0; q <= 18; q++) { const u = ease(q / 18), a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
  out.push({ offset: q / 18, translate: `${(a * A[0] + b * C1[0] + c * C2[0] + d * B[0] - r).toFixed(1)}px ${(a * A[1] + b * C1[1] + c * C2[1] + d * B[1] - r).toFixed(1)}px`, backgroundColor: q < 9 ? cols[0] : cols[1], ...(shown ? { opacity: 1 } : {}) }); } return out; };
const easeIn = u => u * u * (1.6 - .6 * u), easeOut = u => 1 - easeIn(1 - u);
const paras = s => (s || '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
const SERIF = "'Newsreader', Georgia, serif", SANS = "'Geist', sans-serif", MONOF = "'Geist Mono', monospace";
const NAV = [['home', 'Home', 'rgb(20,20,20)'], ['freediving', 'Freediving', 'rgb(24,88,224)'], ['sound', 'Sound', 'rgb(232,34,44)'], ['journal', 'Journal', 'rgb(255,196,0)']];

class Component extends DCLogic {
  // arriving under the last page's picture (see Base.astro) there is no fade in from blank paper: the picture gives way straight to the page
  state = { books: null, vw: innerWidth, vh: innerHeight, fade: document.getElementById('page-cover') ? 0 : 1, sel: null, navHov: null, sec: 0, notchData: [] };
  scrollRef = React.createRef(); bodyRef = React.createRef(); fillRef = React.createRef();
  componentDidMount() {
    // arriving under the last page's picture, its dots may be handed over (Sound leaves them where its pads closed), to fly on from there
    try { const nf = JSON.parse(sessionStorage.getItem('nav-from') || 'null'); sessionStorage.removeItem('nav-from'); if (nf && document.getElementById('page-cover')) this.nf = nf; } catch (e) {}
    // the page opens on the stack alone, no book open yet: the reading side stays blank until one is picked
    this.setState({ books: load().books, sel: null });
    this.onR = () => this.setState({ vw: innerWidth, vh: innerHeight });
    this.onK = e => { if (/^[1-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) { const bk = (this.state.books || [])[+e.key - 1]; if (bk) this.pick(bk.slug); } };
    addEventListener('resize', this.onR); addEventListener('keydown', this.onK);
    // the section rings sit by where each heading falls, which moves once the web fonts are in
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { this.mKey = null; this.measure(); });
    this.fadeT = setTimeout(() => this.setState({ fade: 0 }), 80);
  }
  componentDidUpdate() { this.measure(); if (this.state.books && !this.readied) { this.readied = true; window.__ready && window.__ready(); this.arrive(); } }
  // arriving: each book's dot drops from where it is (the menu, or where the last page left it) to the book's place in the stack, bottom
  // book first, and opens out into the book; dots that aren't books (Home, Journal) fly back up to the menu. The mug slides onto the top book
  // last and the text rises in. (Books use the separate scale property, so their own slide-out and hover, on transform, carry on untouched)
  // the books in the stack, top first, each with its dot (k, its fly-dot element and radius) and where it sits (r, its centre L)
  spines() {
    return [...document.querySelectorAll('[data-book]')].map(el => { const k = BOOK_DOT[el.dataset.kind], r = el.getBoundingClientRect();
      return k && { el, k, r, L: [r.left + r.width / 2, r.top + r.height / 2], rad: DOT_R(k), dot: document.querySelector('[data-fly="' + k + '"]'), asDot: `${(2 * DOT_R(k) / r.width).toFixed(3)} ${(2 * DOT_R(k) / r.height).toFixed(3)}` }; }).filter(Boolean);
  }
  arrive() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const anims = this.arrAnims = [], A = (el, kf, o) => { const a = el.animate(kf, o); anims.push(a); return a; };
    const W = innerWidth, nf = this.nf || {}, from = k => nf[k] || nf[k === 'home' ? 'ink' : k] || navAt(W, k), t0 = 150, step = 110, fly = 620, open = 320;
    // where the mug rests, measured before the books start (the top book's opening scale would carry it along)
    const mugEl = document.querySelector('[data-mug]'), mugL = mugEl ? mugEl.getBoundingClientRect().left : 0;
    const books = this.spines().reverse();
    books.forEach(({ el, k, L, rad, dot, asDot }, i) => { const S = from(k), d = t0 + i * step; if (!dot) return;
      A(dot, flight(S, [S[0] - 30, S[1] + 70], [L[0], L[1] - 140], L, rad, easeIn, [DOT_COL[k], getComputedStyle(el).backgroundColor], true), { duration: fly, delay: d, fill: 'both' });
      A(dot, [{ opacity: 1, scale: '1 1' }, { opacity: 0, scale: '2.4 1' }], { duration: open * .6, delay: d + fly, fill: 'forwards' });
      A(el, [{ scale: asDot, opacity: 0 }, { opacity: 1, offset: .2 }, { scale: '1.03 1.12', offset: .7 }, { scale: '1 1', opacity: 1 }], { duration: open, delay: d + fly, fill: 'backwards', easing: 'ease-out' }); });
    // a handed-over dot that isn't a book goes up to its place in the menu
    ['home', 'journal'].forEach(k => { if (!nf[k] && !(k === 'home' && nf.ink)) return; const S = from(k), N = navAt(W, k), dot = document.querySelector('[data-fly="' + k + '"]'); if (!dot) return;
      A(dot, flight(S, [S[0], S[1] - 120], [N[0] - 30, N[1] + 80], N, DOT_R(k), easeOut, [DOT_COL[k], DOT_COL[k]], true), { duration: fly + 200, delay: t0, fill: 'both' });
      A(dot, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, delay: t0 + fly + 200, fill: 'forwards' }); });
    const landed = t0 + (books.length - 1) * step + fly + open, mug = mugEl;
    // the mug slides in along the top book from off the right edge, overshooting a touch and settling back
    if (mug) { const dx = innerWidth - mugL + 60; A(mug, [{ translate: `${dx}px 0`, easing: 'cubic-bezier(.2,.7,.3,1)' }, { translate: '-7px 0', offset: .78, easing: 'ease-in-out' }, { translate: '0 0' }], { duration: 700, delay: landed + 20, fill: 'backwards' });
      // hidden until then: while the top book opens out of its dot, its scale would carry the waiting mug into view
      A(mug, [{ opacity: 0 }, { opacity: 0 }], { duration: landed + 20 }); }
    const body = this.bodyRef.current; if (body) A(body, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: landed + 150, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
  }
  // a new book: the text lifts away, the column goes back to the top, and the new book's text rises in
  pick(slug) {
    if (slug === this.state.sel || this.switching || this.out) return; this.switching = true;
    const body = this.bodyRef.current; if (body && body.animate) body.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-12px)' }], { duration: 220, easing: 'ease-in', fill: 'forwards' });
    this.pickT = setTimeout(() => { if (this.out) return; this.setState({ sel: slug }); const sc = this.scrollRef.current; if (sc) sc.scrollTop = 0;
      requestAnimationFrame(() => { if (this.out) { this.switching = false; return; } const bd = this.bodyRef.current; if (bd && bd.animate) { bd.getAnimations().forEach(x => x.cancel()); bd.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' }); } this.switching = false; }); }, 230);
  }
  // where each heading sits down the text, as a ring on the line
  measure() {
    const sc = this.scrollRef.current, body = this.bodyRef.current; if (!sc || !body) return;
    const range = Math.max(1, sc.scrollHeight - sc.clientHeight), rh = this.railH || 300, key = [this.state.sel, sc.scrollHeight, sc.clientHeight, rh].join();
    if (key === this.mKey) return; this.mKey = key;
    const els = [...body.querySelectorAll('p[data-h="1"]')];
    this.hTops = els.map(el => el.offsetTop);
    this.setState({ notchData: els.map(el => ({ y: Math.round(clamp((el.offsetTop - 30) / range, 0, 1) * rh), label: el.textContent, top: el.offsetTop })) });
    this.onScroll();
  }
  // the dot on the line follows how far down the text you are
  onScroll = () => {
    const sc = this.scrollRef.current, fl = this.fillRef.current; if (!sc) return;
    const range = Math.max(1, sc.scrollHeight - sc.clientHeight), p = Math.min(1, sc.scrollTop / range);
    if (fl) fl.style.transform = 'translateY(' + (p * (this.railH || 300)).toFixed(1) + 'px)';
    const tops = this.hTops || []; let a = 0; for (let i = 0; i < tops.length; i++) if (tops[i] <= sc.scrollTop + sc.clientHeight * .3) a = i;
    if (a !== this.state.sec) this.setState({ sec: a });
  };
  // the book as a run of text blocks: its title and subtitle, then headings, meta lines, paragraphs, list lines and quotes as its kind lays them out
  blocks(b, fs) {
    const B = [], H = t => B.push({ h: 1, text: t, ff: SANS, fs: Math.round(fs * 1.3), fst: 'normal', fw: 600, lh: 1.25, ls: '-.015em', c: '#111', m: '2.2em 0 .6em' }),
      M = t => B.push({ text: t, ff: MONOF, fs: Math.max(11, Math.round(fs * .6)), fst: 'normal', fw: 400, lh: 1.4, ls: '.08em', c: '#8c8c8c', m: '0 0 1.3em' }),
      P = (t, it) => B.push({ text: t, ff: SERIF, fs, fst: it ? 'italic' : 'normal', fw: 400, lh: 1.7, ls: '0', c: '#2b2b2b', m: '0 0 1em' }),
      L = t => B.push({ text: t, ff: SERIF, fs, fst: 'normal', fw: 400, lh: 1.55, ls: '0', c: '#2b2b2b', m: '0 0 .55em' });
    B.push({ text: b.title, ff: SANS, fs: Math.round(fs * 3.2), fst: 'normal', fw: 600, lh: 1, ls: '-.045em', c: '#111', m: '0 0 .35em' });
    if (b.subtitle) P(b.subtitle, true);
    const it = b.items || [];
    if (b.kind === 'bujo') (b.months || []).forEach(m => { H(MONTHS[m.month - 1] + ' ' + (b.year || '')); if (m.intention) P(m.intention, true); (m.entries || []).forEach(e => L(e.d + '   ' + e.sym + '   ' + e.text)); });
    else if (b.kind === 'quotes') it.forEach(q => { B.push({ text: '“' + q.text + '”', ff: SERIF, fs: Math.round(fs * 1.55), fst: 'italic', fw: 400, lh: 1.35, ls: '-.01em', c: '#111', m: '1.6em 0 .4em' }); M(q.who || ''); });
    else if (b.kind === 'pillow') it.forEach(c => { H(c.title); (c.items || []).forEach(x => L('—  ' + x)); });
    else it.forEach(x => { H(x.title); M(b.kind === 'musings' ? (x.date || '') : (x.source || '')); paras(x.text).forEach(p => P(p)); });
    return B.map((x, i) => Object.assign(x, { h: x.h || i === 0 ? 1 : 0 }));
  }
  dotOf(k) { const d = document.querySelector('[data-navk="' + k + '"] [data-navdot]'); if (!d) return null; const r = d.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  // leaving: the page fades to its paper colour, then goes (handing its menu dots' places to Home or Sound, whose dots fly from them)
  leave(href, dots) {
    return e => { if (e) e.preventDefault(); if (this.out) return; this.out = true;
      if (dots) try { const o = {}; document.querySelectorAll('[data-navk]').forEach(el => { const k = el.getAttribute('data-navk'), p = this.dotOf(k); if (p) o[k] = p; }); o.ink = o.home; sessionStorage.setItem('nav-from', JSON.stringify(o)); } catch (x) {}
      const go = () => (window.__leave || (h => { location.href = h; }))(href);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { this.setState({ fade: 1 }); setTimeout(go, 480); return; }
      // a leave during the arrival: the arrival jumps to its end first, so nothing still waiting to appear pops in over the leave
      (this.arrAnims || []).forEach(a => { try { a.finish(); } catch (x) {} }); clearTimeout(this.pickT);
      // the text and the line fade, the mug slides off to the right, then the books fold back into their dots, top one first, and the dots
      // rise into the menu; the next page picks them up there. It goes once the last dot has arrived
      const W = innerWidth, fold = 240, fly = 560, step = 90, flights = [];
      [this.bodyRef.current, document.querySelector('[data-rail]')].forEach(el => el && el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: 220, fill: 'forwards' }));   // from as they are (the line is hidden with no book open)
      const mug = document.querySelector('[data-mug]'); if (mug) { const r = mug.getBoundingClientRect(); mug.animate([{ translate: '0 0' }, { translate: '-6px 0', offset: .2 }, { translate: `${innerWidth - r.left + 60}px 0` }], { duration: 380, easing: 'ease-in', fill: 'forwards' }); }
      this.spines().forEach(({ el, k, L, rad, dot, asDot }, i) => { const N = navAt(W, k), d = 160 + i * step;
        el.animate([{ scale: '1 1', opacity: 1 }, { scale: asDot, opacity: 0 }], { duration: fold, delay: d, fill: 'forwards', easing: 'ease-in' });
        if (!dot) return;
        dot.getAnimations().forEach(a => a.cancel());   // its arrival (which ends stretched out and hidden) is over
        dot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fold * .5, delay: d + fold * .5, fill: 'both' });
        flights.push(dot.animate(flight(L, [L[0], L[1] - 140], [N[0] - 30, N[1] + 70], N, rad, easeOut, [getComputedStyle(el).backgroundColor, DOT_COL[k]]), { duration: fly, delay: d + fold * .5, fill: 'both' })); });
      // with no books to fold, it still waits for the text to fade
      let gone = false; const once = () => { if (!gone) { gone = true; go(); } };
      Promise.all(flights.map(a => a.finished)).then(() => setTimeout(once, flights.length ? 60 : 280), once); };
  }
  stay = e => { if (e) e.preventDefault(); };
  GO = { home: this.leave(HOME, true), freediving: this.leave(BASE + 'freediving/'), sound: this.leave(BASE + 'sound/?from=page', true), journal: this.stay };
  renderVals() {
    const { vw, vh, sel } = this.state, books = this.state.books || [], narrow = vw < 760;
    const b = books.find(x => x.slug === sel);
    // the stack: in the corner on a wide screen, along the bottom on a narrow one
    const barH = narrow ? 30 : Math.round(clamp(vh * .045, 30, 38)), stackW = narrow ? vw - 32 : Math.round(clamp(vw * .18, 196, 240)), stackR = narrow ? 16 : 0;
    const stackH = books.length * (barH + 3) + 34;
    // the reading column: as wide as the room left of the stack allows, up to 860
    const lm = narrow ? 14 : Math.round(clamp(vw * .02, 16, 32)), avail = narrow ? vw - 36 : vw - stackR - stackW - Math.round(clamp(vw * .05, 40, 80)) - lm, colW = Math.round(Math.min(860, avail));
    const fs = Math.round(clamp(colW / 40, 16, 20)), sfs = narrow ? 12 : Math.round(clamp(barH * .36, 12, 13));
    if (!this.bc || this.bc.sel !== sel || this.bc.fs !== fs || this.bc.books !== books) this.bc = { sel, fs, books, blocks: b ? this.blocks(b, fs) : [] };
    const rule = b ? (GOUACHE[b.kind] || ['#111'])[0] : '#111', railH = Math.max(120, vh - 56); this.railH = railH;
    // the one being read slides out of the stack (on a narrow screen only a little, the stack being the screen's width)
    const shelf = books.map((x, i) => { const on = x.slug === sel;
      return { kind: GOUACHE[x.kind] ? x.kind : 'other', title: x.title, first: i === 0, w: Math.round(stackW - (narrow ? 0 : 14)), h: Math.round(barH * (SPINE_H[x.kind] || 1)), bg: (GOUACHE[x.kind] || ['#888'])[0], rad: SPINE_R[x.kind] || '3px', tx: on ? (narrow ? -12 : -40) : 0, z: on ? 3 : 1, pick: () => this.pick(x.slug) }; });
    return {
      scrollRef: this.scrollRef, bodyRef: this.bodyRef, fillRef: this.fillRef, onScroll: this.onScroll, blocks: this.bc.blocks,
      railL: lm, railT: 28, railH, rule, railOn: b ? 1 : 0,
      notches: this.state.notchData.map((n, i) => ({ y: n.y, label: n.label, c: rule, o: i === 0 ? 0 : 1, go: () => { const sc = this.scrollRef.current; if (sc) sc.scrollTo({ top: Math.max(0, n.top - 30), behavior: 'smooth' }); } })),
      cupR: Math.round(stackW * .14), shelf, colW, colL: lm, stackW, stackR, sfs,
      padTop: narrow ? 96 : 34, padBot: narrow ? stackH + 40 : 120, fadeTop: narrow ? 80 : 14, fadeBot: narrow ? stackH + 20 : 60, fade: this.state.fade,
      // the menu is dots only here; a dot's name shows while it is under the pointer
      navOff: () => this.setState({ navHov: null }),
      nav: Object.fromEntries(NAV.map(([k]) => { const h = this.state.navHov === k; return [k, { bp: h ? '28%' : '100%', en: h ? 1 : 0, enY: h ? '0px' : '8px', enB: h ? '0px' : '3px', on: () => { if (this.state.navHov !== k) this.setState({ navHov: k }); }, go: this.GO[k] }]; }))
    };
  }
}

// a book's spine: its cover colour with soft brush streaks, its own pattern and label, and a paper grain over all of it
const LABEL = "position:absolute;top:50%;transform:translateY(-50%);font-family:'Geist', sans-serif;font-weight:600;letter-spacing:.01em;white-space:nowrap;";
const GRAIN = "url(data:image/svg+xml;utf8,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27120%27%20height=%27120%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%27.9%27%20numOctaves=%272%27%20stitchTiles=%27stitch%27/%3E%3CfeColorMatrix%20values=%270%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%20.55%200%27/%3E%3C/filter%3E%3Crect%20width=%27120%27%20height=%27120%27%20filter=%27url(%23n)%27/%3E%3C/svg%3E)";
function Spine({ s, sfs }) {
  const k = s.kind;
  return (
    <span aria-hidden="true" style={sty("position:absolute;inset:0;border-radius:inherit;overflow:hidden")}>
      <span style={sty("position:absolute;inset:0;background:repeating-linear-gradient(91deg, rgba(255,255,255,.06) 0 3px, rgba(255,255,255,0) 3px 9px, rgba(0,0,0,.05) 9px 11px, rgba(0,0,0,0) 11px 21px)")} />
      {k === 'bujo' && <>
        <span style={sty("position:absolute;inset:0;background:radial-gradient(circle, rgba(244,236,220,.55) 0 1.3px, transparent 1.8px) 0 0 / 9px 9px")} />
        <span style={sty("position:absolute;left:0;top:0;bottom:0;width:18px;background:#e9b949;border-radius:inherit;border-top-right-radius:0;border-bottom-right-radius:0")} />
        <span style={sty("position:absolute;right:0;top:0;bottom:0;width:6px;background:#e9b949")} />
        <span style={sty(LABEL + `left:28px;padding:2px 9px 3px;border-radius:2px;font-size:${sfs}px;color:#1e2a4f;background:#f4ecdc`)}>{s.title}</span>
      </>}
      {k === 'readings' && <>
        <span style={sty("position:absolute;inset:0;background:repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 1px, transparent 1px 4px), repeating-linear-gradient(-45deg, rgba(0,0,0,.06) 0 1px, transparent 1px 4px)")} />
        <span style={sty("position:absolute;left:22%;right:8%;top:0;bottom:0;background:#f2d3b0;border-left:3px double #8f2f1f;border-right:3px double #8f2f1f")} />
        <span style={sty(LABEL + `left:calc(22% + 10px);color:#7a2414;font-family:'Newsreader', serif;font-style:italic;font-weight:500;font-size:${sfs + 2}px`)}>{s.title}</span>
        <span style={sty("position:absolute;left:10px;top:50%;width:14px;height:14px;margin-top:-7px;border:2px solid #f2d3b0;border-radius:50%;box-sizing:border-box")} />
      </>}
      {k === 'quotes' && <>
        <span style={sty("position:absolute;inset:0;background:repeating-linear-gradient(115deg, rgba(240,201,74,0) 0 8px, rgba(240,201,74,.22) 8px 10px, rgba(240,201,74,0) 10px 16px)")} />
        <span style={sty(LABEL + `left:14px;color:#f6e7b8;font-family:'Newsreader', serif;font-weight:600;font-size:${sfs + 3}px;letter-spacing:.02em`)}>{'“' + s.title + '”'}</span>
        <span style={sty("position:absolute;right:14px;top:6px;bottom:6px;width:2px;background:#f0c94a")} />
        <span style={sty("position:absolute;right:20px;top:6px;bottom:6px;width:2px;background:#f0c94a;opacity:.6")} />
      </>}
      {k === 'pillow' && <>
        <span style={sty("position:absolute;inset:0;background:radial-gradient(circle at 50% 100%, rgba(255,240,215,0) 0 5px, rgba(255,240,215,.35) 5px 6.5px, rgba(255,240,215,0) 7px) 0 0 / 14px 9px")} />
        <span style={sty(LABEL + `right:12px;padding:2px 10px 3px;border-radius:999px;font-size:${sfs}px;color:#fbe6c8;background:#3f5fae`)}>{s.title}</span>
        <span style={sty("position:absolute;left:12px;top:50%;width:0;height:0;margin-top:-6px;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:12px solid #3f5fae")} />
      </>}
      {k === 'musings' && <>
        <span style={sty("position:absolute;inset:0;border-radius:inherit;background:radial-gradient(ellipse 30% 70% at 20% 30%, #78b07c, rgba(120,176,124,0) 70%), radial-gradient(ellipse 25% 90% at 55% 70%, #3f7a48, rgba(63,122,72,0) 70%), radial-gradient(ellipse 20% 60% at 85% 35%, #8cc08e, rgba(140,192,142,0) 70%)")} />
        <span style={sty("position:absolute;left:0;top:0;width:16px;height:100%;background:linear-gradient(135deg, #2f5a35 0 50%, transparent 50%) 0 0 / 16px 50% no-repeat, linear-gradient(45deg, #2f5a35 0 50%, transparent 50%) 0 100% / 16px 50% no-repeat")} />
        <span style={sty(LABEL + `left:28px;padding:2px 12px 3px;border-radius:12px 3px 12px 3px;color:#24412a;background:#f4ecdc;font-family:'Newsreader', serif;font-style:italic;font-weight:500;font-size:${sfs + 2}px`)}>{s.title}</span>
      </>}
      {k === 'other' && <span style={sty(LABEL + `left:14px;font-size:${sfs}px;color:#fff`)}>{s.title}</span>}
      <span style={sty(`position:absolute;inset:0;border-radius:inherit;background-image:${GRAIN};background-size:120px 120px;mix-blend-mode:multiply;opacity:.35;pointer-events:none`)} />
    </span>
  );
}

// the mug on the top book: a sticker-style mug with a torii gate on its front and steam curling up
const TORII = "position:absolute;box-sizing:border-box;background:#d4573f;border:2px solid #4a3552;";
function Mug({ right }) {
  return (
    <span aria-hidden="true" data-mug="1" style={sty(`position:absolute;right:${right}px;bottom:calc(100% + 3px);width:96px;height:128px;pointer-events:none`)}>
      <span style={sty("position:absolute;left:14px;top:4px;animation:steamRise 2.6s ease-out infinite;width:12px;height:36px;box-sizing:border-box;border:3px solid #a99fb6;border-left-color:transparent;border-bottom-color:transparent;border-radius:50%")} />
      <span style={sty("position:absolute;left:29px;top:-4px;animation:steamRise 2.6s ease-out -.85s infinite;width:12px;height:42px;box-sizing:border-box;border:3px solid #a99fb6;border-right-color:transparent;border-top-color:transparent;border-radius:50%")} />
      <span style={sty("position:absolute;left:44px;top:6px;animation:steamRise 2.6s ease-out -1.7s infinite;width:12px;height:34px;box-sizing:border-box;border:3px solid #a99fb6;border-left-color:transparent;border-bottom-color:transparent;border-radius:50%")} />
      <span style={sty("position:absolute;left:0;bottom:0;width:92px;height:84px;filter:drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff) drop-shadow(0 6px 7px rgba(74,53,82,.2))")}>
        <span style={sty("position:absolute;right:0;top:18px;width:28px;height:38px;box-sizing:border-box;border:3.5px solid #4a3552;border-left:0;border-radius:0 18px 18px 0")} />
        <span style={sty("position:absolute;left:0;top:0;width:68px;height:84px;box-sizing:border-box;background:#a8d8c8;border:3.5px solid #4a3552;border-radius:7px 7px 20px 20px")} />
        <span style={sty("position:absolute;left:4px;top:4px;width:60px;height:8px;border-radius:4px;background:rgba(255,255,255,.45)")} />
        <span style={sty("position:absolute;left:12px;top:22px;width:44px;height:42px")}>
          <span style={sty(TORII + "left:0;top:0;width:44px;height:7px;border-radius:8px 8px 2px 2px / 6px 6px 2px 2px")} />
          <span style={sty(TORII + "left:4px;top:8px;width:36px;height:5px;border-radius:1px")} />
          <span style={sty(TORII + "left:19px;top:6px;width:6px;height:8px;border-top:0;border-bottom:0")} />
          <span style={sty(TORII + "left:8px;top:7px;width:6px;height:35px;border-radius:1px 1px 2px 2px")} />
          <span style={sty(TORII + "right:8px;top:7px;width:6px;height:35px;border-radius:1px 1px 2px 2px")} />
        </span>
      </span>
    </span>
  );
}

function View(v) {
  const mask = `linear-gradient(to bottom, transparent 0, #000 ${v.fadeTop}px, #000 calc(100% - ${v.fadeBot}px), transparent 100%)`;
  return (
    <>
    <div style={sty("position:fixed;inset:0;overflow:hidden;background:#fafafa;color:#111;font-family:'Geist', sans-serif;-webkit-font-smoothing:antialiased")}>
      <div ref={v.scrollRef} onScroll={v.onScroll} data-read="1" style={sty(`position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;-webkit-mask-image:${mask};mask-image:${mask}`)}>
        <div ref={v.bodyRef} style={sty(`width:${v.colW}px;margin-left:${v.colL}px;box-sizing:border-box;padding:${v.padTop}px 0 ${v.padBot}px 28px`)}>
          {(v.blocks || []).map((k, i) => (
            <p key={i} data-h={k.h} style={sty(`margin:${k.m};font-family:${k.ff};font-size:${k.fs}px;font-style:${k.fst};font-weight:${k.fw};line-height:${k.lh};letter-spacing:${k.ls};color:${k.c};text-wrap:pretty;white-space:pre-wrap`)}>{k.text}</p>
          ))}
        </div>
      </div>
      <div data-rail="1" style={sty(`position:absolute;left:${v.railL}px;top:${v.railT}px;height:${v.railH}px;width:3px;border-radius:2px;background:${v.rule};opacity:${v.railOn};transition:opacity .4s ease`)}>
        {(v.notches || []).map((n, i) => (
          <button key={i} onClick={n.go} title={n.label} aria-label={'Jump to ' + n.label} tabIndex={n.o ? 0 : -1} style={sty(`position:absolute;left:-6px;top:${n.y}px;width:15px;height:15px;margin-top:-7.5px;padding:0;border:0;background:none;cursor:pointer;display:grid;place-items:center;opacity:${n.o};pointer-events:${n.o ? 'auto' : 'none'}`)}>
            <span style={sty(`display:block;width:5px;height:5px;border-radius:50%;background:#fafafa;box-shadow:0 0 0 1.5px ${n.c}`)} />
          </button>
        ))}
        <span ref={v.fillRef} aria-hidden="true" style={sty(`position:absolute;left:-5.5px;top:0;width:14px;height:14px;margin-top:-7px;border-radius:50%;background:${v.rule};box-shadow:0 0 0 3px #fafafa;pointer-events:none`)} />
      </div>
      <div style={sty(`position:absolute;right:${v.stackR}px;bottom:0;width:${v.stackW}px;display:flex;flex-direction:column;align-items:flex-end;gap:0`)}>
        {(v.shelf || []).map((s, i) => (
          <button key={s.title + i} data-book="1" data-kind={s.kind} onClick={s.pick} aria-label={'Read ' + s.title} style={{ ...sty(`position:relative;width:${s.w}px;height:${s.h}px;padding:0;border:0;border-radius:${s.rad};cursor:pointer;z-index:${s.z};background:${s.bg};transform:translateX(var(--tx));transition:transform .35s cubic-bezier(.3,1.3,.5,1), filter .35s ease`), '--tx': s.tx + 'px' }}>
            <Spine s={s} sfs={v.sfs} />
            {s.first && <Mug right={v.cupR} />}
          </button>
        ))}
      </div>
      {Object.keys(DOT_COL).map(k => <span key={k} data-fly={k} aria-hidden="true" style={sty(`position:fixed;left:0;top:0;width:${2 * DOT_R(k)}px;height:${2 * DOT_R(k)}px;border-radius:50%;background:${DOT_COL[k]};opacity:0;pointer-events:none;z-index:125`)} />)}
      <div aria-hidden="true" style={sty(`position:absolute;inset:0;z-index:120;pointer-events:none;background:#fafafa;opacity:${v.fade};transition:opacity .45s ease`)} />
    </div>
    <nav aria-label="Pages" style={sty("position:fixed;right:12px;top:12px;display:flex;flex-direction:row;align-items:flex-start;z-index:130;color:#111")}>
      {NAV.map(([k, en, col]) => (
        <a key={k} href={k === 'home' ? BASE + '?from=dive' : BASE + k + '/'} onClick={v.nav?.[k]?.go} aria-label={en} aria-current={k === PAGE ? 'page' : undefined} data-navk={k} onMouseEnter={v.nav?.[k]?.on} onMouseLeave={v.navOff} onFocus={v.nav?.[k]?.on} onBlur={v.navOff} style={sty("display:flex;flex-direction:column;align-items:center;gap:8px;width:24px;height:156px;padding:8px 0 0;box-sizing:border-box;border:0;background:none;color:inherit;text-decoration:none;cursor:pointer;font-family:'Newsreader', Georgia, serif;font-size:13px;line-height:1")}>
          <span data-navdot="1" style={sty(`width:16px;height:16px;border-radius:50%;background:${col};flex:none`)} />
          <span style={sty("position:relative;display:block;width:100%;height:116px")}>
            <span lang="en" data-lab="nav" aria-hidden="true" style={sty(`position:absolute;left:50%;top:0;writing-mode:vertical-rl;text-orientation:sideways;white-space:nowrap;font-family:Papyrus, 'Papyrus-Regular', 'Newsreader', Georgia, serif;font-weight:400;font-size:19px;letter-spacing:.02em;background-image:linear-gradient(to bottom, ${col} 0%, ${col} 20%, currentColor 60%, currentColor 100%);background-size:100% 300%;background-repeat:no-repeat;background-position:0 ${v.nav?.[k]?.bp ?? ''};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;transition:opacity .55s ease, transform .7s cubic-bezier(.2,.7,.2,1), filter .55s ease, background-position 1.1s cubic-bezier(.3,.6,.2,1);opacity:${v.nav?.[k]?.en ?? 0};transform:translateX(-50%) translateY(${v.nav?.[k]?.enY ?? ''});filter:blur(${v.nav?.[k]?.enB ?? ''});pointer-events:none`)}>
              {en}
            </span>
          </span>
        </a>
      ))}
      <span aria-hidden="true" style={sty("display:flex;flex-direction:row;align-items:flex-start")}>
        {[['c4', 'rgb(255,118,18)'], ['c5', 'rgb(22,168,82)'], ['c6', 'rgb(138,64,214)']].map(([k, col]) => (
          <span key={k} data-navk={k} style={sty("width:16px;height:32px;display:grid;place-items:center")}>
            <span data-navdot="1" style={sty(`width:11px;height:11px;border-radius:50%;background:${col}`)} />
          </span>
        ))}
      </span>
    </nav>
    </>
  );
}

export default page(Component, View, {});
