// Carried over from the Claude Design file "Home - Brush Lines v2.dc.html".
// The logic class is the design's own code; View is its template as JSX.
import React from 'react';
import { DCLogic, page, sty, BASE } from '../lib/dc.js';
import { deckGeo, padOf } from '../lib/deck.js';
import { navAt, NAV_Y } from '../lib/nav.js';
import { ropeX } from '../lib/rope.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = x => x * x * (3 - 2 * x);
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const INK = [20, 20, 20], BLUE = [24, 88, 224];
// weighted pick: each time a symbol is shown its weight drops, so unseen ones come up more; counts reset on refresh / fresh visit
const pickShape = (exclude) => { let seen = {}; try { seen = JSON.parse(sessionStorage.getItem('shape-seen') || '{}'); } catch (e) {}
  const opts = SHAPES.filter(x => x !== exclude), w = opts.map(x => 1 / Math.pow(1 + (seen[x] || 0), 2)), tot = w.reduce((a, b) => a + b, 0); let r = Math.random() * tot, k = 0; while (k < opts.length - 1 && (r -= w[k]) > 0) k++;
  const pick = opts[k]; seen[pick] = (seen[pick] || 0) + 1; try { sessionStorage.setItem('shape-seen', JSON.stringify(seen)); sessionStorage.setItem('home-shape', pick); } catch (e) {} return pick; };
// golden spiral: from the top of a circle of radius r0 round c (angle a0), turning clockwise, the radius shrinks by φ every quarter turn,
// the curve of a golden rectangle's nested squares. n points per turn, w(u) the brush weight along it
const PHI = (1 + Math.sqrt(5)) / 2;
const goldSpiral = (c, r0, a0, turns, n, w) => { const m = Math.max(2, Math.round(n * turns)); return Array.from({ length: m }, (_, q) => { const u = (q + 1) / m, t = u * turns * Math.PI * 2, r = r0 * Math.pow(PHI, -t / (Math.PI / 2)); const p = [c[0] + Math.cos(a0 + t) * r, c[1] + Math.sin(a0 + t) * r]; return w ? [p[0], p[1], w(u)] : p; }); };
// the big black wave's line: its back (from the water up to the top of its curl) and its golden-spiral curl, in unit coordinates.
// The wave symbol draws it, and every small wave is an exact scaled copy of it
const WAVE_BACK = [[-1.9, .74], [-1.45, .7], [-1.0, .6], [-.6, .36], [-.3, -.02], [-.05, -.42], [.22, -.68], [.5, -.76], [.72, -.72]], WAVE_C = [.72, -.38], WAVE_R = .34, WAVE_TURNS = 1.0;
// the same line in a small wave's own units: crest top at 0,0 and the wave 1 tall
const WAVE_H = WAVE_BACK[0][1] - (WAVE_C[1] - WAVE_R), MINI_BACK = WAVE_BACK.map(p => [(p[0] - WAVE_C[0]) / WAVE_H, (p[1] - WAVE_C[1] + WAVE_R) / WAVE_H]), MINI_R = WAVE_R / WAVE_H;
// how much bigger than its WAVES box a small wave is drawn, so its curl reads clearly round the dot
const MINI_GROW = 1.9;
// scale s and crest top T so the wave starts at (x0, y0) on the water and fits width w and height h
const miniFit = (x0, y0, w, h) => { const b = MINI_BACK[0], s = Math.min(w / (-b[0] + MINI_R), h / b[1]) * MINI_GROW; return [s, [x0 - b[0] * s, y0 - b[1] * s]]; };
const miniC = (x0, y0, w, h) => { const [s, T] = miniFit(x0, y0, w, h); return [[T[0], T[1] + MINI_R * s], MINI_R * s, s]; };
const miniWave = (x0, y0, w, h, o = {}) => { const [s, T] = miniFit(x0, y0, w, h), [C, r] = miniC(x0, y0, w, h), out = [];
  cat(MINI_BACK.map(p => [T[0] + p[0] * s, T[1] + p[1] * s]), 6, (x, y) => out.push([x, y]));
  for (const p of goldSpiral(C, r, -Math.PI / 2, WAVE_TURNS, 44)) out.push(p); return out; };
// [line, start x, start y (on the water), width, height, options] in unit coordinates; li 3 (blue) rides the big wave instead
// the small waves sit in one row under the big one, evenly spaced and alternately high and low (blue rides the big wave)
const WAVES = [[3, -1.6, .66, 1.6, 1.0, {}], ...[1, 4, 5, 2, 6].map((li, k) => [li, -2.25 + k * .85, k % 2 ? 1.74 : 1.52, .6, 1, {}])];
const SHAPES = ['enso', 'spiral', 'triforce', 'triskele', 'wave', 'maple', 'octopus', 'hangul', 'spring', 'mountain', 'vinyl', 'camera', 'book', 'onsen', 'lotus', 'coffee', 'headphones', 'plane', 'gameboy', 'longfins', 'egg', 'samurai', 'muaythai'];
// page: which section this colour leads to (blue → freediving)
// hover fade, like watercolour bleeding into paper: every other line washes from the start of its stroke to its tail, all in step.
// seconds for the wash to cross a stroke, opacity reached, width of the wet edge (share of the stroke), how much that edge wanders
const FADE = { sweep: 1.1, to: .25, soft: .9, wander: .07 };
// section labels stay hidden until their dot is hovered, then come out of it and go back in with the same motion: total seconds, seconds per
// letter, size and blur while inside the dot, and the dot's pulse (seconds, px) as the last letter goes in
const LABEL = { time: .4, letter: .22, shrink: .2, blur: 1.5, pulse: .3, pulseR: 3 };
// the ink line draws at its natural pace up to this many seconds of travel, then speeds up, so long symbols (vinyl, coffee) are ready as soon as short ones
const INK_RUN = 4.2;
// the hangul stamp's square, in unit coordinates, clockwise from the top left corner and back to it
const SEAL = { x: 1.0, y: 1.02 };
const SEAL_SQ = (() => { const X = SEAL.x, Y = SEAL.y, e = .05; return [[-X, -Y], [-X + e, -Y], [0, -Y], [X - e, -Y], [X, -Y], [X, -Y + e], [X, 0], [X, Y - e], [X, Y], [X - e, Y], [0, Y], [-X + e, Y], [-X, Y], [-X, Y - e], [-X, 0], [-X, -Y + e], [-X, -Y + .01]]; })();
// the egg white's wobbly outline: angle a (clockwise on screen, 0 at the right), k scales it about the centre (below 1 runs inside it)
const EGG_WOB = a => 1 + .06 * Math.sin(a * 3 + .6) + .07 * Math.sin(a * 5 + 2.1) + .025 * Math.sin(a * 9 + .4);
const eggWhite = (a, k) => { const rr = EGG_WOB(a) * k; return [Math.cos(a) * 1.3 * rr, .02 + Math.sin(a) * .86 * rr]; };
const eggArc = (a0, a1, k, n = 40) => Array.from({ length: n + 1 }, (_, q) => eggWhite(a0 + (a1 - a0) * q / n, k));
// a point in a fin's own frame (the longfins symbol: fin centred at sx, tilted by rot) placed on the symbol
const finPt = (sx, rot, [x, y]) => [sx + x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)];
// a wisp of steam rising from y0 to y1 at x, swaying more as it rises
const wisp = (x, y0, y1, amp, ph) => Array.from({ length: 13 }, (_, q) => { const u = q / 12; return [x + amp * Math.sin(u * Math.PI * 2.2 + ph) * (.35 + .65 * u), y0 + (y1 - y0) * u]; });
// the plane's wind: a wavy stream blowing back off a wingtip (sd -1 port, 1 starboard), in the plane's tilted frame
const planeWind = (sd, ph) => Array.from({ length: 15 }, (_, q) => { const u = q / 14, x = sd * (1.27 + .13 * u + .05 * Math.sin(u * Math.PI * 3 + ph) * u), y = .33 + .8 * u; return [(x - y) * Math.SQRT1_2, (x + y) * Math.SQRT1_2]; });
// the Muay Thai bag hangs from its ring at BAG_HOOK and has just been kicked from the left, so it's tipped by BAG_SWING (radians, the bottom to the right)
const BAG_HOOK = [0, -1.27], BAG_SWING = -.1, BAG_ROT = ([x, y, w]) => { const dx = x - BAG_HOOK[0], dy = y - BAG_HOOK[1], c = Math.cos(BAG_SWING), s = Math.sin(BAG_SWING); return [BAG_HOOK[0] + dx * c - dy * s, BAG_HOOK[1] + dx * s + dy * c, w]; };
// its coloured lines, before the swing: red, yellow and blue are strips of tape wrapped round its middle, slanting alternately like a criss-cross
// repair, each ending at the bag's edge (Sound and Freediving's dots on the left, Library's on the right); orange, green and purple are speed
// streaks trailing behind it as it swings to the right: arcs about the hook, longer lower down where the bag moves fastest, running in to just
// short of its left side so their dots lead into it
const BAG_TAPE = (yc, slope, toLeft) => Array.from({ length: 13 }, (_, q) => { const a = toLeft ? q / 12 * Math.PI : Math.PI - q / 12 * Math.PI, x = Math.cos(a) * .37; return [x, yc + Math.sin(a) * .09 + slope * x]; });
const BAG_STREAK = (r, span) => { const a0 = Math.asin(.36 / r) + .065; return Array.from({ length: 9 }, (_, q) => { const a = Math.PI / 2 + a0 + span * (1 - q / 8); return [BAG_HOOK[0] + Math.cos(a) * r, BAG_HOOK[1] + Math.sin(a) * r]; }); };
const BAG_LINES = [{ li: 1, path: BAG_TAPE(-.2, .22, true) }, { li: 2, path: BAG_TAPE(.02, -.22, false) }, { li: 3, path: BAG_TAPE(.24, .22, true) },
  { li: 6, path: BAG_STREAK(1.72, .2) }, { li: 5, path: BAG_STREAK(1.98, .26) }, { li: 4, path: BAG_STREAK(2.24, .32) }];
// where a menu dot lands leaving Home for Sound: just above the deck that rises in at the bottom, straight over its beat pad
const sndDrop = (k, W, H) => { const G = deckGeo(W, H); return [padOf(G, k)[0], G.y0 - 36]; };
const LINES = [
  { col: INK, w: 11, d: .35, spd: 1, keep: 1 },
  { col: [232, 34, 44], w: 9, d: .45, spd: 1, page: 'sound' },
  { col: [255, 196, 0], w: 9, d: .55, spd: .97, page: 'journal' },
  { col: BLUE, w: 9.5, d: .65, spd: 1.02, page: 'freediving' },
  { col: [255, 118, 18], w: 9, d: .75, spd: 1, u: .5 },
  { col: [22, 168, 82], w: 9, d: .85, spd: .97, u: .66 },
  { col: [138, 64, 214], w: 9, d: .95, spd: 1.02, u: .82 }
];
// book: [line, dot x, row (0 top edge of the page, 1 bottom edge), other end x] in unit coordinates
const BOOK_NOTES = [[1, -1.17, .25, -.37], [3, -1.16, .5, -.42], [5, -1.17, .75, -.36], [6, 1.16, .25, .29], [2, 1.15, .5, .32], [4, 1.14, .75, .41]];
// height of a note row on the book: the pages' top and bottom edges sag the same way (through the spine, middle and outer corner), so a row
// arcs like they do. Exact for the three points the edges are drawn through, smooth in between
const bookRowY = (x, f) => { const ax = Math.abs(x), lag = (a, b, c) => a * (ax - .6) * (ax - 1.35) / ((0 - .6) * (0 - 1.35)) + b * ax * (ax - 1.35) / (.6 * (.6 - 1.35)) + c * ax * (ax - .6) / (1.35 * (1.35 - .6));
  return lag(-.48, -.7, -.6) * (1 - f) + lag(.72, .55, .62) * f; };
// extra clearance (px) for the small orange, green and purple dots beyond the drawing on symbols where coloured lines ride the outside
// (vinyl: the red, yellow and blue band round the record), so they stand clear of it instead of touching it
const RING_EXTRA = { vinyl: 30 };
// spacing (px) a symbol's own coloured paths are resampled at before one round of smoothing; about 2.5 px between points once smoothed
const CP_STEP = 5;
const cat = (ctrl, n, push) => { for (let i = 0; i < ctrl.length - 1; i++) { const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)]; for (let j = 0; j < n; j++) { const t = j / n, t2 = t * t, t3 = t2 * t; push(.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)); } } const l = ctrl[ctrl.length - 1]; push(l[0], l[1]); };

const chaikin = (p, n) => { for (let k = 0; k < n; k++) { const o = [p[0]]; for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1]; const aw = a[2] ?? 1, bw = b[2] ?? 1; o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25, aw * .75 + bw * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75, aw * .25 + bw * .75]); } o.push(p[p.length - 1]); p = o; } return p; };
const resample = (p, step) => { const o = [p[0]]; let acc = 0; for (let i = 1; i < p.length; i++) { let a = p[i - 1]; const b = p[i]; let d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!(d > 1e-6)) continue; let guard = 0; while (acc + d >= step && guard++ < 5000) { const t = (step - acc) / d; a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (a[2] ?? 1) + ((b[2] ?? 1) - (a[2] ?? 1)) * t]; o.push(a); d = Math.hypot(b[0] - a[0], b[1] - a[1]); acc = 0; } acc += d; } o.push(p[p.length - 1]); return o; };
const avg = (p, r0) => p.map((q, i) => { const r = Math.min(r0, i, p.length - 1 - i); if (r <= 0) return q; let x = 0, y = 0; for (let j = -r; j <= r; j++) { x += p[i + j][0]; y += p[i + j][1]; } return [x / (2 * r + 1), y / (2 * r + 1)]; });
const loopify = (P, R) => {
  const n = P.length, D = R * .13, hy = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), th = new Array(n).fill(0), info = [];
  for (let i = 1; i < n - 1; i++) { let b = i, f = i; while (b > 0 && hy(P[b], P[i]) < D) b--; while (f < n - 1 && hy(P[f], P[i]) < D) f++; if (b === i || f === i) continue;
    const l1 = hy(P[i], P[b]) || 1, l2 = hy(P[f], P[i]) || 1, din = [(P[i][0] - P[b][0]) / l1, (P[i][1] - P[b][1]) / l1], dout = [(P[f][0] - P[i][0]) / l2, (P[f][1] - P[i][1]) / l2];
    th[i] = Math.atan2(din[0] * dout[1] - din[1] * dout[0], din[0] * dout[0] + din[1] * dout[1]); info[i] = { din, dout }; }
  const out = []; let skipTo = -1;
  for (let i = 0; i < n; i++) {
    if (i < skipTo) continue;
    const t = th[i], w0 = P[i][2] ?? 1;
    let isC = Math.abs(t) > .95 && Math.abs(t) < 2.4 && w0 >= .3; if (isC) for (let j = Math.max(0, i - 14); j <= Math.min(n - 1, i + 14); j++) if ((P[j][2] ?? 1) < .3) { isC = false; break; } if (isC) for (let j = Math.max(1, i - 12); j <= Math.min(n - 2, i + 12); j++) if (Math.abs(th[j]) > Math.abs(t)) { isC = false; break; }
    out.push(P[i]);
    if (!isC) continue;
    const { din } = info[i], sg = t > 0 ? -1 : 1, Dl = sg * (Math.PI * 2 - Math.abs(t)), r = R * (.12 + .1 * Math.abs(t) / Math.PI), N = 56, step = r * Math.abs(Dl) / N;
    let p = [P[i][0], P[i][1]], dir = [din[0], din[1]];
    for (let k = 1; k <= N; k++) { const a = Dl / N, c = Math.cos(a), s2 = Math.sin(a); dir = [dir[0] * c - dir[1] * s2, dir[0] * s2 + dir[1] * c]; p = [p[0] + dir[0] * step, p[1] + dir[1] * step]; out.push([p[0], p[1], w0 * (1 - .6 * Math.sin(Math.PI * k / N))]); }
    let f = i; while (f < n - 1 && hy(P[f], P[i]) < D * .5) f++; skipTo = f;
  }
  return out;
};
const smooth1 = (a, r) => a.map((v, i) => { let t = 0, c = 0; for (let j = Math.max(0, i - r); j <= Math.min(a.length - 1, i + r); j++) { t += a[j]; c++; } return t / c; });
const lerpPt = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
const easeIO = k => .5 - .5 * Math.cos(Math.PI * k);
// blue rides the big wave: up its back just inside the black line, over the crest, and curls into the heart of the curl
const blueRide = (() => { const o = []; cat([[-1.05, .7], [-.62, .48], [-.3, .1], [-.06, -.3], [.2, -.57], [.48, -.66], [.72, -.63]], 10, (x, y) => o.push([x, y]));
  for (const p of goldSpiral([.72, -.38], .25, -Math.PI / 2, .92, 44)) o.push(p); return o; })();
