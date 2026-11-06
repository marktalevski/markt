// The wave: the album's pieces as a band of cut-paper shapes across the page. At rest it lies flat; with a piece loaded it takes
// that piece's shape, and the part already played dances with the music.
import { deckGeo } from '../lib/deck-layout.js';
import { TAU, clamp, easeInOut, rng, smooth } from '../lib/math.js';
import { KIND_COLOUR, albums, kindAt, levelAt } from './albums.js';

const INK = '#0c0c0c';
// the cut-paper colours mixed in among a piece's own colour
const PAL = [
  'rgb(232,34,44)',
  'rgb(255,196,0)',
  'rgb(24,88,224)',
  'rgb(255,118,18)',
  'rgb(22,168,82)',
  'rgb(138,64,214)',
  'rgb(244,138,172)',
  'rgb(233,227,214)',
  'rgb(110,200,230)',
];
// paper shapes per half-column of the wave
const FK = 20;

/**
 * Where the wave lies: across the middle of the page above the deck (of the whole page in full screen). amp: how far it opens up
 * and down, yB: its baseline.
 */
export function waveGeometry(s, W, H) {
  const t0 = deckGeo(W, H).y0 - 8,
    fz = easeInOut(clamp(s.fullEase, 0, 1)),
    top = t0 + (H - t0) * fz,
    amp = Math.min(top * 0.32, 260);
  return { amp, yB: Math.round(top / 2) };
}

/** The wave's paper shapes: for every column, FK slots above the baseline and FK below, each its own shape, size, tilt, colour and depth. */
function piecesFor(s, n) {
  if (s.pieces && s.pieces.n === n) return s.pieces;
  const T = n * FK * 2,
    r = rng(99),
    F = {
      n,
      dx: new Float32Array(T),
      sz: new Float32Array(T),
      rot: new Float32Array(T),
      sh: new Uint8Array(T),
      pal: new Uint8Array(T),
      ck: new Float32Array(T),
      z: new Uint8Array(T),
      dy: new Float32Array(T),
    };
  for (let f = 0; f < T; f++) {
    F.dx[f] = (r() - 0.5) * 7;
    F.sz[f] = 2.5 + r() * 5.5;
    F.rot[f] = r() * TAU;
    F.sh[f] = Math.floor(r() * 5);
    F.pal[f] = Math.floor(r() * PAL.length);
    F.ck[f] = r();
    F.z[f] = Math.floor(r() * 3);
    F.dy[f] = (r() - 0.5) * 3;
  }
  return (s.pieces = F);
}

