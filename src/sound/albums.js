// The albums and their pieces, from src/data/sound.json (edited in the editor's Sound tab).
//
// An album: title, img (its photo, under public/, laid into the page in black and white; imgX: 0 flush left, 1 flush against the right
// edge; imgY: shift up as a fraction of the page height; imgFlip: upside down; imgMirror: left to right), and its pieces.
// A piece: title, kind (field, voice or music: its colour and label), date, and src (an audio file under public/), whose real waveform
// and length it plays; a piece without a file plays a synthesised stand-in of its kind, dur seconds long.
// Albums with no pieces are left out.
import sound from '../data/sound.json';
import { assetUrl } from '../lib/base.js';
import { TAU, clamp, rng } from '../lib/math.js';

/** Each kind of piece has its own colour, from the site's palette. */
export const KIND_COLOUR = { field: 'rgb(22,168,82)', music: 'rgb(232,34,44)', voice: 'rgb(138,64,214)' };

export const pad2 = n => String(n).padStart(2, '0');
/** Seconds as minutes and seconds: 2:07. */
export const minSec = s => Math.floor(s / 60) + ':' + pad2(Math.floor(s % 60));
/** A number made from a piece's title: what makes its stand-in sound and wave its own, and the same on every visit. */
export const hash = s => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

// ---- a piece's loudness over its length, 0..1 at POINTS points: what the wave on the page is drawn from
const POINTS = 400;

/** The loudness of a piece with no file: swells for field recordings, sections and beats for music, phrases and pauses for voice. */
function standInEnvelope(tr) {
  const r = rng(hash(tr.title)),
    e = new Float32Array(POINTS);
  if (tr.kind === 'field') {
    const f = [1 + r() * 2, 3 + r() * 3, 7 + r() * 5],
      p = [r() * 6, r() * 6, r() * 6];
    for (let i = 0; i < POINTS; i++) {
      const u = i / POINTS;
      e[i] =
        0.5 +
        0.2 * Math.sin(u * f[0] * TAU + p[0]) +
        0.12 * Math.sin(u * f[1] * TAU + p[1]) +
        0.06 * Math.sin(u * f[2] * TAU + p[2]) +
        (r() - 0.5) * 0.14;
    }
  } else if (tr.kind === 'music') {
    const secs = [0.35, 0.6, 0.9, 0.55, 0.95, 0.4];
    for (let i = 0; i < POINTS; i++) {
      const k = Math.min(secs.length - 1, Math.floor((i / POINTS) * secs.length));
      e[i] = secs[k] * (0.78 + 0.22 * Math.abs(Math.sin((i * Math.PI) / 4))) + (r() - 0.5) * 0.1;
    }
  } else {
    let i = 0;
    while (i < POINTS) {
      const L = 10 + Math.floor(r() * 24),
        lv = 0.5 + r() * 0.4;
      for (let k = 0; k < L && i < POINTS; k++) e[i++] = lv * (0.6 + 0.4 * r());
      const G = 3 + Math.floor(r() * 7);
      for (let k = 0; k < G && i < POINTS; k++) e[i++] = 0.04 + r() * 0.04;
    }
  }
  const o = new Float32Array(POINTS);
  for (let i = 0; i < POINTS; i++) {
    const a = e[Math.max(0, i - 1)],
      b = e[Math.min(POINTS - 1, i + 1)];
    o[i] = clamp(((a + 2 * e[i] + b) / 4) * Math.min(1, i / 6, (POINTS - 1 - i) / 6), 0.03, 1);
  }
  return o;
}

/** The loudness of a sound file, from its samples. */
export function fileEnvelope(buf) {
  const d = buf.getChannelData(0),
    e = new Float32Array(POINTS),
    step = Math.max(4, Math.floor(d.length / POINTS));
  let mx = 1e-6;
  for (let i = 0; i < POINTS; i++) {
    let s = 0,
      c = 0;
    for (let j = i * step; j < (i + 1) * step && j < d.length; j += 4) {
      s += d[j] * d[j];
      c++;
    }
    e[i] = Math.sqrt(s / Math.max(1, c));
    mx = Math.max(mx, e[i]);
  }
  for (let i = 0; i < POINTS; i++) e[i] = 0.04 + (0.9 * e[i]) / mx;
  return e;
}

/** The loudness at u (0..1) of the way through an envelope. */
export const levelAt = (e, u) => {
  const x = clamp(u, 0, 1) * (e.length - 1),
    i = Math.floor(x),
    f = x - i;
  return e[i] * (1 - f) + e[Math.min(e.length - 1, i + 1)] * f;
};

/** An album's pieces laid end to end (the resting wave): the kind of the piece at u (0..1) of the way along. */
export const kindAt = (tracks, u) => {
  const tot = tracks.reduce((s, t) => s + t.dur, 0);
  let v = u * tot,
    k = 0;
  while (k < tracks.length - 1 && v > tracks[k].dur) {
    v -= tracks[k].dur;
    k++;
  }
  return tracks[k].kind;
};

const KINDS = Object.keys(KIND_COLOUR);
const published = (sound.albums || [])
  .filter(a => a.tracks && a.tracks.length)
  .map(a => ({
    ...a,
    img: assetUrl(a.img),
    tracks: a.tracks.map(t => ({
      ...t,
      kind: KINDS.includes(t.kind) ? t.kind : 'music',
      dur: t.dur || 60,
      src: assetUrl(t.src),
    })),
  }));
const COMING_SOON = [
  { title: 'Sound', img: '', tracks: [{ title: 'Coming soon', kind: 'music', date: '', dur: 60, src: '' }] },
];

/**
 * The albums as the page uses them. Each piece also has: id, ai and ti (its album's and its own place), env (its loudness, see above),
 * and, once its file has been fetched, buf (the decoded sound; dur and env are then the file's own).
 */
export const albums = (published.length ? published : COMING_SOON).map((a, ai) => ({
  ...a,
  tracks: a.tracks.map((tr, ti) => ({ ...tr, id: ai + '-' + ti, ai, ti, env: standInEnvelope(tr) })),
}));