const catW = (ctrl, n, w0, w1) => { const o = []; cat(ctrl, n, (x, y) => o.push([x, y])); return o.map((p, i) => [p[0], p[1], w0 + (w1 - w0) * i / Math.max(1, o.length - 1)]); };
function shapeOf(name, cx, cy, R) {
  const blooms = [], colorPaths = {}, P = [], push = (x, y, w = 1) => P.push([cx + x * R, cy + y * R, w]), extra = [];
  const strokes = list => list.forEach((st2, k) => {
    const isC = st2.length === 2 && (st2[0][2] ?? 1) < .2, pv = list[k - 1], nx = list[k + 1];
    if (!isC || !pv || !nx || pv.length < 2 || nx.length < 2) { st2.forEach(p => push(p[0], p[1], p[2] ?? 1)); return; }
    const A = pv[pv.length - 1], A2 = pv[pv.length - 2], B = nx[0], B2 = nx[1], la = Math.hypot(A[0] - A2[0], A[1] - A2[1]) || 1, lb = Math.hypot(B2[0] - B[0], B2[1] - B[1]) || 1, d = Math.hypot(B[0] - A[0], B[1] - A[1]), hk = Math.max(.12, Math.min(.6, d * .45));
    { const ux = (B[0] - A[0]) / (d || 1), uy = (B[1] - A[1]) / (d || 1), c1 = ((A[0] - A2[0]) * ux + (A[1] - A2[1]) * uy) / la, c2 = ((B2[0] - B[0]) * ux + (B2[1] - B[1]) * uy) / lb; if (d > .45 || c1 < .3 || c2 < .3) { st2.forEach(p => push(p[0], p[1], p[2] ?? 1)); return; } }
    const C1 = [A[0] + (A[0] - A2[0]) / la * hk, A[1] + (A[1] - A2[1]) / la * hk], C2 = [B[0] - (B2[0] - B[0]) / lb * hk, B[1] - (B2[1] - B[1]) / lb * hk], n = Math.max(6, Math.ceil(d / .04)), w0 = A[2] ?? 1, w1 = B[2] ?? 1;
    for (let q = 1; q < n; q++) { const u = q / n, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, e = u ** 3, sag = .55 + .45 * Math.abs(1 - 2 * u); push(a * A[0] + b * C1[0] + c * C2[0] + e * B[0], a * A[1] + b * C1[1] + c * C2[1] + e * B[1], (w0 + (w1 - w0) * u) * sag); }
  });
  let st = [0, 1.12];
  const TAU = Math.PI * 2, cv = (ctrl, n = 18) => cat(ctrl, n, push);
  const lineTo = pts => { for (let k = 0; k < pts.length - 1; k++) { const a = pts[k], b = pts[k + 1], n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .03)); for (let q = k ? 1 : 0; q <= n; q++) push(a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n); } };
  const circ = (c, r, a0, turns, n = 120, ry = r) => { for (let q = 0; q <= n; q++) { const a = a0 + q / n * turns * TAU; push(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * ry); } };
  if (name === 'spiral') { for (let i = 0; i <= 420; i++) { const u = i / 420, r = 1.15 * Math.pow(1 - u, .8) + .04, th = Math.PI * .5 + u * Math.PI * 2 * 2.4; push(Math.cos(th) * r, Math.sin(th) * r); } st = [0, 1.2]; }
  else if (name === 'triskele') {
    const t = .12, A = k => { const a = Math.PI / 2 + k * Math.PI * 2 / 3, o = []; for (let i = 0; i <= 60; i++) { const u = i / 60, rr = .08 + 1.05 * Math.pow(u, .9), th = a - 2.5 + u * 2.5; o.push([Math.cos(th) * rr, Math.sin(th) * rr, 1.2 - .85 * u]); } return o; };
    const a0 = A(0), a1 = A(1), a2 = A(2), hc = (p, q) => [[p[0], p[1], t], [q[0], q[1], t]];
    strokes([a1, hc(a1[a1.length - 1], a2[0]), a2, hc(a2[a2.length - 1], a0[0]), a0]);
    st = [0, 1.24];
  }
  else if (name === 'fox') {
    const t = .12, hc = (a, b) => Array.from({ length: 16 }, (_, q) => [a[0] + (b[0] - a[0]) * q / 15, a[1] + (b[1] - a[1]) * q / 15, .001]);
    const body = catW([[-.55, 1.12], [-.05, 1.13], [.52, 1.12], [.34, 1.0], [.3, .55], [.32, .15], [.4, -.18], [.56, -.38], [.84, -.48], [.78, -.56], [.56, -.64], [.42, -.74], [.38, -1.14], [.24, -.82], [.13, -1.08], [.04, -.74], [-.06, -.42], [-.18, .02], [-.42, .45], [-.54, .82], [-.55, 1.12]], 14, 1.15, 1.05);
    const tail = catW([[-.46, .7], [-.56, .46], [-.6, 0], [-.54, -.44], [-.5, -.76], [-.66, -.6], [-.84, -.22], [-.9, .32], [-.78, .82], [-.56, 1.0]], 12, .7, 1.0);
    const leg = catW([[-.22, .58], [-.02, .8], [.06, 1.1]], 8, .85, .6), bib = catW([[.0, -.36], [.18, -.12], [.4, -.2]], 8, .85, .7);
    strokes([tail, hc(tail[tail.length - 1], leg[0]), leg, hc(leg[leg.length - 1], bib[0]), bib, hc(bib[bib.length - 1], body[0]), body]);
    extra.push([cx + .5 * R, cy - .6 * R]);
    st = [.1, 1.4];
  }
  else if (name === 'longfins') {
    const t = .12, hc = (a, b) => Array.from({ length: 16 }, (_, q) => [a[0] + (b[0] - a[0]) * q / 15, a[1] + (b[1] - a[1]) * q / 15, .001]);
    const fin = (sx, rot) => { const c = Math.cos(rot), sn = Math.sin(rot), P2 = [[0, -1.12], [.17, -1.05], [.2, -.78], [.18, -.5], [.26, -.1], [.34, .5], [.38, 1.05], [.24, 1.2], [0, 1.1], [-.24, 1.2], [-.38, 1.05], [-.34, .5], [-.26, -.1], [-.18, -.5], [-.2, -.78], [-.17, -.05 - 1], [0, -1.12]];
      return catW(P2.map(p => [sx + p[0] * c - p[1] * sn, p[0] * sn + p[1] * c]), 10, 1.05, 1.05); };
    const f1 = fin(-.4, .16), f2 = fin(.4, -.16);
    const rib = (sx, rot) => { const c = Math.cos(rot), sn = Math.sin(rot); return catW([[0, -.42], [0, .2], [0, .85]].map(p => [sx + p[0] * c - p[1] * sn, p[0] * sn + p[1] * c]), 8, .6, .3); };
    const r1 = rib(-.4, .16), r2 = rib(.4, -.16);
    strokes([f1, hc(f1[f1.length - 1], r1[0]), r1, hc(r1[r1.length - 1], r2[0]), r2, hc(r2[r2.length - 1], f2[0]), f2]);
    st = [0, 1.42];
  }
  else if (name === 'gameboy') {
    const t = .12, hc = (a, b) => Array.from({ length: 16 }, (_, q) => [a[0] + (b[0] - a[0]) * q / 15, a[1] + (b[1] - a[1]) * q / 15, .001]);
    const rr = (x0, y0, x1, y1, r, rBR) => { const o = [], arcq = (c0, c1, a0, rad) => { for (let q = 0; q <= 8; q++) { const a = a0 + q / 8 * Math.PI / 2; o.push([c0 + Math.cos(a) * rad, c1 + Math.sin(a) * rad, 1]); } };
      arcq(x0 + r, y0 + r, Math.PI, r); arcq(x1 - r, y0 + r, -Math.PI / 2, r); arcq(x1 - rBR, y1 - rBR, 0, rBR); arcq(x0 + r, y1 - r, Math.PI / 2, r); o.push(o[0].slice()); return o; };
    const body = rr(-.68, -1.12, .68, 1.12, .07, .34), scr = rr(-.5, -.94, .5, -.14, .05, .05).map(p => [p[0], p[1], .8]);
    const dpH = catW([[-.55, .4], [-.39, .4], [-.23, .4]], 6, 1.15, 1.15), dpV = catW([[-.39, .24], [-.39, .4], [-.39, .56]], 6, 1.15, 1.15);
    const btn = (x, y) => { const o = []; for (let q = 0; q <= 18; q++) { const a = -Math.PI / 2 + q / 18 * TAU; o.push([x + Math.cos(a) * .085, y + Math.sin(a) * .085, .85]); } return o; };
    const bA = btn(.46, .28), bB = btn(.2, .44), sp = catW([[.2, .86], [.32, .74]], 4, .6, .6), sp2 = catW([[.3, .9], [.42, .78]], 4, .6, .6);
    const seq = [body, scr, dpH, dpV, bB, bA, sp, sp2], list = []; seq.forEach((q, k) => { if (k) list.push(hc(seq[k - 1][seq[k - 1].length - 1], q[0])); list.push(q); });
    strokes(list);
    st = [-.95, 1.2];
  }
  else if (name === 'wave') {
    const t = .001, hc = (a, b) => Array.from({ length: 16 }, (_, q) => [a[0] + (b[0] - a[0]) * q / 15, a[1] + (b[1] - a[1]) * q / 15, t]);
    const back = catW(WAVE_BACK, 12, .7, 1.1), cur = [], c = WAVE_C;
    // the curl is a golden spiral round the heart of the wave
    for (const p of goldSpiral(c, WAVE_R, -Math.PI / 2, WAVE_TURNS, 70, u => 1.05 - .4 * u)) cur.push(p);
    const face = catW([[.56, .06], [.66, .34], [.9, .58], [1.3, .7], [1.9, .74]], 12, .95, .6);
    strokes([back, cur, hc(cur[cur.length - 1], face[0]), face]);
    st = [-.25, 1.25];
  }

  else if (name === 'egg') { const t = .001, hc = (a, b) => Array.from({ length: 16 }, (_, q) => [a[0] + (b[0] - a[0]) * q / 15, a[1] + (b[1] - a[1]) * q / 15, t]);
    // sunny side up, seen at a slight angle: wobbly white with a thickness edge underneath, a domed yolk with a shine and a soft shadow
    const wob = EGG_WOB, white = Array.from({ length: 91 }, (_, q) => { const a = Math.PI * .55 + q / 90 * Math.PI * 2.03; return [...eggWhite(a, 1), 1]; });
    const edge = []; for (let q = 0; q <= 40; q++) { const a = Math.PI * .18 + q / 40 * Math.PI * .64, rr = wob(a); edge.push([Math.cos(a) * 1.3 * rr * .97, .02 + Math.sin(a) * .86 * rr + .1, .6 + .3 * Math.sin(Math.PI * q / 40)]); }
    const Y = [.18, -.12], yolk = Array.from({ length: 61 }, (_, q) => { const a = -Math.PI * .6 + q / 60 * Math.PI * 2.02; return [Y[0] + Math.cos(a) * .5, Y[1] + Math.sin(a) * .42, 1.1]; });
    const shine = catW([[Y[0] - .3, Y[1] - .02], [Y[0] - .22, Y[1] - .2], [Y[0] - .04, Y[1] - .28]], 6, .85, .7);
    const seq = [white, yolk, shine], list = []; seq.forEach((q, k) => { if (k) list.push(hc(seq[k - 1][seq[k - 1].length - 1], q[0])); list.push(q); }); strokes(list); st = [0, 1.25]; }
  else if (name === 'samurai') { const t = .001, hc = (a, b) => Array.from({ length: 16 }, (_, q) => [a[0] + (b[0] - a[0]) * q / 15, a[1] + (b[1] - a[1]) * q / 15, t]), list = [];
    const ring = (x, y, k) => { const o = [], a0 = -1.9 + k * .7; for (let q = 0; q <= 30; q++) { const a = a0 + q / 30 * TAU * 1.06; o.push([x + Math.cos(a) * .14, y + .33 + Math.sin(a) * .14, .8 + .3 * Math.sin(q / 30 * Math.PI)]); } return o; };
    const parts = [[-.26, -.94], [.26, -.94], [-.26, -.6], [.26, -.6], [-.26, -.26], [.26, -.26]].map(([x, y], k) => ring(x, y, k));
    parts.push([[0, .33, .9], [.24, .69, 1], [-.24, .69, 1], [0, .33, .9], [.05, .41, .8]]);
    parts.forEach((q, k) => { if (k) list.push(hc(parts[k - 1][parts[k - 1].length - 1], q[0])); list.push(q); }); strokes(list); st = [0, 1.05]; }
  else if (name === 'muaythai') { // a Muay Thai bag on its ring, swivel and straps, just kicked from the left so it swings a little to the right
    const t = .001, hc = (a, b) => Array.from({ length: 16 }, (_, q) => [a[0] + (b[0] - a[0]) * q / 15, a[1] + (b[1] - a[1]) * q / 15, t]);
    const lin = (a, b, w = 1) => { const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .03)); return Array.from({ length: n + 1 }, (_, q) => [a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n, w]); };
    const ell = (c, rx, ry, a0, a1, n, w) => Array.from({ length: n + 1 }, (_, q) => { const a = a0 + (a1 - a0) * q / n; return [c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry, w]; });
    const ring = ell([0, -1.27], .07, .07, Math.PI / 2, Math.PI / 2 + TAU, 24, .8), hang = lin([0, -1.2], [0, -.98]), strapL = lin([0, -.98], [-.36, -.7], .85);
    const bodyPts = [...lin([-.36, -.7], [-.36, .9])]; cat([[-.36, .9], [-.3, 1.0], [0, 1.05], [.3, 1.0], [.36, .9]], 10, (x, y) => bodyPts.push([x, y, 1])); bodyPts.push(...lin([.36, .9], [.36, -.7]));
    const strapR = lin([.36, -.7], [0, -.98], .85), rim = ell([0, -.7], .36, .085, Math.PI, Math.PI + TAU, 40, .8), band1 = ell([0, -.46], .36, .085, Math.PI, 0, 24, .65), band2 = ell([0, .7], .36, .085, Math.PI, 0, 24, .65);
    const seq = [[...ring, ...hang, ...strapL, ...bodyPts, ...strapR], rim, band1, band2], list = []; seq.forEach((q, k) => { if (k) list.push(hc(seq[k - 1][seq[k - 1].length - 1], q[0])); list.push(q); });
    strokes(list.map(q => q.map(BAG_ROT))); st = BAG_ROT(BAG_LINES.find(l => l.li === 3).path.slice(-1)[0]); }
  else if (name === 'triforce') { lineTo([[0, .82], [-1.05, .82], [0, -.98], [1.05, .82], [0, .82], [-.525, -.08], [.525, -.08], [0, .82]]); st = [0, 1.2]; }
  else if (name === 'mountain') { const t = .12, hc = (a, b) => Array.from({ length: 16 }, (_, q) => [a[0] + (b[0] - a[0]) * q / 15, a[1] + (b[1] - a[1]) * q / 15, .001]), chain = seq => { const list = []; seq.forEach((q, k) => { if (k) list.push(hc(seq[k - 1][seq[k - 1].length - 1], q[0])); list.push(q); }); strokes(list); }; const sun = []; for (let q = 0; q <= 60; q++) { const a = -.6 + q / 60 * TAU; sun.push([.98 + Math.cos(a) * .26, -.62 + Math.sin(a) * .26, .8]); } chain([sun, catW([[-1.75, .72], [-1.2, .48], [-.75, .05], [-.42, -.42], [-.22, -.7], [-.08, -.62], [.08, -.72], [.22, -.68], [.45, -.38], [.8, .06], [1.25, .48], [1.75, .72]], 14, 1, 1)]); st = [0, 1.05]; }
  else if (name === 'vinyl') { lineTo([[1.45, -1.15], [1.35, -.35], [.7, -.12]]); circ([0, 0], 1.0, -.17, 1, 160); for (let q = 1; q <= 260; q++) { const u = q / 260, a = -.17 + u * TAU * 2.2, r = 1.0 - .55 * u; push(Math.cos(a) * r, Math.sin(a) * r); } { const a0 = -.17 + TAU * 2.2; circ([0, 0], .3, a0, 1, 60); circ([0, 0], .07, a0, 1, 20); } st = [-.6, 1.3]; }
  else if (name === 'camera') { lineTo([[-1.3, .1], [-1.3, -.32], [-1.15, -.45], [-.75, -.45], [-.66, -.72], [-.24, -.72], [-.15, -.45], [1.15, -.45], [1.3, -.32], [1.3, .6], [1.15, .75], [-1.15, .75], [-1.3, .6], [-1.3, .1], [-.48, .15]]); circ([0, .15], .48, Math.PI, 1, 90); circ([0, .15], .26, Math.PI, 1, 60); st = [0, 1.15]; }
  else if (name === 'book') { cv([[0, .72], [-.6, .55], [-1.35, .62]]); lineTo([[-1.35, .62], [-1.35, -.6]]); cv([[-1.35, -.6], [-.6, -.7], [0, -.48]]); lineTo([[0, -.48], [0, .72]]); cv([[0, .72], [.6, .55], [1.35, .62]]); lineTo([[1.35, .62], [1.35, -.6]]); cv([[1.35, -.6], [.6, -.7], [0, -.48]]); st = [0, 1.05]; }
  else if (name === 'onsen') { const t = .12, hc = (a, b) => Array.from({ length: 16 }, (_, q) => [a[0] + (b[0] - a[0]) * q / 15, a[1] + (b[1] - a[1]) * q / 15, .001]), chain = seq => { const list = []; seq.forEach((q, k) => { if (k) list.push(hc(seq[k - 1][seq[k - 1].length - 1], q[0])); list.push(q); }); strokes(list); }; const ov = []; for (let k = 0; k <= 30; k++) { const th = Math.PI + .78 - k / 30 * (Math.PI + 1.56); ov.push([Math.cos(th) * 1.08, .32 + Math.sin(th) * .62, 1]); } chain([ov, ...[[-.42, -.78], [0, -.98], [.42, -.78]].map(([x, top]) => catW([[x, .58], [x + .12, .32], [x - .08, .05], [x + .1, -.24], [x - .04, (top - .24) / 2 - .12], [x + .04, top]], 10, 1, .6))]); st = [0, 1.25]; }
  else if (name === 'lotus') { cv([[-1.55, .72], [-.8, .62], [0, .55]]); const B = [0, .55]; [[-1.25, .9, .22], [-.65, 1.15, .28], [0, 1.45, .3], [.65, 1.15, .28], [1.25, .9, .22]].forEach(([a, Lp, wp]) => { const d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)], T = [B[0] + d[0] * Lp, B[1] + d[1] * Lp]; cv([B, [B[0] + d[0] * Lp * .5 - n[0] * wp, B[1] + d[1] * Lp * .5 - n[1] * wp], T, [B[0] + d[0] * Lp * .5 + n[0] * wp, B[1] + d[1] * Lp * .5 + n[1] * wp], B], 16); }); cv([[0, .55], [.8, .62], [1.55, .72]]); st = [0, 1.1]; }
  else if (name === 'coffee') { const t = .001, hc = (a, b) => Array.from({ length: 16 }, (_, q) => [a[0] + (b[0] - a[0]) * q / 15, a[1] + (b[1] - a[1]) * q / 15, t]);
    // 3/4 view latte: rim, coffee surface, heart in the foam, rosetta lines, bowl, handle, a highlight
    const ell = (c, rx, ry, a0, turns, n, w) => Array.from({ length: n + 1 }, (_, q) => { const a = a0 + q / n * Math.PI * 2 * turns; return [c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry, w]; });
    const rim = ell([0, -.36], 1.0, .3, Math.PI, 1.02, 60, 1), liq = ell([0, -.32], .84, .21, Math.PI * .95, 1.0, 50, .65);
    const heart = Array.from({ length: 41 }, (_, q) => { const a = q / 40 * Math.PI * 2, x = 16 * Math.sin(a) ** 3, y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); return [x * .019, -.37 + y * .0098, .8]; });
    const chev = (dy, wd) => catW([[-wd, -.37 + dy * .3], [0, -.3 + dy], [wd, -.37 + dy * .3]], 10, .5, .5);
    const bowl = catW([[-1.0, -.36], [-.96, .02], [-.74, .42], [-.34, .62], [0, .66], [.34, .62], [.74, .42], [.96, .02], [1.0, -.36]], 12, 1, 1);
    const handle = catW([[.95, -.14], [1.24, -.22], [1.42, -.02], [1.3, .24], [.84, .34]], 10, .95, .8), shine = catW([[-.74, .02], [-.66, .24], [-.5, .42]], 6, .5, .35);
    const seq = [rim, liq, heart, chev(.13, .5), shine, bowl, handle], list = []; seq.forEach((q, k) => { if (k) list.push(hc(q === heart ? [0, -.32] : seq[k - 1][seq[k - 1].length - 1], q[0])); list.push(q); }); strokes(list); st = [0, 1.15]; }
  else if (name === 'headphones') { circ([-.72, .35], .28, -Math.PI / 2, 1, 70, .45); cv([[-.72, -.1], [-.8, -.58], [-.45, -.98], [0, -1.08], [.45, -.98], [.8, -.58], [.72, -.1]]); circ([.72, .35], .28, -Math.PI / 2, 1, 70, .45); st = [0, 1.15]; }
  else if (name === 'plane') { const half = [[0, -1.28], [.09, -1.22], [.15, -1.02], [.16, -.34], [1.22, .2], [1.26, .3], [1.24, .4], [.16, .1], [.14, .7], [.52, .98], [.54, 1.08], [.5, 1.12], [.06, 1.0], [0, 1.02]], full = [...half, ...half.slice(0, -1).reverse().map(p => [-p[0], p[1]])], ra = Math.PI / 4; lineTo(full.map(p => [p[0] * Math.cos(ra) - p[1] * Math.sin(ra), p[0] * Math.sin(ra) + p[1] * Math.cos(ra)])); st = [-.95, 1.05]; }
  else if (name === 'octopus') {
    const t = .1, L2 = [], head = [];
    for (let q = 0; q <= 48; q++) { const a = Math.PI * .5 + q / 48 * Math.PI * 2; head.push([Math.cos(a) * .5, -.55 + Math.sin(a) * .45, 1.1]); }
    L2.push(head);
    let prev = head[head.length - 1];
    [[-1, 1.15], [-1, .55], [1, .55], [1, 1.15]].forEach(([sd, spread], k) => {
      const arm = [], b = [sd * .22 * (k === 1 || k === 2 ? .5 : 1), -.12];
      for (let q = 0; q <= 40; q++) { const u = q / 40, x = b[0] + sd * spread * Math.sin(u * Math.PI * .5), y = b[1] + u * 1.15; arm.push([x, y, 1 - .45 * u]); }
      const e = arm[arm.length - 1], r0 = .27, c = [e[0] - sd * r0, e[1]];
      for (let q = 1; q <= 60; q++) { const u = q / 60, a = u * Math.PI * 2.2, r = r0 * (1 - u * .5); arm.push([c[0] + sd * Math.cos(a) * r, c[1] + Math.sin(a) * r, .55 - .12 * u]); }
      L2.push([[prev[0], prev[1], t], [b[0], b[1], t]], arm); prev = arm[arm.length - 1];
    });
    strokes(L2);
    st = [0, 1.55];
  }
  else if (name === 'hangul') {
    // a name stamp (dojang): the red line cuts the square and the letters are written inside it, one stroke per line. The black ink writes ㅁ: its left side, then top and right as one stroke, then the base
    const t = .02;
    strokes([[[-.78, -.82, 1], [-.78, -.16, 1]], [[-.78, -.16, t], [-.78, -.82, t]], [[-.78, -.82, 1], [-.12, -.82, 1], [-.12, -.16, 1]],
      [[-.12, -.16, t], [-.78, -.16, t]], [[-.78, -.16, 1], [-.12, -.16, 1]]]);
    st = [.38, .85];
  }
  else if (name === 'spring') {
    const t = .12;
    strokes([[[-1.95, .2, 1.1], [-1.6, -.02, 1.5], [-1.1, -.1, 1.35], [-.55, .04, 1.1], [-.05, .1, .9], [.4, -.04, .7], [.82, -.2, .45], [1.15, -.26, .2]],
      [[1.15, -.26, t], [-1.35, .02, t]], [[-1.35, .02, 1.15], [-1.42, .45, 1.0], [-1.28, .86, .7], [-.92, 1.08, .4], [-.7, 1.15, .22]],
      [[-.7, 1.15, t], [-.62, .02, t]], [[-.62, .02, .7], [-.46, -.4, .45], [-.34, -.7, .22]],
      [[-.34, -.7, t], [.3, .04, t]], [[.3, .04, .6], [.58, .24, .38], [.9, .3, .22]],
      [[.9, .3, t], [.62, -.12, t]], [[.62, -.12, .55], [.72, -.55, .35], [.86, -.9, .22]]]);
    // cherry petals, brushed by the red line: most resting along the branches, a few drifting in the air below them.
    // [centre x, y, angle, size] in unit coordinates; the brush visits them left to right and ends on the petal by the twig
    const PET = [[-1.76, .03, 2.6, .95], [-1.45, .5, .5, 1], [-1.2, .95, 1.9, .95], [-1.05, -.17, 2.1, 1.05], [-.95, .5, 2.9, .85], [-.85, 1.12, .2, .9],
      [-.55, -.4, 1.2, 1], [-.5, .1, 4.0, .95], [-.3, -.8, 3.6, .95], [-.2, .6, 1.5, .85], [.05, .02, .8, 1.05], [.42, .17, 2.4, .95], [.55, .75, 3.3, .8],
      [.6, .28, 2.6, 1], [.68, -.38, 1.9, .95], [.76, -.62, 4.4, 1], [.95, -.2, 5.2, .95], [1.2, -.33, .3, 1]];
    const lp = [], lq = (x, y, w) => lp.push([cx + x * R, cy + y * R, w]);
    PET.forEach(([x, y, a, sz], k) => { blooms.push([cx + x * R, cy + y * R]);
      // one petal in one movement of the brush: out from its narrow base along one side, round the notched tip and back along the other,
      // so the brush fills it. It is a little cupped, so one side bows more than the other
      const L1 = .13 * sz, c = Math.cos(a), sn = Math.sin(a), bx = x - c * L1 / 2, by = y - sn * L1 / 2, at = (d, side) => [bx + c * d - sn * side, by + sn * d + c * side];
      // the brush lifts between petals: the lift is set a hair from the last mark, or resampling would drop it and fade the weight across the move
      if (k) { const p0 = lp[lp.length - 1]; lq((p0[0] - cx) / R + .002, (p0[1] - cy) / R, t); lq(bx - .002, by, t); }
      // the brush sets down a little before the first petal, unseen, so that petal is already at full pressure
      else { lq(bx - .28, by + .04, t); lq(bx - .002, by, t); }
      [[0, 0, .45], [.25, -.018, 1], [.58, -.026, 1.15], [.88, -.02, 1], [1, -.009, .85], [.9, 0, .75], [1, .009, .85], [.88, .018, 1], [.58, .024, 1.15], [.25, .016, 1], [.02, 0, .5]]
        .forEach(([u, sw, w]) => lq(...at(L1 * u, sw * sz), w)); });
    // after the last petal, red carries on as a little twig out to the Sound dot
    [[1.3, -.27], [1.42, -.22], [1.54, -.26], [1.64, -.39]].forEach(([x, y]) => lq(x, y, 1));
    colorPaths[1] = chaikin(resample(lp, CP_STEP), 1);
    st = [-.2, 1.42];
  }
  else if (name === 'maple') {
    // one stroke round the leaf: base notch, left half up to the top lobe, right half back down. Teeth are sharp turns the brush rounds a little
    const R0 = [[0, .6], [.2, .62], [.5, .5], [.85, .5], [.62, .32], [.44, .2], [.62, .04], [.95, -.04], [.86, -.22], [1.05, -.45], [.74, -.42], [.62, -.6], [.55, -.42], [.2, -.3], [.3, -.58], [.24, -.58], [.32, -.86], [.14, -.82], [0, -1.15]];
    const ring = R0.map(p => [-p[0], p[1]]).concat(R0.slice(0, -1).reverse()), out = [];
    for (let k = 0; k < ring.length - 1; k++) { const a = ring[k], b = ring[k + 1], n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .03)); for (let q = k ? 1 : 0; q <= n; q++) out.push([a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n, .72]); }
    strokes([out]);
    st = [0, -.9];
  }
  else if (name === 'frog') {
    const t = .12, hc = (a, b) => Array.from({ length: 16 }, (_, q) => [a[0] + (b[0] - a[0]) * q / 15, a[1] + (b[1] - a[1]) * q / 15, .001]);
    const body = catW([[-.55, .95], [-.95, .6], [-1.02, .05], [-.85, -.35], [-.75, -.62], [-.6, -.85], [-.35, -.8], [-.28, -.5], [0, -.42], [.28, -.5], [.35, -.8], [.6, -.85], [.75, -.62], [.85, -.35], [1.02, .05], [.95, .6], [.55, .95], [0, .88], [-.55, .95]], 14, 1.15, 1.0);
    const smile = catW([[-.46, .04], [-.24, .22], [0, .27], [.24, .22], [.46, .04]], 12, .8, .8);
    const hand = sd => catW([[sd * .3, .9], [sd * .34, 1.06], [sd * .5, 1.16], [sd * .68, 1.1], [sd * .72, .93]], 10, 1.15, 1.05);
    const hL = hand(-1), hR = hand(1);
    strokes([body, hc(body[body.length - 1], smile[0]), smile, hc(smile[smile.length - 1], hL[0]), hL, hc(hL[hL.length - 1], hR[0]), hR]);
    extra.push([cx - .53 * R, cy - .62 * R], [cx + .53 * R, cy - .62 * R]);
    st = [0, 1.4];
  }
  else { for (let i = 0; i <= 360; i++) { const u = i / 360, th = Math.PI * .5 + .35 + u * Math.PI * 2 * .9, wob = 1 + .018 * Math.sin(u * 5 + 1); push(Math.cos(th) * wob, Math.sin(th) * wob); } st = [0, 1.12]; }
  { const S = u => [cx + u[0] * R, cy + u[1] * R], vis = i => (P[i][2] ?? 1) >= .2;
    const nearI = u => { const p = S(u); let b = 1e18, bi = 0; for (let i = 0; i < P.length; i++) if (vis(i)) { const d = (P[i][0] - p[0]) ** 2 + (P[i][1] - p[1]) ** 2; if (d < b) { b = d; bi = i; } } return bi; };
    const spP = (u, dr = 0) => { const r = 1.15 * Math.pow(1 - u, .8) + .04 + dr, th = Math.PI * .5 + u * Math.PI * 2 * 2.4; return [Math.cos(th) * r, Math.sin(th) * r]; };
    const pet = (a, Lp, wp, li) => { const B = [0, .55], d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)]; return { li, f: [B[0] + d[0] * Lp * .4 - n[0] * wp * .8, B[1] + d[1] * Lp * .4 - n[1] * wp * .8], t: [B[0] + d[0] * Lp, B[1] + d[1] * Lp], e: [B[0] + d[0] * (Lp + .16), B[1] + d[1] * (Lp + .16)] }; };
    const arm = (sd, spread, inner, li) => { const b0 = sd * .22 * (inner ? .5 : 1), ex = b0 + sd * spread; return { li, f: [b0 + sd * spread * .6, .3], t: [ex, 1.0], e: [ex - sd * .27, 1.03] }; };
    const IN = {
      enso: [{ li: 6, f: [Math.cos(3.3), Math.sin(3.3)], t: [Math.cos(4.0), Math.sin(4.0)], e: [-.24, -.42] }, { li: 5, f: [1, 0], t: [Math.cos(.62), Math.sin(.62)], e: [.38, .26] }],
      spiral: [.4, .58, .74].map((u, k) => ({ li: 4 + k, f: spP(u - .07), t: spP(u), e: spP(u + .01, -.15) })),
      // triskele: orange, green and purple each echo one arm on its inner side (the same curve, drawn in a little), ending well inside it
      triskele: [[4, 1], [5, 2], [6, 0]].map(([li, k]) => ({ li, path: Array.from({ length: 31 }, (_, q) => { const u = .3 + q / 30 * .6, a = Math.PI / 2 + k * Math.PI * 2 / 3, th = a - 2.5 + u * 2.5, rr = (.08 + 1.05 * Math.pow(u, .9)) * .78; return [Math.cos(th) * rr, Math.sin(th) * rr]; }) })),
      // triforce: each small triangle gets its own pattern. Orange spirals in to the heart of the top one, green zigzags along the
      // left one's base like a row of little peaks, purple traces a smaller triangle inside the right one
      triforce: [{ li: 4, path: Array.from({ length: 49 }, (_, q) => { const u = q / 48, a = -Math.PI / 2 + u * Math.PI * 2 * 1.4, r = .24 * (1 - .9 * u); return [Math.cos(a) * r, -.36 + Math.sin(a) * r]; }) },
        { li: 5, path: [[-.86, .68], [-.75, .5], [-.64, .68], [-.53, .44], [-.42, .68], [-.31, .5], [-.2, .68]] },
        { li: 6, path: [[.3, .66], [.4, .665], [.65, .665], [.75, .66], [.7, .57], [.58, .33], [.525, .24], [.47, .33], [.36, .55], [.33, .61]] }],
      gameboy: [{ li: 4, path: [[-.42, -.22], [-.3, -.3], [-.18, -.44], [-.02, -.56]] }, { li: 5, path: [[.8, -.05], [.72, .1], [.6, .2], [.47, .27]] }, { li: 6, path: [[.62, .72], [.48, .62], [.32, .52], [.21, .45]] }],
      // book: the coloured lines are handwritten notes. Left page: red, blue, green, each written towards its dot on the left;
      // right page: purple, yellow, orange, each written out to its dot on the right
      book: BOOK_NOTES.map(([li, dx, f, ex], i) => ({ li, path: Array.from({ length: 15 }, (_, q) => { const u = q / 14, x = ex + (dx - ex) * u; return [x, bookRowY(x, f) + .01 * Math.sin(u * 19 + i * 1.7) + .005 * Math.sin(u * 47 + i)]; }) })),
      coffee: [{ li: 4, path: [[-.66, -.4], [-.3, -.49], [.15, -.5], [.58, -.43]] }, { li: 5, path: [[-.8, -.02], [-.66, .28], [-.4, .48], [-.08, .57]] }, { li: 6, path: [[.62, -.24], [.4, -.27], [.2, -.3], [.06, -.33]] }],
      headphones: [[1, -.72, 1], [2, .72, -1]].map(([li, x, sd]) => { const path = []; for (let q = 0; q <= 16; q++) { const u = q / 16, a = -Math.PI / 2 - sd * u * Math.PI * 1.7, r = .17 * (1 - .9 * u); path.push([x + Math.cos(a) * r, .35 + Math.sin(a) * r * 1.5]); } return { li, path }; }),
      maple: (() => { const vp = (li, ctrl) => { const o = []; cat(ctrl, 10, (x, y) => o.push([x, y])); return { li, path: o }; };
        return [vp(3, [[0, .5], [.01, .05], [-.01, -.45], [0, -.88]]), vp(1, [[0, .5], [-.3, .16], [-.58, -.18], [-.84, -.38]]), vp(2, [[0, .5], [.3, .16], [.58, -.18], [.84, -.38]]),
          vp(4, [[0, .5], [-.3, .44], [-.66, .46]]), vp(5, [[0, .5], [.3, .44], [.66, .46]]), vp(6, [[0, .62], [.02, .84], [.07, 1.04], [.05, 1.24]])]; })(),
      lotus: [[-1.25, .9, .22, 1], [-.65, 1.15, .28, 4], [0, 1.45, .3, 3], [.65, 1.15, .28, 5], [1.25, .9, .22, 2]].map(([a, Lp, wp, li]) => { const B = [0, .55], d = [Math.sin(a), -Math.cos(a)], n = [Math.cos(a), Math.sin(a)], sg = a > 0 ? 1 : -1, path = [];
        for (let q = 0; q <= 10; q++) { const u = .08 + .92 * q / 10, b = Math.sin(Math.PI * u) * wp * .62 * sg; path.push([B[0] + d[0] * Lp * u + n[0] * b, B[1] + d[1] * Lp * u + n[1] * b]); }
        path.push([B[0] + d[0] * (Lp + .12), B[1] + d[1] * (Lp + .12)]); return { li, path }; }).concat([{ li: 6, path: [[0, .6], [.01, .8], [.03, 1.0], [.02, 1.2], [-.02, 1.38]] }]),
      camera: [{ li: 4, f: [-.26, .15], t: [0, -.11], e: [0, .15] }, { li: 5, f: [-.75, -.45], t: [-.5, -.72], e: [-.45, -.58] }, { li: 6, f: [.55, -.45], t: [1.2, -.42], e: [.95, -.22] }],
      // spring: purple sprouts its own small twig to the upper left instead of ending at the top-right twig tip beside the black ink dot
      octopus: [arm(-1, 1.15, 0, 3), arm(-1, .55, 1, 4), arm(1, .55, 1, 5), arm(1, 1.15, 0, 6)],
      wave: WAVES.map(([li, x0, y0, w, h, o]) => ({ li, path: li === 3 ? blueRide : miniWave(x0, y0, w, h, o) })),
      egg: [{ li: 2, w: 2.1, path: [].concat(Array.from({ length: 141 }, (_, q) => { const u = q / 140, a = Math.PI * .22 - u * Math.PI * 2 * 4.4, rr = .42 * Math.min(1, 1.3 * (1 - u)) + .004; return [.18 + Math.cos(a) * rr * 1.08, -.12 + Math.sin(a) * rr * .9]; })) }, 
        // orange runs inside the white along its top, green inside it along the bottom, purple circles outside the yolk; each ends well apart
        { li: 4, path: eggArc(Math.PI * .97, Math.PI * 1.8, .78) }, { li: 5, path: eggArc(Math.PI * .22, Math.PI * .8, .84) },
        { li: 6, path: Array.from({ length: 49 }, (_, q) => { const a = -Math.PI * .08 + q / 48 * Math.PI * 1.1; return [.18 + Math.cos(a) * .66, -.12 + Math.sin(a) * .56]; }) }],
      // mountain: red circles the sun on its own; orange is a second halo round it. Yellow is the snow line under the summit, blue a river
      // winding down from where the snow melts, purple a gull gliding in the sky to the left
      mountain: [{ li: 2, path: [[-.4, -.44], [-.29, -.35], [-.18, -.45], [-.06, -.34], [.06, -.45], [.17, -.35], [.28, -.44], [.36, -.4]] },
        { li: 3, path: [[-.17, -.26], [.05, .02], [-.13, .3], [.08, .56], [.02, .86]] },
        { li: 4, path: Array.from({ length: 25 }, (_, q) => { const a = 2.25 + q / 24 * 2.6; return [.98 + Math.cos(a) * .44, -.62 + Math.sin(a) * .44]; }) },
        { li: 6, path: [[-1.66, -.96], [-1.54, -1.05], [-1.42, -1.0], [-1.33, -.92], [-1.24, -1.0], [-1.12, -1.06], [-.99, -.98]] }],
      // onsen: orange, green and purple are wisps of steam rising out of the bath beside the black ones
      onsen: [{ li: 4, path: wisp(-.78, .36, -.36, .07, .3) }, { li: 6, path: wisp(-.21, .3, -.42, .05, 2.1) }, { li: 5, path: wisp(.79, .36, -.36, .07, 4.0) }],
      // spring: red draws the blossoms (see the shape), blue rides the drooping branch, yellow the upright branch and green the lower right one, each on past its tip blossom so the dot sits clear of it; orange its own twig in the open on the left
      spring: [{ li: 3, path: [[-1.31, .08], [-1.37, .45], [-1.24, .82], [-.9, 1.03], [-.66, 1.11], [-.52, 1.17], [-.4, 1.24]] }, { li: 2, path: [[-.58, 0], [-.43, -.4], [-.31, -.7], [-.25, -.87], [-.2, -1.0]] },
        { li: 4, path: [[-1.58, -.04], [-1.67, -.3], [-1.66, -.52], [-1.57, -.7]] },
        { li: 5, path: [[.36, .09], [.6, .26], [.9, .32], [1.06, .36], [1.2, .43]] }, { li: 6, path: [[.66, -.2], [.62, -.45], [.52, -.66], [.38, -.84]] }],
      // plane: red and green are the navigation lights on the port and starboard wingtips; the others stream behind as contrails
      plane: (() => { const rot = ([x, y]) => [(x - y) * Math.SQRT1_2, (x + y) * Math.SQRT1_2], trail = (ex, L, ph) => Array.from({ length: 9 }, (_, q) => { const u = q / 8, ey = .4 - .3 * (ex < 0 ? (ex + 1.24) / 1.08 : (1.24 - ex) / 1.08); return rot([ex + .03 * Math.sin(u * Math.PI * 2 + ph) * u, ey + .07 + L * u]); });
        // red and green are the wind streaming back off the port and starboard wingtips
        return [{ li: 1, path: planeWind(-1, .6) }, { li: 5, path: planeWind(1, 2.4) },
          { li: 2, path: trail(-.86, .9, .4) }, { li: 4, path: trail(-.48, .45, 1.6) }, { li: 6, path: trail(.48, .45, 2.9) }, { li: 3, path: trail(.86, .9, 4.1) }]; })(),
      // longfins: green runs down the left blade beside its rib, orange down the right blade beside its rib, purple down the outside of the right fin, ending clear of its outline
      longfins: [{ li: 5, path: [[.1, -.35], [.1, .1], [.1, .55], [.1, .95]].map(p => finPt(-.4, .16, p)) }, { li: 4, path: [[-.1, -.35], [-.1, .1], [-.1, .55], [-.1, .95]].map(p => finPt(.4, -.16, p)) },
        { li: 6, path: [[.3, -.55], [.32, -.3], [.39, -.1], [.49, .5], [.57, .9], [.66, 1.06]].map(p => finPt(.4, -.16, p)) }],
      // hangul (마크, a name stamp): red cuts the stamp's square, clockwise from its top left corner (Sound's dot ends there); the others write
      // the letters over the red: purple ㅏ's upright, yellow its arm (Library's dot at the tip), green ㅋ's top and side, orange ㅋ's middle bar
      // (right to left, so its dot sits clear of green), blue the ㅡ (Freediving's dot at its right end). Points close to each corner keep it square
      hangul: [{ li: 1, path: SEAL_SQ }, { li: 6, path: [[.3, -.92], [.3, -.64], [.3, -.36], [.3, -.1]] }, { li: 2, path: [[.3, -.5], [.45, -.5], [.6, -.5], [.74, -.5]] },
        { li: 5, path: [[-.8, .1], [-.2, .1], [.4, .1], [.68, .1], [.72, .12], [.72, .3], [.72, .54]] }, { li: 4, path: [[.62, .33], [.14, .33], [-.34, .33], [-.8, .33]] },
        { li: 3, path: [[-.84, .76], [-.28, .76], [.28, .76], [.84, .76]] }],
      // samurai: one coloured line comes in to the middle of each of the six circles
      muaythai: BAG_LINES.map(({ li, path }) => ({ li, path: path.map(p => BAG_ROT(p)) })),
      samurai: [{ li: 1, path: [[-.95, -1.05], [-.7, -.9], [-.45, -.7], [-.26, -.61]] }, { li: 2, path: [[.95, -1.05], [.7, -.9], [.45, -.7], [.26, -.61]] }, { li: 3, path: [[-1.0, -.2], [-.7, -.32], [-.45, -.31], [-.26, -.27]] },
        { li: 4, path: [[.82, -.67], [.64, -.47], [.44, -.32], [.26, -.27]] }, { li: 5, path: [[-.9, .45], [-.66, .3], [-.44, .13], [-.26, .07]] }, { li: 6, path: [[.9, .45], [.66, .3], [.44, .13], [.26, .07]] }]
    }[name];
    if (IN) for (const sp of IN) { let pts = [];
      if (sp.path) { const o = []; cat(sp.path, 6, (x, y) => o.push(S([x, y]))); pts = o; }
      else { const iF = nearI(sp.f), iT = nearI(sp.t), dir = iT >= iF ? 1 : -1, E = S(sp.e), ride = [];
        for (let i = iF; dir > 0 ? i <= iT : i >= iT; i += dir) { if (!vis(i)) break; ride.push(P[i]); }
        if (ride.length < 2) ride.push(P[iT]);
        const A0 = ride[ride.length - 1], nx = ride[Math.max(0, ride.length - 3)], tx0 = A0[0] - nx[0], ty0 = A0[1] - nx[1], tl0 = Math.hypot(tx0, ty0) || 1, sg = ((E[0] - A0[0]) * -ty0 + (E[1] - A0[1]) * tx0) >= 0 ? 1 : -1, off = 7;
        for (let k = 0; k < ride.length; k++) { const a = ride[Math.max(0, k - 2)], b = ride[Math.min(ride.length - 1, k + 2)], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1, f = Math.min(1, k / 6); pts.push([ride[k][0] - ty / tl * off * sg * f, ride[k][1] + tx / tl * off * sg * f]); }
        const A = pts[pts.length - 1], T = [tx0 / tl0, ty0 / tl0], dd = Math.hypot(E[0] - A[0], E[1] - A[1]), k1 = Math.min(dd * .6, R * .45), C1 = [A[0] + T[0] * k1, A[1] + T[1] * k1], C2 = [E[0] + (C1[0] - E[0]) * .3, E[1] + (C1[1] - E[1]) * .3];
        for (let q = 1; q <= 24; q++) { const u = q / 24, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3; pts.push([a * A[0] + b * C1[0] + c * C2[0] + d * E[0], a * A[1] + b * C1[1] + c * C2[1] + d * E[1]]); } }
      colorPaths[sp.li] = chaikin(resample(pts.map(p => [p[0], p[1], sp.w || 1]), CP_STEP), 1); } }
  const glyph = ['egg', 'samurai', 'hangul', 'spring', 'octopus', 'maple', 'signature', 'triskele', 'frog', 'plane', 'triforce', 'onsen', 'mountain', 'muaythai', 'coffee', 'fox', 'gameboy', 'longfins'].includes(name);
  const gRes = name === 'hangul' ? [6, 3] : [7, 3];
  let Q = glyph ? chaikin(resample(P, gRes[0]), gRes[1]) : chaikin(resample(P, 20), 4);
  if (['wave'].includes(name)) Q = chaikin(resample(loopify(resample(Q, 4), R), 4), 1);
  const out = [Q[0]];
  for (let i = 1; i < Q.length; i++) { const d = Math.hypot(Q[i][0] - out[out.length - 1][0], Q[i][1] - out[out.length - 1][1]); if (d >= 4.5 || i === Q.length - 1) out.push(Q[i]); }
  const lTip = (a, Lp) => [cx + Math.sin(a) * (Lp + .12) * R, cy + (.55 - Math.cos(a) * (Lp + .12)) * R];
  const wEnd = li => { const W0 = WAVES.find(v => v[0] === li), p = li === 3 ? blueRide : miniWave(...W0.slice(1)), e = p[p.length - 1]; return [cx + e[0] * R, cy + e[1] * R]; };
  const stOv = name === 'maple' ? { sound: [cx - .84 * R, cy - .38 * R], journal: [cx + .84 * R, cy - .38 * R], freediving: [cx, cy - .88 * R], labelAt: { sound: [cx - 1.08 * R, cy - .72 * R], journal: [cx + 1.08 * R, cy - .72 * R], freediving: [cx, cy - 1.38 * R] } } : name === 'headphones' ? { sound: [cx - .72 * R, cy + .35 * R], journal: [cx + .72 * R, cy + .35 * R], labelAt: { sound: [cx - .72 * R, cy + 1.0 * R], journal: [cx + .72 * R, cy + 1.0 * R] } } : name === 'octopus' ? { freediving: [cx + (-.22 - 1.15 + .27) * R, cy + 1.03 * R] } : name === 'wave' ? { sound: wEnd(1), journal: wEnd(2), freediving: wEnd(3), labelAt: (() => { const lc = (li, dx, dy, deg, sc) => { const W0 = WAVES.find(v => v[0] === li), [C, r] = miniC(...W0.slice(1)); return [cx + (C[0] + dx * r) * R, cy + (C[1] + dy * r) * R, deg, sc]; };
        return { freediving: [cx + 1.3 * R, cy - .58 * R, -9, 1.18], sound: lc(1, -1.6, -1.7, -12, .92), journal: lc(2, -1.3, -2.3, -4, 1.04) }; })() } : name === 'lotus' ? { sound: lTip(-1.25, .9), journal: lTip(1.25, .9), freediving: lTip(0, 1.45) } : name === 'egg' ? { journal: [cx + .18 * R, cy - .12 * R], labelAt: { journal: [cx + .18 * R, cy + .4 * R] } } : name === 'book' ? { sound: [cx - 1.17 * R, cy + bookRowY(-1.17, .25) * R], freediving: [cx - 1.16 * R, cy + bookRowY(-1.16, .5) * R], journal: [cx + 1.15 * R, cy + bookRowY(1.15, .5) * R],
        // labels sit just outside the pages, level with their dots (32 px gap plus half the label's width)
        labelAt: { sound: [cx - 1.17 * R - 69, cy + bookRowY(-1.17, .25) * R], freediving: [cx - 1.16 * R - 88, cy + bookRowY(-1.16, .5) * R], journal: [cx + 1.15 * R + 73, cy + bookRowY(1.15, .5) * R] } } : name === 'triskele' ? { freediving: [cx + .62 * R, cy + 1.12 * R] } : name === 'mountain' ? { freediving: [cx + .02 * R, cy + .86 * R], journal: [cx + .36 * R, cy - .4 * R] } : name === 'spring' ? { sound: [cx + 1.64 * R, cy - .39 * R], journal: [cx - .2 * R, cy - 1.0 * R], freediving: [cx - .4 * R, cy + 1.24 * R] } : name === 'plane' ? (() => { const end = (ex, L) => { const ey = .4 - .3 * (ex < 0 ? (ex + 1.24) / 1.08 : (1.24 - ex) / 1.08) + .07 + L; return [cx + (ex - ey) * Math.SQRT1_2 * R, cy + (ex + ey) * Math.SQRT1_2 * R]; }; const w = planeWind(-1, .6).pop(); return { sound: [cx + w[0] * R, cy + w[1] * R], journal: end(-.86, .9), freediving: end(.86, .9) }; })() : name === 'hangul' ? { sound: [cx - SEAL.x * R, cy - (SEAL.y - .01) * R], journal: [cx + .74 * R, cy - .5 * R], freediving: [cx + .84 * R, cy + .76 * R],
        // labels sit just outside the stamp's right edge, clear of the letters
        labelAt: { journal: [cx + SEAL.x * R + 58, cy - .5 * R], freediving: [cx + SEAL.x * R + 74, cy + .76 * R] } } : name === 'muaythai' ? (() => { const end = li => { const e = BAG_ROT(BAG_LINES.find(l => l.li === li).path.slice(-1)[0]); return [cx + e[0] * R, cy + e[1] * R]; }; return { sound: end(1), journal: end(2), freediving: end(3) }; })() : name === 'samurai' ? { sound: [cx - .26 * R, cy - .61 * R], journal: [cx + .26 * R, cy - .61 * R], freediving: [cx - .26 * R, cy - .27 * R], labelAt: { sound: [cx - .26 * R, cy - .99 * R], journal: [cx + .26 * R, cy - .99 * R], freediving: [cx - .68 * R, cy - .1 * R] } } : null;
  return { pts: out, station: [cx + st[0] * R, cy + st[1] * R], dots: extra, blooms, colorPaths, stOv };
}

