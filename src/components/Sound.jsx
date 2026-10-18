// Carried over from the Claude Design file "Sound.dc.html".
// The logic class is the design's own code; View is its template as JSX.
import React from 'react';
import { DCLogic, page, sty, BASE } from '../lib/dc.js';
import { squid, squidCells, SQUID_W, SQUID_H, SQUID_IDLES, SQUID_REACTS, SQUID_MOVES, SQUID_SLOW, SQUID_FAST } from '../lib/squid.js';
import { deckGeo, deckGeoV, deckScale, isPhone, DECK_KEYS, padOf } from '../lib/deck.js';

const PAGE = 'sound';
const COL = [232, 34, 44];
const HOME = BASE + '?from=dive';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = x => x * x * (3 - 2 * x);
const easeIO = k => .5 - .5 * Math.cos(Math.PI * k);
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const TAU = Math.PI * 2;
// each kind of piece has its own colour, from the site's palette; tint is the pale version the haze style glows in
const KINDS = { field: { label: 'Field', cs: 'rgb(22,168,82)', tint: 'rgb(170,232,196)' }, music: { label: 'Music', cs: 'rgb(232,34,44)', tint: 'rgb(255,172,168)' }, voice: { label: 'Voice', cs: 'rgb(138,64,214)', tint: 'rgb(212,186,248)' } };
// two art directions. many: the wave is built of hundreds of small coloured pieces, like cut paper set in layers of glass.
// haze: a cold misty ground with grain and drifting light, and the wave as thin glowing lines
const THEMES = {
  many: { bg: '#0e1117', ink: '#f3efe6', muted: '#a9a49a', disp: "'Newsreader', Georgia, serif", dispStyle: 'italic', dispW: 300, dispCase: 'none', dispLs: '-0.025em', body: "'Newsreader', Georgia, serif", neutral: '#e9e3d6', grain: .16, dispSize: 'min(clamp(56px, 9vw, 112px), 14vh)', labBg: 'transparent', labPad: '0', labRad: '0', labSh: 'none', listBg: 'transparent', listPad: '0', listRad: '0', trSize: 'clamp(18px, 2.8vh, 22px)', trCase: 'none', trLs: 'normal', chipPad: '6px 0' },
  haze: { bg: '#2a3036', ink: '#f4f6f7', muted: '#c9d1d7', disp: "'Six Caps', 'Hanken Grotesk', sans-serif", dispStyle: 'normal', dispW: 400, dispCase: 'uppercase', dispLs: '0.01em', body: "'Hanken Grotesk', system-ui, sans-serif", neutral: '#eef3f6', grain: .34, dispSize: 'min(clamp(56px, 9vw, 112px), 14vh)', labBg: 'transparent', labPad: '0', labRad: '0', labSh: 'none', listBg: 'transparent', listPad: '0', listRad: '0', trSize: 'clamp(18px, 2.8vh, 22px)', trCase: 'none', trLs: 'normal', chipPad: '6px 0' },
  // stark: pale grey ground, black lines, white label strips with black type
  stark: { bg: '#dfdfdc', ink: '#0c0c0c', muted: '#45474a', disp: "'Michroma', 'Hanken Grotesk', sans-serif", dispStyle: 'normal', dispW: 400, dispCase: 'uppercase', dispLs: '0.02em', body: "'JetBrains Mono', monospace", neutral: '#0c0c0c', grain: .12, dispSize: 'min(clamp(36px, 5.6vw, 72px), 9vh)', labBg: '#f7f7f5', labPad: '.3em .5em .24em', labRad: '.14em', labSh: '0 1px 2px rgba(0,0,0,.14)', listBg: '#f7f7f5', listPad: '2px 14px', listRad: '4px', trSize: '13px', trCase: 'uppercase', trLs: '.04em', chipPad: '5px 9px' }
};
// the cut-paper colours mixed in among a piece's own colour
const PAL = ['rgb(232,34,44)', 'rgb(255,196,0)', 'rgb(24,88,224)', 'rgb(255,118,18)', 'rgb(22,168,82)', 'rgb(138,64,214)', 'rgb(244,138,172)', 'rgb(233,227,214)', 'rgb(110,200,230)'];
// the paper inks the deck's lit edge picks from (all the wave's colours but the cream)
// pointers over the wave in full screen: a pause sign while a piece plays, a play sign while it is paused, and a drag sign over the
// playhead (black with a white edge so they read on any ground)
const svgCur = body => "url(\"data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><g fill='#0c0c0c' stroke='#fff' stroke-width='1.5' stroke-linejoin='round'>" + body + "</g></svg>") + "\") 16 16, pointer";
const CUR_PAUSE = svgCur("<rect x='8.5' y='7' width='5.5' height='18' rx='1'/><rect x='18' y='7' width='5.5' height='18' rx='1'/>");
const CUR_PLAY = svgCur("<path d='M10 6.5 L25 16 L10 25.5 Z'/>");
const CUR_SCRUB = svgCur("<rect x='14.5' y='4' width='3' height='24' rx='1'/><path d='M3.5 16 L11 10.5 L11 21.5 Z'/><path d='M28.5 16 L21 10.5 L21 21.5 Z'/>");
const INKS = [[232, 34, 44], [255, 118, 18], [255, 196, 0], [22, 168, 82], [110, 200, 230], [24, 88, 224], [138, 64, 214], [244, 138, 172]];
// albums are just categories. Placeholder pieces: give one a src (an audio file next to this page) and it plays that file with its real waveform;
// without one it plays a synthesised stand-in of its kind. dur is in seconds (taken from the file when there is one)
const ALBUMS = [
  // img: the album's photo (black & white, white ground) laid into the page in the stark style; imgX: 0 puts it flush left, 1 flush against the panel; imgY: shift up (negative) as a fraction of the page height; imgFlip: upside down; imgMirror: left to right.
  { title: 'Water', img: BASE + 'images/lone-tree.jpg', imgX: 1, imgY: -.2, tracks: [
    { title: 'Low tide, Panglao', kind: 'field', date: '2026-11-06', dur: 134 },
    { title: 'Breathe-up before a dive', kind: 'voice', date: '2026-11-12', dur: 65 },
    { title: 'Boat engine, 6 a.m.', kind: 'field', date: '2026-11-15', dur: 92 },
    { title: 'Surface', kind: 'music', date: '2026-12-01', dur: 188 }] },
  { title: 'Studio', img: BASE + 'images/great-buddha.jpg', imgX: 1, imgMirror: true, tracks: [
    { title: 'Sketch no. 4', kind: 'music', date: '2026-03-02', dur: 166 },
    { title: 'Tape loop', kind: 'music', date: '2026-04-19', dur: 118 },
    { title: 'Late take, talking', kind: 'voice', date: '2026-05-07', dur: 52 }] },
  { title: 'Notes', img: BASE + 'images/driftwood.jpg', imgX: 1, imgFlip: true, tracks: [
    { title: 'Voice memo, train', kind: 'voice', date: '2026-02-11', dur: 80 },
    { title: 'Rain on the roof', kind: 'field', date: '2026-06-23', dur: 160 },
    { title: 'Humming the melody', kind: 'voice', date: '2026-08-30', dur: 38 }] }
];
// cyberpunk accents for the stark style: neon magenta and cyan
const NEON_M = '#ff2bd6', NEON_C = '#00e5ff';
// arriving, each menu dot opens out into its beat pad over DOT_OPEN.dur seconds, starting at t0 + i * step (i in DECK_KEYS order); padReady(i) is
// when pad i is fully formed. The controller's fold-out is timed from these too
const DOT_OPEN = { t0: 1.45, step: .06, dur: .35 }, padReady = i => DOT_OPEN.t0 + i * DOT_OPEN.step + DOT_OPEN.dur;
const pad2 = n => String(n).padStart(2, '0');
const fmtDate = iso => { const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
const fmtDur = s => Math.floor(s / 60) + ':' + pad2(Math.floor(s % 60));
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
// a piece's loudness over its length, 0..1 at N_ENV points: swells for field recordings, sections and beats for music, phrases and pauses for voice
const N_ENV = 400;
function envOf(tr) {
  const r = rng(hash(tr.title)), e = new Float32Array(N_ENV);
  if (tr.kind === 'field') { const f = [1 + r() * 2, 3 + r() * 3, 7 + r() * 5], p = [r() * 6, r() * 6, r() * 6]; for (let i = 0; i < N_ENV; i++) { const u = i / N_ENV; e[i] = .5 + .2 * Math.sin(u * f[0] * TAU + p[0]) + .12 * Math.sin(u * f[1] * TAU + p[1]) + .06 * Math.sin(u * f[2] * TAU + p[2]) + (r() - .5) * .14; } }
  else if (tr.kind === 'music') { const secs = [.35, .6, .9, .55, .95, .4]; for (let i = 0; i < N_ENV; i++) { const k = Math.min(secs.length - 1, Math.floor(i / N_ENV * secs.length)); e[i] = secs[k] * (.78 + .22 * Math.abs(Math.sin(i * Math.PI / 4))) + (r() - .5) * .1; } }
  else { let i = 0; while (i < N_ENV) { const L = 10 + Math.floor(r() * 24), lv = .5 + r() * .4; for (let k = 0; k < L && i < N_ENV; k++) e[i++] = lv * (.6 + .4 * r()); const G = 3 + Math.floor(r() * 7); for (let k = 0; k < G && i < N_ENV; k++) e[i++] = .04 + r() * .04; } }
  const o = new Float32Array(N_ENV); for (let i = 0; i < N_ENV; i++) { const a = e[Math.max(0, i - 1)], b = e[Math.min(N_ENV - 1, i + 1)]; o[i] = clamp((a + 2 * e[i] + b) / 4 * Math.min(1, i / 6, (N_ENV - 1 - i) / 6), .03, 1); }
  return o;
}
function envFromBuf(buf) { const d = buf.getChannelData(0), e = new Float32Array(N_ENV), step = Math.max(4, Math.floor(d.length / N_ENV)); let mx = 1e-6;
  for (let i = 0; i < N_ENV; i++) { let s = 0, c = 0; for (let j = i * step; j < (i + 1) * step && j < d.length; j += 4) { s += d[j] * d[j]; c++; } e[i] = Math.sqrt(s / Math.max(1, c)); mx = Math.max(mx, e[i]); }
  for (let i = 0; i < N_ENV; i++) e[i] = .04 + .9 * e[i] / mx; return e; }
const envAt = (e, u) => { const x = clamp(u, 0, 1) * (e.length - 1), i = Math.floor(x), f = x - i; return e[i] * (1 - f) + e[Math.min(e.length - 1, i + 1)] * f; };
// an album's pieces end to end, for the resting wave, and which piece sits at each point of it
const mixOf = tracks => { const tot = tracks.reduce((s, t) => s + t.dur, 0), e = new Float32Array(N_ENV); for (let i = 0; i < N_ENV; i++) { let u = i / (N_ENV - 1) * tot, k = 0; while (k < tracks.length - 1 && u > tracks[k].dur) { u -= tracks[k].dur; k++; } e[i] = envAt(tracks[k].env, u / tracks[k].dur); } return e; };
const kindAt = (tracks, u) => { const tot = tracks.reduce((s, t) => s + t.dur, 0); let v = u * tot, k = 0; while (k < tracks.length - 1 && v > tracks[k].dur) { v -= tracks[k].dur; k++; } return tracks[k].kind; };
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const VOWELS = [[730, 1090], [270, 2290], [300, 870], [530, 1840], [660, 1720], [440, 1020]];
// pieces per half-column in the many style
const FK = 20;

class Component extends DCLogic {
  state = { navHov: null, album: 0, hover: null, playing: null, paused: false, W: 1200, H: 800 };
  canvasRef = React.createRef(); contentRef = React.createRef(); rootRef = React.createRef(); flapA = React.createRef(); flapB = React.createRef(); wheelRef = React.createRef();
  wvOf() { return innerWidth; }
  seek(u) { const c = this.cur; if (!c) return; const off = clamp(u, 0, 1) * c.tr.dur; if (c.paused) { c.off = off; this.forceUpdate(); } else this.play(c.tr, off); }
  // arriving from another page, once the dots have become faders the page tunes in like a radio finding its station:
  // sig is the signal strength, rising with a few dropouts; u is the time since tuning began
  tuneAt(t) { if (!this.arr) return null; const u = t - 1.6; if (u > 1.9) return null; const drop = [.3, .55, .82].reduce((m, c) => Math.max(m, Math.exp(-(((u - c) / .035) ** 2))), 0); return { u, sig: u <= 0 ? 0 : clamp(smooth(clamp(u / 1.2, 0, 1)) * (1 - .75 * drop), 0, 1) }; }
  // ---- the deck's controls
  // jog wheels (either one): drag round to scrub, a turn is six seconds of the piece (clockwise forward); a playing piece jumps along every few frames, like tape
  // the jog's lit rim is a ring you can press: the top is the start of the piece and it runs clockwise to the end, so a click (or a drag along
  // it) jumps straight there. With nothing loaded it starts the album's first piece at that point
  onRim(ex, ey) { const G = deckGeo(innerWidth, innerHeight), [jx, jy] = (this.jogCs || {}).jog || [0, 0], d = Math.hypot(ex - jx, ey - jy); return d > G.jog[2] + 1 && d < G.jog[2] + 17; }
  rimAt(ex, ey) { const [jx, jy] = (this.jogCs || {}).jog || [0, 0]; let a = Math.atan2(ex - jx, -(ey - jy)); if (a < 0) a += TAU; return a / TAU; }
  rimSeek(u) { const c = this.cur; if (!c) { const tr = this.albums[this.state.album].tracks[0]; this.play(tr, u * tr.dur); return; } this.seek(u); }
  jogHover = e => { const r = this.onRim(e.clientX, e.clientY); this.rimHov = r; const cur = r ? 'pointer' : 'grab'; if (e.currentTarget.style.cursor !== cur) e.currentTarget.style.cursor = cur; };
  // a click on the jog (no turn) plays / pauses, like the play button; a drag round it scrubs
  jogDown = e => { if (e.button) return; e.preventDefault();
    // on the rim: jump there. Held and dragged round it, the piece pauses while the pointer travels and plays on from wherever it is let go
    if (this.onRim(e.clientX, e.clientY)) { this.rimSeek(this.rimAt(e.clientX, e.clientY)); this.rimDrag = true; const resume = this.cur && !this.cur.paused; if (resume) this.toggle();
      const mv = ev => this.seek(this.rimAt(ev.clientX, ev.clientY)), up = () => { this.rimDrag = false; removeEventListener('pointermove', mv); removeEventListener('pointerup', up); if (resume && this.cur && this.cur.paused) this.toggle(); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); return; }
    const [jx, jy] = (this.jogCs || {})[e.currentTarget.getAttribute('data-deck')] || [0, 0], sx0 = e.clientX, sy0 = e.clientY;
    let a0 = Math.atan2(e.clientY - jy, e.clientX - jx), moved = false; this.jog = this.cur ? { pos: this.posOf(), at: 0 } : null;
    const mv = ev => { if (!moved && Math.hypot(ev.clientX - sx0, ev.clientY - sy0) < 5) return; moved = true; this.jogScr = true;
      const a = Math.atan2(ev.clientY - jy, ev.clientX - jx); let d = a - a0; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; a0 = a; this.jogA = (this.jogA || 0) + d;
      const cc = this.cur; if (!cc || !this.jog) return; this.jog.pos = clamp(this.jog.pos + d / TAU * 6, 0, cc.tr.dur); const now = performance.now();
      if (cc.paused) cc.off = this.jog.pos; else if (now - this.jog.at > 70) { this.jog.at = now; const j = this.jog; this.jog = null; this.play(cc.tr, j.pos); this.jog = j; } };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); const j = this.jog, cc = this.cur; this.jog = null; this.jogScr = false;
      if (!moved) { this.playBtn(); return; } if (cc && j) { if (cc.paused) { cc.off = j.pos; this.forceUpdate(); } else this.play(cc.tr, j.pos); } };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); };
  // six numbered knobs, a combination lock: each turns through 0..9 and clicks into place on a number. Grab one and turn it round (like a
  // real dial: the pointer leans toward the hand, then snaps to the next number with a click), click a number to turn straight to it, or
  // scroll over it. Set to 5 2 3 8 6 9 they open something (still to come: see onCombo)
  knobV = [0, 0, 0, 0, 0, 0];
  setKnob(i, v) { v = ((v % 10) + 10) % 10; const old = this.knobV[i]; if (old === v) return; this.knobV[i] = v; this.knobAt = this.knobAt || []; this.knobAt[i] = this.t;
    this.knobKick = this.knobKick || []; this.knobKick[i] = { t: this.t, d: v > old ? 1 : -1 }; this.knobClick(); try { if (navigator.vibrate && matchMedia('(pointer: coarse)').matches) navigator.vibrate(4); } catch (e) {}
    if (this.knobV.join('') === '523869') this.onCombo(); }
  // the combination is set. What it opens is still to be decided; for now every number stays lit while it is set, so you can tell
  onCombo() { this.comboT = this.t; }
  // each hit on the spare pad: a kick drum, a sine that drops from a punchy click to a low thump, through the deck's volume
  // (straight into the volume, not the analyser, so it doesn't move the piece's wave or the squid's tempo; timed on its own clock, which the page's
  // never resets)
  spareHit = () => { this.spareAt = performance.now() / 1000; this.spareN = (this.spareN || 0) + 1;
    try { this.ensureAC(); const ac = this.ac, now = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), c = ac.createOscillator(), cg = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(160, now); o.frequency.exponentialRampToValueAtTime(48, now + .12); o.frequency.exponentialRampToValueAtTime(38, now + .45);
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(.9, now + .004); g.gain.exponentialRampToValueAtTime(.001, now + .5); o.connect(g); g.connect(this.vol); o.start(now); o.stop(now + .52);
      c.type = 'triangle'; c.frequency.setValueAtTime(1800, now); c.frequency.exponentialRampToValueAtTime(300, now + .02); cg.gain.setValueAtTime(.25, now); cg.gain.exponentialRampToValueAtTime(.001, now + .03); c.connect(cg); cg.connect(this.vol); c.start(now); c.stop(now + .04); } catch (e) {} };
  // the detent's click: a short bright tick of noise over a tiny knock, through the volume
  knobClick() { try { this.ensureAC(); const ac = this.ac; if (ac.state === "suspended" && ac.resume) ac.resume(); const now = ac.currentTime, n = Math.floor(ac.sampleRate * .012), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let q = 0; q < n; q++) d[q] = (Math.random() * 2 - 1) * Math.exp(-q / (n * .16));
    const src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain(), o = ac.createOscillator(), og = ac.createGain(); src.buffer = b; bp.type = 'bandpass'; bp.frequency.value = 3400; bp.Q.value = 1.4;
    g.gain.value = .35; src.connect(bp); bp.connect(g); g.connect(this.vol); o.frequency.value = 1900; og.gain.setValueAtTime(.06, now); og.gain.exponentialRampToValueAtTime(.0001, now + .02); o.connect(og); og.connect(this.vol);
    src.start(now); o.start(now); o.stop(now + .03); } catch (e) {} }
  knobDown = i => e => { if (e.button) return; e.preventDefault(); const el = e.currentTarget;
    const G = deckGeo(innerWidth, innerHeight), [kx, ky, kr] = G.knobs[i], cy0 = ky + (this.deckSY || 0), angOf = p => Math.atan2(p.clientX - kx, -(p.clientY - cy0)) * 180 / Math.PI;
    // pressed on a number: a click (no turn) goes straight to it
    const d0 = Math.hypot(e.clientX - kx, e.clientY - cy0), a0 = angOf(e), num = d0 > kr * 1.15 && a0 >= -168 && a0 <= 168 ? clamp(Math.round((a0 + 150) / (300 / 9)), 0, 9) : null;
    let last = a0, raw = -150 + this.knobV[i] * 300 / 9, turned = 0; this.knobHeld = i; this.knobRaw = this.knobRaw || []; this.knobRaw[i] = raw;
    el.style.cursor = 'grabbing'; document.body.style.cursor = 'grabbing';
    // turning: the hand's angle round the knob's centre, unwrapped, moves the dial (between its stops at 0 and 9); it settles on the nearest number
    const mv = ev => { if (Math.hypot(ev.clientX - kx, ev.clientY - cy0) < 4) return; const a = angOf(ev); let dd = a - last; if (dd > 180) dd -= 360; if (dd < -180) dd += 360; last = a;
      turned += Math.abs(dd); raw = clamp(raw + dd, -150, 150); this.knobRaw[i] = raw; this.setKnob(i, Math.round((raw + 150) / (300 / 9))); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); this.knobHeld = null; this.knobRaw[i] = null; el.style.cursor = 'grab'; document.body.style.cursor = '';
      if (turned < 4 && num != null) this.setKnob(i, num); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); };
  knobMove = i => e => { const G = deckGeo(innerWidth, innerHeight), [kx, ky, kr] = G.knobs[i], dx = e.clientX - kx, dy = e.clientY - (ky + (this.deckSY || 0)), d = Math.hypot(dx, dy), ang = Math.atan2(dx, -dy) * 180 / Math.PI;
    const q = d > kr * 1.15 && ang >= -168 && ang <= 168 ? clamp(Math.round((ang + 150) / (300 / 9)), 0, 9) : null; this.knobNum = q == null ? null : { i, q };
    const cur = this.knobHeld === i ? 'grabbing' : 'grab'; if (e.currentTarget.style.cursor !== cur) e.currentTarget.style.cursor = cur; };
  knobWheel = i => e => { e.stopPropagation(); this.setKnob(i, this.knobV[i] + (e.deltaY < 0 ? 1 : -1)); };
  // the squid on the screen: asleep while nothing plays, dancing while a piece does. A pad under the pointer sets it off on a little turn,
  // picked at random (never the same twice running), and then he drops off again
  padOn(i) { if (this.padHov !== i) { let f; do f = SQUID_REACTS[Math.floor(Math.random() * SQUID_REACTS.length)]; while (f === this.kReact); this.kReact = f; this.kAt = this.t; } this.padHov = i; }
  padOff(i) { if (this.padHov === i) this.padHov = null; }
  // play / pause; with nothing chosen yet it starts the album's first piece
  // the controller's accent: the song's ink (the lit edge's colour), blended in as the edge lights; cyan with nothing loaded. Strokes and
  // glows take it a little brightened (acc), text a lighter tint so it reads on the dark glass (accL)
  accent() { const k = clamp(this.rgbK || 0, 0, 1), ink = this.rgbC || [0, 229, 255], mix = (a, b, u) => a.map((v, q) => Math.round(v + (b[q] - v) * u));
    const base = mix([0, 229, 255], mix(ink, [255, 255, 255], .22), k), lt = mix(base, [255, 255, 255], .5);
    return { rgb: base, acc: 'rgb(' + base.join(',') + ')', accL: 'rgb(' + lt.join(',') + ')', accL2: 'rgb(' + mix(base, [255, 255, 255], .75).join(',') + ')', a: al => 'rgba(' + base.join(',') + ',' + al + ')' }; }
  // the lit edge's colour (the playhead takes it too); null when
  // the edge is plain
  rimCol() { return this.rgbK > .5 && this.rgbC ? 'rgb(' + this.rgbC.map(Math.round).join(',') + ')' : null; }
  // full screen: the controller slides away and the photo fades, leaving only the wave and its playhead, centred on the page (and the
  // browser goes full screen too, where it can). There the wave's own pointers come back: a click plays / pauses, and the playhead can be
  // dragged. Esc, F, or the corner key that shows when the mouse moves bring the controller back
  goFull = () => { try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {} this.focus = true; this.fMove = performance.now(); this.fAt = performance.now(); const d = document.documentElement; try { const p = d.requestFullscreen && d.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
  leaveFull = () => { this.focus = false; try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } catch (e) {} };
  // the music's tempo, for the squid's dance: listens for beats in the bass (an onset is the low end jumping well above its recent level),
  // takes the median gap between the last dozen, folds it into 70..150 beats a minute, and eases toward it. Quiet or beatless music
  // (no onsets for a few seconds) settles slowly toward 72, so he sways gently
  kTempo(dt) { const an = this.an, c = this.cur; if (this.kBpm == null) this.kBpm = 100; if (!an || !c || c.paused) return this.kBpm;
    if (!this.kF || this.kF.length !== an.frequencyBinCount) this.kF = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(this.kF);
    let e = 0; for (let q = 1; q <= 5; q++) e += this.kF[q]; e /= 5 * 255; const now = this.t;
    this.kEm = this.kEm == null ? e : this.kEm + (e - this.kEm) * Math.min(1, dt * 1.5);
    if (e > .08 && e > this.kEm * 1.3 && e - (this.kEp || 0) > .02 && now - (this.kOn || 0) > .28) { if (this.kOn) { const g = now - this.kOn; if (g < 2) { this.kGaps = (this.kGaps || []).concat(g).slice(-12); } } this.kOn = now; }
    this.kEp = e;
    let tgt = this.kBpm; if (this.kGaps && this.kGaps.length >= 4) { const sg = [...this.kGaps].sort((a, b) => a - b), g = sg[sg.length >> 1]; let b = 60 / g; while (b < 70) b *= 2; while (b > 150) b /= 2; tgt = b; }
    if (now - (this.kOn || 0) > 3) { tgt = 72; if (now - (this.kOn || 0) > 6) this.kGaps = []; }
    this.kBpm += (tgt - this.kBpm) * Math.min(1, dt * .8); return this.kBpm; }
  playBtn = () => { if (this.cur) this.toggle(); else this.play(this.albums[this.state.album].tracks[0]); };
  // cue: back to the start of the piece (a paused piece stays paused there)
  cueBtn = () => { const c = this.cur; if (!c) return; if (c.paused) { c.off = 0; this.forceUpdate(); } else this.play(c.tr, 0); };
  // faders can be pushed up and down; Sound's is the volume
  // the volume fader beside the screen
  volDown = e => { if (e.button) return; e.preventDefault(); const set = y => { const G = deckGeo(innerWidth, innerHeight); this.volHold = clamp(y - (this.deckSY || 0), G.lo, G.hi); };
    set(e.clientY); this.volDrag = 1; const mv = ev => set(ev.clientY), up = () => { this.volDrag = 0; removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); };
  // the track list on the centre screen: where each row sits (shared by the drawing and the row buttons over it)
  // the screen's top bar (now playing, and the squid's stage) is this much taller than its text needs, so the squid has room to swim about
  stripEx(G) { return G.phone ? 16 : 30; }
  // the squid's pixel size on the screen: as big as the strip allows
  sqPx(G) { return G.phone || G.scr[2] < 320 ? 2.5 : 3; }
  rowsOf(G) { const [sx, sy, sw, sh] = G.scr, ex = this.stripEx(G), n = this.albums[this.state.album].tracks.length, top = sy + 66 + ex, rh = clamp((sh - 70 - ex) / Math.max(1, n), 15, 44); return Array.from({ length: n }, (_, k) => [sx + 4, top + k * rh, sw - 8, rh]); }
  t = 0; live = 0; mx = 0; pf = 0; labs = {}; S = [0, 1, 2, 3, 4, 5, 6, 7].map(() => ({ on: 0, k: 0, yp: 300, y0: 300, tp: -9 }));
  albums = ALBUMS.map((a, ai) => { const tracks = a.tracks.map((tr, ti) => ({ ...tr, id: ai + '-' + ti, ai, ti, env: envOf(tr) })); return { ...a, tracks, mix: mixOf(tracks) }; });
  strip = false;
  get look() { const s = this.props.style ?? 'stark'; return THEMES[s] ? s : 'stark'; }
  componentDidMount() {
    // arriving from Home or Freediving: their menu dots are handed over and fly in to become this page's faders
    if (/from=page/.test(location.search)) try { const nf = JSON.parse(sessionStorage.getItem('nav-from') || 'null'); if (nf) this.arr = { nf }; sessionStorage.removeItem('nav-from'); } catch (e) {}
    const r = rng(7), gc = document.createElement('canvas'); gc.width = gc.height = 220;
    { const x = gc.getContext('2d'), im = x.createImageData(220, 220); for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (r() - .5) * 150; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); }
    this.grainC = gc; this.lc = document.createElement('canvas');
    this.setState({ W: innerWidth, H: innerHeight });
    this.onResize = () => this.setState({ W: innerWidth, H: innerHeight });
    // one album per scroll gesture: a gesture is armed after a short pause in wheel events and fires once it has moved far enough
    this.onWheel = e => { if (e.target && e.target.closest && e.target.closest('[data-knob]')) return; const now = performance.now(); if (now - (this.lastWheel || 0) > 180) { this.acc = 0; this.armed = true; } this.lastWheel = now; this.acc += e.deltaY; if (this.armed && Math.abs(this.acc) > 30 && now - (this.lastStep || 0) > 650) { this.armed = false; this.lastStep = now; this.step(this.acc > 0 ? 1 : -1); } };
    this.onKey = e => { const tg = e.target && e.target.tagName || ''; if (/INPUT|TEXTAREA|SELECT/.test(tg)) return; const k = e.key;
      if (k === 'ArrowDown' || k === 'PageDown') { e.preventDefault(); this.step(1); } else if (k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); this.step(-1); }
      else if (k === ' ' && this.cur && !/BUTTON|^A$/.test(tg)) { e.preventDefault(); this.toggle(); } else if (k === 'Escape') { if (this.focus) this.leaveFull(); else this.stop(); }
      else if ((k === 'f' || k === 'F') && !e.metaKey && !e.ctrlKey && !e.altKey) { if (this.focus) this.leaveFull(); else this.goFull(); } };
    // full screen: the browser's own exit (its Esc) leaves it too; moving the mouse shows the corner key and the pointer
    this.onFsc = () => { if (document.fullscreenElement) this.fsOn = true; else if (this.fsOn) { this.fsOn = false; if (this.focus) this.leaveFull(); } };
    this.onFMove = e => { this.fMove = performance.now(); this.fmx = e.clientX; };
    const onExit = e => e.target && e.target.closest && e.target.closest('[data-full-exit]');
    // near the playhead (within 9px): grab it and drag; a playing piece jumps along every few frames, like dragging tape
    this.nearHead = x => { const c = this.cur; return !!c && x != null && Math.abs(x - this.posOf() / c.tr.dur * this.wvOf()) < 9; };
    this.onFDown = e => { if (!this.focus || this.fK < .5 || e.button || onExit(e) || !this.nearHead(e.clientX)) return; e.preventDefault(); this.scrub = { x: e.clientX };
      const mv = ev => { this.scrub.x = clamp(ev.clientX, 0, this.wvOf()); this.fmx = ev.clientX; this.fMove = performance.now(); const now = performance.now(), c = this.cur;
        if (c && !c.paused && now - (this.scrub.at || 0) > 70) { this.scrub.at = now; const sc = this.scrub; this.scrub = null; this.seek(sc.x / this.wvOf()); this.scrub = sc; } };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); const u = this.scrub.x / this.wvOf(); this.scrub = null; this.scrubAt = performance.now(); this.seek(u); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up); };
    // on a phone (which has no play button) a tap on the wave area plays and pauses, or starts the album's first piece; taps on controls, links,
    // the album's text, the deck, the playhead or just after scrubbing are left alone
    this.onWClick = e => { if (this.focus || !isPhone(innerWidth, innerHeight) || performance.now() - (this.scrubAt || 0) < 350 || this.nearHead(e.clientX)) return;
      const tg = e.target; if (tg && tg.closest && tg.closest('button,a,input,[role],[data-row],[data-navk],[data-deck],[data-knob],[data-cpad],[data-full-exit],h2,p,ol,li')) return;
      if (e.clientY >= deckGeo(innerWidth, innerHeight).y0 + (this.deckSY || 0)) return; this.playBtn(); };
    this.onFClick = e => { if (!this.focus || performance.now() - (this.fAt || 0) < 400 || onExit(e) || performance.now() - (this.scrubAt || 0) < 350 || this.nearHead(e.clientX)) return; if (this.cur) this.toggle(); };
    this.onTS = e => { this.ty = e.touches[0].clientY; }; this.onTE = e => { if (this.ty == null) return; const dy = this.ty - e.changedTouches[0].clientY; this.ty = null; if (Math.abs(dy) > 50) this.step(dy > 0 ? 1 : -1); };
    this.onPM = e => { this.mxT = e.clientX / innerWidth * 2 - 1; };
    addEventListener('resize', this.onResize); addEventListener('wheel', this.onWheel, { passive: true }); addEventListener('keydown', this.onKey); document.addEventListener('fullscreenchange', this.onFsc); addEventListener('pointermove', this.onFMove); addEventListener('click', this.onFClick); addEventListener('click', this.onWClick); addEventListener('pointerdown', this.onFDown); addEventListener('touchstart', this.onTS, { passive: true }); addEventListener('touchend', this.onTE); addEventListener('pointermove', this.onPM);
    // pieces with a file: decode it for its real waveform and length
    this.albums.forEach(a => a.tracks.forEach(tr => { if (!tr.src) return; const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC) return;
      fetch(tr.src).then(res => res.arrayBuffer()).then(b => new OAC(1, 1, 44100).decodeAudioData(b)).then(buf => { tr.buf = buf; tr.dur = buf.duration; tr.env = envFromBuf(buf); a.mix = mixOf(a.tracks); this.forceUpdate(); }).catch(() => {}); }));
    if (import.meta.env.DEV) window.__sound = this; // a handle for checking the page in development; not in the built site
    this.raf = requestAnimationFrame(this.tick);
  }
  componentWillUnmount() { cancelAnimationFrame(this.raf); removeEventListener('resize', this.onResize); removeEventListener('wheel', this.onWheel); removeEventListener('keydown', this.onKey); document.removeEventListener('fullscreenchange', this.onFsc); removeEventListener('pointermove', this.onFMove); removeEventListener('click', this.onFClick); removeEventListener('click', this.onWClick); removeEventListener('pointerdown', this.onFDown); removeEventListener('touchstart', this.onTS); removeEventListener('touchend', this.onTE); removeEventListener('pointermove', this.onPM); this.stopNodes(); try { this.ac && this.ac.close(); } catch (e) {} }
  componentDidUpdate(prev) { if (prev.style !== this.props.style) { this.t = 0; this.disp = null; this.listBottom = 0; } }
  step(d) { this.goAlbum(this.state.album + d)(); }
  goAlbum = a => () => { a = clamp(a, 0, this.albums.length - 1); if (a === this.state.album) return; this.albDir = a > this.state.album ? 1 : -1; if (this.strip && this.cur) this.stop(); this.flipPrev = this.state.album; this.flipT0 = this.t; this.setState({ album: a, hover: null }); };
  trById(id) { const [a, b] = id.split('-').map(Number); return this.albums[a].tracks[b]; }
  // ---- sound
  ensureAC() { if (!this.ac) { const AC = window.AudioContext || window.webkitAudioContext; this.ac = new AC(); this.an = this.ac.createAnalyser(); this.an.fftSize = 512; this.vol = this.ac.createGain(); this.an.connect(this.vol); this.vol.connect(this.ac.destination); this.anBuf = new Float32Array(512); } if (this.ac.state === 'suspended') this.ac.resume(); }
  play(tr, off = 0) {
    this.stopNodes(); this.ensureAC(); const ac = this.ac, now = ac.currentTime, out = ac.createGain(); out.gain.value = 0; out.connect(this.an);
    const N = { out, list: [] }, on = this.props.synth ?? true;
    if (tr.buf) { const s = ac.createBufferSource(); s.buffer = tr.buf; s.connect(out); out.gain.value = 1; s.start(now, off); N.list.push(s); N.file = 1; }
    else if (on && tr.kind === 'field') { const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0); let b = 0; for (let i = 0; i < d.length; i++) { b = .97 * b + .03 * (Math.random() * 2 - 1); d[i] = b * 4 + (Math.random() * 2 - 1) * .12; }
      const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600; f.Q.value = .5; s.connect(f); f.connect(out); s.start(); N.list.push(s); N.f = f; }
    else if (on && tr.kind === 'music') { const lead = ac.createOscillator(), ng = ac.createGain(), bass = ac.createOscillator(), bg = ac.createGain(); lead.type = 'triangle'; bass.type = 'sine'; ng.gain.value = 0; bg.gain.value = .45;
      lead.connect(ng); ng.connect(out); bass.connect(bg); bg.connect(out); lead.start(); bass.start(); N.list.push(lead, bass); Object.assign(N, { lead, ng, bass }); }
    else if (on && tr.kind === 'voice') { const saw = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), b1 = ac.createBiquadFilter(), b2 = ac.createBiquadFilter(), g2 = ac.createGain();
      saw.type = 'sawtooth'; saw.frequency.value = 118; lfo.frequency.value = 5.2; lg.gain.value = 2.5; lfo.connect(lg); lg.connect(saw.frequency);
      [b1, b2].forEach(b => { b.type = 'bandpass'; b.Q.value = 9; saw.connect(b); }); g2.gain.value = .6; b1.connect(out); b2.connect(g2); g2.connect(out); saw.start(); lfo.start(); N.list.push(saw, lfo); Object.assign(N, { saw, b1, b2 }); }
    this.cur = { tr, t0: now - off, N, nextNote: off, nextVowel: off, n: Math.floor(off / .3125), seed: hash(tr.title), paused: false, off };
    this.setState({ playing: tr.id, paused: false });
  }
  stopNodes() { const c = this.cur; if (!c || !c.N) return; c.N.list.forEach(n => { try { n.stop(); } catch (e) {} }); try { c.N.out.disconnect(); } catch (e) {} c.N = { list: [] }; }
  stop() { this.stopNodes(); this.cur = null; this.live = 0; if (this.state.playing) this.setState({ playing: null, paused: false }); }
  toggle() { const c = this.cur; if (!c) return; if (c.paused) this.play(c.tr, c.off); else { c.off = this.ac.currentTime - c.t0; this.stopNodes(); c.paused = true; this.setState({ paused: true }); } }
  click(tr) { if (this.cur && this.cur.tr.id === tr.id) this.toggle(); else this.play(tr); }
  posOf() { const c = this.cur; if (!c) return 0; if (this.jog) return this.jog.pos; if (this.scrub) return clamp(this.scrub.x / this.wvOf(), 0, 1) * c.tr.dur; return c.paused ? c.off : clamp(this.ac.currentTime - c.t0, 0, c.tr.dur); }
  audioTick() { const c = this.cur; if (!c || c.paused) return; const ac = this.ac, now = ac.currentTime, pos = now - c.t0, tr = c.tr;
    if (pos >= tr.dur) { const nx = this.albums[tr.ai].tracks[tr.ti + 1]; if (nx) this.play(nx); else this.stop(); return; }
    const e = envAt(tr.env, pos / tr.dur), N = c.N;
    if (N.f) { N.out.gain.setTargetAtTime(.32 * e, now, .08); N.f.frequency.setTargetAtTime(220 + 1300 * e * e, now, .12); }
    if (N.lead) { N.out.gain.setTargetAtTime(.1 * (.35 + .65 * e), now, .1);
      while (c.nextNote <= pos + .05) { const deg = SCALE[Math.floor(rng(c.seed + c.n * 7919)() * SCALE.length)], at = now + Math.max(0, c.nextNote - pos); N.lead.frequency.setValueAtTime(220 * Math.pow(2, deg / 12), at); N.ng.gain.setTargetAtTime(1, at, .008); N.ng.gain.setTargetAtTime(0, at + .06, .14);
        if (c.n % 8 === 0) N.bass.frequency.setValueAtTime(55 * Math.pow(2, [0, 5, 7, 3][((c.n / 8) % 4) | 0] / 12), at); c.n++; c.nextNote += .3125; } }
    if (N.saw) { N.out.gain.setTargetAtTime(e > .2 ? .7 * e : 0, now, .03); N.saw.frequency.setTargetAtTime(108 + 22 * Math.sin(pos * .9), now, .2);
      while (c.nextVowel <= pos) { const v = VOWELS[Math.floor(rng(c.seed + (c.nextVowel * 100 | 0))() * VOWELS.length)]; N.b1.frequency.setTargetAtTime(v[0], now, .03); N.b2.frequency.setTargetAtTime(v[1], now, .03); c.nextVowel += .14 + .06 * Math.sin(c.nextVowel * 3); } }
    let lv = e; if (N.file || N.f || N.lead || N.saw) { this.an.getFloatTimeDomainData(this.anBuf); let s = 0; for (let i = 0; i < this.anBuf.length; i++) s += this.anBuf[i] * this.anBuf[i]; lv = clamp(Math.sqrt(s / this.anBuf.length) * 6, 0, 1); }
    this.live += (lv - this.live) * .3; }
  // ---- nav (same as the other pages)
  dotOf(k) { const d = document.querySelector('[data-navk="' + k + '"] [data-navdot]'); if (!d) return null; const r = d.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  // kind: 'home' (faders turn back into dots and the panel slides away, Home picks the dots up), 'dive' (the same, and Freediving picks them up:
  // they draw its water's surface lines, then go up into its menu), 'other' (plain fade)
  leave(href, kind) { return e => { if (e) e.preventDefault(); if (this.out) return; this.stop(); this.out = { href, t: 0, k: kind }; }; }
  stay = e => { if (e) e.preventDefault(); };
  goHome = this.leave(HOME, 'home');
  GO = { freediving: this.leave(BASE + 'freediving/?from=sound', 'dive'), sound: this.stay, journal: this.leave(BASE + 'journal/', 'other') };
  tick = now => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(.05, (now - (this.last || now)) / 1000); this.last = now; this.t += dt;
    if (this.arr && (this.t > 4.5 || this.out)) this.arr = null;
    if (this.out) { this.out.t += dt; const lim = this.out.k === 'home' || this.out.k === 'dive' ? 1.25 : .55;
      if (this.out.t > lim && !this.left) { this.left = true; if (this.out.k === 'home' || this.out.k === 'dive') try { const o = { ...(this.dotPos || {}) }; o.ink = o.home; sessionStorage.setItem('nav-from', JSON.stringify(o)); } catch (x) {} (window.__leave || (h => { location.href = h; }))(this.out.href); } }
    this.mx += ((this.mxT || 0) - this.mx) * Math.min(1, dt * 3);
    // the volume fader sets the master gain; squared, so the fader moves through loudness the way the ear hears it (half way down is half as loud)
    if (this.vol) this.vol.gain.setTargetAtTime(Math.pow(this.volume ?? 1, 2), this.ac.currentTime, .05);
    this.audioTick(); this.draw(dt); this.flipTick(); this.wheelTick(dt);
  };
  // the album clock beside the screen: the flip counter in its display, and the album names rolling through the display round it. The
  // current album's name sits just off the counter: below it when it rolled in from below (scrolling on), above it when it came from above
  // (scrolling back). The others sit further out in order, the album before above and the one after below
  wheelTick(dt) { const box = this.wheelRef.current; if (!box) return; const G = deckGeo(innerWidth, innerHeight), ds = deckScale(innerWidth, innerHeight), [bx0, by0, bwS, bhS] = G.clockScr, bw0 = bwS / ds, bh0 = bhS / ds, st = box.style;
    // (laid out at the deck's own size and scaled down with it on a narrow screen)
    const v2 = [bx0 + 'px', (by0 + (this.deckSY || 0)).toFixed(1) + 'px', bw0 + 'px', bh0 + 'px']; if (st.left !== v2[0]) st.left = v2[0]; if (st.top !== v2[1]) st.top = v2[1]; if (st.width !== v2[2]) st.width = v2[2]; if (st.height !== v2[3]) st.height = v2[3];
    { const tf = ds < 1 ? 'scale(' + ds.toFixed(4) + ')' : ''; if (st.transform !== tf) { st.transform = tf; st.transformOrigin = '0 0'; } }
    { const A = this.acc; if (A) { const v1 = A.accL, v2 = A.a(.6), v3 = A.acc, v4 = A.a(.75); if (box.style.getPropertyValue('--accL') !== v1) { box.style.setProperty('--accL', v1); box.style.setProperty('--accG', v2); box.style.setProperty('--acc', v3); box.style.setProperty('--accG2', v4); } } }
    const cur = this.state.album, dir = this.albDir || 1, near = 56, step = Math.min(22, (bh0 / 2 - near - 8) / 1.5), half = bh0 / 2; this.wy = this.wy || {};
    box.querySelectorAll('[data-wi]').forEach(el => { const j = +el.getAttribute('data-wi'), d = j - cur;
      // slot: the current name on its side; the neighbours stepping outwards (the ones on the current name's side go beyond it)
      let y; if (d === 0) y = dir * near; else if (Math.sign(d) === dir) y = dir * (near + Math.abs(d) * step); else y = -dir * (near + (Math.abs(d) - 1) * step);
      const prev2 = this.wy[j] ?? y; this.wy[j] = prev2 + (y - prev2) * Math.min(1, dt * 7); const yy = this.wy[j];
      const op = d === 0 ? 1 : clamp(1 - (Math.abs(yy) - near) / (step * 2.4), 0, 1) * .5, inside = Math.abs(yy) < half - 6;
      el.style.top = (half + yy).toFixed(1) + 'px'; el.style.opacity = (inside ? op : 0).toFixed(3); el.style.pointerEvents = inside && op > .2 ? '' : 'none';
      el.style.color = d === 0 ? 'var(--accL, #7fe9f7)' : '#5d8a92'; el.style.textShadow = d === 0 ? '0 0 6px var(--accG, rgba(0,229,255,.6))' : 'none'; el.style.fontSize = d === 0 ? '9px' : '8px'; }); }
  // the album counter flips like a clock: the old number's top folds down, then the new number's bottom lands
  flipTick() { const A = this.flapA.current, B = this.flapB.current; if (!A || !B) return; const ft = this.flipT0 == null ? 2 : (this.t - this.flipT0) / .6;
    if (ft >= 1) { if (A.style.visibility !== 'hidden') { A.style.visibility = B.style.visibility = 'hidden'; } if (this.flipPrev != null && this.flipPrev !== this.state.album) { this.flipPrev = this.state.album; this.forceUpdate(); } return; }
    const e = easeIO(clamp(ft, 0, 1)); A.style.visibility = e < .5 ? 'visible' : 'hidden'; A.style.transform = 'rotateX(' + (-180 * e).toFixed(1) + 'deg)'; B.style.visibility = e >= .5 ? 'visible' : 'hidden'; B.style.transform = 'rotateX(' + (180 - 180 * e).toFixed(1) + 'deg)'; }
  // ---- the deck: a DJ controller running off the bottom of the screen (geometry in lib/deck.js). Its hit areas are real elements over the drawing
  placeDeck(G, SY) { const R = this.rootRef.current; if (!R) return;
    if (!this.dk || !this.dk.jog || !this.dk.jog.isConnected) this.dk = { jog: R.querySelector('[data-deck="jog"]'), cp: [...R.querySelectorAll('[data-cpad]')], play: R.querySelector('[data-deck="play"]'), full: R.querySelector('[data-deck="full"]'), vol: R.querySelector('[data-deck="vol"]'), knobs: [...R.querySelectorAll('[data-knob]')], rows: [...R.querySelectorAll('[data-row]')], pads: ['home', 'freediving', 'sound', 'journal'].map(k => R.querySelector('[data-navk="' + k + '"]')) };
    const put = (el, x, y, w, h) => { if (!el) return; const st = el.style, v = [x, y + SY, w, h].map(n => Math.round(n) + 'px'); if (st.left !== v[0]) st.left = v[0]; if (st.top !== v[1]) st.top = v[1]; if (st.width !== v[2]) st.width = v[2]; if (st.height !== v[3]) st.height = v[3]; if (st.display === 'none') st.display = ''; };
    this.jogCs = {}; const [jx, jy, jr] = G.jog, jo = jr + 16; put(this.dk.jog, jx - jo, jy - jo, jo * 2, jo * 2); this.jogCs.jog = [jx, jy + SY];
    this.dk.knobs.forEach((el, i) => { const [kx, ky] = G.knobs[i], hs = G.kc / 2; put(el, kx - hs, ky - hs, hs * 2, hs * 2); if (el.getAttribute('aria-valuenow') !== String(this.knobV[i])) el.setAttribute('aria-valuenow', String(this.knobV[i])); });
    { const hr = G.jog[2] * .3; put(this.dk.full, G.jog[0] - hr, G.jog[1] - hr, hr * 2, hr * 2); }
    [['play', G.play]].forEach(([k, b]) => put(this.dk[k], b[0] - b[2], b[1] - b[2], b[2] * 2, b[2] * 2));
    this.dk.pads.forEach((el, i) => { const p = G.pads[i]; put(el, p[0], p[1], p[2], p[3]); }); this.dk.cp.forEach((el, i) => { const p = i < 3 ? G.cpads[i] : G.spare; put(el, p[0], p[1], p[2], p[3]); });
    put(this.dk.vol, G.vol.x - 14, G.vol.y0 - 6, 28, G.vol.y1 - G.vol.y0 + 12);
    const rows = this.rowsOf(G); this.dk.rows.forEach((el, k) => { const r = rows[k]; if (r) put(el, r[0], r[1], r[2], r[3]); else if (el.style.display !== 'none') el.style.display = 'none'; }); }
  // arriving, the controller folds out of the beat pads: once the dots have dropped in and become the pads, the rest of it is cut into small
  // tiles that fold out from the pads in a wave, each flipping open on the edge that faces the pads (sideways to the left and right, up or down
  // above and below), shaded while it's still turned away, until the controller is whole. The deck is drawn whole to a layer of its own and laid
  // in tile by tile; the dots have a layer over it. Otherwise the deck is simply drawn
  deckOut(ctx, W, H, t, dt, TH, live, fo) {
    const A = this.arr; if (!A) { this.dotsCtx = null; this.drawDeck(ctx, W, H, t, dt, TH, live, fo); return; }
    // the fold-out starts once the last pad (and the spare after it) has formed
    const T0 = padReady(6) + .14, STEP = .045, DUR = .24, CS = 40;
    const dpr = ctx.getTransform().a, G = deckGeo(W, H), y0 = G.y0, hh = H - G.y0;
    const P = G.pads.concat(G.cpads, [G.spare]), bx0 = Math.min(...P.map(p => p[0])) - 6, by0 = Math.min(...P.map(p => p[1])) - 6, bx1 = Math.max(...P.map(p => p[0] + p[2])) + 6, by1 = Math.max(...P.map(p => p[1] + p[3])) + 6;
    // the tiles: a grid over the deck, each with its distance (in tiles) from the pad block, which sets when it folds out, and the side facing
    // the block, which it hinges on. A tile that overlaps the block keeps only the strips of it outside the block, each hinged on the block
    const key = W + 'x' + H; if (!this.tiles || this.tiles.key !== key) { const list = [], nx = Math.ceil((G.x1 - G.x0) / CS), ny = Math.ceil(hh / CS);
      const add = (x, y, w, h) => { if (w <= .5 || h <= .5) return; const cx = x + w / 2, cy = y + h / 2, dx = cx < bx0 ? (bx0 - cx) / CS : cx > bx1 ? (cx - bx1) / CS : 0, dy = cy < by0 ? (by0 - cy) / CS : cy > by1 ? (cy - by1) / CS : 0;
        list.push({ x, y, w, h, d: Math.max(0, Math.hypot(dx, dy) - .5), side: dx >= dy ? (cx < bx0 ? 'r' : 'l') : (cy < by0 ? 'b' : 't') }); };
      for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) { const x = G.x0 + c * CS, y = y0 + r * CS, w = Math.min(CS, G.x1 - x), h = Math.min(CS, H - y);
        if (x + w <= bx0 || x >= bx1 || y + h <= by0 || y >= by1) { add(x, y, w, h); continue; }
        const iy0 = Math.max(y, by0), iy1 = Math.min(y + h, by1); add(x, y, w, by0 - y); add(x, by1, w, y + h - by1); add(x, iy0, bx0 - x, iy1 - iy0); add(bx1, iy0, x + w - bx1, iy1 - iy0); }
      this.tiles = { key, list, end: list.length ? Math.max(...list.map(q => q.d)) * STEP + DUR : 0 }; }
    if (t > T0 + this.tiles.end + .05) { this.dotsCtx = null; this.drawDeck(ctx, W, H, t, dt, TH, live, fo); return; }
    const pw = Math.round(W * dpr), ph = Math.round(H * dpr), mk = () => document.createElement('canvas');
    const dk = this.unC || (this.unC = mk()), dt2 = this.unD || (this.unD = mk()); [dk, dt2].forEach(c => { if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; } });
    const oc = dk.getContext('2d'), od = dt2.getContext('2d'); [oc, od].forEach(c => { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, pw, ph); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.lineCap = 'round'; c.lineJoin = 'round'; });
    this.dotsCtx = od; this.drawDeck(oc, W, H, t, dt, TH, live, fo); this.dotsCtx = null;
    ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0;
    // the pads: each one's face appears under its dot the moment the dot has opened out into it (so the swap doesn't show), the spare just
    // after the last; then, as the fold-out starts, the plate they sit on locks in with them, wells and all
    const padAt = (q, a = 1) => { const [x, y, w, h] = P[q]; ctx.save(); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, 7); else ctx.rect(x, y, w, h); ctx.clip(); ctx.globalAlpha = a; ctx.drawImage(dk, x * dpr, y * dpr, w * dpr, h * dpr, x, y, w, h); ctx.restore(); };
    if (t >= T0) ctx.drawImage(dk, bx0 * dpr, by0 * dpr, (bx1 - bx0) * dpr, (by1 - by0) * dpr, bx0, by0, bx1 - bx0, by1 - by0);
    else { for (let q = 0; q < 7; q++) if (t >= padReady(q)) padAt(q); if (t >= padReady(6)) padAt(7, smooth(clamp((t - padReady(6)) / (T0 - padReady(6)), 0, 1))); }
    for (const q of this.tiles.list) { const u = clamp((t - T0 - q.d * STEP) / DUR, 0, 1); if (u <= 0) continue; const k = 1 - Math.pow(1 - u, 3), kw = q.side === 'l' || q.side === 'r' ? k : 1, kh = q.side === 't' || q.side === 'b' ? k : 1;
      // folding open on its hinge: the edge facing the pads stays put, the far edge swings out (never past its own cell)
      const w = q.w * kw, h = q.h * kh, x = q.side === 'r' ? q.x + q.w - w : q.x, y = q.side === 'b' ? q.y + q.h - h : q.y; if (w < .5 || h < .5) continue;
      ctx.globalAlpha = 1; ctx.drawImage(dk, q.x * dpr, q.y * dpr, q.w * dpr, q.h * dpr, x, y, w, h);
      if (u < 1) { ctx.globalAlpha = .55 * (1 - u); ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h); ctx.globalAlpha = .35 * (1 - u); ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1); } }
    ctx.restore(); ctx.globalAlpha = 1;
    ctx.drawImage(dt2, 0, 0, pw, ph, 0, 0, W, H);
    // the album clock (on the page, not the canvas) comes in as the tiles round it fold out
    if (this.wheelRef.current) { const dC = Math.max(0, (bx0 - (G.clock[0] + G.clock[2] / 2)) / CS), o = smooth(clamp((t - T0 - dC * STEP - DUR * .5) / .25, 0, 1)).toFixed(3); if (this.wheelRef.current.style.opacity !== o) this.wheelRef.current.style.opacity = o; }
  }
  drawDeck(ctx, Ws, Hs, t, dt, TH, live, fo) {
    // on a narrow screen the deck is drawn at its own size and scaled down to fit (see deckScale); W, H and G here are in its own units
    const ds = deckScale(Ws, Hs), W = Ws / ds, H = Hs / ds, dcs = this.dotsCtx; if (ds < 1) { ctx.save(); ctx.scale(ds, ds); if (dcs) { dcs.save(); dcs.scale(ds, ds); } }
    const AC = this.accent(), NEON_C = AC.acc, NEON_M = AC.acc; this.acc = AC;
    const look = this.look, cy = look === 'stark' && (this.props.cyber ?? true), G = deckGeoV(W, H), PM = '#8a8f94', mono = "'JetBrains Mono', monospace", mich = 'Michroma, sans-serif',
      cols = ['#f2f2f0', 'rgb(24,88,224)', 'rgb(232,34,44)', 'rgb(255,196,0)', 'rgb(255,118,18)', 'rgb(22,168,82)', 'rgb(138,64,214)'], names = ['Home', 'Freediving', 'Sound', 'Journal'],
      LAB = ['#f2f2f0', 'rgb(120,166,255)', 'rgb(255,112,108)', 'rgb(255,206,60)'];
    // asm: how built the deck is (its controls); slide: how far it has dropped away below the screen
    const A = this.arr, O = this.out && this.out.k !== 'other' ? this.out : null; let asm = 1, slide = 0;
    if (A) { asm = 1; slide = 0; }
    if (O) { asm = 1 - smooth(clamp(O.t / .45, 0, 1)); slide = easeIO(clamp((O.t - .3) / .8, 0, 1)); }
    this.fK = (this.fK || 0) + ((this.focus ? 1 : 0) - (this.fK || 0)) * Math.min(1, dt * 2.2); const fz = easeIO(clamp(this.fK, 0, 1));
    { const R = this.rootRef.current, ex = R && R.querySelector('[data-full-exit]'), awake = this.focus && (this.scrub || performance.now() - (this.fMove || 0) < 2200);
      // the exit pill stays, faded right down, while the mouse is still
      if (ex && this.acc) { const A = this.acc; if (ex.style.color !== A.accL) { ex.style.color = A.accL; ex.style.borderColor = A.a(.75); ex.style.boxShadow = '0 0 10px ' + A.a(.35); } }
      if (ex) { const o = (!this.focus ? 0 : awake ? 1 : .18).toString(); if (ex.style.opacity !== o) ex.style.opacity = o; const pe = this.focus ? 'auto' : 'none'; if (ex.style.pointerEvents !== pe) ex.style.pointerEvents = pe; }
      if (R) { const c = this.cur, cu = !this.focus || this.fK < .5 ? '' : this.scrub ? CUR_SCRUB : !awake ? 'none' : !c ? '' : this.nearHead(this.fmx) ? CUR_SCRUB : c.paused ? CUR_PLAY : CUR_PAUSE; if (R.style.cursor !== cu) R.style.cursor = cu; } }
    const SY = Math.max(slide, fz) * (H - G.y0 + 24), foFace = fo; fo = 1 - (1 - fo) * asm; this.deckSY = SY * ds; this.placeDeck(ds < 1 ? deckGeo(Ws, Hs) : G, SY * ds);
    if (this.wheelRef.current) { const o = (1 - fo).toFixed(3); if (this.wheelRef.current.style.opacity !== o) this.wheelRef.current.style.opacity = o; }
    const rr = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
    const glow = (c, b) => { if (cy) { ctx.shadowColor = c; ctx.shadowBlur = b; } }, noGlow = () => { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; };
    const c = this.cur, playing = !!c && !c.paused, pos = this.posOf(), u = c ? clamp(pos / c.tr.dur, 0, 1) : 0, kc = c ? KINDS[c.tr.kind].cs : PM, al = this.albums[this.state.album];
    for (let i = 0; i < 8; i++) { const S = this.S[i]; S.k += ((this.padHov === i ? 1 : 0) - S.k) * Math.min(1, dt * 8); }
    ctx.save(); ctx.translate(0, SY); ctx.globalAlpha = 1 - foFace;
    // the body: only its top is on screen, the rest runs on below the edge
    const face = ctx.createLinearGradient(0, G.y0, 0, H); face.addColorStop(0, cy ? '#17121f' : '#1d1d1f'); face.addColorStop(1, cy ? '#0a0910' : '#111112');
    ctx.fillStyle = face; rr(G.x0, G.y0, G.w, H - G.y0 + 40, [18, 18, 0, 0]); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(G.mx0, G.y0, G.mx1 - G.mx0, H - G.y0); ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(G.mx0, G.y0 + 1, 1, H - G.y0); ctx.fillRect(G.mx1 - 1, G.y0 + 1, 1, H - G.y0);
    if (cy) { const sg = ctx.createLinearGradient(G.x0, 0, G.x1, 0); sg.addColorStop(0, NEON_M); sg.addColorStop(1, NEON_C); ctx.strokeStyle = sg; ctx.lineWidth = 1.2; glow(NEON_M, 10);
      ctx.beginPath(); ctx.moveTo(G.x0 + .5, H + 2); ctx.lineTo(G.x0 + .5, G.y0 + 18); ctx.arcTo(G.x0 + .5, G.y0 + .5, G.x0 + 18, G.y0 + .5, 18); ctx.lineTo(G.x1 - 18, G.y0 + .5); ctx.arcTo(G.x1 - .5, G.y0 + .5, G.x1 - .5, G.y0 + 18, 18); ctx.lineTo(G.x1 - .5, H + 2); ctx.stroke(); noGlow(); }
    else { ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; rr(G.x0 + .5, G.y0 + .5, G.w - 1, H - G.y0 + 40, [18, 18, 0, 0]); ctx.stroke(); }
    // with a piece loaded the edge lights up in one of the paper wave's inks, picked at random for each new piece and held for as long as it
    // plays (and while it is paused); a new piece fades it slowly to its own ink. The same hard line as the plain edge, which it fades back to
    // once nothing is loaded
    { const c = this.cur, on = c ? 1 : 0; this.rgbK = (this.rgbK || 0) + (on - (this.rgbK || 0)) * Math.min(1, dt * 3);
      if (c && c.tr.id !== this.rgbTr) { this.rgbTr = c.tr.id; let k; do k = Math.floor(Math.random() * INKS.length); while (k === this.rgbI && INKS.length > 1); this.rgbI = k; if (!this.rgbC || this.rgbK < .05) this.rgbC = INKS[k].slice(); }
      if (this.rgbC && this.rgbI != null) { const tg = INKS[this.rgbI], e = Math.min(1, dt * .9); this.rgbC = this.rgbC.map((v, q) => v + (tg[q] - v) * e); }
      if (this.rgbK > .01 && this.rgbC) { ctx.strokeStyle = 'rgb(' + this.rgbC.map(Math.round).join(',') + ')'; ctx.lineWidth = 1.2; ctx.globalAlpha = (1 - foFace) * this.rgbK;
        ctx.beginPath(); ctx.moveTo(G.x0 + .5, H + 2); ctx.lineTo(G.x0 + .5, G.y0 + 18); ctx.arcTo(G.x0 + .5, G.y0 + .5, G.x0 + 18, G.y0 + .5, 18); ctx.lineTo(G.x1 - 18, G.y0 + .5); ctx.arcTo(G.x1 - .5, G.y0 + .5, G.x1 - .5, G.y0 + 18, 18); ctx.lineTo(G.x1 - .5, H + 2); ctx.stroke();
        ctx.globalAlpha = 1 - foFace; } }
    ctx.globalAlpha = 1 - fo;
    // the jog wheel, a whole circle. It turns with the record while a piece plays and under the hand while dragged;
    // the lit ring round it is how far the piece has got
    if (!this.jog) this.jogA = (this.jogA || 0) + (playing ? dt * TAU * .55 : 0) + (this.arr && t > 3.2 && t < 3.95 ? dt * TAU * 2.4 * (1 - (t - 3.2) / .75) : 0);
    if (this.arr && t > 2.55 && !this.knobSwept) { this.knobSwept = true; this.knobA = this.knobV.map(() => 150); }
    { const [jx, jy, jr] = G.jog;
      const rh = this.rimHov || this.rimDrag; ctx.strokeStyle = rh ? AC.a(.35) : 'rgba(255,255,255,.08)'; ctx.lineWidth = rh ? 5 : 3; if (rh) glow(NEON_C, 8); ctx.beginPath(); ctx.arc(jx, jy, jr + 9, 0, TAU); ctx.stroke(); noGlow();
      // tick marks just outside the rim, like a dial, so it reads as somewhere to click: faint at rest, lit when pointed at
      ctx.strokeStyle = rh ? AC.a(.75) : 'rgba(255,255,255,.16)'; ctx.lineWidth = 1; if (rh) glow(NEON_C, 4);
      ctx.beginPath(); for (let q = 0; q < 48; q++) { const a = q / 48 * TAU, l = q % 12 === 0 ? 5 : q % 6 === 0 ? 3.5 : 2, r0 = jr + 13;
        ctx.moveTo(jx + Math.sin(a) * r0, jy - Math.cos(a) * r0); ctx.lineTo(jx + Math.sin(a) * (r0 + l), jy - Math.cos(a) * (r0 + l)); } ctx.stroke(); noGlow();
      if (c) { ctx.strokeStyle = cy ? NEON_M : 'rgb(255,150,40)'; glow(NEON_M, 10); ctx.beginPath(); ctx.arc(jx, jy, jr + 9, -Math.PI / 2, -Math.PI / 2 + u * TAU); ctx.stroke(); noGlow(); }
      ctx.fillStyle = '#2a2e33'; ctx.beginPath(); ctx.arc(jx, jy, jr, 0, TAU); ctx.fill();
      const rim = ctx.createLinearGradient(jx - jr, jy - jr, jx + jr, jy); rim.addColorStop(0, '#7a828a'); rim.addColorStop(.5, '#2b3036'); rim.addColorStop(1, '#60676e'); ctx.strokeStyle = rim; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(jx, jy, jr - 3, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#0f1113'; ctx.beginPath(); ctx.arc(jx, jy, jr * .86, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.045)'; ctx.lineWidth = 1; for (let q = .34; q < .84; q += .045) { ctx.beginPath(); ctx.arc(jx, jy, jr * q, 0, TAU); ctx.stroke(); }
      ctx.save(); ctx.translate(jx, jy); ctx.rotate(this.jogA || 0); ctx.fillStyle = 'rgba(255,255,255,.05)';
      for (const a of [0, Math.PI]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, jr * .86, a - .3, a + .3); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = '#f2f2f0'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -jr * .5); ctx.lineTo(0, -jr * .82); ctx.stroke(); ctx.lineCap = 'butt'; ctx.restore();
      // the hub is the full-screen key: a raised push button (like play / pause) in a dark well, ringed in cyan, marked FULL over a
      // two-way arrow; it lifts a shade when pointed at and sinks in while pressed
      { const hv = this.btnHov === 'full', dn = this.fullDown && hv, hr = jr * .3, sk = dn ? 1.5 : 0;
        ctx.fillStyle = '#08090b'; ctx.beginPath(); ctx.arc(jx, jy + 1.5, hr + 3, 0, TAU); ctx.fill();
        ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = dn ? 2 : 5; ctx.shadowOffsetY = dn ? 1 : 3; const cap = ctx.createLinearGradient(0, jy - hr, 0, jy + hr); cap.addColorStop(0, hv ? '#4a5159' : '#3d434a'); cap.addColorStop(1, hv ? '#25292e' : '#1c1f23');
        ctx.fillStyle = cap; ctx.beginPath(); ctx.arc(jx, jy + sk, hr, 0, TAU); ctx.fill(); noGlow(); ctx.shadowOffsetY = 0;
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(jx, jy + sk, hr - .5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        ctx.strokeStyle = NEON_C; ctx.lineWidth = 1.8; ctx.globalAlpha = (1 - fo) * (hv ? 1 : .7); glow(NEON_C, hv ? 12 : 5); ctx.beginPath(); ctx.arc(jx, jy + sk, hr - 3, 0, TAU); ctx.stroke(); noGlow();
        const lc = hv ? AC.accL2 : AC.accL, fz = clamp(hr * .26, 7.5, 10.5); ctx.globalAlpha = 1 - fo; ctx.fillStyle = lc; ctx.font = '400 ' + fz.toFixed(1) + 'px ' + mich; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; if (hv) glow(NEON_C, 6);
        // the word and its arrow both run up the diagonal, the arrow a short two-way one under the word
        ctx.save(); ctx.translate(jx, jy + sk); ctx.rotate(-Math.PI / 4); ctx.fillText('FULL', .5, -hr * .13);
        const a = hr * .3, ay = hr * .3, ah = Math.max(2.5, hr * .11); ctx.strokeStyle = lc; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
        ctx.moveTo(-a, ay); ctx.lineTo(a, ay); ctx.moveTo(-a + ah, ay - ah); ctx.lineTo(-a, ay); ctx.lineTo(-a + ah, ay + ah); ctx.moveTo(a - ah, ay - ah); ctx.lineTo(a, ay); ctx.lineTo(a - ah, ay + ah);
        ctx.stroke(); ctx.restore(); noGlow(); ctx.lineCap = 'butt'; ctx.lineJoin = 'miter'; }
      if (c && (this.jog || this.jogHov)) { ctx.strokeStyle = cy ? NEON_C : 'rgba(255,255,255,.35)'; glow(NEON_C, 8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(jx, jy, jr * .88, 0, TAU); ctx.stroke(); noGlow(); } }
    // cue and play / pause, in the left deck's corner
    // a round button with depth: a dark well, the cap raised out of it (lit from above), a coloured ring that glows when on
    const btn = ([bx, by, br], col, lit, hov, icon) => { ctx.globalAlpha = 1 - fo;
      ctx.fillStyle = '#08090b'; ctx.beginPath(); ctx.arc(bx, by + 1.5, br + 3, 0, TAU); ctx.fill();
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3; const cap = ctx.createLinearGradient(0, by - br, 0, by + br); cap.addColorStop(0, hov ? '#4a5159' : '#3d434a'); cap.addColorStop(1, hov ? '#25292e' : '#1c1f23');
      ctx.fillStyle = cap; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill(); noGlow(); ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, by, br - .5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.globalAlpha = (1 - fo) * (lit ? 1 : hov ? .85 : .55); if (lit) glow(col, 12); ctx.beginPath(); ctx.arc(bx, by, br - 3, 0, TAU); ctx.stroke(); noGlow();
      ctx.fillStyle = lit ? col : '#d9dde0'; ctx.globalAlpha = 1 - fo; icon(bx, by); };
    // the same size as the knobs; its icon scales with it
    btn(G.play, 'rgb(40,220,120)', playing, this.btnHov === 'play', (bx, by) => { const q = G.play[2] / 18; if (playing) { ctx.fillRect(bx - 5 * q, by - 6 * q, 3.5 * q, 12 * q); ctx.fillRect(bx + 1.5 * q, by - 6 * q, 3.5 * q, 12 * q); } else { ctx.beginPath(); ctx.moveTo(bx - 4 * q, by - 7 * q); ctx.lineTo(bx + 7 * q, by); ctx.lineTo(bx - 4 * q, by + 7 * q); ctx.closePath(); ctx.fill(); } });
    // a piece of black glass with a fine edge (and scanlines in the cyber style)
    const glass = ([gx, gy, gw, gh], body) => { ctx.globalAlpha = 1 - fo; ctx.fillStyle = cy ? '#04030a' : '#050607'; rr(gx, gy, gw, gh, 5); ctx.fill(); ctx.save(); rr(gx, gy, gw, gh, 5); ctx.clip(); if (body) body(gx, gy, gw, gh);
      if (cy) { ctx.globalAlpha = 1 - fo; ctx.fillStyle = 'rgba(0,0,0,.3)'; for (let q = gy + 1; q < gy + gh; q += 2) ctx.fillRect(gx, q, gw, 1); } ctx.restore(); ctx.globalAlpha = 1 - fo;
      ctx.strokeStyle = cy ? AC.a(.45) : 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; rr(gx + .5, gy + .5, gw - 1, gh - 1, 4.5); ctx.stroke(); };
    // the album clock's tall display: the flip counter (a real element) sits in the middle of it and the album names roll through it
    glass(G.clockScr, (gx, gy, gw, gh) => { ctx.fillStyle = AC.a(.05); ctx.fillRect(gx, gy, gw, gh); // its label, lit like the counter so it reads as the display's title
      ctx.font = '500 9px ' + mich; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = cy ? NEON_M : NEON_C; glow(cy ? NEON_M : NEON_C, 8); ctx.fillText('ALBUM', gx + gw / 2, gy + 12); noGlow(); });
    { const [kx, ky, kw, kh] = G.clock; ctx.fillStyle = '#060708'; rr(kx - 3, ky - 2, kw + 6, kh + 6, 8); ctx.fill(); }
    // the six numbered knobs: a dark well, the numbers 0..9 round it, a raised cap with a pointer that clicks to each number; the number it
    // points at is lit. When the combination is set they all flash once
    { const comboOn = this.knobV.join('') === '523869', comboK = comboOn ? 1 : 0;
      if (!this.knobA) this.knobA = this.knobV.map(() => 0);
      G.knobs.forEach(([kx, ky, kr], i) => { const v = this.knobV[i], rw = this.knobRaw && this.knobRaw[i], tgt = -150 + v * 300 / 9 + (rw != null ? (rw - (-150 + v * 300 / 9)) * .3 : 0); this.knobA[i] += (tgt - this.knobA[i]) * Math.min(1, dt * (this.arr ? 5 : 34));
        const kk = this.knobKick && this.knobKick[i], kA = this.knobA[i] + (kk ? kk.d * 6 * Math.exp(-(t - kk.t) * 24) * Math.cos((t - kk.t) * 60) : 0);
        const hv = this.knobHov === i || this.knobHeld === i, fzk0 = clamp(kr * .48, 5.5, 8), nr = kr + fzk0 * .7 + 1.8, nh = this.knobNum && this.knobNum.i === i ? this.knobNum.q : -1;
        ctx.globalAlpha = 1 - fo; ctx.fillStyle = '#060708'; ctx.beginPath(); ctx.arc(kx, ky + 1.5, kr + 3, 0, TAU); ctx.fill();
        const fzk = fzk0; ctx.font = '500 ' + fzk.toFixed(1) + 'px ' + mono; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        for (let q = 0; q <= 9; q++) { const mq = ctx.measureText(String(q)), dx = (mq.actualBoundingBoxLeft - mq.actualBoundingBoxRight) / 2, dy = (mq.actualBoundingBoxAscent - mq.actualBoundingBoxDescent) / 2; const a = (-150 + q * 300 / 9) * Math.PI / 180, on = q === v, lit = on || comboK > 0, nx = kx + Math.sin(a) * nr, ny = ky - Math.cos(a) * nr;
          // the number under the pointer gets a small ring, so it reads as something to press
          if (q === nh) { ctx.globalAlpha = 1 - fo; ctx.fillStyle = AC.a(.16); ctx.strokeStyle = NEON_C; ctx.lineWidth = 1; glow(NEON_C, 6); ctx.beginPath(); ctx.arc(nx, ny, fzk * .62, 0, TAU); ctx.fill(); ctx.stroke(); noGlow(); }
          ctx.globalAlpha = (1 - fo) * (lit || q === nh ? 1 : .55); ctx.fillStyle = lit ? (comboK > 0 && !on ? AC.a(.4 + .6 * comboK) : NEON_C) : PM; if (on || comboK > 0) glow(NEON_C, 6 + 6 * comboK);
          if (q === nh && !on) ctx.fillStyle = '#ffffff'; ctx.fillText(String(q), nx + dx, ny + dy); noGlow(); }
        ctx.globalAlpha = 1 - fo; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2; const kg = ctx.createLinearGradient(0, ky - kr, 0, ky + kr); kg.addColorStop(0, hv ? '#4c535b' : '#40464d'); kg.addColorStop(1, hv ? '#24282d' : '#1d2024');
        ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(kx, ky, kr, 0, TAU); ctx.fill(); noGlow(); ctx.shadowOffsetY = 0;
        ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(kx, ky, kr - .5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        // fine grip lines round the cap's edge
        ctx.strokeStyle = 'rgba(0,0,0,.35)'; for (let q = 0; q < 24; q++) { const a = q / 24 * TAU + kA * Math.PI / 180; ctx.beginPath(); ctx.moveTo(kx + Math.sin(a) * kr * .82, ky - Math.cos(a) * kr * .82); ctx.lineTo(kx + Math.sin(a) * kr * .97, ky - Math.cos(a) * kr * .97); ctx.stroke(); }
        const pa = kA * Math.PI / 180; ctx.strokeStyle = '#f2f2f0'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(kx + Math.sin(pa) * kr * .25, ky - Math.cos(pa) * kr * .25); ctx.lineTo(kx + Math.sin(pa) * kr * .78, ky - Math.cos(pa) * kr * .78); ctx.stroke(); ctx.lineCap = 'butt'; }); }
    // the album's photo, cropped square, for the screen
    const thumb = (x, y, sz) => { const P = this.photos && al.img && this.photos[al.img]; ctx.fillStyle = '#1b1e22'; ctx.fillRect(x, y, sz, sz);
      if (P && P.c) { const iw = P.c.width, ih = P.c.height, side = Math.min(iw, ih) * .7; ctx.globalAlpha = (1 - fo) * .95; ctx.drawImage(P.c, (iw - side) * (al.imgX ?? 1) * .9, (ih - side) * .3, side, side, x, y, sz, sz); ctx.globalAlpha = 1 - fo; }
      ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, sz - 1, sz - 1); };
    // the main screen: the piece playing (its title, kind and time, a thin line for how far it has got) over the album's pieces, which you pick from
    { const [sx, sy, sw, sh] = G.scr; ctx.fillStyle = cy ? '#04030a' : '#050607'; rr(sx, sy, sw, sh, 5); ctx.fill(); ctx.save(); rr(sx, sy, sw, sh, 5); ctx.clip();
      // the cover and the text beside it sit centred in the strip, sized to its height (it is taller than it used to be)
      const stH = 50 + this.stripEx(G), tsz = stH - 18, tmid = sy + stH / 2, tx = sx + 10 + tsz + 12, fT = G.phone ? 12.5 : 14, fN = G.phone ? 13 : 16, fR = G.phone ? 8.5 : 9.5,
        tbT = tmid - (.72 * fT + fN + 5) / 2 + .72 * fT, tbN = tbT + fN + 5;
      thumb(sx + 10, tmid - tsz / 2, tsz); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      if (c) { ctx.font = '500 ' + fT + 'px ' + mono; ctx.fillStyle = cy ? AC.accL : '#e9edf0'; glow(NEON_C, 6); const ttl = c.tr.title.toUpperCase(), room = sx + sw - tx - SQUID_W * this.sqPx(G) - 24, tw = ctx.measureText(ttl).width;
        ctx.save(); ctx.beginPath(); ctx.rect(tx, tbT - fT, room, fT * 1.5); ctx.clip(); if (tw <= room) ctx.fillText(ttl, tx, tbT); else { const L = tw + 36, o = (t * 28) % L; ctx.fillText(ttl, tx - o, tbT); ctx.fillText(ttl, tx - o + L, tbT); } ctx.restore(); noGlow();
        // the time, under the title: where you are, then what is left (and PAUSED when it is)
        ctx.textAlign = 'left'; ctx.font = '400 ' + fN + 'px ' + mich; ctx.fillStyle = '#f2f2f0'; const tnow = fmtDur(pos) + '.' + (Math.floor(pos * 10) % 10); ctx.fillText(tnow, tx, tbN); const tnw = ctx.measureText(tnow).width;
        ctx.font = '400 ' + fR + 'px ' + mono; ctx.fillStyle = cy ? NEON_M : PM; ctx.fillText('-' + fmtDur(Math.max(0, c.tr.dur - pos)) + (c.paused ? '   PAUSED' : ''), tx + tnw + 10, tbN);
        ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(sx + 10, sy + 50 + this.stripEx(G), sw - 20, 1.5); ctx.fillStyle = cy ? NEON_M : kc; glow(NEON_M, 6); ctx.fillRect(sx + 10, sy + 50 + this.stripEx(G), (sw - 20) * u, 1.5); noGlow(); }
      else { ctx.font = '400 ' + fT + 'px ' + mich; ctx.fillStyle = '#e9edf0'; const room = sx + sw - tx - SQUID_W * this.sqPx(G) - 18; ctx.save(); ctx.beginPath(); ctx.rect(tx, sy, room, 50 + this.stripEx(G)); ctx.clip(); ctx.fillText('STANDBY', tx, tmid + fT * .36); ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(sx + 10, sy + 50 + this.stripEx(G), sw - 20, 1); }
      ctx.textBaseline = 'middle'; ctx.textAlign = 'right'; ctx.font = '400 7.5px ' + mono; ctx.fillStyle = PM; const tot = al.tracks.reduce((a2, q) => a2 + q.dur, 0); ctx.fillText(al.tracks.length + ' PIECES · ' + fmtDur(tot), sx + sw - 12, sy + 59 + this.stripEx(G));
      this.rowsOf(G).forEach(([rx, ry, rw, rh], k) => { const tr = al.tracks[k], on = c && c.tr.id === tr.id, hv = this.rowHov === k, mid = ry + rh / 2;
        if (on || hv) { ctx.fillStyle = on ? (cy ? AC.a(.13) : 'rgba(255,255,255,.09)') : 'rgba(255,255,255,.05)'; ctx.fillRect(rx, ry + .5, rw, rh - 1); }
        if (on) { ctx.fillStyle = cy ? NEON_M : kc; ctx.fillRect(rx, ry + rh - 1.5, rw * u, 1); }
        // the rows share the screen's height, and their type grows with them
        const fz2 = clamp(rh * .34, 9, 12.5); ctx.textAlign = 'left'; ctx.font = '400 ' + fz2.toFixed(1) + 'px ' + mono; ctx.fillStyle = on ? (cy ? AC.accL : '#e9edf0') : PM; ctx.fillText(on ? (c.paused ? '❙❙' : '▶') : pad2(k + 1), rx + 8, mid);
        // the length on the right; the title takes the rest
        ctx.font = '400 ' + (fz2 - .5).toFixed(1) + 'px ' + mono; const gp = 14, wD = ctx.measureText('00:00').width, xDur = rx + rw - 8, tEnd = xDur - wD - gp;
        ctx.textAlign = 'right'; ctx.fillStyle = PM; ctx.fillText(fmtDur(tr.dur), xDur, mid);
        ctx.textAlign = 'left'; ctx.fillStyle = on || hv ? '#f2f2f0' : '#c3c8cc'; ctx.font = '500 ' + (fz2 + .5).toFixed(1) + 'px ' + mono; ctx.save(); ctx.beginPath(); ctx.rect(rx + 32, ry, tEnd - rx - 32, rh); ctx.clip(); ctx.fillText(tr.title.toUpperCase(), rx + 32, mid); ctx.restore(); });
      if (cy) { ctx.fillStyle = 'rgba(0,0,0,.3)'; for (let q = sy + 1; q < sy + sh; q += 2) ctx.fillRect(sx, q, sw, 1); }
      ctx.restore(); ctx.globalAlpha = 1 - fo; ctx.strokeStyle = cy ? AC.a(.45) : 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; rr(sx + .5, sy + .5, sw - 1, sh - 1, 4.5); ctx.stroke();
      // the squid, on the right of the now-playing strip: resting, dancing while a piece plays, or off on a pad's little turn. Its notes and
      // stars take the edge's ink while it is lit
      { const hp = this.padHov, mode = hp != null ? this.kReact : playing ? 'dance' : 'sleep', kp = this.sqPx(G), kw = SQUID_W * kp, sEx = this.stripEx(G), ky = sy + 50 + sEx - SQUID_H * kp - 2;
        // she keeps to one spot at the strip's right end and dances there
        const kx = sx + sw - 12 - kw;
        // the dance: a run of moves picked at random (never one twice running), each a few beats long, and every so often she strikes a pose.
        // The beat only runs while a piece plays
        let dO = {}; if (mode === 'dance') { const bpm = this.kTempo(dt); this.kB = (this.kB || 0) + dt * bpm / 60;
          if (!this.kMv || this.kB >= SQUID_MOVES[this.kMv]) { this.kB = 0; this.kN = (this.kN || 0) + 1; const pool = Object.keys(SQUID_MOVES).filter(m => m !== this.kMv && m !== 'pose');
            // slow music: more of the slow moves (and fewer fast ones); fast music the other way round
            const slow = clamp((105 - bpm) / 30, 0, 1), fast = clamp((bpm - 115) / 25, 0, 1);
            [...pool].forEach(m => { const w = SQUID_SLOW.includes(m) ? 1 + 3 * slow : SQUID_FAST.includes(m) ? 1 + 2 * fast - .8 * slow : 1; for (let q = 1; q < Math.round(w); q++) pool.push(m); if (w < .5) pool.splice(pool.indexOf(m), 1); });
            this.kMv = this.kN % 7 === 0 ? 'pose' : pool[Math.floor(Math.random() * pool.length)]; }
          dO = { move: this.kMv, mp: this.kB }; }
        const ink = this.rimCol() || (hp != null ? (hp < 4 ? LAB[hp] : hp < 7 ? cols[hp] : '#ffd84a') : '#ffd84a');
        const P = squid(mode, t, { tau: t - (this.kAt ?? t), lv: clamp(this.live || 0, 0, 1), ink, ...dO });
        // drawn in square pixels, each cell's edges rounded to whole screen pixels so no seams show between them
        ctx.save(); ctx.beginPath(); ctx.rect(sx + 2, sy + 2, sw - 4, 48 + sEx); ctx.clip(); ctx.globalAlpha = 1 - fo;
        squidCells(P, t).forEach(([q, r, col]) => { const x0 = Math.round(kx + q * kp), y0 = Math.round(ky + r * kp); ctx.fillStyle = col; ctx.fillRect(x0, y0, Math.round(kx + (q + 1) * kp) - x0, Math.round(ky + (r + 1) * kp) - y0); });
        ctx.restore(); ctx.globalAlpha = 1 - fo; } }
    // the volume fader, standing beside the screen
    { const V = G.vol, lo = G.lo, hi = G.hi; this.volHold = clamp(this.volHold ?? lo, lo, hi); this.volY = this.volY == null ? this.volHold : this.volY + (this.volHold - this.volY) * Math.min(1, dt * (this.volDrag ? 30 : 10));
      ctx.font = '500 7.5px ' + mono; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = PM; ctx.fillText('VOL', V.x, V.y0 - 12);
      ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(V.x - 3, V.y0, 6, V.y1 - V.y0, 3); ctx.fill(); ctx.globalAlpha = (1 - fo) * .35; ctx.fillStyle = PM; for (let q = 0; q <= 6; q++) ctx.fillRect(V.x - 11, lo + (hi - lo) * q / 6, q % 3 ? 2 : 4, 1);
      const VC = NEON_C; ctx.globalAlpha = (1 - fo) * .85; ctx.fillStyle = VC; glow(VC, 6); ctx.fillRect(V.x - 1, this.volY, 2, V.y1 - this.volY); noGlow();
      const cg = ctx.createLinearGradient(0, this.volY - 10, 0, this.volY + 10); cg.addColorStop(0, '#59626b'); cg.addColorStop(.5, '#3a4249'); cg.addColorStop(1, '#262c31');
      ctx.globalAlpha = 1 - fo; ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3; ctx.fillStyle = cg; ctx.fillRect(V.x - 10, this.volY - 10, 20, 20); noGlow(); ctx.shadowOffsetY = 0;
      ctx.fillStyle = VC; glow(VC, 8); ctx.fillRect(V.x - 9, this.volY - 1, 18, 2); noGlow();
      this.volume = clamp(1 - (this.volHold - lo) / (hi - lo), 0, 1); }
    // the beat pads, square, all the same rubbery grey, a shade lighter than the deck so they stand off it, each outlined and labelled in its
    // page's colour: Sound's glows (this page), the others glow under the pointer, the three to come are dimmer, the spare is blank. Each one
    // stands up out of a dark well with a lit top edge. A pad flashes as its dot lands in it
    const flash = i => A ? Math.sin(Math.PI * clamp((t - 1.4 - i * .06) / .7, 0, 1)) : 0;
    ctx.font = '400 ' + clamp(G.pads[0][2] / 9.5, 6, 8.5).toFixed(1) + 'px ' + mich; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [...G.pads, ...G.cpads, G.spare].forEach(([px, py, pw, ph], i) => { const spare = i === 7, soon = i > 3 && !spare, col = spare ? AC.acc : cols[i], k = clamp(this.S[i].k, 0, 1);
      const lit = spare ? clamp(Math.max(k * .15, this.spareAt != null ? Math.exp(-Math.max(0, performance.now() / 1000 - this.spareAt) * 7) : 0), 0, 1) : clamp(Math.max(i === 2 ? 1 : 0, k, flash(i)), 0, 1);
      ctx.globalAlpha = 1 - fo; ctx.fillStyle = '#060708'; rr(px - 2, py - 1, pw + 4, ph + 5, 8); ctx.fill();
      ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3; const pg = ctx.createLinearGradient(0, py, 0, py + ph); pg.addColorStop(0, '#3a3f46'); pg.addColorStop(.55, '#2c3036'); pg.addColorStop(1, '#23262b');
      ctx.fillStyle = pg; rr(px, py, pw, ph, 7); ctx.fill(); noGlow(); ctx.shadowOffsetY = 0;
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(px + 6, py + 1.5, pw - 12, 1); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(px + 6, py + ph - 2.5, pw - 12, 1);
      if (lit > .02) { ctx.globalAlpha = (1 - fo) * (spare ? .7 : .18) * lit; ctx.fillStyle = col; if (spare) glow(col, 22 * lit); rr(px + 2, py + 2, pw - 4, ph - 4, 6); ctx.fill(); }
      ctx.globalAlpha = (1 - fo) * (spare ? .3 + .7 * lit : soon ? .55 + .45 * k : .7 + .3 * lit); ctx.strokeStyle = col; ctx.lineWidth = 1.6 + lit * .6; if (lit > .2) glow(col, 14 * lit); rr(px + 1.5, py + 1.5, pw - 3, ph - 3, 6); ctx.stroke(); noGlow();
      if (!spare) { ctx.globalAlpha = (1 - fo) * (soon ? .75 + .25 * k : .85 + .15 * lit); ctx.fillStyle = i < 4 ? LAB[i] : col;
        // the label shrinks to fit its pad; Freediving, if it still won't fit, breaks over two lines (FREE / DIVING)
        const lab = soon ? 'SOON' : names[i].toUpperCase(); let fz = clamp(pw / 9.5, 6, 9); ctx.font = '400 ' + fz + 'px ' + mich; while (ctx.measureText(lab).width > pw - 10 && fz > (lab === 'FREEDIVING' ? 5.6 : 4.8)) { fz -= .25; ctx.font = '400 ' + fz + 'px ' + mich; }
        if (ctx.measureText(lab).width > pw - 10 && lab === 'FREEDIVING') { const h2 = 4; fz = clamp(pw / 7.5, 6, 9); ctx.font = '400 ' + fz + 'px ' + mich; ctx.fillText(lab.slice(0, h2), px + pw / 2, py + ph / 2 - fz * .7); ctx.fillText(lab.slice(h2), px + pw / 2, py + ph / 2 + fz * .75); }
        else ctx.fillText(lab, px + pw / 2, py + ph / 2 + .5); noGlow(); }
      ctx.globalAlpha = 1 - fo; });
    ctx.restore(); ctx.font = '400 11px Michroma, sans-serif';
    // arriving / leaving, each page is a dot: arriving, the dots fly in from where the last page left them and open out into their beat pads;
    // leaving, the pads close back into dots, which the next page picks up
    const OFF = { home: 26, freediving: 78, sound: 130, journal: 182, c4: 224, c5: 256, c6: 288 };
    const bz = (P0, P1, C1, C2, u2) => { const a = (1 - u2) ** 3, b = 3 * (1 - u2) ** 2 * u2, c2 = 3 * (1 - u2) * u2 * u2, d = u2 ** 3; return [a * P0[0] + b * C1[0] + c2 * C2[0] + d * P1[0], a * P0[1] + b * C1[1] + c2 * C2[1] + d * P1[1]]; };
    this.dotPos = {};
    const dc = this.dotsCtx || ctx;
    if (A && t < 2.85 || O) for (let i = 0; i < 7; i++) { const k = DECK_KEYS[i], cap = padOf(G, k), pd = i < 4 ? G.pads[i] : G.cpads[i - 4]; let p = cap, a = 1;
      const fm = A ? smooth(clamp((t - DOT_OPEN.t0 - i * DOT_OPEN.step) / DOT_OPEN.dur, 0, 1)) : asm;
      if (A) { const f0 = A.nf[k] || (k === 'home' && A.nf.ink), f2 = f0 && [f0[0] / ds, f0[1] / ds]; if (f2) { const u = clamp((t - .2 - i * .07) / .9, 0, 1), ub = t - (1.1 + i * .07); p = [f2[0] + (cap[0] - f2[0]) * easeIO(u), f2[1] + (cap[1] - f2[1]) * u * u - (ub > 0 && ub < .3 ? Math.sin(ub / .3 * Math.PI) * 7 : 0)]; } else a *= smooth(clamp((t - .6) / .5, 0, 1)); }
      this.dotPos[k] = [p[0] * ds, p[1] * ds]; a *= A ? 1 - smooth(clamp((t - 2.45) / .35, 0, 1)) : 1 - .9 * fm * fm; if (a <= .01) continue;
      const pp = A ? fm : 1 - slide, c0 = i === 0 ? 'rgb(' + [20, 20, 20].map((v, q) => Math.round(v + ([242, 242, 240][q] - v) * pp)).join(',') + ')' : cols[i];
      const r0 = i < 4 ? 8 : 5.5, dw = 2 * r0 + (pd[2] - 2 * r0) * fm, dh = 2 * r0 + (pd[3] - 2 * r0) * fm, rad = r0 + (6 - r0) * fm;
      dc.globalAlpha = a; dc.fillStyle = c0; if (fm > 0 && cy) { dc.shadowColor = c0; dc.shadowBlur = 10 * fm; }
      dc.beginPath(); if (fm <= 0) dc.arc(p[0], p[1], r0, 0, TAU); else if (dc.roundRect) dc.roundRect(p[0] - dw / 2, p[1] - dh / 2, dw, dh, rad); else dc.rect(p[0] - dw / 2, p[1] - dh / 2, dw, dh); dc.fill(); dc.shadowBlur = 0; dc.shadowColor = 'transparent'; }
    dc.globalAlpha = 1; ctx.globalAlpha = 1; ctx.lineJoin = 'round';
    if (ds < 1) { ctx.restore(); if (dcs) dcs.restore(); } }
  // ---- layout
  // the wave lies flat across the middle of the page and opens up and down while a piece plays
  geom(W, H) { const t0 = deckGeo(W, H).y0 - 8, fz = easeIO(clamp(this.fK || 0, 0, 1)), top = t0 + (H - t0) * fz, m = clamp(W * .05, 26, 56), amp = Math.min(top * .32, 260); return { m, amp, yB: Math.round(top / 2) }; }
  segsOf(ai, W, m) { const tr = this.albums[ai].tracks, gap = W < 700 ? 16 : 28, avail = W - m - 140 - gap * (tr.length - 1), wt = tr.map(t => Math.pow(t.dur, .6)), sw = wt.reduce((a, b) => a + b, 0); let x = m;
    return tr.map((t, k) => { const w = avail * wt[k] / sw, s = { tr: t, x0: x, x1: x + w }; x += w + gap; return s; }); }
  // the many style's pieces: for every column, FK slots above the baseline and FK below, each its own shape, size, tilt, colour and depth
  frags(n) { if (this.F && this.F.n === n) return this.F; const T = n * FK * 2, r = rng(99), F = { n, dx: new Float32Array(T), sz: new Float32Array(T), rot: new Float32Array(T), sh: new Uint8Array(T), pal: new Uint8Array(T), ck: new Float32Array(T), z: new Uint8Array(T), dy: new Float32Array(T) };
    for (let f = 0; f < T; f++) { F.dx[f] = (r() - .5) * 7; F.sz[f] = 2.5 + r() * 5.5; F.rot[f] = r() * TAU; F.sh[f] = Math.floor(r() * 5); F.pal[f] = Math.floor(r() * PAL.length); F.ck[f] = r(); F.z[f] = Math.floor(r() * 3); F.dy[f] = (r() - .5) * 3; }
    return (this.F = F); }
  drawFrag(ctx, dpr, sh, px, py, rot, sz) { const c = Math.cos(rot), s = Math.sin(rot); ctx.setTransform(dpr * c, dpr * s, -dpr * s, dpr * c, dpr * px, dpr * py);
    if (sh === 0) ctx.fillRect(-sz / 2, -sz * .3, sz, sz * .6);
    else if (sh === 1) { ctx.beginPath(); ctx.arc(0, 0, sz * .45, 0, TAU); ctx.fill(); }
    else if (sh === 2) { ctx.beginPath(); ctx.moveTo(0, -sz * .55); ctx.lineTo(sz * .5, sz * .4); ctx.lineTo(-sz * .5, sz * .4); ctx.closePath(); ctx.fill(); }
    else if (sh === 3) ctx.fillRect(-sz, -.7, sz * 2, 1.4);
    else { ctx.beginPath(); ctx.arc(0, 0, sz * .42, 0, TAU); ctx.lineWidth = 1.1; ctx.stroke(); } }
  draw(dt) {
    const cv = this.canvasRef.current; if (!cv) return;
    const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio || 1), look = this.look, TH = THEMES[look];
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); this.grainP = null; }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
    const t = this.t, fo = this.out ? smooth(clamp(this.out.t / .45, 0, 1)) : 0, { m, amp, yB } = this.geom(W, H), Wv = W, cyber = look === 'stark' && (this.props.cyber ?? true);
    const al = this.albums[this.state.album], c = this.cur, pos = this.posOf(), segs = this.strip ? this.segsOf(this.state.album, W, m) : null, hov = this.state.hover, hovTr = hov ? this.trById(hov) : null;
    let playX = null;
    if (c) { const u = pos / c.tr.dur; if (!this.strip) playX = u * Wv; else { const sg = segs.find(q => q.tr.id === c.tr.id); if (sg) playX = sg.x0 + u * (sg.x1 - sg.x0); } }
    const live = c && !c.paused ? this.live : 0, D = this.dotOf(PAGE) || [W - 160, 28];
    // ground
    if (look === 'haze') {
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1f252b'); gr.addColorStop(.55, '#3a434b'); gr.addColorStop(1, '#5f6a73'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'screen';
      [[.2, .32, .42, '226,204,192', .2], [.8, .2, .34, '196,212,228', .18], [.55, .82, .5, '214,222,232', .16]].forEach(([bx, by, br, rgb, a], k) => { const x = (bx + .05 * Math.sin(t * .07 + k * 2)) * W, y = (by + .04 * Math.cos(t * .05 + k)) * H, rr = br * Math.max(W, H), g = ctx.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); });
      ctx.globalCompositeOperation = 'source-over';
    } else if (look === 'stark') {
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#eaeae7'); gr.addColorStop(1, '#d0d1ce'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      const vg = ctx.createRadialGradient(W * .42, H * .45, Math.min(W, H) * .2, W * .42, H * .45, Math.max(W, H) * .8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.12)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      if (!this.grainP) this.grainP = ctx.createPattern(this.grainC, 'repeat'); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = TH.grain; ctx.fillStyle = this.grainP; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    } else { ctx.fillStyle = TH.bg; ctx.fillRect(0, 0, W, H); }
    // stark: each album's photo, full height, multiplied into the grey so its white ground disappears and only the darks show; crossfades between albums
    if (look === 'stark') { const ph = this.photos || (this.photos = {}), pr = Math.min(dpr, 1.5), tn = this.tuneAt(t), pa = (this.props.photo ?? .9) * (this.arr ? (tn ? tn.sig : t < 1.6 ? 0 : 1) : smooth(clamp((t - .2) / 1.2, 0, 1))) * (1 - fo) * (1 - easeIO(clamp(this.fK || 0, 0, 1)));
      this.albums.forEach((a, ai) => { if (!a.img) return; let P = ph[a.img]; if (!P) { P = ph[a.img] = { im: new Image(), k: 0 }; P.im.src = a.img; }
        const ok = P.im.complete && P.im.naturalWidth > 0; P.k += ((ai === this.state.album && ok ? 1 : 0) - P.k) * Math.min(1, dt * 2.4); if (P.k < .004 || !ok) return;
        // full height, pushed right against the panel; imgY lifts it so the subject sits in the open top right, above the track list
        const ih = H, iw = Math.round(ih * P.im.naturalWidth / P.im.naturalHeight), iy = Math.round((a.imgY ?? 0) * H), ix = Math.round((a.imgX ?? 1) * (Wv - iw));
        if (!P.c || P.key !== ih + 'x' + pr + 'cm' + !!a.imgFlip + !!a.imgMirror) { P.key = ih + 'x' + pr + 'cm' + !!a.imgFlip + !!a.imgMirror; P.c = document.createElement('canvas'); P.c.width = Math.round(iw * pr); P.c.height = Math.round(ih * pr); const px = P.c.getContext('2d');
          if (a.imgFlip) { px.translate(0, P.c.height); px.scale(1, -1); } if (a.imgMirror) { px.translate(P.c.width, 0); px.scale(-1, 1); } px.drawImage(P.im, 0, 0, P.c.width, P.c.height); px.setTransform(1, 0, 0, 1, 0, 0);
          // soften every edge into white so the photo has no frame
          const cw = P.c.width, chh = P.c.height, fx = cw * .2, fy = chh * .08;
          [[0, 0, fx, 0, 0, 0, fx, chh], [cw, 0, cw - fx, 0, cw - fx, 0, fx, chh], [0, 0, 0, fy, 0, 0, cw, fy], [0, chh, 0, chh - fy, 0, chh - fy, cw, fy]].forEach(([x0, y0, x1, y1, rx, ry, rw, rh]) => { const gg = px.createLinearGradient(x0, y0, x1, y1); gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); px.fillStyle = gg; px.fillRect(rx, ry, rw, rh); });
          // tinted copies for the cyberpunk colour split: green+blue lifted (darks print cyan), red+blue lifted (darks print magenta)
          const tint = rgb => { const t2 = document.createElement('canvas'); t2.width = cw; t2.height = chh; const tx = t2.getContext('2d'); tx.drawImage(P.c, 0, 0); tx.globalCompositeOperation = 'lighter'; tx.fillStyle = rgb; tx.fillRect(0, 0, cw, chh); return t2; }; P.cC = tint('rgb(0,255,255)'); P.cM = tint('rgb(255,0,255)'); }
        const al = pa * smooth(P.k); ctx.globalCompositeOperation = 'multiply';
        if (cyber) { const gl = Math.max(this.flipT0 != null ? clamp(1 - (t - this.flipT0) / .5, 0, 1) : 0, tn ? (1 - tn.sig) * smooth(clamp(tn.u / .1, 0, 1)) : 0), jx = 3 + gl * (8 + 12 * Math.random()), jy = gl * (Math.random() - .5) * 8;
          ctx.globalAlpha = al * .75; ctx.drawImage(P.cC, ix - jx, iy + jy, iw, ih); ctx.drawImage(P.cM, ix + jx, iy - jy, iw, ih);
          if (gl > 0) { ctx.globalAlpha = al; for (let q = 0; q < 5; q++) { const sy = Math.random() * ih, sh = 4 + Math.random() * 34, sx = (Math.random() - .5) * 60 * gl, k2 = P.c.height / ih; ctx.drawImage(P.c, 0, sy * k2, P.c.width, sh * k2, ix + sx, iy + sy, iw, sh); } } }
        ctx.globalAlpha = al; ctx.drawImage(P.c, ix, iy, iw, ih); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; });
      // static while tuning in: grain that thins out as the signal locks on
      if (tn && tn.u > 0) { const sa = .5 * (1 - tn.sig) * smooth(clamp(tn.u / .12, 0, 1)); if (sa > .01) {
        if (!this.staticC) { const c2 = document.createElement('canvas'); c2.width = c2.height = 160; const x2 = c2.getContext('2d'), im = x2.createImageData(160, 160); for (let q = 0; q < im.data.length; q += 4) { const v = Math.random() < .5 ? 20 : 235; im.data[q] = im.data[q + 1] = im.data[q + 2] = v; im.data[q + 3] = Math.random() * 255; } x2.putImageData(im, 0, 0); this.staticP = ctx.createPattern(c2, 'repeat'); this.staticC = c2; }
        ctx.save(); ctx.globalAlpha = sa; ctx.translate(Math.random() * 160, Math.random() * 160); ctx.fillStyle = this.staticP; ctx.fillRect(-160, -160, this.wvOf() + 160, H + 160); ctx.restore(); } }
      // fine scanlines over the ground and photo
      if (cyber) { if (!this.scanP) { const sc = document.createElement('canvas'); sc.width = 1; sc.height = 3; const sx = sc.getContext('2d'); sx.fillStyle = 'rgba(0,0,0,.05)'; sx.fillRect(0, 0, 1, 1); this.scanP = ctx.createPattern(sc, 'repeat'); } ctx.globalAlpha = 1 - fo; ctx.fillStyle = this.scanP; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; } }
    // a soft light of the playing piece's colour round the playhead
    if (playX != null && look !== 'stark') { const rr = amp * 1.6, g = ctx.createRadialGradient(playX, yB, 0, playX, yB, rr), k = KINDS[c.tr.kind], col = (look === 'haze' ? k.tint : k.cs).slice(4, -1); g.addColorStop(0, 'rgba(' + col + ',' + (.1 + .16 * live) * (1 - fo) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(playX - rr, yB - rr, rr * 2, rr * 2); ctx.globalCompositeOperation = 'source-over'; }
    // arrival. many: the red dot breaks into pieces that fly down and build the wave, left to right. haze: the red dot blooms into a soft light
    // that sinks to the baseline and cools, and the lines form out of it from the middle outwards
    const arrD = this.arr ? .9 : 0, introDone = t > 3.4 + arrD, eqRise = x => { const h = (((Math.floor(x / 10) + 7) * 2654435761) >>> 0) % 1000 / 1000, k = clamp((t - 1.75 - h * .45) / .32, 0, 1); return k <= 0 ? 0 : k >= 1 ? 1 : 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2; }, introG = this.arr ? (x => introDone ? 1 : eqRise(x)) : look === 'many' ? (x => introDone ? 1 : smooth(clamp((t - arrD - (1.0 + .9 * x / W)) / .45, 0, 1))) : (x => introDone ? 1 : smooth(clamp((t - arrD - .3 - 1.1 * Math.abs(x / W - .5)) / .8, 0, 1)));
    // targets for each column: height, strength and which kind of piece it belongs to
    const pieces = look === 'many' || (look === 'stark' && (this.props.wave ?? 'pieces') === 'pieces'), g = pieces ? (W < 600 ? 8 : 10) : (W < 600 ? 3 : 4), n = Math.ceil(W / g);
    if (!this.disp || this.disp.length !== n) { this.disp = new Float32Array(n); this.alp = new Float32Array(n); this.colK = new Array(n).fill(null); }
    const kE = 1 - Math.exp(-dt * 6);
    for (let i = 0; i < n; i++) { const x = i * g + g / 2; let env = 0, kk = null, a = .3;
      // resting: flat; hovering a piece lifts it a little; playing (or paused): the piece's full wave, and nothing else
      if (!this.strip) { if (c) { env = envAt(c.tr.env, Math.min(1, x / Wv)); kk = c.tr.kind; a = x <= playX ? 1 : .22; } else if (hovTr) { env = envAt(hovTr.env, x / Wv) * .14; kk = hovTr.kind; a = .62; } else kk = kindAt(al.tracks, Math.min(1, x / Wv)); }
      else { const sg = segs.find(q => x >= q.x0 && x <= q.x1); if (sg) { const id = sg.tr.id, e0 = envAt(sg.tr.env, (x - sg.x0) / (sg.x1 - sg.x0)); kk = sg.tr.kind; if (c && c.tr.id === id) { env = e0; a = x <= playX ? 1 : .22; } else if (c) a = 0; else if (hov === id) { env = e0 * .14; a = .66; } else a = .36; } else if (c) a = 0; }
      // changes sweep in from the left
      const k = Math.min(1, kE * (.6 + .8 * (1 - i / n)));
      this.disp[i] += (env - this.disp[i]) * k; this.alp[i] += (a - this.alp[i]) * k; if (kk) this.colK[i] = kk; }
    if (pieces) {
      const F = this.frags(n), step = amp / FK, par = this.mx * 5, jit = look === 'stark' ? .45 : 1;
      // the played part of the wave dances with the music: each column follows its own band of the spectrum, strongest just behind the playhead
      let spec = null; if (playX != null && live && this.an) { if (!this.fBuf) this.fBuf = new Uint8Array(this.an.frequencyBinCount); this.an.getByteFrequencyData(this.fBuf); spec = this.fBuf; }
      if (!this.sp || this.sp.length !== n) this.sp = new Float32Array(n);
      // scrub aids. settle: while the playhead is dragged the pieces gather into neat lines (all of them, or only round the pointer for lens);
      // ghost: faint lines always under the pieces; contour: a fine outline round the wave
      const sm = this.props.settle ?? 'lens', ghost = this.props.ghost ?? false, contour = this.props.contour ?? false;
      // (scrubbing now happens on the deck: a drag on the jog or round its rim lines the pieces up round the playhead)
      const scr = this.scrub || ((this.jogScr || this.rimDrag) && playX != null ? { x: playX } : null);
      this.stl = (this.stl || 0) + ((scr && sm !== 'off' ? 1 : 0) - (this.stl || 0)) * Math.min(1, dt * 9); if (scr) this.lensX = scr.x;
      if (!this.hhA || this.hhA.length !== n) this.hhA = new Float32Array(n); this.hhA.fill(-1);
      for (let i = 0; i < n; i++) { const x = i * g + g / 2, ig = introG(x); if (ig <= 0) continue;
        const b = spec && x <= playX ? spec[2 + (i * 37) % 140] / 255 * Math.exp(-(playX - x) / (W * .3)) : 0; this.sp[i] += (b - this.sp[i]) * .45;
        const hh = this.disp[i] * amp * (.92 + .08 * Math.sin(t * 1.3 + i * .37)) * ig * (1 + 1.2 * this.sp[i]), kc = this.colK[i] ? KINDS[this.colK[i]].cs : TH.neutral, e = playX != null && live ? live * Math.exp(-(((x - playX) / 52) ** 2)) : 0;
        const sk = sm === 'lens' ? this.stl * Math.exp(-(((x - (this.lensX ?? -1e4)) / 110) ** 2)) : this.stl; this.hhA[i] = hh;
        if (ghost || sk > .01) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = kc; ctx.globalAlpha = this.alp[i] * (1 - fo) * Math.max(ghost ? .22 : 0, sk); const lw = 1 + sk; ctx.fillRect(x - lw / 2, yB - Math.max(.6, hh), lw, Math.max(1.2, hh * 2)); }
        for (let h = 0; h < 2; h++) for (let j = 0; j < FK; j++) { const off = (j + .5) * step; if (off > hh + step * .5) break;
          const f = (i * FK + j) * 2 + h, sd = h ? 1 : -1, z = F.z[f], lastF = j ? clamp((hh - off) / step + .5, 0, 1) : 1;
          let px = x + F.dx[f] * jit + par * (z - 1), py = yB + sd * (off + F.dy[f]), rot = F.rot[f] + Math.sin(t * .5 + f) * .08;
          if (e) { py += sd * e * (6 + off * .4); rot += e * 2.4 * (f % 2 ? 1 : -1); px += e * F.dx[f] * 2; }
          if (sk > .01) { px += (x - px) * sk; py += (yB + sd * off - py) * sk; rot *= 1 - sk; }
          ctx.globalAlpha = this.alp[i] * (.5 + .25 * z) * lastF * (1 - fo) * (1 - .85 * sk); const col = F.ck[f] < .62 ? kc : look === 'stark' && F.pal[f] === 7 ? TH.ink : PAL[F.pal[f]]; ctx.fillStyle = col; ctx.strokeStyle = col;
          this.drawFrag(ctx, dpr, F.sh[f], px, py, rot, F.sz[f] * (.7 + .2 * z)); } }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (contour) { ctx.globalAlpha = .85 * (1 - fo); ctx.strokeStyle = TH.ink; ctx.lineWidth = 1; ctx.lineJoin = 'round';
        for (const sd of [-1, 1]) { ctx.beginPath(); let on = false; for (let i = 0; i < n; i++) { const hv = this.hhA[i]; if (hv < 0) { on = false; continue; } const x = i * g + g / 2, y = yB + sd * Math.max(.5, hv); if (on) ctx.lineTo(x, y); else { ctx.moveTo(x, y); on = true; } } ctx.stroke(); } }
      // the red dot's pieces in flight
      if (!introDone && look === 'many') { const rr = rng(5); ctx.fillStyle = 'rgb(' + COL.join(',') + ')'; ctx.strokeStyle = ctx.fillStyle;
        for (let k = 0; k < 130; k++) { const tx = (k + .5) / 130 * W, r1 = rr(), r2 = rr(), r3 = rr(), t0 = .25 + .9 * tx / W * .8 + r1 * .18, u = clamp((t - t0) / (.75 + r2 * .2), 0, 1); if (u <= 0 || u >= 1) continue;
          const ee = easeIO(u), C1 = [D[0] - 80 - r2 * 260, D[1] + 60 + r3 * 220], E = [tx, yB + (r3 - .5) * 6], q = 1 - ee, px = q * q * D[0] + 2 * q * ee * C1[0] + ee * ee * E[0], py = q * q * D[1] + 2 * q * ee * C1[1] + ee * ee * E[1];
          ctx.globalAlpha = (1 - smooth(clamp((u - .82) / .18, 0, 1))) * (1 - fo); this.drawFrag(ctx, dpr, Math.floor(r1 * 5), px, py, r2 * TAU + u * 6, 3 + r3 * 5); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    } else {
      // haze: the lines are drawn to their own layer, then laid over the ground twice, blurred for the glow and sharp on top
      const lc = this.lc; if (lc.width !== cv.width || lc.height !== cv.height) { lc.width = cv.width; lc.height = cv.height; }
      const lx = lc.getContext('2d'); lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, lc.width, lc.height); lx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let i = 0; i < n; i++) { const x = i * g + g / 2, ig = introG(x); if (ig <= 0) continue;
        let hh = this.disp[i] * amp * (.9 + .1 * Math.sin(t * 1.7 + i * .23)) * ig;
        if (playX != null && live) { const d = (x - playX) / 46; hh *= 1 + .7 * live * Math.exp(-d * d) * (.75 + .25 * Math.sin(t * 23 + i)); }
        hh = Math.max(.6, hh); lx.globalAlpha = this.alp[i]; lx.fillStyle = this.colK[i] ? KINDS[this.colK[i]][look === 'stark' ? 'cs' : 'tint'] : TH.neutral; lx.fillRect(x - .5, yB - hh, 1, hh * 2); }
      if (playX != null) { lx.globalAlpha = .95; lx.fillStyle = this.rimCol(playX) || (cyber ? NEON_M : look === 'stark' ? TH.ink : '#ffffff'); lx.fillRect(Math.round(playX) - .5, 0, 1, H); }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = look === 'stark' ? 'multiply' : 'screen';
      if ('filter' in ctx) { ctx.filter = 'blur(' + Math.round((look === 'stark' ? 4 : 7) * dpr) + 'px)'; ctx.globalAlpha = (look === 'stark' ? .3 : .85) * (1 - fo); ctx.drawImage(lc, 0, 0); ctx.filter = 'none'; }
      ctx.globalAlpha = 1 - fo; ctx.drawImage(lc, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // playhead (many draws it here; haze has it in the glowing layer) and the time beside it
    if (playX != null) { if (pieces) { ctx.globalAlpha = .9 * (1 - fo); const rc = this.rimCol(playX); if (cyber || rc) { ctx.fillStyle = rc || NEON_M; ctx.shadowColor = rc || NEON_M; ctx.shadowBlur = 12; ctx.fillRect(Math.round(playX) - .75, 0, 1.5, H); ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; } else { ctx.fillStyle = TH.ink; ctx.fillRect(Math.round(playX) - .5, 0, 1, H); } }
    }
    // scrub marker: a line where the pointer would jump to, with that time under it
    // while a piece plays, everything but its wave fades out
    this.pf += (((c && !c.paused) ? 1 : 0) - this.pf) * Math.min(1, dt * 2.5); 
    // handing over to / from Home and Freediving: their paper ground comes in under the panel
    const pap = this.arr ? 1 - smooth(clamp((t - .2) / 1, 0, 1)) : this.out && this.out.k !== 'other' ? smooth(clamp((this.out.t - .25) / .7, 0, 1)) : 0;
    if (pap > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = pap; ctx.fillStyle = '#f5f3ee'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    this.deckOut(ctx, W, H, t, dt, TH, live, this.out && this.out.k !== 'other' ? 0 : fo);
    const ta = (this.arr ? (t >= 1.7 ? 1 : 0) : smooth(clamp((t - 1.4) / .8, 0, 1))) * (1 - fo), el = this.contentRef.current;
    if (el) { el.style.opacity = (ta * (1 - this.pf)).toFixed(3); el.style.pointerEvents = this.pf > .5 ? 'none' : ''; el.style.transform = 'translateY(' + ((1 - ta) * (this.arr ? 0 : 8)).toFixed(1) + 'px)'; this.typeIn(t); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  // arriving: the album's labels and tracks type in, a character at a time, like a mixer readout; the album rail flickers on with the signal
  typeIn(t) { if (this.typed) return; const sec = this.contentRef.current && this.contentRef.current.querySelectorAll('section')[this.state.album], rail = this.wheelRef.current; if (!sec) return;
    const els = [];
    if (this.arr) { const h2 = sec.querySelector('h2'), meta = h2 && h2.parentElement.querySelector('p'); if (meta) els.push([meta, .15]); if (h2) els.push([h2, .35]); sec.querySelectorAll('ol > li').forEach((li, i) => els.push([li, .6 + i * .12])); }
    const u = t - 1.7, done = !this.arr || u > 2.2;
    els.forEach(([e, d]) => { const n = Math.max(4, (e.textContent || '').trim().length), k = clamp((u - d) / clamp(n * .028, .25, .7), 0, 1), kq = Math.floor(k * n) / n; e.style.clipPath = done || k >= 1 ? '' : 'inset(0 ' + ((1 - kq) * 100).toFixed(2) + '% 0 0)'; });
    if (rail) { const tn = this.tuneAt(t); rail.style.opacity = done || !tn ? '' : (tn.sig > .35 && Math.random() > .15 * (1 - tn.sig) ? 1 : .15).toString(); }
    if (done) { this.typed = true; if (rail) rail.style.opacity = ''; } }
  renderVals() {
    const { W, H, album, playing, paused } = this.state, G = this.geom(W, H), n = this.albums.length;
    const trV = tr => { const k = KINDS[tr.kind], cur = playing === tr.id; return { mark: cur ? (paused ? '❙❙' : '▶') : pad2(tr.ti + 1), title: tr.title, kind: k.label, col: this.look === 'stark' ? THEMES.stark.ink : k.cs, date: fmtDate(tr.date), dur: fmtDur(tr.dur), state: cur ? (paused ? 'Paused' : 'Playing') : 'Play',
      play: () => this.click(tr), on: () => { if (this.state.hover !== tr.id) this.setState({ hover: tr.id }); }, off: () => { if (this.state.hover === tr.id) this.setState({ hover: null }); } }; };
    const albums = this.albums.map((a, ai) => { const tot = a.tracks.reduce((s, t) => s + t.dur, 0); return { title: a.title, meta: pad2(ai + 1) + ' / ' + pad2(n) + ' · ' + a.tracks.length + ' pieces · ' + fmtDur(tot), tracks: a.tracks.map(trV),
      hasNext: ai < n - 1, next: ai < n - 1 ? '↓ ' + this.albums[ai + 1].title : '', goNext: this.goAlbum(ai + 1) }; });
    const segs = this.strip ? this.segsOf(album, W, G.m).map(sg => ({ ...trV(sg.tr), left: Math.round(sg.x0), width: Math.round(sg.x1 - sg.x0), top: Math.round(G.yB - 96), height: 122 })) : [];
    return {
      th: (() => { const T = THEMES[this.look], cy = this.look === 'stark' && (this.props.cyber ?? true); return { ...T, titleSh: cy ? '2px 0 0 rgba(255,43,214,.85), -2px 0 0 rgba(0,229,255,.85)' : 'none', cardInk: cy ? 'var(--acc, ' + NEON_C + ')' : '#f2f2f0', cardSh: cy ? '0 0 8px var(--accG2, rgba(0,229,255,.75)), 1px 0 0 var(--acc, ' + NEON_M + ')' : 'none' }; })(),
      // what scrolling up / down leads to: the album above at the top edge, the one below at the bottom edge
      flapA: this.flapA, flapB: this.flapB, flipTo: pad2(album + 1), flipFrom: pad2((this.flipPrev ?? album) + 1),
      wheelRef: this.wheelRef, wheelItems: this.albums.map((a, ai) => ({ i: ai, num: pad2(ai + 1), title: a.title, go: this.goAlbum(ai) })),
      upList: this.albums.slice(0, album).map((a, ai) => ({ num: pad2(ai + 1), title: a.title, go: this.goAlbum(ai) })),
      downList: this.albums.slice(album + 1).map((a, k) => ({ num: pad2(album + k + 2), title: a.title, go: this.goAlbum(album + k + 1) })),
      upNum: album > 0 ? pad2(album) : '', upTitle: album > 0 ? this.albums[album - 1].title : '',
      downNum: album < n - 1 ? pad2(album + 2) : '', downTitle: album < n - 1 ? this.albums[album + 1].title : '',
      // the space the deck takes at the bottom; albums are this much shorter than the screen
      ch: 'calc(100vh - ' + (H - deckGeo(W, H).y0 + 8) + 'px)',
      isList: !this.strip, isStrip: this.strip, albums, cur: albums[album], segs,
      albumY: 'translateY(calc(' + (-album) + ' * (100vh - ' + (H - deckGeo(W, H).y0 + 8) + 'px)))', titleY: 'translateY(' + (-album * 1.02) + 'em)',
      prevName: album > 0 ? '↑ ' + this.albums[album - 1].title : '', prevOp: album > 0 ? 1 : 0, prevPe: album > 0 ? 'auto' : 'none',
      nextName: album < n - 1 ? '↓ ' + this.albums[album + 1].title : '', nextOp: album < n - 1 ? 1 : 0, nextPe: album < n - 1 ? 'auto' : 'none',
      goPrev: this.goAlbum(album - 1), goNext: this.goAlbum(album + 1),
      canvasRef: this.canvasRef, contentRef: this.contentRef, goHome: this.goHome,
      navOff: () => this.setState({ navHov: null }),
      rootRef: this.rootRef,
      // the deck's controls
      deck: { jogDown: this.jogDown, jogMove: this.jogHover, jogOn: () => { this.jogHov = 1; }, jogOff: () => { this.jogHov = 0; this.rimHov = false; }, play: this.playBtn, cue: this.cueBtn, playLabel: playing && !paused ? 'Pause' : 'Play',
        btnOn: k => () => { this.btnHov = k; }, btnOff: () => { this.btnHov = null; }, full: this.goFull, leaveFull: this.leaveFull, fullDn: () => { this.fullDown = true; }, fullUp: () => { this.fullDown = false; }, fullOut: () => { this.btnHov = null; this.fullDown = false; },
        cpOn: i => () => this.padOn(4 + i), cpOff: i => () => this.padOff(4 + i), spare: this.spareHit, vol: this.volDown, knob: [0, 1, 2, 3, 4, 5].map(i => ({ down: this.knobDown(i), wheel: this.knobWheel(i), on: () => { this.knobHov = i; }, off: () => { if (this.knobHov === i) this.knobHov = null; this.knobNum = null; }, move: this.knobMove(i) })),
        rows: [0, 1, 2, 3, 4, 5].map(k => ({ go: () => { const tr = this.albums[this.state.album].tracks[k]; if (tr) this.click(tr); }, on: () => { this.rowHov = k; }, off: () => { if (this.rowHov === k) this.rowHov = null; } })) },
      pad: Object.fromEntries(['home', 'freediving', 'sound', 'journal'].map((k, i) => [k, { on: () => this.padOn(i), off: () => this.padOff(i), go: k === 'home' ? this.goHome : this.GO[k] }]))
    };
  }
}

function View(v) {
  return (
    <>
    {"\n    "}
    <div ref={v.rootRef} style={sty(`--ch:${v.ch ?? '100vh'};position:fixed;inset:0;overflow:hidden;color:${v.th?.ink ?? ''};background:${v.th?.bg ?? ''};font-family:${v.th?.body ?? ''};-webkit-font-smoothing:antialiased`)}>
      {"\n      \n  \n      "}
      <canvas ref={v.canvasRef} style={sty("position:absolute;inset:0;width:100%;height:100%;pointer-events:none")} />
      {"\n      \n  \n      \n      "}
      <div ref={v.contentRef} style={sty("display:none")} />
      {"\n      \n      \n      \n  \n      "}
      <div role="navigation" aria-label="Pages" style={sty("position:absolute;inset:0;z-index:5;pointer-events:none")}>
        <a href={BASE + "?from=dive"} onClick={v.pad?.home?.go} aria-label="Home" data-navk="home" onMouseEnter={v.pad?.home?.on} onMouseLeave={v.pad?.home?.off} onFocus={v.pad?.home?.on} onBlur={v.pad?.home?.off} style={sty("position:absolute;left:-200px;top:0;display:block;border-radius:5px;pointer-events:auto;cursor:pointer")}>
          <span data-navdot="1" style={sty("position:absolute;left:50%;top:50%;width:1px;height:1px")} />
        </a>
        <a href={BASE + "freediving/"} onClick={v.pad?.freediving?.go} aria-label="Freediving" data-navk="freediving" onMouseEnter={v.pad?.freediving?.on} onMouseLeave={v.pad?.freediving?.off} onFocus={v.pad?.freediving?.on} onBlur={v.pad?.freediving?.off} style={sty("position:absolute;left:-200px;top:0;display:block;border-radius:5px;pointer-events:auto;cursor:pointer")}>
          <span data-navdot="1" style={sty("position:absolute;left:50%;top:50%;width:1px;height:1px")} />
        </a>
        <a href={BASE + "sound/"} onClick={v.pad?.sound?.go} aria-current="page" aria-label="Sound" data-navk="sound" onMouseEnter={v.pad?.sound?.on} onMouseLeave={v.pad?.sound?.off} onFocus={v.pad?.sound?.on} onBlur={v.pad?.sound?.off} style={sty("position:absolute;left:-200px;top:0;display:block;border-radius:5px;pointer-events:auto;cursor:default")}>
          <span data-navdot="1" style={sty("position:absolute;left:50%;top:50%;width:1px;height:1px")} />
        </a>
        <a href={BASE + "journal/"} onClick={v.pad?.journal?.go} aria-label="Journal" data-navk="journal" onMouseEnter={v.pad?.journal?.on} onMouseLeave={v.pad?.journal?.off} onFocus={v.pad?.journal?.on} onBlur={v.pad?.journal?.off} style={sty("position:absolute;left:-200px;top:0;display:block;border-radius:5px;pointer-events:auto;cursor:pointer")}>
          <span data-navdot="1" style={sty("position:absolute;left:50%;top:50%;width:1px;height:1px")} />
        </a>
      </div>
      <div aria-label="Deck" style={sty("position:absolute;inset:0;z-index:5;pointer-events:none")}>
        <div ref={v.wheelRef} style={sty("position:absolute;left:-200px;top:0;width:80px;height:200px;overflow:hidden;border-radius:5px;pointer-events:auto")}>
          {"\n          "}
          {(v.wheelItems || []).map((ab, $index) => (
            <React.Fragment key={$index}>
              {"\n            "}
              <button type="button" data-wi={ab?.i} onClick={ab?.go} aria-label={`Album ${ab?.num ?? ''}: ${ab?.title ?? ''}`} style={sty("position:absolute;left:50%;top:0;transform:translate(-50%, -50%);max-width:74px;overflow:hidden;text-overflow:ellipsis;opacity:0;white-space:nowrap;border:0;cursor:pointer;padding:2px 3px;border-radius:3px;font-family:'JetBrains Mono', monospace;font-size:8px;letter-spacing:.06em;text-transform:uppercase;background:none;color:var(--accL, #7fe9f7);text-shadow:0 0 6px var(--accG, rgba(0,229,255,.6));will-change:transform, opacity")}>
                {ab?.title}
              </button>
              {"\n          "}
            </React.Fragment>
          ))}
          {"\n          "}
          <div aria-hidden="true" style={sty(`position:absolute;left:50%;top:50%;margin-left:-32px;margin-top:-42px;width:64px;height:84px;perspective:320px;font-family:Michroma, sans-serif;font-size:26px;letter-spacing:-0.02em;line-height:1;color:${v.th?.cardInk ?? ''};text-shadow:${v.th?.cardSh ?? ''};box-shadow:0 2px 6px rgba(0,0,0,.25);border-radius:6px`)}>
            {"\n          "}
            <div style={sty("position:absolute;inset:0 0 50% 0;overflow:hidden;border-radius:6px 6px 0 0;background:#161616")}>
              <div style={sty("position:absolute;left:0;right:0;top:0;height:84px;display:grid;place-items:center")}>
                {v.flipTo}
              </div>
            </div>
            {"\n          "}
            <div style={sty("position:absolute;inset:50% 0 0 0;overflow:hidden;border-radius:0 0 6px 6px;background:#111111")}>
              <div style={sty("position:absolute;left:0;right:0;top:-42px;height:84px;display:grid;place-items:center")}>
                {v.flipFrom}
              </div>
            </div>
            {"\n          "}
            <div ref={v.flapA} style={sty("position:absolute;inset:0 0 50% 0;overflow:hidden;border-radius:6px 6px 0 0;background:#161616;transform-origin:50% 100%;backface-visibility:hidden;visibility:hidden")}>
              <div style={sty("position:absolute;left:0;right:0;top:0;height:84px;display:grid;place-items:center")}>
                {v.flipFrom}
              </div>
            </div>
            {"\n          "}
            <div ref={v.flapB} style={sty("position:absolute;inset:50% 0 0 0;overflow:hidden;border-radius:0 0 6px 6px;background:#111111;transform-origin:50% 0;backface-visibility:hidden;visibility:hidden")}>
              <div style={sty("position:absolute;left:0;right:0;top:-42px;height:84px;display:grid;place-items:center")}>
                {v.flipTo}
              </div>
            </div>
            {"\n          "}
            <div style={sty("position:absolute;left:0;right:0;top:50%;height:1px;margin-top:-.5px;background:#000000")} />
            {"\n        "}
          </div>
          {"\n        "}
        </div>
        <div data-deck="jog" role="slider" aria-label="Jog wheel: drag round to scrub" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} onPointerDown={v.deck?.jogDown} onPointerMove={v.deck?.jogMove} onMouseEnter={v.deck?.jogOn} onMouseLeave={v.deck?.jogOff} style={sty("position:absolute;left:-200px;top:0;border-radius:50%;pointer-events:auto;cursor:grab;touch-action:none")} />
        {['Orange', 'Green', 'Purple', 'Spare'].map((nm, i) => <button key={nm} data-cpad={i} type="button" aria-disabled={i < 3 ? 'true' : undefined} aria-label={i < 3 ? nm + ' page: coming soon' : 'Kick drum'} onClick={i === 3 ? v.deck?.spare : undefined} onMouseEnter={v.deck?.cpOn?.(i)} onMouseLeave={v.deck?.cpOff?.(i)} onFocus={v.deck?.cpOn?.(i)} onBlur={v.deck?.cpOff?.(i)} style={sty(`position:absolute;left:-200px;top:0;border-radius:4px;border:0;padding:0;background:none;pointer-events:auto;cursor:${i === 3 ? 'pointer' : 'default'}`)} />)}
        <button data-deck="full" type="button" aria-label="Full screen: only the wave" title="Full screen (F)" data-noring="1" onClick={v.deck?.full} onPointerDown={v.deck?.fullDn} onPointerUp={v.deck?.fullUp} onMouseEnter={v.deck?.btnOn?.('full')} onMouseLeave={v.deck?.fullOut} style={sty("position:absolute;left:-200px;top:0;border-radius:50%;border:0;padding:0;background:none;pointer-events:auto;cursor:pointer")} />
        <button data-deck="play" type="button" aria-label={v.deck?.playLabel} onClick={v.deck?.play} onMouseEnter={v.deck?.btnOn?.('play')} onMouseLeave={v.deck?.btnOff} style={sty("position:absolute;left:-200px;top:0;border-radius:50%;border:0;padding:0;background:none;pointer-events:auto;cursor:pointer")} />
        {(v.deck?.knob || []).map((kb, i) => <div key={i} data-knob={i} role="slider" aria-label={'Knob ' + (i + 1)} aria-valuemin={0} aria-valuemax={9} onPointerDown={kb.down} onPointerMove={kb.move} onWheel={kb.wheel} onMouseEnter={kb.on} onMouseLeave={kb.off} style={sty("position:absolute;left:-200px;top:0;border-radius:50%;pointer-events:auto;cursor:grab;touch-action:none")} />)}
        <div data-deck="vol" role="slider" aria-label="Volume" aria-valuemin={0} aria-valuemax={100} aria-valuenow={85} onPointerDown={v.deck?.vol} style={sty("position:absolute;left:-200px;top:0;pointer-events:auto;cursor:ns-resize;touch-action:none")} />
        {(v.deck?.rows || []).map((rw, k) => <button key={k} data-row={k} type="button" aria-label={'Play piece ' + (k + 1)} onClick={rw.go} onMouseEnter={rw.on} onMouseLeave={rw.off} onFocus={rw.on} onBlur={rw.off} style={sty("position:absolute;left:-200px;top:0;border:0;padding:0;background:none;pointer-events:auto;cursor:pointer")} />)}
      </div>
      {/* leaving full screen: a pill centred at the bottom, the controller's dark glass with a cyan edge; bright while the mouse moves, faint while it is still */}
      <button data-full-exit="1" type="button" aria-label="Leave full screen" title="Leave full screen (Esc)" onClick={v.deck?.leaveFull} style={sty("position:fixed;left:50%;bottom:22px;transform:translateX(-50%);height:32px;padding:0 18px;border-radius:16px;border:1px solid rgba(0,229,255,.75);background:#17121f;box-shadow:0 0 10px rgba(0,229,255,.35);color:#7fe9f7;font-family:Michroma, sans-serif;font-size:10px;letter-spacing:.16em;white-space:nowrap;opacity:0;pointer-events:none;cursor:pointer;transition:opacity .4s;display:flex;align-items:center;gap:10px")}>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 1v4H1M9 1v4h4M5 13V9H1M9 13V9h4" /></svg>EXIT<span style={sty("opacity:.55")}>·</span>ESC
      </button>
      {"\n    "}
    </div>
    </>
  );
}

export default page(Component, View, {"style":"stark","cyber":true,"photo":0.9,"deck":true,"strings":"fader","wave":"pieces","settle":"lens","contour":false,"ghost":false,"synth":true});