/** One paper shape (sh: a strip, a disc, a triangle, a sliver or a ring), sz across, at (px, py), turned by rot. */
function drawPiece(ctx, dpr, sh, px, py, rot, sz) {
  const c = Math.cos(rot),
    s = Math.sin(rot);
  ctx.setTransform(dpr * c, dpr * s, -dpr * s, dpr * c, dpr * px, dpr * py);
  if (sh === 0) ctx.fillRect(-sz / 2, -sz * 0.3, sz, sz * 0.6);
  else if (sh === 1) {
    ctx.beginPath();
    ctx.arc(0, 0, sz * 0.45, 0, TAU);
    ctx.fill();
  } else if (sh === 2) {
    ctx.beginPath();
    ctx.moveTo(0, -sz * 0.55);
    ctx.lineTo(sz * 0.5, sz * 0.4);
    ctx.lineTo(-sz * 0.5, sz * 0.4);
    ctx.closePath();
    ctx.fill();
  } else if (sh === 3) ctx.fillRect(-sz, -0.7, sz * 2, 1.4);
  else {
    ctx.beginPath();
    ctx.arc(0, 0, sz * 0.42, 0, TAU);
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
}

/** Draws the wave. */
export function drawWave(s, frame) {
  const { ctx, W, H, dpr, t, dt, fade, c, playX, live } = frame,
    { amp, yB } = waveGeometry(s, W, H),
    al = albums[s.album];
  // arrival: the wave opens out from the middle; handed over from another page, its columns spring up one by one
  const arrD = s.arrival ? 0.9 : 0,
    introDone = t > 3.4 + arrD,
    eqRise = x => {
      const h = ((((Math.floor(x / 10) + 7) * 2654435761) >>> 0) % 1000) / 1000,
        k = clamp((t - 1.75 - h * 0.45) / 0.32, 0, 1);
      return k <= 0 ? 0 : k >= 1 ? 1 : 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;
    },
    introG = s.arrival
      ? x => (introDone ? 1 : eqRise(x))
      : x => (introDone ? 1 : smooth(clamp((t - arrD - 0.3 - 1.1 * Math.abs(x / W - 0.5)) / 0.8, 0, 1)));
  // targets for each column: height, strength and which kind of piece it belongs to
  const g = W < 600 ? 8 : 10,
    n = Math.ceil(W / g);
  if (!s.colHeight || s.colHeight.length !== n) {
    s.colHeight = new Float32Array(n);
    s.colAlpha = new Float32Array(n);
    s.colKind = new Array(n).fill(null);
  }
  const kE = 1 - Math.exp(-dt * 6);
  for (let i = 0; i < n; i++) {
    const x = i * g + g / 2;
    let env = 0,
      kk,
      a = 0.3;
    // resting: flat; playing (or paused): the piece's full wave, and nothing else
    if (c) {
      env = levelAt(c.tr.env, Math.min(1, x / W));
      kk = c.tr.kind;
      a = x <= playX ? 1 : 0.22;
    } else kk = kindAt(al.tracks, Math.min(1, x / W));
    // changes sweep in from the left
    const k = Math.min(1, kE * (0.6 + 0.8 * (1 - i / n)));
    s.colHeight[i] += (env - s.colHeight[i]) * k;
    s.colAlpha[i] += (a - s.colAlpha[i]) * k;
    if (kk) s.colKind[i] = kk;
  }
  const F = piecesFor(s, n),
    step = amp / FK,
    par = s.lean * 5,
    jit = 0.45;
  // the played part of the wave dances with the music: each column follows its own band of the spectrum, strongest just behind the playhead
  const spK = 1 - Math.exp(-(dt || 1 / 60) * 35.9); // the dancing columns' easing, by the clock (.45 a frame at 60fps)
  let spec = null;
  if (playX != null && live && s.player.analyser) {
    if (!s.spectrum) s.spectrum = new Uint8Array(s.player.analyser.frequencyBinCount);
    s.player.analyser.getByteFrequencyData(s.spectrum);
    spec = s.spectrum;
  }
  if (!s.colDance || s.colDance.length !== n) s.colDance = new Float32Array(n);
  // while the playhead is dragged (on the page, or by the jog wheel or its rim), the shapes round it gather into neat lines, so the
  // wave's outline reads clearly there
  const scr = s.scrub || ((s.jogTurning || s.rimHeld) && playX != null ? { x: playX } : null);
  s.settle = s.settle + ((scr ? 1 : 0) - s.settle) * Math.min(1, dt * 9);
  if (scr) s.settleX = scr.x;
  for (let i = 0; i < n; i++) {
    const x = i * g + g / 2,
      ig = introG(x);
    if (ig <= 0) continue;
    const b = spec && x <= playX ? (spec[2 + ((i * 37) % 140)] / 255) * Math.exp(-(playX - x) / (W * 0.3)) : 0;
    s.colDance[i] += (b - s.colDance[i]) * spK;
    const hh = s.colHeight[i] * amp * (0.92 + 0.08 * Math.sin(t * 1.3 + i * 0.37)) * ig * (1 + 1.2 * s.colDance[i]),
      kc = s.colKind[i] ? KIND_COLOUR[s.colKind[i]] : INK,
      e = playX != null && live ? live * Math.exp(-(((x - playX) / 52) ** 2)) : 0;
    const sk = s.settle * Math.exp(-(((x - (s.settleX ?? -1e4)) / 110) ** 2));
    if (sk > 0.01) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = kc;
      ctx.globalAlpha = s.colAlpha[i] * (1 - fade) * sk;
      const lw = 1 + sk;
      ctx.fillRect(x - lw / 2, yB - Math.max(0.6, hh), lw, Math.max(1.2, hh * 2));
    }
    for (let h = 0; h < 2; h++)
      for (let j = 0; j < FK; j++) {
        const off = (j + 0.5) * step;
        if (off > hh + step * 0.5) break;
        const f = (i * FK + j) * 2 + h,
          sd = h ? 1 : -1,
          z = F.z[f],
          lastF = j ? clamp((hh - off) / step + 0.5, 0, 1) : 1;
        let px = x + F.dx[f] * jit + par * (z - 1),
          py = yB + sd * (off + F.dy[f]),
          rot = F.rot[f] + Math.sin(t * 0.5 + f) * 0.08;
        if (e) {
          py += sd * e * (6 + off * 0.4);
          rot += e * 2.4 * (f % 2 ? 1 : -1);
          px += e * F.dx[f] * 2;
        }
        if (sk > 0.01) {
          px += (x - px) * sk;
          py += (yB + sd * off - py) * sk;
          rot *= 1 - sk;
        }
        ctx.globalAlpha = s.colAlpha[i] * (0.5 + 0.25 * z) * lastF * (1 - fade) * (1 - 0.85 * sk);
        const col = F.ck[f] < 0.62 ? kc : F.pal[f] === 7 ? INK : PAL[F.pal[f]];
        ctx.fillStyle = col;
        ctx.strokeStyle = col;
        drawPiece(ctx, dpr, F.sh[f], px, py, rot, F.sz[f] * (0.7 + 0.2 * z));
      }
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