class Component extends DCLogic {
  canvasRef = React.createRef(); btnRef = React.createRef(); sndRef = React.createRef(); jrnRef = React.createRef();
  T = 0; go = null; hov = 0; hovT = 0; hovPg = {}; hovPgT = {};

  componentDidMount() {
    const r = rng(5), gc = document.createElement('canvas'); gc.width = gc.height = 220;
    { const x = gc.getContext('2d'), im = x.createImageData(220, 220); for (let i = 0; i < im.data.length; i += 4) { const v = 255 - Math.pow(r(), 3) * 40; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); }
    this.grainC = gc;
    this.fromDive = /from=dive/.test(location.search);
    { let nt = 'navigate'; try { nt = performance.getEntriesByType('navigation')[0].type; } catch (e) {} if (nt === 'reload' || !this.fromDive) try { sessionStorage.removeItem('shape-seen'); } catch (e) {} }
    let last = null; try { last = sessionStorage.getItem('home-shape'); } catch (e) {}
    this.pick = pickShape(last); if (import.meta.env.DEV) window.__home = this; // (for the local symbol picker only)
    try { if (this.fromDive) { const nf = JSON.parse(sessionStorage.getItem('nav-from') || 'null'); if (nf) this.navArrive = nf; } } catch (e) {}
    setTimeout(() => { try { sessionStorage.removeItem('nav-from'); } catch (e) {} }, 4000);
    this.raf = requestAnimationFrame(this.tick);
  }
  componentWillUnmount() { cancelAnimationFrame(this.raf); if (this.offTap) document.removeEventListener('pointerdown', this.offTap); }
  // paint, not outline. Four things real strokes do:
  // 1. ridges catch the light: one light from the upper left, so the edge facing it gets a pale highlight and the opposite edge a soft shadow, swapping as the stroke turns
  // 2. colour mixed on the brush stays in stripes: two or three bands of the same hue, a little lighter or deeper, running the length of the stroke
  // 3. the brush is fullest where it lands: the first stretch is richer and the ridges heavier
  // 4. it runs out: towards the tail bristles lose contact and paper shows through in fine gaps (dry brush)
  streaks(cx3, qs, col, ink) {
    if (!this.colRGB) this.colRGB = {}; let base = this.colRGB[col]; if (!base) { const m = col.match(/\d+/g); base = this.colRGB[col] = m ? m.slice(0, 3).map(Number) : [0, 0, 0]; }
    const mix = (c2, k) => 'rgb(' + base.map((v, i) => Math.round(v + (c2[i] - v) * k)).join(',') + ')', LT = ink ? [110, 108, 104] : [255, 253, 244], DK = ink ? [0, 0, 0] : [14, 8, 30], PAPER = [245, 243, 238];
    let sd = 0; for (let i = 0; i < col.length; i++) sd = (sd * 31 + col.charCodeAt(i)) % 997;
    const n = qs.length, lx = -.6, ly = -.8, bins = new Map(), P = (A, B, f) => [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f];
    const put = (key, style, a, q, f0a, f1a, f0b, f1b) => { let e = bins.get(key); if (!e) bins.set(key, e = { style, a, p: new Path2D() }); const s0 = P(q[0], q[3], f0a), s1 = P(q[1], q[2], f0b), s2 = P(q[1], q[2], f1b), s3 = P(q[0], q[3], f1a); e.p.moveTo(s0[0], s0[1]); e.p.lineTo(s1[0], s1[1]); e.p.lineTo(s2[0], s2[1]); e.p.lineTo(s3[0], s3[1]); e.p.closePath(); };
    const stripes = [[.18, .2, LT, ink ? .2 : .32], [.5, .14, DK, ink ? .35 : .24], [.68, .16, LT, ink ? .14 : .22]];
    for (let i = 0; i < n; i++) { const q = qs[i].q; if (q.length !== 4) continue; const t = n > 1 ? i / (n - 1) : 0, ph = i * .045 + sd, ph2 = ph + .045, load = 1 - smooth(clamp(t / .18, 0, 1));
      const ex = q[0][0] - q[3][0], ey = q[0][1] - q[3][1], el = Math.hypot(ex, ey) || 1, d = (ex * lx + ey * ly) / el;
      // 1 + 3: ridges, lit or shaded by which way the edge faces; heavier while the brush is loaded
      for (const side of [0, 1]) { const ds = side ? -d : d, lv = Math.round(ds * 2); if (!lv) continue; const ew = (.1 + .05 * Math.sin(ph * 1.3 + side * 2)) * (1 + .7 * load), ew2 = (.1 + .05 * Math.sin(ph2 * 1.3 + side * 2)) * (1 + .7 * load);
        const st = lv > 0 ? mix(LT, (ink ? .22 : .5) * lv / 2) : mix(DK, (ink ? .5 : .32) * -lv / 2); side ? put('r1' + lv, st, .85, q, 1 - ew, 1, 1 - ew2, 1) : put('r0' + lv, st, .85, q, 0, ew, 0, ew2); }
      // 2: brush-mixed stripes that drift across the stroke and swell and thin
      stripes.forEach(([f, w, tc, k], j) => { const u = ph * (.7 + .15 * j) + j * 2.1, u2 = ph2 * (.7 + .15 * j) + j * 2.1, o = .07 * Math.sin(u * .6), o2 = .07 * Math.sin(u2 * .6), ww = w * (.5 + .5 * Math.sin(u * 1.4)), ww2 = w * (.5 + .5 * Math.sin(u2 * 1.4)); if (ww < .02) return;
        const kk = k * (1 + .4 * load); put('s' + j, mix(tc, kk), .7, q, f + o, f + o + ww, f + o2, f + o2 + ww2); });
      // 4: running dry: fine paper-coloured gaps that open up along the tail
      if (t > .55 && !ink) { const dry = smooth((t - .55) / .45); for (let g = 0; g < 4; g++) { const u = ph * 2.3 + g * 1.9; if (Math.sin(u) + .6 * Math.sin(u * 2.7) < 1.3 - 1.6 * dry) continue; const f = .22 + g * .17 + .04 * Math.sin(ph * .9 + g), w = .025 + .03 * dry;
        put('d' + Math.min(2, Math.floor(dry * 3)), 'rgb(' + PAPER.join(',') + ')', .25 + .25 * Math.min(2, Math.floor(dry * 3)), q, f, f + w, f, f + w); } } }
    for (const e of bins.values()) { cx3.fillStyle = e.style; cx3.globalAlpha = e.a; cx3.fill(e.p); }
    cx3.globalAlpha = 1;
  }

  shapeWanted() { const ok = x => SHAPES.includes(x); if (ok(this.override)) return this.override; const s = this.props.shape; return ok(s) ? s : ok(this.pick) ? this.pick : 'enso'; }
  waveY(x, k, t) { return k * 16 + Math.sin(x * .011 + t * .6 + k * 1.3) * 7 * (1 - k * .25) + Math.sin(x * .029 - t * .9 + k * 2) * 3; }

  // how far a symbol reaches either side of its centre, in units of R (measured once per symbol)
  extentOf(name) { this.extC = this.extC || {}; if (this.extC[name]) return this.extC[name]; const U = 100, S = shapeOf(name, 0, 0, U); let m = 0;
    const see = p => { if (p && isFinite(p[0])) m = Math.max(m, Math.abs(p[0])); }; S.pts.forEach(see); Object.values(S.colorPaths || {}).forEach(cp => cp.forEach(see)); see(S.station);
    if (S.stOv) Object.values(S.stOv).forEach(v => { if (Array.isArray(v)) see(v); });
    return (this.extC[name] = Math.max(1, m / U)); }
  build(W, H) {
    // on a narrow screen each symbol is sized to fit its own width (its widest drawing, coloured lines and dots included), so compact ones
    // aren't left tiny; wide ones like the wave still fit. Wider screens keep the fixed proportion
    const R = W < 720 ? Math.min(H * .27, W * .32, (W / 2 - 28) / this.extentOf(this.shapeWanted())) : Math.min(W * .26, H * .27), cx = W / 2, cy = H / 2 - R * .22;
    this.geo = { W, H, cx, cy, R }; this.runA = []; this.shapeName = this.shapeWanted(); this.labelUp = {};
    const SH = shapeOf(this.shapeName, cx, cy, R), SP = SH.pts, NS = SP.length; this.station = SH.station; this.dots = SH.dots; this.blooms = SH.blooms; this.colorPaths = SH.colorPaths || {};
    const nrm = a => a.map((p, i) => { const q = a[Math.min(a.length - 1, i + 1)], r2 = a[Math.max(0, i - 1)], tx = q[0] - r2[0], ty = q[1] - r2[1], l = Math.hypot(tx, ty) || 1; return [-ty / l, tx / l]; });
    const SN = nrm(SP);
    const curv = SP.map((p, i) => { if (i < 2 || i > NS - 3) return 0; const a = Math.atan2(p[1] - SP[i - 2][1], p[0] - SP[i - 2][0]), b = Math.atan2(SP[i + 2][1] - p[1], SP[i + 2][0] - p[0]); let d = Math.abs(b - a); if (d > Math.PI) d = Math.PI * 2 - d; return d; });
    const TAILF = { signature: .55, vinyl: .45, triforce: .55, muaythai: .6 }[this.shapeName], avoidTail = TAILF ? SP.slice(Math.floor(NS * TAILF)).filter((p, i) => i % 3 === 0 && (p[2] ?? 1) >= .2) : null;
    const near = S => { let b = 1e9, bi = 0; SP.forEach((p, i) => { const d = Math.hypot(p[0] - S[0], p[1] - S[1]); if (d < b) { b = d; bi = i; } }); return bi; };
    { const okF = S => S[0] > (W < 720 ? 44 : 70) && S[0] < W - (W < 720 ? 44 : 70) && S[1] > 66 && S[1] < H - 70 && SP.every(p => !(p[0] > S[0] - 80 && p[0] < S[0] + 80 && p[1] > S[1] - 30 && p[1] < S[1] + 80));
      if (!okF(this.station)) { const ox = this.station[0] - cx, oy = this.station[1] - cy, ol = Math.hypot(ox, oy) || 1; for (let d = 12; d <= 240; d += 12) { const S2 = [this.station[0] + ox / ol * d, this.station[1] + oy / ol * d]; if (okF(S2)) { this.station = S2; break; } } } }
    const mX = W < 720 ? 44 : 70, clear = S => S[0] > mX && S[0] < W - mX && S[1] > 66 && S[1] < H - 70 && SP.every(p => !(p[0] > S[0] - 100 && p[0] < S[0] + 100 && p[1] > S[1] - 50 && p[1] < S[1] + 100));
    const auto = (f, dist) => { const i = Math.round(f * (NS - 1)), p = SP[i], dx = p[0] - cx, dy = p[1] - cy, dl = Math.hypot(dx, dy) || 1; return [p[0] + dx / dl * dist, p[1] + dy / dl * dist]; };
    const pickF = (f, avoid) => { for (let t = 0; t < 14; t++) for (let dist = 34; dist <= 220; dist += 16) { const S = auto((f + t * .07) % 1, dist); if (clear(S) && avoid.every(A => Math.hypot(A[0] - S[0], A[1] - S[1]) > 150)) return S; } return auto(f, 120); };
    let sSnd, sJrn;
    { sSnd = pickF(.18, [this.station]); sJrn = pickF(.6, [this.station, sSnd]); }
    if (W < 720) { let yb = -1e9; SP.forEach(p => { if ((p[2] ?? 1) >= .2) yb = Math.max(yb, p[1]); }); const ry = Math.min(H - 90, yb + 84); sSnd = [W * .2, ry]; this.station = [W * .5, ry]; sJrn = [W * .8, ry]; }
    if (SH.stOv && SH.stOv.journal) sJrn = SH.stOv.journal; if (SH.stOv && SH.stOv.sound) sSnd = SH.stOv.sound; if (SH.stOv && SH.stOv.freediving) this.station = SH.stOv.freediving; this.labelAt = SH.stOv && SH.stOv.labelAt || null;
    this.stations = { freediving: this.station, sound: sSnd, journal: sJrn }; const fdI = near(this.station);
    const stIs = { freediving: fdI, sound: near(sSnd), journal: near(sJrn) }; const ends = [this.station, sSnd, sJrn];
    const SB = 48, secR = new Array(SB).fill(0), sec = E => ((Math.floor((Math.atan2(E[1] - cy, E[0] - cx) + Math.PI) / (2 * Math.PI) * SB)) % SB + SB) % SB;
    SP.forEach(q => { if ((q[2] ?? 1) < .2) return; const k = sec(q), r = Math.hypot(q[0] - cx, q[1] - cy); if (r > secR[k]) secR[k] = r; });
    const SPv = SP.filter((q, i) => (q[2] ?? 1) >= .2 && i % 2 === 0);
    const outside = E => { const k = sec(E); return Math.hypot(E[0] - cx, E[1] - cy) > Math.max(secR[k], secR[(k + 1) % SB], secR[(k + SB - 1) % SB]) + 22; };
    const outsideM = (x, y) => { const E = [x, y], k = sec(E); return Math.hypot(x - cx, y - cy) > Math.max(secR[k], secR[(k + 1) % SB], secR[(k + SB - 1) % SB]) - 4; };
    const clearPt = (E, d) => outside(E) && ends.slice(0, 3).every(A => !(Math.abs(E[0] - A[0]) < 150 && Math.abs(E[1] - A[1]) < 58)) && E[0] > 24 && E[0] < W - 24 && E[1] > 24 && E[1] < H - 24 && SP.every(q => (q[2] ?? 1) < .2 || Math.hypot(q[0] - E[0], q[1] - E[1]) > d) && ends.every((A, ai) => Math.hypot(A[0] - E[0], A[1] - E[1]) > (ai < 3 ? 110 : 75));
    const bez = (out, A, B, C, D, n) => { for (let i = 1; i <= n; i++) { const u = i / n, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3; out.push([a * A[0] + b * B[0] + c * C[0] + d * D[0], a * A[1] + b * B[1] + c * C[1] + d * D[1]]); } };
    const B0 = [cx, cy + R * .05];
    this.body = B0;
    const XA = a => [cx + Math.cos(a) * R * 1.65, cy + Math.sin(a) * R * 1.35];
    const MIX = { 4: [1, 2, XA(-2.3)], 5: [2, 3, XA(-.4)], 6: [3, 1, XA(1.9)] };
    const via = { 1: [MIX[4][2], MIX[6][2]], 2: [MIX[4][2], MIX[5][2]], 3: [MIX[5][2], MIX[6][2]] };
    const WIN = {}; { const okI = SP.map(q => { if ((q[2] ?? 1) < .5) return 0; const k = sec(q), r = Math.hypot(q[0] - cx, q[1] - cy); return r >= .8 * Math.max(secR[k], secR[(k + 1) % SB], secR[(k + SB - 1) % SB]) ? 1 : 0; });
      const pre = [0]; okI.forEach((v, i) => pre.push(pre[i] + v)); const hidP = [0]; SP.forEach((q, i) => hidP.push(hidP[i] + ((q[2] ?? 1) < .2 ? 1 : 0))); const hidN = (a, b) => hidP[b + 1] - hidP[a]; const frac = (a, b) => (pre[b + 1] - pre[a]) / Math.max(1, b - a + 1);
      const cen = (a, b) => { const m = SP[Math.floor((a + b) / 2)], e2 = SP[b]; return [(m[0] * 2 + e2[0]) / 3, (m[1] * 2 + e2[1]) / 3]; }, taken = [], takenS = [], samp = (a, b) => { const o = []; for (let i = a; i <= b; i += 4) o.push(SP[i]); return o; }, mdOf = (a, b) => { if (!takenS.length) return R; const S = samp(a, b); let t = 0; for (const p of S) { let m = 1e9; for (const q of takenS) { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (d < m) m = d; } t += Math.sqrt(m); } return t / S.length; };
      const spanOf = L => Math.min(NS - 1, Math.max(this.shapeName === 'hangul' ? 30 : 50, Math.floor((L.page ? .22 : this.shapeName === 'hangul' ? .12 : .3) * NS)));
      LINES.forEach((L, li) => { if (!L.page) return; const sp = spanOf(L), stI = stIs[L.page], A = [Math.max(0, stI - sp), stI], B = [stI, Math.min(NS - 1, stI + sp)];
        for (let i = A[1]; i >= A[0]; i--) if ((SP[i][2] ?? 1) < .2) { A[0] = Math.min(A[1], i + 1); break; } for (let i = B[0]; i <= B[1]; i++) if ((SP[i][2] ?? 1) < .2) { B[1] = Math.max(B[0], i - 1); break; }
        const useB = (A[1] - A[0] < 20) || (B[1] - B[0] >= 20 && frac(B[0], B[1]) > frac(A[0], A[1]) + .1); const w = useB ? B : A; WIN[li] = [w[0], w[1], useB]; taken.push(cen(w[0], w[1])); takenS.push(...samp(w[0], w[1])); });
      let runMax = 0, run = 0; SP.forEach(q => { if ((q[2] ?? 1) >= .2) { run++; runMax = Math.max(runMax, run); } else run = 0; });
      LINES.forEach((L, li) => { if (L.keep || L.page) return; const sp = Math.max(30, Math.min(spanOf(L), Math.floor(runMax * .34))), spx0 = sp; let best = null;
        for (const spx of [sp, Math.round(sp * .75), Math.max(24, Math.round(sp * .55))]) for (let st = 0; st + spx < NS; st += 6) { const sp = spx; if (hidN(st, st + sp) > 1) { continue; } { let sharp = false; for (let i = st + 4; i <= st + sp - 4 && !sharp; i += 3) { const p0 = SP[i - 4], p1 = SP[i], p2 = SP[i + 4], a1 = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), a2 = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]); let d = Math.abs(a2 - a1); if (d > Math.PI) d = 2 * Math.PI - d; if (d > 1.9) sharp = true; } if (sharp) { continue; } }
          const outE = (eb, ea) => { const tx = eb[0] - ea[0], ty = eb[1] - ea[1], tl = Math.hypot(tx, ty) || 1, ox = eb[0] - cx, oy = eb[1] - cy, ol = Math.hypot(ox, oy) || 1; return (tx * ox + ty * oy) / (tl * ol) >= -.35; }, okFw = outE(SP[st + sp], SP[st + sp - 5]), okRv = outE(SP[st], SP[st + 5]); if (!okFw && !okRv) { continue; } const rv = !okFw; const c = cen(st, st + sp), md = mdOf(st, st + sp), nearSt = (() => { for (let i = st; i <= st + sp; i += 4) for (let si = 0; si < 3; si++) { const S = ends[si]; if (Math.abs(SP[i][0] - S[0]) < 150 && Math.abs(SP[i][1] - S[1]) < 60) return 1; } return 0; })(), fr = frac(st, st + sp), sc = (fr < .55 ? -3 : 0) + fr + 2.6 * Math.min(1, md / (R * .7)) - (md < R * .3 ? 1.6 : 0) - 1.2 * nearSt + .35 * sp / spx0; if (!best || sc > best[0]) best = [sc, st, st + sp, c, rv]; }
        if (!best) { const sp2 = Math.max(24, Math.floor(sp * .5)); for (let st = 0; st + sp2 < NS; st += 4) { if (hidN(st, st + sp2) > 0) continue; const c = cen(st, st + sp2), md = mdOf(st, st + sp2), sc = frac(st, st + sp2) + 1.4 * Math.min(1, md / (R * .7)); if (!best || sc > best[0]) best = [sc, st, st + sp2, c]; } }
        if (best) { WIN[li] = [best[1], best[2], !!best[4]]; taken.push(best[3]); takenS.push(...samp(best[1], best[2])); } }); }
    this.paths = LINES.map((L, li) => {
      const span = Math.min(NS - 1, Math.max(this.shapeName === 'hangul' || this.shapeName === 'signature' ? 30 : 50, Math.floor((L.page ? .22 : this.shapeName === 'hangul' ? .12 : .34) * NS)));
      let i0, i1;
      if (L.keep) { i0 = 0; i1 = NS - 1; }
      else if (L.page) { var stI = stIs[L.page]; var rev = WIN[li][2]; i0 = WIN[li][0]; i1 = WIN[li][1]; }
      else if (WIN[li]) { i0 = WIN[li][0]; i1 = WIN[li][1]; }
      else { const LIM = { spiral: .7, wave: .6, frog: .5, octopus: .45, hangul: .9, signature: .5, triforce: .5, vinyl: .45, muaythai: .55, triskele: .36, gameboy: .42, longfins: .32, fox: .55 }, lim = LIM[this.shapeName] ? Math.floor(NS * LIM[this.shapeName]) : NS - 1; i0 = Math.floor(L.u * .9 * lim); i1 = Math.min(lim, i0 + span); if (i1 - i0 < span) i0 = Math.max(0, i1 - span); }
      const arc = [], z = [], cw = [], wl = [];
      for (let i = i0; i <= i1; i++) {
        const sAlong = (i - i0) * 4.5, ph = i * 4.5 * (Math.PI * 2 / 520);
        const off = L.keep ? 0 : Math.sin(ph) * 5 + (li - 3.5) * 8.5;
        arc.push([SP[i][0] + SN[i][0] * off, SP[i][1] + SN[i][1] * off]);
        z.push(L.keep ? .05 : this.shapeName === 'hangul' ? -.6 + .3 * Math.cos(ph) : .05 + .55 * Math.cos(ph) + (li - 3.5) * .02); cw.push(clamp(1 - curv[i] * .5, .55, 1) * Math.max(.35, SP[i][2] ?? 1)); wl.push(SP[i][2] ?? 1);
      }
      const CPp = this.colorPaths[li];
      if (CPp) { arc.length = 0; z.length = 0; cw.length = 0; wl.length = 0; CPp.forEach(p => { arc.push([p[0], p[1]]); z.push(.35); cw.push(Math.max(.35, p[2] ?? 1)); wl.push(p[2] ?? 1); }); }
      else if (!L.keep) { const sm = avg(avg(arc, 4), 4); for (let q = 0; q < arc.length; q++) arc[q] = sm[q]; }
      if (!L.keep && !L.page && !CPp && WIN[li] && WIN[li][2]) { arc.reverse(); z.reverse(); cw.reverse(); wl.reverse(); }
      if (!L.keep && !L.page && !CPp && arc.length > 4) { let j = arc.length - 1; const isOut = p => { const k = sec(p); return Math.hypot(p[0] - cx, p[1] - cy) >= .86 * Math.max(secR[k], secR[(k + 1) % SB], secR[(k + SB - 1) % SB]); }, jmin = Math.floor(arc.length * .45); const outT = q => { if (q < 5) return true; const p = arc[q], pp = arc[q - 4], tx = p[0] - pp[0], ty = p[1] - pp[1], tl = Math.hypot(tx, ty) || 1, ox = p[0] - cx, oy = p[1] - cy, ol = Math.hypot(ox, oy) || 1; return (tx * ox + ty * oy) / (tl * ol) > -.15; }; while (j > jmin && !(isOut(arc[j]) && outT(j))) j--; if (j <= jmin) { j = arc.length - 1; while (j > jmin && !isOut(arc[j])) j--; } if (j < arc.length - 1 && j > 6) { arc.length = j + 1; z.length = j + 1; cw.length = j + 1; wl.length = j + 1; } }
      if (!L.keep && !L.page && !CPp && arc.length > 4) { const e = arc[arc.length - 1], pe = arc[arc.length - 4], tl1 = Math.hypot(e[0] - pe[0], e[1] - pe[1]) || 1, te1 = [(e[0] - pe[0]) / tl1, (e[1] - pe[1]) / tl1], ox = e[0] - cx, oy = e[1] - cy, ol = Math.hypot(ox, oy) || 1;
        let dx = te1[0] * .5 + ox / ol, dy = te1[1] * .5 + oy / ol; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl; let E = [e[0] + dx * 30, e[1] + dy * 30];
        const ringR = a => { const k = ((Math.floor((a + Math.PI) / (2 * Math.PI) * SB)) % SB + SB) % SB; return Math.max(secR[k], secR[(k + 1) % SB], secR[(k + SB - 1) % SB], secR[(k + 2) % SB], secR[(k + SB - 2) % SB]) + 34 + (RING_EXTRA[this.shapeName] || 0); };
        const ae = Math.atan2(e[1] - cy, e[0] - cx); let best = null; this.runA = this.runA || []; const adiff = (x, y) => { let d = Math.abs(x - y) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };
        const overlaps = (a0, a1) => this.runA.some(([b0, b1]) => { const n = 16; let o = 0; for (let q = 0; q <= n; q++) { const a = a0 + (a1 - a0) * q / n; let lo = Math.min(b0, b1), hi = Math.max(b0, b1); let aa = a; while (aa < lo - Math.PI) aa += 2 * Math.PI; while (aa > hi + Math.PI) aa -= 2 * Math.PI; if (aa >= lo - .12 && aa <= hi + .12) o++; } return o > 4; });
        const crs = Math.cos(ae) * te1[1] - Math.sin(ae) * te1[0], tsg = crs >= 0 ? 1 : -1, outD = Math.cos(ae) * te1[0] + Math.sin(ae) * te1[1];
        for (const pass of [0, 1]) { for (let st2 = 0; st2 <= (pass ? 24 : 9) && !best; st2++) for (const sg of st2 ? [tsg, -tsg] : [tsg]) { const a = ae + sg * st2 * .13; if (!pass && sg !== tsg && st2 > 2) continue; if (!pass && (this.runA.some(([, b1]) => adiff(a, b1) < .5) || overlaps(ae, a))) continue; for (const ex2 of [0, 22, 46]) { const r = ringR(a) + ex2, E2 = [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; if (clearPt(E2, 30)) { best = [E2, a, r]; break; } } if (best) break; } if (best) break; }
        if (best) this.runA.push([ae, best[1]]);
        if (!best) { const r = ringR(ae); best = [[cx + Math.cos(ae) * r, cy + Math.sin(ae) * r], ae, r]; }
        E = best[0]; ends.push(E); const n0 = arc.length;
        { let da = best[1] - ae; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
          const hd = 26 + 40 * Math.max(0, -outD), seg = [e], cub = (P0, C1, C2, P1, n) => { for (let q = 1; q <= n; q++) { const u = q / n, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3; seg.push([a * P0[0] + b * C1[0] + c * C2[0] + d * P1[0], a * P0[1] + b * C1[1] + c * C2[1] + d * P1[1]]); } };
          if (Math.abs(da) < .36) { const ox = E[0] - cx, oy = E[1] - cy, ol = Math.hypot(ox, oy) || 1; cub(e, [e[0] + te1[0] * hd, e[1] + te1[1] * hd], [E[0] - ox / ol * hd * .6, E[1] - oy / ol * hd * .6], E, 18); }
          else { const dS = Math.sign(da), aW = ae + dS * .18, rW = ringR(aW), W0 = [cx + Math.cos(aW) * rW, cy + Math.sin(aW) * rW], tg = [-Math.sin(aW) * dS, Math.cos(aW) * dS];
            cub(e, [e[0] + te1[0] * hd, e[1] + te1[1] * hd], [W0[0] - tg[0] * hd * .8, W0[1] - tg[1] * hd * .8], W0, 16);
            const da2 = da - dS * .18, m = Math.max(2, Math.ceil(Math.abs(da2) / .05)), rEnd = best[2] - ringR(best[1]); for (let q = 1; q <= m; q++) { const u = q / m, a = aW + da2 * u, r = ringR(a) + rEnd * u; seg.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } }
          const sm = avg(avg(avg(seg, 3), 3), 3); sm[0] = e; sm[sm.length - 1] = E; for (let q = 1; q < sm.length; q++) arc.push(sm[q]); }
        for (let q = n0; q < arc.length; q++) { z.push(.3); cw.push(1); wl.push(1); } }
      if (L.page && !(CPp && (this.shapeName === 'wave' || this.shapeName === 'lotus' || this.shapeName === 'octopus' || this.shapeName === 'headphones' || this.shapeName === 'maple' || this.shapeName === 'samurai' || this.shapeName === 'hangul' || this.shapeName === 'book' || this.shapeName === 'mountain' || this.shapeName === 'plane' || this.shapeName === 'spring' || this.shapeName === 'muaythai'))) {
        if (rev) { arc.reverse(); z.reverse(); cw.reverse(); wl.reverse(); }
        { const S0 = this.stations[L.page], lim = Math.floor(arc.length * .45); let popped = 0;
          while (arc.length > 12 && popped < lim) { const e1 = arc[arc.length - 1], p1 = arc[arc.length - 5], tx = e1[0] - p1[0], ty = e1[1] - p1[1], tl = Math.hypot(tx, ty) || 1, sx = S0[0] - e1[0], sy = S0[1] - e1[1], sl = Math.hypot(sx, sy) || 1;
            if ((tx * sx + ty * sy) / (tl * sl) > .55 || sl < 30) break; arc.pop(); z.pop(); cw.pop(); wl.pop(); popped++; } }
        const e = arc[arc.length - 1], pe = arc[arc.length - 4] || arc[0], tl0 = Math.hypot(e[0] - pe[0], e[1] - pe[1]) || 1, te = [(e[0] - pe[0]) / tl0, (e[1] - pe[1]) / tl0], S = this.stations[L.page];
        const dist = Math.hypot(S[0] - e[0], S[1] - e[1]);
        if (dist > 4) { const d = clamp(dist * .5, 30, 90), C1 = [e[0] + te[0] * d, e[1] + te[1] * d], side = C1[0] >= S[0] ? 1 : -1, n0 = arc.length;
          const cy2 = v => Math.max(28, v), ux = (S[0] - e[0]) / dist, uy = (S[1] - e[1]) / dist, pj = te[0] * ux + te[1] * uy, ds = [2 * pj * ux - te[0], 2 * pj * uy - te[1]], hk = dist * .4 / (1 + Math.max(0, pj) * .5), C1b = [e[0] + te[0] * hk, cy2(e[1] + te[1] * hk)], C2a = [S[0] - ds[0] * hk, cy2(S[1] - ds[1] * hk)];
          bez(arc, e, C1b, C2a, S, 30);
          
          for (let q = n0; q < arc.length; q++) { z.push(.1); cw.push(1); wl.push(1); } }
      }
      const ang = -Math.PI / 2 + li / LINES.length * Math.PI * 2 + .3, sg = li % 2 ? 1 : -1, ten = [];
      { const far = Math.hypot(W, H) * .62, LXd = ropeX(W), wx0 = -20 + li * (W + 40) / 7, NA = this.navArrive && !this.trans ? this.navArrive[L.keep ? 'ink' : L.page || 'c' + li] : null, P0 = this.fromPts ? this.fromPts[li] : NA ? NA.slice() : this.fromDive ? [wx0, Math.max(H * .26, 190) + this.waveY(wx0 - LXd, li % 3, 0) + (li % 3) * 0] : [cx + Math.cos(ang) * far, cy + Math.sin(ang) * far], Mx = [cx + Math.cos(ang + sg * .8) * R * 1.45, cy + Math.sin(ang + sg * .8) * R * 1.45];
        const C1 = this.fromPts ? [P0[0] + (P0[0] - cx) * .7 + sg * 60, P0[1] + (P0[1] - cy) * .7 - 40] : NA ? [P0[0] - 160, P0[1] + sg * 50] : this.fromDive ? [P0[0] + 140, P0[1] + 30] : [P0[0] + Math.cos(ang + sg * 1.6) * far * .35, P0[1] + Math.sin(ang + sg * 1.6) * far * .35], C2 = [Mx[0] + Math.cos(ang + sg * .2) * R * .9, Mx[1] + Math.sin(ang + sg * .2) * R * .9];
        ten.push(P0); for (let q = 1; q <= 60; q++) { const u = q / 60, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3; ten.push([a * P0[0] + b * C1[0] + c * C2[0] + d * Mx[0], a * P0[1] + b * C1[1] + c * C2[1] + d * Mx[1]]); } }
      const TR = this.trans && this.trans[li]; if (TR) { ten.length = 0; TR.pts.forEach(p => ten.push(p)); }
      else if (this.mixIntro && !this.fromDive && via[li]) { const P0 = ten[0], c = [P0, via[li][0], via[li][1]]; ten.length = 0; cat([P0, P0, c[1], c[2], [c[2][0] + (c[2][0] - c[1][0]) * .15, c[2][1] + (c[2][1] - c[1][1]) * .15]], 22, (x, y) => ten.push([x, y])); }
      else if (this.mixIntro && !this.fromDive && MIX[li]) { const X = MIX[li][2], ox = X[0] - cx, oy = X[1] - cy, ol = Math.hypot(ox, oy) || 1; ten.length = 0; for (let q = 0; q <= 12; q++) ten.push([X[0] - oy / ol * q * 4, X[1] + ox / ol * q * 4]); }
      const M = ten[ten.length - 1], Mp = ten[ten.length - 2], md = Math.hypot(M[0] - Mp[0], M[1] - Mp[1]) || 1, dm = [(M[0] - Mp[0]) / md, (M[1] - Mp[1]) / md];
      const J = arc[0], tl = Math.hypot(arc[1][0] - J[0], arc[1][1] - J[1]) || 1, tg = [(arc[1][0] - J[0]) / tl, (arc[1][1] - J[1]) / tl];
      const pts = ten.slice();
      if (TR) { const dx = J[0] - M[0], dy = J[1] - M[1], dist = Math.hypot(dx, dy) || 1, d = Math.max(R, dist * .6);
        if (dm[0] * dx + dm[1] * dy < 0 || tg[0] * dx + tg[1] * dy < 0) { const mx = (M[0] + J[0]) / 2, my = (M[1] + J[1]) / 2, ox = mx - cx, oy = my - cy, ol = Math.hypot(ox, oy) || 1, Wp = [mx + ox / ol * R * 1.1, my + oy / ol * R * 1.1], wt2 = [(J[0] - M[0]) / dist, (J[1] - M[1]) / dist];
          bez(pts, M, [M[0] + dm[0] * d, M[1] + dm[1] * d], [Wp[0] - wt2[0] * d * .7, Wp[1] - wt2[1] * d * .7], Wp, 30); bez(pts, Wp, [Wp[0] + wt2[0] * d * .7, Wp[1] + wt2[1] * d * .7], [J[0] - tg[0] * d, J[1] - tg[1] * d], J, 30); }
        else bez(pts, M, [M[0] + dm[0] * d, M[1] + dm[1] * d], [J[0] - tg[0] * d, J[1] - tg[1] * d], J, 40); }
      else bez(pts, M, [M[0] + dm[0] * R * .6, M[1] + dm[1] * R * .6], [J[0] - tg[0] * R * .7, J[1] - tg[1] * R * .7], J, 36);
      const arc0 = pts.length; for (let i = 1; i < arc.length; i++) pts.push(arc[i]);
      const s = [0]; for (let i = 1; i < pts.length; i++) s[i] = s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const zz = [], cc = [], wt = [], nT = TR ? ten.length : 0; for (let i = 0; i < pts.length; i++) { const o = i < nT; zz.push(i >= arc0 ? z[i - arc0 + 1] : o ? TR.z[i] ?? 0 : TR ? .15 : 0); cc.push(i >= arc0 ? cw[i - arc0 + 1] : o ? TR.cw[i] ?? 1 : 1); wt.push(i >= arc0 ? wl[i - arc0 + 1] ?? 1 : o ? TR.wt[i] ?? 1 : 1); }
      return { L, pts, s, zA: zz, cw: cc, wt, spawn: false, d: L.d, tr: !!TR, oldLen: TR ? s[ten.length - 1] : 0, len: s[s.length - 1], entry: s[arc0 - 1], arc0, ph: li * 1.7 };
    });
    if (this.mixIntro && !this.trans && !this.fromDive) for (const li of [4, 5, 6]) {
      const [pa, pb, X] = MIX[li], arr = [pa, pb].map(pi => { const P = this.paths[pi]; let bi = 0, bd = 1e9; P.pts.forEach((p, q) => { const d = Math.hypot(p[0] - X[0], p[1] - X[1]); if (d < bd) { bd = d; bi = q; } });
        const sx = P.s[bi], dur = this.durOf(P), head = k => P.len * easeIO(k);
        let lo = 0, hi = 1; for (let it = 0; it < 30; it++) { const mid = (lo + hi) / 2; if (head(mid) >= sx) hi = mid; else lo = mid; } return P.d + hi * dur; });
      this.paths[li].d = Math.max(arr[0], arr[1]) + .05;
    }
    if (this.shapeName === 'spring' && !this.trans && !this.fromDive) { const ink = this.paths[0], e = this.endOf(ink); this.paths.forEach((P, li) => { if (this.colorPaths[li] && !P.tr) P.d = Math.max(P.d ?? P.L.d, e - this.durOf(P) + .3); }); }
    // label placement: decided once, against every settled stroke
    { const pts = []; this.paths.forEach(P => P.pts.forEach((p, i) => { if (i >= P.arc0 && (!P.L.keep || (P.wt[i] ?? 1) >= .2)) pts.push(p); }));
      const mw = r => { const e = r.current && r.current.children[1]; return e && e.offsetWidth ? e.offsetWidth + 4 : 0; }, lw = { freediving: mw(this.btnRef) || 116, sound: mw(this.sndRef) || 74, journal: mw(this.jrnRef) || 84 }, lh = { freediving: 18, sound: 18, journal: 18 };
      this.labelUp = {};
      for (const pg of ['freediving', 'sound', 'journal']) { const S = this.stations[pg], w = lw[pg], h = lh[pg];
        const boxes = { below: [S[0] - w / 2 - 6, S[0] + w / 2 + 6, S[1] + 10, S[1] + 18 + h * 1.6], above: [S[0] - w / 2 - 6, S[0] + w / 2 + 6, S[1] - 18 - h * 1.6, S[1] - 10], right: [S[0] + 10, S[0] + 22 + w, S[1] - h, S[1] + h], left: [S[0] - 22 - w, S[0] - 10, S[1] - h, S[1] + h] };
        let best = 'below', bh = 1e9; const OP = this.paths.find(P => P.L.page === pg); let ap = [0, 0]; if (OP) { const q = OP.pts, e = q[q.length - 1]; let k2 = q.length - 1; while (k2 > 0 && Math.hypot(q[k2][0] - e[0], q[k2][1] - e[1]) < 45) k2--; const dx = q[k2][0] - e[0], dy = q[k2][1] - e[1], dl = Math.hypot(dx, dy) || 1; ap = [dx / dl, dy / dl]; }
        const DIR = { below: [0, 1], above: [0, -1], right: [1, 0], left: [-1, 0] };
        ['below', 'right', 'left', 'above'].forEach((k, ord) => { const b = boxes[k]; if (b[0] < 6 || b[1] > W - 6 || b[2] < 6 || b[3] > H - 6) return; const hit = pts.filter(p => p[0] > b[0] && p[0] < b[1] && p[1] > b[2] && p[1] < b[3]).length + ord * .1 + 40 * Math.max(0, DIR[k][0] * ap[0] + DIR[k][1] * ap[1] - .3); if (hit < bh) { bh = hit; best = k; } });
        this.labelUp[pg] = best === 'below' ? null : best; } }
  }

  goDive = () => {
    if (this.go != null || this.T < this.readyT) return;
    if (this.tapReveal('freediving')) return;
    const { W, H, cx, cy, R } = this.geo, SY = Math.max(H * .26, 190);
    // strokes draw the surface, buoy and flag first, then carry on up into their menu dots
    const LX = ropeX(W), BS = clamp(W / 900, .75, 1), NX = k => navAt(W, k)[0], NY = NAV_Y;
    const bz = (A, C1, C2, B, n) => { const o = []; for (let i = 1; i <= n; i++) { const u = i / n, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, dd = u ** 3; o.push([a * A[0] + b * C1[0] + c * C2[0] + dd * B[0], a * A[1] + b * C1[1] + c * C2[1] + dd * B[1]]); } return o; };
    // start off-screen like the Freediving page's surface, so the line reaches the left edge
    const surf = k => { const o = []; for (let x = -20; x <= W - 6; x += 9) o.push([x, SY + this.waveY(x - LX, k, 0)]); return o; };
    const mkX = (o) => { const F = o.feat, f0p = F[0], lead = bz(o.start, o.c1, o.c2 || [f0p[0] - 50, f0p[1] - 110], f0p, 44), fl = F[F.length - 1], fp = F[F.length - 2], tl = Math.hypot(fl[0] - fp[0], fl[1] - fp[1]) || 1, E = o.end;
      const rise = bz(fl, o.r1 || [fl[0] + (fl[0] - fp[0]) / tl * 70, fl[1] + (fl[1] - fp[1]) / tl * 70 - 50], o.rx != null && o.rx < -100 ? [E[0] + o.rx, E[1] + 20] : [E[0] + (o.rx ?? -40), E[1] + 130], E, 40);
      const pre = o.circ || [o.start], pts = pre.concat(lead, F.slice(1), rise), f0 = pre.length + lead.length - 1; return { ...o, pts, f0, f1: f0 + F.length - 1 }; };
    const P = this.paths[0], circ = P.pts.slice(P.arc0), e = circ[circ.length - 1], pe = circ[circ.length - 2], tl = Math.hypot(e[0] - pe[0], e[1] - pe[1]) || 1, tg = [(e[0] - pe[0]) / tl, (e[1] - pe[1]) / tl];
    let cl = 0; for (let i = 1; i < circ.length; i++) cl += Math.hypot(circ[i][0] - circ[i - 1][0], circ[i][1] - circ[i - 1][1]);
    const hd = k => this.heads && this.heads[k] ? this.heads[k].p.slice() : [cx, cy + R];
    const s0 = surf(0), s1 = surf(1), s2 = surf(2), B = [LX, SY + this.waveY(0, 0, 0) - 2];
    const coil = []; for (let q = 0; q <= 10; q++) { const u = q / 10; coil.push([B[0] + (-17 + 34 * u) * BS, B[1] + Math.sin(u * Math.PI) * 2 * BS]); }
    const flag = []; for (let q = 0; q <= 8; q++) { const u = q / 8; flag.push([B[0] + (1 + 20 * u) * BS, B[1] + (-39 + Math.sin(u * Math.PI) * 1.2) * BS]); }
    this.exits = [
      mkX({ col: INK, k: 0, d: 0, dur: 3.1, ink: 1, circ, circW: P.wt.slice(P.arc0), h0: cl, start: e, c1: [e[0] + tg[0] * R * 1.2, e[1] + tg[1] * R * 1.2], c2: [-30, s0[0][1] - 90], feat: s0, end: [NX('home'), NY], rx: 40, w: 8, tw: 3.2, ta: .9 }),
      mkX({ col: [0, 158, 224], k: 1, d: .35, dur: 2.95, start: hd('freediving'), c1: [hd('freediving')[0] - 60, hd('freediving')[1] + 90], c2: [-20, s1[0][1] - 70], feat: s1, end: [NX('freediving'), NY], w: 6, tw: 1.8, ta: .55 }),
      mkX({ col: [34, 86, 186], k: 2, d: .6, dur: 2.7, start: [cx + Math.cos(2.3) * R, cy + Math.sin(2.3) * R], c1: [cx + Math.cos(2.3) * R * 2.2, cy + Math.sin(2.3) * R * 2], c2: [-20, s2[0][1] - 60], feat: s2, end: [NX('freediving'), NY], w: 6.5, tw: 1.1, ta: .3 }),
      mkX({ col: [255, 118, 18], k: 3, d: .25, dur: 2.7, start: hd('c4'), c1: [hd('c4')[0], hd('c4')[1] + 120], c2: [B[0] + 120, B[1] - 90], feat: coil, end: [NX('c4'), NY], r1: [B[0] + 30, Math.max(40, B[1] - 170)], rx: -260, w: 7, tw: 6.5 * BS, ta: 1 }),
      mkX({ col: [232, 34, 44], k: 4, d: .5, dur: 2.6, start: hd('sound'), c1: [hd('sound')[0], hd('sound')[1] - 100], c2: [B[0] - 30, B[1] - 120], feat: flag, end: [NX('sound'), NY], r1: [B[0] + 20, Math.max(30, B[1] - 160)], rx: -260, w: 6.5, tw: 4.6 * BS, ta: 1 })
    ];
    this.navFrom = {}; ['journal', 'c5', 'c6'].forEach(k => { const h = this.heads && this.heads[k]; if (h) this.navFrom[k] = { p: h.p.slice(), col: h.col }; });
    this.go = 0;
  };
  // Sound / Library: strokes fade, every head flies up to its nav dot, then the page opens with the same nav in place
  goPage = pg => () => {
    if (this.go != null || this.T < this.readyT) return;
    if (this.tapReveal(pg)) return;
    this.exits = []; this.navFrom = {};
    ['ink', 'freediving', 'sound', 'journal', 'c4', 'c5', 'c6'].forEach(k => { const h = this.heads && this.heads[k]; if (h) this.navFrom[k] = { p: h.p.slice(), col: h.col }; });
    this.dest = pg === 'sound' ? BASE + 'sound/?from=page' : BASE + 'library/'; this.go = 0;
  };
  goSound = this.goPage('sound'); goJournal = this.goPage('journal');
  sndOn = () => { this.hovPg.sound = 1; }; sndOff = () => { this.hovPg.sound = 0; }; jrnOn = () => { this.hovPg.journal = 1; }; jrnOff = () => { this.hovPg.journal = 0; };
  durOf(P) { const fast = this.shapeName === 'spring' && this.colorPaths && this.colorPaths[LINES.indexOf(P.L)], run = P.len / (fast ? 2400 : this.shapeName === 'octopus' && P.L.keep ? 1300 : 650); return (2.8 + (P.L.keep ? Math.min(run, INK_RUN) : run)) / P.L.spd; }
  endOf(P) { return P.tr ? P.L.d * .6 + (1.6 + (P.len - P.oldLen) / 900) / P.L.spd : (P.d ?? P.L.d) + this.durOf(P); }
  // the ink dot calls this with a click event and gets a random symbol; the local symbol picker (src/dev/symbol-picker.js) passes a name
  shuffle = (name) => {
    if (this.go != null || this.morph || !this.paths || this.T < this.readyT) return false;
    const grab = () => this.paths.map(P => P.pts.slice(P.arc0 - 1));
    this.trans = this.paths.map(P => { const c = P.cut0 || 0; return { pts: P.pts.slice(c), z: P.zA.slice(c), cw: P.cw.slice(c), wt: P.wt.slice(c) }; }); const old = grab(), opts = SHAPES.filter(x => x !== this.shapeName); this.fromPts = null;
    this.override = SHAPES.includes(name) ? name : pickShape(this.shapeName);
    this.build(this.geo.W, this.geo.H);
    this.T = 0; this.go = null; this.oldPaths = null; return true;
  };
  static SHAPES = SHAPES;
  hoverOn = () => { this.hov = 1; };
  hoverOff = () => { this.hov = 0; };
  // hovering a section dot (or the black ink dot) fades every other line from the start of its stroke to its tail, all at the same time, down to 25%; it plays back in reverse when the hover ends
  fadeTick(dt) {
    dt = Math.max(0, dt); const pg = this.go != null || !(this.T >= this.readyT) ? null : this.hov ? 'freediving' : this.hovPg.sound ? 'sound' : this.hovPg.journal ? 'journal' : this.hovI ? 'ink' : null, hl = pg === 'ink' ? 0 : pg ? LINES.findIndex(L => L.page === pg) : -1;
    if (!this.fadeC) this.fadeC = LINES.map(() => 0);
    this.fadeC = this.fadeC.map((c, li) => { const tg = hl >= 0 && li !== hl ? FADE.sweep : 0; return tg > c ? Math.min(tg, c + dt) : Math.max(tg, c - dt); });
  }
  // the button is a 48px circle on the dot (what the pointer hovers); its label sits below, above, left or right of it,
  // or at labelAt (rotated and scaled) when the symbol sets it apart. Gaps match the original layout: 24px below/above, 32px beside
  placeLabel(btn, dot, LA, side) {
    btn.style.left = dot[0] + 'px'; btn.style.top = dot[1] + 'px';
    const lab = btn.children[1]; if (!lab) return; const st = lab.style; st.left = st.right = st.top = st.bottom = '';
    if (LA) { st.left = (24 + LA[0] - dot[0]) + 'px'; st.top = (24 + LA[1] - dot[1]) + 'px'; st.transformOrigin = '50% 50%'; st.translate = '-50% -50%'; st.rotate = LA.length > 2 ? LA[2] + 'deg' : ''; st.scale = LA.length > 2 ? String(LA[3]) : ''; return; }
    st.rotate = st.scale = '';
    if (side === 'left' || side === 'right') { st[side === 'right' ? 'left' : 'right'] = '56px'; st.top = '50%'; st.translate = '0 -50%'; }
    else { st.left = '50%'; st[side === 'above' ? 'bottom' : 'top'] = '48px'; st.translate = '-50% 0'; }
  }
  // one motion both ways. On hover the letters come out of the dot, nearest first, growing, sharpening and appearing; when the hover ends they
  // go back in the same way and the dot pulses once as the last one arrives. Each letter keeps its own progress, so a hover that changes its
  // mind halfway turns around smoothly. btn: the section's button; dot: its dot on screen; rot: [degrees, scale] when the label sits apart
  labelFx(pg, btn, dot, on, rot) {
    const lab = btn && btn.children[1]; if (!lab) return;
    const L = this.labs || (this.labs = {}), chs = [...lab.children], s = L[pg] || (L[pg] = { on: false, t: 0, pk: null, p: chs.map(() => 0) }), dt = this.dtF || 0;
    if (s.pk != null) { s.pk += dt; if (s.pk > LABEL.time + LABEL.pulse) s.pk = null; }
    if (on !== s.on || !s.plan) {
      // where each letter rests, untransformed, relative to the dot
      const keep = chs.map(c => c.style.transform); chs.forEach(c => { c.style.transform = 'none'; });
      const th = rot ? -rot[0] * Math.PI / 180 : 0, sc = rot ? rot[1] || 1 : 1;
      const P = chs.map((el, i) => { const r = el.getBoundingClientRect(), dx = dot[0] - (r.left + r.width / 2), dy = dot[1] - (r.top + r.height / 2); return { el, i, d: Math.hypot(dx, dy), dx: (dx * Math.cos(th) - dy * Math.sin(th)) / sc, dy: (dx * Math.sin(th) + dy * Math.cos(th)) / sc }; });
      chs.forEach((c, i) => { c.style.transform = keep[i]; });
      [...P].sort((a, b) => a.d - b.d).forEach((p, r) => { p.rank = r; });
      s.pk = s.on && !on ? 0 : on ? null : s.pk; s.plan = P; s.on = on; s.t = 0; s.gap = P.length > 1 ? (LABEL.time - LABEL.letter) / (P.length - 1) : 0;
    } else { s.t += dt; if (s.p.every(v => v === (on ? 1 : 0)) && s.rest) return; }
    let vis = 0;
    for (const p of s.plan) {
      if (s.t >= p.rank * s.gap) s.p[p.i] = clamp(s.p[p.i] + (on ? dt : -dt) / LABEL.letter, 0, 1);
      const u = 1 - smooth(s.p[p.i]); vis = Math.max(vis, 1 - u);
      p.el.style.transform = u < .001 ? '' : `translate(${(p.dx * u).toFixed(1)}px, ${(p.dy * u).toFixed(1)}px) scale(${(1 - (1 - LABEL.shrink) * u).toFixed(3)})`;
      p.el.style.opacity = (1 - u * u).toFixed(3); p.el.style.filter = u > .02 ? `blur(${(LABEL.blur * u).toFixed(2)}px)` : '';
    }
    lab.style.opacity = vis > 0 ? '1' : '0'; s.rest = s.p.every(v => v === (on ? 1 : 0));
  }
  // 0..1 through the dot's pulse as the last absorbed letter arrives
  labelPulse(pg) { const s = this.labs && this.labs[pg]; if (!s || s.pk == null) return 0; const u = clamp((s.pk - (LABEL.time - LABEL.letter * .35)) / LABEL.pulse, 0, 1); return Math.sin(Math.PI * u); }
  // touch screens have no hover: the first tap shows the label, the second goes there
  tapReveal(pg) { if (typeof matchMedia === 'undefined' || !matchMedia('(hover: none)').matches) return false; const s = this.labs && this.labs[pg]; if (s && s.on) return false;
    if (pg === 'freediving') this.hov = 1; else this.hovPg[pg] = 1;
    if (!this.offTap) { this.offTap = e => { if (e.target.closest && e.target.closest('button[aria-label]')) return; this.hov = 0; this.hovPg.sound = this.hovPg.journal = 0; }; document.addEventListener('pointerdown', this.offTap); }
    return true; }
  // x: 0 at the start of the visible stroke, 1 at its tail
  fadeAt(li, x) {
    const c = this.fadeC && this.fadeC[li]; if (!c) return 1;
    const p = easeIO(clamp(c / FADE.sweep, 0, 1)); if (p <= 0) return 1;
    // the wet edge creeps unevenly, a little ahead here and behind there (the same on every line, so they stay in step), and settles gently (smootherstep)
    const xw = x + FADE.wander * (Math.sin(x * 7.3 + 2.1) + .5 * Math.sin(x * 17.9 + 4.7)) * Math.sin(Math.PI * p), u = clamp((p * (1 + FADE.soft) - xw) / FADE.soft, 0, 1);
    return 1 - (1 - FADE.to) * u * u * u * (u * (u * 6 - 15) + 10);
  }

  tick = now => {
    cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(.05, (now - (this.last || now)) / 1000); this.last = now;
    this.T += dt; this.hovT += (this.hov - this.hovT) * (1 - Math.exp(-dt * 8)); for (const k of ['sound', 'journal']) this.hovPgT[k] = (this.hovPgT[k] || 0) + ((this.hovPg[k] || 0) - (this.hovPgT[k] || 0)) * (1 - Math.exp(-dt * 8));
    this.fadeTick(dt); this.dtF = Math.max(0, dt);
    // leaving: the last frame is kept (window.__leave) and shown by the next page while it loads, so there's no blank moment in between
    if (this.go != null) { this.go += dt; if (this.go > (this.dest ? (/\/sound\//.test(this.dest) ? 1.3 : 2.05) : 4.05) && !this.left) { this.left = true; // Sound picks the menu dots up where they are and drops them onto its beat pads
      if (/\/sound\//.test(this.dest || '')) try { const o = {}; ['ink', 'freediving', 'sound', 'journal', 'c4', 'c5', 'c6'].forEach(k => { const f = this.navFrom && this.navFrom[k]; o[k] = f ? f.p : sndDrop(k, innerWidth, innerHeight); }); o.home = o.ink; sessionStorage.setItem('nav-from', JSON.stringify(o)); } catch (e) {}
      (window.__leave || (h => { location.href = h; }))(this.dest || BASE + 'freediving/?from=home'); } }
    // once the symbol has settled (drawn, its transition over, nothing hovered, fading or with labels moving) the picture doesn't change, so it
    // isn't redrawn every frame; any hover, shuffle or resize wakes it
    { const L = this.labs || {}, near = (a, b) => Math.abs((a || 0) - (b || 0)) < .002, still = this.go == null && !this.morph && !this.trans && !this.oldPaths && this.T > (this.readyT ?? 99) + 3
        && near(this.hovT, this.hov) && near(this.hovIT, this.hovI) && ['sound', 'journal'].every(k => near(this.hovPgT[k], this.hovPg[k])) && (this.fadeC || []).every(c => c === 0 || c === FADE.sweep) && Object.values(L).every(x => x.rest && x.pk == null),
        sig = innerWidth + 'x' + innerHeight + ':' + this.shapeName + ':' + (this.fadeC || []).join() + ':' + this.hov + this.hovI + (this.hovPg.sound || 0) + (this.hovPg.journal || 0);
      if (still && this.stillSig === sig) return; this.stillSig = still ? sig : null; }
    this.draw();
    if (!this.readied) { this.readied = true; window.__ready && window.__ready(); }
  };

  draw() {
    const cv = this.canvasRef.current; if (!cv) return;
    const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); this.grainP = null; }
    if (!this.geo || this.geo.W !== W || this.geo.H !== H || this.shapeName !== this.shapeWanted()) { const changed = this.geo && this.shapeName !== this.shapeWanted(); this.build(W, H); if (changed) this.T = 0; }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#f5f3ee'; ctx.fillRect(0, 0, W, H);
    const T = this.T, G = this.go, { cx, cy, R } = this.geo, LX = ropeX(W), SY = Math.max(H * .26, 190);
    const gone = G == null ? 0 : smooth(clamp(G / .5, 0, 1));

    // octopus body: an ink pool the arms grow out of
    const lastEnd = Math.max(...this.paths.map(P => this.endOf(P)));
    this.readyT = this.endOf(this.paths[0]) + .3;
    const bodyA = 0;
    if (this.fromDive && !this.navArrive && T < 2) { const wa = 1 - smooth(clamp((T - .3) / 1.4, 0, 1)); ctx.lineCap = 'round';
      [[3.2, .9, '20,20,20'], [1.8, .55, '0,158,224'], [1.1, .3, '34,86,186']].forEach((st, k) => { ctx.strokeStyle = `rgba(${st[2]},${st[1] * wa})`; ctx.lineWidth = st[0]; ctx.beginPath(); for (let x = -20; x <= W + 20; x += 10) { const y = SY + this.waveY(x - LX, k, T); x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }); }
    if (bodyA > .01) {
      const [bx, by] = this.body, br = R * .2 * (.6 + .4 * smooth(clamp(T / .6, 0, 1)));
      ctx.fillStyle = 'rgb(20,20,20)';
      for (let l = 0; l < 3; l++) { ctx.globalAlpha = bodyA * (.62 - l * .16); ctx.beginPath(); for (let i = 0; i <= 30; i++) { const an = i / 30 * 6.2832, rr = br * (1 + l * .25) * (1 + .1 * Math.sin(an * 3 + l + T) + .06 * Math.sin(an * 5 - T)); i ? ctx.lineTo(bx + Math.cos(an) * rr, by + Math.sin(an) * rr) : ctx.moveTo(bx + Math.cos(an) * rr, by + Math.sin(an) * rr); } ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = 1;
    }

    if (this.fromPts && T > 6) this.fromPts = null;
    if (this.trans && T > 8) this.trans = null;
    let morphK = -1;
    if (this.morph) {
      morphK = clamp((performance.now() - this.morph.t0) / 1800, 0, 1);
      const k = smooth(morphK), rs = (a, n) => Array.from({ length: n }, (_, i) => { const f = i / (n - 1) * (a.length - 1), j = Math.floor(f), t = f - j, p = a[j], q = a[Math.min(a.length - 1, j + 1)]; return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; });
      ctx.lineCap = 'round';
      [1, 2, 3, 4, 5, 6, 0].forEach(li => {
        const L = LINES[li], A = rs(this.morph.old[li], 150), B = rs(this.morph.nw[li], 150), th = Math.sin(Math.PI * k) * .55 * (li % 2 ? 1 : -1), push = 1 + .18 * Math.sin(Math.PI * k);
        ctx.strokeStyle = `rgb(${L.col[0]},${L.col[1]},${L.col[2]})`;
        for (let i = 0; i < 149; i++) {
          const pt = j => { const x = A[j][0] + (B[j][0] - A[j][0]) * k - cx, y = A[j][1] + (B[j][1] - A[j][1]) * k - cy; return [cx + (x * Math.cos(th) - y * Math.sin(th)) * push, cy + (x * Math.sin(th) + y * Math.cos(th)) * push]; };
          const p0 = pt(i), p1 = pt(i + 1), taper = Math.min(1, i / 12, (148 - i) / 18);
          ctx.globalAlpha = L.keep ? .95 : .55 + .35 * taper; ctx.lineWidth = Math.max(.6, L.w * (L.keep ? 1 : .75) * (1 - .35 * Math.sin(Math.PI * k)) * taper);
          ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
      if (morphK >= 1) this.morph = null;
    }
    const quads = [], NIB = -.65, HF = [-.4, -.13, .16, .41];
    if (morphK >= 0 && morphK < 1) {
      [this.btnRef, this.sndRef, this.jrnRef].forEach(r => { if (r.current) { r.current.style.opacity = '0'; r.current.style.pointerEvents = 'none'; } });
      if (!this.grainP) this.grainP = ctx.createPattern(this.grainC, 'repeat');
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .35; ctx.fillStyle = this.grainP; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; return;
    }
    const oldCut = this.oldPaths && T < 1.8 ? smooth(clamp(T / 1.6, 0, 1)) : -1; if (oldCut < 0) this.oldPaths = null;
    let pidc = 0, inkPid = null, topPid = null; const runs = (this.oldPaths ? this.oldPaths.map(P => [P, 1]) : []).concat(this.paths.map(P => [P, 0]));
    for (const [P, isOld] of runs) {
      const tr = P.tr, L = P.L, dur = tr ? (1.6 + (P.len - P.oldLen) / 900) / L.spd : this.durOf(P), k = isOld ? 1 : clamp((T - (tr ? L.d * .6 : (P.d ?? L.d))) / dur, 0, 1); if ((k <= 0 && !tr) || (L.keep && G != null && !this.dest)) continue; const pid = ++pidc; if (L.keep && !isOld) inkPid = pid;
      // spring: red draws the cherry blossoms, the focus, so it is painted last and at full strength, over every other colour
      if (!isOld && L === LINES[1] && this.shapeName === 'spring') topPid = pid;
      const newL = P.len - P.entry, ek = tr ? easeIO(k) : 0, bodyL = tr ? P.oldLen + (newL - P.oldLen) * smooth(k) : 0;
      const h = tr ? P.oldLen + (P.len - P.oldLen) * ek : P.len * easeIO(k), tEnd = (P.d ?? L.d) + dur, fin = isOld || tr ? 1 : smooth(clamp((T - tEnd) / 1.2, 0, 1));
      const cut = isOld ? P.entry + (P.len - P.entry) * oldCut : tr ? h - bodyL - 1 : -1e9; P.cut0 = tr ? Math.max(0, P.s.findIndex(v => v >= cut)) : P.arc0 - 1;
      const pts = [], ws = [], as = [], zs = [], ss = [], dry = [];
      for (let i = 0; i < P.pts.length; i++) {
        // the tip (and a retreating tail) sit exactly where they should, between stored points, so slow motion glides instead of hopping a point at a time
        let s = P.s[i], pt = P.pts[i], tipEnd = false;
        if (s > h) { if (!i || P.s[i - 1] >= h) break; pt = lerpPt(P.pts[i - 1], pt, (h - P.s[i - 1]) / (s - P.s[i - 1])); s = h; tipEnd = true; }
        if (s < cut) { const s1 = P.s[i + 1]; if (s1 == null || s1 <= cut) continue; pt = lerpPt(pt, P.pts[i + 1], (cut - s) / (s1 - s)); s = cut; }
        const behind = isOld ? 1e4 : h - s, isArc = i >= P.arc0 || (tr && !isOld), ue = clamp(s / P.entry, 0, 1), join = smooth(clamp((s - P.entry) / 120, 0, 1));
        // arm (entry) stays like a tentacle while travelling, then retracts
        const tailP = -160 + (P.entry + 160) * fin; let a = isArc || tr ? 1 : clamp((s - tailP) / 160, 0, 1) * clamp(1 - Math.max(0, behind - P.entry * .9) / 200, 0, 1);
        const zE = -.4 + 1.2 * Math.sin(Math.PI * ue) + .25 * Math.sin(s * .02 + P.ph);
        const z = tr ? P.zA[i] : zE + (P.zA[i] - zE) * join, sc = L.keep || (!isArc && !tr) ? Math.pow(L.keep ? 2.4 : 2.6, z - (isArc ? .05 : 0)) : Math.max(.35, Math.pow(2.4, z));
        if (!L.keep || this.dest) a *= 1 - gone;
        if (!isArc && !tr && !isOld) { const fo = smooth(clamp((T - tEnd + .6) / .8, 0, 1)), stub = L.keep ? smooth(clamp(1 - (P.entry - s) / 55, 0, 1)) : 0; a *= 1 - fo * (1 - stub); }
        const onS = !isOld && !tr && (this.fromPts || this.fromDive || P.spawn);
        const armW = isArc || tr ? 1 : onS ? .35 + .9 * smooth(clamp(ue / .3, 0, 1)) * (1 - .3 * ue) : .5 + 1.1 * (1 - ue);
        let w = L.w * sc * armW * P.cw[i] * Math.min(1, .5 + behind / 50) * (onS ? Math.min(1, .42 + s / 90) : Math.min(1, .45 + s / 70));
        if (onS && !isArc) a *= (.55 + .35 * ue) * clamp(s / 150, 0, 1);
        let dr = tr ? (1 - clamp((s - cut) / 120, 0, 1)) * .35 : isArc ? 0 : clamp((behind - P.entry * .6) / 300, 0, 1) * .7;
        if (tr) w *= Math.pow(clamp((s - cut) / 120, 0, 1), .65) / Math.min(1, .45 + s / 70);
        if (isArc) { const TRV = tr && !isOld, E0 = TRV ? Math.max(0, cut) : P.entry, L0 = TRV ? h : P.len, ua = clamp((s - E0) / Math.max(1, L0 - E0), 0, 1), sa = clamp((s - E0) / 40, 0, 1); const press = ua < .04 ? .75 + .55 * smooth(ua / .04) : ua < .12 ? 1.3 - .3 * smooth((ua - .04) / .08) : 1; const multi = ['signature', 'hangul', 'maple', 'triskele', 'octopus', 'spring', 'frog', 'plane', 'onsen', 'mountain', 'muaythai', 'fox', 'gameboy', 'longfins', 'egg', 'samurai'].includes(this.shapeName), se = (L.keep ? P.len : L0) - s, hl = multi ? 50 : Math.min(150, (L0 - E0) * .4), harai = se < hl ? .42 + .58 * smooth(se / hl) : 1; w *= (L.keep ? press : 1) * (multi ? 1 : 1 - .12 * ua) * harai * (L.keep ? 1 : Math.sqrt(Math.max(.1, sa))); if (L.keep) { dr = multi ? smooth(clamp((70 - se) / 70, 0, 1)) * .6 : smooth(clamp((50 - se) / 50, 0, 1)) * .35; w *= 1 + this.hovT * .12; } else if (!L.page) dr = clamp((s - (L0 - 200)) / 200, 0, 1) * .8; }
        if (P.wt[i] < (L.keep && this.shapeName === 'samurai' ? .5 : .2) || (this.colorPaths[LINES.indexOf(L)] && i >= P.arc0 && P.wt[i] < .5)) { a *= ['hangul', 'signature', 'maple', 'triskele', 'frog', 'spring', 'octopus', 'plane', 'onsen', 'mountain', 'muaythai', 'coffee', 'fox', 'gameboy', 'longfins', 'egg', 'samurai', 'wave'].includes(this.shapeName) ? 0 : .06; w *= .4; } else if (P.wt[i] < 1) a *= clamp(.25 + .75 * P.wt[i], 0, 1); if (isOld) { const tp = clamp((s - cut) / 120, 0, 1); w *= Math.pow(tp, .65); a *= Math.min(1, tp * 1.5); }
        // page lines fade a little towards their start; not spring's red, whose start is the blossoms
        if (L.page && !(L === LINES[1] && this.shapeName === 'spring')) a = Math.min(1, a / .94) * (.62 + .38 * Math.pow(clamp(1 - (h - s) / 900, 0, 1), 1.2));
        else if (!L.keep && isArc) { const nh = smooth(clamp(1 - (h - s) / 220, 0, 1)); a *= (.72 + .28 * Math.pow(.5 + .5 * Math.sin(s * .006 + P.ph * 2.3), 1.5)) * (1 - nh) + nh; }
        if (!L.keep && !isOld) { const nh = smooth(clamp(1 - (h - s) / 90, 0, 1)), wb = (L.w || 8) * .55; if (w < wb) w += (wb - w) * nh; }
        pts.push(pt); ws.push(w); as.push(clamp(a, 0, 1) * .94); zs.push(z); ss.push(s); dry.push(dr);
        if (tipEnd) break;
      }
      const n = pts.length; if (n < 2) continue;
      if (!isOld) { this.heads = this.heads || {}; this.heads[L.keep ? 'ink' : L.page || 'c' + LINES.indexOf(L)] = { p: pts[n - 1], a: as[n - 1], w: ws[n - 1], col: L.col, t: T, set: smooth(clamp((T - tEnd + .4) / 1.0, 0, 1)) }; }
      const col = `rgb(${L.col[0]},${L.col[1]},${L.col[2]})`, colL = `rgb(${L.col.map(v => Math.round(v + (255 - v) * .5)).join(',')})`, colDa = L.col.map(v => Math.round(v * .86)), colD = `rgb(${colDa.join(',')})`, N2 = [];
      for (let i = 0; i < n; i++) { const q = pts[Math.min(n - 1, i + 1)], pr = pts[Math.max(0, i - 1)]; let tx = q[0] - pr[0], ty = q[1] - pr[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl; N2.push([-ty, tx]); ws[i] *= L.keep && this.shapeName === 'signature' ? .2 + .62 * Math.pow(Math.max(0, ty), 1.4) + .06 * Math.abs(ty) + .42 * Math.pow(1 - Math.abs(ty), 4) : .72 + .28 * Math.abs(Math.sin(Math.atan2(ty, tx) - NIB)); if (!L.keep) as[i] *= clamp(.7 + .3 * ws[i] / (L.w * 1.3), .7, 1); }
      if (L.keep && n > 4) { const ds2 = Math.max(.5, (ss[n - 1] - ss[0]) / (n - 1)), r2 = Math.max(1, Math.round(24 / ds2)); for (const arr of [dry, as]) for (let pass = 0; pass < 3; pass++) { const pre = [0]; for (let i = 0; i < n; i++) pre.push(pre[i] + arr[i]); const o = []; for (let i = 0; i < n; i++) { if (arr === as && arr[i] < .005) { o.push(0); continue; } const lo = Math.max(0, i - r2), hi = Math.min(n - 1, i + r2); o.push((pre[hi + 1] - pre[lo]) / (hi - lo + 1)); } for (let i = 0; i < n; i++) arr[i] = arr === as ? Math.min(o[i], arr[i] + .5) : o[i]; } }
      if (!L.keep && n > 4) { // blur opacity/width along the stroke so no step changes survive
        const ds = Math.max(.5, (ss[n - 1] - ss[0]) / (n - 1)), blur = (arr, px, keep0) => { const r = Math.max(1, Math.round(px / ds)); for (let pass = 0; pass < 2; pass++) { const pre = [0]; for (let i = 0; i < n; i++) pre.push(pre[i] + arr[i]); const o = arr.slice(); for (let i = 0; i < n; i++) { if (keep0 && arr[i] === 0) continue; const lo = Math.max(0, i - r), hi = Math.min(n - 1, i + r); o[i] = (pre[hi + 1] - pre[lo]) / (hi - lo + 1); } for (let i = 0; i < n; i++) arr[i] = o[i]; } };
        const a0 = as[0], a1 = as[n - 1]; blur(as, 28, false); blur(ws, 10, false); as[0] = Math.min(as[0], a0); as[n - 1] = Math.min(as[n - 1], a1);
      }
      const quad = (i0, o0, i1, o1, hw0, hw1, a, z, cc, sub = 0, qb = 0) => { const p0 = pts[i0], p1 = pts[i1], n0 = N2[i0], n1 = N2[i1];
        const c0 = [p0[0] + n0[0] * o0, p0[1] + n0[1] * o0], c1 = [p1[0] + n1[0] * o1, p1[1] + n1[1] * o1];
        quads.push({ z, a, col: cc || col, rgb: sub === 1 ? colDa : L.col, brgb: L.col, base: sub === 1 ? qb : 0, pid, sub, mul: false, ink: !!L.keep, q: [[c0[0] - n0[0] * hw0, c0[1] - n0[1] * hw0], [c1[0] - n1[0] * hw1, c1[1] - n1[1] * hw1], [c1[0] + n1[0] * hw1, c1[1] + n1[1] * hw1], [c0[0] + n0[0] * hw0, c0[1] + n0[1] * hw0]] }); };
      { const sw = smooth1(ws, 5), box = (arr, r) => { const c = [0]; for (let q = 1; q < n; q++) c[q] = c[q - 1] + (arr[q] + arr[q - 1]) / 2 * (ss[q] - ss[q - 1]); const o = []; let lo = 0, hi = 0; for (let q = 0; q < n; q++) { while (ss[lo] < ss[q] - r) lo++; if (hi < q) hi = q; while (hi < n - 1 && ss[hi + 1] <= ss[q] + r) hi++; const span = ss[hi] - ss[lo]; o.push(span > 1e-6 ? (c[hi] - c[lo]) / span : arr[q]); } return o; }, sa2 = box(box(as, 32), 32); for (let q = 0; q < n; q++) { ws[q] = sw[q]; as[q] = sa2[q] * smooth(clamp(sa2[q] / .25, 0, 1)); } }
      // each line's trail runs over the part you can see: from where its stroke begins (after the hidden lead-in it flew in on) to its tail
      if (!isOld && this.fadeC) { const li = LINES.indexOf(L), x0 = tr ? ss[0] : Math.max(ss[0], P.entry), xl = Math.max(1, ss[n - 1] - x0); for (let q = 0; q < n; q++) as[q] *= this.fadeAt(li, clamp((ss[q] - x0) / xl, 0, 1)); }
      const cap = (ci) => { const r = ws[ci] / 2, c = pts[ci], q = []; if (r < .6 || as[ci] < .02) return; for (let k3 = 0; k3 < 12; k3++) { const an = k3 / 12 * 6.2832; q.push([c[0] + Math.cos(an) * r, c[1] + Math.sin(an) * r]); } quads.push({ z: zs[ci], a: as[ci] * (1 - dry[ci] * .9), col, rgb: L.col, pid, sub: 9, mul: false, ink: !!L.keep, q }); };
      cap(0); cap(n - 1);
      for (let i = 0; i < n - 1; i++) {
        if (as[i] < .005 || as[i + 1] < .005) continue; const a = (as[i] + as[i + 1]) / 2;
        const z = (zs[i] + zs[i + 1]) / 2, d = (dry[i] + dry[i + 1]) / 2, body = a * (1 - d * .9);
        if (body > .005) { const b0 = as[i] * (1 - dry[i] * .9), b1 = as[i + 1] * (1 - dry[i + 1] * .9), kk = L.keep && (b0 < .9 || b1 < .9) ? Math.min(6, Math.max(1, Math.ceil(Math.abs(b1 - b0) / .02))) : 1; if (kk === 1) quad(i, 0, i + 1, 0, ws[i] / 2, ws[i + 1] / 2, body, z); else { const p0 = pts[i], p1 = pts[i + 1], n0 = N2[i], n1 = N2[i + 1], hw0 = ws[i] / 2, hw1 = ws[i + 1] / 2, L0 = [p0[0] - n0[0] * hw0, p0[1] - n0[1] * hw0], R0 = [p0[0] + n0[0] * hw0, p0[1] + n0[1] * hw0], L1 = [p1[0] - n1[0] * hw1, p1[1] - n1[1] * hw1], R1 = [p1[0] + n1[0] * hw1, p1[1] + n1[1] * hw1], lp = (A, B, u) => [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u]; for (let s3 = 0; s3 < kk; s3++) { const u0 = s3 / kk, u1 = (s3 + 1) / kk; quads.push({ z, a: b0 + (b1 - b0) * (u0 + u1) / 2, col, rgb: L.col, brgb: L.col, base: 0, pid, sub: 0, mul: false, ink: !!L.keep, q: [lp(L0, L1, u0), lp(L0, L1, u1), lp(R0, R1, u1), lp(R0, R1, u0)] }); } } }
      }
    }

    this.exitHeads = [];
    if (G != null && this.exits) for (const X of this.exits) { const pid = X.ink && inkPid != null ? inkPid : 'x' + (++pidc);
      const all = X.pts.slice(), sw = X.pts.length - 1, sl = [0];
      for (let i = 1; i < all.length; i++) sl[i] = sl[i - 1] + Math.hypot(all[i][0] - all[i - 1][0], all[i][1] - all[i - 1][1]);
      const len = sl[all.length - 1], swL = sl[sw], kx = clamp((G - X.d) / (X.dur || 1.5), 0, 1); if (kx <= 0 && !X.h0) continue;
      const h0 = X.h0 || 0, nC = X.circ ? X.circ.length : 0, s0 = nC ? sl[nC - 1] : 0, TLx = h0 ? h0 + 60 + (460 - h0 - 60) * smooth(kx) : 460;
      const hh = h0 + (len - h0) * (X.f0 != null ? .65 * easeIO(kx) + .35 * (1 - Math.pow(1 - kx, 2)) : 1 - Math.pow(1 - kx, 2.2)), col = `rgb(${X.col[0]},${X.col[1]},${X.col[2]})`;
      const P2 = [], W2 = [], A2 = [], Z2 = [], I2 = []; if (X.f0 != null && X.tA == null && hh >= sl[X.f0]) X.tA = G;
      for (let i = 0; i < all.length; i++) {
        let sv = sl[i], pt = all[i], tipEnd = false; const inF = X.f0 != null && i >= X.f0 && i <= X.f1, tailCut = len * smooth(clamp((G - X.d - (X.dur || 1.5) + .1) / .7, 0, 1));
        if (sv > hh) { if (!i || sl[i - 1] >= hh) break; pt = lerpPt(all[i - 1], pt, (hh - sl[i - 1]) / (sv - sl[i - 1])); sv = hh; tipEnd = true; }
        if (!inF && sv < tailCut) { const s1 = sl[i + 1]; if (s1 == null || s1 <= tailCut) continue; pt = lerpPt(pt, all[i + 1], (tailCut - sv) / (s1 - sv)); sv = tailCut; }
        const behind = hh - sv, onW = X.f0 != null ? inF : i >= sw, onC = i < nC, u = clamp((sv - s0) / (swL - s0), 0, 1);
        const z = onW || onC ? .05 : Math.min(X.f0 != null ? .3 : 9, -.7 + 1.9 * Math.pow(Math.sin(Math.PI * u), 1.2));
        const sc = Math.pow(3.4, z), tip = Math.sqrt(clamp(behind / 26, .04, 1)), blend = X.f0 != null ? (onW ? 1 : smooth(clamp(1 - Math.min(Math.abs(i - X.f0), Math.abs(i - X.f1)) / 10, 0, 1))) : smooth(clamp((sv - swL + 160) / 160, 0, 1));
        const w = (X.w * sc * (1 - blend) + X.tw * (.84 + .16 * Math.sin(sv * .045)) * blend) * tip * Math.sqrt(clamp(sv / 60, .1, 1));
        let a = onW ? X.ta : clamp(1 - behind / TLx, 0, 1) * (.5 + .5 * clamp((z + 1) / 2, 0, 1));
        if (!onW && blend > 0) a = a * (1 - blend) + X.ta * blend * clamp(1 - behind / TLx, .4, 1);
        if (X.ink && !onW) a = Math.min(1, a * 1.1);
        if (onC && X.circW && X.circW[i] < .2) a = 0;
        P2.push(pt); W2.push(w); A2.push(a); Z2.push(z + (onW ? -2 : 0)); I2.push(i);
        if (tipEnd) break;
      }
      const n2 = P2.length;
      for (let i = 0; i < n2 - 1; i++) {
        if (I2[i + 1] !== I2[i] + 1 || A2[i] <= 0 || A2[i + 1] <= 0) continue;
        // angle each end from its true neighbours only: across an erased stretch the next kept point can be far away (the dot), which would twist the end
        const q0 = P2[i], q1 = P2[i + 1], q2 = i + 2 < n2 && I2[i + 2] === I2[i + 1] + 1 ? P2[i + 2] : q1, pr = i > 0 && I2[i - 1] === I2[i] - 1 ? P2[i - 1] : q0;
        const t0x = q1[0] - pr[0], t0y = q1[1] - pr[1], l0 = Math.hypot(t0x, t0y) || 1, t1x = q2[0] - q0[0], t1y = q2[1] - q0[1], l1 = Math.hypot(t1x, t1y) || 1;
        const n0 = [-t0y / l0, t0x / l0], n1 = [-t1y / l1, t1x / l1], h0b = W2[i] / 2, h1b = W2[i + 1] / 2;
        quads.push({ z: (Z2[i] + Z2[i + 1]) / 2 + (X.ink ? .02 : 0), a: (A2[i] + A2[i + 1]) / 2, col, rgb: X.col, pid, sub: 0, mul: !X.ink, q: [[q0[0] - n0[0] * h0b, q0[1] - n0[1] * h0b], [q1[0] - n1[0] * h1b, q1[1] - n1[1] * h1b], [q1[0] + n1[0] * h1b, q1[1] + n1[1] * h1b], [q0[0] + n0[0] * h0b, q0[1] + n0[1] * h0b]] });
      }
      // once a surface line has lifted off its right end towards its dot, the surface carries on out past the right edge, as on the Freediving page
      if (X.k <= 2 && X.f1 != null) { if (X.tB == null && hh >= sl[X.f1] + 40) X.tB = G;
        if (X.tB != null) { const e0 = all[X.f1], xr = e0[0] + (W + 20 - e0[0]) * smooth(clamp((G - X.tB) / .5, 0, 1)), ep = [e0];
          for (let x = Math.ceil((e0[0] + 1) / 9) * 9; x < xr; x += 9) ep.push([x, SY + this.waveY(x - LX, X.k, 0)]); if (xr > e0[0] + 1) ep.push([xr, SY + this.waveY(xr - LX, X.k, 0)]);
          // width keeps the line's own rhythm, measured along the stroke, so the join doesn't show
          let se = sl[X.f1]; for (let i = 0; i < ep.length - 1; i++) { const q0 = ep[i], q1 = ep[i + 1], dd = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) || 1, nx = -(q1[1] - q0[1]) / dd, ny = (q1[0] - q0[0]) / dd, tipR = Math.sqrt(clamp((xr - q1[0]) / 26, .04, 1)), hw0 = X.tw * (.84 + .16 * Math.sin(se * .045)) / 2, hw1 = X.tw * (.84 + .16 * Math.sin((se += dd) * .045)) / 2 * (xr >= W + 19 ? 1 : tipR);
            quads.push({ z: -1.95 + (X.ink ? .02 : 0), a: X.ta, col, rgb: X.col, pid, sub: 0, mul: !X.ink, q: [[q0[0] - nx * hw0, q0[1] - ny * hw0], [q1[0] - nx * hw1, q1[1] - ny * hw1], [q1[0] + nx * hw1, q1[1] + ny * hw1], [q0[0] + nx * hw0, q0[1] + ny * hw0]] }); } } }
      // both blues share the Freediving dot: as they arrive they take on its own blue, so they merge into one dot instead of flickering between two
      const hc = X.k === 1 || X.k === 2 ? `rgb(${X.col.map((v, j) => Math.round(v + ([24, 88, 224][j] - v) * smooth(clamp((kx - .8) / .2, 0, 1)))).join(',')})` : col;
      if (P2.length) { const hp = P2[P2.length - 1], dk = smooth(clamp((G - X.d - (X.dur || 1.5) + .1) / .7, 0, 1)); this.exitHeads = this.exitHeads || []; this.exitHeads.push({ p: hp, col: hc, r: (X.ink ? 8 : 7) + ((X.k === 3 ? 5.5 : 8) - (X.ink ? 8 : 7)) * dk }); }
    }

    // each line is filled as one shape per opacity level (nested, stacked), so it never overlaps itself or seams; lines then blend translucently with each other
    // signature of every piece of paint: if a slow-moving tip were missed, the frame would be reused and the tip would hop when it was noticed
    let sig = quads.length; for (let i = 0; i < quads.length; i++) { const Q = quads[i]; sig = (sig * 31 + Math.round(Q.a * 997) + Math.round(Q.q[0][0] * 8) * 3 + Math.round(Q.q[0][1] * 8) * 7 + Math.round(Q.q[2][0] * 8) * 11) % 2147483647; }
    const cvs0 = ctx.canvas; if (!this.strokeC) this.strokeC = document.createElement('canvas'); const scv = this.strokeC; const sizeOk = scv.width === cvs0.width && scv.height === cvs0.height; if (!sizeOk) { scv.width = cvs0.width; scv.height = cvs0.height; }
    const reuse = sizeOk && this.strokeSig === sig; this.strokeSig = sig; const sctx = scv.getContext('2d');
    if (!reuse) { sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.globalCompositeOperation = 'source-over'; sctx.globalAlpha = 1; sctx.fillStyle = '#f5f3ee'; sctx.fillRect(0, 0, scv.width, scv.height); }
    const groups = new Map();
    // spring's red brushes the cherry petals: they take blossom pink, every other one paler, and the twig out to the Sound dot stays red.
    // Each colour is its own paint group, all over the other lines
    const bloomR = this.blooms && this.blooms.length && topPid != null ? this.geo.R : 0;
    for (const Q of quads) { let k = Q.pid ?? 'u', col = Q.col, top = 0, grad = null;
      // the faint wash that softening leaves along the brush's unseen moves between petals would show as stalks once boosted: skip it
      if (bloomR && k === topPid && Q.a < .2) continue;
      if (k === topPid) { top = 10; if (bloomR) { const m = Q.q[2] || Q.q[0], qx = (Q.q[0][0] + m[0]) / 2, qy = (Q.q[0][1] + m[1]) / 2; let d = 1e9; for (const b of this.blooms) d = Math.min(d, Math.hypot(b[0] - qx, b[1] - qy)); d /= bloomR;
        // just past a petal's rim is only the brush's unseen move leaving it: drop that wash (the twig, beyond the last petal, stays)
        const twigX = this.blooms[this.blooms.length - 1][0] + bloomR * .05;
        if (d > .074 && d < .2 && qx < twigX) continue;
        // the twig flows out of the last petal: one paint group whose fill is a gradient, the petal's pink deepening to Sound's red
        if (d >= .074 && qx >= twigX) { k = topPid + ':t'; col = 'rgb(239,104,121)'; grad = [twigX, twigX + bloomR * .32]; top = 10.05; }
        else if (d < .135) { let bi = 0, bd = 1e18; this.blooms.forEach((b, n) => { const e = (b[0] - qx) ** 2 + (b[1] - qy) ** 2; if (e < bd) { bd = e; bi = n; } }); const pale = bi % 2;
          k = topPid + (pale ? ':a' : ':b'); col = pale ? 'rgb(246,174,198)' : 'rgb(236,128,164)'; top = 10.1; } } }
      let g = groups.get(k); if (!g) { g = { col, grad, ink: !!Q.ink, top, zs: 0, n: 0, qs: [] }; groups.set(k, g); } g.qs.push(Q); g.zs += Q.z; g.n++; }
    const GL = reuse ? [] : [...groups.values()].sort((a, b) => (a.ink ? -10 : a.top || a.zs / a.n) - (b.ink ? -10 : b.top || b.zs / b.n));
    // each line: an opacity mask built with max-blending (overlaps keep the strongest value, slight overlaps hide joins), then page = page*(1-m) + colour*m — exact translucency, no levels, no seams
    const cvs = ctx.canvas, mkC = k => { if (!this[k]) this[k] = document.createElement('canvas'); const c = this[k]; if (c.width !== cvs.width || c.height !== cvs.height) { c.width = cvs.width; c.height = cvs.height; } return c; };
    const lcv = mkC('layerC'), lcv2 = mkC('layerC2'), lcv3 = mkC('layerC3'), lc = lcv.getContext('2d'), lc2 = lcv2.getContext('2d'), lc3 = lcv3.getContext('2d'), TF = ctx.getTransform(), EXT = .5;
    const addQ = (c2, q) => { if (q.length === 4) { const mx0 = (q[0][0] + q[3][0]) / 2, my0 = (q[0][1] + q[3][1]) / 2, mx1 = (q[1][0] + q[2][0]) / 2, my1 = (q[1][1] + q[2][1]) / 2, l = Math.hypot(mx1 - mx0, my1 - my0) || 1, ex = (mx1 - mx0) / l * EXT, ey = (my1 - my0) / l * EXT; c2.moveTo(q[0][0] - ex, q[0][1] - ey); c2.lineTo(q[1][0] + ex, q[1][1] + ey); c2.lineTo(q[2][0] + ex, q[2][1] + ey); c2.lineTo(q[3][0] - ex, q[3][1] - ey); } else { c2.moveTo(q[0][0], q[0][1]); for (let k3 = 1; k3 < q.length; k3++) c2.lineTo(q[k3][0], q[k3][1]); } c2.closePath(); };
    for (const g of GL) {
      const am = g.top ? 2.5 : g.ink ? 1 : .86, bk = new Map(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      // opacity in 85 levels (steps of 3/255): finer is invisible, and every distinct level costs a fill
      for (const Q of g.qs) { const v = Math.round(clamp(Q.a * am, 0, 1) * 85) * 3; if (v < 2) continue; let L2 = bk.get(v); if (!L2) bk.set(v, L2 = []); L2.push(Q.q); for (const p of Q.q) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } }
      if (!bk.size) continue;
      const bx0 = Math.max(0, Math.floor(TF.a * x0 + TF.e) - 3), by0 = Math.max(0, Math.floor(TF.d * y0 + TF.f) - 3), bx1 = Math.min(cvs.width, Math.ceil(TF.a * x1 + TF.e) + 3), by1 = Math.min(cvs.height, Math.ceil(TF.d * y1 + TF.f) + 3), bw = bx1 - bx0, bh = by1 - by0; if (bw <= 0 || bh <= 0) continue;
      // inverted mask: white, darken with (1 - alpha)
      lc.setTransform(1, 0, 0, 1, 0, 0); lc.globalAlpha = 1; lc.globalCompositeOperation = 'source-over'; lc.fillStyle = '#fff'; lc.fillRect(bx0, by0, bw, bh);
      lc.setTransform(TF); lc.globalCompositeOperation = 'darken';
      for (const [v, L2] of bk) { const u = 255 - v; lc.fillStyle = `rgb(${u},${u},${u})`; lc.beginPath(); for (const q of L2) addQ(lc, q); lc.fill('nonzero'); }
      lc.setTransform(1, 0, 0, 1, 0, 0);
      // colour * alpha
      lc2.setTransform(1, 0, 0, 1, 0, 0); lc2.globalAlpha = 1; lc2.globalCompositeOperation = 'source-over'; lc2.drawImage(lcv, bx0, by0, bw, bh, bx0, by0, bw, bh);
      lc2.globalCompositeOperation = 'difference'; lc2.fillStyle = '#fff'; lc2.fillRect(bx0, by0, bw, bh);
      lc3.setTransform(1, 0, 0, 1, 0, 0); lc3.globalAlpha = 1; lc3.globalCompositeOperation = 'source-over'; if (g.grad) { const G = lc3.createLinearGradient(TF.a * g.grad[0] + TF.e, 0, TF.a * g.grad[1] + TF.e, 0); G.addColorStop(0, 'rgb(246,174,198)'); G.addColorStop(1, 'rgb(232,34,44)'); lc3.fillStyle = G; } else lc3.fillStyle = g.col; lc3.fillRect(bx0, by0, bw, bh); lc3.setTransform(TF); this.streaks(lc3, g.qs, g.col, g.ink); lc3.setTransform(1, 0, 0, 1, 0, 0);
      lc2.globalCompositeOperation = 'multiply'; lc2.drawImage(lcv3, bx0, by0, bw, bh, bx0, by0, bw, bh);
      sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.globalAlpha = 1;
      sctx.globalCompositeOperation = 'multiply'; sctx.drawImage(lcv, bx0, by0, bw, bh, bx0, by0, bw, bh);
      sctx.globalCompositeOperation = 'lighter'; sctx.drawImage(lcv2, bx0, by0, bw, bh, bx0, by0, bw, bh);
    }
    sctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(scv, 0, 0); ctx.restore();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

    const inkDone = clamp((T - this.readyT + .3) / .4, 0, 1) * (1 - gone);
    if (this.dots && inkDone > 0) for (const d of this.dots) { ctx.globalAlpha = inkDone * this.fadeAt(0, 1); ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.arc(d[0], d[1], 5, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; }

    const bP = this.paths.find(P => P.L.page === 'freediving'), bEnd = bP.L.d + this.durOf(bP);
    const dA = smooth(clamp((T - Math.max(this.readyT, bEnd)) / .5, 0, 1)) * (1 - gone);
    const hd = this.heads && this.heads.freediving, [stx, sty] = hd && hd.t === T ? hd.p : this.station, btn = this.btnRef.current;
    const LAf = this.labelAt && this.labelAt.freediving;
    if (btn) { this.placeLabel(btn, [stx, sty], LAf, LAf ? null : this.labelUp && this.labelUp['freediving']); btn.style.opacity = dA.toFixed(3); btn.style.pointerEvents = dA > .5 ? 'auto' : 'none'; this.labelFx('freediving', btn, [stx, sty], !!this.hov && dA > .5, LAf && LAf.length > 2 ? [LAf[2], LAf[3]] : null); }
    if (dA > 0) {
      const dx = stx, dy = sty;
      if (this.hovT > .01) { const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, 60); g.addColorStop(0, `rgba(30,90,190,${.3 * this.hovT * dA})`); g.addColorStop(1, 'rgba(30,90,190,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dx, dy, 60, 0, 6.2832); ctx.fill(); }
    }
    [['sound', this.sndRef, [214, 40, 40]], ['journal', this.jrnRef, [200, 150, 0]]].forEach(([pg, ref, c]) => {
      const P = this.paths.find(q => q.L.page === pg), S = this.stations[pg]; if (!P || !S) return;
      const a2 = smooth(clamp((T - Math.max(this.readyT, this.endOf(P))) / .5, 0, 1)) * (1 - gone), el = ref.current;
      const LA = this.labelAt && this.labelAt[pg], hh = this.heads && this.heads[pg], HP = LA || (hh && hh.t === T ? hh.p : S); if (el) { this.placeLabel(el, hh && hh.t === T ? hh.p : S, LA, LA ? null : this.labelUp && this.labelUp[pg]); el.style.opacity = a2.toFixed(3); el.style.pointerEvents = a2 > .5 ? 'auto' : 'none'; this.labelFx(pg, el, hh && hh.t === T ? hh.p : S, !!this.hovPg[pg] && a2 > .5, LA && LA.length > 2 ? [LA[2], LA[3]] : null); }
      const hv = this.hovPgT[pg] || 0; if (hv > .01 && a2 > 0) { const hp = hh && hh.t === T ? hh.p : S, g = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], 60); g.addColorStop(0, 'rgba(' + c.join(',') + ',' + (.3 * hv * a2).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + c.join(',') + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hp[0], hp[1], 60, 0, 6.2832); ctx.fill(); }
    });
    // the buoy and flag fill with colour from where their lines arrive, outline drawing in with it, matching the Freediving buoy exactly
    if (G != null && !this.dest && this.exits) { const BS = clamp(W / 900, .75, 1), Xb = this.exits.find(x => x.k === 3), Xf = this.exits.find(x => x.k === 4);
      const kB = Xb && Xb.tA != null ? smooth(clamp((G - Xb.tA) / .6, 0, 1)) : 0, kF = Xf && Xf.tA != null ? smooth(clamp((G - Xf.tA) / .5, 0, 1)) : 0, kP = Math.max(kF, Xb && Xb.tA != null ? smooth(clamp((G - Xb.tA - .35) / .5, 0, 1)) : 0);
      if (kB > 0 || kF > 0) { ctx.save(); ctx.translate(LX, SY + this.waveY(0, 0, 0) - 2); ctx.scale(BS, BS); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = 1;
        if (kP > 0) { ctx.strokeStyle = '#141414'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -12 - 34 * kP); ctx.stroke(); }
        if (kF > 0) { ctx.save(); ctx.beginPath(); ctx.arc(1, -39, 27 * kF, 0, 6.2832); ctx.clip(); ctx.fillStyle = 'rgb(232,34,44)'; ctx.fillRect(0, -46, 22, 14);
          ctx.strokeStyle = '#f6efe0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(1.8, -44.2); ctx.lineTo(20.2, -33.8); ctx.stroke(); ctx.restore();
          ctx.globalAlpha = kF; ctx.strokeStyle = '#141414'; ctx.lineWidth = 1.6; ctx.strokeRect(0, -46, 22, 14); ctx.globalAlpha = 1; }
        if (kB > 0) { ctx.save(); ctx.beginPath(); ctx.arc(-17, 0, 50 * kB, 0, 6.2832); ctx.clip(); ctx.fillStyle = 'rgb(255,118,18)'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 13, 0, 0, 6.2832); ctx.fill();
          ctx.fillStyle = '#f6efe0'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 3.5, 0, 0, 6.2832); ctx.fill(); ctx.restore();
          ctx.globalAlpha = kB; ctx.strokeStyle = '#141414'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, 0, 22, 3.5, 0, 0, 6.2832); ctx.stroke(); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(0, 0, 22, 13, 0, 0, 6.2832); ctx.stroke(); ctx.globalAlpha = 1; }
        ctx.restore(); } }
    // arriving from another page: hold each nav dot in place until its line sets off from it
    if (this.navArrive && G == null && T < 4) LINES.forEach((L, li) => { const key = L.keep ? 'ink' : L.page || 'c' + li, p = this.navArrive[key], h = this.heads && this.heads[key]; if (!p || (h && h.t === T)) return;
      ctx.globalAlpha = 1; ctx.fillStyle = `rgb(${L.col[0]},${L.col[1]},${L.col[2]})`; ctx.beginPath(); ctx.arc(p[0], p[1], /^c\d/.test(key) ? 5.5 : 8, 0, 6.2832); ctx.fill(); });
    if (this.exitHeads) for (const eh of this.exitHeads) { ctx.globalAlpha = 1; ctx.fillStyle = eh.col; ctx.beginPath(); ctx.arc(eh.p[0], eh.p[1], eh.r, 0, 6.2832); ctx.fill(); }
    if (G != null && this.navFrom) ['sound', 'journal', 'c4', 'c5', 'c6', 'freediving', 'ink'].forEach((k, i) => { const f = this.navFrom[k]; if (!f) return; const toSnd = /\/sound\//.test(this.dest || ''), P0 = f.p, kk = easeIO(clamp((G - .15 - i * .07) / 1.4, 0, 1));
      // to Sound each dot waits where it is while the strokes fade (Sound then drops it onto its beat pad); anywhere else it rises to the menu at the top
      if (toSnd) { ctx.globalAlpha = 1; ctx.fillStyle = `rgb(${f.col[0]},${f.col[1]},${f.col[2]})`; ctx.beginPath(); ctx.arc(P0[0], P0[1], /^c\d/.test(k) ? 5.5 : 8, 0, 6.2832); ctx.fill(); return; }
      const P1 = toSnd ? sndDrop(k, W, H) : navAt(W, k), C1 = toSnd ? [P0[0], P0[1] + (P1[1] - P0[1]) * .45] : [P0[0], P0[1] - 90], C2 = toSnd ? [P1[0], P1[1] - 90] : [P1[0], P1[1] + 70], bz = u => { const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3; return [a * P0[0] + b * C1[0] + c * C2[0] + d * P1[0], a * P0[1] + b * C1[1] + c * C2[1] + d * P1[1]]; };
      const col = `rgb(${f.col[0]},${f.col[1]},${f.col[2]})`, tail = Math.max(0, kk - .35); ctx.strokeStyle = col; ctx.lineCap = 'round';
      for (let q = 0; q < 24; q++) { const u0 = tail + (kk - tail) * q / 24, u1 = tail + (kk - tail) * (q + 1) / 24, a0 = bz(u0), a1 = bz(u1); ctx.globalAlpha = .85 * (q / 24) * Math.sin(Math.PI * Math.min(1, kk * 1.15)); ctx.lineWidth = 1.5 + 3.5 * q / 24; ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke(); }
      const p = bz(kk); ctx.globalAlpha = 1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], 7 + (/^c\d/.test(k) ? -1.5 : 1) * kk, 0, 6.2832); ctx.fill(); });
    if (this.heads) for (const pg in this.heads) { const h = this.heads[pg]; if (h.t !== T) continue; if (G != null && this.navFrom && this.navFrom[pg]) continue; const hv = pg === 'freediving' ? this.hovT : pg === 'ink' ? this.hovIT * 1.6 : (this.hovPgT[pg] || 0), hs = [...(this.shapeName || '')].reduce((x, ch) => x + ch.charCodeAt(0), 0) + ['freediving', 'sound', 'journal'].indexOf(pg) * 7, endR = [5, 8.5, 12.5][hs % 3], r = (pg === 'ink' ? 8 : 7.5 * (1 - h.set) + endR * h.set) + hv * 2 + LABEL.pulseR * this.labelPulse(pg), al = (1 - gone) * this.fadeAt(pg === 'ink' ? 0 : /^c\d$/.test(pg) ? +pg[1] : LINES.findIndex(L => L.page === pg), 1);
      if (al <= 0) continue; ctx.globalAlpha = al; ctx.fillStyle = `rgb(${h.col[0]},${h.col[1]},${h.col[2]})`; ctx.beginPath(); ctx.arc(h.p[0], h.p[1], r, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; }
    this.hovIT += (this.hovI - this.hovIT) * .15;
    { const b = this.inkRef.current, h = this.heads && this.heads.ink; if (b) { const on = h && h.t === T && T >= this.readyT && G == null; if (h && h.t === T) { b.style.left = h.p[0] + 'px'; b.style.top = h.p[1] + 'px'; } b.style.pointerEvents = on ? 'auto' : 'none'; } }
    if (!this.grainP) this.grainP = ctx.createPattern(this.grainC, 'repeat');
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .35; ctx.fillStyle = this.grainP; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }

  inkRef = React.createRef(); hovI = 0; hovIT = 0;
  inkOn = () => { this.hovI = 1; }; inkOff = () => { this.hovI = 0; };
  renderVals() {
    return {
      inkRef: this.inkRef, inkOn: this.inkOn, inkOff: this.inkOff, shuffle: this.shuffle, canvasRef: this.canvasRef, btnRef: this.btnRef, sndRef: this.sndRef, jrnRef: this.jrnRef, goDive: this.goDive, goSound: this.goSound, goJournal: this.goJournal, sndOn: this.sndOn, sndOff: this.sndOff, jrnOn: this.jrnOn, jrnOff: this.jrnOff, hoverOn: this.hoverOn, hoverOff: this.hoverOff };
  }
}

// each label letter is its own span so it can be absorbed into the dot on its own
const letters = w => [...w].map((c, i) => <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', transformOrigin: '50% 60%' }}>{c}</span>);

function View(v) {
  return (
    <>
    <div style={sty("position:fixed;inset:0;overflow:hidden;color:#141414;background:#f5f3ee;font-family:'Newsreader', Georgia, serif;-webkit-font-smoothing:antialiased;user-select:none")}>
      {"\n  "}
      <canvas ref={v.canvasRef} style={sty("position:absolute;inset:0;width:100%;height:100%;pointer-events:none")} />
      {"\n  "}
      <button ref={v.btnRef} onClick={v.goDive} onMouseEnter={v.hoverOn} onMouseLeave={v.hoverOff} onFocus={v.hoverOn} onBlur={v.hoverOff} aria-label="Freediving" style={sty("position:absolute;left:50%;top:50%;transform:translate(-50%, -50%);display:block;width:48px;height:48px;padding:0;border-radius:50%;border:0;background:none;cursor:pointer;color:#141414;font-family:'Newsreader', Georgia, serif;opacity:0")}>
        {"\n    "}
        <span style={sty("display:none")} />
        {"\n    "}
        <span data-lab="home" style={sty("position:absolute;pointer-events:none;white-space:nowrap;font-family:Papyrus, 'Papyrus-Regular', 'Newsreader', Georgia, serif;font-weight:400;font-size:24px;letter-spacing:0;opacity:0")}>
          {letters("Freediving")}
        </span>
        {"\n  "}
      </button>
      {"\n  "}
      <button ref={v.inkRef} onClick={v.shuffle} onMouseEnter={v.inkOn} onMouseLeave={v.inkOff} aria-label="Shuffle symbol" title="Shuffle" style={sty("position:absolute;left:-100px;top:-100px;width:44px;height:44px;transform:translate(-50%, -50%);border:0;padding:0;background:none;cursor:pointer;border-radius:50%;pointer-events:none")} />
      {"\n  "}
      <button ref={v.sndRef} onClick={v.goSound} onMouseEnter={v.sndOn} onMouseLeave={v.sndOff} onFocus={v.sndOn} onBlur={v.sndOff} aria-label="Sound" style={sty("position:absolute;left:0;top:0;transform:translate(-50%, -50%);display:block;width:48px;height:48px;padding:0;border-radius:50%;border:0;background:none;cursor:pointer;color:#141414;font-family:'Newsreader', Georgia, serif;opacity:0;pointer-events:none")}>
        {"\n    "}
        <span style={sty("display:none")} />
        {"\n    "}
        <span data-lab="home" style={sty("position:absolute;pointer-events:none;white-space:nowrap;font-family:Papyrus, 'Papyrus-Regular', 'Newsreader', Georgia, serif;font-weight:400;font-size:24px;letter-spacing:0;opacity:0")}>
          {letters("Sound")}
        </span>
        {"\n  "}
      </button>
      {"\n  "}
      <button ref={v.jrnRef} onClick={v.goJournal} onMouseEnter={v.jrnOn} onMouseLeave={v.jrnOff} onFocus={v.jrnOn} onBlur={v.jrnOff} aria-label="Library" style={sty("position:absolute;left:0;top:0;transform:translate(-50%, -50%);display:block;width:48px;height:48px;padding:0;border-radius:50%;border:0;background:none;cursor:pointer;color:#141414;font-family:'Newsreader', Georgia, serif;opacity:0;pointer-events:none")}>
        {"\n    "}
        <span style={sty("display:none")} />
        {"\n    "}
        <span data-lab="home" style={sty("position:absolute;pointer-events:none;white-space:nowrap;font-family:Papyrus, 'Papyrus-Regular', 'Newsreader', Georgia, serif;font-weight:400;font-size:24px;letter-spacing:0;opacity:0")}>
          {letters("Library")}
        </span>
        {"\n  "}
      </button>
    </div>
    </>
  );
}

export default page(Component, View, {"shape":"random"});
